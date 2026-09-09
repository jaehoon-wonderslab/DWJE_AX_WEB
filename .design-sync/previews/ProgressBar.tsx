import './_rnw';
import React from 'react';
import { ProgressBar } from 'dwje-ax-web';

const Labeled = ({ label, pct, tone }: { label: string; pct: number; tone?: 'ok' | 'warn' | 'bad' | '' }) => (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 500 }}>
      <span style={{ color: '#3C3C3C' }}>{label}</span>
      <span style={{ color: '#0B1440', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{pct.toFixed(1)}%</span>
    </div>
    <ProgressBar percent={pct} tone={tone} />
  </div>
);

/** 톤 4종 — 기본(ink500) · ok(잉크) · warn(앰버) · bad(적색) */
export const Tones = () => (
  <div style={{ width: 260, display: 'flex', flexDirection: 'column', gap: 14 }}>
    <Labeled label="기본" pct={62} />
    <Labeled label="ok — 목표 달성" pct={97.4} tone="ok" />
    <Labeled label="warn — 목표 근접" pct={83.5} tone="warn" />
    <Labeled label="bad — 미달" pct={41.2} tone="bad" />
  </div>
);

/** 공정별 계획 달성률 — 라벨·수치와 함께 세로 나열 */
export const Achievement = () => (
  <div style={{ width: 260, display: 'flex', flexDirection: 'column', gap: 14 }}>
    <Labeled label="PRESS" pct={96.2} tone="ok" />
    <Labeled label="Plating" pct={88.7} tone="warn" />
    <Labeled label="Coating" pct={102.4} tone="ok" />
    <Labeled label="AOI" pct={73.9} tone="bad" />
  </div>
);

/** 경계값 — 0 · 100 · 100 초과(잘림) · 음수(0 으로) */
export const Clamped = () => (
  <div style={{ width: 260, display: 'flex', flexDirection: 'column', gap: 6 }}>
    <ProgressBar percent={0} />
    <ProgressBar percent={100} tone="ok" />
    <ProgressBar percent={130} tone="warn" />
    <ProgressBar percent={-20} tone="bad" />
  </div>
);
