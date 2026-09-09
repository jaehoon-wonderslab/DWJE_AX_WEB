import './_rnw';
import React from 'react';
import { HeatMap } from 'dwje-ax-web';

const HOURS = ['06', '08', '10', '12', '14', '16', '18', '20'];

/** 설비 × 2시간 구간 가동률 — 낮을수록 진하게, 미측정 칸은 "—" */
export const Utilization = () => (
  <div style={{ width: 560 }}>
    <HeatMap
      rows={['프레스 1 (PR-01)', '프레스 2 (PR-02)', '프레스 3 (PR-03)', '도금 1 (PL-01)', '코팅 1 (CT-01)', 'AOI 1 (AO-01)']}
      cols={HOURS}
      data={[
        [96, 98, 97, 88, 95, 97, 96, 94],
        [92, 94, 91, 85, 90, 93, 89, 91],
        [78, 64, 52, 47, 58, 71, 83, 86],
        [95, 96, 96, 90, 94, 95, 97, 96],
        [88, 91, 93, 79, 90, 92, 94, 93],
        [99, 99, 98, 97, null, 99, 99, 98],
      ]}
      lo={40}
      hi={100}
      unit="%"
    />
  </div>
);

/** 촘촘한 판 — cellHeight 24 · 0~100 범위(lo=0) */
export const Compact = () => (
  <div style={{ width: 560 }}>
    <HeatMap
      rows={['PR-01', 'PR-02', 'PR-03', 'PR-04']}
      cols={['월', '화', '수', '목', '금', '토']}
      data={[
        [97, 96, 98, 95, 97, 90],
        [93, 91, 94, 92, 90, 84],
        [62, 71, 55, 68, 74, 60],
        [95, 97, 96, 94, 96, 88],
      ]}
      lo={0}
      hi={100}
      cellHeight={24}
    />
  </div>
);

/** rows 나 cols 가 비면 "데이터 없음" */
export const Empty = () => (
  <div style={{ width: 560 }}>
    <HeatMap rows={[]} cols={HOURS} data={[]} />
  </div>
);
