import './_rnw';
import React from 'react';
import { ConstellationField, LIGHT_PALETTE } from 'dwje-ax-web';

/** 캔버스는 부모를 absolute 로 채우므로 relative 컨테이너에 고정 크기를 줍니다 */
const Frame = ({ bg, children }: { bg: string; children: React.ReactNode }) => (
  <div style={{ position: 'relative', width: 520, height: 260, background: bg, borderRadius: 16, overflow: 'hidden' }}>{children}</div>
);

/** 히어로(로그인 · 랜딩) — 잉크 배경 위 형광 팔레트, 뇌 실루엣 */
export const DarkHero = () => (
  <Frame bg="#0B1440">
    <ConstellationField shape="brain" density={1} />
    <div style={{ position: 'absolute', left: 24, bottom: 20, color: '#ffffff' }}>
      <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: -0.3 }}>덕우전자 AX</div>
      <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: 0.9, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>AI DECISION LAYER</div>
    </div>
  </Frame>
);

/** 흰 패널 위 — LIGHT_PALETTE(잉크 계열) · orb 형상 · 오른쪽 치우침 · 정지(animate=false) */
export const LightPanel = () => (
  <Frame bg="#FFFFFF">
    <div style={{ position: 'absolute', inset: 0, border: '1px solid #DFE1E7', borderRadius: 16 }} />
    <ConstellationField shape="orb" palette={LIGHT_PALETTE} centerX={0.72} scale={0.42} opacity={0.85} animate={false} />
    <div style={{ position: 'absolute', left: 24, top: 24, width: 240 }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: '#787878' }}>AI 브리핑 · 09:00 기준</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: '#0B1440', marginTop: 6, lineHeight: '21px' }}>
        PRESS 라인 불량률 2.6% — PR-03 금형 교체 이후 치수 불량 집중
      </div>
    </div>
  </Frame>
);

/** 사용자 팔레트 + activity 2 — 앰버·흰색만 쓴 두 톤 팔레트, 드리프트·반짝임 두 배, 밀도 1.3, 형상을 크게(scale 0.46) */
export const AmberPalette = () => (
  <Frame bg="#0B1440">
    <ConstellationField shape="brain" palette={['#F2C14E', '#ffb829', '#ffffff', '#f7dc8a']} density={1.3} activity={2} scale={0.42} centerX={0.66} centerY={0.46} />
    <div style={{ position: 'absolute', left: 24, bottom: 20, color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: 500, letterSpacing: 0.6 }}>
      PALETTE=AMBER · ACTIVITY=2 · DENSITY=1.3
    </div>
  </Frame>
);
