import './_rnw';
import React from 'react';
import { RadarChart } from 'dwje-ax-web';

/** 현재값 + 목표선 — AI 성능·공정 지표 5축. 목표(t)는 점선, 현재(v)는 잉크 채움 */
export const WithTarget = () => (
  <div style={{ width: 300 }}>
    <RadarChart
      axes={[
        { l: '수율', v: 97, t: 97 },
        { l: '가동률', v: 88, t: 92 },
        { l: '납기', v: 94, t: 95 },
        { l: 'AOI 정확도', v: 91, t: 90 },
        { l: '재검률', v: 76, t: 85 },
      ]}
      height={220}
    />
  </div>
);

/** 현재값만 — 목표 없이 4축 */
export const CurrentOnly = () => (
  <div style={{ width: 300 }}>
    <RadarChart axes={[{ l: 'PRESS', v: 98 }, { l: 'Plating', v: 93 }, { l: 'Coating', v: 96 }, { l: 'AOI', v: 99 }]} height={200} />
  </div>
);

/** 모든 축 v 가 null 이면 "데이터 없음" (미측정 지표) */
export const Empty = () => (
  <div style={{ width: 300 }}>
    <RadarChart axes={[{ l: '수율', v: null }, { l: '가동률', v: null }, { l: '납기', v: null }]} height={160} />
  </div>
);
