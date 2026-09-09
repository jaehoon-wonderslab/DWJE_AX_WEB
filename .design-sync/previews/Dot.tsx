import './_rnw';
import React from 'react';
import { Dot } from 'dwje-ax-web';

const Label = ({ children }: { children: React.ReactNode }) => (
  <span style={{ fontSize: 12, fontWeight: 500, color: '#3C3C3C' }}>{children}</span>
);
const Item = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{children}</div>
);

/** 톤 4종 — 기본(잉크) · amber · red · gray */
export const Tones = () => (
  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
    <Item><Dot /><Label>가동</Label></Item>
    <Item><Dot tone="amber" /><Label>주의</Label></Item>
    <Item><Dot tone="red" /><Label>정지</Label></Item>
    <Item><Dot tone="gray" /><Label>비활성</Label></Item>
  </div>
);

/** 크기 — 기본 7px, 범례·강조용으로 5·10·14 */
export const Sizes = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
    <Item><Dot size={5} /><Label>5</Label></Item>
    <Item><Dot size={7} /><Label>7 (기본)</Label></Item>
    <Item><Dot size={10} tone="amber" /><Label>10</Label></Item>
    <Item><Dot size={14} tone="red" /><Label>14</Label></Item>
  </div>
);

/** 설비 현황 범례 — 점 + 이름 + 건수 */
export const Legend = () => (
  <div style={{ width: 220, display: 'flex', flexDirection: 'column', gap: 8 }}>
    {[
      ['', '가동', '42대'],
      ['amber', '주의', '3대'],
      ['red', '비가동', '3대'],
      ['gray', '점검 중', '2대'],
    ].map(([tone, name, cnt]) => (
      <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Dot tone={tone as any} />
        <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: '#3C3C3C' }}>{name}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#0B1440', fontVariantNumeric: 'tabular-nums' }}>{cnt}</span>
      </div>
    ))}
  </div>
);

/** 설비 목록 줄 앞의 상태 점 */
export const InRows = () => (
  <div style={{ width: 260 }}>
    {[
      ['', 'PR-01', 'Krios_s · LOT L260909-0412'],
      ['amber', 'PR-03', '하중 편차 상한 근접'],
      ['red', 'CT-02', '비가동 · 설비 알람'],
    ].map(([tone, id, desc]) => (
      <div key={id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: '1px solid #DFE1E7' }}>
        <Dot tone={tone as any} style={{ marginTop: 5 }} />
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#0B1440' }}>{id}</div>
          <div style={{ fontSize: 11.5, fontWeight: 500, color: '#787878', marginTop: 2 }}>{desc}</div>
        </div>
      </div>
    ))}
  </div>
);
