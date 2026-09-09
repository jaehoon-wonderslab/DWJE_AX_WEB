import './_rnw';
import React from 'react';
import { LogoLockup } from 'dwje-ax-web';

/** 기본 잠금 — 마크 + "덕우전자 AX" + 태그라인. 사이드바 머리말·로그인 화면 */
export const Basic = () => (
  <div style={{ display: 'flex', width: 280 }}>
    <LogoLockup size={28} />
  </div>
);

/** compact — 태그라인 없이 한 줄. 사이드바 접힘·상단 바·인쇄 머리말 */
export const Compact = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: 280 }}>
    <LogoLockup size={24} compact />
    <LogoLockup size={20} compact />
  </div>
);

/** light — 어두운 잉크 패널 위에서 글자를 흰색, AX 를 스카이블루로 고정 */
export const Light = () => (
  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16, width: 280, padding: '20px 24px', background: '#0B1440', borderRadius: 12 }}>
    <LogoLockup size={28} light />
    <LogoLockup size={22} light compact />
  </div>
);
