import './_rnw';
import React from 'react';
import { SignalLegend } from 'dwje-ax-web';

/** 달성률 신호등 — 95% 이상(성공) · 95% 미만(경고) · 85% 미만(오류). 기본 오른쪽 정렬 */
export const Basic = () => (
  <div style={{ width: 300 }}>
    <SignalLegend />
  </div>
);

/** style 로 정렬만 바꿉니다 — 표 아래 왼쪽 범례 */
export const LeftAligned = () => (
  <div style={{ width: 300 }}>
    <SignalLegend style={{ justifyContent: 'flex-start' }} />
  </div>
);
