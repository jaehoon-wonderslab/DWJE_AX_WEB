/**
 * 로그인 세션 저장소
 *
 * 새로고침해도 로그인이 풀리지 않도록 토큰을 브라우저에 보관합니다.
 * 저장·복원 모두 실패해도 앱이 멈추면 안 되므로 예외는 삼키고 빈 값으로 처리합니다.
 * (시크릿 모드·저장소 차단 브라우저에서는 접근 자체가 예외를 던집니다)
 *
 * [보안] 여기에는 토큰과 화면 표시용 사용자 정보만 둡니다.
 *        권한(menuPerms·dataPerms)은 저장하지 않고 매번 GET /api/v1/auth/me 로 다시 받습니다.
 */
import { Platform } from 'react-native';

const KEY = 'dwje.ax.session';

/** 브라우저 저장소를 쓸 수 있는 환경인지 확인합니다 */
function storage() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * 세션을 저장합니다.
 * @param {{accessToken:string, refreshToken:string, userInfo:object}} session
 */
export function saveSession(session) {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(KEY, JSON.stringify(session));
  } catch {
    /* 저장 공간 부족·차단 — 세션 유지만 포기하고 계속 진행합니다 */
  }
}

/**
 * 저장된 세션을 읽습니다.
 * @returns {{accessToken:string, refreshToken:string, userInfo:object}|null}
 */
export function loadSession() {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.accessToken ? parsed : null;
  } catch {
    return null;
  }
}

/** 저장된 세션을 지웁니다 (로그아웃 · 토큰 갱신 실패) */
export function clearSession() {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(KEY);
  } catch {
    /* 무시 */
  }
}
