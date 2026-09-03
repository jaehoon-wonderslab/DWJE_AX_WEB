/**
 * 업무 화면 공통 레이아웃 (CM-01 · CM-03)
 *
 * 좌측 사이드바 + 상단 헤더 + 본문(Slot) 3분할 구조이며,
 * 본문을 그리기 전에 두 가지를 확인합니다.
 *
 *  1) 로그인 여부 — 비로그인이면 /login 으로 보냅니다 (가려던 주소는 next 로 넘겨 로그인 후 복귀)
 *  2) 실적 보유 기간 — 화면마다 날짜 기본값을 잡아야 하므로 본문보다 먼저 받아 둡니다
 *  3) 메뉴 접근 권한 — 권한이 없는 화면은 주소로 직접 들어와도 기본 화면으로 되돌립니다
 */
import React, { useEffect } from 'react';
import { Platform, View, useWindowDimensions } from 'react-native';
import { Redirect, Slot, usePathname } from 'expo-router';
import { HOME_SCREEN_ID } from '@shared/constants/menu';
import { useAppNavigation } from '@shared/hooks/useAppNavigation';
import { useDataRangeBootstrap } from '@domains/common/controller/useDataRangeBootstrap';
import Sidebar from '@shared/components/layout/Sidebar';
import Topbar from '@shared/components/layout/Topbar';
import { Loading, NoAccess } from '@shared/components/ui';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { useCommonStyles } from '@shared/theme/styles';

export default function MainLayout() {
  const s = useCommonStyles();
  const { width } = useWindowDimensions();
  const { goToScreen, currentScreenId } = useAppNavigation();

  const pathname = usePathname();
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const { ready: rangeReady } = useDataRangeBootstrap();
  const can = useAuthStore((state) => state.can);
  const menuPerms = useAuthStore((state) => state.menuPerms);
  const dept = useAuthStore((state) => state.userInfo?.dept);
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const toast = useUiStore((state) => state.toast);

  const allowed = can(currentScreenId);

  // 권한 없는 화면으로 들어오면 기본 화면으로 돌려보냅니다
  useEffect(() => {
    if (!allowed && currentScreenId !== HOME_SCREEN_ID && menuPerms?.length) {
      toast('접근 권한이 없는 화면입니다 — AI 통합 대시보드로 이동합니다');
      goToScreen(HOME_SCREEN_ID);
    }
  }, [allowed, currentScreenId, menuPerms, goToScreen, toast]);

  // 좁은 화면(태블릿 세로 이하)에서는 사이드바를 자동으로 숨깁니다
  const showSidebar = !collapsed && width > 860;

  // 비로그인 접근 — 가려던 주소를 들고 로그인 화면으로 보냅니다
  if (!isLoggedIn) {
    return <Redirect href={{ pathname: '/login', params: { next: attemptedPath(pathname) } }} />;
  }

  return (
    <View style={s.app}>
      {showSidebar ? <Sidebar /> : null}
      <View style={s.main}>
        <Topbar />
        {!allowed ? (
          <View style={s.content}>
            <NoAccess dept={dept} />
          </View>
        ) : rangeReady ? (
          <Slot />
        ) : (
          <View style={s.content}>
            <Loading text="조회 기간을 확인하는 중입니다…" />
          </View>
        )}
      </View>
    </View>
  );
}

/**
 * 로그인 후 되돌아갈 주소를 고릅니다.
 *
 * 주소창에 직접 입력해 들어온 첫 렌더에서는 라우터의 pathname 이 아직 '/' 입니다.
 * 이때는 브라우저 주소를 그대로 씁니다.
 *
 * @param {string} pathname expo-router 가 알려 준 현재 경로
 */
function attemptedPath(pathname) {
  if (pathname && pathname !== '/') return pathname;
  if (Platform.OS === 'web' && typeof window !== 'undefined') return window.location.pathname;
  return pathname;
}
