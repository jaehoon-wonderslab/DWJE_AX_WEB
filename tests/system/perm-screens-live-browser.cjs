/*
 * 메뉴·데이터 접근 권한 화면 — 실 API 시험 (읽기만, 기획 03 6.2 · 04 6.2 의 실서버 확인분)
 *
 * 실 API 모드 개발 서버(npm run web)에서 돌리고, 앱이 부르는 8080 을 API_URL(기본 18081)로 돌립니다.
 *   API_URL=http://localhost:18081 WEB_URL=http://localhost:8093 node tests/system/perm-screens-live-browser.cjs
 * 아무것도 저장하지 않습니다(체크·적용·복사를 누르지 않습니다). 계정은 전산팀(10004)입니다.
 *
 * 확인하는 것
 *  · 메뉴: 미배정 열 「고정(5화면) · 변경 불가」·잠금, 관리 화면 행 잠금(canEditAdminScreens=false), 대그룹 순서,
 *          최근 변경 이력 카드에 실제 이력, 보안 감사 로그 링크
 *  · 데이터: 미배정 「0건 고정」·잠금, 기본 7종 「적용 중 (고정)」, 계정으로 확인(10001 → 단가·금액 비공개),
 *          최근 변경 이력 카드
 */
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const { WEB } = require('../lib/browser');

const API = process.env.API_URL || 'http://localhost:18081';
const PASSWORD = process.env.TEST_PASSWORD || 'Dwje!2026';

async function openLive(empNo = '10004') {
  if (!(await fetch(WEB).catch(() => null))) throw new Error(`웹 개발 서버에 연결할 수 없습니다 (${WEB}).`);
  const login = await fetch(`${API}/api/v1/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ loginId: empNo, password: PASSWORD }),
  }).then((r) => r.json());
  if (!login.success) throw new Error(`로그인 실패 [${empNo}] ${login.message}`);
  const browser = await chromium.launch({ channel: 'chrome', headless: process.env.HEADED !== '1' });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 960 } })).newPage();
  // 앱 번들은 8080 을 부릅니다 — 시험 API 로 돌립니다
  await page.route('http://localhost:8080/**', (r) => r.continue({ url: r.request().url().replace('http://localhost:8080', API) }));
  await page.goto(`${WEB}/login`);
  await page.evaluate((t) => localStorage.setItem('dwje.ax.session', JSON.stringify({ accessToken: t.accessToken, refreshToken: t.refreshToken, userInfo: t.user })), login.data);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return { browser, page, errors };
}

(async () => {
  const { browser, page, errors } = await openLive();
  try {
    // ── 메뉴 접근 권한 ──
    await page.goto(`${WEB}/system/menu-perm`);
    const table = page.locator('.tabulator').first();
    await table.waitFor({ timeout: 60000 });
    await page.waitForTimeout(800);
    const header = await table.locator('.tabulator-headers').innerText();
    assert(/미배정 · [\d,]+명/.test(header) && header.includes('고정(5화면) · 변경 불가'), 'live unassigned header');
    assert(header.includes('전 권한'), 'live super admin header');
    const groups = (await table.locator('.tabulator-row .tbtn[aria-expanded]').allTextContents()).map((t) => t.replace(/^[−+]\s*/, ''));
    assert.deepEqual(groups.slice(0, 2), ['AI 어시스턴트', '대시보드'], `live group order ${groups.join(',')}`);
    const unassigned = await table.locator('input[type="checkbox"][aria-label$="· 미배정 조회 허용"]').first();
    assert(await unassigned.isDisabled(), 'live unassigned locked');
    // 관리 화면 행 — 시스템관리 그룹으로 표를 내려 찾습니다(가상 렌더라 화면 밖 행은 DOM 에 없습니다)
    const adminBox = page.getByRole('checkbox', { name: '메뉴 접근 권한 · 품질보증팀 조회 허용', exact: true });
    for (let i = 0; i < 40 && !(await adminBox.count()); i += 1) {
      await table.evaluate((el) => { el.querySelector('.tabulator-tableholder').scrollTop += 250; });
      await page.waitForTimeout(120);
    }
    assert(await adminBox.isDisabled(), 'live admin row locked for non super admin');
    // 변경 이력은 부서 메뉴 권한 + 계정 추가 허용을 함께 부릅니다(actType 여러 값, API 3단계)
    const logsReq = page.waitForRequest((r) => r.url().includes('/system/perm-logs') && r.url().includes('USER_MENU_PERM'), { timeout: 30000 }).catch(() => null);
    await page.reload();
    await table.waitFor({ timeout: 60000 });
    assert(await logsReq, 'live logs request with multi actType');
    const logGrid = page.locator('.tabulator').nth(1);
    await logGrid.locator('.tabulator-row').first().waitFor({ timeout: 30000 });
    assert((await logGrid.locator('.tabulator-row').count()) > 0, 'live menu change logs');
    assert.equal(await page.getByRole('button', { name: '보안 감사 로그에서 더 보기', exact: true }).count(), 1, 'audit link for 전산팀');

    // ── 데이터 접근 권한 ──
    await page.goto(`${WEB}/system/data-perm`);
    const grid = page.locator('.tabulator').first();
    await grid.waitFor({ timeout: 60000 });
    await page.waitForTimeout(800);
    const dHeader = await grid.locator('.tabulator-headers').innerText();
    assert(dHeader.includes('0건 고정'), 'live data unassigned header');
    assert(await page.getByRole('checkbox', { name: '생산·출하 수량 · 미배정 열람 허용', exact: true }).isDisabled());
    assert(!(await page.getByRole('checkbox', { name: '생산·출하 수량 · 미배정 열람 허용', exact: true }).isChecked()));
    assert((await grid.locator('.tabulator-cell[tabulator-field="applyLabel"]', { hasText: '적용 중 (고정)' }).count()) >= 7, 'live built-in fixed');
    await page.getByPlaceholder('예) 10001').fill('10001');
    await page.getByRole('button', { name: '확인', exact: true }).click();
    await page.getByText('김품질(10001) · 품질보증팀').waitFor({ timeout: 30000 });
    assert(await page.getByText('●●●● 비공개').first().isVisible(), 'live preview shows masked kind');
    // 서버 3단계 미리보기는 applied 를 줍니다 — 적용 열이 「적용 중」 으로 채워집니다
    assert((await page.getByText('적용 중', { exact: true }).count()) >= 7, 'live preview applied column');
    const dLogs = page.locator('.tabulator').nth(2);
    await dLogs.locator('.tabulator-row').first().waitFor({ timeout: 30000 });
    assert.deepEqual(errors, []);
    console.log('PASS: live(18081) — menu locks/headers/group order/change logs/audit link, data locks/built-in fixed/account preview/change logs');
  } finally { await browser.close(); }
})().catch((e) => { console.error(String(e?.stack || e).slice(0, 1500)); process.exitCode = 1; });
