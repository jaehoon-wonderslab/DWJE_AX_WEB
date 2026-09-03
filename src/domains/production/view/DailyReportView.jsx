/**
 * [View] PR-03 일일 생산현황 보고 (경로: /production/daily-report)
 *
 * 「생산관리팀 (PRESS) 아침회의자료」 양식을 그대로 옮긴 화면입니다.
 * 한 행 = 한 제품이고, 양식의 「이슈 항목」 자리에 제품명이 들어갑니다.
 *
 * 집계 구간은 전날 20:00 ~ 당일 08:00(야간 근무분)이며, 대상일은 화면에서 고릅니다.
 * 사용 API — /api/v1/production/daily-reports/* 7건 + 제품별 실적 조회
 */
import React from 'react';
import { Text, TextInput, View } from 'react-native';
import Grid from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import {
  Badge, BlindValue, Button, Card, DateField, EmptyState, Hint, KeyValue, ListRow, Loading,
  SelectField, SourceNote, XlsTable, openConfirmModal, openFormModal,
} from '@shared/components/ui';
import { useAppNavigation } from '@shared/hooks/useAppNavigation';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { comma, dateWithWeekday, fixed, shiftDate } from '@shared/utils/formatUtil';
import { labelOf } from '@domains/common/model/codeRepository';
import { TOP_N_OPTIONS } from '../controller/useDailyReportController';
import { PRESS_LEVELS, dailyEventTone, dailyStateTone, isDailyReportLocked } from '../model/productionRepository';

/** 값이 없으면 '—' */
const text = (v) => (v === null || v === undefined || v === '' ? '—' : String(v));

/** "2026-09-02" → "26.09.02" (양식 머리의 날짜 배지) */
const badgeDate = (d) => (d ? String(d).slice(2).replace(/-/g, '.') : '—');

/** "2026-09-01" → "26.09.01(화)" (양식 오른쪽 위 실적 일자) */
const legendDate = (d) => {
  const w = dateWithWeekday(d);
  return `${badgeDate(d)}(${w.slice(-2, -1)})`;
};

/** 양식 열 정의 — 스크린샷의 열 순서 그대로 */
const COLUMNS = [
  { key: 'state', title: '상태', width: 56 },
  { key: 'process', title: '공정/Process', width: 88 },
  { key: 'product', title: '이슈 항목', width: 196, align: 'left' },
  { key: 'target', title: '일목표', width: 88, num: true },
  { key: 'qty', title: '실적', width: 88, num: true },
  { key: 'rate', title: '달성률', width: 76, num: true },
  { key: 'week', title: '주간누적', width: 124 },
  { key: 'scope', title: '영향범위\n(생산장비 대수)', width: 104 },
  { key: 'decision', title: '결정항목 / 기타', width: 156, align: 'left' },
  { key: 'dri', title: 'DRI', width: 82 },
  { key: 'due', title: '기한', width: 68 },
];

/** 달성률 구간 → XlsTable 색 */
const TONE = { normal: 'ok', watch: 'warn', risk: 'bad' };

export default function DailyReportView({
  loading, sheetLoading, targetDate, dateInput, setTargetDate, processId, setProcessId, processOptions,
  topN, setTopN, window: win, baseline, rows, setManualCell,
  draft, codes, stateLabel, events, noteField, dirty, setFieldValue,
  save, correct, confirm, reject, regenerate, exportExcel,
}) {
  const s = useCommonStyles();
  const theme = useTheme();
  const { goToScreen } = useAppNavigation();

  const locked = isDailyReportLocked(draft?.state);
  const resultDate = shiftDate(targetDate, -1);

  /** 반려 사유 입력 폼 — 사유가 없으면 제출되지 않습니다 */
  const openRejectForm = () =>
    openFormModal({
      title: '보고서 반려',
      sub: `${draft.targetDate} 일일 생산현황 보고서 · v${draft.version}`,
      fields: [{ key: 'reason', label: '반려 사유', type: 'textarea', required: true, full: true, placeholder: '어떤 항목을 어떻게 고쳐야 하는지 적어 주세요' }],
      note: '반려하면 ⑥ 보고서 생성 Agent 가 사유를 반영해 초안을 다시 만듭니다.',
      submitLabel: '반려',
      danger: true,
      onSubmit: async (v) => (await reject(v.reason)).ok,
    });

  /** 항목 보정 — 보정 사유는 선택 사항 (correctionCnt 가 올라갑니다) */
  const openCorrectForm = () =>
    openFormModal({
      title: '항목 보정 반영',
      sub: `${draft.targetDate} · 수정한 항목을 보정 이력으로 남깁니다`,
      fields: [{ key: 'remark', label: '보정 사유', type: 'textarea', full: true, placeholder: '예) MES 누락분 반영, 수기 집계로 대체 (선택)' }],
      note: '보정 반영은 보정 건수(correctionCnt)에 기록되며 생성 이력에 남습니다.',
      submitLabel: '보정 반영',
      onSubmit: async (v) => (await correct(v.remark?.trim() || undefined)).ok,
    });

  /** 확정 — 확정 후에는 수정할 수 없으므로 한 번 묻습니다 */
  const askConfirm = () =>
    openConfirmModal({
      title: '검토 완료 · 확정',
      sub: `${draft.targetDate} 일일 생산현황 보고서 · v${draft.version}`,
      message: dirty
        ? '저장되지 않은 수정 내용이 있습니다. 확정하면 서버에 저장된 값으로 확정되며, 확정 후에는 수정할 수 없습니다. 먼저 임시 저장 또는 항목 보정 반영을 하시겠습니까?'
        : '확정 후에는 항목을 수정할 수 없습니다. 확정하시겠습니까?',
      confirmLabel: '확정',
      onConfirm: confirm,
    });

  /** 재생성 — 편집 중인 내용이 있으면 새 초안으로 덮어쓰이는 점을 알립니다 */
  const askRegenerate = () =>
    dirty
      ? openConfirmModal({
          title: '초안 재생성',
          message: '저장되지 않은 수정 내용이 있습니다. 재생성하면 새 초안(버전 증가)으로 바뀌고 수정 내용은 사라집니다. 계속하시겠습니까?',
          confirmLabel: '재생성',
          danger: true,
          onConfirm: regenerate,
        })
      : regenerate();

  /** 수량 칸 — 데이터 권한이 없으면 값 대신 비공개 배지 */
  const qtyCell = (v) => ({
    node: <BlindValue field="qty" value={v === null || v === undefined ? '—' : comma(v)} textStyle={[s.xlsCellText, s.xlsNum]} />,
  });

  /** 담당자가 채우는 칸 (결정항목 · DRI · 기한) */
  const inputCell = (row, key, placeholder, align) => ({
    node: (
      <TextInput
        style={[s.xlsCellText, align === 'left' && s.xlsLeft, {
          paddingVertical: 2,
          paddingHorizontal: 4,
          borderRadius: 3,
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: theme.alpha('border', locked ? 0.4 : 1),
          backgroundColor: locked ? 'transparent' : theme.alpha('muted', 0.4),
        }]}
        editable={!locked}
        value={row[key] ?? ''}
        placeholder={placeholder}
        placeholderTextColor={theme.color.mutedForeground}
        onChangeText={(v) => setManualCell(row.product, key, v)}
      />
    ),
  });

  const sheetRows = rows.map((r) => ({
    key: r.product,
    cells: [
      { v: r.level?.label || '—', tone: TONE[r.level?.level] || undefined, bold: true },
      { v: r.process },
      { v: r.productNm, align: 'left', wrap: true },
      qtyCell(r.target),
      qtyCell(r.qty),
      { v: r.rate === null ? '—' : `${fixed(r.rate)}%`, num: true, bold: true },
      { node: <WeekCell row={r} /> },
      { v: r.eqptCnt === null ? '—' : `Press ${comma(r.eqptCnt)}대` },
      inputCell(r, 'decision', '—', 'left'),
      inputCell(r, 'dri', '—'),
      inputCell(r, 'due', '—'),
    ],
  }));

  return (
    <View>
      <PageHead
        title="일일 생산현황 보고"
        desc="전날 20:00 부터 당일 08:00 까지의 야간 근무 실적을 조간회의 자료 양식으로 정리합니다."
        actions={
          <>
            <Button label="이전 보고서" size="sm" icon="history" onPress={() => goToScreen('daily-history')} />
            <Button label="엑셀 다운로드" size="sm" icon="download" onPress={exportExcel} disabled={!rows.length} />
            <Button label="초안 재생성" size="sm" variant="primary" icon="refresh" onPress={askRegenerate} />
          </>
        }
      />

      <View style={[s.filters, { position: 'relative', zIndex: 100 }]}>
        <DateField label="대상일" value={dateInput} onChange={setTargetDate} style={{ minWidth: 168 }} />
        <SelectField label="공정" value={processId} options={processOptions} onChange={setProcessId} style={{ minWidth: 220 }} />
        <SelectField label="표시" value={topN} options={TOP_N_OPTIONS} onChange={setTopN} style={{ minWidth: 132 }} />
      </View>

      <Hint>{`집계 구간 ${win.from} ~ ${win.to} — 전날 저녁 근무부터 당일 조간회의 직전까지입니다.`}</Hint>

      <Card tight>
        {/* ───── 양식 머리 ───── */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, flexWrap: 'wrap' }}>
          <View
            style={{
              borderWidth: 2,
              borderColor: theme.color.foreground,
              borderRadius: 18,
              paddingVertical: 5,
              paddingHorizontal: 18,
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: '700', color: theme.color.foreground, letterSpacing: 0.5 }}>
              {badgeDate(targetDate)}
            </Text>
          </View>

          <Text style={{ flex: 1, textAlign: 'center', fontSize: 19, fontWeight: '700', color: theme.color.primary, minWidth: 200 }}>
            생산관리팀 (PRESS)
          </Text>

          <View style={{ alignItems: 'flex-end', gap: 3 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {PRESS_LEVELS.map((l) => (
                <View key={l.level} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor:
                        l.tone === 'green' ? theme.color.success : l.tone === 'amber' ? theme.color.warning : theme.color.destructive,
                    }}
                  />
                  <Text style={s.textXs}>{l.level === 'normal' ? '95%이상' : l.level === 'watch' ? '95%미만' : '85%미만'}</Text>
                </View>
              ))}
            </View>
            <Text style={[s.textXs, { textDecorationLine: 'underline', fontWeight: '600' }]}>{`${legendDate(resultDate)}실적`}</Text>
          </View>
        </View>

        {/* ───── 양식 본문 ───── */}
        {sheetLoading && !rows.length ? (
          <Loading />
        ) : !rows.length ? (
          <EmptyState text={`${targetDate} 구간에 집계된 프레스 실적이 없습니다. 대상일이나 공정을 바꿔 보세요.`} />
        ) : (
          <XlsTable columns={COLUMNS} rows={sheetRows} maxHeight={560} />
        )}

        <View style={{ paddingHorizontal: 14 }}>
        <SourceNote>
          {`출처: MES 제품별 실적 · 집계 구간 ${win.from} ~ ${win.to} · 일목표 기준 ${baseline || '—'}`}
        </SourceNote>
        <Text style={[s.textXs, { marginTop: 4 }]}>
          일목표·주간목표는 목표 마스터가 연동되기 전까지 기준선으로 계산한 값이며, 결정항목 · DRI · 기한은 작성자가
          직접 채우는 칸입니다(아직 서버에 저장되지 않습니다).
        </Text>

        {/* ───── 특이사항 ───── */}
        {noteField ? (
          <View style={{ marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: theme.color.border }}>
            <Text style={[s.textSm, { fontWeight: '600', marginBottom: 5 }]}>{noteField.field}</Text>
            {noteField.masked ? (
              <BlindValue field={noteField.blindFieldKey} value="" />
            ) : (
              <TextInput
                style={[s.editable, {
                  borderColor: theme.color.border,
                  borderStyle: locked ? 'solid' : 'dashed',
                  backgroundColor: theme.alpha('muted', locked ? 0.15 : 0.35),
                  minHeight: 64,
                }]}
                multiline
                editable={!locked}
                value={noteField.value === null || noteField.value === undefined ? '' : String(noteField.value)}
                placeholder="조간회의에서 공유할 특이사항을 적어 두면 보고서 본문에 반영됩니다"
                placeholderTextColor={theme.color.mutedForeground}
                onChangeText={(v) => setFieldValue(noteField.seq, v)}
              />
            )}
          </View>
        ) : null}

        {/* ───── 결재선 ───── */}
        {loading && !draft ? null : !draft ? (
          <Hint>{`${targetDate} 의 보고서 초안이 없습니다. 「초안 재생성」으로 만들면 결재선이 열립니다.`}</Hint>
        ) : (
          <View
            style={{
              flexDirection: 'row',
              gap: 8,
              alignItems: 'center',
              justifyContent: 'flex-end',
              marginTop: 14,
              paddingTop: 14,
              borderTopWidth: 1,
              borderTopColor: theme.color.border,
              flexWrap: 'wrap',
            }}
          >
            <View style={[s.rowGap6, { marginRight: 'auto', flexWrap: 'wrap' }]}>
              <Badge tone={dailyStateTone(draft.state)}>{stateLabel}</Badge>
              <Text style={s.textXs}>{`v${draft.version} · 생성 ${text(draft.generatedAt)}${draft.correctionCnt ? ` · 보정 ${draft.correctionCnt}건` : ''}`}</Text>
              {dirty ? <Badge tone="amber">미저장</Badge> : null}
            </View>
            {locked ? (
              <Text style={s.textXs}>확정된 보고서입니다. 더 이상 수정할 수 없습니다.</Text>
            ) : (
              <>
                <Button label="반려" variant="danger" onPress={openRejectForm} />
                <Button label="임시 저장" onPress={save} />
                <Button label="항목 보정 반영" onPress={openCorrectForm} disabled={!dirty} />
                <Button label="검토 완료 · 확정" variant="primary" onPress={askConfirm} />
              </>
            )}
          </View>
        )}
        </View>
      </Card>

      <Grid cols={[1, 1]}>
        <Card title="구간 합계" sub={`${win.from} ~ ${win.to}`}>
          <KeyValue
            keyWidth={92}
            rows={[
              ['대상일', dateWithWeekday(targetDate)],
              ['실적 일자', dateWithWeekday(resultDate)],
              ['표시 제품', `${comma(rows.length)}종`],
              ['실적 합계', <BlindValue field="qty" value={`${comma(rows.reduce((n, r) => n + (r.qty || 0), 0))} EA`} textStyle={[s.kvVal, s.num]} />],
              ['일목표 합계', <BlindValue field="qty" value={`${comma(rows.reduce((n, r) => n + (r.target || 0), 0))} EA`} textStyle={[s.kvVal, s.num]} />],
              ['불량 합계', <BlindValue field="qty" value={`${comma(rows.reduce((n, r) => n + (r.ngQty || 0), 0))} EA`} textStyle={[s.kvVal, s.num]} />],
            ]}
          />
        </Card>

        <Card title="생성 이력" sub="최근 6건" tight>
          {events.length ? (
            events.slice(0, 6).map((e, i, arr) => (
              <ListRow
                key={`${e.ts}-${i}`}
                tone={dailyEventTone(e.type)}
                title={labelOf(codes?.RPT_DOC_EVENT, e.type)}
                desc={[e.detail, e.by ? `${e.by}${e.byDept ? ` (${e.byDept})` : ''}` : null].filter(Boolean).join(' · ')}
                time={String(e.ts || '').slice(5, 16)}
                last={i === arr.length - 1}
              />
            ))
          ) : (
            <EmptyState text="생성 이력이 없습니다." />
          )}
        </Card>
      </Grid>
    </View>
  );
}

/**
 * 주간누적 칸 — 양식대로 세 줄(주간목표 / 주간실적 / 달성률)이고 달성률만 굵습니다.
 *
 * 수량이 마스킹 대상이라 권한이 없으면 값 대신 비공개 배지만 그립니다.
 */
function WeekCell({ row }) {
  const s = useCommonStyles();
  const canData = useAuthStore((state) => state.canData);
  const line = [s.xlsCellText, { fontSize: 10.5, lineHeight: 14 }];

  if (row.weekTarget === null) return <Text style={s.xlsCellText}>—</Text>;
  if (!canData('qty')) return <BlindValue field="qty" value="" />;

  return (
    <View>
      <Text style={line}>{`주간목표 ${comma(row.weekTarget)}`}</Text>
      <Text style={line}>{`주간실적 ${comma(row.weekQty)}`}</Text>
      <Text style={[...line, { fontWeight: '700' }]}>{row.weekRate === null ? '—' : `${fixed(row.weekRate)}%`}</Text>
    </View>
  );
}
