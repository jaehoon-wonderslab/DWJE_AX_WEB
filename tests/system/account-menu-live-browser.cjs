/* Actual browser/API roundtrip; no existing account's grants are changed. */
const assert = require('node:assert/strict');
const { open, WEB } = require('../lib/browser');
const { openAccountTab } = require('../lib/accountTabs');
const { send, get, PASSWORD } = require('../lib/api');
const ok = r => { assert(r.body.success, r.body.message); return r.body.data; };
(async () => {
  const empNo = `WB${Date.now()}`;
  let deptId, created = false, browser;
  try {
    const first = ok(await get('/system/users', { size: 1 })).items[0];
    assert(Array.isArray(first.extraMenuIds), 'new API must be deployed');
    deptId = ok(await send('POST', '/system/depts', { deptNm: empNo, desc: `${empNo} UI 검증` })).deptId;
    ok(await send('PUT', '/system/menu-perms', { deptId, screenId: 'dash-ai', allowed: true }));
    ok(await send('POST', '/system/users', { empNo, name: `${empNo} 화면검증`, deptId, pos: 'STAFF', state: 'ACTIVE', password: PASSWORD, extraMenuIds: ['prod-result'] }));
    created = true;
    const opened = await open(); browser = opened.browser;
    const { page } = opened;
    // 앱 번들은 8080 을 부릅니다 — API_URL 이 다르면(예: 18081) 그쪽으로 돌립니다
    const apiTarget = (process.env.API_URL || 'http://localhost:8080').replace(/\/$/, '');
    if (!apiTarget.endsWith('localhost:8080')) {
      await page.route('http://localhost:8080/**', (r) => r.continue({ url: r.request().url().replace('http://localhost:8080', apiTarget) }));
    }
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${WEB}/system/account`);
    const grid = page.locator('[id="account-grid-계정"]');
    // 계정 탭에는 검색줄이 없습니다(2026-10-02) — 아이디 열 필터로 찾습니다
    const input = grid.locator('.tabulator-col[tabulator-field="empNo"] input');
    await input.fill(empNo);
    await page.waitForFunction(id => {
      const rows = document.querySelectorAll('[id="account-grid-계정"] .tabulator-row');
      return rows.length === 1 && rows[0].innerText.includes(id);
    }, empNo);
    assert(await input.evaluate(el => document.activeElement === el));
    await grid.getByRole('button', { name: '편집', exact: true }).click();
    const inherited = page.getByRole('checkbox', { name: 'AI 통합 대시보드 추가 허용', exact: true });
    await inherited.waitFor(); assert(await inherited.isChecked()); assert(await inherited.isDisabled());
    await page.getByRole('checkbox', { name: '실적 집계·조회 추가 허용', exact: true }).uncheck();
    await page.getByRole('checkbox', { name: '불량 현황 조회 추가 허용', exact: true }).check();
    const save = page.waitForResponse(r => r.url().endsWith(`/system/users/${empNo}`) && r.request().method() === 'PUT');
    await page.getByRole('button', { name: '수정', exact: true }).click();
    assert((await (await save).json()).success);
    await page.getByRole('button', { name: '수정', exact: true }).waitFor({ state: 'hidden' });
    assert.deepEqual(ok(await get('/system/users', { keyword: empNo })).items[0].extraMenuIds, ['qc-defect']);
    // Ensure the refreshed row supplies the saved grants when reopening.
    await page.waitForTimeout(300);
    await grid.getByRole('button', { name: '편집', exact: true }).click();
    await page.getByRole('checkbox', { name: '불량 현황 조회 추가 허용', exact: true }).uncheck();
    const revoke = page.waitForResponse(r => r.url().endsWith(`/system/users/${empNo}`) && r.request().method() === 'PUT');
    await page.getByRole('button', { name: '수정', exact: true }).click();
    const response = await revoke;
    assert.deepEqual(response.request().postDataJSON().extraMenuIds, []);
    assert((await response.json()).success);
    await page.getByRole('button', { name: '수정', exact: true }).waitFor({ state: 'hidden' });
    assert.deepEqual(ok(await get('/system/users', { keyword: empNo })).items[0].extraMenuIds, []);
    for (const [label, keyword] of [['변경 이력', empNo]]) {
      const current = await openAccountTab(page, label);
      // 이력 탭에도 검색줄이 없습니다(2026-10-02) — 「대상」 열 필터로 찾습니다(기간 기본 최근 7일 안의 방금 수정분)
      assert.equal(await current.getByRole('textbox', { name: `${label} 검색`, exact: true }).count(), 0, `${label} search box removed`);
      const search = current.locator('.tabulator-col[tabulator-field="target"] input');
      await search.fill(keyword);
      await page.waitForTimeout(400);
      assert(await current.locator('.tabulator-row').count(), `${label} column filter finds ${keyword}`);
      await search.fill(`${keyword}NOT_FOUND`);
      await page.waitForTimeout(400);
      assert.equal(await current.locator('.tabulator-row').count(), 0, `${label} column filter`);
    }
    // 부서 표는 2026-10-07 부서 매핑 화면의 「부서」 탭으로 옮겼습니다 — 검색줄 없이 부서명 열 필터로 찾습니다
    await page.goto(`${WEB}/system/gw-dept-map`);
    await page.locator('#gw-dept-tab-depts').click();
    const deptGrid = page.locator('[id="account-grid-부서"]');
    await deptGrid.locator('.tabulator-row').first().waitFor();
    assert.equal(await deptGrid.getByRole('textbox', { name: '부서 검색', exact: true }).count(), 0, 'dept search box removed');
    await deptGrid.locator('.tabulator-col[tabulator-field="name"] input').fill(empNo);
    await page.waitForTimeout(400);
    assert.equal(await deptGrid.locator('.tabulator-row').count(), 1, 'dept column filter finds the test department');
    assert.deepEqual(errors, []);
    console.log('PASS: real browser search, edit existing grants, add/remove, empty-array revocation and server persistence');
  } finally {
    if (browser) await browser.close();
    if (created) ok(await send('DELETE', `/system/users/${empNo}`));
    if (deptId) ok(await send('DELETE', `/system/depts/${deptId}`));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
