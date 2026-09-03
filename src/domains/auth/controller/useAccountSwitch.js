/**
 * [Controller] 계정 전환 (CM-02) · 로그아웃
 *
 * 접근 권한은 부서 단위이므로, 계정을 바꾸면 메뉴·데이터 권한이 함께 바뀝니다.
 * 전환 후 현재 화면에 접근 권한이 없으면 기본 화면으로 보냅니다.
 *
 * 전환 대상 목록은 서버(GET /auth/switch-targets)에서 받아 옵니다.
 * 데모 모드(EXPO_PUBLIC_LIVE_AUTH=false)에서는 서버가 없으므로 데모 계정 목록을 씁니다.
 */
import { useCallback } from 'react';
import { IS_DEMO_AUTH } from '@services/api/client';
import { switchableUsers } from '@shared/constants/accounts';
import { HOME_SCREEN_ID } from '@shared/constants/menu';
import { useAppNavigation } from '@shared/hooks/useAppNavigation';
import { useAsync } from '@shared/hooks/useAsync';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { fetchMe, fetchSwitchTargets, logout, switchAccount } from '../model/authRepository';

export function useAccountSwitch({ onDone } = {}) {
  const userInfo = useAuthStore((state) => state.userInfo);
  const superAdmin = useAuthStore((state) => state.userInfo?.superAdmin);
  const applySwitch = useAuthStore((state) => state.switchAccount);
  const setMe = useAuthStore((state) => state.setMe);
  const setLogout = useAuthStore((state) => state.setLogout);
  const toast = useUiStore((state) => state.toast);
  const { goToScreen, goToPath, currentScreenId } = useAppNavigation();

  // 통합관리자만 전환 대상을 조회할 수 있으므로 그 외 계정은 요청하지 않습니다
  const { data: targets } = useAsync(fetchSwitchTargets, [], {
    skip: IS_DEMO_AUTH || !superAdmin,
    initialData: [],
    silent: true,
  });

  const handleSwitch = useCallback(
    async (empNo) => {
      onDone?.();
      if (empNo === userInfo?.empNo) return;

      const res = await switchAccount(empNo);
      if (!res.ok) {
        toast(res.message);
        return;
      }
      applySwitch(res.user, res.perms, res.tokens);

      // 전환된 계정 기준으로 권한을 다시 받아옵니다
      const me = await fetchMe();
      if (me.ok) setMe(me.me);

      const can = useAuthStore.getState().can;
      if (!can(currentScreenId)) {
        toast(`${res.user.name}(${res.user.dept}) 계정으로 전환 — 현재 화면 접근 권한이 없어 AI 통합 대시보드로 이동합니다`);
        goToScreen(HOME_SCREEN_ID);
      } else {
        toast(`${res.user.name}(${res.user.dept}) 계정으로 전환했습니다`);
      }
    },
    [userInfo, applySwitch, setMe, toast, goToScreen, currentScreenId, onDone]
  );

  const handleLogout = useCallback(async () => {
    onDone?.();
    const res = await logout();
    setLogout();
    toast(res.message || '로그아웃되었습니다');
    if (!IS_DEMO_AUTH) goToPath('/login');
  }, [setLogout, toast, goToPath, onDone]);

  return {
    accounts: IS_DEMO_AUTH ? switchableUsers() : targets || [],
    currentEmpNo: userInfo?.empNo,
    handleSwitch,
    handleLogout,
  };
}
