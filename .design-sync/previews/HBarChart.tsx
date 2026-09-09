import './_rnw';
import React from 'react';
import { HBarChart } from 'dwje-ax-web';

/** 설비별 불량 건수 — 라벨 · 트랙(8% 잉크) · 채움(잉크) · 오른쪽 값(600) */
export const Basic = () => (
  <div style={{ width: 480 }}>
    <HBarChart
      data={[
        { l: 'PR-03', v: 142 },
        { l: 'PR-01', v: 96 },
        { l: 'PL-01', v: 61 },
        { l: 'CT-02', v: 38 },
        { l: 'AOI-1', v: 27 },
      ]}
      unit="건"
    />
  </div>
);

/** cls 로 색 규칙 — bad(빨강) · warn(앰버) · 기본(잉크) · 목표 눈금(target) 표시 */
export const WithTarget = () => (
  <div style={{ width: 480 }}>
    <HBarChart
      data={[
        { l: 'PR-03', v: 3.1, cls: 'bad' },
        { l: 'PL-02', v: 2.2, cls: 'warn' },
        { l: 'PR-02', v: 2.4, cls: 'warn' },
        { l: 'PL-01', v: 1.8 },
        { l: 'CT-01', v: 1.2 },
      ]}
      unit="%"
      target={2.0}
      format={(v) => Number(v).toFixed(1)}
    />
  </div>
);

/** 긴 라벨 — labelWidth · valueWidth 로 열 폭을 맞춥니다 */
export const WideLabels = () => (
  <div style={{ width: 480 }}>
    <HBarChart
      data={[
        { l: '치수 불량(외경)', v: 1240 },
        { l: '도금 두께 하한', v: 860 },
        { l: '스크래치', v: 410 },
        { l: 'AOI 오판정', v: 280 },
      ]}
      unit=" EA"
      labelWidth={120}
      valueWidth={80}
    />
  </div>
);

/** 값이 없는 항목은 걸러지고, 전부 없으면 ChartEmpty */
export const Empty = () => (
  <div style={{ width: 320 }}>
    <HBarChart data={[{ l: 'PR-01', v: null }, { l: 'PR-02', v: null }]} />
  </div>
);
