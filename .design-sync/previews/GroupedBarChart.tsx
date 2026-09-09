import './_rnw';
import React from 'react';
import { GroupedBarChart } from 'dwje-ax-web';

/** 공정별 투입량 · 양품 · 불량 3막대 그룹 — 고정 지표(qty · okQty · ngQty) · 범례 자동 · 1만 이상은 "1.2만" 축약 */
export const Basic = () => (
  <div style={{ width: 600 }}>
    <GroupedBarChart
      data={[
        { label: 'PRESS', qty: 8400, okQty: 8180, ngQty: 220 },
        { label: 'Plating', qty: 8180, okQty: 7990, ngQty: 190 },
        { label: 'Coating', qty: 7990, okQty: 7870, ngQty: 120 },
        { label: 'AOI', qty: 7870, okQty: 7820, ngQty: 50 },
      ]}
      height={240}
    />
  </div>
);

/** 모델별 비교 · 낮은 높이 · 단위 문자열 교체(툴팁에 쓰임) */
export const ByModel = () => (
  <div style={{ width: 460 }}>
    <GroupedBarChart
      data={[
        { label: 'Krios_s', qty: 8400, okQty: 8210, ngQty: 190 },
        { label: 'Krios_m', qty: 5200, okQty: 5040, ngQty: 160 },
        { label: 'Atlas_x', qty: 3100, okQty: 3060, ngQty: 40 },
      ]}
      unit=" EA"
      height={200}
    />
  </div>
);

/** 지표 일부가 null 이면 그 막대만 생략 — 불량 수량 미집계 LOT */
export const PartialNull = () => (
  <div style={{ width: 460 }}>
    <GroupedBarChart
      data={[
        { label: 'L260909-0412', qty: 2040, okQty: 1992, ngQty: 48 },
        { label: 'L260909-0413', qty: 1980, okQty: 1951, ngQty: 29 },
        { label: 'L260909-0414', qty: 2110, okQty: null, ngQty: null },
      ]}
      height={200}
    />
  </div>
);

/** 빈 데이터 → ChartEmpty */
export const Empty = () => (
  <div style={{ width: 320 }}>
    <GroupedBarChart data={[]} height={120} />
  </div>
);
