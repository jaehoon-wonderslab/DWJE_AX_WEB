import './_rnw';
import React from 'react';
import { ParetoChart } from 'dwje-ax-web';

/** 불량 유형 파레토 — 수량 내림차순 자동 정렬 · 상위 3 강조 · 누적 % 곡선 · 80% 집중관리선 */
export const Basic = () => (
  <div style={{ width: 600 }}>
    <ParetoChart
      data={[
        { label: '치수 불량', value: 412 },
        { label: '도금 두께', value: 286 },
        { label: '스크래치', value: 174 },
        { label: '이물', value: 98 },
        { label: '변색', value: 61 },
        { label: '버(Burr)', value: 44 },
        { label: '찍힘', value: 27 },
        { label: '기타', value: 18 },
      ]}
      height={230}
    />
  </div>
);

/** 항목이 적을 때 · 단위 교체(건) · 낮은 높이 — `l`/`v` 키도 받습니다 */
export const Few = () => (
  <div style={{ width: 460 }}>
    <ParetoChart
      data={[
        { l: '하중 편차', v: 38 },
        { l: '금형 마모', v: 21 },
        { l: '급유 부족', v: 9 },
        { l: '센서 오류', v: 4 },
      ]}
      unit="건"
      height={200}
    />
  </div>
);

/** 값이 0 이하이거나 비어 있으면 ChartEmpty */
export const Empty = () => (
  <div style={{ width: 320 }}>
    <ParetoChart data={[]} height={120} />
  </div>
);
