/*
 * 그룹웨어 부서 매핑 P1 (기획 02 GWD-04·05·06·07) — 실 API 읽기 + 쓰기만 가로채기
 *
 *  · GWD-06 조회 분리: 탭 건수 = 전체 수, 열 필터 입력 중 요청 없음, 미배정 수 → 미배정 탭 검색
 *    (2026-10-02 상단 검색·상태·일괄 지정 줄과 선택 칸을 빼고 매핑 표 열 머리글 필터로 찾습니다)
 *  · GWD-04 매핑 저장 후 「이 부서 미배정 계정도 옮기기」 → PUT 매핑 + POST reassign {gwDeptNms}
 *  · GWD-06 가입 제외면 AX 부서를 고를 수 없음
 *  · GWD-05 일괄 지정은 화면에서 뺐습니다(2026-10-02) — 단추·선택 칸이 없는지만 봅니다
 * 쓰기는 DB 를 바꾸지 않도록 모두 가로채 성공으로 돌려줍니다.
 *
 *   API_URL=http://localhost:18081 WEB_URL=http://localhost:8099 node tests/system/gw-dept-map-p1-browser.cjs
 */
const assert = require('node:assert/strict');
const { open, WEB } = require('../lib/browser');
const { BASE } = require('../lib/api');

/** 탭(CardTabs) 글자 — 이름과 건수 배지를 한 줄로 이어 「부서 매핑 12」 처럼 돌려줍니다 */
const tabText = async (page, value) => (await page.locator(`#gw-dept-tab-${value}`).innerText()).replace(/\s+/g, ' ').trim();


(async () => {
  const { browser, page } = await open();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const apiTarget = (process.env.API_URL || 'http://localhost:8080').replace(/\/$/, '');
  if (!apiTarget.endsWith('localhost:8080')) {
    await page.route('http://localhost:8080/**', (r) => r.continue({ url: r.request().url().replace('http://localhost:8080', apiTarget) }));
  }
  const token = await page.evaluate(() => JSON.parse(localStorage.getItem('dwje.ax.session')).accessToken);
  const api = async (path) => (await (await fetch(`${BASE}/api/v1${path}`, { headers: { Authorization: `Bearer ${token}` } })).json());
  const mapsRes = await api('/system/gw-dept-maps?size=0');
  const usersRes = await api('/system/gw-dept-maps/unassigned-users?size=0');
  const maps = mapsRes.data.items;
  const users = usersRes.data.items;
  const target = maps.filter((m) => m.unassignedCnt > 0 && m.state === 'UNMAPPED').sort((a, b) => b.unassignedCnt - a.unassignedCnt)[0];
  const depts = (await api('/system/depts?size=0')).data.items.filter((d) => !d.systemRole);

  const writes = [];
  const gets = [];
  let bulkMissing = false;
  await page.route('**/api/v1/system/gw-dept-maps**', async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace('/api/v1/system/', '');
    if (req.method() === 'GET') { gets.push(path); return route.fallback(); }
    const body = req.postDataJSON();
    writes.push({ method: req.method(), path, body });
    if (path === 'gw-dept-maps/bulk' && bulkMissing) return route.fulfill({ status: 404, json: { success: false, code: 'E-NOTFOUND', message: '요청한 경로가 없습니다.' } });
    if (path === 'gw-dept-maps/reassign') {
      const moved = users.filter((u) => (body.gwDeptNms || []).includes(u.gwDeptNm));
      return route.fulfill({ json: { success: true, message: `미배정 계정 ${moved.length}명을 옮겼습니다.`, data: { movedCnt: moved.length, skippedCnt: 0, items: moved.map((u) => ({ empNo: u.empNo, deptNm: 'X', gwDeptNm: u.gwDeptNm })), byDept: [], skipped: [] } } });
    }
    return route.fulfill({ json: { success: true, message: '저장했습니다.', data: { savedCnt: (body.gwDeptNms || [1]).length } } });
  });

  // 상단 검색칸 대신 「그룹웨어 부서」 열 머리글 필터
  const searchBox = page.locator('.tabulator-col[tabulator-field="gwDeptNm"] .tabulator-header-filter input').first();
  const modalBtn = (name) => page.getByRole('button', { name, exact: true }).last();

  try {
    await page.goto(`${WEB}/system/gw-dept-map`);
    await page.locator('.tabulator-row').first().waitFor({ timeout: 60000 });

    // GWD-06 탭 건수 = 전체 수, 매핑 표 열 검색 없음
    assert.equal(await tabText(page, 'map'), `부서 매핑 ${maps.length}`);
    assert.equal(await tabText(page, 'users'), `미배정 계정 ${users.length}`);
    assert(await searchBox.count(), '매핑 표 열 머리글 필터 있음');
    assert.equal(await page.getByPlaceholder('그룹웨어 부서 · AX 부서 · 메모').count(), 0, '상단 검색칸 없음');

    // GWD-06 검색 입력 중 요청 없음, 결과 건수
    const before = gets.length;
    await searchBox.pressSequentially(target.gwDeptNm.slice(0, 4), { delay: 60 });
    await page.waitForTimeout(800);
    assert.equal(gets.length, before, '검색 입력 중 네트워크 요청 0건');
    const q = target.gwDeptNm.slice(0, 4).toLowerCase();
    const shown = await page.locator('.tabulator-row .tabulator-cell[tabulator-field="gwDeptNm"]').allInnerTexts();
    assert(shown.length && shown.every((t) => t.toLowerCase().includes(q)), `열 필터 결과는 그 이름만: ${shown.slice(0, 5)}`);
    assert.equal(await tabText(page, 'map'), `부서 매핑 ${maps.length}`, '검색해도 탭 건수는 전체');
    await searchBox.fill('');
    await page.waitForTimeout(600);

    // 2026-10-02 — 재직 · 가입 계정 · 미배정 계정 열(미배정 수 → 미배정 탭 링크 포함)을 뺐습니다
    for (const f of ['activeCnt', 'joinedCnt', 'unassignedCnt']) {
      assert.equal(await page.locator(`.tabulator-col[tabulator-field="${f}"]`).count(), 0, `${f} 열 없음`);
    }
    // 상태 열은 목록 필터 — 「미배정」 을 고르면 그 상태 행만
    await page.locator('.tabulator-col[tabulator-field="state"] .tabulator-header-filter input').click();
    await page.locator('.tabulator-edit-list .tabulator-edit-list-item').filter({ hasText: /^미배정$/ }).first().click();
    await page.waitForTimeout(500);
    const states = await page.locator('.tabulator-row .tabulator-cell[tabulator-field="state"]').allInnerTexts();
    assert(states.length && states.every((t) => t.trim() === '미배정'), `상태 목록 필터: ${[...new Set(states)]}`);
    await page.locator('.tabulator-col[tabulator-field="state"] .tabulator-header-filter input').click();
    await page.locator('.tabulator-edit-list .tabulator-edit-list-item').filter({ hasText: /^전체$/ }).first().click();
    await page.waitForTimeout(500);

    // GWD-04 저장 후 옮기기
    await page.locator('.tabulator-row', { hasText: target.gwDeptNm }).getByRole('button', { name: '지정', exact: true }).click();
    // 「최근 이력」 칸 · 「AX 부서를 고르면 …」 안내 · 아래 안내 문장은 뺐습니다(2026-10-02)
    await page.getByRole('combobox', { name: '부서', exact: true }).waitFor();
    assert.equal(await page.getByText('AX 부서를 고르면 함께 옮길 수 있습니다', { exact: false }).count(), 0, '고르기 전 안내 없음');
    assert.equal(await page.getByText('최근 이력', { exact: true }).count(), 0, '최근 이력 칸 없음');
    assert.equal(await page.getByText('다음 동기화부터 새로 가입하는 사람에게', { exact: false }).count(), 0, '아래 안내 없음');
    const ax = page.getByRole('combobox', { name: '부서', exact: true });
    await ax.selectOption(String(depts[0].deptId));
    await page.getByText(`저장 후 이 부서 미배정 계정 ${target.unassignedCnt}명도 ${depts[0].deptNm}(으)로 옮기기`).waitFor();
    // GWD-06 가입 제외면 AX 부서 고를 수 없음
    await page.getByRole('combobox', { name: '자동 가입', exact: true }).selectOption('N');
    assert.deepEqual(await ax.locator('option').allTextContents(), ['가입 제외 — 저장하지 않음']);
    await page.getByRole('combobox', { name: '자동 가입', exact: true }).selectOption('Y');
    await ax.selectOption(String(depts[0].deptId));
    await modalBtn('저장').click();
    await page.getByText(`매핑을 저장했고 이 부서 미배정 계정 ${target.unassignedCnt}명을 옮겼습니다.`).waitFor();
    const put = writes.find((w) => w.method === 'PUT' && w.path === 'gw-dept-maps');
    assert.equal(put.body.gwDeptNm, target.gwDeptNm);
    assert.equal(String(put.body.deptId), String(depts[0].deptId));
    assert.deepEqual(writes.find((w) => w.path === 'gw-dept-maps/reassign').body, { gwDeptNms: [target.gwDeptNm] }, '그 그룹웨어 부서만 옮김');

    // GWD-05 일괄 지정 — 화면에서 뺐습니다(2026-10-02)
    assert.equal(await page.getByRole('button', { name: /일괄 지정/ }).count(), 0, '일괄 지정 단추 없음');
    assert.equal(await page.locator('.tabulator-row .tabulator-cell input[type="checkbox"]').count(), 0, '매핑 표 선택 칸 없음');

    assert.equal(errors.length, 0, errors.join('\n'));
    console.log(`PASS: gw-dept-map P1 (실 API) — 탭 ${maps.length}/${users.length}·검색 요청 0건·미배정 수 이동·저장 후 옮기기·가입 제외 잠금·일괄 지정 없음`);
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
