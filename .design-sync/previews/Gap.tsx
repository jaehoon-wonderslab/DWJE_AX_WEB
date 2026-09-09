import './_rnw';
import React from 'react';
import { Gap, StatCard } from 'dwje-ax-web';

const Bar = ({ label }: { label: string }) => (
  <div style={{ height: 36, borderRadius: 10, background: '#FAFAFA', border: '1px solid #DFE1E7', display: 'flex', alignItems: 'center', paddingLeft: 12, fontSize: 12, fontWeight: 500, color: '#3C3C3C' }}>{label}</div>
);

/** 기본 14px — 카드 사이 세로 간격(Grid 의 gap 과 같은 값) */
export const Default = () => (
  <div style={{ width: 280 }}>
    <StatCard label="종합 수율" value="97.4" unit="%" sub="목표 97.0% 달성" tone="up" />
    <Gap />
    <StatCard label="PRESS 불량률" value="1.8" unit="%" sub="전일 대비 +0.4%p" tone="down" />
  </div>
);

/** size — 8 · 14 · 24 · 40 */
export const Sizes = () => (
  <div style={{ width: 280 }}>
    <Bar label="size 8 ↓" />
    <Gap size={8} />
    <Bar label="size 14 ↓ (기본)" />
    <Gap size={14} />
    <Bar label="size 24 ↓" />
    <Gap size={24} />
    <Bar label="size 40 ↓" />
    <Gap size={40} />
    <Bar label="끝" />
  </div>
);
