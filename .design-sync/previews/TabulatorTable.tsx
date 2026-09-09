import './_rnw';
import React from 'react';
import { TabulatorTable } from 'dwje-ax-web';

/** 일자 → 제품 → 공장·공정·설비 3단 트리 (실적 집계 화면 전용 열 구조) */
const day = (date: string, products: any[]) => {
  const sum = (k: string) => products.reduce((n, p) => n + (p[k] || 0), 0);
  const input = sum('inputQty');
  const ng = sum('ngQty');
  return {
    date,
    depth: 1,
    inputQty: input,
    okQty: sum('okQty'),
    ngQty: ng,
    defectRate: input ? (ng / input) * 100 : null,
    uptimeRate: products.length ? products.reduce((n, p) => n + p.uptimeRate, 0) / products.length : null,
    downtimeMin: sum('downtimeMin'),
    _children: products.map((p) => ({ ...p, depth: 2, isChild: true, _children: (p._children || []).map((c: any) => ({ ...c, depth: 3, isGrandChild: true, parentProductNm: p.productNm })) })),
  };
};

const ROWS = [
  day('2026-09-08', [
    {
      productNm: 'Krios_s', inputQty: 24200, okQty: 23742, ngQty: 458, defectRate: 1.9, uptimeRate: 93.1, downtimeMin: 96,
      _children: [
        { plantNm: '제1공장', processNm: '프레스', equipNm: 'PR-01', inputQty: 12400, okQty: 12214, ngQty: 186, defectRate: 1.5, uptimeRate: 94.2, downtimeMin: 42 },
        { plantNm: '제1공장', processNm: '프레스', equipNm: 'PR-03', inputQty: 11800, okQty: 11528, ngQty: 272, defectRate: 2.3, uptimeRate: 92.0, downtimeMin: 54 },
      ],
    },
    {
      productNm: 'Atlas_x', inputQty: 16100, okQty: 15844, ngQty: 256, defectRate: 1.6, uptimeRate: 97.4, downtimeMin: 25,
      _children: [
        { processNm: '도금', equipNm: 'PL-01', inputQty: 8200, okQty: 8102, ngQty: 98, defectRate: 1.2, uptimeRate: 97.4, downtimeMin: 12 },
        { processNm: '코팅', equipNm: 'CT-01', inputQty: 7900, okQty: 7742, ngQty: 158, defectRate: 2.0, uptimeRate: 97.4, downtimeMin: 13 },
      ],
    },
  ]),
  day('2026-09-07', [
    { productNm: 'Krios_s', inputQty: 23800, okQty: 23162, ngQty: 638, defectRate: 2.7, uptimeRate: 90.4, downtimeMin: 138, _children: [] },
    { productNm: 'Krios_m', inputQty: 9600, okQty: 9446, ngQty: 154, defectRate: 1.6, uptimeRate: 96.1, downtimeMin: 28, _children: [] },
  ]),
  day('2026-09-06', [
    { productNm: 'Krios_s', inputQty: 22400, okQty: 22042, ngQty: 358, defectRate: 1.6, uptimeRate: 95.2, downtimeMin: 62, _children: [] },
  ]),
  day('2026-09-05', [
    { productNm: 'Atlas_x', inputQty: 15200, okQty: 14896, ngQty: 304, defectRate: 2.0, uptimeRate: 94.8, downtimeMin: 70, _children: [] },
    { productNm: 'Krios_m', inputQty: 9100, okQty: 8990, ngQty: 110, defectRate: 1.2, uptimeRate: 97.9, downtimeMin: 15, _children: [] },
  ]),
  day('2026-09-04', [
    { productNm: 'Krios_s', inputQty: 24800, okQty: 24306, ngQty: 494, defectRate: 2.0, uptimeRate: 93.6, downtimeMin: 88, _children: [] },
  ]),
];

/** 일자별 집계 — 열 구조가 고정된 실적 표. 행 왼쪽 + 로 제품·설비까지 펼칩니다(캡처는 접힌 상태) · 열 최소 폭 합 1,080px 이라 1200px 뷰포트가 필요 */
export const Daily = () => (
  <div style={{ width: 1150 }}>
    <TabulatorTable rows={ROWS} />
  </div>
);

/** 빈 상태 — emptyText */
export const Empty = () => (
  <div style={{ width: 1150 }}>
    <TabulatorTable rows={[]} emptyText="해당 기간의 실적이 없습니다." />
  </div>
);
