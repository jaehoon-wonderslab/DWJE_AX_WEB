/**
 * [Controller] 로그인 화면 (CM-03)
 *
 * 로그인에 성공하면 토큰을 저장하고 곧바로 권한(GET /auth/me)까지 받아 온 뒤
 * 원래 가려던 화면 또는 기본 화면으로 보냅니다.
 *
 * [보안] 실패 문구는 서버가 준 것을 그대로 씁니다.
 *        사번 없음과 비밀번호 불일치의 문구가 같은 것은 계정 열거를 막기 위한 의도된 설계입니다.
 *        예외는 잠금(E-AUTH-005) 하나입니다 — 잠긴 계정에 해제 방법을 알려야 해서(기획 AUD-16) 따로 그립니다.
 *
 * 초기 비밀번호로 들어온 계정(pwdChangeRequired)은 원래 가려던 곳 대신 비밀번호 변경 화면으로 보냅니다(기획 R-04).
 */
import { useCallback, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { homePathFor } from '@shared/navigation/routes';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { isAccountLocked, toFormError } from '../model/authError';
import { fetchMe, login } from '../model/authRepository';

export function useLoginController() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const setLogin = useAuthStore((state) => state.setLogin);
  const setMe = useAuthStore((state) => state.setMe);
  const setLogout = useAuthStore((state) => state.setLogout);
  const toast = useUiStore((state) => state.toast);
  const playEntry = useUiStore((state) => state.playEntry);

  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  /** 잠금 응답 — { lockedAt, emailMasked, mailEnabled, message }. 잠기지 않았으면 null */
  const [locked, setLocked] = useState(null);

  /** 로그인 전에 막혔던 경로 — 로그인 후 그곳으로 돌려보냅니다 (없으면 기본 화면) */
  const nextParam = typeof params?.next === 'string' && params.next.startsWith('/') ? params.next : '';

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
    setLocked(null);
    try {
      // 2. 인증
      const res = await login({ loginId, password });
      if (!res.ok) {
        // 잠긴 계정 — 해제 안내를 그리고 비밀번호 칸을 비웁니다
        if (isAccountLocked(res.res)) {
          const d = res.res?.data || {};
          setLocked({
            lockedAt: d.lockedAt || '',
            emailMasked: d.emailMasked || '',
            mailEnabled: d.mailEnabled !== false,
            message: res.res?.message || res.message,
          });
          setPassword('');
          return;
        }
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

      // 초기 비밀번호 — 다른 화면은 서버가 막으므로 변경 화면으로 곧장 보냅니다
      if (useAuthStore.getState().pwdChangeRequired) {
        router.replace('/change-password');
        return;
      }

      toast(`${res.user?.name || ''}님 환영합니다`);
      // 입자가 모여 로고가 되는 진입 연출 — 화면을 옮기기 직전에 켭니다.
      // 덮개는 루트 레이아웃에 있어 라우트가 바뀌어도 끊기지 않습니다.
      playEntry();
      router.replace(nextParam || homePathFor(useAuthStore.getState().can));
    } finally {
      setPending(false);
    }
  }, [loginId, password, setLogin, setMe, setLogout, toast, playEntry, router, nextParam]);

  return {
    loginId,
    setLoginId,
    password,
    setPassword,
    pending,
    formError,
    fieldErrors,
    locked,
    submit,
    goSignup: () => router.push('/signup'),
    goForgotPassword: () => router.push('/forgot-password'),
    /** 잠금 해제 — 비밀번호 찾기 화면을 「잠금 해제」 모드로 엽니다(새 라우트를 만들지 않음) */
    goUnlock: () => router.push({ pathname: '/forgot-password', params: { mode: 'unlock', empNo: loginId.trim() } }),
  };
}
