/**
 * 라우트 ↔ 화면 ID 매핑
 *
 * 권한은 화면 ID(API 명세 기준)로 판정하고, 화면 이동은 URL 경로로 합니다.
 * 두 값을 이어 주는 유일한 지점이 이 파일입니다.
 */
import { EXTRA_PAGES, HOME_PATH, HOME_SCREEN_ID, MENU, permRows } from '@shared/constants/menu';

/** 화면 ID → 경로 */
const ID_TO_PATH = {};
/** 경로 → 화면 ID */
const PATH_TO_ID = {};

permRows().forEach((row) => {
  ID_TO_PATH[row.id] = row.path;
  PATH_TO_ID[row.path] = row.id;
});

/**
 * 화면 ID 에 해당하는 URL 경로를 반환합니다.
 * @param {string} screenId 예) 'dash-ai'
 */
export function pathOf(screenId) {
  return ID_TO_PATH[screenId] || HOME_PATH;
}

/**
 * URL 경로에 해당하는 화면 ID 를 반환합니다.
 * 하위 경로(쿼리·슬래시 뒤 값)가 붙어도 가장 긴 일치 항목을 찾습니다.
 *
 * @param {string} pathname 예) '/production/daily-report/history'
 */
export function screenIdOf(pathname) {
  if (!pathname) return HOME_SCREEN_ID;
  const clean = pathname.split('?')[0].replace(/\/+$/, '') || '/';
  if (PATH_TO_ID[clean]) return PATH_TO_ID[clean];
  // 하위 경로 대응 — 가장 긴 접두사 매칭
  const matched = Object.keys(PATH_TO_ID)
    .filter((p) => clean.startsWith(`${p}/`))
    .sort((a, b) => b.length - a.length)[0];
  return matched ? PATH_TO_ID[matched] : HOME_SCREEN_ID;
}

export { HOME_PATH, HOME_SCREEN_ID, MENU, EXTRA_PAGES };
