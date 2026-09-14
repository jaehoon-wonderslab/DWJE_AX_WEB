const assert = require('node:assert/strict');
const { open, WEB } = require('../lib/browser');
(async () => {
  const { page, browser } = await open();
  const screens = [{ id: 'prod-result', name: '화면 A', group: '생산' }, { id: 'prod-monitor', name: '화면 B', group: '생산', sub: true }, { id: 'qc-defect', name: '화면 C', group: '품질', action: true }];
  const depts = [{ deptId: 1, deptNm: '관리자', superAdmin: true }, { deptId: 2, deptNm: '검증부서' }, { deptId: 3, deptNm: '마지막부서' }];
  const matrix = { 1: ['prod-result', 'prod-monitor', 'qc-defect'], 2: ['prod-result'], 3: [] }, writes = [], errors = [];
  let removedApi = 0, failNext = false;
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/api/v1/system/menu-perms**', async route => {
    const req = route.request(), path = new URL(req.url()).pathname;
    if (path.endsWith('/dept-status')) removedApi++;
    if (req.method() === 'PUT') {
      const body = req.postDataJSON(); writes.push(body);
      if (failNext) { failNext = false; return route.fulfill({ json: { success: false, message: '검증용 저장 실패' } }); }
      const ids = path.endsWith('/group') ? screens.filter(s => s.group === body.groupNm).map(s => s.id) : [body.screenId];
      matrix[body.deptId] = [...new Set([...matrix[body.deptId].filter(id => !ids.includes(id)), ...(body.allowed ? ids : [])])];
      return route.fulfill({ json: { success: true, message: '저장 완료', data: {} } });
    }
    return route.fulfill({ json: { success: true, data: { screens, depts, matrix } } });
  });
  try {
    await page.goto(`${WEB}/system/menu-perm`);
    const table = page.locator('.tabulator'); await table.waitFor();
    assert.equal(await page.getByText('부서별 적용 현황', { exact: true }).count(), 0);
    assert.equal(removedApi, 0);
    assert.equal(await table.locator('.tabulator-header-filter').count(), 0);
    const checkbox = () => page.getByRole('checkbox', { name: '실적 집계·조회 · 검증부서 접근 허용', exact: true });
    assert(await page.getByRole('checkbox', { name: '실적 집계·조회 · 관리자 접근 허용', exact: true }).isDisabled());
    await page.getByRole('button', { name: '대시보드 접기', exact: true }).click();
    await page.waitForTimeout(200);
    assert.equal(await page.getByRole('checkbox', { name: '생산 모니터링 · 검증부서 접근 허용', exact: true }).count(), 0);
    await checkbox().click(); await page.waitForTimeout(500);
    assert.deepEqual(writes.at(-1), { deptId: '2', screenId: 'prod-result', allowed: false });
    assert(!(await checkbox().isChecked()));
    assert.equal(await page.getByRole('button', { name: '대시보드 펼치기', exact: true }).count(), 1);
    failNext = true;
    await checkbox().click(); await page.waitForTimeout(300);
    assert(!(await checkbox().isChecked()), 'failed save retains old state');
    const before = writes.length;
    await page.getByRole('button', { name: '생산 및 품질 관리 접기', exact: true }).click();
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: '생산 및 품질 관리 검증부서 전체 허용', exact: true }).click(); await page.waitForTimeout(600);
    assert.deepEqual(writes.slice(before), [
      { deptId: '2', screenId: 'prod-result', allowed: true },
      { deptId: '2', screenId: 'qc-defect', allowed: true },
    ], 'bulk uses latest group IDs, including collapsed screens');
    await page.getByRole('button', { name: '생산 및 품질 관리 펼치기', exact: true }).click(); await page.waitForTimeout(200);
    assert(await checkbox().isChecked());
    await page.getByRole('button', { name: '대시보드 펼치기', exact: true }).click(); await page.waitForTimeout(200);
    assert.equal(await page.getByRole('checkbox', { name: '생산 모니터링 · 검증부서 접근 허용', exact: true }).count(), 1);
    await page.setViewportSize({ width: 1000, height: 900 });
    const scroll = await table.evaluate(async el => {
      const holder = el.querySelector('.tabulator-tableholder'); holder.scrollLeft = holder.scrollWidth;
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const header = el.querySelector('.tabulator-col[tabulator-field="dept_3"]').getBoundingClientRect();
      const cell = el.querySelector('.tabulator-row:not(.tabulator-calcs) .tabulator-cell[tabulator-field="dept_3"]').getBoundingClientRect();
      return holder.scrollLeft > 0 && header.right <= holder.getBoundingClientRect().right + 2 && Math.abs(header.x - cell.x) < 2;
    });
    assert(scroll, 'rightmost department visible and header/body aligned');
    assert.deepEqual(errors, []);
    console.log('PASS: latest menu names/groups, no filters, persistent group collapse, individual/group writes, failed-save rollback, locked admin, narrow horizontal scroll, status API removed');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
