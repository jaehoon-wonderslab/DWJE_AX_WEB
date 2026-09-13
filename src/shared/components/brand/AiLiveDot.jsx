/**
 * 세션 활성 표식 — 핵을 도는 미세 입자
 *
 * 덕반장 AI 레일 머리의 「활성」 점입니다. 그냥 초록 점 하나면 어느 시스템에나 있는
 * 상태 표시지만, 입자가 돌면 **무언가 돌고 있다**는 신호가 됩니다.
 * 레일이 열려 있는 내내 보이는 자리라 누적 인상이 큽니다.
 *
 * 그래서 캔버스가 아니라 CSS 키프레임으로만 만듭니다. 상시 노출되는 요소에
 * requestAnimationFrame 루프를 물리면 화면을 보고 있지 않아도 계속 돌기 때문입니다.
 * 회전은 컴포지터가 처리하므로 JS 는 한 번도 깨어나지 않습니다.
 *
 * [주의] 키프레임은 StyleSheet.create 로 등록해야 합니다. react-native-web 는
 *        style 에 인라인으로 넘긴 animationKeyframes 를 무시합니다.
 *        (같은 함정을 PageTransition 주석에 자세히 적어 두었습니다)
 *
 * 움직임 최소화(prefers-reduced-motion)는 app/+html.jsx 의 전역 CSS 가 멈춥니다.
 */
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useTheme } from '@shared/theme/useTheme';

/** 공전 궤도 — 주기(초)와 방향이 달라야 같은 자리에서 겹치지 않습니다 */
const ORBITS = [
  { duration: 3.6, reverse: false, delay: 0 },
  { duration: 5.4, reverse: true, delay: -1.2 },
  { duration: 7.8, reverse: false, delay: -2.6 },
];

/** 궤도별로 한 번만 등록한 회전 스타일 — 키: `주기|방향|지연` */
const CACHE = new Map();

function spinStyle({ duration, reverse, delay }) {
  const key = `${duration}|${reverse}|${delay}`;
  let style = CACHE.get(key);
  if (!style) {
    style = StyleSheet.create({
      spin: {
        animationKeyframes: {
          // 키프레임 안의 transform 은 반드시 문자열이어야 합니다 (배열은 컴파일되지 않습니다)
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: `rotate(${reverse ? '-360' : '360'}deg)` },
        },
        animationDuration: `${duration}s`,
        animationTimingFunction: 'linear',
        animationIterationCount: 'infinite',
        animationDelay: `${delay}s`,
      },
    }).spin;
    CACHE.set(key, style);
  }
  return style;
}

export default function AiLiveDot({ size = 14, color, style }) {
  const theme = useTheme();
  const core = color || theme.color.success;
  const coreSize = Math.round(size * 0.36);
  const dot = Math.max(2, Math.round(size * 0.18));

  const box = { width: size, height: size, alignItems: 'center', justifyContent: 'center' };
  const coreStyle = { width: coreSize, height: coreSize, borderRadius: 99, backgroundColor: core };

  // 네이티브에서는 점만 찍습니다 (이 화면은 웹 전용입니다)
  if (Platform.OS !== 'web') {
    return <View style={[box, style]}><View style={coreStyle} /></View>;
  }

  return (
    <View pointerEvents="none" style={[box, style]}>
      <View style={coreStyle} />
      {ORBITS.map((orbit) => (
        <View
          key={orbit.duration}
          style={[
            { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
            spinStyle(orbit),
          ]}
        >
          {/* 위성 — 궤도 위쪽 끝에 붙여 두고 부모를 돌립니다 */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: (size - dot) / 2,
              width: dot,
              height: dot,
              borderRadius: 99,
              backgroundColor: theme.alpha('success', 0.62),
            }}
          />
        </View>
      ))}
    </View>
  );
}
