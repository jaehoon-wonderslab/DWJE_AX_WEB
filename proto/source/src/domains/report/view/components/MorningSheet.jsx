/**
 * 아침회의 자료 양식 (RP-01 · RP-02 공용)
 *
 * `Web 프로토타입/보고서 스크린샷` 의 두 장을 그대로 옮긴 표입니다.
 *   생산관리팀 (PRESS)_아침회의자료.png
 *   생산관리팀 (Plating, Coating)_아침회의자료.png
 *
 * 두 장이 같은 양식이라 열 정의·색·엑셀 행을 **한 곳에서** 만듭니다.
 * 화면과 엑셀이 갈라지지 않게 `MORNING_HEAD` · `morningExportRows()` 를 같이 씁니다.
 *
 * 값이 없는 칸은 스크린샷대로 `-` 로 둡니다.
 */
import React from 'react';
import { Text, View } from 'react-native';
import ReportDoc from '@shared/components/layout/ReportDoc';
import { BlindValue, XlsTable } from '@shared/components/ui';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { comma, fixed } from '@shared/utils/formatUtil';
import { dateBoxOf, signalOf } from '../../model/reportModel';

/** 값이 없으면 스크린샷대로 하이픈 */
const dash = (v) => (v === null || v === undefined || v === '' ? '-' : v);

/**
 * 목표가 없으면 달성률도 상태도 내지 않습니다
 *
 * 일목표가 0 이면 서버가 달성률 0% · 상태 CRIT 을 내는데, 그건 **못 지킨 것이 아니라 목표가 없는 것**입니다.
 * 그대로 그리면 모든 행이 빨간 위험으로 보입니다. 목표가 채워질 때까지 그 칸들을 비웁니다.
 */
const hasTarget = (v) => Number(v) > 0;

/** 수량은 천 단위 k 로 줄여 적습니다 (양식이 170k · 12,308k 처럼 씁니다) */
export const kk = (n) => (n === null || n === undefined || n === '' ? '-' : `${comma(Math.round(Number(n) / 1000))}k`);

/** 달성률 — 값이 없으면 하이픈 */
export const pct = (v) => (v === null || v === undefined || v === '' ? '-' : `${fixed(v)}%`);

/** "2026-08-20" → "26.08.20(목)" — 양식 오른쪽 위 실적 일자 */
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
export function legendDate(iso) {
  const d = new Date(`${String(iso || '').slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateBoxOf(iso);
  return `${dateBoxOf(iso)}(${WEEKDAYS[d.getDay()]})`;
}

/** 양식 열 — 스크린샷의 순서·폭 그대로 */
export const MORNING_COLUMNS = [
  { key: 'st', title: '상태', width: 58 },
  { key: 'proc', title: '공정/Process', width: 100 },
  { key: 'issue', title: '이슈 항목', width: 138 },
  { key: 'tgt', title: '일목표', width: 84, num: true },
  { key: 'act', title: '실적', width: 84, num: true },
  { key: 'rate', title: '달성률', width: 78, num: true },
  { key: 'week', title: '주간누적', width: 126 },
  { key: 'eqpt', title: '영향범위\n(생산장비 대수)', width: 108 },
  { key: 'memo', title: '결정항목 / 기타', width: 170, align: 'left' },
  { key: 'dri', title: 'DRI', width: 82 },
  { key: 'due', title: '기한', width: 68 },
];

/** 엑셀 머리글 — 화면 열과 같되 주간누적만 3열로 폅니다 (셀 안 줄바꿈을 피합니다) */
export const MORNING_HEAD = [
  '상태', '공정/Process', '이슈 항목', '일목표', '실적', '달성률',
  '주간목표', '주간실적', '주간달성률', '영향범위(생산장비 대수)', '결정항목 / 기타', 'DRI', '기한',
];

/**
 * 엑셀 행 — 화면과 같은 값에서 만듭니다
 * @param {Array} rows 서버 행
 * @param {(field:string, v:any)=>any} mask 데이터 권한 치환
 */
export function morningExportRows(rows = [], mask = (f, v) => v) {
  return rows.map((r) => [
    hasTarget(r.dayTarget) ? signalOf(r.state).label : '-',
    dash(r.process),
    dash(r.issue),
    hasTarget(r.dayTarget) ? mask('qty', kk(r.dayTarget)) : '-',
    mask('qty', kk(r.dayActual)),
    hasTarget(r.dayTarget) ? mask('yield', pct(r.rate)) : '-',
    hasTarget(r.weekTarget) ? mask('qty', kk(r.weekTarget)) : '-',
    mask('qty', kk(r.weekActual)),
    hasTarget(r.weekTarget) ? mask('yield', pct(r.weekRate)) : '-',
    r.impactEqptCnt ? `${comma(r.impactEqptCnt)}대` : '-',
    dash(r.decision),
    dash(r.dri),
    dash(r.due),
  ]);
}

/**
 * 양식 한 장
 *
 * @param {object} p nodeId · title(가운데 제목) · baseDate(왼쪽 배지) · resultDate(오른쪽 실적 일자)
 *                   rows · mask(데이터 권한 치환) · note(표 아래 각주)
 */
export default function MorningSheet({ nodeId, title, baseDate, resultDate, rows = [], mask = (f, v) => v, note }) {
  const s = useCommonStyles();
  const theme = useTheme();

  const legend = [
    { color: theme.color.success, label: '95%이상' },
    { color: theme.color.warning, label: '95%미만' },
    { color: theme.color.destructive, label: '85%미만' },
  ];

  return (
    <ReportDoc nodeId={nodeId}>
      {/* ───── 양식 머리 ───── */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <View style={{ borderWidth: 2, borderColor: theme.color.foreground, borderRadius: 18, paddingVertical: 5, paddingHorizontal: 18 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', letterSpacing: 0.5, color: theme.color.foreground }}>{dateBoxOf(baseDate)}</Text>
        </View>

        <Text style={{ flex: 1, minWidth: 200, textAlign: 'center', fontSize: 19, fontWeight: '700', color: theme.color.primary }}>{title}</Text>

        <View style={{ alignItems: 'flex-end', gap: 3 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {legend.map((it) => (
              <View key={it.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: it.color }} />
                <Text style={s.textXs}>{it.label}</Text>
              </View>
            ))}
          </View>
          <Text style={[s.textXs, { fontWeight: '600', textDecorationLine: 'underline' }]}>{`${legendDate(resultDate)}실적`}</Text>
        </View>
      </View>

      {/* ───── 양식 본문 ───── */}
      <XlsTable
        columns={MORNING_COLUMNS}
        rows={rows.map((r, i) => {
          const known = hasTarget(r.dayTarget);
          const sig = known ? signalOf(r.state) : { label: '-', tone: '' };
          return {
            key: r.processId ? `${r.processId}-${r.issue || i}` : `${r.process || ''}-${i}`,
            cells: [
              { v: sig.label, tone: sig.tone, bold: true },
              { v: dash(r.process), bold: true, wrap: true },
              { v: dash(r.issue), bold: true },
              { node: <Qty field="qty" v={known ? kk(r.dayTarget) : '-'} mask={mask} /> },
              { node: <Qty field="qty" v={kk(r.dayActual)} mask={mask} /> },
              { v: known ? mask('yield', pct(r.rate)) : '-', num: true, bold: true },
              { node: <WeekCell row={r} mask={mask} tone={sig.tone} /> },
              { v: r.impactEqptCnt ? `${comma(r.impactEqptCnt)}대` : '-' },
              { v: dash(r.decision), align: 'left', wrap: true },
              { v: dash(r.dri) },
              { v: dash(r.due) },
            ],
          };
        })}
        maxHeight={620}
      />

      {note ? <Text style={[s.sourceText, { marginTop: 10 }]}>{note}</Text> : null}
    </ReportDoc>
  );
}

/** 수량 칸 — 데이터 권한이 없으면 값 대신 비공개 */
function Qty({ field, v, mask }) {
  const s = useCommonStyles();
  return <Text style={[s.xlsCellText, s.xlsNum]}>{mask(field, v)}</Text>;
}

/**
 * 주간누적 칸 — 양식대로 세 줄이고 달성률만 굵습니다
 *
 * 위험(빨강)·주의(노랑) 행은 스크린샷처럼 달성률 줄에 색이 들어갑니다.
 */
function WeekCell({ row, mask, tone }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const line = [s.xlsCellText, { fontSize: 10.5, lineHeight: 14 }];
  const rateColor = tone === 'bad' ? theme.color.destructive : tone === 'warn' ? theme.color.warningText : undefined;
  const known = hasTarget(row.weekTarget);

  return (
    <View>
      <Text style={line}>{`주간목표 ${known ? mask('qty', kk(row.weekTarget)) : '-'}`}</Text>
      <Text style={line}>{`주간실적 ${mask('qty', kk(row.weekActual))}`}</Text>
      <Text style={[...line, { fontWeight: '700' }, rateColor ? { color: rateColor } : null]}>
        {known ? mask('yield', pct(row.weekRate)) : '-'}
      </Text>
    </View>
  );
}

/** 표 안에서 쓰지 않지만 화면 밖(요약 등)에서 쓰는 마스킹 표시 */
export { BlindValue };
