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
    // 앱 번들은 8080 을 부릅니다 — API_URL 이 다르면(예: 18081) 그쪽으로 돌립니다
    const apiTarget = (process.env.API_URL || 'http://localhost:8080').replace(/\/$/, '');
    if (!apiTarget.endsWith('localhost:8080')) {
      await page.route('http://localhost:8080/**', (r) => r.continue({ url: r.request().url().replace('http://localhost:8080', apiTarget) }));
    }
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
    const first = await login(changed); assert(first.success, 'new password accepted');
    // 관리자가 정한 비밀번호도 초기 비밀번호라 본인이 한 번 바꿔야 화면이 열립니다(R-04)
    const own = `${changed}a`;
    const pw = await fetch(`${BASE}/api/v1/auth/password`, { method: 'POST', headers: { Authorization: `Bearer ${first.data.accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: changed, newPassword: own, newPasswordConfirm: own }) });
    assert((await pw.json()).success, 'own password change');
    const session = await login(own); assert(session.success, 'own password accepted');
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 960 } }); const restricted = await ctx.newPage();
    if (!apiTarget.endsWith('localhost:8080')) {
      await restricted.route('http://localhost:8080/**', (r) => r.continue({ url: r.request().url().replace('http://localhost:8080', apiTarget) }));
    }
    await restricted.goto(`${WEB}/login`);
    await restricted.evaluate(s => localStorage.setItem('dwje.ax.session', JSON.stringify({ accessToken: s.accessToken, refreshToken: s.refreshToken, userInfo: s.user })), session.data);
    await restricted.goto(`${WEB}/system/account`);
    await restricted.locator('[id="account-grid-계정"] .tabulator-col[tabulator-field="empNo"] input').fill(empNo); await restricted.waitForTimeout(400);
    // 수동 메뉴 부여는 조회 권한만 줍니다 — 쓰기 권한이 없으면 편집 단추가 꺼지고(R-03) 비밀번호 칸도 보이지 않습니다
    const editBtn = restricted.locator('[id="account-grid-계정"]').getByRole('button', { name: '편집', exact: true });
    await editBtn.first().waitFor();
    assert(await editBtn.first().isDisabled(), 'read-only grant cannot open the edit dialog');
    assert.equal(await restricted.getByLabel('새 비밀번호', { exact: true }).count(), 0, 'manual account-menu grant does not expose password fields');
    console.log('PASS: administrator browser password change, old/new login, read-only grant cannot edit or see password fields');
  } finally { if (browser) await browser.close(); if (created) ok(await send('DELETE', `/system/users/${empNo}`)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
