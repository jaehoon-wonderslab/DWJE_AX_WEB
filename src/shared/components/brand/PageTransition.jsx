/**
 * 화면 전환 애니메이션
 *
 * URL(경로)이 바뀔 때 본문이 살짝 아래에서 떠오르며 나타납니다 (fade + 10px 상승, 280ms).
 * 라우터의 Slot 을 감싸 두면 되고, `routeKey` 가 바뀔 때마다 다시 재생됩니다.
 *
 *  · 웹     — CSS 키프레임(react-native-web 의 animationKeyframes). 컴포지터가 돌리므로
 *            JS 가 바쁘거나 탭이 뒤로 가 있어도 멈추지 않습니다. key 를 바꿔 다시 마운트해 재생합니다.
 *  · 네이티브 — Animated.timing
 *
 * 사용 예) <PageTransition routeKey={pathname}><Slot /></PageTransition>
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';

export default function PageTransition({ routeKey, children, style, distance = 10, duration = 280 }) {
  if (Platform.OS === 'web') {
    return (
      <View
        key={routeKey}
        style={[
          { flex: 1, minHeight: 0 },
          style,
          {
            animationKeyframes: {
              from: { opacity: 0, transform: [{ translateY: distance }] },
              to: { opacity: 1, transform: [{ translateY: 0 }] },
            },
            animationDuration: `${duration}ms`,
            animationTimingFunction: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
            animationFillMode: 'both',
          },
        ]}
      >
        {children}
      </View>
    );
  }
  return <NativeTransition routeKey={routeKey} style={style} distance={distance} duration={duration}>{children}</NativeTransition>;
}

function NativeTransition({ routeKey, children, style, distance, duration }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [routeKey, progress, duration]);

  return (
    <Animated.View
      style={[
        { flex: 1, minHeight: 0 },
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
