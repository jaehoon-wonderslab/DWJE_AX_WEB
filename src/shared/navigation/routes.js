/**
 * 라우트 ↔ 화면 ID 매핑
 *
 * 권한은 화면 ID(API 명세 기준)로 판정하고, 화면 이동은 URL 경로로 합니다.
 * 두 값을 이어 주는 유일한 지점이 이 파일입니다.
 */
import { EXTRA_PAGES, HOME_PATH, HOME_SCREEN_ID, LEGACY_PATHS, MENU, permRows } from '@shared/constants/menu';

/** 화면 ID → 경로 */
const ID_TO_PATH = {};
/** 경로 → 화면 ID */
const PATH_TO_ID = {};

permRows().forEach((row) => {
  ID_TO_PATH[row.id] = row.path;
  PATH_TO_ID[row.path] = row.id;
});
// 옛 주소도 같은 화면으로 판정합니다 (화면 → 경로 쪽은 새 주소만 씁니다)
LEGACY_PATHS.forEach((p) => {
  PATH_TO_ID[p.from] = p.screen;
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

/**
 * 로그인 후·권한 없는 화면에서 돌아갈 기본 경로를 고릅니다.
 *
 * 기본은 덕반장 AI(HOME) 입니다. 그 화면 권한을 끈 부서도 있으므로(기획 D-27), 그때는 메뉴 순서상
 * 첫 번째로 허용된 화면으로 보냅니다. 허용된 화면이 하나도 없으면 HOME 을 돌려주고, 레이아웃이 안내(NoAccess)를 띄웁니다.
 *
 * @param {(screenId:string)=>boolean} can 화면 권한 판정 함수 (useAuthStore.can)
 * @returns {string} 경로
 */
export function homePathFor(can) {
  return pathOf(homeScreenFor(can));
}

/**
 * {@link homePathFor} 와 같은 규칙으로 화면 ID 를 돌려줍니다 (useAppNavigation.goToScreen 용).
 * @param {(screenId:string)=>boolean} can
 */
export function homeScreenFor(can) {
  if (typeof can !== 'function' || can(HOME_SCREEN_ID)) return HOME_SCREEN_ID;
  for (const group of MENU) {
    const item = group.items.find((it) => can(it.id));
    if (item) return item.id;
  }
  return HOME_SCREEN_ID;
}

/** 대메뉴 허브 경로에 해당하는 그룹을 반환합니다. */
export function hubGroupOf(pathname) {
  const clean = pathname?.split('?')[0].replace(/\/+$/, '') || '/';
  return MENU.find((group) => group.hubPath === clean)?.group || null;
}

export { HOME_PATH, HOME_SCREEN_ID, MENU, EXTRA_PAGES };
