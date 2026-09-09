import './_rnw';
import React from 'react';
import { DotPlot } from 'dwje-ax-web';

/** 공정별 수율 vs 목표 97% — 축은 95~100 (0 에서 시작하지 않는 것이 의도) · 오른쪽에 편차 %p */
export const YieldVsTarget = () => (
  <div style={{ width: 540 }}>
    <DotPlot
      data={[
        { l: 'PRESS', v: 98.1 },
        { l: 'Plating', v: 96.4, cls: 'warn' },
        { l: 'Coating', v: 97.4 },
        { l: 'AOI', v: 99.2 },
        { l: '조립', v: 95.3, cls: 'bad' },
      ]}
      min={95}
      max={100}
      target={97}
      unit="%"
    />
  </div>
);

/** target 없이 위치만 — 설비 가동률 80~100 · 정수(digits=0) · 넓은 라벨 열 */
export const NoTarget = () => (
  <div style={{ width: 540 }}>
    <DotPlot
      data={[
        { l: '프레스 1 (PR-01)', v: 96 },
        { l: '프레스 3 (PR-03)', v: 83, cls: 'warn' },
        { l: '도금 1 (PL-01)', v: 94 },
        { l: 'AOI 1 (AO-01)', v: 99 },
      ]}
      min={80}
      max={100}
      unit="%"
      digits={0}
      labelWidth={110}
    />
  </div>
);

/** 값이 모두 null 이면 "데이터 없음" */
export const Empty = () => (
  <div style={{ width: 540 }}>
    <DotPlot data={[{ l: 'PRESS', v: null }, { l: 'Plating', v: null }]} />
  </div>
);
