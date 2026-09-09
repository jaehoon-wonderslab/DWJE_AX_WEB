import './_rnw';
import React from 'react';
import { Drift } from 'dwje-ax-web';

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '6px 0', borderBottom: '1px solid #DFE1E7' }}>
    <span style={{ fontSize: 12, fontWeight: 500, color: '#3C3C3C' }}>{label}</span>
    {children}
  </div>
);

/** 기본 — 오르면 나쁨(빨강), 내리면 좋음(초록). 불량률·비가동 같은 지표용 */
export const Default = () => (
  <div style={{ width: 240 }}>
    <Row label="PRESS 불량률"><Drift value={0.4} /></Row>
    <Row label="Plating 불량률"><Drift value={-0.2} /></Row>
    <Row label="AOI 오판정률"><Drift value={1.15} /></Row>
  </div>
);

/** invert — 오르면 좋음(초록). 수율·달성률·가동률용 */
export const Inverted = () => (
  <div style={{ width: 240 }}>
    <Row label="종합 수율"><Drift value={0.3} invert /></Row>
    <Row label="계획 달성률"><Drift value={-1.8} invert /></Row>
    <Row label="설비 가동률"><Drift value={2.1} invert /></Row>
  </div>
);

/** 단위 — 기본 %p 외에 % · µm · °C (값은 항상 소수 1자리) */
export const Units = () => (
  <div style={{ width: 240 }}>
    <Row label="전일 대비 (%p)"><Drift value={0.4} /></Row>
    <Row label="전주 대비 (%)"><Drift value={-3.2} unit="%" /></Row>
    <Row label="도금 두께 (µm)"><Drift value={-0.3} unit=" µm" /></Row>
    <Row label="금형 온도 (°C)"><Drift value={2.4} unit="°C" /></Row>
  </div>
);
