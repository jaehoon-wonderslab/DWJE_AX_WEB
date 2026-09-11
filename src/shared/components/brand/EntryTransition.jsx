/**
 * 로그인 진입 연출 — 흩어진 입자가 모여 로고가 됩니다
 *
 * 로그인이 성공한 순간 화면 전체를 덮고 한 번만 재생합니다.
 *  1) 입자가 화면 곳곳에 흩어져 떠 있고 (drift)
 *  2) 가운데로 흘러와 덕우전자 심볼 모양을 이룬 뒤 (form)
 *  3) 그 자리에 진짜 심볼이 겹쳐 떠오르고, 덮개가 걷히며 앱이 드러납니다
 *
 * 1회성이라 상시 비용이 없고, 시스템이 깨어나는 순간을 만듭니다.
 *
 * 어디에 붙나 — app/_layout.jsx (루트). 라우트가 바뀌어도 루트 레이아웃은 언마운트되지
 * 않으므로, 로그인 화면 → 앱 화면으로 넘어가는 동안 덮개가 끊기지 않습니다.
 *
 * 형상은 CI 심볼의 점 구름(logoCloud.js)입니다. 빌드 시점에 뽑아 둔 좌표·색이라
 * 비동기 로드도 실패 경로도 없습니다. **색까지 그 픽셀에서 가져왔으므로**
 * 입자가 모이면 심볼의 원래 색(딥 블루 ↔ 스카이 블루 그라디언트)이 그대로 드러납니다.
 *
 * 좌표는 심볼 상자(0~1) 기준 그대로 넘기고, 화면 어디에 얼마만 하게 놓을지는
 * 엔진의 targetRatio 가 정합니다 — 짧은 변의 26% 짜리 가운데 정사각.
 * 창 크기로 직접 환산하면 덮개 상자와 창 크기가 다른 순간(레이아웃 중·부분 마운트)에
 * 입자 형상과 겹쳐 뜨는 진짜 심볼의 자리가 어긋납니다. 둘 다 **같은 상자**를 봐야 합니다.
 * 심볼이 정사각이 아니므로(가로가 6% 김) 좌표도 LogoMark 의 contain 과 같은 규칙으로
 * 정사각 안에 가운데 맞춤합니다.
 *
 * 덮개는 절대로 조작을 막지 않습니다(pointerEvents="none").
 * 연출이 어떤 이유로 끝나지 않아도 사용자가 갇히지 않아야 합니다.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import ParticleSwarm from './ParticleSwarm';
import { LogoMark } from './Logo';
import { LOGO_COLORS, LOGO_POINTS } from './logoCloud';
import { useTheme } from '@shared/theme/useTheme';

/** 연출 진행표 (ms) */
const T_FORM = 140;   // 흩어져 있다가 모이기 시작
const T_LOGO = 640;   // 진짜 심볼이 겹쳐 떠오름
const T_OUT = 900;    // 덮개가 걷히기 시작
const T_END = 1280;   // 끝
const FADE_MS = 380;

/** 심볼이 차지할 크기 — 짧은 변 대비 */
const LOGO_RATIO = 0.26;


/** 덮개가 걷히는 스타일 — 한 번만 등록합니다 */
let fadeOutStyle = null;
function getFadeOut() {
  if (!fadeOutStyle) {
    fadeOutStyle = StyleSheet.create({
      out: {
        animationKeyframes: {
          '0%': { opacity: 1 },
          '100%': { opacity: 0 },
        },
        animationDuration: `${FADE_MS}ms`,
        animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
        animationFillMode: 'forwards',
      },
    }).out;
  }
  return fadeOutStyle;
}

export default function EntryTransition({ onDone }) {
  const theme = useTheme();
  const [step, setStep] = useState('drift');
  // 덮개 자신의 크기 — 입자와 심볼이 같은 기준을 쓰도록 여기서 한 번만 잽니다
  const [box, setBox] = useState({ width: 0, height: 0 });
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  // 진행표 — 움직임을 끈 사용자에게는 덮개 없이 바로 앱을 보여 줍니다
  useEffect(() => {
    const reduced = Platform.OS !== 'web'
      || (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
    if (reduced) {
      doneRef.current?.();
      return undefined;
    }
    const timers = [
      setTimeout(() => setStep('form'), T_FORM),
      setTimeout(() => setStep('logo'), T_LOGO),
      setTimeout(() => setStep('out'), T_OUT),
      setTimeout(() => doneRef.current?.(), T_END),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  if (Platform.OS !== 'web') return null;

  // 심볼이 놓일 자리 — 덮개 짧은 변의 26% 짜리 가운데 정사각 (엔진의 targetRatio 와 같은 계산)
  const side = Math.min(box.width, box.height) * LOGO_RATIO;
  const out = step === 'out';
  const showLogo = step === 'logo' || out;

  return (
    <View
      pointerEvents="none"
      onLayout={(e) => setBox(e.nativeEvent.layout)}
      style={[
        { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.alpha('background', 0.94) },
        out ? getFadeOut() : null,
      ]}
    >
      <ParticleSwarm
        fill
        phase={step === 'drift' ? 'drift' : 'form'}
        targets={LOGO_POINTS}
        targetRatio={LOGO_RATIO}
        count={LOGO_POINTS.length}
        colors={LOGO_COLORS}
        dotScale={1.35}
        grain="dot"
        alphaRange={[0.72, 1]}
        twinkleDepth={0.16}
      />
      {/* 입자가 이룬 형상 위로 진짜 심볼이 겹쳐 떠오릅니다 — 같은 상자·같은 규칙이라 자리가 맞습니다 */}
      {side > 0 ? (
        <View style={{ width: side, height: side, opacity: showLogo ? 1 : 0, transitionProperty: 'opacity', transitionDuration: '320ms' }}>
          <LogoMark size={side} />
        </View>
      ) : null}
    </View>
  );
}
