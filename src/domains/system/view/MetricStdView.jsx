/**
 * [View] SY-13 지표 측정 데이터 관리 (경로: /system/metric-standard)
 *
 * 여기서 정한 정상/주의/위험 값이 이상 알림 발송 조건과 화면 색상 판정에 그대로 사용됩니다.
 * 사용 API 7건 — /api/v1/metrics/standards/*
 */
import React, { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import Grid, { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import { Badge, BlindValue, Button, Card, Filters, Hint, KeyValue, Loading, Pagination, SelectField, SourceNote, StatCard, Table, openFormModal } from '@shared/components/ui';
import { useAppNavigation } from '@shared/hooks/useAppNavigation';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { labelOf, withAll } from '@domains/common/model/codeRepository';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { comma } from '@shared/utils/formatUtil';
import { directionArrow, directionText, levelTone } from '../controller/useMetricStdController';

// 선택지·표시명은 서버 공통코드에서 받습니다 (MET_CATEGORY · MET_UNIT · MET_WINDOW · MET_JUDGE · MET_STD_FIELD)

export default function MetricStdView({
  loading, items, summary, history, filters, setCategory, setEnabled, setGrade, reload,
  exportExcel, saveNumber, toggleEnabled, submitStandard, loadUsage, paging, itemsMeta, codes,
}) {
  const cat = codes?.MET_CATEGORY || [];
  const unit = codes?.MET_UNIT || [];
  const win = codes?.MET_WINDOW || [];
  const judge = codes?.MET_JUDGE || [];
  const stdField = codes?.MET_STD_FIELD || [];

  const s = useCommonStyles();
  const theme = useTheme();
  const can = useAuthStore((state) => state.can);
  const { goToScreen } = useAppNavigation();
  const openModal = useUiStore((state) => state.openModal);
  const toast = useUiStore((state) => state.toast);

  /**
   * 기준 수치 사용처 — 응답은 { alertConditions[], dashboards[], reports[], sources[] } 입니다.
   * 항목별로 한 줄씩, 비어 있으면 '사용 안 함' 으로 보여 줍니다.
   */
  const showUsage = async (row) => {
    const usage = await loadUsage(row.stdId);
    if (!usage) {
      toast('사용처를 불러오지 못했습니다');
      return;
    }
    const list = (arr) => (Array.isArray(arr) && arr.length ? arr.map((x) => (typeof x === 'string' ? x : x?.name || x?.condNm || x?.detail || JSON.stringify(x))).join(' · ') : '사용 안 함');
    const rows = usage.usages
      ? usage.usages.map((u) => [u.area, u.detail])
      : [
          ['알림 조건', list(usage.alertConditions)],
          ['대시보드', list(usage.dashboards)],
          ['보고서', list(usage.reports)],
          ['수집 원천', list(usage.sources)],
        ];
    const used = rows.filter(([, v]) => v !== '사용 안 함').length;
    openModal({
      title: '기준 수치 사용처',
      sub: `${row.name} · ${used ? `${used}곳에서 사용` : '아직 어디에서도 쓰지 않습니다'}`,
      render: () => (
        <View>
          <KeyValue keyWidth={110} rows={rows} />
          <SourceNote>여기 나온 곳의 판정·알림이 이 지표의 정상/주의/위험 값을 그대로 씁니다. 값을 바꾸면 즉시 반영됩니다.</SourceNote>
        </View>
      ),
      footer: (close) => <Button label="닫기" onPress={close} />,
    });
  };

  /** 지표 기준 등록 — 방향(direction)은 정상·주의·위험 값의 관계에서 서버가 정합니다 */
  const openStdForm = () =>
    openFormModal({
      title: '지표 기준 등록',
      sub: '시스템관리 > 지표 측정 데이터 관리',
      initial: { category: cat[0]?.value, unit: unit[0]?.value, window: win[0]?.value, applied: 'Y' },
      fields: [
        { key: 'category', label: '구분', type: 'select', options: cat, required: true },
        { key: 'name', label: '지표명', required: true, placeholder: '예) 프레스 타발 편차' },
        { key: 'unit', label: '단위', type: 'select', options: unit },
        { key: 'window', label: '집계 구간', type: 'select', options: win },
        { key: 'normal', label: '정상 기준', type: 'number', required: true, placeholder: '예) 85' },
        { key: 'warn', label: '주의 임계', type: 'number', required: true, placeholder: '예) 75' },
        { key: 'critical', label: '위험 임계', type: 'number', required: true, placeholder: '예) 65' },
        { key: 'applied', label: '등록 후 적용', type: 'select', options: [{ value: 'Y', label: '바로 적용' }, { value: 'N', label: '미적용으로 등록' }] },
        { key: 'basis', label: '산출 근거', full: true, required: true, placeholder: '예) 가동시간 ÷ 조업시간 × 100 (MES 생산 이력)' },
      ],
      note: '판정 방향은 값의 관계로 정해집니다 — 정상 > 주의 > 위험이면 「클수록 좋음」, 정상 < 주의 < 위험이면 「작을수록 좋음」. 등록한 기준 수치는 이상 알림·대시보드·보고서 판정에 함께 사용되며, 변경 이력은 감사 로그에 기록됩니다.',
      submitLabel: '등록',
      onSubmit: async (v) => (await submitStandard(v)).ok,
    });

  if (loading) return <Loading />;

  const total = itemsMeta?.total ?? items.length;

  return (
    <View>
      <PageHead
        title="지표 측정 데이터 관리"
        desc="장애·불량 알림을 판정하는 기준 수치를 직접 입력해 관리합니다. 여기서 정한 정상/주의/위험 값이 이상 알림의 발송 조건과 화면 색상 판정에 그대로 사용됩니다."
        actions={
          <>
            <Button label="엑셀 다운로드" size="sm" icon="download" onPress={exportExcel} />
            {can('alert-cond') ? <Button label="발송 조건 관리" size="sm" icon="settings" onPress={() => goToScreen('alert-cond')} /> : null}
            <Button label="지표 등록" size="sm" variant="primary" icon="plus" onPress={openStdForm} />
          </>
        }
      />

      <Hint>
        표 안의 숫자 칸은 직접 입력할 수 있습니다. 값을 바꾸면 즉시 저장되고, 변경 이력은 감사 로그에 기록됩니다. 주의 임계를 넘으면 노랑, 위험 임계를 넘으면 빨강으로 판정합니다. 방향(▲ 클수록 좋음 / ▼ 작을수록 좋음)은 정상·주의·위험 값의 관계에서 자동으로 정해집니다.
      </Hint>

      <Grid cols={4}>
        <StatCard label="관리 지표" value={comma(summary?.total ?? 0)} unit="개" sub={`적용 ${comma(summary?.enabled ?? 0)} · 미적용 ${comma(summary?.disabled ?? 0)}`} />
        <StatCard label="현재 위험" value={comma(summary?.badCnt ?? 0)} unit="건" sub="위험 임계 초과" tone={summary?.badCnt ? 'down' : ''} />
        <StatCard label="현재 주의" value={comma(summary?.warnCnt ?? 0)} unit="건" sub="주의 임계 초과" tone={summary?.warnCnt ? 'down' : ''} />
        <StatCard label="최종 수정" value={summary?.lastUpdatedAt ?? '—'} sub={summary?.lastUpdatedBy ?? '수정 이력 없음'} />
      </Grid>
      <Gap />

      <Filters>
        <SelectField label="구분" value={filters.category} options={withAll(cat)} onChange={setCategory} />
        <SelectField label="적용 상태" value={filters.enabled} options={['전체', '적용', '미적용']} onChange={setEnabled} />
        <SelectField label="판정" value={filters.grade} options={withAll(judge)} onChange={setGrade} />
        <Button label="조회" variant="primary" onPress={reload} />
      </Filters>

      <Card
        title="알림 기준 수치"
        sub={`${comma(total)}건 · 정상 / 주의 임계 / 위험 임계 — 숫자 칸에 직접 입력합니다`}
        tight
        right={
          <>
            <Badge tone="red">{`위험 ${comma(summary?.badCnt ?? 0)}`}</Badge>
            <Badge tone="amber">{`주의 ${comma(summary?.warnCnt ?? 0)}`}</Badge>
          </>
        }
      >
        <Table
          minWidth={1460}
          keyExtractor={(r) => r.stdId}
          emptyText="조회 조건에 맞는 지표가 없습니다. 「지표 등록」으로 첫 기준 수치를 등록해 주세요."
          columns={[
            { key: 'category', title: '구분', width: 90, render: (r) => <Text style={s.td}>{labelOf(cat, r.category)}</Text> },
            { key: 'name', title: '지표명', width: 160, render: (r) => <Text style={[s.td, { fontWeight: '600' }]}>{r.name}</Text> },
            { key: 'unit', title: '단위', width: 68, align: 'center', render: (r) => <Text style={[s.td, { textAlign: 'center' }]}>{labelOf(unit, r.unit)}</Text> },
            {
              key: 'current',
              title: '현재값',
              width: 96,
              align: 'right',
              render: (r) => (
                <BlindValue
                  field="yield"
                  value={r.currentValue == null ? '—' : `${r.currentValue}${labelOf(unit, r.unit)}`}
                  textStyle={[s.td, s.num, { textAlign: 'right', color: r.level === 'CRIT' ? theme.color.destructive : r.level === 'WARN' ? theme.color.warningText : theme.color.foreground, fontWeight: '700' }]}
                />
              ),
            },
            { key: 'normal', title: '정상 기준', width: 100, render: (r) => <NumberCell value={r.normal} tone="ok" onSave={(v) => saveNumber(r.stdId, 'normal', v)} /> },
            { key: 'warn', title: '주의 임계', width: 100, render: (r) => <NumberCell value={r.warn} tone="warn" onSave={(v) => saveNumber(r.stdId, 'warn', v)} /> },
            { key: 'critical', title: '위험 임계', width: 100, render: (r) => <NumberCell value={r.critical} tone="bad" onSave={(v) => saveNumber(r.stdId, 'critical', v)} /> },
            {
              // 방향은 서버가 임계값 관계에서 산출합니다 — 여기서는 보여 주기만 합니다 (단독 수정 UI 없음)
              key: 'direction',
              title: '방향',
              width: 110,
              render: (r) => (
                r.direction
                  ? <Badge tone={r.direction === 'high' ? 'blue' : 'amber'}>{`${directionArrow(r.direction)} ${directionText(r.direction)}`}</Badge>
                  : <Text style={[s.textXs, { paddingHorizontal: 6 }]}>주의 = 위험</Text>
              ),
            },
            { key: 'window', title: '집계 구간', width: 104, render: (r) => <Text style={s.td}>{labelOf(win, r.window)}</Text> },
            { key: 'basis', title: '산출 근거', flex: 1, minWidth: 200, wrap: true },
            {
              key: 'grade',
              title: '판정',
              width: 78,
              render: (r) => <Badge tone={levelTone(r.level)}>{labelOf(judge, r.level) || '정상'}</Badge>,
            },
            { key: 'applied', title: '적용', width: 80, render: (r) => <Badge tone={r.applied ? 'green' : ''}>{r.applied ? '적용' : '미적용'}</Badge> },
            { key: 'updatedAt', title: '최종 수정', width: 130, render: (r) => <Text style={[s.textXs, { paddingHorizontal: 14 }]}>{`${r.updatedAt || '—'}\n${r.updatedBy || ''}`}</Text> },
            {
              key: 'action',
              title: '관리',
              width: 150,
              render: (r) => (
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  <Button label={r.applied ? '해제' : '적용'} size="sm" variant={r.applied ? 'outline' : 'primary'} onPress={() => toggleEnabled(r)} />
                  <Button label="사용처" size="sm" onPress={() => showUsage(r)} />
                </View>
              ),
            },
          ]}
          rows={items}
        />
        <Pagination meta={itemsMeta} {...(paging?.bind || {})} />
      </Card>
      <Gap />

      <Card title="기준 수치 변경 이력" sub="최근 6건 · 감사 로그에도 함께 기록됩니다" tight>
        <Table
          minWidth={780}
          keyExtractor={(r, i) => `${r.ts}-${i}`}
          emptyText="기준 수치를 바꾼 이력이 없습니다."
          columns={[
            { key: 'ts', title: '시각', width: 150, mono: true },
            { key: 'metric', title: '지표', width: 170 },
            { key: 'field', title: '항목', width: 110, render: (r) => <Text style={s.td}>{labelOf(stdField, r.field)}</Text> },
            { key: 'change', title: '변경 전 → 후', flex: 1, minWidth: 160, render: (r) => <Text style={[s.td, s.num]}>{`${r.before ?? '—'} → ${r.after ?? '—'}`}</Text> },
            { key: 'by', title: '수행자', width: 170, render: (r) => <Text style={s.td}>{r.by ? `${r.by}${r.byDept ? ` (${r.byDept})` : ''}` : '—'}</Text> },
          ]}
          rows={history}
        />
      </Card>
    </View>
  );
}

/**
 * 표 안에서 직접 고치는 숫자 칸 — 포커스를 벗어나면 저장합니다.
 * 왼쪽 띠 색으로 정상(초록)·주의(노랑)·위험(빨강) 칸을 구분합니다. 서버 값이 바뀌면(저장 반영) 입력값도 따라갑니다.
 */
function NumberCell({ value, tone, onSave }) {
  const theme = useTheme();
  const [text, setText] = useState(value == null ? '' : String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    setText(value == null ? '' : String(value));
  }, [value]);

  const stripe = tone === 'bad' ? theme.color.destructive : tone === 'warn' ? theme.color.warning : theme.color.success;

  return (
    <TextInput
      value={text}
      onChangeText={setText}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        const before = value == null ? '' : String(value);
        if (text.trim() === '' || Number.isNaN(Number(text))) {
          setText(before);
          return;
        }
        if (before !== text && Number(before) !== Number(text)) onSave(text);
      }}
      keyboardType="numeric"
      style={{
        width: '86%',
        height: 26,
        marginHorizontal: 6,
        paddingHorizontal: 6,
        fontSize: 11.5,
        textAlign: 'right',
        fontVariant: ['tabular-nums'],
        borderWidth: 1,
        borderLeftWidth: 3,
        borderColor: focused ? theme.color.ring : theme.color.border,
        borderLeftColor: stripe,
        borderRadius: 4,
        backgroundColor: theme.color.background,
        color: theme.color.foreground,
        outlineStyle: 'none',
      }}
    />
  );
}
