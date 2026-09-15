/**
 * [Controller] 앱 시작 시 인증·권한 초기화
 *
 * 루트 레이아웃에서 한 번만 호출합니다.
 *
 *  · 실 인증 모드(기본) — 브라우저에 저장된 토큰으로 세션을 되살립니다.
 *                        토큰이 없거나 만료됐으면 로그인 화면으로 보냅니다.
 *  · 데모 모드         — .env 의 EXPO_PUBLIC_LIVE_AUTH=false. 백엔드 없이 화면만 볼 때
 *                        기본 계정으로 자동 로그인합니다.
 *
 * 권한(menuPerms·dataPerms)은 저장하지 않고 앱이 뜰 때마다 GET /api/v1/auth/me 로 다시 받습니다.
 */
import { useEffect, useState } from 'react';
import { IS_DEMO_AUTH } from '@services/api/client';
import { DEFAULT_USER } from '@shared/constants/accounts';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { loadSession } from '@shared/utils/authStorage';
import { fetchMe, login } from '../model/authRepository';

export function useAuthBootstrap() {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const setLogin = useAuthStore((state) => state.setLogin);
  const setMe = useAuthStore((state) => state.setMe);
  const setLogout = useAuthStore((state) => state.setLogout);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      // [데모 모드] 로그인 화면 없이 기본 계정으로 들어갑니다
      if (IS_DEMO_AUTH) {
        const res = await login({ loginId: DEFAULT_USER.empNo });
        if (alive && res.ok) setLogin(res.user, res.tokens);
        const me = await fetchMe();
        if (alive && me.ok) setMe(me.me);
        if (alive) setBooting(false);
        return;
      }

      // [실 인증] 저장된 세션이 없으면 비로그인 상태로 시작합니다
      const session = loadSession();
      if (!session) {
        if (alive) setBooting(false);
        return;
      }

      // 토큰을 먼저 스토어에 올려야 이어지는 요청에 Authorization 헤더가 붙습니다
      setLogin(session.userInfo, {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      });

      // 토큰이 살아 있는지 확인 겸 권한을 받아 옵니다 (만료면 인터셉터가 갱신을 시도)
      const me = await fetchMe();
      if (!alive) return;
      if (me.ok) setMe(me.me);
      else setLogout();
      setBooting(false);
    })();

    return () => {
      alive = false;
    };
  }, [setLogin, setMe, setLogout]);

  return { booting, isLoggedIn };
}
