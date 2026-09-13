/* Actual browser/API roundtrip; no existing account's grants are changed. */
const assert = require('node:assert/strict');
const { open, WEB } = require('../lib/browser');
const { send, get, PASSWORD } = require('../lib/api');
const ok = r => { assert(r.body.success, r.body.message); return r.body.data; };
(async () => {
  const empNo = `WB${Date.now()}`;
  let deptId, created = false, browser;
  try {
    const first = ok(await get('/system/users', { size: 1 })).items[0];
    assert(Array.isArray(first.extraMenuIds), 'new API must be deployed');
    deptId = ok(await send('POST', '/system/depts', { deptNm: empNo, abbr: `B${String(Date.now()).slice(-3)}`, desc: `${empNo} UI 검증` })).deptId;
    ok(await send('PUT', '/system/menu-perms', { deptId, screenId: 'dash-ai', allowed: true }));
    ok(await send('POST', '/system/users', { empNo, name: `${empNo} 화면검증`, deptId, pos: 'STAFF', state: 'ACTIVE', password: PASSWORD, extraMenuIds: ['prod-result'] }));
    created = true;
    const opened = await open(); browser = opened.browser;
    const { page } = opened;
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${WEB}/system/account`);
    const grid = page.locator('[id="account-grid-계정"]');
    const input = grid.getByRole('textbox', { name: '계정 검색', exact: true });
    await input.fill(empNo); await input.press('Enter');
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
    for (const [label, keyword] of [['부서', empNo], ['변경 이력', empNo]]) {
      const current = page.locator(`[id="account-grid-${label}"]`);
      const search = current.getByRole('textbox', { name: `${label} 검색`, exact: true });
      await search.fill(keyword); await search.press('Enter');
      await page.waitForTimeout(400);
      assert(await current.locator('.tabulator-row').count());
      await search.fill(`${keyword}NOT_FOUND`); await search.press('Enter');
      await page.waitForTimeout(400);
      assert.equal(await current.locator('.tabulator-row').count(), 0, `${label} server search`);
    }
    assert.deepEqual(errors, []);
    console.log('PASS: real browser search, edit existing grants, add/remove, empty-array revocation and server persistence');
  } finally {
    if (browser) await browser.close();
    if (created) ok(await send('DELETE', `/system/users/${empNo}`));
    if (deptId) ok(await send('DELETE', `/system/depts/${deptId}`));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
