/**
 * [Controller] 초기 비밀번호 변경 (CM-03 · 2026-10-01 기획 R-04)
 *
 * 그룹웨어 자동 가입·관리자 등록 계정은 초기 비밀번호(사번 등)로 첫 로그인합니다.
 * 서버는 비밀번호를 바꾸기 전까지 거의 모든 API 를 403 E-AUTH-006 으로 막고, 레이아웃은 이 화면만 보여 줍니다.
 *
 * 흐름: 현재 비밀번호 · 새 비밀번호 · 확인 → POST /auth/password → GET /auth/me 재조회 → 기본 화면
 * (비밀번호를 바꾸면 서버가 다음 요청부터 바로 풀어 줍니다 — 매 요청 DB 를 다시 읽으므로 토큰 재발급이 필요 없습니다)
 */
import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { homePathFor } from '@shared/navigation/routes';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { toFormError } from '../model/authError';
import { fetchMe, logout } from '../model/authRepository';
import { checkPassword } from '../model/passwordPolicy';
import { changePassword } from '../model/passwordRepository';

export function useChangePasswordController() {
  const router = useRouter();
  const empNo = useAuthStore((state) => state.userInfo?.empNo || '');
  const name = useAuthStore((state) => state.userInfo?.name || '');
  const setMe = useAuthStore((state) => state.setMe);
  const setPwdChangeRequired = useAuthStore((state) => state.setPwdChangeRequired);
  const setLogout = useAuthStore((state) => state.setLogout);
  const toast = useUiStore((state) => state.toast);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const submit = useCallback(async () => {
    // 1. 서버와 같은 정책을 먼저 화면에서 검사합니다 (사번 포함 금지 포함)
    const errors = {};
    if (!currentPassword) errors.currentPassword = '현재 비밀번호를 입력해 주세요.';
    const policyError = checkPassword(newPassword, { empNo });
    if (policyError) errors.newPassword = policyError;
    else if (newPassword === currentPassword) errors.newPassword = '현재 비밀번호와 다른 값으로 정해 주세요.';
    else if (newPassword !== newPasswordConfirm) errors.newPasswordConfirm = '새 비밀번호와 확인이 일치하지 않습니다.';
    if (Object.keys(errors).length) {
      setFormError('');
      setFieldErrors(errors);
      return;
    }

    setPending(true);
    setFormError('');
    setFieldErrors({});
    try {
      const res = await changePassword({ currentPassword, newPassword, newPasswordConfirm });
      if (!res.ok) {
        const mapped = toFormError(res.res, res.message);
        setFormError(mapped.formError);
        setFieldErrors(mapped.fieldErrors);
        return;
      }

      // 2. 권한을 다시 받아 옵니다 — 이제 메뉴·데이터 권한이 실려 옵니다
      const me = await fetchMe();
      if (me.ok) setMe(me.me);
      setPwdChangeRequired(false);
      toast('비밀번호를 바꿨습니다');
      router.replace(homePathFor(useAuthStore.getState().can));
    } finally {
      setPending(false);
    }
  }, [currentPassword, newPassword, newPasswordConfirm, empNo, setMe, setPwdChangeRequired, toast, router]);

  const handleLogout = useCallback(async () => {
    await logout();
    setLogout();
    router.replace('/login');
  }, [setLogout, router]);

  return {
    empNo,
    name,
    currentPassword,
    setCurrentPassword: (v) => {
      setCurrentPassword(v);
      setFieldErrors((prev) => (prev.currentPassword ? { ...prev, currentPassword: '' } : prev));
    },
    newPassword,
    setNewPassword,
    newPasswordConfirm,
    setNewPasswordConfirm,
    pending,
    formError,
    fieldErrors,
    submit,
    handleLogout,
  };
}
