/**
 * [Controller] 로그아웃 (CM-02)
 *
 * 프로토타입 시절의 "계정 전환"(다른 계정으로 갈아타기)은 걷어냈습니다 — 실제 운영에서는
 * 로그인한 계정 하나로만 동작합니다. 파일명은 호출부 호환을 위해 그대로 두었습니다.
 */
import { useCallback } from 'react';
import { IS_DEMO_AUTH } from '@services/api/client';
import { useAppNavigation } from '@shared/hooks/useAppNavigation';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { logout } from '../model/authRepository';

export function useAccountSwitch({ onDone } = {}) {
  const userInfo = useAuthStore((state) => state.userInfo);
  const setLogout = useAuthStore((state) => state.setLogout);
  const toast = useUiStore((state) => state.toast);
  const { goToPath } = useAppNavigation();

  const handleLogout = useCallback(async () => {
    onDone?.();
    const res = await logout();
    setLogout();
    toast(res.message || '로그아웃되었습니다');
    if (!IS_DEMO_AUTH) goToPath('/login');
  }, [setLogout, toast, goToPath, onDone]);

  return {
    currentEmpNo: userInfo?.empNo,
    handleLogout,
  };
}
