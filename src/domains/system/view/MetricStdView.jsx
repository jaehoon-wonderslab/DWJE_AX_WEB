/**
 * [View] SY-13 지표 측정 데이터 관리 (경로: /system/metric-standard)
 *
 * 여기서 정한 정상/주의/위험 값이 이상 알림 발송 조건과 화면 색상 판정에 그대로 사용됩니다.
 * 사용 API 7건 — /api/v1/metrics/standards/*
 */
import React, { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import Grid, { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import { Badge, BlindValue, Button, Card, Filters, Hint, KeyValue, Loading, Pagination, SelectField, StatCard, Table, openFormModal } from '@shared/components/ui';
import { useAppNavigation } from '@shared/hooks/useAppNavigation';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { labelOf, withAll } from '@domains/common/model/codeRepository';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';

// 선택지·표시명은 서버 공통코드에서 받습니다 (MET_CATEGORY · MET_UNIT · MET_WINDOW · MET_JUDGE)

export default function MetricStdView({
  loading, items, summary, history, filters, setCategory, setEnabled, setGrade, reload,
  exportExcel, saveNumber, toggleEnabled, submitStandard, loadUsage, paging, itemsMeta, codes,
}) {
  const cat = codes?.MET_CATEGORY || [];
  const unit = codes?.MET_UNIT || [];
  const win = codes?.MET_WINDOW || [];
  const judge = codes?.MET_JUDGE || [];

  const s = useCommonStyles();
  const theme = useTheme();
  const can = useAuthStore((state) => state.can);
  const { goToScreen } = useAppNavigation();
  const openModal = useUiStore((state) => state.openModal);

  /** 기준 수치 사용처 보기 */
  const showUsage = async (row) => {
    const usage = await loadUsage(row.stdId);
    openModal({
      title: '기준 수치 사용처',
      sub: row.name,
      render: () => <KeyValue keyWidth={150} rows={(usage.usages || []).map((u) => [u.area, u.detail])} />,
      footer: (close) => <Button label="닫기" onPress={close} />,
    });
  };

  /** 지표 기준 등록 */
  const openStdForm = () =>
    openFormModal({
      title: '지표 기준 등록',
      sub: '시스템관리 > 지표 측정 데이터 관리',
      initial: { category: cat[0]?.value, unit: unit[0]?.value, window: win[0]?.value, ok: '0', warn: '0', bad: '0' },
      fields: [
        { key: 'category', label: '구분', type: 'select', options: cat, required: true },
        { key: 'name', label: '지표명', required: true, placeholder: '예) 프레스 타발 편차' },
        { key: 'unit', label: '단위', type: 'select', options: unit },
        { key: 'ok', label: '정상 기준', type: 'number', required: true },
        { key: 'warn', label: '주의 임계', type: 'number', required: true },
        { key: 'bad', label: '위험 임계', type: 'number', required: true },
        { key: 'window', label: '집계 구간', type: 'select', options: win },
        { key: 'basis', label: '산출 근거', full: true, required: true, placeholder: '예) MES 생산 이력 · AOI 판정 로그' },
      ],
      note: '등록한 기준 수치는 이상 알림·대시보드·보고서 판정에 함께 사용되며, 변경 이력은 감사 로그에 기록됩니다.',
      submitLabel: '등록',
      onSubmit: async (v) => (await submitStandard(v)).ok,
    });

  if (loading) return <Loading />;

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
        표 안의 숫자 칸은 직접 입력할 수 있습니다. 값을 바꾸면 즉시 저장되고, 변경 이력은 감사 로그에 기록됩니다. 주의 임계를 넘으면 노랑, 위험 임계를 넘으면 빨강으로 판정합니다.
      </Hint>

      <Grid cols={4}>
        <StatCard label="관리 지표" value={summary?.total ?? 0} unit="개" sub={`적용 ${summary?.enabled ?? 0} · 미적용 ${summary?.disabled ?? 0}`} />
        <StatCard label="현재 위험" value={summary?.badCnt ?? 0} unit="건" sub="위험 임계 초과" tone="down" />
        <StatCard label="현재 주의" value={summary?.warnCnt ?? 0} unit="건" sub="주의 임계 초과" />
        <StatCard label="최종 수정" value={summary?.lastUpdatedAt} sub={summary?.lastUpdatedBy} />
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
        sub="정상 / 주의 임계 / 위험 임계 — 숫자 칸에 직접 입력합니다"
        tight
        right={
          <>
            <Badge tone="red">{`위험 ${summary?.badCnt ?? 0}`}</Badge>
            <Badge tone="amber">{`주의 ${summary?.warnCnt ?? 0}`}</Badge>
          </>
        }
      >
        <Table
          minWidth={1360}
          keyExtractor={(r) => r.stdId}
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
            { key: 'normal', title: '정상 기준', width: 100, render: (r) => <NumberCell value={r.normal} onSave={(v) => saveNumber(r.stdId, 'normal', v)} /> },
            { key: 'warn', title: '주의 임계', width: 100, render: (r) => <NumberCell value={r.warn} onSave={(v) => saveNumber(r.stdId, 'warn', v)} /> },
            { key: 'critical', title: '위험 임계', width: 100, render: (r) => <NumberCell value={r.critical} onSave={(v) => saveNumber(r.stdId, 'critical', v)} /> },
            { key: 'window', title: '집계 구간', width: 104, render: (r) => <Text style={s.td}>{labelOf(win, r.window)}</Text> },
            { key: 'basis', title: '산출 근거', flex: 1, minWidth: 200, wrap: true },
            {
              key: 'grade',
              title: '판정',
              width: 78,
              render: (r) => <Badge tone={r.level === 'CRIT' ? 'red' : r.level === 'WARN' ? 'amber' : 'green'}>{labelOf(judge, r.level) || '정상'}</Badge>,
            },
            { key: 'enabled', title: '적용', width: 80, render: (r) => <Badge tone={r.enabled ? 'green' : ''}>{r.enabled ? '적용' : '미적용'}</Badge> },
            { key: 'updatedAt', title: '최종 수정', width: 120, render: (r) => <Text style={[s.textXs, { paddingHorizontal: 14 }]}>{`${r.updatedAt}\n${r.updatedBy}`}</Text> },
            {
              key: 'action',
              title: '관리',
              width: 150,
              render: (r) => (
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  <Button label={r.enabled ? '해제' : '적용'} size="sm" onPress={() => toggleEnabled(r.stdId)} />
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
          columns={[
            { key: 'ts', title: '시각', width: 150, mono: true },
            { key: 'metric', title: '지표', width: 170 },
            { key: 'field', title: '항목', width: 110 },
            { key: 'change', title: '변경 전 → 후', flex: 1, minWidth: 160, render: (r) => <Text style={[s.td, s.num]}>{`${r.before} → ${r.after}`}</Text> },
            { key: 'by', title: '수행자', width: 170 },
          ]}
          rows={history}
        />
      </Card>
    </View>
  );
}

/** 표 안에서 직접 고치는 숫자 칸 — 포커스를 벗어나면 저장합니다 */
function NumberCell({ value, onSave }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);

  return (
    <TextInput
      value={text}
      onChangeText={setText}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        if (String(value) !== text) onSave(text);
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
        borderColor: focused ? theme.color.ring : theme.color.border,
        borderRadius: 4,
        backgroundColor: theme.color.background,
        color: theme.color.foreground,
        outlineStyle: 'none',
      }}
    />
  );
}
