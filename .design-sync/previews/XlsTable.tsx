import './_rnw';
import React from 'react';
import { XlsTable, XlsLegend, Badge } from 'dwje-ax-web';

const COLUMNS = [
  { key: 'item', title: '구분', width: 140, align: 'left' },
  { key: 'plan', title: '계획', width: 90 },
  { key: 'actual', title: '실적', width: 90 },
  { key: 'rate', title: '달성률', width: 84 },
  { key: 'ng', title: '불량', width: 80 },
  { key: 'ngRate', title: '불량률', width: 84 },
  { key: 'note', title: '비고', width: 190, align: 'left' },
];

/** 조간회의 보고서 표 — 그룹 행 · 합계 행 · ok/warn/bad 셀 톤 · span 병합 */
export const Report = () => (
  <div style={{ width: 760 }}>
    <XlsTable
      columns={COLUMNS}
      rows={[
        { tone: 'group', cells: [{ v: 'PRESS (제1공장)', span: 7 }] },
        { cells: [{ v: 'PR-01', align: 'left', mono: true }, { v: '12,000', num: true }, { v: '12,400', num: true }, { v: '103.3%', tone: 'ok' }, { v: '186', num: true }, { v: '1.5%', tone: 'ok' }, { v: '정상 가동', align: 'left' }] },
        { cells: [{ v: 'PR-02', align: 'left' }, { v: '12,000', num: true }, { v: '11,950', num: true }, { v: '99.6%' }, { v: '248', num: true }, { v: '2.1%', tone: 'warn' }, { v: '금형 마모 점검 예정', align: 'left' }] },
        { cells: [{ v: 'PR-03', align: 'left' }, { v: '12,000', num: true }, { v: '11,800', num: true }, { v: '98.3%', tone: 'warn' }, { v: '472', num: true }, { v: '4.0%', tone: 'bad' }, { v: '치수 불량 집중 · 금형 교체', align: 'left' }] },
        { tone: 'group', cells: [{ v: 'Plating · Coating', span: 7 }] },
        { cells: [{ v: 'PL-01', align: 'left' }, { v: '9,500', num: true }, { v: '9,600', num: true }, { v: '101.1%', tone: 'ok' }, { v: '154', num: true }, { v: '1.6%', tone: 'ok' }, { v: '—', align: 'left' }] },
        { cells: [{ v: 'PL-02', align: 'left' }, { v: '9,500', num: true }, { v: '0', num: true }, { v: '0.0%', tone: 'bad' }, { v: '—', num: true }, { v: '—' }, { v: '정기 점검 (09:00~13:00)', align: 'left' }] },
        { cells: [{ v: 'CT-01', align: 'left' }, { v: '8,000', num: true }, { v: '8,200', num: true }, { v: '102.5%', tone: 'ok' }, { v: '98', num: true }, { v: '1.2%', tone: 'ok' }, { v: '—', align: 'left' }] },
        { tone: 'total', cells: [{ v: '합계', align: 'left' }, { v: '63,000', num: true }, { v: '53,950', num: true }, { v: '85.6%' }, { v: '1,158', num: true }, { v: '2.1%' }, { v: '계획 미달 — PL-02 점검 영향', align: 'left' }] },
      ]}
    />
  </div>
);

/** 비교 표 — bold · faint(참고값 계산) · node(배지) 셀 */
export const Compare = () => (
  <div style={{ width: 560 }}>
    <XlsTable
      columns={[
        { key: 'item', title: '평가 지표', width: 200, align: 'left' },
        { key: 'before', title: '현재 v2.3', width: 110 },
        { key: 'after', title: '전환 v2.4', width: 110 },
        { key: 'diff', title: '변화', width: 140 },
      ]}
      rows={[
        { cells: [{ v: 'AOI 오판정률', align: 'left' }, { v: '3.8%', num: true }, { v: '2.6%', num: true, bold: true }, { v: '▼ 1.2%p', tone: 'ok' }] },
        { cells: [{ v: '재검 일치율', align: 'left' }, { v: '91.2%', num: true }, { v: '94.7%', num: true, bold: true }, { v: '▲ 3.5%p', tone: 'ok' }] },
        { cells: [{ v: '추론 지연 (ms)', align: 'left' }, { v: '42', num: true }, { v: '57', num: true, bold: true }, { v: '▲ 15 ms', tone: 'warn' }] },
        { cells: [{ v: '학습 표본 수', align: 'left' }, { v: '128,400', num: true, faint: true }, { v: '146,900', num: true, faint: true }, { v: '참고값', faint: true }] },
        { cells: [{ v: '배포 판정', align: 'left' }, { v: '—' }, { v: '—' }, { node: <div style={{ display: 'flex', justifyContent: 'center' }}><Badge tone="blue">검토 중</Badge></div> }] },
      ]}
    />
  </div>
);

/** 세로 스크롤 — maxHeight 를 주면 머리글 아래 본문만 스크롤 */
export const Scrollable = () => (
  <div style={{ width: 560 }}>
    <XlsTable
      maxHeight={160}
      columns={[
        { key: 'lot', title: 'LOT', width: 150, align: 'left' },
        { key: 'model', title: '모델', width: 110, align: 'left' },
        { key: 'qty', title: '수량', width: 100 },
        { key: 'yield', title: '수율', width: 100 },
        { key: 'state', title: '판정', width: 100 },
      ]}
      rows={['0401', '0405', '0412', '0418', '0420', '0431', '0433', '0440'].map((n, i) => ({
        cells: [
          { v: `L260909-${n}`, align: 'left' },
          { v: i % 2 ? 'Krios_m' : 'Krios_s', align: 'left' },
          { v: (2400 - i * 60).toLocaleString('ko-KR'), num: true },
          { v: `${(98.2 - i * 0.4).toFixed(1)}%`, num: true },
          { v: i === 2 ? '재검' : '양품', tone: i === 2 ? 'warn' : 'ok' },
        ],
      }))}
    />
  </div>
);
