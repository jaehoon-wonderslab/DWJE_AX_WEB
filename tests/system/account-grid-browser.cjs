/* UI contract regression: independent server search/paging, resize/scroll, additive menu edit. */
const assert = require('node:assert/strict');
const { open, WEB } = require('../lib/browser');
const { openAccountTab, pickListFilter } = require('../lib/accountTabs');
(async () => {
  const { browser, page } = await open();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const users = Array.from({ length: 32 }, (_, i) => ({ empNo: `UI${i}`, name: `검증계정 ${i}`, deptId: 2, dept: '품질보증팀', pos: 'STAFF', posNm: '사원', state: 'ACTIVE', stateNm: '사용', loginFailCnt: i, lastLoginAt: '2026-09-13 10:00:00', extraMenuIds: i === 0 ? ['prod-result'] : [] }));
  const depts = Array.from({ length: 32 }, (_, i) => ({ deptId: i + 1, deptNm: `검증부서 ${i}`, desc: `부서 설명 ${i}`, userCnt: i }));
  const logs = Array.from({ length: 32 }, (_, i) => ({ ts: `2026-09-13 10:00:${i}`, target: `대상 ${i}`, actType: 'ACCOUNT', detail: `변경내용 ${i}`, by: `수행자 ${i}` }));
  let saved, savedDept;
  // 앱 번들은 8080 을 부릅니다 — API_URL 이 다르면(예: 18081) 그쪽으로 돌립니다. 아래의 화면별 가로채기가 먼저 걸립니다
  const apiTarget = (process.env.API_URL || 'http://localhost:8080').replace(/\/$/, '');
  if (!apiTarget.endsWith('localhost:8080')) {
    await page.route('http://localhost:8080/**', (r) => r.continue({ url: r.request().url().replace('http://localhost:8080', apiTarget) }));
  }
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
    if (!rows) return route.fallback();
    const keyword = url.searchParams.get('keyword') || '', current = Number(url.searchParams.get('page') || 1), size = Number(url.searchParams.get('size') ?? 10);
    requests.push({ path, keyword, page: current, size });
    rows = rows.filter(row => Object.values(row).join(' ').includes(keyword));
    const total = rows.length;
    return ok({ items: size === 0 ? rows : rows.slice((current - 1) * size, current * size) }, { total, size, page: current, totalPages: size ? Math.ceil(total / size) : 1 });
  });
  try {
    await page.goto(`${WEB}/system/account`);
    await page.locator('[id="account-grid-계정"] .tabulator-row').first().waitFor();
    // 2026-10-02 — 표가 탭으로 나뉘고 기본 100행입니다(가입 승인 대기 카드는 없앴습니다)
    assert.equal(await page.locator('[id="account-grid-가입 승인 대기"]').count(), 0, 'pending card removed');
    for (const label of ['계정', '부서', '변경 이력']) {
      const grid = await openAccountTab(page, label);
      assert.equal(await grid.locator('.tabulator-row').count(), 32, `${label} default page size 100 shows all 32`);
      assert.equal(await grid.locator('.tabulator-page-size').inputValue(), '100', `${label} page size selector default`);
      // 쪽 나눔은 그대로 — 10행으로 바꾸면 다음 쪽으로 넘어갑니다
      await grid.locator('.tabulator-page-size').selectOption('10');
      await page.waitForTimeout(250);
      assert.equal(await grid.locator('.tabulator-row').count(), 10, `${label} page size 10`);
      await grid.locator('.tabulator-page[data-page="next"]').click();
      await page.waitForTimeout(250);
      assert.equal(await grid.locator('.tabulator-row').count(), 10);
      // 세 탭 모두 검색줄(검색칸 · 검색 · 초기화)을 두지 않습니다(2026-10-02) — 열 필터만 씁니다
      assert.equal(await grid.getByRole('textbox', { name: `${label} 검색`, exact: true }).count(), 0, `${label} search box removed`);
      assert.equal(await grid.getByRole('button', { name: '초기화', exact: true }).count(), 0, `${label} reset button removed`);
      assert.equal(await grid.getByText('전체 목록에서 검색합니다', { exact: false }).count(), 0, `${label} search note removed`);
    }
    // 이력 기간은 처음에 오늘을 종료일로 최근 7일입니다(2026-10-02)
    {
      const logPanel = page.locator('[id="account-panel-logs"]');
      const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const from = new Date(); from.setDate(from.getDate() - 7);
      assert.equal(await logPanel.locator('input').nth(0).inputValue(), ymd(from), 'log period from = today - 7');
      assert.equal(await logPanel.locator('input').nth(1).inputValue(), ymd(new Date()), 'log period to = today');
    }
    for (const [label, field, query] of [['계정', 'loginFailCnt', '31'], ['계정', 'name', '계정 31'], ['부서', 'name', '부서 31'], ['변경 이력', 'by', '수행자 31']]) {
      const target = await openAccountTab(page, label);
      const input = target.locator(`.tabulator-col[tabulator-field="${field}"] input`);
      await input.fill(query); await page.waitForTimeout(400);
      assert.equal(await target.locator('.tabulator-row').count(), 1, `${label}/${field} column filter over all pages`);
      assert(await input.evaluate(el => el === document.activeElement), 'column filter focus retained');
      await input.fill(''); await page.waitForTimeout(400);
    }
    // 상태 · 직급 · 가입 경로 · 초기 비밀번호는 검색칸이 아니라 목록입니다(Tabulator list 머리글 필터)
    const grid = await openAccountTab(page, '계정');
    await pickListFilter(grid, 'state', '사용');
    assert.equal(await grid.locator('.tabulator-row').count(), 32, 'state list filter keeps all ACTIVE rows');
    await pickListFilter(grid, 'state', '전체');
    // 「관리자」 는 직급이 아니라 따로 둔 열입니다(2026-10-02)
    await pickListFilter(grid, 'admin', '일반');
    assert.equal(await grid.locator('.tabulator-row').count(), 32, 'admin list filter 일반');
    await pickListFilter(grid, 'admin', '전체');
    const firstCol = grid.locator('.tabulator-col[tabulator-field="empNo"]');
    await firstCol.scrollIntoViewIfNeeded();
    const width = await firstCol.evaluate(el => el.getBoundingClientRect().width);
    const handle = grid.locator('.tabulator-header .tabulator-col-resize-handle').first();
    const box = await handle.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 90, box.y + box.height / 2, { steps: 10 }); await page.mouse.up();
    assert((await firstCol.evaluate(el => el.getBoundingClientRect().width)) > width + 50, 'column drag resizes');
    await page.setViewportSize({ width: 1000, height: 900 });
    await page.waitForTimeout(600); // 표가 새 폭으로 다시 그려질 때까지(이미 열린 탭은 다시 그리지 않음)
    for (const label of ['계정', '부서', '변경 이력']) {
      const root = await openAccountTab(page, label);
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
    await openAccountTab(page, '계정');
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
    await openAccountTab(page, '부서'); // 「부서 등록」 은 부서 탭 머리에 있습니다
    await page.getByRole('button', { name: '부서 등록', exact: true }).first().click();
    const select = page.getByRole('combobox', { name: '초기 권한 (복사해 올 부서)', exact: true });
    await select.selectOption('2'); assert.equal(await select.inputValue(), '2');
    await select.selectOption(''); assert.equal(await select.inputValue(), '');
    await select.selectOption('32'); assert.equal(await select.inputValue(), '32');
    await page.getByPlaceholder('예) 공정기술팀', { exact: true }).fill('선택검증부서');
    assert.equal(await page.getByPlaceholder('예) PE', { exact: true }).count(), 0, 'abbr field removed from dept form');
    await page.getByRole('button', { name: '등록', exact: true }).click();
    await page.waitForTimeout(300);
    assert.equal(savedDept.initPermFrom, 32, 'selected department ID submitted as number');
    assert.equal('abbr' in savedDept, false, 'abbr not sent');
    assert.equal(errors.length, 0, errors.join('\n'));
    console.log('PASS: three tab grids (default 100 rows) search/paging, input focus, resize, narrow scroll/borders, manual menu save');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
