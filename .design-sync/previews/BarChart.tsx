import './_rnw';
import React from 'react';
import { BarChart } from 'dwje-ax-web';

/** 공정별 불량 건수 — 단일 계열(잉크) · 막대 위 수치 상시 표기 */
export const Basic = () => (
  <div style={{ width: 520 }}>
    <BarChart
      data={[
        { l: 'PRESS', v: 142 },
        { l: 'Plating', v: 96 },
        { l: 'Coating', v: 61 },
        { l: 'AOI', v: 38 },
        { l: '조립', v: 27 },
        { l: '포장', v: 9 },
      ]}
      unit="건"
      height={190}
    />
  </div>
);

/** 설비별 불량률(%) · 목표선 2.0% — 목표를 넘은 막대의 수치는 빨간색 */
export const WithTarget = () => (
  <div style={{ width: 520 }}>
    <BarChart
      data={[
        { l: 'PR-01', v: 1.6 },
        { l: 'PR-02', v: 2.4 },
        { l: 'PR-03', v: 3.1 },
        { l: 'PL-01', v: 1.8 },
        { l: 'PL-02', v: 2.2 },
        { l: 'CT-01', v: 1.2 },
      ]}
      unit="%"
      target={2.0}
      height={190}
    />
  </div>
);

/** 보조 계열(v2) 나란히 — 주간(잉크) · 야간(남보라) 불량 건수. 수치 라벨이 좁게 붙으니 3자리 이하 값에 적합 */
export const Paired = () => (
  <div style={{ width: 520 }}>
    <BarChart
      data={[
        { l: 'PRESS', v: 142, v2: 98 },
        { l: 'Plating', v: 96, v2: 131 },
        { l: 'Coating', v: 61, v2: 44 },
        { l: 'AOI', v: 38, v2: 72 },
        { l: '조립', v: 27, v2: 15 },
      ]}
      unit="건"
      height={190}
    />
  </div>
);

/** stacked — v(주간) 위에 v2(야간) 를 쌓습니다 */
export const Stacked = () => (
  <div style={{ width: 520 }}>
    <BarChart
      stacked
      data={[
        { l: 'PRESS', v: 7200, v2: 4600 },
        { l: 'Plating', v: 6800, v2: 4100 },
        { l: 'Coating', v: 6900, v2: 3900 },
        { l: 'AOI', v: 7100, v2: 4400 },
        { l: '조립', v: 6400, v2: 3600 },
      ]}
      unit=" EA"
      height={190}
    />
  </div>
);

/** 값이 모두 null 이거나 비어 있으면 ChartEmpty */
export const Empty = () => (
  <div style={{ width: 320 }}>
    <BarChart data={[]} height={120} />
  </div>
);
