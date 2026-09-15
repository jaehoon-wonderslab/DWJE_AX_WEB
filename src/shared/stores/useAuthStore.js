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
 *  · dataFields — 적용 중인 데이터 항목 정의 [{ key, name, category, attrs[] }]
 *
 * dataFields 의 `attrs` 는 그 항목에 해당하는 **API 응답 필드명** 입니다(unitPrice · lotNo …).
 * 이것으로 「응답 필드명 → 항목」 맵을 만들어 표·엑셀이 스스로 마스킹을 판정합니다.
 * 관리자가 화면에서 항목·필드명을 추가하면 **배포 없이** 다음 로그인부터 반영됩니다 —
 * 화면 코드에 항목을 적어 두지 않는 이유가 이것입니다.
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
  dataFields: [], // 적용 중인 데이터 항목 정의 [{ key, name, category, attrs[] }]
  /** 응답 필드명 → 항목 key. dataFields 에서 파생합니다 (조회할 때마다 훑지 않으려고 미리 만듭니다) */
  attrIndex: {},
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
      dataFields: me?.dataFields || [],
      attrIndex: indexAttrs(me?.dataFields),
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
      dataFields: [],
      attrIndex: {},
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

  /**
   * API 응답 필드명이 어느 데이터 항목에 속하는지 찾습니다.
   * @param {string} attrName 응답 JSON 필드명 (예: 'unitPrice')
   * @returns {string|null} 항목 key. 등록되지 않은 필드명이면 null (= 통제 대상 아님)
   */
  fieldOfAttr: (attrName) => (attrName ? get().attrIndex[attrName] || null : null),

  /**
   * 응답 필드명 기준으로 값을 보여 줘도 되는지 판정합니다.
   *
   * 등록되지 않은 필드명은 **통제 대상이 아니므로 true** 입니다.
   * 반대로 하면 항목을 등록하기 전까지 화면 전체가 비공개가 됩니다.
   *
   * @param {string} attrName 응답 JSON 필드명
   */
  canAttr: (attrName) => {
    const key = get().fieldOfAttr(attrName);
    return key ? get().canData(key) : true;
  },

  /** 현재 로그인 계정의 소속 부서 (권한 판정 기준) */
  role: () => get().userInfo?.dept || '',
}));

/**
 * dataFields → { 응답 필드명: 항목 key } 맵
 *
 * 서버가 `attr_name` 에 전역 UNIQUE 를 걸어 주므로 한 필드명이 두 항목에 붙는 일은 없습니다.
 * 그래도 값이 어긋난 응답이 올 수 있어 먼저 온 항목을 남깁니다(뒤엣것이 덮어쓰지 않습니다).
 *
 * @param {Array<{key:string, attrs:string[]}>} fields
 */
function indexAttrs(fields) {
  const index = {};
  (Array.isArray(fields) ? fields : []).forEach((f) => {
    (f?.attrs || []).forEach((attr) => {
      if (attr && !index[attr]) index[attr] = f.key;
    });
  });
  return index;
}
