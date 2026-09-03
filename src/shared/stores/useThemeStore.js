import { create } from 'zustand';
import { Appearance, Platform } from 'react-native';

/** 웹에서 새로고침해도 테마가 유지되도록 localStorage 에 저장합니다 */
const STORAGE_KEY = 'dwje-ax-theme';

function readStoredMode() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === 'dark' || v === 'light' ? v : null;
  } catch (e) {
    // 사생활 보호 모드 등에서 localStorage 접근이 막힐 수 있습니다
    return null;
  }
}

function writeStoredMode(mode) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch (e) {
    /* 저장 실패는 무시 — 테마는 세션 동안만 유지됩니다 */
  }
}

/**
 * 화면 테마(라이트/다크) 전역 스토어
 * (기존 웹에서 `document.documentElement.dataset.theme` 를 토글하던 것과 같은 역할)
 */
export const useThemeStore = create((set, get) => ({
  // 1. 상태 — 저장값 > OS 설정 > 라이트 순으로 초기값을 정합니다
  mode: readStoredMode() || Appearance.getColorScheme() || 'light',

  // 2. 상태 변경 함수
  toggleTheme: () => {
    const next = get().mode === 'dark' ? 'light' : 'dark';
    writeStoredMode(next);
    set({ mode: next });
  },

  setTheme: (mode) => {
    writeStoredMode(mode);
    set({ mode });
  },
}));
