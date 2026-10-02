/**
 * 서버 없이 도는 브라우저 시험용 세션 — 모든 /api/v1 호출을 page.route 로 고정합니다.
 *
 * `browser.open()` 은 실제 API 로 로그인합니다. 로컬 API 가 디버거에 멈춰 있거나 느리면 시험이
 * 화면과 무관한 이유로 끊기므로, 화면 계약만 보는 시험은 이 헬퍼로 세션과 `/auth/me` 를 흉내 냅니다.
 *
 *  · 등록하지 않은 /api/v1 호출은 빈 성공 응답으로 막습니다(실 서버로 새지 않습니다).
 *  · 시험 쪽에서 나중에 등록한 page.route 가 먼저 걸립니다(Playwright 규칙) — 화면 API 는 시험이 덮어씁니다.
 *  · 실 API 모드로 띄운 개발 서버가 필요합니다(목 모드 번들은 네트워크를 쓰지 않습니다).
 */
const { chromium } = require('playwright-core');
const { WEB } = require('./browser');

/** 기본 /auth/me — 통합관리자, 전 화면 · 데이터 권한 */
function adminMe(overrides = {}) {
  return {
    user: { empNo: '10000', name: '관리자', dept: '통합관리자', deptId: 1, pos: 'MANAGER', superAdmin: true },
    dept: { deptId: 1, deptNm: '통합관리자', superAdmin: true },
    menuPerms: '*',
    writePerms: '*',
    dataPerms: '*',
    dataFields: [],
    servingModelVer: '',
    ...overrides,
  };
}

/**
 * @param {object} [opts]
 * @param {object} [opts.me] /auth/me 의 data (adminMe() 로 만들어 넘기면 편합니다)
 * @param {{width:number,height:number}} [opts.viewport]
 */
async function openStubbed({ me = adminMe(), viewport = { width: 1440, height: 960 } } = {}) {
  const probe = await fetch(WEB).catch(() => null);
  if (!probe) throw new Error(`웹 개발 서버에 연결할 수 없습니다 (${WEB}). 실 API 모드(npm run web)로 띄워 주세요.`);
  const browser = await chromium.launch({ channel: 'chrome', headless: process.env.HEADED !== '1' });
  const context = await browser.newContext({ viewport, acceptDownloads: true });
  const page = await context.newPage();
  // 1) 모르는 호출은 빈 성공으로 — 가장 먼저 등록해 가장 나중에 걸리게 합니다
  await page.route('**/api/v1/**', (route) => route.fulfill({ json: { success: true, code: 'SUCCESS', message: '', data: null } }));
  await page.route('**/api/v1/auth/me', (route) => route.fulfill({ json: { success: true, code: 'SUCCESS', data: me } }));
  await page.route('**/api/v1/auth/refresh', (route) => route.fulfill({ json: { success: true, data: { accessToken: 'stub-token', refreshToken: 'stub-refresh' } } }));
  await page.goto(`${WEB}/login`);
  await page.evaluate((s) => localStorage.setItem('dwje.ax.session', JSON.stringify(s)), {
    accessToken: 'stub-token', refreshToken: 'stub-refresh', userInfo: me.user,
  });
  return { browser, context, page };
}

module.exports = { openStubbed, adminMe };
