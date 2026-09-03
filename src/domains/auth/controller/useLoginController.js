/**
 * [Controller] 로그인 화면 (CM-03)
 *
 * 로그인에 성공하면 토큰을 저장하고 곧바로 권한(GET /auth/me)까지 받아 온 뒤
 * 원래 가려던 화면 또는 기본 화면으로 보냅니다.
 *
 * [보안] 실패 문구는 서버가 준 것을 그대로 씁니다.
 *        사번 없음과 비밀번호 불일치의 문구가 같은 것은 계정 열거를 막기 위한 의도된 설계입니다.
 */
import { useCallback, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { HOME_PATH } from '@shared/constants/menu';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { toFormError } from '../model/authError';
import { fetchMe, login } from '../model/authRepository';

export function useLoginController() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const setLogin = useAuthStore((state) => state.setLogin);
  const setMe = useAuthStore((state) => state.setMe);
  const setLogout = useAuthStore((state) => state.setLogout);
  const toast = useUiStore((state) => state.toast);

  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  /** 로그인 전에 막혔던 경로 — 로그인 후 그곳으로 돌려보냅니다 */
  const nextPath = typeof params?.next === 'string' && params.next.startsWith('/') ? params.next : HOME_PATH;

  const submit = useCallback(async () => {
    // 1. 빈 값은 서버까지 가지 않고 먼저 거릅니다
    const errors = {};
    if (!loginId.trim()) errors.loginId = '사번을 입력해 주세요.';
    if (!password) errors.password = '비밀번호를 입력해 주세요.';
    if (Object.keys(errors).length) {
      setFormError('');
      setFieldErrors(errors);
      return;
    }

    setPending(true);
    setFormError('');
    setFieldErrors({});
    try {
      // 2. 인증
      const res = await login({ loginId, password });
      if (!res.ok) {
        const mapped = toFormError(res.res, res.message);
        setFormError(mapped.formError);
        setFieldErrors(mapped.fieldErrors);
        return;
      }
      setLogin(res.user, res.tokens);

      // 3. 권한 로딩 — 여기서 실패하면 사이드바를 못 그리므로 로그인 상태를 되돌립니다
      const me = await fetchMe();
      if (!me.ok) {
        setLogout();
        setFormError(me.message || '권한 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
        return;
      }
      setMe(me.me);

      toast(`${res.user?.name || ''}님 환영합니다`);
      router.replace(nextPath);
    } finally {
      setPending(false);
    }
  }, [loginId, password, setLogin, setMe, setLogout, toast, router, nextPath]);

  return {
    loginId,
    setLoginId,
    password,
    setPassword,
    pending,
    formError,
    fieldErrors,
    submit,
    goSignup: () => router.push('/signup'),
    goForgotPassword: () => router.push('/forgot-password'),
  };
}
