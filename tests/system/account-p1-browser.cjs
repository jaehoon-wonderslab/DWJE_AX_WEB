/*
 * 계정 관리 P1 (기획 01 ACC-06·07·08·09) — 실 API 읽기 + 쓰기만 가로채기
 *
 * 조회는 실제 API(API_URL, 기본 18081 권장)를 그대로 씁니다. DB 를 바꾸는 요청(승인·수정)만 page.route 로 받아
 * 본문을 확인하고 성공으로 돌려줍니다. 승인 대기는 로컬 DB 에 0건이라 목록만 흉내 냅니다.
 *
 *   API_URL=http://localhost:18081 WEB_URL=http://localhost:8099 node tests/system/account-p1-browser.cjs
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

  // 기대값은 같은 API 에서 직접 셉니다
  const token = await page.evaluate(() => JSON.parse(localStorage.getItem('dwje.ax.session')).accessToken);
  const api = async (path) => (await (await fetch(`${BASE}/api/v1${path}`, { headers: { Authorization: `Bearer ${token}` } })).json()).data;
  const deptList = (await api('/system/depts?size=0')).items;
  const unassigned = deptList.find((d) => d.systemRole === 'UNASSIGNED');
  const qa = deptList.find((d) => !d.systemRole && d.userCnt > 0);
  const allUsers = (await api('/system/users?size=0')).items;
  const unassignedUsers = allUsers.filter((u) => u.deptId === unassigned.deptId);
  const pwdInit = allUsers.filter((u) => u.pwdChangeRequired).length;

  const pending = [{ empNo: 'P30001', name: '신청자', deptId: qa.deptId, dept: qa.deptNm, pos: 'STAFF', posNm: '사원', state: 'PENDING', stateNm: '승인 대기', email: 'p***@derkwoo.com', requestedAt: '2026-10-01 09:12' }];
  const writes = [];
  const userCalls = [];
  const logCalls = [];
  await page.route('**/api/v1/system/**', async (route) => {
    const req = route.request(); const url = new URL(req.url());
    const path = url.pathname.replace('/api/v1/system/', '');
    if (req.method() !== 'GET') {
      writes.push({ method: req.method(), path, body: req.postDataJSON() });
      return route.fulfill({ json: { success: true, data: {}, message: '처리했습니다.' } });
    }
    if (path === 'users/pending') return route.fulfill({ json: { success: true, data: { items: pending }, meta: { total: 1, page: 1, size: 10, totalPages: 1 } } });
    if (path === 'users') userCalls.push(Object.fromEntries(url.searchParams));
    if (path === 'perm-logs') logCalls.push(Object.fromEntries(url.searchParams));
    return route.fallback();
  });

  const grid = page.locator('[id="account-grid-계정"]');
  const exportBtn = page.getByRole('button', { name: /엑셀 다운로드/ });
  const viewCount = async () => {
    await exportBtn.click();
    const t = await page.getByRole('menuitem', { name: /조회 목록 다운로드/ }).innerText();
    await page.keyboard.press('Escape');
    return Number((t.match(/\(([\d,]+)건\)/) || [])[1]?.replace(/,/g, ''));
  };

  try {
    await page.goto(`${WEB}/system/account`);
    await grid.locator('.tabulator-row').first().waitFor({ timeout: 60000 });

    // ACC-08 요약 4카드 — 미배정 계정 수 = API 의 미배정 부서 소속 수
    const text = await page.locator('body').innerText();
    assert(new RegExp(`미배정 계정\\n(그룹웨어 부서 매핑 →\\n)?${unassignedUsers.length}\\n명`).test(text), `미배정 계정 ${unassignedUsers.length}`);
    assert(text.includes('그룹웨어 부서 매핑 →'), '미배정 카드 링크(sys-gw-dept 권한)');
    assert(/승인 대기 \d+/.test(text), '가입 계정 부제에 승인 대기 수');

    // ACC-08 빠른 필터
    await grid.getByText('미배정', { exact: true }).first().click();
    await page.waitForTimeout(1200);
    assert.equal(userCalls.at(-1).deptId, String(unassigned.deptId), '미배정 빠른 필터는 서버에 deptId 로');
    assert.equal(await viewCount(), unassignedUsers.length, '미배정 행 수');
    assert(await grid.locator('.tabulator-row').first().getByText('자동 가입').count(), '가입 경로 열 「자동 가입」');
    await grid.getByText('초기 비밀번호', { exact: true }).first().click();
    await page.waitForTimeout(1200);
    assert.equal(await viewCount(), pwdInit, `초기 비밀번호 빠른 필터 ${pwdInit}`);
    // 서버 3단계 계약: 잠김·정지는 state 쉼표 다중, 자동 가입은 joinSrc
    await grid.getByText('잠김·정지', { exact: true }).first().click();
    await page.waitForTimeout(1200);
    assert.equal(userCalls.at(-1).state, 'LOCKED,SUSPENDED');
    await grid.getByText('자동 가입', { exact: true }).first().click();
    await page.waitForTimeout(1200);
    assert.equal(userCalls.at(-1).joinSrc, 'GROUPWARE');
    await grid.getByText('전체', { exact: true }).first().click();
    await page.waitForTimeout(1200);
    assert.equal(await viewCount(), allUsers.length, '전체로 되돌림');

    // ACC-08·06 미배정 계정 편집 — 안내, 부서를 바꾸면 권한 수 비교
    const target = unassignedUsers[0];
    await grid.locator('.tabulator-col[tabulator-field="empNo"] input').fill(target.empNo);
    await page.waitForTimeout(500);
    await grid.locator('.tabulator-row', { hasText: target.empNo }).getByRole('button', { name: '편집', exact: true }).click();
    await page.getByText('그룹웨어 자동 가입으로 들어와 미배정 상태입니다', { exact: false }).waitFor();
    assert(await page.getByRole('button', { name: '그룹웨어 부서 매핑으로 이동', exact: true }).count());
    await page.getByRole('combobox', { name: '소속 부서', exact: true }).selectOption(String(qa.deptId));
    const cmp = await page.locator('[id="dept-compare"]').innerText();
    assert(/이동 후 메뉴 \d+개\(현재 부서 대비 \+\d+\/-\d+\) · 데이터 항목 \d+개/.test(cmp), cmp);

    // ACC-09 「이 계정의 최근 이력」 → 대상 사번 조건
    await page.getByRole('button', { name: '이 계정의 최근 이력', exact: true }).click();
    await page.waitForTimeout(1200);
    assert.equal(logCalls.at(-1).targetUserId, target.empNo, '이력 대상 사번(targetUserId)');
    assert(logCalls.at(-1).from && logCalls.at(-1).to, '기간 조건');
    assert.equal(writes.length, 0, '편집 모달을 닫기만 했으므로 쓰기 없음');

    // ACC-09 기간 365일 초과 · 구분 조건
    const logCard = page.locator('[id="account-log-card"]');
    await logCard.getByRole('textbox', { name: '대상 사번', exact: true }).fill('');
    await logCard.locator('input').nth(0).fill('2024-01-01');
    await logCard.getByRole('button', { name: '조회', exact: true }).click();
    await logCard.getByText('기간은 최대 365일까지 조회할 수 있습니다.').waitFor();
    await logCard.locator('input').nth(0).fill('2026-09-01');
    await logCard.getByRole('combobox', { name: '구분', exact: true }).selectOption('DEPT');
    await logCard.getByRole('button', { name: '조회', exact: true }).click();
    await page.waitForTimeout(1200);
    assert.equal(logCalls.at(-1).actType, 'DEPT');
    assert.equal(logCalls.at(-1).from, '2026-09-01');
    assert.equal(logCalls.at(-1).targetUserId, undefined, '대상 사번을 비우면 조건 없음');
    const badge = await logCard.locator('.tabulator-row').first().locator('.tabulator-cell[tabulator-field="act"]').innerText().catch(() => '');
    assert(!badge || !/^[A-Z_]+$/.test(badge.trim()), `구분은 코드가 아닌 이름: ${badge}`);

    // ACC-07 승인 대기 — 이메일·신청 일시 열, 승인 부서 선택
    const pgrid = page.locator('[id="account-grid-가입 승인 대기"]');
    assert(await pgrid.getByText('p***@derkwoo.com').count(), '마스킹 이메일');
    assert(await pgrid.getByText('2026-10-01 09:12').count(), '신청 일시');
    await pgrid.getByRole('button', { name: '승인', exact: true }).click();
    const sel = page.getByRole('combobox', { name: '승인 부서', exact: true });
    assert.equal(await sel.inputValue(), String(qa.deptId), '기본값은 신청 부서');
    const other = deptList.find((d) => !d.systemRole && d.deptId !== qa.deptId);
    await sel.selectOption(String(other.deptId));
    await page.getByRole('button', { name: '승인', exact: true }).last().click();
    await page.waitForTimeout(600);
    assert.deepEqual({ path: writes.at(-1).path, body: writes.at(-1).body }, { path: 'users/P30001/approve', body: { approve: true, deptId: other.deptId } });

    assert.equal(errors.length, 0, errors.join('\n'));
    console.log(`PASS: account P1 (실 API) — 요약 미배정 ${unassignedUsers.length}명·빠른 필터·가입 경로·권한 수 비교·최근 이력·이력 기간/구분·승인 부서 선택`);
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
