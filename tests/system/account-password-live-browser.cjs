const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { open, WEB } = require('../lib/browser');
const { get, send, BASE, PASSWORD } = require('../lib/api');
const ok = r => { assert(r.body.success, r.body.message); return r.body.data; };
(async () => {
  assert.equal(ok(await get('/system/accounts/summary')).canChangePassword, true, 'password API must be deployed');
  const empNo = `PW${Date.now()}`, changed = `Pw!${randomBytes(12).toString('hex')}`;
  let created = false, browser;
  try {
    const depts = ok(await get('/system/depts')).items;
    const deptId = depts.find(d => d.deptNm === '품질보증팀').deptId;
    ok(await send('POST', '/system/users', { empNo, name: '비밀번호UI검증', deptId, pos: 'STAFF', state: 'ACTIVE', password: PASSWORD, extraMenuIds: ['sys-account'] })); created = true;
    const opened = await open(); browser = opened.browser; const page = opened.page;
    await page.goto(`${WEB}/system/account`);
    const filter = page.locator('[id="account-grid-계정"] .tabulator-col[tabulator-field="empNo"] input');
    await filter.fill(empNo); await page.waitForTimeout(400);
    await page.locator('[id="account-grid-계정"]').getByRole('button', { name: '편집', exact: true }).click();
    await page.getByLabel('새 비밀번호', { exact: true }).fill(changed);
    await page.getByLabel('새 비밀번호 확인', { exact: true }).fill(changed);
    const response = page.waitForResponse(r => r.url().endsWith(`/system/users/${empNo}`) && r.request().method() === 'PUT');
    await page.getByRole('button', { name: '수정', exact: true }).click();
    const saved = await response; assert((await saved.json()).success); assert(!('passwordConfirm' in saved.request().postDataJSON()));
    const login = async password => {
      const r = await fetch(`${BASE}/api/v1/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ loginId: empNo, password }) });
      return r.json();
    };
    assert.equal((await login(PASSWORD)).success, false, 'old password rejected');
    const session = await login(changed); assert(session.success, 'new password accepted');
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 960 } }); const restricted = await ctx.newPage();
    await restricted.goto(`${WEB}/login`);
    await restricted.evaluate(s => localStorage.setItem('dwje.ax.session', JSON.stringify({ accessToken: s.accessToken, refreshToken: s.refreshToken, userInfo: s.user })), session.data);
    await restricted.goto(`${WEB}/system/account`);
    await restricted.locator('[id="account-grid-계정"] .tabulator-col[tabulator-field="empNo"] input').fill(empNo); await restricted.waitForTimeout(400);
    await restricted.locator('[id="account-grid-계정"]').getByRole('button', { name: '편집', exact: true }).click();
    await restricted.getByText('수동 메뉴 설정', { exact: true }).waitFor();
    assert.equal(await restricted.getByLabel('새 비밀번호', { exact: true }).count(), 0, 'manual account-menu grant does not expose password fields');
    console.log('PASS: administrator browser password change, old/new login, non-admin password fields hidden');
  } finally { if (browser) await browser.close(); if (created) ok(await send('DELETE', `/system/users/${empNo}`)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
