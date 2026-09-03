/**
 * 인증 화면 공통 레이아웃 (로그인 · 회원가입 · 비밀번호 찾기)
 *
 * 사이드바·상단바가 없는 화면들입니다.
 * 이미 로그인한 상태로 들어오면 되돌려 보냅니다.
 *
 * 되돌릴 곳은 로그인 컨트롤러가 쓰는 것과 같은 규칙(`next` → 없으면 기본 화면)입니다.
 * 로그인 직후 컨트롤러의 이동과 이 리다이렉트가 겹쳐도 목적지가 같도록 맞춘 것입니다.
 */
import React from 'react';
import { Redirect, Slot, useLocalSearchParams } from 'expo-router';
import { IS_DEMO_AUTH } from '@services/api/client';
import { HOME_PATH } from '@shared/constants/menu';
import { useAuthStore } from '@shared/stores/useAuthStore';

export default function AuthLayout() {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const params = useLocalSearchParams();

  // 데모 모드에서는 자동 로그인되므로 인증 화면을 쓸 일이 없습니다
  if (isLoggedIn || IS_DEMO_AUTH) {
    const next = typeof params?.next === 'string' && params.next.startsWith('/') ? params.next : HOME_PATH;
    return <Redirect href={next} />;
  }

  return <Slot />;
}
