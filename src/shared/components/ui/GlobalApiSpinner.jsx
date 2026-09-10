/**
 * 전역 API 로딩 표시 (Global API Spinner)
 *
 * 모든 API 통신 중(apiLoadingCount > 0) 화면 최상단에 아이리스 진행선이 흐르고,
 * 우상단에 작은 알약 인디케이터가 떠서 데이터 통신 중임을 알립니다.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useUiStore } from '@shared/stores/useUiStore';
import { FONT_FAMILY } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { Pulse } from './Feedback';

export default function GlobalApiSpinner() {
  const loadingCount = useUiStore((s) => s.apiLoadingCount);
  const isLoading = loadingCount > 0;
  const theme = useTheme();
  const { width } = useWindowDimensions();

  // 진행선 — 왼쪽에서 오른쪽으로 흐르는 아이리스 띠
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isLoading) {
      slide.setValue(0);
      return undefined;
    }
    const animation = Animated.loop(
      Animated.timing(slide, {
        toValue: 1,
        duration: 1400,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [isLoading, slide]);

  if (!isLoading) return null;

  const barWidth = Math.max(160, width * 0.3);
  const translateX = slide.interpolate({ inputRange: [0, 1], outputRange: [-barWidth, width] });

  return (
    <View style={styles.container} pointerEvents="none">
      {/* 1. 화면 최상단 진행선 */}
      <View style={styles.track}>
        <Animated.View style={[styles.bar, { width: barWidth, backgroundColor: theme.color.primary, transform: [{ translateX }] }]} />
      </View>

      {/* 2. 우상단 알약 인디케이터 */}
      <View
        style={[
          styles.floatingBadge,
          {
            backgroundColor: theme.color.popover,
            borderColor: theme.hairlineStrong,
          },
        ]}
      >
        <Pulse size={5} />
        <Text style={[styles.loadingText, { color: theme.color.mutedForeground }]}>데이터 처리 중</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999999,
    pointerEvents: 'none',
  },
  track: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    overflow: 'hidden',
  },
  bar: {
    height: 2,
    borderRadius: 2,
  },
  floatingBadge: {
    position: 'absolute',
    // 본문 패널 헤더 아래 — 계정 메뉴와 겹치지 않는 자리 (셸 여백 16 + 헤더 64)
    top: 92,
    right: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
  loadingText: {
    fontFamily: FONT_FAMILY,
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0.35,
    textTransform: 'uppercase',
  },
});
