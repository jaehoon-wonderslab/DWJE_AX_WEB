import { create } from 'zustand';

/**
 * 화면 테마 전역 스토어
 *
 * 앱은 **라이트 테마 하나**로 동작합니다(다크 모드 없음 — 로그인 화면 포함).
 * 예전에 저장된 'dark' 값이 남아 있어도 무시합니다.
 *
 * `toggleTheme` · `setTheme` 는 호출부 호환을 위해 남겨 두었고 아무 일도 하지 않습니다.
 */
export const useThemeStore = create(() => ({
  mode: 'light',
  toggleTheme: () => {},
  setTheme: () => {},
}));
