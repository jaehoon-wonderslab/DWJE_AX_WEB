import './_rnw';
import React from 'react';
import { LineChart } from 'dwje-ax-web';

const DAYS = ['08-27', '08-28', '08-29', '08-30', '08-31', '09-01', '09-02', '09-03', '09-04', '09-05', '09-06', '09-07'];

/** 일별 공정 불량률 12일 · 목표선(앰버 점선) · 단위 % — 값·눈금은 10 미만이면 소수 1자리 */
export const Basic = () => (
  <div style={{ width: 600 }}>
    <LineChart
      labels={DAYS}
      series={[{ name: '공정 불량률', data: [2.4, 2.1, 2.9, 1.8, 1.6, 2.2, 2.6, 1.7, 1.4, 1.9, 2.3, 2.0] }]}
      target={2.0}
      unit="%"
      height={190}
    />
  </div>
);

/** 두 계열 비교 — 첫 계열만 면 채움, 둘째는 점선(dashed) · 하단 범례 자동 */
export const TwoSeries = () => (
  <div style={{ width: 600 }}>
    <LineChart
      labels={DAYS}
      series={[
        { name: 'PRESS 불량률', data: [2.1, 2.4, 1.9, 2.6, 2.2, 2.8, 3.1, 2.7, 2.3, 2.0, 1.8, 2.2] },
        { name: 'Plating 불량률', data: [1.6, 1.5, 1.8, 1.7, 1.4, 1.9, 2.0, 1.8, 1.6, 1.5, 1.7, 1.6], dashed: true },
      ]}
      unit="%"
      height={190}
    />
  </div>
);

/** 미적재 구간(null) 은 선을 끊어 그립니다 — 0 으로 떨어지지 않음 */
export const NullGap = () => (
  <div style={{ width: 600 }}>
    <LineChart
      labels={['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00']}
      series={[{ name: 'PR-03 가동률', data: [92, 94, 95, null, null, 93, 96, 97, 95, 94] }]}
      unit="%"
      min={80}
      max={100}
      height={170}
    />
  </div>
);

/** 카드 안 작은 추이 — 계획(점선) 대비 실적 · showLegend=false · 고정 y 범위(min/max) */
export const Compact = () => (
  <div style={{ width: 320 }}>
    <LineChart
      labels={['월', '화', '수', '목', '금', '토']}
      series={[
        { name: '계획', data: [12000, 12000, 12000, 12000, 12000, 8000], dashed: true },
        { name: '실적', data: [10400, 11120, 9860, 11340, 10620, 6180] },
      ]}
      showLegend={false}
      min={6000}
      max={14000}
      height={170}
    />
  </div>
);

/** 데이터가 없으면 ChartEmpty("데이터 없음") 자리표시 */
export const Empty = () => (
  <div style={{ width: 320 }}>
    <LineChart labels={[]} series={[]} height={120} />
  </div>
);
