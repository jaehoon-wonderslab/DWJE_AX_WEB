/* UI contract regression: independent server search/paging, resize/scroll, additive menu edit. */
const assert = require('node:assert/strict');
const { open, WEB } = require('../lib/browser');
(async () => {
  const { browser, page } = await open();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const users = Array.from({ length: 32 }, (_, i) => ({ empNo: `UI${i}`, name: `검증계정 ${i}`, deptId: 2, dept: '품질보증팀', pos: 'STAFF', posNm: '사원', state: 'ACTIVE', stateNm: '사용', loginFailCnt: i, lastLoginAt: '2026-09-13 10:00:00', extraMenuIds: i === 0 ? ['prod-result'] : [] }));
  const depts = Array.from({ length: 32 }, (_, i) => ({ deptId: i + 1, deptNm: `검증부서 ${i}`, abbr: `D${i}`, desc: `부서 설명 ${i}`, userCnt: i }));
  const logs = Array.from({ length: 32 }, (_, i) => ({ ts: `2026-09-13 10:00:${i}`, target: `대상 ${i}`, actType: 'ACCOUNT', detail: `변경내용 ${i}`, by: `수행자 ${i}` }));
  let saved, savedDept;
  const requests = [];
  await page.route('**/api/v1/system/**', async route => {
    const request = route.request(), url = new URL(request.url());
    const path = url.pathname.replace('/api/v1/system/', '');
    const ok = (data, meta) => route.fulfill({ json: { success: true, data, meta, message: '완료' } });
    if (request.method() === 'PUT' && path === 'users/UI0') {
      saved = request.postDataJSON(); Object.assign(users[0], saved); return ok({});
    }
    if (request.method() === 'POST' && path === 'depts') { savedDept = request.postDataJSON(); return ok({ deptId: 33 }); }
    if (path === 'accounts/summary') return ok({ userCnt: { active: 32, pending: 32 }, deptCnt: 32, canChangePassword: true });
    if (path === 'menu-perms') return ok({ screens: [{ id: 'dash-ai', name: 'AI 통합 대시보드', group: '대시보드' }, { id: 'prod-result', name: '실적 집계·조회', group: '생산' }, { id: 'qc-defect', name: '불량 현황 조회', group: '품질' }], matrix: { 1: ['prod-result'], 2: ['dash-ai'] } });
    let rows = path === 'users' || path === 'users/pending' ? users : path === 'depts' ? depts : path === 'perm-logs' ? logs : null;
    if (!rows) return route.continue();
    const keyword = url.searchParams.get('keyword') || '', current = Number(url.searchParams.get('page') || 1), size = Number(url.searchParams.get('size') ?? 10);
    requests.push({ path, keyword, page: current, size });
    rows = rows.filter(row => Object.values(row).join(' ').includes(keyword));
    const total = rows.length;
    return ok({ items: size === 0 ? rows : rows.slice((current - 1) * size, current * size) }, { total, size, page: current, totalPages: size ? Math.ceil(total / size) : 1 });
  });
  try {
    await page.goto(`${WEB}/system/account`);
    await page.locator('[id="account-grid-계정"] .tabulator-row').first().waitFor();
    for (const label of ['가입 승인 대기', '계정', '부서', '변경 이력']) {
      const grid = page.locator(`[id="account-grid-${label}"]`);
      await grid.locator('.tabulator-row').first().waitFor();
      assert.equal(await grid.locator('.tabulator-row').count(), 10, `${label} page size`);
      await (label === '가입 승인 대기' ? grid.getByRole('button', { name: '다음 쪽', exact: true }) : grid.locator('.tabulator-page[data-page="next"]')).click();
      await page.waitForTimeout(250);
      assert.equal(await grid.locator('.tabulator-row').count(), 10);
      const input = grid.getByRole('textbox', { name: `${label} 검색`, exact: true });
      await input.fill(label === '부서' ? '설명 31' : label === '변경 이력' ? '변경내용 31' : '검증계정 31'); await input.press('Enter');
      await page.waitForTimeout(300);
      assert.equal(await grid.locator('.tabulator-row').count(), 1, `${label} search over all pages`);
      assert(await input.evaluate(el => el === document.activeElement), `${label} focus survives search`);
      await grid.getByRole('button', { name: '초기화', exact: true }).click();
      await page.waitForTimeout(250);
    }
    const grid = page.locator('[id="account-grid-계정"]');
    for (const [label, field, query] of [['계정', 'loginFailCnt', '31'], ['계정', 'name', '계정 31'], ['계정', 'state', '사용'], ['부서', 'name', '부서 31'], ['변경 이력', 'by', '수행자 31']]) {
      const target = page.locator(`[id="account-grid-${label}"]`);
      const input = target.locator(`.tabulator-col[tabulator-field="${field}"] input`);
      await input.fill(query); await page.waitForTimeout(400);
      assert.equal(await target.locator('.tabulator-row').count(), field === 'state' ? 10 : 1, `${label}/${field} column filter over all pages`);
      assert(await input.evaluate(el => el === document.activeElement), 'column filter focus retained');
      await input.fill(''); await page.waitForTimeout(400);
    }
    const firstCol = grid.locator('.tabulator-col[tabulator-field="empNo"]');
    await firstCol.scrollIntoViewIfNeeded();
    const width = await firstCol.evaluate(el => el.getBoundingClientRect().width);
    const handle = grid.locator('.tabulator-header .tabulator-col-resize-handle').first();
    const box = await handle.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 90, box.y + box.height / 2, { steps: 10 }); await page.mouse.up();
    assert((await firstCol.evaluate(el => el.getBoundingClientRect().width)) > width + 50, 'column drag resizes');
    await page.setViewportSize({ width: 1000, height: 900 });
    for (const label of ['가입 승인 대기', '계정', '부서', '변경 이력']) {
      const root = page.locator(`[id="account-grid-${label}"]`);
      const result = await root.evaluate(async root => {
        const scroll = [...root.querySelectorAll('div')].find(el => getComputedStyle(el).overflowX === 'auto' && el.scrollWidth > el.clientWidth && (el.querySelector('.tabulator') || el.classList.contains('tabulator-tableholder')));
        if (!scroll) return { scroll: false };
        scroll.scrollLeft = scroll.scrollWidth;
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const col = [...root.querySelectorAll('.tabulator-headers .tabulator-col')].at(-1);
        const last = root.querySelector('.tabulator-row .tabulator-cell:last-of-type');
        const box = scroll.getBoundingClientRect(), header = col.getBoundingClientRect(), cell = last.getBoundingClientRect();
        return { scroll: scroll.scrollLeft > 0, headerVisible: header.right <= box.right + 2, cellVisible: cell.right <= box.right + 2, aligned: Math.abs(header.x - cell.x) < 2, border: getComputedStyle(col).borderRightWidth };
      });
      assert(result.scroll && result.headerVisible && result.cellVisible && result.aligned, `${label} rightmost column: ${JSON.stringify(result)}`);
      assert.notEqual(result.border, '0px');
    }
    await page.setViewportSize({ width: 1440, height: 960 });
    await grid.getByRole('button', { name: '편집', exact: true }).first().click();
    const added = page.getByRole('checkbox', { name: '실적 집계·조회 추가 허용', exact: true });
    await added.waitFor(); assert(await added.isChecked());
    assert(await page.getByRole('checkbox', { name: 'AI 통합 대시보드 추가 허용', exact: true }).isDisabled());
    await page.getByLabel('새 비밀번호', { exact: true }).fill('TestOnly!2026');
    await page.getByLabel('새 비밀번호 확인', { exact: true }).fill('Mismatch!2026');
    await page.getByRole('button', { name: '수정', exact: true }).click();
    assert(await page.getByText('새 비밀번호가 일치하지 않습니다.').count());
    assert.equal(saved, undefined, 'mismatched passwords do not submit');
    await page.getByLabel('새 비밀번호', { exact: true }).fill('');
    await page.getByLabel('새 비밀번호 확인', { exact: true }).fill('');
    await added.uncheck();
    await page.getByRole('checkbox', { name: '불량 현황 조회 추가 허용', exact: true }).check();
    await page.getByRole('button', { name: '수정', exact: true }).click();
    await page.waitForTimeout(300);
    assert.deepEqual(saved.extraMenuIds, ['qc-defect']);
    assert.equal(saved.deptId, 2);
    await grid.getByRole('button', { name: '편집', exact: true }).first().click();
    await page.getByRole('checkbox', { name: '불량 현황 조회 추가 허용', exact: true }).uncheck();
    await page.getByRole('button', { name: '수정', exact: true }).click();
    await page.waitForTimeout(300);
    assert.deepEqual(saved.extraMenuIds, [], 'empty selection explicitly removes extra grants');
    assert.equal(await page.getByRole('button', { name: '부서 이동', exact: true }).count(), 0);
    await page.getByRole('button', { name: '부서 등록', exact: true }).first().click();
    const select = page.getByRole('combobox', { name: '초기 권한 (복사해 올 부서)', exact: true });
    await select.selectOption('2'); assert.equal(await select.inputValue(), '2');
    await select.selectOption(''); assert.equal(await select.inputValue(), '');
    await select.selectOption('32'); assert.equal(await select.inputValue(), '32');
    await page.getByPlaceholder('예) 공정기술팀', { exact: true }).fill('선택검증부서');
    await page.getByPlaceholder('예) PE', { exact: true }).fill('UI');
    await page.getByRole('button', { name: '등록', exact: true }).click();
    await page.waitForTimeout(300);
    assert.equal(savedDept.initPermFrom, 32, 'selected department ID submitted as number');
    assert.equal(errors.length, 0, errors.join('\n'));
    console.log('PASS: four grids search/paging, input focus, resize, narrow scroll/borders, manual menu save');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
