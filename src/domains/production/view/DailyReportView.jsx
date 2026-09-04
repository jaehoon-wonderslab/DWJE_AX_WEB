/**
 * [View] PR-03 일일 생산현황 보고 (경로: /production/daily-report)
 *
 * 「생산관리팀 (PRESS) 아침회의자료」 양식을 그대로 옮긴 화면입니다.
 * 한 행 = 한 제품이고, 양식의 「이슈 항목」 자리에 제품명이 들어갑니다.
 *
 * 집계 구간은 전날 20:00 ~ 당일 08:00(야간 근무분)이며, 대상일은 화면에서 고릅니다.
 * 회의 결과(일목표·결정항목·DRI·기한)는 「행 저장」으로 남깁니다 — 키는 (대상일, 제품).
 *
 * 2026-09-04 — 서버에서 보고서 문서·결재 모형이 걷혀 초안·확정·반려·생성 이력을 덜어냈습니다.
 * 사용 API 2건 — /production/daily-reports/sheet · /rows (+ 공정 마스터)
 */
import React from 'react';
import { Text, TextInput, View } from 'react-native';
import PageHead from '@shared/components/layout/PageHead';
import {
  Badge, BlindValue, Button, Card, DateField, EmptyState, Hint, KeyValue, Loading,
  SelectField, SourceNote, XlsTable,
} from '@shared/components/ui';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { comma, dateWithWeekday, fixed, shiftDate } from '@shared/utils/formatUtil';
import { TOP_N_OPTIONS } from '../controller/useDailyReportController';
import { PRESS_LEVELS } from '../model/productionRepository';

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
  loading, targetDate, dateInput, setTargetDate, processId, setProcessId, processOptions, processCds,
  topN, setTopN, window: win, baseline, rows, totals, setManualCell, rowsDirty, saveRows, exportExcel,
}) {
  const s = useCommonStyles();
  const theme = useTheme();

  const resultDate = shiftDate(targetDate, -1);

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
          borderColor: theme.color.border,
          backgroundColor: theme.alpha('muted', 0.4),
        }]}
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
      { node: <TargetCell row={r} onChange={(v) => setManualCell(r.product, 'target', v)} /> },
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
          <Button label="엑셀 다운로드" size="sm" icon="download" onPress={exportExcel} disabled={!rows.length} />
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
        {loading && !rows.length ? (
          <Loading />
        ) : !rows.length ? (
          <EmptyState text={`${targetDate} 구간에 집계된 프레스 실적이 없습니다. 대상일이나 공정을 바꿔 보세요.`} />
        ) : (
          <XlsTable columns={COLUMNS} rows={sheetRows} maxHeight={560} />
        )}

        <View style={{ paddingHorizontal: 14 }}>
        <SourceNote>
          {`출처: MES 조간회의 자료 조회 · 집계 구간 ${win.from} ~ ${win.to}`
            + (processCds?.length ? ` · 집계한 작업장 ${processCds.join(' · ')}` : '')}
        </SourceNote>
        <Text style={[s.textXs, { marginTop: 4 }]}>
          <Text style={{ fontWeight: '700' }}>일목표는 작성자가 채우는 칸입니다.</Text> 제품별 일목표는 아직 어디에도
          없어(공정 단위 `PROD_DAY_TARGET` 만 있고 값도 비어 있습니다), 채우기 전에는 일목표 · 달성률 · 주간목표 ·
          주간달성률을 <Text style={{ fontWeight: '700' }}>비워 둡니다</Text> — 없는 목표로 달성률을 내면 늘 100% 근처가
          나와 보고서로 쓸 수 없습니다. 입력칸의 회색 숫자는 {baseline || '—'}이며, 참고하시라고 깔아 둔 밑값입니다.
        </Text>
        <Text style={[s.textXs, { marginTop: 3 }]}>
          주간실적은 그 주 첫 보고 구간부터 대상일까지, 같은 야간 구간만 더한 값입니다.
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          {rowsDirty ? (
            <View style={[s.rowGap6, { marginRight: 'auto' }]}>
              <Badge tone="amber">미저장</Badge>
              <Text style={s.textXs}>일목표 · 결정항목 · DRI · 기한을 고쳤습니다</Text>
            </View>
          ) : (
            <Text style={[s.textXs, { marginRight: 'auto' }]}>일목표 · 결정항목 · DRI · 기한은 「행 저장」을 눌러야 남습니다.</Text>
          )}
          <Button label="행 저장" size="sm" icon="save" variant={rowsDirty ? 'primary' : undefined} onPress={saveRows} disabled={!rowsDirty} />
        </View>
        </View>
      </Card>

      <Card title="구간 합계" sub={`${win.from} ~ ${win.to} · 표에 자르기 전 전량 기준`}>
        <KeyValue
          keyWidth={104}
          rows={[
            ['대상일', dateWithWeekday(targetDate)],
            ['실적 일자', dateWithWeekday(resultDate)],
            ['제품', `${comma(totals?.productCnt ?? rows.length)}종 (표에는 ${comma(rows.length)}종)`],
            ['실적 합계', <BlindValue field="qty" value={`${comma(totals?.qty ?? 0)} EA`} textStyle={[s.kvVal, s.num]} />],
            ['불량 합계', <BlindValue field="qty" value={`${comma(totals?.ngQty ?? 0)} EA`} textStyle={[s.kvVal, s.num]} />],
            ['주간 실적 합계', <BlindValue field="qty" value={`${comma(totals?.weekQty ?? 0)} EA`} textStyle={[s.kvVal, s.num]} />],
            ['이 구간 미가동', `${comma(totals?.idleCnt ?? 0)}종`],
            ['일목표 미기입', `${comma(totals?.noTargetCnt ?? 0)}종 / ${comma(totals?.productCnt ?? rows.length)}종`],
          ]}
        />
      </Card>

    </View>
  );
}

/**
 * 일목표 칸 — 작성자가 채웁니다
 *
 * 제품별 일목표는 아직 어디에도 없어, 채우기 전까지 최근 7일 평균 실적을 밑값으로 깝니다.
 * 밑값 상태는 흐리게 그려 작성자가 채운 목표와 구분합니다.
 */
function TargetCell({ row, onChange }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const canData = useAuthStore((state) => state.canData);

  if (!canData('qty')) return <BlindValue field="qty" value="" />;

  return (
    <TextInput
      style={[s.xlsCellText, s.xlsNum, {
        paddingVertical: 2,
        paddingHorizontal: 4,
        borderRadius: 3,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: theme.color.border,
        backgroundColor: theme.alpha('muted', 0.4),
        opacity: row.provisional ? 0.55 : row.targetOrigin === 'MASTER' ? 0.8 : 1,
        borderStyle: row.targetOrigin === 'MASTER' ? 'dotted' : 'dashed',
      }]}
      keyboardType="numeric"
      value={row.targetInput}
      placeholder={row.targetRef === null ? '—' : comma(row.targetRef)}
      // 마스터에서 온 밑값은 옅게 — 작성자가 오늘 정한 목표와 구분합니다
      selectTextOnFocus
      placeholderTextColor={theme.color.mutedForeground}
      onChangeText={onChange}
    />
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
    <View style={{ opacity: row.provisional ? 0.55 : 1 }}>
      <Text style={line}>{`주간목표 ${comma(row.weekTarget)}`}</Text>
      <Text style={line}>{`주간실적 ${comma(row.weekQty)}`}</Text>
      <Text style={[...line, { fontWeight: '700' }]}>{row.weekRate === null ? '—' : `${fixed(row.weekRate)}%`}</Text>
    </View>
  );
}
