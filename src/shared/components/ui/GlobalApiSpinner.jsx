/**
 * 전역 API 로딩 스피너 (Global API Spinner)
 *
 * 모든 API 통신 중(apiLoadingCount > 0) 화면 최상단 프로그레스 바와
 * 우상단 플로팅 인디케이터를 띄워 사용자가 데이터 통신 중임을 명확하게 인지할 수 있도록 합니다.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import { useUiStore } from '@shared/stores/useUiStore';
import { useTheme } from '@shared/theme/useTheme';

export default function GlobalApiSpinner() {
  const loadingCount = useUiStore((s) => s.apiLoadingCount);
  const isLoading = loadingCount > 0;
  const theme = useTheme();

  // 회전 애니메이션
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isLoading) {
      const animation = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 900,
          easing: Easing.linear,
          useNativeDriver: Platform.OS !== 'web',
        })
      );
      animation.start();
      return () => animation.stop();
    } else {
      spinValue.setValue(0);
    }
  }, [isLoading]);

  if (!isLoading) return null;

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container} pointerEvents="none">
      {/* 1. 화면 최상단 슬림 프로그레스 바 */}
      <View
        style={[
          styles.topBar,
          {
            backgroundColor: theme.color.primary || '#2563eb',
          },
        ]}
      />

      {/* 2. 우상단 글래스모피즘 플로팅 스피너 뱃지 */}
      <View
        style={[
          styles.floatingBadge,
          {
            backgroundColor: theme.isDark ? 'rgba(15, 23, 42, 0.88)' : 'rgba(255, 255, 255, 0.92)',
            borderColor: theme.color.border,
          },
        ]}
      >
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={theme.color.primary || '#2563eb'} strokeWidth="2.8" strokeLinecap="round">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        </Animated.View>
        <Text style={[styles.loadingText, { color: theme.color.foreground }]}>
          데이터 처리 중…
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999999,
    pointerEvents: 'none',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    opacity: 0.9,
  },
  floatingBadge: {
    position: 'absolute',
    top: 14,
    right: 80,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
});
