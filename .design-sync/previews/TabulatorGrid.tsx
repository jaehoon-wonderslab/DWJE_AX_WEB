import './_rnw';
import React from 'react';
import { TabulatorGrid } from 'dwje-ax-web';

const num = (cell: any) => {
  const v = cell.getValue();
  return `<span class="num">${v === null || v === undefined ? '—' : Number(v).toLocaleString('ko-KR')}</span>`;
};
const pct = (cell: any) => {
  const v = cell.getValue();
  return `<span class="num">${v === null || v === undefined ? '—' : `${Number(v).toFixed(1)} %`}</span>`;
};
const status = (cell: any) => {
  const v = cell.getValue();
  const tone = v === '정상' ? 'green' : v === '주의' ? 'amber' : v === '이상' ? 'red' : v === '점검 중' ? 'blue' : '';
  return `<span class="tag ${tone ? `tag-${tone}` : ''}">${v}</span>`;
};

const COLUMNS = [
  { title: '설비', field: 'equip', width: 84, formatter: (c: any) => `<span class="mono">${c.getValue()}</span>` },
  { title: '공정', field: 'process', width: 90 },
  { title: '모델', field: 'model', widthGrow: 1 },
  { title: '투입', field: 'inputQty', width: 96, hozAlign: 'right', headerHozAlign: 'right', formatter: num },
  { title: '양품', field: 'okQty', width: 96, hozAlign: 'right', headerHozAlign: 'right', formatter: num },
  { title: '불량', field: 'ngQty', width: 80, hozAlign: 'right', headerHozAlign: 'right', formatter: num },
  { title: '불량률', field: 'defectRate', width: 88, hozAlign: 'right', headerHozAlign: 'right', formatter: pct },
  { title: '가동률', field: 'uptime', width: 88, hozAlign: 'right', headerHozAlign: 'right', formatter: pct },
  { title: '상태', field: 'status', width: 92, hozAlign: 'center', headerHozAlign: 'center', headerFilter: false, formatter: status },
];

const ROWS = [
  { equip: 'PR-01', process: 'PRESS', model: 'Krios_s', inputQty: 12400, okQty: 12214, ngQty: 186, defectRate: 1.5, uptime: 94.2, status: '정상' },
  { equip: 'PR-02', process: 'PRESS', model: 'Krios_s', inputQty: 11950, okQty: 11702, ngQty: 248, defectRate: 2.1, uptime: 91.8, status: '주의' },
  { equip: 'PR-03', process: 'PRESS', model: 'Krios_m', inputQty: 11800, okQty: 11328, ngQty: 472, defectRate: 4.0, uptime: 88.5, status: '이상' },
  { equip: 'PL-01', process: 'Plating', model: 'Krios_m', inputQty: 9600, okQty: 9446, ngQty: 154, defectRate: 1.6, uptime: 96.1, status: '정상' },
  { equip: 'PL-02', process: 'Plating', model: 'Atlas_x', inputQty: null, okQty: null, ngQty: null, defectRate: null, uptime: 0, status: '점검 중' },
  { equip: 'CT-01', process: 'Coating', model: 'Atlas_x', inputQty: 8200, okQty: 8102, ngQty: 98, defectRate: 1.2, uptime: 97.4, status: '정상' },
  { equip: 'CT-02', process: 'Coating', model: 'Atlas_x', inputQty: 7900, okQty: 7742, ngQty: 158, defectRate: 2.0, uptime: 93.0, status: '주의' },
  { equip: 'AOI-2', process: 'AOI', model: 'Krios_s', inputQty: 8150, okQty: 7938, ngQty: 212, defectRate: 2.6, uptime: 98.8, status: '정상' },
];

const INITIAL_SORT = [{ column: 'defectRate', dir: 'desc' }];

/** 실적 집계 — 숫자 오른쪽 정렬(tabular-nums) · 상태 배지(.tag) · 머리글 클릭 정렬 */
export const Summary = () => (
  <div style={{ width: 820 }}>
    <TabulatorGrid columns={COLUMNS} rows={ROWS} headerFilter={false} initialSort={INITIAL_SORT} />
  </div>
);

/** 머리글 검색칸(headerFilter 기본 on) + 행 선택(selectable · rowKey · selected) */
export const Selectable = () => (
  <div style={{ width: 860 }}>
    <TabulatorGrid columns={COLUMNS} rows={ROWS} selectable rowKey="equip" selected={['PR-03', 'PR-02']} onSelectedChange={() => {}} onRowClick={() => {}} />
  </div>
);

const GROUP_COLUMNS = [
  { title: '설비', field: 'equip', width: 110, formatter: (c: any) => `<span class="mono">${c.getValue()}</span>` },
  { title: '모델', field: 'model', widthGrow: 1 },
  { title: '투입', field: 'inputQty', width: 110, hozAlign: 'right', headerHozAlign: 'right', formatter: num },
  { title: '불량', field: 'ngQty', width: 96, hozAlign: 'right', headerHozAlign: 'right', formatter: num },
  { title: '불량률', field: 'defectRate', width: 100, hozAlign: 'right', headerHozAlign: 'right', formatter: pct },
  { title: '상태', field: 'status', width: 96, hozAlign: 'center', headerHozAlign: 'center', formatter: status },
];

/** groupBy — 공정별로 묶고 묶음 머리글에 건수 표시(펼친 만큼 자람) */
export const Grouped = () => (
  <div style={{ width: 760 }}>
    <TabulatorGrid columns={GROUP_COLUMNS} rows={ROWS} groupBy="process" headerFilter={false} />
  </div>
);

/** 빈 상태 — emptyText */
export const Empty = () => (
  <div style={{ width: 760 }}>
    <TabulatorGrid columns={GROUP_COLUMNS} rows={[]} headerFilter={false} emptyText="검색 조건에 맞는 실적이 없습니다." />
  </div>
);
