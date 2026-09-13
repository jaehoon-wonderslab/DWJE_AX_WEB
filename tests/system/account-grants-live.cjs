/* Live integration. Creates isolated department/account; always removes both. */
const assert = require('node:assert/strict');
const { send, get, BASE, PASSWORD } = require('../lib/api');
const ok = response => { assert(response.body.success, JSON.stringify({ status: response.status, message: response.body.message })); return response.body.data; };
(async () => {
  const empNo = `WG${Date.now()}`;
  let deptId, created = false;
  try {
    // Verify new contract before creating test data.
    const existing = ok(await get('/system/users', { size: 1 }));
    assert(Array.isArray(existing.items[0].extraMenuIds), 'Deploy account grant API before running this test');
    const dept = ok(await send('POST', '/system/depts', { deptNm: empNo, abbr: `W${String(Date.now()).slice(-3)}`, desc: `${empNo} 검색검증` }));
    deptId = dept.deptId;
    assert(deptId);
    ok(await send('PUT', '/system/menu-perms', { deptId, screenId: 'dash-ai', allowed: true }));
    ok(await send('POST', '/system/users', { empNo, name: empNo, deptId, pos: 'STAFF', state: 'ACTIVE', password: PASSWORD, extraMenuIds: [] }));
    created = true;
    const login = await fetch(`${BASE}/api/v1/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ loginId: empNo, password: PASSWORD }) });
    const loginBody = await login.json(); assert(loginBody.success);
    const token = loginBody.data.accessToken;
    const asUser = async (path, method = 'GET', data) => {
      const response = await fetch(`${BASE}/api/v1${path}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: data ? JSON.stringify(data) : undefined });
      return { status: response.status, body: await response.json() };
    };
    const before = ok(await asUser('/auth/me'));
    assert(before.menuPerms.includes('dash-ai'));
    assert(!before.menuPerms.includes('sys-account'));
    assert.equal((await asUser('/system/users')).status, 403);
    ok(await send('PUT', `/system/users/${empNo}`, { extraMenuIds: ['sys-account'] }));
    const after = ok(await asUser('/auth/me'));
    assert(after.menuPerms.includes('dash-ai') && after.menuPerms.includes('sys-account'));
    assert.deepEqual(after.dataPerms, before.dataPerms);
    ok(await asUser('/system/users'));
    ok(await asUser('/system/menu-perms')); // Account manager can read options.
    assert.equal((await asUser('/system/menu-perms', 'PUT', { deptId, screenId: 'sys-menu', allowed: true })).status, 403);
    ok(await send('PUT', `/system/users/${empNo}`, { name: `${empNo} 수정` }));
    let row = ok(await get('/system/users', { keyword: empNo })).items.find(row => row.empNo === empNo);
    assert.deepEqual(row.extraMenuIds, ['sys-account'], 'omitted grants preserve existing value');
    const invalid = await send('PUT', `/system/users/${empNo}`, { name: '원자저장실패검증', extraMenuIds: ['NO_SUCH_MENU'] });
    assert(invalid.status >= 400);
    row = ok(await get('/system/users', { keyword: empNo })).items.find(row => row.empNo === empNo);
    assert.equal(row.name, `${empNo} 수정`);
    assert.deepEqual(row.extraMenuIds, ['sys-account']);
    ok(await send('PUT', `/system/users/${empNo}`, { extraMenuIds: [] }));
    const revoked = ok(await asUser('/auth/me'));
    assert(revoked.menuPerms.includes('dash-ai'), 'department grant remains');
    assert(!revoked.menuPerms.includes('sys-account'));
    assert.equal((await asUser('/system/users')).status, 403, 'same token loses revoked grant immediately');
    for (const path of ['/system/users', '/system/depts', '/system/perm-logs']) {
      const result = await get(path, { keyword: empNo, page: 1, size: 1 });
      ok(result); assert(result.body.meta.total >= 1, `${path} search`); assert(result.body.data.items.length <= 1);
      const none = await get(path, { keyword: `${empNo}NO_MATCH`, page: 1, size: 10 });
      ok(none); assert.equal(none.body.meta.total, 0, `${path} unmatched search`);
    }
    console.log('PASS: live department + account union, grant/revoke with existing token, data permissions unchanged, atomic invalid save, full-list search/paging');
  } finally {
    if (created) ok(await send('DELETE', `/system/users/${empNo}`));
    if (deptId) ok(await send('DELETE', `/system/depts/${deptId}`));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
