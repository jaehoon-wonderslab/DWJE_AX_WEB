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

const WRITE_TIP = '이 화면의 쓰기 권한이 없습니다. 전산팀에 요청하세요.';
const CODES = [
  ['ALM_CHANNEL', 'MAIL', '메일'], ['ALM_CHANNEL', 'POPUP', '시스템 팝업'],
  ['ALM_WINDOW', 'ALWAYS', '24시간 상시'], ['ALM_WINDOW', 'D0820', '08:00 ~ 20:00'],
].map(([groupCd, cd, nm], i) => ({ groupCd, cd, nm, sort: i, useYn: 'Y' }));

function me({ write = true, worker = true } = {}) {
  return {
    user: { empNo: '10004', name: '최전산', dept: '전산팀', deptId: 5, pos: 'SENIOR', superAdmin: false },
    dept: { deptId: 5, deptNm: '전산팀', superAdmin: false },
    menuPerms: ['ai-chat', 'alert-cond', 'sys-recip'],
    writePerms: write ? ['sys-recip'] : [],
    dataPerms: worker ? ['qty', 'worker'] : ['qty'],
    dataFields: [],
    pwdChangeRequired: false,
  };
}

const recip = (n, extra = {}) => ({
  empNo: `1000${n}`, recipientId: `1000${n}`, name: `수신자${n}`, dept: '제조팀', pos: 'STAFF', posNm: '사원', mail: `1000${n}@dwje.co.kr`, hp: `010-1000-000${n}`,
  messenger: `m${n}`, night: true, state: 'RECV', stateNm: '수신', userState: 'ACTIVE', userStateNm: '사용', groups: ['엔진 가동'], ...extra,
});

async function setup(opts = {}) {
  const { page, browser } = await open('it');
  const blind = opts.worker === false;
  const state = {
    groups: [
      { groupId: 11, name: '엔진 가동', validWindow: 'ALWAYS', night: true, deptId: 4, dept: '제조팀', useFlg: 'Y', channels: ['MAIL', 'POPUP'], members: [{ empNo: '10001', name: blind ? null : '수신자1', dept: '제조팀', state: 'RECV', userState: 'ACTIVE' }, { empNo: '10002', name: blind ? null : '수신자2', dept: '제조팀', state: 'RECV', userState: 'SUSPENDED' }], memberEmpNos: ['10001', '10002'], memberCnt: 2, receivingCnt: 1, condCnt: 2, conds: [{ condId: 5, name: '조건 A', on: true }, { condId: 6, name: '조건 B', on: true }], escStages: [] },
      { groupId: 10, name: '생산 이슈', validWindow: 'D0820', night: false, deptId: null, dept: '', useFlg: 'Y', channels: ['MAIL'], members: [], memberEmpNos: [], memberCnt: 0, receivingCnt: 0, condCnt: 0, conds: [], escStages: [] },
    ],
    recipients: [recip(1), recip(2, { userState: 'SUSPENDED', userStateNm: '정지' }), recip(3, { state: 'ABSENT', stateNm: '부재' })],
    puts: [], posts: [], tests: [], logs: [], sizes: [], includeInactive: [], cand: [], errors: [],
    rputs: [], statePatches: [], deletes: [], groupState: [], listQueries: [],
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
  await page.route('**/api/v1/alert-escalation-rules**', (route) => ok(route, { stages: [1, 2, 3].map((stage) => ({ stage, stageNm: `${stage}차`, targetGroupId: null, on: true })) }));
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
        members: g.memberEmpNos.map((e) => ({ empNo: e, name: blind ? null : `수신자${e.slice(-1)}`, dept: '제조팀', state: 'RECV', userState: 'ACTIVE' })),
        conds: [{ condId: 5, name: '조건 A', on: true }, { condId: 6, name: '조건 B', on: true }],
        escStages: [], deptOptions: [{ value: 3, label: '생산관리팀' }, { value: 4, label: '제조팀' }], updatedAt: '2026-09-16 21:17:35',
      });
    }
    if (req.method() === 'PUT') { state.puts.push({ id, body: req.postDataJSON() }); return ok(route, { success: true, updatedAt: '2026-10-01 10:30:00' }, { message: '수신 그룹을 수정했습니다.' }); }
    if (req.method() === 'PATCH' && path.endsWith('/state')) {
      const body = req.postDataJSON(); state.groupState.push({ id, body });
      if (id === 11 && body.on === false) return route.fulfill({ status: 409, json: { success: false, code: 'E-RULE-001', message: '발송 조건 2건·승격 규칙 0단계가 이 그룹을 씁니다. 먼저 연결을 바꿔 주십시오.' } });
      return ok(route, { useFlg: body.on ? 'Y' : 'N', changed: true }, { message: '바꿨습니다.' });
    }
    if (req.method() === 'POST' && path.endsWith('/test-send')) {
      state.tests.push(id);
      return ok(route, { alertId: 1, queuedCnt: 1, sentCnt: 1, recipients: [{ empNo: '10001', name: '수신자1', dept: '제조팀', channel: 'MAIL' }], skipped: [{ empNo: '10003', name: '수신자3', reason: 'ABSENT', reasonNm: '부재' }] }, { message: '테스트 알림 1건을 발송 대기열에 넣었습니다.' });
    }
    return route.continue();
  });
  await page.route('**/api/v1/alert-recipients**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname.replace('/api/v1/alert-recipients', '');
    if (req.method() === 'GET' && path === '/summary') return ok(route, { groupCnt: 2, recipientCnt: { receiving: 2, absent: 1 }, nightCnt: 3, inactiveAccountCnt: 1 });
    if (req.method() === 'GET' && path === '/candidates') {
      state.cand.push(url.searchParams.get('keyword'));
      return ok(route, { items: [{ empNo: '20260101', name: '김신규', dept: '품질보증팀', posNm: '사원', email: 'new@dwje.co.kr' }] }, { meta: { page: 1, size: 20, total: 1 } });
    }
    if (req.method() === 'GET' && path.endsWith('/impact')) {
      return ok(route, { empNo: '10001', groups: [{ groupId: 11, name: '엔진 가동', receivableCntAfter: 0 }], zeroGroups: [{ groupId: 11, name: '엔진 가동' }], affectedConds: [{ condId: 5, name: '조건 A' }, { condId: 6, name: '조건 B' }], affectedEscStages: [] });
    }
    if (req.method() === 'PATCH' && path.endsWith('/state')) { state.statePatches.push({ id: path.split('/')[1], body: req.postDataJSON() }); return ok(route, {}, { message: '수신 상태를 바꿨습니다.' }); }
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
    assert(await page.getByText('메일 외에 시스템 팝업도 받습니다', { exact: false }).count(), 'extra channel note');
    assert(await page.getByText('조건 A · 조건 B', { exact: false }).count(), 'conds using this group');
    await nameInput.fill('엔진 가동 2');
    await page.getByRole('button', { name: '수정', exact: true }).click();
    await page.waitForTimeout(600);
    assert.deepEqual(state.puts.at(-1), { id: 11, body: { name: '엔진 가동 2', updatedAt: '2026-09-16 21:17:35' } }, 'name-only save keeps dept/channels/members');

    // 멤버 전원 제외 + 대응 부서 해제 → 확인 → memberEmpNos:[] · deptId:null
    await rowBtn(page, 0, 'edit').click();
    await page.getByPlaceholder('예) 엔진 가동', { exact: true }).waitFor();
    // RCP-05 — 검색형 멤버 선택기: 전 수신자(size=0)에서 고르고 칩으로 뺍니다
    assert(state.sizes.includes(0), 'member picker loads all recipients');
    assert(await page.getByLabel('10009 추가', { exact: true }).count(), 'recipients on other pages are pickable');
    await page.getByLabel('10001 빼기', { exact: true }).click();
    await page.getByLabel('10002 빼기', { exact: true }).click();
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
    assert(await page.getByText('부재', { exact: true }).count());
    await page.getByRole('button', { name: '닫기', exact: true }).last().click();

    // RCP-09 — 연계 열·승격 안내, RCP-08 — 사용 중지 409·사용 중지 그룹 보기
    assert(await page.getByText('승격 규칙에 대상 그룹이 없어 미확인 알림이 승격되지 않습니다.', { exact: true }).count(), 'escalation notice');
    assert(await grid(page).locator('.tabulator-col[tabulator-field="receivableLabel"]').count(), 'receivable column');
    assert(await grid(page).locator('.tag-red', { hasText: '0/0' }).count(), 'zero receivable in red');
    await rowBtn(page, 0, 'use').click();
    await page.getByText('알림이 나가지 않습니다', { exact: false }).waitFor();
    await page.getByRole('button', { name: '사용 중지', exact: true }).last().click();
    await page.waitForTimeout(600);
    assert.deepEqual(state.groupState.at(-1), { id: 11, body: { on: false } });
    assert(await page.getByText('발송 조건 2건', { exact: false }).count(), '409 reason toasted');
    await page.getByText('사용 중지 그룹 보기', { exact: true }).click();
    await page.getByText('중지된 그룹', { exact: true }).waitFor();
    assert(state.includeInactive.includes(true));
    await page.getByText('사용 중지 그룹 보기', { exact: true }).click();
    await page.waitForTimeout(600);

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
    assert.equal(view.scopeCd, 'VIEW'); assert.equal(view.rowCnt, 2, 'view = active groups'); assert.equal(view.blindCnt, 0); assert.equal(view.menuId ?? view.reportId, 'sys-recip');
    assert.equal(all.scopeCd, 'ALL'); assert.equal(all.rowCnt, 3, 'all groups include inactive'); assert(state.includeInactive.includes(true));

    // 390px — 그룹 표 관리 열
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(900);
    let sc = await scrollToManage(page);
    assert(sc.title === '관리' && sc.scrolled && sc.inView && sc.aligned, `group grid 관리 reachable ${JSON.stringify(sc)}`);
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.waitForTimeout(500);

    // 수신자 탭 — RCP-04 계정 열
    await page.getByText('수신자', { exact: true }).first().click();
    await page.getByText('수신자1', { exact: true }).first().waitFor();
    assert(await grid(page).locator('.tabulator-col[tabulator-field="accountLabel"]').count(), 'account column');
    assert(await grid(page).locator('.tag-red', { hasText: '정지' }).count(), 'suspended account in red');
    assert(await grid(page).locator('.tabulator-col[tabulator-field="remark"]').count(), 'remark column');

    // RCP-11 — 서버 필터: 그룹은 groupId, 검색은 Enter 에만
    await page.getByRole('combobox', { name: '그룹', exact: true }).selectOption('11');
    await page.waitForTimeout(700);
    assert.equal(state.listQueries.at(-1).groupId, '11', 'group filter sent as groupId');
    const nq = state.listQueries.length;
    await page.getByLabel('수신자 검색', { exact: true }).fill('수신자');
    await page.waitForTimeout(600);
    assert.equal(state.listQueries.length, nq, 'typing does not reload');
    await page.getByLabel('수신자 검색', { exact: true }).press('Enter');
    await page.waitForTimeout(700);
    assert.equal(state.listQueries.at(-1).keyword, '수신자');
    await page.getByRole('combobox', { name: '그룹', exact: true }).selectOption('전체');
    await page.getByLabel('수신자 검색', { exact: true }).fill('');
    await page.getByRole('button', { name: '조회', exact: true }).click();
    await page.waitForTimeout(700);

    // RCP-07 — 부재로(영향·사유) / 수신으로
    await rowBtn(page, 0, 'state').click();
    await page.getByText('이 사람만 받는 그룹: 엔진 가동', { exact: false }).waitFor();
    await page.getByPlaceholder('예) 출장 중 (선택, 300자)', { exact: true }).fill('출장');
    await page.getByRole('button', { name: '부재로', exact: true }).last().click();
    await page.waitForTimeout(600);
    assert.deepEqual(state.statePatches.at(-1), { id: '10001', body: { state: 'ABSENT', reason: '출장' } });
    await rowBtn(page, 2, 'state').click();
    await page.waitForTimeout(600);
    assert.deepEqual(state.statePatches.at(-1), { id: '10003', body: { state: 'RECV' } });

    // RCP-08 — 삭제: 영향 확인 → 409 → 한 번 더 확인 → force
    await rowBtn(page, 0, 'delete').click();
    await page.getByText('되돌릴 수 없습니다', { exact: false }).waitFor();
    await page.getByRole('button', { name: '삭제', exact: true }).last().click();
    await page.getByRole('button', { name: '그래도 삭제', exact: true }).click();
    await page.waitForTimeout(600);
    assert.deepEqual(state.deletes, [{ id: '10001', force: false }, { id: '10001', force: true }]);

    // RCP-12 — 휴대전화 지우기는 "" 로 (preserveEmpty), 바뀐 칸만
    await rowBtn(page, 0, 'edit').click();
    const hp = page.getByPlaceholder('예) 010-0000-0000', { exact: true });
    await hp.waitFor();
    await hp.fill('');
    await page.getByRole('button', { name: '수정', exact: true }).click();
    await page.waitForTimeout(600);
    assert.deepEqual(state.rputs.at(-1), { id: '10001', body: { hp: '' } }, 'cleared phone sent as empty string only');

    // RCP-06 — 후보 계정 검색 → 메일 자동 채움 → 등록
    await page.getByRole('button', { name: '수신자 등록', exact: true }).click();
    await page.getByLabel('계정 검색', { exact: true }).fill('김');
    await page.getByRole('button', { name: '계정 검색', exact: true }).click();
    await page.getByLabel('20260101 선택', { exact: true }).click();
    assert.equal(await page.getByLabel('메일', { exact: true }).inputValue(), 'new@dwje.co.kr', 'mail filled from account');
    await page.getByRole('button', { name: '등록', exact: true }).click();
    await page.waitForTimeout(600);
    assert.equal(state.cand.at(-1), '김');
    assert.deepEqual({ empNo: state.posts.at(-1).empNo, mail: state.posts.at(-1).mail }, { empNo: '20260101', mail: 'new@dwje.co.kr' });

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
    assert.equal(ro.state.logs.at(-1).blindCnt, 2, 'member column blinded per group');

    // 수신자 탭 엑셀 — 이름·메일·휴대전화·메신저 4칸 × 3행 비공개, 파일 안에도 '비공개'
    await ro.page.getByText('수신자', { exact: true }).first().click();
    await ro.page.waitForTimeout(800);
    assert(await ro.page.getByRole('button', { name: '수신자 등록', exact: true }).isDisabled(), 'recipient create disabled');
    const dl = ro.page.waitForEvent('download');
    await excel.click();
    await ro.page.getByRole('menuitem', { name: /조회 목록 다운로드/ }).click();
    const file = await (await dl).path();
    await ro.page.waitForTimeout(400);
    const log = ro.state.logs.at(-1);
    assert.equal(log.scopeCd, 'VIEW'); assert.equal(log.blindCnt, 12, '4 worker cells × 3 rows');
    const body = fs.readFileSync(file, 'utf8');
    assert(body.includes('비공개') && !body.includes('10001@dwje.co.kr'), 'file has 비공개 and no raw mail');
    assert(body.includes('비공개 처리 12건'), 'file notes blind count equal to log');
    assert.equal(ro.state.puts.length + ro.state.posts.length + ro.state.tests.length, 0);
    assert.deepEqual(ro.state.errors, []);
  } finally { await ro.browser.close(); }

  console.log('PASS: sys-recip — P1 member picker(size=0)·absent with impact·delete 409→force·group use 409·inactive toggle·server filters·hp clear "", detail-based group edit keeps channels/dept/members, empty members confirm + preserveEmpty [], dept null, group test modal, account column, candidate search fills mail, read-only locks + tooltip, worker masking in xls (blindCnt = file note), VIEW/ALL(includeInactive, size=0), 390px 관리 columns');
})().catch((error) => { console.error(error); process.exitCode = 1; });
