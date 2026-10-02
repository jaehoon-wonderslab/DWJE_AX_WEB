/**
 * 인증 화면 공통 레이아웃 (로그인 · 회원가입 · 비밀번호 찾기)
 *
 * 사이드바·상단바가 없는 화면들입니다.
 * 이미 로그인한 상태로 들어오면 되돌려 보냅니다.
 *
 * 되돌릴 곳은 로그인 컨트롤러가 쓰는 것과 같은 규칙(`next` → 없으면 기본 화면)입니다.
 * 로그인 직후 컨트롤러의 이동과 이 리다이렉트가 겹쳐도 목적지가 같도록 맞춘 것입니다.
 *
 * 로그인 ↔ 회원가입 ↔ 비밀번호 찾기 사이를 오갈 때 폼이 블러에서 선명해지며 떠오릅니다.
 * 본문 화면보다 조금 더 길고 깊게 — 브랜드 히어로가 있는 화면이라 여유를 줍니다.
 * 인증 화면도 앱과 같은 라이트 테마입니다.
 *
 * 비밀번호 변경(/change-password)은 예외입니다 — 로그인은 했지만 초기 비밀번호를 바꾸기 전인 계정만
 * 들어오는 화면이라(기획 R-04), 그 상태에서는 다른 인증 화면도 이곳으로 모읍니다.
 * 기본 화면은 덕반장 AI 이고, 그 권한이 없는 부서는 첫 허용 화면입니다(homePathFor).
 */
import React from 'react';
import { Redirect, Slot, useLocalSearchParams, usePathname } from 'expo-router';
import { IS_DEMO_AUTH } from '@services/api/client';
import PageTransition from '@shared/components/brand/PageTransition';
import { homePathFor } from '@shared/navigation/routes';
import { useAuthStore } from '@shared/stores/useAuthStore';

const CHANGE_PASSWORD_PATH = '/change-password';

export default function AuthLayout() {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const pwdChangeRequired = useAuthStore((state) => state.pwdChangeRequired);
  const can = useAuthStore((state) => state.can);
  const params = useLocalSearchParams();
  const pathname = usePathname();
  const onChangePassword = pathname === CHANGE_PASSWORD_PATH;

  // 초기 비밀번호 변경 전 — 이 화면만 엽니다
  if (isLoggedIn && pwdChangeRequired) {
    if (!onChangePassword) return <Redirect href={CHANGE_PASSWORD_PATH} />;
  } else if (isLoggedIn || IS_DEMO_AUTH) {
    // 데모 모드에서는 자동 로그인되므로 인증 화면을 쓸 일이 없습니다
    const home = homePathFor(can);
    const next = typeof params?.next === 'string' && params.next.startsWith('/') ? params.next : home;
    return <Redirect href={onChangePassword ? home : next} />;
  } else if (onChangePassword) {
    // 로그인하지 않았으면 바꿀 비밀번호가 없습니다
    return <Redirect href="/login" />;
  }

  return (
    <PageTransition routeKey={pathname} distance={16} blur={14} duration={560}>
      <Slot />
    </PageTransition>
  );
}
