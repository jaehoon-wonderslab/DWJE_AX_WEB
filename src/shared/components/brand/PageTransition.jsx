/**
 * 화면 전환 애니메이션
 *
 * URL(경로)이 바뀔 때 본문이 옅은 블러에서 선명해지며 살짝 떠오릅니다
 * (blur 10px → 0 · 12px 상승 · 페이드, 420ms).
 * 라우터의 Slot 을 감싸 두면 되고, `routeKey` 가 바뀔 때마다 다시 재생됩니다.
 *
 *  · 웹     — CSS 키프레임. 컴포지터가 돌리므로 JS 가 바쁘거나 탭이 뒤로 가 있어도
 *            멈추지 않습니다. key 를 바꿔 다시 마운트해 재생합니다.
 *  · 네이티브 — Animated.timing (블러 없이 페이드 + 상승만)
 *
 * ─ 웹에서 지켜야 하는 세 가지 ────────────────────────────────────────────
 *
 * [1] 키프레임은 반드시 StyleSheet.create 로 등록해야 합니다.
 *     react-native-web 는 style 에 인라인 객체로 넘긴 animationKeyframes 를 무시합니다
 *     (StyleSheet/compiler 의 inline(): "No support for 'animationKeyframes'").
 *     등록된 스타일만 atomic() 경로를 타서 @keyframes 규칙이 문서에 주입됩니다.
 *     그래서 조합(거리·블러·시간)마다 한 번만 만들어 아래 CACHE 에 담아 둡니다.
 *
 * [2] 키프레임 안의 transform 은 **문자열**이어야 합니다.
 *     animationKeyframes 는 RNW 의 preprocess 를 거치지 않아 `[{ translateY: 12 }]` 같은
 *     배열이 `transform:[object Object]` 로 컴파일되고 브라우저가 선언을 통째로 버립니다.
 *
 * [3] 애니메이션이 끝나면 **스타일을 떼어 냅니다** (animating → false).
 *     블러가 걸린 요소는 containing block 이 되는데, fillMode:both 로 남겨 두면
 *     blur(0) 이어도 그 성질이 그대로 남습니다(마지막 키프레임을 filter:none 으로 써도
 *     브라우저가 blur(0px) 로 정규화해 유지합니다). 그러면 본문 안에서 position:fixed 로 띄우는
 *     드롭다운·팝오버(Field · AlertBell · UserMenu · HourlyDefectPivotMatrix)가 화면이 아니라
 *     이 래퍼를 기준으로 잡혀 엉뚱한 곳에 뜹니다. 끝나면 떼어 내야 합니다.
 *     떼어 낸 뒤의 모습이 애니메이션의 마지막 프레임과 같아서 깜빡임은 없고,
 *     무거운 화면에서 합성 레이어가 계속 남지 않는 이점도 있습니다.
 *
 * 움직임 최소화(prefers-reduced-motion)는 app/+html.jsx 의 전역 CSS 가 처리합니다.
 *
 * 사용 예) <PageTransition routeKey={pathname}><Slot /></PageTransition>
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';

/** 빠르게 도착해 길게 안착하는 감속 곡선 (expo-out) */
const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

const BASE = { flex: 1, minHeight: 0 };

/** 조합별로 한 번만 등록한 전환 스타일 — 키: `거리|블러|시간` */
const CACHE = new Map();

function enterStyle(distance, blur, duration) {
  const key = `${distance}|${blur}|${duration}`;
  let style = CACHE.get(key);
  if (!style) {
    style = StyleSheet.create({
      enter: {
        animationKeyframes: {
          '0%': { opacity: 0, filter: `blur(${blur}px)`, transform: `translateY(${distance}px)` },
          // 블러만 중간 지점을 하나 둡니다. 감속 곡선이 앞쪽으로 몰려 있어
          // 이 키프레임이 없으면 80ms 만에 블러가 사라져 보이지 않습니다.
          // 투명도·이동은 이 프레임에 없으므로 0%→100% 를 그대로 탑니다.
          '50%': { filter: `blur(${(blur * 0.3).toFixed(2)}px)` },
          '100%': { opacity: 1, filter: 'blur(0px)', transform: 'translateY(0px)' },
        },
        animationDuration: `${duration}ms`,
        animationTimingFunction: EASE,
        animationFillMode: 'both',
      },
    }).enter;
    CACHE.set(key, style);
  }
  return style;
}

export default function PageTransition({ routeKey, children, style, distance = 12, blur = 10, duration = 420 }) {
  const Impl = Platform.OS === 'web' ? WebTransition : NativeTransition;
  // key 로 다시 마운트해야 애니메이션이 처음부터 재생됩니다
  return <Impl key={routeKey} style={style} distance={distance} blur={blur} duration={duration}>{children}</Impl>;
}

function WebTransition({ children, style, distance, blur, duration }) {
  const [animating, setAnimating] = useState(true);
  const nodeRef = useRef(null);

  useEffect(() => {
    const node = nodeRef.current;
    const done = (event) => {
      // 자식(스피너·펄스 등)의 animationend 가 올라온 것은 무시합니다
      if (event && event.target !== node) return;
      setAnimating(false);
    };
    node?.addEventListener?.('animationend', done);
    // animationend 가 오지 않는 경우(백그라운드 탭 등)를 위한 보루
    const timer = setTimeout(() => setAnimating(false), duration + 200);
    return () => {
      node?.removeEventListener?.('animationend', done);
      clearTimeout(timer);
    };
  }, [duration]);

  return (
    <View ref={nodeRef} style={animating ? [BASE, style, enterStyle(distance, blur, duration)] : [BASE, style]}>
      {children}
    </View>
  );
}

function NativeTransition({ children, style, distance, duration }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [progress, duration]);

  return (
    <Animated.View
      style={[
        BASE,
        style,
        {
          opacity: progress,
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
