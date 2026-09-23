import { create } from 'zustand';

let toastTimer = null;
let modalSeq = 0;

/** 브라우저에 남기는 UI 선호값 — 저장소가 막혀 있어도 앱은 그대로 동작합니다 */
function readPref(key, fallback) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return fallback;
    const v = window.localStorage.getItem(key);
    return v === null ? fallback : v;
  } catch {
    return fallback;
  }
}
function persist(key, patch) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) window.localStorage.setItem(key, String(Object.values(patch)[0]));
  } catch {
    /* 저장 실패는 무시 */
  }
  return patch;
}

/**
 * 공통 UI 요소 전역 스토어 — 토스트 · 모달 · 드로어 (CM-05)
 *
 * 화면 어디에서든 `toast('저장했습니다')` 처럼 호출하면
 * 최상위 App 에 붙어 있는 <Toast /> · <Modal /> · <Drawer /> 가 반응합니다.
 */
export const useUiStore = create((set, get) => ({
  // ── 토스트 ──────────────────────────────────────────────
  toastMessage: '',
  toastVisible: false,

  /**
   * 화면 우하단에 짧은 안내를 띄웁니다. (2.2초 후 자동 사라짐)
   * @param {string} message 안내 문구
   */
  toast: (message) => {
    set({ toastMessage: message, toastVisible: true });
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => set({ toastVisible: false }), 2200);
  },

  // ── 모달 ────────────────────────────────────────────────
  /** 모달 스택 — 모달 위에 모달을 띄우는 경우(폼 → 확인)를 지원합니다 */
  modals: [],

  /**
   * 모달을 엽니다.
   * @param {object} config { title, sub, wide, render(close), footer(close) }
   * @returns {number} 모달 id (닫을 때 사용)
   */
  openModal: (config) => {
    const id = ++modalSeq;
    set((state) => ({ modals: [...state.modals, { id, ...config }] }));
    return id;
  },

  /** 모달을 닫습니다. id 를 주지 않으면 가장 위 모달을 닫습니다. */
  closeModal: (id) =>
    set((state) => ({
      modals: id === undefined ? state.modals.slice(0, -1) : state.modals.filter((m) => m.id !== id),
    })),

  closeAllModals: () => set({ modals: [] }),

  // ── 우측 드로어 ─────────────────────────────────────────
  drawer: null, // { title, sub, render(close) }

  openDrawer: (config) => set({ drawer: config }),
  closeDrawer: () => set({ drawer: null }),

  // ── 전역 AI 채팅 패널(덕반장 AI 레일) ────────────────
  //  · 기본 열림. 폭은 드래그로 조절하며 브라우저에 기억합니다(최소 320px · 최대 창 폭의 40%).
  //  · 예전 3단 크기(compact/medium/full)는 없어졌습니다.
  aiChatOpen: readPref('dwje.ax.aiChatOpen', 'true') !== 'false',
  aiChatWidth: Number(readPref('dwje.ax.aiChatWidth', '400')) || 400,
  toggleAiChat: () => set((state) => persist('dwje.ax.aiChatOpen', { aiChatOpen: !state.aiChatOpen })),
  openAiChat: () => set(persist('dwje.ax.aiChatOpen', { aiChatOpen: true })),
  closeAiChat: () => set(persist('dwje.ax.aiChatOpen', { aiChatOpen: false })),
  /** 레일 폭(px). 범위 보정은 레이아웃이 창 폭을 알고 하므로 여기서는 하한만 둡니다 */
  setAiChatWidth: (aiChatWidth) => set(persist('dwje.ax.aiChatWidth', { aiChatWidth: Math.max(320, Math.round(aiChatWidth)) })),

  // ── 로그인 진입 연출 ────────────────────────────────────
  /** 로그인이 성공한 직후 한 번만 재생합니다 (루트 레이아웃의 EntryTransition) */
  entryPlaying: false,
  playEntry: () => set({ entryPlaying: true }),
  endEntry: () => set({ entryPlaying: false }),

  // ── 전역 API 로딩 스피너 ────────────────────────────────
  apiLoadingCount: 0,
  startApiLoading: () => set((state) => ({ apiLoadingCount: state.apiLoadingCount + 1 })),
  endApiLoading: () => set((state) => ({ apiLoadingCount: Math.max(0, state.apiLoadingCount - 1) })),

  // ── 사이드바 ────────────────────────────────────────────
  //  · sidebarCollapsed : 넓은 화면에서 64px 레일로 접는 상태
  //  · navDrawerOpen    : 좁은 화면(860px 이하)에서 메뉴를 덮개로 띄우는 상태.
  //    좁은 화면에는 사이드바를 놓을 자리가 없어 본문 위로 밀어 올립니다.
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  navDrawerOpen: false,
  openNavDrawer: () => set({ navDrawerOpen: true }),
  closeNavDrawer: () => set({ navDrawerOpen: false }),
}));

/** 컴포넌트 밖(서비스 함수 등)에서도 토스트를 띄울 수 있게 한 단축 함수 */
export const toast = (message) => useUiStore.getState().toast(message);
