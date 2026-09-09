import './_rnw';
import React from 'react';
import { Table, Badge, StateBadge } from 'dwje-ax-web';

const rows = [
  { id: 'PR-01', process: 'PRESS', model: 'Krios_s', lot: 'L260909-0401', qty: 12400, ng: 186, rate: 1.5, state: '가동' },
  { id: 'PR-03', process: 'PRESS', model: 'Krios_s', lot: 'L260909-0412', qty: 11800, ng: 472, rate: 4.0, state: '경고' },
  { id: 'PL-01', process: 'Plating', model: 'Krios_m', lot: 'L260909-0418', qty: 9600, ng: 154, rate: 1.6, state: '가동' },
  { id: 'PL-02', process: 'Plating', model: 'Krios_m', lot: 'L260909-0420', qty: 0, ng: 0, rate: null, state: '점검 중' },
  { id: 'CT-01', process: 'Coating', model: 'Atlas_x', lot: 'L260909-0431', qty: 8200, ng: 98, rate: 1.2, state: '가동' },
  { id: 'AOI-2', process: 'AOI', model: 'Atlas_x', lot: 'L260909-0431', qty: 8150, ng: 212, rate: 2.6, state: '가동' },
];

/** 기본 — key/title/width/flex/align 열 정의, 빈 값은 '—' */
export const Basic = () => (
  <div style={{ width: 760 }}>
    <Table
      columns={[
        { key: 'id', title: '설비', width: 84, mono: true },
        { key: 'process', title: '공정', width: 90 },
        { key: 'model', title: '모델', flex: 1 },
        { key: 'lot', title: 'LOT', width: 130, mono: true },
        { key: 'qty', title: '생산량', width: 96, align: 'right', num: true },
        { key: 'ng', title: '불량', width: 80, align: 'right', num: true },
        { key: 'rate', title: '불량률(%)', width: 96, align: 'right', num: true },
      ]}
      rows={rows.map((r) => ({ ...r, rate: r.rate == null ? null : r.rate.toFixed(1) }))}
      keyExtractor={(r) => r.id}
    />
  </div>
);

/** render 열 — 배지·상태 같은 React 노드를 셀에 포털로 그립니다. onRowPress 로 행 클릭 */
export const WithRender = () => (
  <div style={{ width: 760 }}>
    <Table
      columns={[
        { key: 'id', title: '설비', width: 84, mono: true },
        { key: 'process', title: '공정', width: 90 },
        { key: 'lot', title: 'LOT', flex: 1, mono: true },
        { key: 'qty', title: '생산량', width: 96, align: 'right', num: true },
        {
          key: 'rate',
          title: '불량률',
          width: 110,
          align: 'right',
          render: (r) => (r.rate == null ? <Badge>미집계</Badge> : <Badge tone={r.rate >= 3 ? 'red' : r.rate >= 2 ? 'amber' : 'green'}>{`${r.rate.toFixed(1)}%`}</Badge>),
        },
        { key: 'state', title: '상태', width: 96, align: 'center', render: (r) => <StateBadge state={r.state} /> },
      ]}
      rows={rows}
      keyExtractor={(r) => r.id}
      onRowPress={() => {}}
    />
  </div>
);

/** filterable — 머리글마다 검색 입력칸 (render 열은 제외) */
export const Filterable = () => (
  <div style={{ width: 760 }}>
    <Table
      filterable
      columns={[
        { key: 'id', title: '설비', width: 110, mono: true },
        { key: 'process', title: '공정', width: 120 },
        { key: 'model', title: '모델', flex: 1 },
        { key: 'lot', title: 'LOT', width: 150, mono: true },
        { key: 'qty', title: '생산량', width: 110, align: 'right', num: true },
      ]}
      rows={rows.slice(0, 4)}
      keyExtractor={(r) => r.id}
    />
  </div>
);

/** 빈 상태 — emptyText 문구 */
export const Empty = () => (
  <div style={{ width: 760 }}>
    <Table
      columns={[
        { key: 'id', title: '설비', width: 110 },
        { key: 'process', title: '공정', width: 120 },
        { key: 'lot', title: 'LOT', flex: 1 },
        { key: 'qty', title: '생산량', width: 110, align: 'right' },
      ]}
      rows={[]}
      emptyText="선택한 기간에 집계된 실적이 없습니다."
    />
  </div>
);
