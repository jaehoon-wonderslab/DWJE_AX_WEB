/*
 * 그룹웨어 부서 매핑 P1 (기획 02 GWD-04·05·06·07) — 실 API 읽기 + 쓰기만 가로채기
 *
 *  · GWD-06 조회 분리: 탭 건수 = 전체 수, 검색 입력 중 요청 없음, 매핑 표 열 검색 없음, 미배정 수 → 미배정 탭 검색
 *  · GWD-04 매핑 저장 후 「이 부서 미배정 계정도 옮기기」 → PUT 매핑 + POST reassign {gwDeptNms}
 *  · GWD-06 가입 제외면 AX 부서를 고를 수 없음
 *  · GWD-05 일괄 지정 → PUT /gw-dept-maps/bulk 한 번. 서버에 없으면(404) 한 건씩 저장으로 돌아감
 * 쓰기는 DB 를 바꾸지 않도록 모두 가로채 성공으로 돌려줍니다.
 *
 *   API_URL=http://localhost:18081 WEB_URL=http://localhost:8099 node tests/system/gw-dept-map-p1-browser.cjs
 */
const assert = require('node:assert/strict');
const { open, WEB } = require('../lib/browser');
const { BASE } = require('../lib/api');

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

  const searchBox = page.getByPlaceholder('그룹웨어 부서 · AX 부서 · 메모');
  const modalBtn = (name) => page.getByRole('button', { name, exact: true }).last();

  try {
    await page.goto(`${WEB}/system/gw-dept-map`);
    await page.locator('.tabulator-row').first().waitFor({ timeout: 60000 });

    // GWD-06 탭 건수 = 전체 수, 매핑 표 열 검색 없음
    assert(await page.getByText(`부서 매핑 ${maps.length}`, { exact: true }).count(), `부서 매핑 ${maps.length}`);
    assert(await page.getByText(`미배정 계정 ${users.length}`, { exact: true }).count(), `미배정 계정 ${users.length}`);
    assert.equal(await page.locator('.tabulator-header input').count(), 0, '매핑 표 열 검색 끔');

    // GWD-06 검색 입력 중 요청 없음, 결과 건수
    const before = gets.length;
    await searchBox.pressSequentially(target.gwDeptNm.slice(0, 4), { delay: 60 });
    await page.waitForTimeout(800);
    assert.equal(gets.length, before, '검색 입력 중 네트워크 요청 0건');
    const expect = maps.filter((m) => `${m.gwDeptNm} ${m.deptNm || ''} ${m.remark || ''}`.toLowerCase().includes(target.gwDeptNm.slice(0, 4).toLowerCase())).length;
    assert(await page.getByText(`검색 결과 ${expect}건`, { exact: false }).count(), `검색 결과 ${expect}건`);
    assert(await page.getByText(`부서 매핑 ${maps.length}`, { exact: true }).count(), '검색해도 탭 건수는 전체');
    await searchBox.fill('');
    await page.waitForTimeout(600);

    // GWD-06 미배정 수 → 미배정 탭을 그 부서로
    await page.locator('.tabulator-row', { hasText: target.gwDeptNm }).locator('button.tag').click();
    await page.locator('.tabulator-row', { hasText: target.gwDeptNm }).first().waitFor();
    assert.equal(await page.getByPlaceholder('사번 · 이름 · 그룹웨어 부서').inputValue(), target.gwDeptNm);
    assert(await page.getByText(`검색 결과 ${target.unassignedCnt}명`, { exact: false }).count(), `미배정 탭 ${target.unassignedCnt}명`);
    await page.getByText(/^부서 매핑 \d+$/).click();
    await page.locator('.tabulator-row', { hasText: target.gwDeptNm }).waitFor();

    // GWD-04 저장 후 옮기기
    await page.locator('.tabulator-row', { hasText: target.gwDeptNm }).getByRole('button', { name: '지정', exact: true }).click();
    await page.getByText(`이 부서 미배정 계정 ${target.unassignedCnt}명은 AX 부서를 고르면`, { exact: false }).waitFor();
    const ax = page.getByRole('combobox', { name: 'AX 부서', exact: true });
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

    // GWD-05 일괄 지정 — 한 번의 요청
    const cells = page.locator('.tabulator-row .tabulator-cell:first-child');
    const picks = async () => {
      await cells.nth(0).locator('input').click();
      await cells.nth(1).locator('input').click();
      await page.getByRole('button', { name: '선택 2개 일괄 지정', exact: true }).waitFor();
    };
    await picks();
    await page.getByRole('button', { name: '선택 2개 일괄 지정', exact: true }).click();
    await page.getByRole('combobox', { name: 'AX 부서', exact: true }).selectOption(String(depts[1].deptId));
    await modalBtn('일괄 저장').click();
    await page.waitForTimeout(800);
    const bulk = writes.filter((w) => w.path === 'gw-dept-maps/bulk');
    assert.equal(bulk.length, 1);
    assert.equal(bulk[0].body.gwDeptNms.length, 2);
    assert.equal(String(bulk[0].body.deptId), String(depts[1].deptId));
    assert.equal(bulk[0].body.joinYn, 'Y');

    // 서버에 일괄 API 가 없으면 한 건씩
    bulkMissing = true;
    const singleBefore = writes.filter((w) => w.method === 'PUT' && w.path === 'gw-dept-maps').length;
    await page.waitForTimeout(800);
    await picks();
    await page.getByRole('button', { name: '선택 2개 일괄 지정', exact: true }).click();
    await modalBtn('일괄 저장').click();
    await page.waitForTimeout(1200);
    assert.equal(writes.filter((w) => w.method === 'PUT' && w.path === 'gw-dept-maps').length - singleBefore, 2, '404 면 한 건씩 저장');

    assert.equal(errors.length, 0, errors.join('\n'));
    console.log(`PASS: gw-dept-map P1 (실 API) — 탭 ${maps.length}/${users.length}·검색 요청 0건·미배정 수 이동·저장 후 옮기기·가입 제외 잠금·일괄 1회·404 대체`);
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
