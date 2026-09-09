import './_rnw';
import React from 'react';
import { DonutChart } from 'dwje-ax-web';

/** 불량 유형 비율 — 도넛(왼쪽) + 계열 범례(오른쪽, 값·비중) */
export const DefectTypes = () => (
  <div style={{ width: 340 }}>
    <DonutChart
      segs={[
        { l: '치수 불량', v: 412 },
        { l: '도금 두께', v: 268 },
        { l: '외관 스크래치', v: 154 },
        { l: 'AOI 오판정', v: 96 },
        { l: '기타', v: 38 },
      ]}
      height={180}
      unitLabel="EA"
    />
  </div>
);

/** 목표 달성 현황 — 계열 3개 · 단위 "건" · 높이 160 */
export const GoalSummary = () => (
  <div style={{ width: 340 }}>
    <DonutChart
      segs={[
        { l: '달성', v: 9 },
        { l: '진행 중', v: 4 },
        { l: '미달', v: 2 },
      ]}
      height={160}
      unitLabel="건"
    />
  </div>
);

/** 값이 null 인 항목은 걸러지고, 남는 것이 없으면 "데이터 없음" */
export const Empty = () => (
  <div style={{ width: 340 }}>
    <DonutChart segs={[{ l: '치수 불량', v: null }, { l: '도금 두께', v: null }]} height={160} />
  </div>
);
