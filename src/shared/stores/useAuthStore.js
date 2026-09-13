import { create } from 'zustand';
import { DATA_SCOPE_DEFAULT, MENU_ACCESS_DEFAULT } from '@shared/constants/dataFields';
import { clearSession, saveSession } from '@shared/utils/authStorage';

/**
 * 로그인 상태 · 권한 전역 스토어
 *
 * (기존 웹에서 전역 변수로 들고 있던 로그인 정보를 안전하게 관리하는 공간)
 *
 * 메뉴 접근은 부서 기본 권한과 계정별 추가 허용의 합집합이며, 데이터 권한은 부서를 따릅니다.
 * 실제 판정은 서버가 담당하고 이 스토어는 /auth/me 의 유효 권한을 표시합니다.
 *  · menuPerms — 접근 가능한 화면 ID 배열 ('*' 는 전체)
 *  · dataPerms — 접근 가능한 데이터 항목 key 배열 ('*' 는 전체)
 *
 * 로그인 직후 `GET /api/v1/auth/me` 응답으로 두 권한을 한 번에 채웁니다.
 *
 * 토큰은 새로고침에 대비해 브라우저에도 함께 보관합니다(authStorage).
 * 권한은 보관하지 않고 앱이 뜰 때마다 서버에서 다시 받습니다.
 */
export const useAuthStore = create((set, get) => ({
  // ── 1. 상태 ─────────────────────────────────────────────
  isLoggedIn: false,
  userInfo: null, // { empNo, name, dept, pos }
  accessToken: '',
  refreshToken: '',
  menuPerms: [], // 접근 가능한 화면 ID 목록
  dataPerms: [], // 접근 가능한 데이터 항목 key 목록
  servingModelVer: '', // 현재 서비스 중인 AI 모델 버전 (사이드바 표기용)

  // ── 2. 상태 변경 함수 ───────────────────────────────────

  /** 로그인 성공 처리 — 토큰과 사용자 정보를 저장합니다 */
  setLogin: (userData, tokens) => {
    const next = {
      isLoggedIn: true,
      userInfo: userData,
      accessToken: tokens?.accessToken || '',
      refreshToken: tokens?.refreshToken || '',
    };
    set(next);
    saveSession({ accessToken: next.accessToken, refreshToken: next.refreshToken, userInfo: userData });
  },

  /** 토큰만 교체 (갱신 시) */
  setTokens: ({ accessToken, refreshToken }) =>
    set((state) => {
      const next = {
        accessToken: accessToken ?? state.accessToken,
        refreshToken: refreshToken ?? state.refreshToken,
      };
      saveSession({ ...next, userInfo: state.userInfo });
      return next;
    }),

  /** GET /api/v1/auth/me 응답을 반영합니다 */
  setMe: (me) =>
    set({
      isLoggedIn: true,
      userInfo: me?.user || null,
      menuPerms: me?.menuPerms || [],
      dataPerms: me?.dataPerms || [],
      servingModelVer: me?.servingModelVer || '',
    }),

  /**
   * 계정 전환 (CM-02) — 부서가 바뀌면 권한도 함께 바뀝니다.
   * 전환 응답에 새 accessToken 이 오면 함께 갈아끼웁니다.
   */
  switchAccount: (user, perms, tokens) =>
    set((state) => {
      const accessToken = tokens?.accessToken || state.accessToken;
      const refreshToken = tokens?.refreshToken || state.refreshToken;
      saveSession({ accessToken, refreshToken, userInfo: user });
      return {
        userInfo: user,
        accessToken,
        refreshToken,
        menuPerms: perms?.menuPerms ?? MENU_ACCESS_DEFAULT[user?.dept] ?? [],
        dataPerms: perms?.dataPerms ?? DATA_SCOPE_DEFAULT[user?.dept] ?? [],
      };
    }),

  setLogout: () => {
    clearSession();
    set({
      isLoggedIn: false,
      userInfo: null,
      accessToken: '',
      refreshToken: '',
      menuPerms: [],
      dataPerms: [],
      servingModelVer: '',
    });
  },

  // ── 3. 권한 판정 ────────────────────────────────────────

  /**
   * 화면 접근 권한이 있는지 판정합니다. (메뉴 접근 권한)
   * @param {string} screenId 화면 ID (예: 'dash-ai')
   */
  can: (screenId) => {
    const perms = get().menuPerms;
    return perms === '*' || (Array.isArray(perms) && perms.indexOf(screenId) >= 0);
  },

  /**
   * 데이터 항목을 볼 수 있는지 판정합니다. (데이터 접근 권한)
   * @param {string} fieldKey 데이터 항목 key (qty · yield · price · customer · plan · mold · worker)
   */
  canData: (fieldKey) => {
    const perms = get().dataPerms;
    return perms === '*' || (Array.isArray(perms) && perms.indexOf(fieldKey) >= 0);
  },

  /** 현재 로그인 계정의 소속 부서 (권한 판정 기준) */
  role: () => get().userInfo?.dept || '',
}));
