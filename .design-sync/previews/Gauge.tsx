import './_rnw';
import React from 'react';
import { Gauge } from 'dwje-ax-web';

/** 목표 진척도 — level="ok" 성공색 · target 눈금(앰버) */
export const Ok = () => (
  <div style={{ width: 240 }}>
    <Gauge value={97.4} unit="%" label="종합 수율 · 목표 97.0%" target={97} level="ok" />
  </div>
);

/** 주의 구간 — level="warn" 앰버 채움 */
export const Warn = () => (
  <div style={{ width: 240 }}>
    <Gauge value={82.6} unit="%" label="PR-03 가동률 · 목표 90%" target={90} level="warn" />
  </div>
);

/** 미달 — level="bad" 오류색 · min/max 로 범위 지정 */
export const Bad = () => (
  <div style={{ width: 240 }}>
    <Gauge value={61} min={0} max={120} unit="EA" label="시간당 생산량 · 계획 100" target={100} level="bad" />
  </div>
);

/** level 없음(기본 잉크) · target 없음 · label 없음 */
export const Plain = () => (
  <div style={{ width: 240 }}>
    <Gauge value={42} unit="대" max={48} />
  </div>
);

/** value 가 null 이면 "데이터 없음" (미측정 KPI) */
export const Empty = () => (
  <div style={{ width: 240 }}>
    <Gauge value={null} unit="%" label="설비 가동률" />
  </div>
);
