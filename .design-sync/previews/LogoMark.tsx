import './_rnw';
import React from 'react';
import { LogoMark } from 'dwje-ax-web';

const Row = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>{children}</div>
);
const Cap = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 10.5, color: '#787878', marginTop: 6, textAlign: 'center' }}>{children}</div>
);

/** 크기 단계 — 16(파비콘) · 24(탭 바) · 32(기본, 사이드바) · 48 · 64(로그인 히어로) */
export const Sizes = () => (
  <Row>
    {[16, 24, 32, 48, 64].map((n) => (
      <div key={n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <LogoMark size={n} />
        <Cap>{n}</Cap>
      </div>
    ))}
  </Row>
);

/** 단색(mono) — 현재 글자색으로 그립니다. 인쇄 · 비활성 · 워터마크용 */
export const Mono = () => (
  <Row>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <LogoMark size={48} />
      <Cap>컬러</Cap>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <LogoMark size={48} mono />
      <Cap>mono</Cap>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.35 }}>
      <LogoMark size={48} mono />
      <Cap>mono · 35%</Cap>
    </div>
  </Row>
);

/** 어두운 잉크(#0B1440) 패널 위 — 그라디언트가 그대로 살아야 합니다 */
export const OnInk = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, width: 280, height: 112, background: '#0B1440', borderRadius: 12 }}>
    <LogoMark size={48} />
    <LogoMark size={32} />
    <LogoMark size={24} />
  </div>
);
