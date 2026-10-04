/*
 * 알림 수신자 관리(sys-recip) 화면 시험 — 기획 06 6.2 (2026-10-01)
 *
 * page.route 로 API 응답을 흉내 냅니다(실제 DB 를 바꾸지 않습니다). 로그인만 실제 API 로 합니다.
 * 목 모드 개발 서버는 API 를 네트워크로 부르지 않아 가로챌 수 없으므로, 로컬 대상 개발 서버(npm run web)에서 돌립니다.
 *   WEB_URL=http://localhost:8081 [API_URL=http://localhost:18081] node tests/system/recipient-browser.cjs
 *
 * 확인하는 것
 *  · RCP-02 그룹 편집은 상세로 채움 — 이름만 바꾸면 name·updatedAt 만(채널·부서·멤버 보존),
 *           멤버 전원 제외는 확인 후 memberEmpNos:[] (preserveEmpty), 대응 부서 해제는 deptId:null
 *  · RCP-03 그룹 테스트 결과 모달
 *  · RCP-04 수신자 표 「계정」 열(정지)
 *  · RCP-06 수신자 등록 — 후보 계정 검색 → 메일 자동 채움 → POST 본문
 *  · RCP-15 읽기 전용 — 등록·편집·테스트 발송 비활성 + 툴팁, 엑셀은 됨
 *  · RCP-01·16 엑셀 — 탭별 VIEW/ALL, worker 없으면 연락처 칸 '비공개'·blindCnt, 수신자 전체는 size=0
 *  · 390px 에서 두 표 모두 「관리」 열까지 가로 스크롤
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { open, WEB } = require('../lib/browser');

const WRITE_TIP = '미배정 계정은 이 동작을 할 수 없습니다. 전산팀에 부서 배정을 요청하세요.';
// ALM_CHANNEL attr1 = 엔진 어댑터 코드(V76). 채널은 메일 · 시스템 팝업 2개만 — SMS 는 사용 중지(useYn N)
const CODES = [
  ['ALM_CHANNEL', 'MAIL', '메일', 'MAIL'], ['ALM_CHANNEL', 'POPUP', '시스템 팝업', 'POPUP'], ['ALM_CHANNEL', 'SMS', 'SMS', null, 'N'],
  ['ALM_WINDOW', 'ALWAYS', '24시간 상시'], ['ALM_WINDOW', 'D0820', '08:00 ~ 20:00'],
].map(([groupCd, cd, nm, attr1, useYn], i) => ({ groupCd, cd, nm, attr1: attr1 ?? null, sort: i, useYn: useYn || 'Y' }));

function me({ write = true, worker = true } = {}) {
  return {
    user: { empNo: '10004', name: '최전산', dept: '전산팀', deptId: 5, pos: 'SENIOR', superAdmin: false },
    // 2026-10-03 — 접근이 있는데 쓰기가 막히는 경우는 미배정뿐입니다(write=false → 미배정)
    dept: { deptId: 5, deptNm: '전산팀', superAdmin: false, unassigned: !write },
    menuPerms: ['ai-chat', 'alert-cond', 'sys-recip'],
    writePerms: write ? ['sys-recip'] : [],
    dataPerms: worker ? ['qty', 'worker'] : ['qty'],
    dataFields: [],
    pwdChangeRequired: false,
  };
}

const recip = (n, extra = {}) => ({
  empNo: `1000${n}`, recipientId: `1000${n}`, name: `수신자${n}`, dept: '제조팀', pos: 'STAFF', posNm: '사원', mail: `1000${n}@dwje.co.kr`, hp: `010-1000-000${n}`,
  messenger: `m${n}`, userState: 'ACTIVE', userStateNm: '사용', groups: ['엔진 가동'], ...extra,
});

async function setup(opts = {}) {
  const { page, browser } = await open('it');
  const blind = opts.worker === false;
  const state = {
    groups: [
      { groupId: 11, name: '엔진 가동', validWindow: 'ALWAYS', deptId: 4, dept: '제조팀', useFlg: 'Y', channels: ['MAIL', 'POPUP'], members: [{ empNo: '10001', name: blind ? null : '수신자1', dept: '제조팀', userState: 'ACTIVE' }, { empNo: '10002', name: blind ? null : '수신자2', dept: '제조팀', userState: 'SUSPENDED' }, { empNo: '10003', name: blind ? null : '수신자3', dept: '제조팀', userState: 'ACTIVE' }], memberEmpNos: ['10001', '10002', '10003'], memberCnt: 3, receivingCnt: 1, condCnt: 2, conds: [{ condId: 5, name: '조건 A', on: true }, { condId: 6, name: '조건 B', on: true }] },
      { groupId: 10, name: '생산 이슈', validWindow: 'D0820', deptId: null, dept: '', useFlg: 'Y', channels: ['MAIL'], members: [], memberEmpNos: [], memberCnt: 0, receivingCnt: 0, condCnt: 0, conds: [] },
    ],
    recipients: [recip(1), recip(2, { userState: 'SUSPENDED', userStateNm: '정지', groups: ['생산 이슈', '엔진 가동'], posNm: '대리' }), recip(3)],
    puts: [], posts: [], tests: [], logs: [], sizes: [], includeInactive: [], cand: [], errors: [],
    rputs: [], deletes: [], groupState: [], listQueries: [],
  };
  page.on('pageerror', (e) => state.errors.push(e.message));
  // 앱 번들은 8080 을 부릅니다. API_URL 이 다른 포트면(예: 18081) 흉내 내지 않은 호출을 그쪽으로 돌립니다
  const apiBase = process.env.API_URL || 'http://localhost:8080';
  if (!apiBase.includes('localhost:8080')) {
    await page.route('http://localhost:8080/**', (r) => r.continue({ url: r.request().url().replace('http://localhost:8080', apiBase) }));
  }
  const ok = (route, data, extra = {}) => route.fulfill({ json: { success: true, code: 'SUCCESS', message: extra.message || '정상 처리되었습니다.', data, ...extra } });
  const mask = (r) => (blind ? { ...r, name: null, mail: null, hp: null, messenger: null } : r);
  await page.route('**/api/v1/auth/me', (route) => ok(route, me(opts)));
  await page.route('**/api/v1/common/codes**', (route) => ok(route, { codes: CODES }));
  await page.route('**/api/v1/download-logs', (route) => { state.logs.push(route.request().postDataJSON()); return ok(route, {}); });
  await page.route('**/api/v1/alert-recipient-groups**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname.replace('/api/v1/alert-recipient-groups', '');
    if (req.method() === 'GET' && path === '') {
      const inactive = url.searchParams.get('includeInactive') === 'true';
      state.includeInactive.push(inactive);
      const rows = inactive ? [...state.groups, { groupId: 99, name: '중지된 그룹', validWindow: 'ALWAYS', useFlg: 'N', channels: ['MAIL'], members: [], memberEmpNos: [] }] : state.groups;
      return ok(route, { items: rows }, { masked: blind ? ['worker'] : [] });
    }
    const id = Number(path.split('/')[1]);
    const g = state.groups.find((x) => x.groupId === id);
    if (req.method() === 'GET') {
      return ok(route, {
        ...g,
        members: g.memberEmpNos.map((e) => ({ empNo: e, name: blind ? null : `수신자${e.slice(-1)}`, dept: '제조팀', userState: 'ACTIVE' })),
        conds: [{ condId: 5, name: '조건 A', on: true }, { condId: 6, name: '조건 B', on: true }],
        deptOptions: [{ value: 3, label: '생산관리팀' }, { value: 4, label: '제조팀' }], updatedAt: '2026-09-16 21:17:35',
      });
    }
    if (req.method() === 'PUT') { state.puts.push({ id, body: req.postDataJSON() }); return ok(route, { success: true, updatedAt: '2026-10-01 10:30:00' }, { message: '수신 그룹을 수정했습니다.' }); }
    if (req.method() === 'PATCH' && path.endsWith('/state')) {
      const body = req.postDataJSON(); state.groupState.push({ id, body });
      if (id === 11 && body.on === false) return route.fulfill({ status: 409, json: { success: false, code: 'E-RULE-001', message: '발송 조건 2건이 이 그룹을 씁니다.' } });
      return ok(route, { useFlg: body.on ? 'Y' : 'N', changed: true }, { message: '바꿨습니다.' });
    }
    if (req.method() === 'POST' && path.endsWith('/test-send')) {
      state.tests.push(id);
      return ok(route, { alertId: 1, queuedCnt: 1, sentCnt: 1, recipients: [{ empNo: '10001', name: '수신자1', dept: '제조팀', channel: 'MAIL' }], skipped: [{ empNo: '10002', name: '수신자2', reason: 'ACCOUNT_INACTIVE', reasonNm: '계정 정지' }] }, { message: '테스트 알림 1건을 발송 대기열에 넣었습니다.' });
    }
    return route.continue();
  });
  await page.route('**/api/v1/alert-recipients**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname.replace('/api/v1/alert-recipients', '');
    if (req.method() === 'GET' && path === '/summary') return ok(route, { groupCnt: 2, recipientCnt: 3, receivableCnt: 2, inactiveAccountCnt: 1 });
    if (req.method() === 'GET' && path === '/candidates') {
      state.cand.push(url.searchParams.get('keyword'));
      return ok(route, { items: [{ empNo: '20260101', name: '김신규', dept: '품질보증팀', posNm: '사원', email: 'new@dwje.co.kr' }] }, { meta: { page: 1, size: 20, total: 1 } });
    }
    if (req.method() === 'GET' && path.endsWith('/impact')) {
      return ok(route, { empNo: '10001', groups: [{ groupId: 11, name: '엔진 가동', receivableCntAfter: 0 }], zeroGroups: [{ groupId: 11, name: '엔진 가동' }], affectedConds: [{ condId: 5, name: '조건 A' }, { condId: 6, name: '조건 B' }], affectedEscStages: [] });
    }
    if (req.method() === 'PUT') { state.rputs.push({ id: path.split('/')[1], body: req.postDataJSON() }); return ok(route, {}, { message: '수신자 정보를 수정했습니다.' }); }
    if (req.method() === 'DELETE') {
      const force = url.searchParams.get('force') === 'true';
      state.deletes.push({ id: path.split('/')[1], force });
      if (!force) return route.fulfill({ status: 409, json: { success: false, code: 'E-RULE-001', message: '이 수신자를 지우면 받는 사람이 없어지는 수신 그룹이 있습니다. 확인 후 다시 요청해 주십시오.', data: { zeroGroups: [{ groupId: 11, name: '엔진 가동' }], affectedConds: [{ condId: 5, name: '조건 A' }] } } });
      return ok(route, {}, { message: '수신자를 삭제했습니다.' });
    }
    if (req.method() === 'GET' && path === '') {
      const size = Number(url.searchParams.get('size') ?? 50);
      state.sizes.push(size);
      state.listQueries.push(Object.fromEntries(url.searchParams));
      const rows = size === 0 ? [...state.recipients, recip(9, { name: '다른 쪽 수신자' })] : state.recipients;
      return ok(route, { items: rows.map(mask) }, { meta: { page: 1, size, total: rows.length, totalPages: 1 }, masked: blind ? ['worker'] : [] });
    }
    if (req.method() === 'POST' && path === '') { state.posts.push(req.postDataJSON()); return ok(route, { recipientId: '20260101' }, { message: '수신자를 등록했습니다.' }); }
    return route.continue();
  });
  await page.goto(`${WEB}/system/recipient`);
  await page.getByText('엔진 가동', { exact: true }).first().waitFor({ timeout: 90000 });
  await page.waitForTimeout(500);
  return { page, browser, state };
}

const grid = (page) => page.locator('.tabulator').first();
const rowBtn = (page, rowIdx, act) => grid(page).locator('.tabulator-row').nth(rowIdx).locator(`button[data-act="${act}"]`);

async function scrollToManage(page) {
  return page.evaluate(async () => {
    const holder = document.querySelector('.tabulator-tableholder');
    holder.scrollLeft = holder.scrollWidth;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const hb = holder.getBoundingClientRect();
    const cols = [...document.querySelectorAll('.tabulator-headers .tabulator-col')];
    const header = cols.at(-1).getBoundingClientRect();
    const cell = document.querySelector('.tabulator-row .tabulator-cell:last-of-type').getBoundingClientRect();
    return { title: cols.at(-1).textContent.trim(), scrolled: holder.scrollLeft > 0, inView: header.right <= hb.right + 2 && header.left >= hb.left - 2, aligned: Math.abs(header.x - cell.x) < 2 };
  });
}

(async () => {
  // ── 1. 전산팀 — 쓰기 O · worker O ─────────────────
  const { page, browser, state } = await setup();
  try {
    // RCP-02 — 이름만 바꿔 저장: 채널·부서·멤버를 보내지 않습니다
    await rowBtn(page, 0, 'edit').click();
    const nameInput = page.getByPlaceholder('예) 엔진 가동', { exact: true });
    await nameInput.waitFor();
    // 발송 채널(2026-10-04) — 메일 · 시스템 팝업 2개만 체크로 고르고, 사용 중지된 SMS 는 선택지에 없음
    assert(await page.getByText('발송 채널', { exact: true }).count(), 'channel field');
    assert(await page.getByText('시스템 팝업', { exact: true }).count(), 'popup option');
    assert(!(await page.getByText('SMS', { exact: true }).count()), 'SMS not selectable');
    assert(await page.getByText('조건 A · 조건 B', { exact: false }).count(), 'conds using this group');
    await nameInput.fill('엔진 가동 2');
    await page.getByRole('button', { name: '수정', exact: true }).click();
    await page.waitForTimeout(600);
    assert.deepEqual(state.puts.at(-1), { id: 11, body: { name: '엔진 가동 2', updatedAt: '2026-09-16 21:17:35' } }, 'name-only save keeps dept/channels/members');

    // 채널 바꾸기 — 시스템 팝업을 빼면 channels 만 보냄
    await rowBtn(page, 0, 'edit').click();
    await page.getByPlaceholder('예) 엔진 가동', { exact: true }).waitFor();
    await page.getByText('시스템 팝업', { exact: true }).last().click();
    await page.getByRole('button', { name: '수정', exact: true }).click();
    await page.waitForTimeout(600);
    assert.deepEqual(state.puts.at(-1), { id: 11, body: { channels: ['MAIL'], updatedAt: '2026-09-16 21:17:35' } }, 'channel change sends channels only');

    // 멤버 전원 제외 + 대응 부서 해제 → 확인 → memberEmpNos:[] · deptId:null
    await rowBtn(page, 0, 'edit').click();
    await page.getByPlaceholder('예) 엔진 가동', { exact: true }).waitFor();
    // RCP-05 — 검색형 멤버 선택기: 전 수신자(size=0)에서 고르고 칩으로 뺍니다
    assert(state.sizes.includes(0), 'member picker loads all recipients');
    assert(await page.getByLabel('10009 추가', { exact: true }).count(), 'recipients on other pages are pickable');
    await page.getByLabel('10001 빼기', { exact: true }).click();
    await page.getByLabel('10002 빼기', { exact: true }).click();
    await page.getByLabel('10003 빼기', { exact: true }).click();
    await page.getByRole('combobox', { name: '대응 부서', exact: true }).selectOption({ label: '없음' });
    await page.getByRole('button', { name: '수정', exact: true }).click();
    await page.getByText('아무에게도 발송되지 않습니다', { exact: false }).waitFor();
    assert(await page.getByText('조건 2건', { exact: false }).count(), 'confirm names affected condition count');
    await page.getByRole('button', { name: '저장', exact: true }).click();
    await page.waitForTimeout(700);
    assert.deepEqual(state.puts.at(-1).body, { deptId: null, memberEmpNos: [], updatedAt: '2026-09-16 21:17:35' }, 'empty members and cleared dept are sent');

    // RCP-03 — 테스트 결과 모달
    await rowBtn(page, 0, 'test').click();
    await page.getByText('발송 대기 1건', { exact: false }).waitFor();
    assert(await page.getByText('계정 정지', { exact: true }).count(), 'skip reason');
    await page.getByRole('button', { name: '닫기', exact: true }).last().click();

    // 2026-10-03 — 머리말 설명 · [발송 조건 관리] · 안내 · 부재/야간 카드 · 야간 열을 뺐고 두 표는 카드 탭으로 나눕니다
    assert(!(await page.getByText('발송 조건은 여기서 만든', { exact: false }).count()), 'no page desc');
    assert(!(await page.getByRole('button', { name: '발송 조건 관리', exact: true }).count()), 'no cond button');
    assert(!(await page.getByText('그룹 이름을 바꿔도 연결은 유지', { exact: false }).count()), 'no hint');
    assert(!(await page.getByText('야간', { exact: false }).count()), 'no night text');
    assert(!(await page.getByText('부재', { exact: false }).count()), 'no absent text');
    assert.equal(await page.getByRole('tab').count(), 2, 'card tabs');
    assert.equal(await page.getByRole('tab', { selected: true }).getAttribute('id'), 'recip-tab-수신 그룹');
    assert(await page.getByText('3', { exact: true }).count(), 'recipient count card (recipientCnt number)');
    // RCP-09 — 연계 열(승격 안내 · 승격 대상 열은 2026-10-03 에 뺌), RCP-08 — 사용 중지 409·사용 중지 그룹 보기
    assert(!(await page.getByText('승격', { exact: false }).count()), 'no escalation text');
    assert(!(await grid(page).locator('.tabulator-col[tabulator-field="escLabel"]').count()), 'no escalation column');
    assert(await grid(page).locator('.tabulator-col[tabulator-field="receivableLabel"]').count(), 'receivable column');
    assert(await grid(page).locator('.tag-red', { hasText: '0/0' }).count(), 'zero receivable in red');
    await rowBtn(page, 0, 'use').click();
    await page.getByText('알림이 나가지 않습니다', { exact: false }).waitFor();
    await page.getByRole('button', { name: '사용 중지', exact: true }).last().click();
    await page.waitForTimeout(600);
    assert.deepEqual(state.groupState.at(-1), { id: 11, body: { on: false } });
    assert(await page.getByText('발송 조건 2건', { exact: false }).count(), '409 reason toasted');
    // 「사용 중지 그룹 보기」 는 뺐습니다(2026-10-03) — 사용 중지 그룹도 늘 보입니다
    assert(!(await page.getByText('사용 중지 그룹 보기', { exact: true }).count()), 'no inactive toggle');
    assert(await page.getByText('중지된 그룹', { exact: true }).count(), 'inactive group listed');
    assert(state.includeInactive.length && state.includeInactive.every(Boolean), 'always includeInactive');

    // 수신자 목록 열 — 「이름(사번)」 앞 2명 + 외 N명, 머리글 검색은 전체로, 누르면 모달 (멤버 열은 뺌)
    assert(!(await grid(page).locator('.tabulator-col[tabulator-field="memberCnt"]').count()), 'no member count column');
    assert.equal((await grid(page).locator('.tabulator-col[tabulator-field="memberNames"] .tabulator-col-title').textContent()).trim(), '수신자 목록');
    await grid(page).getByText('수신자1(10001) · 수신자2(10002) 외 1명', { exact: true }).waitFor();
    await grid(page).locator('.tabulator-col[tabulator-field="memberNames"] input').fill('10003');
    await page.waitForTimeout(500);
    assert.equal(await grid(page).locator('.tabulator-row').count(), 1, 'header filter searches hidden members');
    await grid(page).locator('.tabulator-col[tabulator-field="memberNames"] input').fill('');
    await page.waitForTimeout(500);
    await grid(page).locator('button[data-act="members"]').first().click();
    await page.getByText('수신자3(10003)', { exact: true }).waitFor();
    await page.getByRole('button', { name: '닫기', exact: true }).last().click();
    await page.waitForTimeout(300);

    // RCP-16 — 그룹 탭 엑셀
    const excel = page.getByRole('button', { name: '엑셀 다운로드 ▾', exact: true });
    await excel.click();
    await page.getByRole('menuitem', { name: /조회 목록 다운로드/ }).waitFor();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    assert.equal(await page.getByRole('menuitem', { name: /조회 목록 다운로드/ }).count(), 0, 'Esc closes');
    await excel.click();
    await page.getByRole('menuitem', { name: /조회 목록 다운로드/ }).click();
    await page.waitForTimeout(600);
    await excel.click();
    await page.getByRole('menuitem', { name: /전체 다운로드/ }).click();
    await page.waitForTimeout(800);
    let [view, all] = state.logs.slice(-2);
    assert.equal(view.scopeCd, 'VIEW'); assert.equal(view.rowCnt, 3, 'view = all groups incl. inactive'); assert.equal(view.blindCnt, 0); assert.equal(view.menuId ?? view.reportId, 'sys-recip');
    assert.equal(all.scopeCd, 'ALL'); assert.equal(all.rowCnt, 3, 'all groups include inactive'); assert(state.includeInactive.includes(true));

    // 390px — 그룹 표 관리 열
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(900);
    let sc = await scrollToManage(page);
    assert(sc.title === '관리' && sc.scrolled && sc.inView && sc.aligned, `group grid 관리 reachable ${JSON.stringify(sc)}`);
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.waitForTimeout(500);

    // 수신자 탭 — RCP-04 계정 열
    await page.getByRole('tab', { name: /수신자/ }).click();
    await page.getByText('수신자1(10001)', { exact: true }).first().waitFor();
    // 계정 · 휴대전화 · 메신저 열은 뺐고(2026-10-03) 이름은 「이름(사번)」
    for (const f of ['accountLabel', 'hp', 'messenger']) assert(!(await grid(page).locator(`.tabulator-col[tabulator-field="${f}"]`).count()), `no ${f} column`);
    assert(await grid(page).getByText('수신자1(10001)', { exact: true }).count(), 'name(empNo)');
    assert(!(await grid(page).locator('.tabulator-col[tabulator-field="remark"]').count()), 'no remark column (2026-10-04)');

    // 조회 줄은 뺐습니다(2026-10-03) — 전원(size=0)을 받아 머리글 필터로 거릅니다. 수신 그룹 · 직급은 선택 목록
    for (const name of ['그룹', '계정']) assert(!(await page.getByRole('combobox', { name, exact: true }).count()), `no ${name} filter`);
    assert(!(await page.getByLabel('수신자 검색', { exact: true }).count()), 'no search box');
    assert(!(await page.getByRole('button', { name: '조회', exact: true }).count()), 'no search button');
    assert.equal(state.listQueries.at(-1).size, '0', 'list loads everyone');
    const pickList = async (field, label) => {
      await grid(page).locator(`.tabulator-col[tabulator-field="${field}"] .tabulator-header-filter input`).click();
      await page.locator('.tabulator-edit-list .tabulator-edit-list-item', { hasText: label }).first().click();
      await page.waitForTimeout(400);
    };
    await pickList('groupNames', '생산 이슈');
    assert.equal(await grid(page).locator('.tabulator-row').count(), 1, 'group list filter (multi-group member kept)');
    await pickList('groupNames', '전체');
    await pickList('posLabel', '대리');
    assert.equal(await grid(page).locator('.tabulator-row').count(), 1, 'position list filter');
    await pickList('posLabel', '전체');
    assert(await grid(page).locator('.tabulator-row').count() > 1, 'filters cleared');

    // 부재 · 야간은 2026-10-03 에 없앴습니다 — 상태 · 야간 열, 부재로 단추, 상태 조회 조건이 없습니다
    for (const f of ['night', 'stateLabel']) assert(!(await grid(page).locator(`.tabulator-col[tabulator-field="${f}"]`).count()), `no ${f} column`);
    assert(!(await rowBtn(page, 0, 'state').count()), 'no absent button');
    assert(!(await page.getByRole('combobox', { name: '상태', exact: true }).count()), 'no state filter');

    // RCP-08 — 삭제: 영향 확인 → 409 → 한 번 더 확인 → force
    await rowBtn(page, 0, 'delete').click();
    await page.getByText('되돌릴 수 없습니다', { exact: false }).waitFor();
    await page.getByRole('button', { name: '삭제', exact: true }).last().click();
    await page.getByRole('button', { name: '그래도 삭제', exact: true }).click();
    await page.waitForTimeout(600);
    assert.deepEqual(state.deletes, [{ id: '10001', force: false }, { id: '10001', force: true }]);

    // 수신자 「편집」 은 없앴습니다(2026-10-03) — 메일은 계정 이메일을 따르고 휴대전화 · 메신저 칸도 없습니다
    assert(!(await rowBtn(page, 0, 'edit').count()), 'no recipient edit button');

    // RCP-06 — 후보 계정 검색 → 메일 자동 채움 → 등록
    await page.getByRole('button', { name: '수신자 등록', exact: true }).click();
    await page.getByLabel('계정 검색', { exact: true }).fill('김');
    await page.getByRole('button', { name: '계정 검색', exact: true }).click();
    await page.getByLabel('20260101 선택', { exact: true }).click();
    assert.equal((await page.getByLabel('메일', { exact: true }).textContent()).trim(), '메일(계정 이메일): new@dwje.co.kr', 'mail shown read-only from account');
    assert(!(await page.getByPlaceholder('예) hong@dwje.co.kr', { exact: true }).count()), 'no mail input');
    await page.getByRole('button', { name: '등록', exact: true }).click();
    await page.waitForTimeout(600);
    assert.equal(state.cand.at(-1), '김');
    assert.deepEqual({ empNo: state.posts.at(-1).empNo, mail: state.posts.at(-1).mail }, { empNo: '20260101', mail: 'new@dwje.co.kr' });
    assert(!('night' in state.posts.at(-1)), 'night not sent');

    // 수신자 탭 엑셀 — 전체는 size=0
    await excel.click();
    await page.getByRole('menuitem', { name: /전체 다운로드/ }).click();
    await page.waitForTimeout(800);
    all = state.logs.at(-1);
    assert.equal(all.scopeCd, 'ALL'); assert.equal(all.rowCnt, 4, 'all recipients incl. other pages'); assert(state.sizes.includes(0), 'size=0');

    // 390px — 수신자 표 관리 열
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(900);
    sc = await scrollToManage(page);
    assert(sc.title === '관리' && sc.scrolled && sc.inView && sc.aligned, `recipient grid 관리 reachable ${JSON.stringify(sc)}`);
    assert.deepEqual(state.errors, []);
  } finally { await browser.close(); }

  // ── 2. 읽기 전용 · worker 없음 ────────────────────
  const ro = await setup({ write: false, worker: false });
  try {
    assert(await ro.page.getByRole('button', { name: '수신 그룹 등록', exact: true }).isDisabled(), 'group create disabled');
    assert(await ro.page.locator(`[data-testid="recip-group-create"][title="${WRITE_TIP}"]`).count(), 'create tooltip');
    assert(await rowBtn(ro.page, 0, 'edit').isDisabled(), 'group edit disabled');
    assert(await rowBtn(ro.page, 0, 'test').isDisabled(), 'group test disabled');
    assert.equal(await rowBtn(ro.page, 0, 'edit').getAttribute('title'), WRITE_TIP);
    assert(await ro.page.getByText('읽기 전용', { exact: false }).count());

    // 그룹 탭 엑셀 — 구성원 비공개
    const excel = ro.page.getByRole('button', { name: '엑셀 다운로드 ▾', exact: true });
    await excel.click();
    await ro.page.getByRole('menuitem', { name: /조회 목록 다운로드/ }).click();
    await ro.page.waitForTimeout(600);
    assert.equal(ro.state.logs.at(-1).blindCnt, 3, 'member column blinded per group (incl. inactive group)');

    // 수신자 탭 엑셀 — 이름(사번)·메일 2칸 × 4행(전원) 비공개, 파일 안에도 '비공개'
    await ro.page.getByRole('tab', { name: /수신자/ }).click();
    await ro.page.waitForTimeout(800);
    assert(await ro.page.getByRole('button', { name: '수신자 등록', exact: true }).isDisabled(), 'recipient create disabled');
    const dl = ro.page.waitForEvent('download');
    await excel.click();
    await ro.page.getByRole('menuitem', { name: /조회 목록 다운로드/ }).click();
    const file = await (await dl).path();
    await ro.page.waitForTimeout(400);
    const log = ro.state.logs.at(-1);
    assert.equal(log.scopeCd, 'VIEW'); assert.equal(log.blindCnt, 8, '2 worker cells × 4 rows (all recipients loaded)');
    const body = fs.readFileSync(file, 'utf8');
    assert(body.includes('비공개') && !body.includes('10001@dwje.co.kr'), 'file has 비공개 and no raw mail');
    assert(body.includes('비공개 처리 8건'), 'file notes blind count equal to log');
    assert.equal(ro.state.puts.length + ro.state.posts.length + ro.state.tests.length, 0);
    assert.deepEqual(ro.state.errors, []);
  } finally { await ro.browser.close(); }

  console.log('PASS: sys-recip — card tabs (no desc·cond button·hint·night/absent), P1 member picker(size=0)·delete 409→force·group use 409·inactive always listed·member list(name(empNo), 외 N명, filter, modal)·no account/hp/messenger·no search row (size=0, header list filters for group/position)·no recipient edit (mail = account email, read-only), detail-based group edit keeps channels/dept/members, group channel select (live only, change sends channels), empty members confirm + preserveEmpty [], dept null, group test modal, account column, candidate search fills mail, read-only locks + tooltip, worker masking in xls (blindCnt = file note), VIEW/ALL(includeInactive, size=0), 390px 관리 columns');
})().catch((error) => { console.error(error); process.exitCode = 1; });
