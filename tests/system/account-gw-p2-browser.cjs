/*
 * 계정 관리 P2(ACC-10·11·12·13) · 그룹웨어 부서 매핑 P2(GWD-09·10·11·12) — 실 API 읽기 + 쓰기·4단계 API 가로채기
 *
 * 조회는 실제 API(API_URL, 18081 권장)를 씁니다. DB 를 바꾸는 요청과 서버 4단계에서 생기는 응답
 * (delete-check · 이어받기 · 동기화 실패 상태 · 매핑 이력 행)만 page.route 로 흉내 냅니다.
 *
 *   API_URL=http://localhost:18081 WEB_URL=http://localhost:8099 node tests/system/account-gw-p2-browser.cjs
 */
const assert = require('node:assert/strict');
const { open, WEB } = require('../lib/browser');
const { openAccountTab } = require('../lib/accountTabs');
const { BASE } = require('../lib/api');

(async () => {
  const { browser, page } = await open();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const apiTarget = (process.env.API_URL || 'http://localhost:8080').replace(/\/$/, '');
  const redirect = (p) => (apiTarget.endsWith('localhost:8080') ? null : p.route('http://localhost:8080/**', (r) => r.continue({ url: r.request().url().replace('http://localhost:8080', apiTarget) })));
  await redirect(page);
  const token = await page.evaluate(() => JSON.parse(localStorage.getItem('dwje.ax.session')).accessToken);
  const api = async (path) => (await (await fetch(`${BASE}/api/v1${path}`, { headers: { Authorization: `Bearer ${token}` } })).json()).data;
  const depts = (await api('/system/depts?size=0')).items;
  const matrix = (await api('/system/menu-perms')).matrix || {};
  const normalDept = depts.find((d) => !d.systemRole && d.userCnt > 0);
  const users = (await api(`/system/users?size=0&deptId=${normalDept.deptId}`)).items;
  const editUser = users.find((u) => u.empNo !== '10000' && !(u.extraMenuIds || []).length) || users[0];

  const writes = [];
  const systemGets = [];
  let deleteCheck = { deletable: true, blocking: { servingProfiles: 0, docs: 0 }, cascade: { recipients: 2, menuGrants: 0, usage: 0 }, joinSrc: 'GROUPWARE' };
  let syncFail = false;
  const OLD = '품질보증(구)(M)';
  await page.route('**/api/v1/system/**', async (route) => {
    const req = route.request(); const url = new URL(req.url());
    const path = url.pathname.replace('/api/v1/system/', '');
    if (req.method() !== 'GET') {
      writes.push({ method: req.method(), path, body: req.postDataJSON?.() ?? null });
      return route.fulfill({ json: { success: true, data: {}, message: '처리했습니다.' } });
    }
    systemGets.push(path);
    if (/^users\/[^/]+\/delete-check$/.test(path)) return route.fulfill({ json: { success: true, data: deleteCheck } });
    if (path === 'perm-logs' && url.searchParams.get('actType') === 'GW_DEPT_MAP') {
      return route.fulfill({ json: { success: true, data: { items: [
        { ts: '2026-10-01 10:00:00', target: 'IPQC파트(M)', actType: 'GW_DEPT_MAP', actNm: '그룹웨어 부서 매핑', detail: '그룹웨어 부서 매핑 → 품질보증팀', by: '최전산' },
        { ts: '2026-09-30 15:00:00', target: OLD, actType: 'GW_DEPT_MAP', actNm: '그룹웨어 부서 매핑', detail: '그룹웨어 부서 매핑 → 품질보증팀', by: '최전산' },
      ] }, meta: { total: 2 } } });
    }
    if (path === 'gw-dept-maps' || path === 'gw-dept-maps/summary') {
      const res = await route.fetch({ url: req.url().replace('http://localhost:8080', apiTarget) });
      const body = await res.json();
      if (path === 'gw-dept-maps') body.data.items.push({ gwDeptNm: OLD, activeCnt: 0, joinedCnt: 0, unassignedCnt: 0, deptId: normalDept.deptId, deptNm: normalDept.deptNm, joinYn: 'Y', state: 'MAPPED', remark: '옛 이름', hasRow: true, inSource: false, updDate: '2026-09-30 15:00', updUserNm: '최전산' });
      if (path === 'gw-dept-maps/summary' && syncFail) {
        body.data.lastSync = { startedAt: '2026-10-01 02:00', stateCd: 'FAIL', joinSummary: '원천 접속 실패' };
        body.data.lastJoin = { startedAt: '2026-09-30 14:38', summary: 'AX 가입 1(미배정 1)' };
      }
      return route.fulfill({ json: body });
    }
    return route.fallback();
  });

  const grid = (label) => page.locator(`[id="account-grid-${label}"]`);
  const modalBtn = (name) => page.getByRole('button', { name, exact: true }).last();

  try {
    /* ═══ 계정 관리 ═══ */
    await page.goto(`${WEB}/system/account`);
    await grid('계정').locator('.tabulator-row').first().waitFor({ timeout: 60000 });
    assert(await grid('계정').locator('.tabulator-col[tabulator-field="extraMenuIds"]').count(), '「추가 메뉴」 열');

    // ACC-12 계정 [정지] 1회 = 요청 4건 (PATCH + 요약 + 계정 + 이력), 부서 목록은 다시 부르지 않음
    await grid('계정').locator('.tabulator-col[tabulator-field="empNo"] input').fill(editUser.empNo);
    await page.waitForTimeout(500);
    const row = grid('계정').locator('.tabulator-row', { hasText: editUser.empNo });
    const getsBefore = systemGets.length; const writesBefore = writes.length;
    await row.getByRole('button', { name: editUser.state === 'ACTIVE' ? '정지' : '사용', exact: true }).click();
    if (editUser.state === 'ACTIVE') await modalBtn('정지').click();
    await page.waitForTimeout(2000);
    const after = systemGets.slice(getsBefore);
    assert.equal(writes.length - writesBefore, 1);
    assert.deepEqual([...after].sort(), ['accounts/summary', 'perm-logs', 'users'], `정지 뒤 재조회: ${after}`);

    // ACC-10 추가 메뉴 부여 사유
    await row.getByRole('button', { name: '편집', exact: true }).click();
    const pick = page.locator('[id="account-menu-picker"] input[type="checkbox"]:not([disabled]):not(:checked)').first();
    await pick.waitFor();
    const pickLabel = await pick.getAttribute('aria-label');
    await pick.check();
    const reasonBox = page.getByRole('textbox', { name: pickLabel.replace(' 추가 허용', ' 부여 사유'), exact: true });
    await reasonBox.fill('겸직 10월까지');
    await modalBtn('수정').click();
    await page.waitForTimeout(600);
    const put = writes.at(-1);
    assert.equal(put.method, 'PUT');
    const pickedId = Object.keys(put.body.extraMenuReasons || {})[0];
    assert(pickedId && put.body.extraMenuIds.includes(pickedId), `사유 본문: ${JSON.stringify(put.body)}`);
    assert.equal(put.body.extraMenuReasons[pickedId], '겸직 10월까지');

    // ACC-11 삭제 사전 확인 — 함께 지워지는 것, 자동 가입 안내, 막는 참조면 삭제 비활성
    await row.getByRole('button', { name: '삭제', exact: true }).click();
    await page.getByText('알림 수신자 2건이 함께 지워집니다.').waitFor();
    assert(await page.getByText('퇴사·휴직이면 삭제 대신 정지를 권합니다.').count());
    assert(await page.getByText('다음 동기화에서 다시 가입되지 않습니다', { exact: false }).count());
    await modalBtn('삭제').click();
    await page.waitForTimeout(500);
    assert.equal(writes.at(-1).method, 'DELETE');
    deleteCheck = { deletable: false, blocking: { servingProfiles: 1, docs: 0 }, cascade: {}, joinSrc: 'ADMIN' };
    await row.getByRole('button', { name: '삭제', exact: true }).click();
    await page.getByText('서빙 프로필 활성화 1건', { exact: false }).waitFor();
    assert(await modalBtn('삭제').isDisabled(), '막는 참조가 있으면 삭제 비활성');
    await page.getByRole('button', { name: '취소', exact: true }).last().click();

    // 부서 표 [메뉴 권한] · [데이터 권한] 단추는 뺐습니다(2026-10-06, 예전 ACC-10).
    // 부서 표는 2026-10-07 부서 매핑 화면의 「부서」 탭으로 옮겼습니다
    await page.goto(`${WEB}/system/gw-dept-map`);
    await page.locator('#gw-dept-tab-depts').click();
    const deptRow = grid('부서').locator('.tabulator-row', { hasText: normalDept.deptNm });
    await deptRow.first().waitFor();
    for (const name of ['메뉴 권한', '데이터 권한']) assert.equal(await deptRow.getByRole('button', { name, exact: true }).count(), 0, `no ${name} button`);

    // ACC-13 회원가입 — 그룹웨어 자동 가입 사번이면 로그인 안내
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const sp = await ctx.newPage();
    await redirect(sp);
    await sp.route('**/api/v1/auth/signup/check-emp-no**', (r) => r.fulfill({ json: { success: true, data: { empNo: '20260106', available: false, reason: 'GROUPWARE_JOINED', message: '그룹웨어 인사정보로 이미 계정이 만들어져 있습니다. 로그인 화면에서 사번으로 로그인한 뒤 비밀번호를 바꾸십시오.' } } }));
    await sp.goto(`${WEB}/signup`);
    await sp.getByPlaceholder('영문·숫자 4~30자').fill('20260106');
    await sp.getByRole('button', { name: '중복 확인', exact: true }).click();
    await sp.getByRole('button', { name: '로그인 화면으로', exact: true }).waitFor();
    await sp.getByRole('button', { name: '로그인 화면으로', exact: true }).click();
    await sp.waitForURL(/\/login/);
    await ctx.close();

    /* ═══ 그룹웨어 부서 매핑 ═══ */
    await page.goto(`${WEB}/system/gw-dept-map`);
    await page.locator('.tabulator-row').first().waitFor({ timeout: 60000 });
    const card = page.locator('[id="gw-sync-card"]');
    // 「완료」 배지는 두지 않습니다(2026-10-02) — 실패·중단·진행 중일 때만 배지
    await card.getByText(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/).first().waitFor();
    assert.equal(await card.getByText('완료', { exact: true }).count(), 0, '완료 배지 없음');
    // 2026-10-02 — 동기화 카드의 가입 요약·[연동 이력 보기], 「최근 매핑 변경」 접이 카드, 상단 검색·일괄 지정 줄은 뺐습니다
    assert.equal(await card.getByRole('button', { name: '연동 이력 보기', exact: true }).count(), 0, '연동 이력 링크 없음');
    assert.equal(await page.getByRole('button', { name: /최근 매핑 변경/ }).count(), 0, '최근 매핑 변경 카드 없음');
    assert.equal(await page.getByPlaceholder('그룹웨어 부서 · AX 부서 · 메모').count(), 0, '상단 검색칸 없음');

    // 지정 모달의 「최근 이력」 칸은 뺐습니다(2026-10-02)
    await page.locator('.tabulator-row', { hasText: 'IPQC파트(M)' }).first().getByRole('button', { name: '지정', exact: true }).click();
    await page.getByRole('combobox', { name: 'AX 부서', exact: true }).waitFor();
    assert.equal(await page.getByText('2026-10-01 10:00:00 · 그룹웨어 부서 매핑 → 품질보증팀 · 최전산').count(), 0, '지정 모달 최근 이력 없음');
    await page.getByRole('button', { name: '취소', exact: true }).last().click();

    // GWD-10 수정 열 이름 · 이어받기 단추 없음
    const oldRow = page.locator('.tabulator-row', { hasText: OLD });
    // 찾기는 열 머리글 필터로 합니다(상단 검색칸 제거)
    const gwFilter = page.locator('.tabulator-col[tabulator-field="gwDeptNm"] .tabulator-header-filter input').first();
    await gwFilter.fill('품질보증(구)');
    await page.waitForTimeout(600);
    assert(await oldRow.getByText('최전산').count(), '수정자 이름');
    // [이어받기](GWD-11)는 뺐습니다(2026-10-07)
    assert.equal(await oldRow.getByRole('button', { name: '이어받기', exact: true }).count(), 0, '이어받기 단추 없음');
    await gwFilter.fill('');

    // GWD-12 미배정 표 — 상태 배지·초기 비밀번호 열·상태 목록 필터. 「매핑대로 옮길 부서」 열은 뺐습니다(2026-10-02)
    await page.locator('#gw-dept-tab-users').click();
    await page.locator('.tabulator-row').first().waitFor();
    assert(await page.locator('.tabulator-col[tabulator-field="pwdChangeRequired"]').count(), '초기 비밀번호 열');
    assert.equal(await page.locator('.tabulator-col[tabulator-field="suggestDeptNm"]').count(), 0, '매핑대로 옮길 부서 열 없음');
    assert(await page.locator('.tabulator-row').first().locator('.tabulator-cell[tabulator-field="stateNm"] .tag').count(), '상태 배지');
    // 그룹웨어 부서 · 직위 · 상태 머리글은 목록 필터입니다
    for (const field of ['gwDeptNm', 'posNm', 'stateNm']) {
      assert(await page.locator(`.tabulator-col[tabulator-field="${field}"].ax-list-filter`).count(), `${field} 목록 필터`);
    }
    const total = await page.locator('.tabulator-row').count();
    await page.locator('.tabulator-col[tabulator-field="stateNm"] .tabulator-header-filter input').click();
    const firstState = page.locator('.tabulator-edit-list-item').nth(1);
    const stateText = (await firstState.innerText()).trim();
    await firstState.click();
    await page.waitForTimeout(600);
    const shownStates = await page.locator('.tabulator-row .tabulator-cell[tabulator-field="stateNm"]').allInnerTexts();
    assert(shownStates.length && shownStates.length <= total && shownStates.every((t) => t.trim() === stateText), `상태 목록 필터 ${stateText}: ${[...new Set(shownStates)]}`);
    await page.locator('.tabulator-col[tabulator-field="stateNm"] .tabulator-header-filter input').click();
    await page.locator('.tabulator-edit-list-item', { hasText: '전체' }).first().click();
    await page.waitForTimeout(600);
    assert.equal(await page.locator('.tabulator-row').count(), total, '상태 필터 풀기');

    // GWD-09 실패 상태 — 실패 배지(부제의 가입 요약·직전 성공 요약은 2026-10-02 에 뺐습니다)
    syncFail = true;
    await page.goto(`${WEB}/system/gw-dept-map`);
    await card.getByText('실패', { exact: true }).waitFor({ timeout: 60000 });
    assert.equal(await card.getByText('직전 성공', { exact: false }).count(), 0, '부제 없음');

    assert.equal(errors.length, 0, errors.join('\n'));
    console.log('PASS: P2 — 정지 1회 요청 4건·부여 사유·삭제 사전 확인·부서 넘김·회원가입 안내 / 동기화 카드·지정 모달 이력·수정자 이름·이어받기 없음·미배정 표 보강·실패 상태');
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
