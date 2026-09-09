/**
 * 루트 레이아웃 — 앱 전역 초기화
 *
 *  1) 목(mock) 응답 등록   2) 저장된 세션 복원   3) 테마 적용   4) 공통 오버레이(토스트·모달·드로어)
 *
 * 세션 복원이 끝나기 전에는 화면을 그리지 않습니다.
 * 먼저 그리면 로그인한 사용자가 로그인 화면을 한 번 스쳐 보게 되기 때문입니다.
 * 대신 브랜드 마크가 천천히 깜빡이는 "부팅 화면" 을 보여 줍니다.
 *
 * 로그인 여부에 따른 분기는 각 그룹 레이아웃이 담당합니다.
 *  · app/(main)/_layout.jsx — 비로그인이면 /login 으로
 *  · app/(auth)/_layout.jsx — 로그인 상태면 기본 화면으로
 *
 * 글꼴·전역 CSS(스크롤 막대·키프레임)는 app/+html.jsx 가 문서 머리에 넣습니다.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StatusBar, Text, View } from 'react-native';
import { Slot } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '@services/setup'; // 목(mock) 핸들러 등록 — 실 서버 모드에서는 아무 일도 하지 않습니다
import { DrawerHost, GlobalApiSpinner, ModalHost, ToastHost } from '@shared/components/ui';
import { LogoMark } from '@shared/components/brand/Logo';
import { FONT_FAMILY } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { useAuthBootstrap } from '@domains/auth/controller/useAuthBootstrap';

export default function RootLayout() {
  const theme = useTheme();
  const { booting } = useAuthBootstrap();

  // 웹에서 문서 배경색을 테마에 맞춥니다 (레이아웃 바깥 여백 · 라이트/다크 전환 시)
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.body.style.backgroundColor = theme.color.background;
      document.documentElement.style.backgroundColor = theme.color.background;
      document.documentElement.style.colorScheme = theme.mode;
      document.documentElement.dataset.theme = theme.mode;
    }
  }, [theme]);

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: theme.color.background }}>
        <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} />
        {booting ? <BootScreen theme={theme} /> : <Slot />}
        <ModalHost />
        <DrawerHost />
        <ToastHost />
        <GlobalApiSpinner />
      </View>
    </SafeAreaProvider>
  );
}

/** 세션 복원 중 — 마크가 천천히 숨 쉬듯 깜빡입니다 */
function BootScreen({ theme }) {
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulse, { toValue: 0.4, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 22 }}>
      <Animated.View style={{ opacity: pulse }}>
        <LogoMark size={44} />
      </Animated.View>
      <Text style={{ fontFamily: FONT_FAMILY, fontSize: 11.5, letterSpacing: 0.22, fontWeight: '500', color: theme.color.mutedForeground }}>
        접속 정보를 확인하는 중입니다
      </Text>
    </View>
  );
}
