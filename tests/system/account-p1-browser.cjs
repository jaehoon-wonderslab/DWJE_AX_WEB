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
const { openAccountTab, pickListFilter } = require('../lib/accountTabs');
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
    // 서버 조건 state=PENDING 으로 부르는 경우(이전 빠른 필터)도 그대로 받아 줍니다
    if (path === 'users' && url.searchParams.get('state') === 'PENDING') {
      userCalls.push(Object.fromEntries(url.searchParams));
      return route.fulfill({ json: { success: true, data: { items: pending }, meta: { total: 1, page: 1, size: 0, totalPages: 1 } } });
    }
    if (path === 'users') userCalls.push(Object.fromEntries(url.searchParams));
    // 빠른 필터를 뺀 뒤(2026-10-02) 승인 대기 계정은 전체 목록에 섞여 오고 「상태」 열 필터로 모아 봅니다
    if (path === 'users' && !url.searchParams.get('state') && !url.searchParams.get('keyword')) {
      // 이 가로채기가 8080→API_URL 돌림보다 먼저 걸리므로, 원래 요청을 받아 올 때도 같은 대상으로 보냅니다(8080 이 디버거에 멈춰 있으면 끝없이 기다림)
      const res = await route.fetch({ url: req.url().replace('http://localhost:8080', apiTarget) }); const body = await res.json();
      if (body?.data?.items) { body.data.items = [...body.data.items, ...pending]; if (body.meta?.total != null) body.meta.total += pending.length; }
      return route.fulfill({ response: res, json: body });
    }
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

    // ACC-08 요약 3카드 — 미배정 계정 수 = API 의 미배정 부서 소속 수
    const text = await page.locator('body').innerText();
    assert(new RegExp(`미배정 계정\\n(부서 매핑 →\\n)?${unassignedUsers.length}\\n명`).test(text), `미배정 계정 ${unassignedUsers.length}`);
    assert(!text.includes('부서 매핑 →'), '미배정 카드 링크 없음(2026-10-02 삭제)');
    // 요약 카드 부제와 계정 탭 머리의 「사용 n」 · 「정지 n」 배지는 뺐습니다(2026-10-02)
    assert(!/사용 \d+ · 잠김 \d+ · 정지 \d+/.test(text), '가입 계정 카드 부제 없음');
    assert(!/(사용|정지) \d+/.test(await page.locator('[id="account-panel-users"]').evaluate((el) => el.parentElement.innerText)), '계정 탭 머리 사용·정지 배지 없음');

    // 빠른 필터 줄(전체 · 미배정 · 잠김·정지 …)과 검색줄은 뺐습니다(2026-10-02) — 열 머리글 필터로 거릅니다
    assert.equal(await grid.getByRole('textbox', { name: '계정 검색', exact: true }).count(), 0, '계정 검색칸 없음');
    assert.equal(await grid.getByText('잠김·정지', { exact: true }).count(), 0, '빠른 필터 없음');
    // 소속 부서는 부서 목록에서 고릅니다(2026-10-06). 조회 목록 건수는 지금 쪽(최대 100행)입니다
    await pickListFilter(grid, 'dept', '미배정');
    await page.waitForTimeout(500);
    assert.equal(await viewCount(), Math.min(unassignedUsers.length, 100), '소속 부서 열 필터 「미배정」 행 수(지금 쪽)');
    assert(await grid.locator('.tabulator-row').first().getByText('자동 가입').count(), '가입 경로 열 「자동 가입」');
    await grid.locator('.tabulator-col[tabulator-field="dept"] input').fill('');
    await pickListFilter(grid, 'pwdChangeRequired', '변경 전');
    assert.equal(await viewCount(), Math.min(pwdInit, 100), `초기 비밀번호 열 필터 ${pwdInit}(지금 쪽)`);
    await pickListFilter(grid, 'pwdChangeRequired', '전체');
    await page.waitForTimeout(300);
    assert.equal(await viewCount(), Math.min(allUsers.length + pending.length, 100), '전체로 되돌림(지금 쪽 · 흉내 낸 승인 대기 포함)');

    // ACC-08·06 미배정 계정 편집 — 안내(부서 비교 줄은 2026-10-07 에 뺐습니다)
    const target = unassignedUsers[0];
    await grid.locator('.tabulator-col[tabulator-field="empNo"] input').fill(target.empNo);
    await page.waitForTimeout(500);
    await grid.locator('.tabulator-row', { hasText: target.empNo }).getByRole('button', { name: '편집', exact: true }).click();
    await page.getByText('그룹웨어 자동 가입으로 들어와 미배정 상태입니다', { exact: false }).waitFor();
    assert(await page.getByRole('button', { name: '부서 매핑으로 이동', exact: true }).count());
    await page.getByRole('combobox', { name: '소속 부서', exact: true }).selectOption(String(qa.deptId));
    // 부서를 바꿔도 「이동 후 메뉴 n개 …」 비교 줄은 없습니다(2026-10-07)
    await page.waitForTimeout(200);
    assert.equal(await page.locator('[id="dept-compare"]').count(), 0, 'no dept compare line');

    // 편집 폼의 [이 계정의 최근 이력] 단추는 뺐습니다(2026-10-02)
    assert.equal(await page.getByRole('button', { name: '이 계정의 최근 이력', exact: true }).count(), 0, '최근 이력 단추 없음');
    await page.getByRole('button', { name: '취소', exact: true }).last().click();
    assert.equal(writes.length, 0, '편집 모달을 닫기만 했으므로 쓰기 없음');

    // ACC-09 기간 365일 초과 — 이력 탭에서
    await openAccountTab(page, '변경 이력');
    const logCard = page.locator('[id="account-panel-logs"]');
    // 구분 · 대상 사번 칸과 검색줄은 뺐습니다(2026-10-02) — 대상 사번 조건은 표시와 [해제] 로만 보입니다
    assert.equal(await logCard.getByRole('textbox', { name: '대상 사번', exact: true }).count(), 0, '대상 사번 칸 없음');
    assert.equal(await logCard.getByRole('combobox', { name: '구분', exact: true }).count(), 0, '구분 칸 없음');
    assert.equal(await logCard.getByRole('textbox', { name: '변경 이력 검색', exact: true }).count(), 0, '이력 검색칸 없음');
    assert.equal(await logCard.getByText(/^대상 사번 /).count(), 0, '대상 사번 조건 표시 없음');
    await logCard.locator('input').nth(0).fill('2024-01-01');
    await logCard.getByRole('button', { name: '조회', exact: true }).click();
    await logCard.getByText('기간은 최대 365일까지 조회할 수 있습니다.').waitFor();
    await logCard.locator('input').nth(0).fill('2026-09-01');
    await logCard.getByRole('button', { name: '조회', exact: true }).click();
    await page.waitForTimeout(1200);
    assert.equal(logCalls.at(-1).actType, undefined, '구분 조건 없음');
    assert.equal(logCalls.at(-1).from, '2026-09-01');
    const badge = await logCard.locator('.tabulator-row').first().locator('.tabulator-cell[tabulator-field="act"]').innerText().catch(() => '');
    assert(!badge || !/^[A-Z_]+$/.test(badge.trim()), `구분은 코드가 아닌 이름: ${badge}`);

    // ACC-07 승인 대기 — 계정 탭의 「상태」 열 필터 「미사용」 → 승인 대기 행의 [승인] → 승인 부서 선택
    assert.equal(await page.locator('[id="account-grid-가입 승인 대기"]').count(), 0, '승인 대기 카드 없음');
    const pgrid = await openAccountTab(page, '계정');
    // 상태 목록은 「사용 / 미사용」 입니다(2026-10-06) — 승인 대기는 미사용에 들어갑니다
    await pickListFilter(pgrid, 'state', '미사용');
    const prow = pgrid.locator('.tabulator-row', { hasText: 'P30001' });
    await prow.waitFor();
    const states = await pgrid.locator('.tabulator-row .tabulator-cell[tabulator-field="state"]').allInnerTexts();
    assert(states.every((t) => !/^사용$/.test(t.trim())), `미사용 필터에 사용 계정 없음 ${states.slice(0, 5)}`);
    assert(await prow.getByRole('button', { name: '반려', exact: true }).count(), '행에 반려 단추');
    await prow.getByRole('button', { name: '승인', exact: true }).click();
    const sel = page.getByRole('combobox', { name: '승인 부서', exact: true });
    assert.equal(await sel.inputValue(), String(qa.deptId), '기본값은 신청 부서');
    const other = deptList.find((d) => !d.systemRole && d.deptId !== qa.deptId);
    await sel.selectOption(String(other.deptId));
    await page.getByRole('button', { name: '승인', exact: true }).last().click();
    await page.waitForTimeout(600);
    assert.deepEqual({ path: writes.at(-1).path, body: writes.at(-1).body }, { path: 'users/P30001/approve', body: { approve: true, deptId: other.deptId } });

    assert.equal(errors.length, 0, errors.join('\n'));
    console.log(`PASS: account P1 (실 API) — 요약 미배정 ${unassignedUsers.length}명·빠른 필터·가입 경로·권한 수 비교·최근 이력 단추 없음·이력 기간/구분·승인 부서 선택`);
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
