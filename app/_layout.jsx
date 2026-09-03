/**
 * 루트 레이아웃 — 앱 전역 초기화
 *
 *  1) 목(mock) 응답 등록   2) 저장된 세션 복원   3) 테마 적용   4) 공통 오버레이(토스트·모달·드로어)
 *
 * 세션 복원이 끝나기 전에는 화면을 그리지 않습니다.
 * 먼저 그리면 로그인한 사용자가 로그인 화면을 한 번 스쳐 보게 되기 때문입니다.
 *
 * 로그인 여부에 따른 분기는 각 그룹 레이아웃이 담당합니다.
 *  · app/(main)/_layout.jsx — 비로그인이면 /login 으로
 *  · app/(auth)/_layout.jsx — 로그인 상태면 기본 화면으로
 */
import React, { useEffect, useState } from 'react';
import { Platform, StatusBar, Text, View } from 'react-native';
import { Slot } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '@services/setup'; // 목(mock) 핸들러 등록 — 실 서버 모드에서는 아무 일도 하지 않습니다
import { DrawerHost, Loading, ModalHost, ToastHost } from '@shared/components/ui';
import { FONT_FAMILY } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { useAuthBootstrap } from '@domains/auth/controller/useAuthBootstrap';

export default function RootLayout() {
  const theme = useTheme();
  const { booting } = useAuthBootstrap();

  // 웹에서 문서 배경색을 테마에 맞춥니다 (레이아웃 바깥 여백)
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.body.style.backgroundColor = theme.color.background;
      document.documentElement.style.colorScheme = theme.mode;
    }
  }, [theme]);

  /**
   * 스크롤 막대를 항상 보이게 합니다.
   *
   * macOS 는 기본이 오버레이 막대라 폭이 0 이고, 스크롤하는 동안에만 잠깐 나타납니다.
   * 그래서 사이드바 메뉴가 화면보다 길어져도 **더 있다는 사실이 보이지 않습니다** —
   * 실제로 휠은 돌아가는데 사용자는 스크롤이 없다고 느낍니다.
   * 내부 스크롤 영역에만 얇은 막대를 상시 노출합니다 (문서 전체 스크롤은 건드리지 않습니다).
   */
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return undefined;
    const id = 'ax-scrollbar-style';
    const el = document.getElementById(id) || document.createElement('style');
    el.id = id;
    el.textContent = `
      /* scrollbar-width 를 쓰면 최신 Chrome 이 ::-webkit-scrollbar 규칙을 무시하고
         macOS 기본 오버레이 막대로 돌아갑니다. 자리를 차지하는 막대를 만들려면 webkit 규칙만 씁니다. */
      #ax-sidebar-scroll::-webkit-scrollbar { width: 10px; }
      #ax-sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
      #ax-sidebar-scroll::-webkit-scrollbar-thumb {
        background: ${theme.color.border};
        border-radius: 99px;
        border: 3px solid transparent;
        background-clip: content-box;
      }
      #ax-sidebar-scroll::-webkit-scrollbar-thumb:hover { background: ${theme.color.mutedForeground}; background-clip: content-box; }
    `;
    if (!el.parentNode) document.head.appendChild(el);
    return undefined;
  }, [theme]);

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: theme.color.background }}>
        <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} />
        {booting ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Loading text="접속 정보를 확인하는 중입니다…" />
            <Text style={{ fontFamily: FONT_FAMILY, fontSize: 12, color: theme.color.mutedForeground, marginTop: 8 }}>
              덕우전자 AX — AI 의사결정 지원 계층
            </Text>
          </View>
        ) : (
          <Slot />
        )}
        <ModalHost />
        <DrawerHost />
        <ToastHost />
      </View>
    </SafeAreaProvider>
  );
}
