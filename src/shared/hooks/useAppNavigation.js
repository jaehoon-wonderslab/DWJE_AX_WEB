/**
 * 화면 이동 공통 훅
 *
 * 화면 코드는 URL 을 직접 조립하지 않고 **화면 ID** 로 이동합니다.
 * 경로 규칙이 바뀌어도 shared/constants/menu.js 의 path 만 고치면 됩니다.
 *
 * 사용 예)
 *   const nav = useAppNavigation();
 *   nav.goToScreen('qc-report');                       // /quality/report
 *   nav.goToScreen('ai-chat', { q: '오늘 불량률' });     // /ai/chat?q=...
 */
import { useCallback } from 'react';
import { router, usePathname } from 'expo-router';
import { pathOf, screenIdOf } from '@shared/navigation/routes';

export function useAppNavigation() {
  const pathname = usePathname();

  /** 화면 ID 로 이동 */
  const goToScreen = useCallback((screenId, params) => {
    const pathname_ = pathOf(screenId);
    router.push(params && Object.keys(params).length ? { pathname: pathname_, params } : pathname_);
  }, []);

  /** URL 경로로 직접 이동 (하위 경로 등) */
  const goToPath = useCallback((path, params) => {
    router.push(params && Object.keys(params).length ? { pathname: path, params } : path);
  }, []);

  /** 이전 화면으로 */
  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
  }, []);

  return {
    goToScreen,
    goToPath,
    goBack,
    /** 현재 화면 ID */
    currentScreenId: screenIdOf(pathname),
    pathname,
  };
}

/** 현재 화면 ID 만 필요할 때 */
export function useCurrentScreenId() {
  return screenIdOf(usePathname());
}
