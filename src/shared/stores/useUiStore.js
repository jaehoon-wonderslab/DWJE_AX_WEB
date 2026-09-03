import { create } from 'zustand';

let toastTimer = null;
let modalSeq = 0;

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

  // ── 사이드바 ────────────────────────────────────────────
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}));

/** 컴포넌트 밖(서비스 함수 등)에서도 토스트를 띄울 수 있게 한 단축 함수 */
export const toast = (message) => useUiStore.getState().toast(message);
