/*
 * 메뉴 접근 권한(sys-menu) 화면 시험 — 기획 03 6.2 (2026-10-01 개편 · 2026-10-03 조회/쓰기 통합)
 *
 * page.route 로 로그인 세션과 API 응답을 모두 흉내 냅니다(실제 API·DB 를 쓰지 않습니다).
 * 목 모드 개발 서버는 API 를 네트워크로 부르지 않아 가로챌 수 없으므로, 로컬 대상 개발 서버(npm run web)에서 돌립니다.
 *   WEB_URL=http://localhost:8081 node tests/system/menu-perm-browser.cjs
 *
 * 확인하는 것
 *  · 대그룹 순서(menu.js), 부서마다 「접근」 한 칸(dept_{id}), 통합관리자·미배정 열 잠금, 미배정 머리글 「고정(5화면) · 변경 불가」
 *  · 관리 화면 행 잠금(canEditAdminScreens=false), 개인 허용 n명
 *  · 체크 본문 {deptId, screenId, allowed} — perm 없음, 일반 화면 해제는 확인 창 없음, 서버 409 시 상태 유지 + 토스트
 *  · 그룹 일괄 = PUT /group 1건(groupId·includeActions:false, perm 없음), 관리 화면 그룹은 비관리자에게 잠금
 *  · 부서 추가(2026-10-07, 예전 「부서 권한 복사」 자리) — 부서명 필수, 초기 권한 선택지에 통합관리자·미배정 없음, POST /system/depts 본문
 *  · 요약 카드·안내 상자·머리말 이동 단추·이력 탭 부제·감사 로그 링크 없음, 이력 표 쪽 나누기(전량 size=0)
 *  · 그룹 행은 트리 펼침 단추(.tree-toggle — 꺾쇠 + 그룹명 + 화면 수)
 *  · 엑셀 옵션 패널 — 조회 목록(펼친 그룹만, VIEW) · 전체(ALL), blindCnt 0
 *  · 읽기 전용(미배정 계정 — 접근은 있어도 쓰기 불가) — 모든 체크·복사 비활성, 「읽기 전용」, 엑셀은 활성
 *  · 「쓰기」 · 「동작(쓰기)」 · 「쓰기 포함」 문구 없음
 *  · 390px 에서 마지막 부서(미배정) 칸 머리글·값까지 가로 스크롤, 머리글과 본문 정렬
 */
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const { WEB } = require('../lib/browser');

/**
 * 로그인 없이 연 페이지 — 세션(가짜 토큰)을 넣고 모든 API 를 흉내 냅니다.
 * 실제 API 서버 상태(중지·디버거 정지 등)와 무관하게 화면만 시험합니다. 흉내 내지 않은 API 는 빈 성공 응답입니다.
 */
async function openFixture() {
  const probe = await fetch(WEB).catch(() => null);
  if (!probe) throw new Error(`웹 개발 서버에 연결할 수 없습니다 (${WEB}). 'npm run web' 으로 먼저 띄워 주세요.`);
  const browser = await chromium.launch({ channel: 'chrome', headless: process.env.HEADED !== '1' });
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const page = await context.newPage();
  await page.route('**/api/**', (route) => route.fulfill({ json: { success: true, code: 'SUCCESS', message: '', data: null } }));
  await page.goto(`${WEB}/login`);
  await page.evaluate(() => localStorage.setItem('dwje.ax.session', JSON.stringify({
    accessToken: 'fixture-access', refreshToken: 'fixture-refresh',
    userInfo: { empNo: '10004', name: '최전산', dept: '검증부서', deptId: 2, superAdmin: false },
  })));
  return { browser, page };
}

const SCREENS = [
  { id: 'dash-ai', name: 'AI 통합 대시보드', groupId: 'dashboard', group: '대시보드', sub: false, kind: 'MENU' },
  { id: 'dash-ai-upload', name: '업로드 리포트 업로드', groupId: 'dashboard', group: '대시보드', sub: true, kind: 'ACTION', parentId: 'dash-ai' },
  { id: 'prod-monitor', name: '생산 모니터링', groupId: 'dashboard', group: '대시보드', sub: false, kind: 'MENU' },
  { id: 'sys-menu', name: '메뉴 접근 권한', groupId: 'system', group: '시스템관리', sub: false, kind: 'MENU', admin: true },
  { id: 'sys-audit', name: '보안 감사 로그', groupId: 'system', group: '시스템관리', sub: false, kind: 'MENU' },
  { id: 'chat-history', name: '자연어 질의 이력', groupId: 'history', group: '자연어 질의 이력', sub: false, kind: 'MENU', common: true },
  { id: 'prod-result', name: '실적 집계·조회', groupId: 'operation', group: '생산 및 품질 관리', sub: false, kind: 'MENU' },
];
const DEPTS = [
  { deptId: 1, deptNm: '통합관리자', superAdmin: true, unassigned: false, locked: 'SUPER_ADMIN', userCnt: 1 },
  { deptId: 2, deptNm: '검증부서', superAdmin: false, unassigned: false, locked: null, userCnt: 3 },
  { deptId: 3, deptNm: '둘째부서', superAdmin: false, unassigned: false, locked: null, userCnt: 6 },
  { deptId: 4, deptNm: '빈부서', superAdmin: false, unassigned: false, locked: null, userCnt: 0 },
  { deptId: 59, deptNm: '미배정', superAdmin: false, unassigned: true, locked: 'UNASSIGNED', userCnt: 349 },
];

/** write=false 는 미배정 계정 — 2026-10-03 부터 「접근은 있는데 쓰기 없음」 은 미배정뿐입니다 */
function me({ write = true } = {}) {
  return {
    user: { empNo: '10004', name: '최전산', dept: '검증부서', deptId: 2, pos: 'SENIOR', superAdmin: false },
    dept: { deptId: 2, deptNm: '검증부서', superAdmin: false, unassigned: !write },
    menuPerms: ['ai-chat', 'sys-menu', 'sys-data', 'sys-account', 'sys-audit'],
    // 호환용 writePerms — 화면은 보지 않습니다(일부러 비워 둡니다)
    writePerms: [],
    dataPerms: ['qty'],
    dataFields: [],
    pwdChangeRequired: false,
  };
}

/** 화면 하나를 열고 API 를 흉내 냅니다 — state 로 요청을 모읍니다 */
async function setup({ write = true } = {}) {
  const { page, browser } = await openFixture();
  const state = {
    matrix: { 1: SCREENS.map((s) => s.id), 2: ['dash-ai', 'dash-ai-upload', 'prod-result', 'chat-history', 'sys-menu'], 3: [], 4: ['dash-ai-upload'], 59: ['dash-ai', 'prod-monitor', 'chat-history'] },
    puts: [], groups: [], copies: [], depts: [], logs: [], errors: [], failNext: false, previewAdmin: true,
  };
  page.on('pageerror', (e) => state.errors.push(e.message));
  await page.route('**/api/v1/auth/me', (route) => route.fulfill({ json: { success: true, data: me({ write }) } }));
  await page.route('**/api/v1/system/perm-logs**', (route) => {
    state.logReads = (state.logReads || 0) + 1;
    const q = new URL(route.request().url()).searchParams;
    state.logActType = q.get('actType');
    state.logSize = q.get('size');
    // 30건 — 표가 25건씩 쪽을 나누는지 봅니다
    const extra = Array.from({ length: 29 }, (_, i) => ({ ts: `2026-09-${String(30 - i).padStart(2, '0')} 09:00:00`, target: '둘째부서 / dash-ai', actType: 'MENU_PERM', detail: `메뉴 권한 부여 ${i + 1}`, by: '김검증', byEmpNo: '10005' }));
    return route.fulfill({ json: { success: true, data: { items: [
      { ts: '2026-10-01 14:02:00', target: '검증부서 / prod-result', actType: 'MENU_PERM', detail: '메뉴 권한 회수(조회)', by: '최전산', byEmpNo: '10004' },
      ...extra,
    ] }, meta: { page: 1, size: 0, total: 30 } } });
  });
  await page.route('**/api/v1/system/depts', (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    state.depts.push(route.request().postDataJSON());
    return route.fulfill({ json: { success: true, message: '부서가 등록되었습니다.', data: { deptId: 9 } } });
  });
  await page.route('**/api/v1/download-logs', (route) => { state.logs.push(route.request().postDataJSON()); return route.fulfill({ json: { success: true, data: {} } }); });
  await page.route('**/api/v1/system/menu-perms**', async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    const ok = (data, message = '저장 완료') => route.fulfill({ json: { success: true, message, data } });
    if (req.method() === 'PUT' && path.endsWith('/group')) {
      const body = req.postDataJSON(); state.groups.push(body);
      const ids = SCREENS.filter((s) => s.groupId === body.groupId && s.kind !== 'ACTION').map((s) => s.id);
      const list = state.matrix;
      list[body.deptId] = [...new Set([...(list[body.deptId] || []).filter((id) => !ids.includes(id)), ...(body.allowed ? ids : [])])];
      return ok({ changedCnt: ids.length, added: body.allowed ? ids : [], removed: body.allowed ? [] : ids }, '그룹 권한이 변경되었습니다.');
    }
    if (req.method() === 'PUT') {
      const body = req.postDataJSON(); state.puts.push(body);
      if (state.failNext) { state.failNext = false; return route.fulfill({ status: 409, json: { success: false, code: 'E-RULE-001', message: '검증용 거부 메시지' } }); }
      const read = state.matrix[body.deptId] || (state.matrix[body.deptId] = []);
      const had = read.includes(body.screenId);
      if (body.allowed && !had) read.push(body.screenId);
      if (!body.allowed && had) read.splice(read.indexOf(body.screenId), 1);
      return ok({ success: true, allowed: read.includes(body.screenId), changed: had !== read.includes(body.screenId) });
    }
    if (req.method() === 'POST' && path.endsWith('/copy')) {
      const body = req.postDataJSON(); state.copies.push(body);
      if (body.dryRun) {
        return ok({
          dryRun: true, from: { deptId: 2, deptNm: '검증부서' }, to: { deptId: 3, deptNm: '둘째부서', userCnt: 6 },
          added: [{ id: 'dash-ai' }, ...(state.previewAdmin ? [{ id: 'sys-menu' }] : [])],
          removed: [],
          adminScreensChanged: state.previewAdmin ? ['sys-menu'] : [],
          requiresSuperAdmin: state.previewAdmin,
          expectedHash: state.previewAdmin ? 'hash-admin' : 'hash-1',
        }, '미리보기');
      }
      return ok({ copiedCnt: 1, added: ['dash-ai'], removed: [] }, '권한이 복사되었습니다.');
    }
    return ok({
      screens: SCREENS, depts: DEPTS, matrix: state.matrix,
      grantCounts: { 'prod-result': 1 },
      grants: { 'prod-result': [{ empNo: '10009', name: '개인허용자', deptId: 2 }] },
      canEditAdminScreens: false, version: 'v1',
    });
  });
  await page.goto(`${WEB}/system/menu-perm`);
  await page.locator('.tabulator').first().waitFor();
  await page.waitForTimeout(400);
  return { page, browser, state };
}

const box = (page, label) => page.getByRole('checkbox', { name: label, exact: true });

(async () => {
  // ── 1. 접근이 있는 일반 부서 계정 (= 쓰기 가능) ─────────
  const { page, browser, state } = await setup();
  try {
    const table = page.locator('.tabulator').first();
    // 대그룹 순서 — menu.js 정의 순서(대시보드 → 생산 및 품질 관리 → 자연어 질의 이력 → 시스템관리)
    // 그룹 행은 트리 펼침 단추(꺾쇠 + 그룹명 + 화면 수, 2026-10-07)
    const groups = await table.locator('.tabulator-row .tree-toggle[aria-expanded]').evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')));
    assert.deepEqual(groups.map((t) => t.replace(/ (접기|펼치기)$/, '')), ['대시보드', '생산 및 품질 관리', '자연어 질의 이력', '시스템관리'], 'group order follows menu.js');
    assert.equal(await table.locator('.tabulator-row .tree-toggle svg').count(), 4, 'chevron on each group');
    // 머리 정리(2026-10-07) — 요약 카드·안내 상자·이동 단추 없음, 설명은 문장마다 줄바꿈
    for (const gone of ['관리 대상 화면', '내 부서 접근', '부서 평균']) assert.equal(await page.getByText(gone, { exact: true }).count(), 0, `no stat card ${gone}`);
    assert.equal(await page.getByText('그룹 「전체 허용」은 동작 행을 포함하지 않습니다', { exact: false }).count(), 0, 'no hint box');
    for (const gone of ['계정 관리', '데이터 접근 권한']) assert.equal(await page.getByRole('button', { name: gone, exact: true }).count(), 0, `no head link ${gone}`);
    assert(await page.getByText('부서별로 화면마다 접근 권한을 지정합니다.\n접근할 수 있으면', { exact: false }).isVisible(), 'desc line breaks');
    assert.equal(await page.locator('#menu-perm-tab-matrix').getByText('부서별 메뉴 접근 권한', { exact: true }).count(), 1, 'matrix tab label');
    // 머리글 — 부서명 · n명, 미배정 고정 표기
    const headerText = await table.locator('.tabulator-headers').innerText();
    assert(headerText.includes('미배정 · 349명') && headerText.includes('고정(5화면) · 변경 불가'), 'unassigned header');
    assert(headerText.includes('통합관리자 · 1명') && headerText.includes('전 권한'), 'super admin header');
    // 부서마다 한 칸 — dept_{id}. 조회/쓰기 두 칸(dept_{id}_read · _write)은 없습니다
    assert.equal(await table.locator('.tabulator-col[tabulator-field="dept_2"]').count(), 1, 'one column per dept');
    assert.equal(await table.locator('.tabulator-col[tabulator-field="dept_2_read"]').count(), 0, 'no read column');
    assert.equal(await table.locator('.tabulator-col[tabulator-field="dept_2_write"]').count(), 0, 'no write column');
    assert(!/조회|쓰기/.test(headerText), `header has no 조회/쓰기 sub columns: ${headerText}`);
    // 잠금 — 통합관리자·미배정 열, 관리 화면 행
    assert(await box(page, '실적 집계·조회 · 통합관리자 접근 허용').isDisabled(), 'super admin locked');
    for (const label of ['AI 통합 대시보드 · 미배정 접근 허용', '자연어 질의 이력 · 미배정 접근 허용']) {
      assert(await box(page, label).isDisabled(), `unassigned locked: ${label}`);
    }
    assert(await box(page, 'AI 통합 대시보드 · 미배정 접근 허용').isChecked(), 'unassigned shows fixed screens');
    assert(await box(page, '메뉴 접근 권한 · 검증부서 접근 허용').isDisabled(), 'admin screen row locked for non super admin');
    assert(!(await box(page, '실적 집계·조회 · 둘째부서 접근 허용').isDisabled()), 'plain cell editable');
    assert(!(await box(page, '보안 감사 로그 · 검증부서 접근 허용').isDisabled()), 'sys-audit not locked');
    // 화면 이름 접미 · 개인 허용 열
    assert.equal(await table.getByText('메뉴 접근 권한 (관리)', { exact: true }).count(), 1);
    assert.equal(await table.getByText('자연어 질의 이력 (전사 공통)', { exact: true }).count(), 1);
    assert.equal(await table.locator('.tabulator-cell[tabulator-field="grantCount"]', { hasText: '1명' }).count(), 1, 'grant count');
    assert(await page.getByRole('button', { name: '시스템관리 검증부서 전체 허용', exact: true }).isDisabled(), 'admin group bulk locked');

    // 접근 허용 → 본문에 perm 없음
    await box(page, '실적 집계·조회 · 둘째부서 접근 허용').click();
    await page.waitForTimeout(500);
    assert.deepEqual(state.puts.at(-1), { deptId: '3', screenId: 'prod-result', allowed: true });
    assert(await box(page, '실적 집계·조회 · 둘째부서 접근 허용').isChecked());

    // 일반 화면 해제 → 확인 창 없이 바로 저장(쓰기 회수 확인은 없앴습니다) · 개인 허용 안내
    await box(page, '실적 집계·조회 · 검증부서 접근 허용').click();
    await page.waitForTimeout(600);
    assert.equal(await page.getByText('쓰기 권한도 함께 회수됩니다', { exact: false }).count(), 0, 'no write-revoke confirm');
    assert.deepEqual(state.puts.at(-1), { deptId: '2', screenId: 'prod-result', allowed: false });
    await page.getByText('개인 허용 1명은 계속 접근합니다', { exact: false }).first().waitFor();
    assert(!(await box(page, '실적 집계·조회 · 검증부서 접근 허용').isChecked()));

    // 서버 409 — 상태 유지 + 서버 메시지 토스트
    state.failNext = true;
    await box(page, '생산 모니터링 · 검증부서 접근 허용').click();
    await page.getByText('검증용 거부 메시지').first().waitFor();
    assert(!(await box(page, '생산 모니터링 · 검증부서 접근 허용').isChecked()), 'failed save retains old state');

    // 그룹 일괄 — 요청 1건, 본문 groupId·includeActions:false(perm 없음), 동작 행은 그대로
    await page.getByRole('button', { name: '대시보드 둘째부서 전체 허용', exact: true }).click();
    await page.waitForTimeout(600);
    assert.equal(state.groups.length, 1, 'one group request');
    assert.deepEqual(state.groups[0], { deptId: '3', groupId: 'dashboard', allowed: true, includeActions: false });
    assert(await box(page, '생산 모니터링 · 둘째부서 접근 허용').isChecked());
    assert(!(await box(page, 'AI 통합 대시보드 › 업로드 리포트 업로드 · 둘째부서 접근 허용').isChecked()), 'action row untouched');

    // 개인 허용 명단(MNP-06) · 변경 이력 카드(MNP-07) · 동작 행 표기(MNP-05)
    await page.getByRole('button', { name: '실적 집계·조회 개인 허용 1명 보기', exact: true }).click();
    await page.getByText('개인허용자 (10009) · 검증부서', { exact: true }).waitFor();
    await page.getByRole('button', { name: '닫기', exact: true }).last().click();
    await page.getByText('개인허용자 (10009) · 검증부서').waitFor({ state: 'detached' });
    assert.equal(await table.locator('.tabulator-cell[tabulator-field="kindLabel"]', { hasText: '동작(쓰기)' }).count(), 0, 'no 「동작(쓰기)」 label');
    assert.equal(await table.locator('.tabulator-cell[tabulator-field="kindLabel"]', { hasText: /^동작$/ }).count(), 1, 'action row label');
    // 2026-10-02 — 「부서 × 화면」 · 「최근 변경 이력」 은 탭으로 나뉩니다. 감사 로그 링크는 이력 탭 머리에 있습니다
    await page.locator('#menu-perm-tab-logs').click();
    const logCard = page.locator('[id="menu-perm-panel-logs"] .tabulator');
    await logCard.getByText('검증부서 / 실적 집계·조회').waitFor();
    assert.equal(await logCard.getByText('최전산 (10004)').count(), 1, 'log performer — 「이름 (사번)」');
    // 이력 탭 — 감사 로그 링크·「최근 20건」 부제·열 너비 안내 없음, 전량 받아 20건씩 쪽 나누기(2026-10-07)
    assert.equal(await page.getByRole('button', { name: '보안 감사 로그에서 더 보기', exact: true }).count(), 0, 'no audit link');
    assert.equal(await page.getByText('메뉴 접근 권한 변경 최근 20건', { exact: true }).count(), 0, 'no logs subtitle');
    assert.equal(await page.getByText('열 너비는 내용에 맞춰', { exact: false }).count(), 0, 'no width hint');
    assert.equal(state.logSize, '0', 'logs fetched in full');
    assert.equal(await logCard.locator('.tabulator-row').count(), 25, 'first page 25 rows');
    await logCard.locator('.tabulator-paginator').waitFor();
    await logCard.locator('.tabulator-page[data-page="2"]').click();
    await page.waitForTimeout(300);
    assert.equal(await logCard.locator('.tabulator-row').count(), 5, 'second page 5 rows');
    // 표시 건수 10 · 25 · 50 · 100
    const sizeSel = logCard.locator('select.tabulator-page-size');
    assert.deepEqual(await sizeSel.locator('option').allTextContents(), ['10', '25', '50', '100'], 'page size options');
    assert.equal(await sizeSel.inputValue(), '25', 'default page size');
    await sizeSel.selectOption('10');
    await page.waitForTimeout(300);
    assert.equal(await logCard.locator('.tabulator-row').count(), 10, 'page size 10 applies');
    // 2026-10-07 — 「작업자」 머리글, 열마다 검색칸, 시각은 직접 입력 + 달력(datetime-local)
    const heads = await logCard.locator('.tabulator-col-title').allTextContents();
    assert.deepEqual(heads.map((t) => t.trim()), ['시각', '대상', '변경 내용', '작업자'], `log headers ${heads}`);
    for (const f of ['targetLabel', 'detailLabel', 'byLabel']) {
      assert.equal(await logCard.locator(`.tabulator-col[tabulator-field="${f}"] .tabulator-header-filter input`).count(), 1, `filter on ${f}`);
    }
    await sizeSel.selectOption('50');
    await page.waitForTimeout(300);
    const tsText = logCard.locator('.tabulator-col[tabulator-field="ts"] input[type="search"]');
    await tsText.fill('2026-10-01 14');
    await page.waitForTimeout(400);
    assert.equal(await logCard.locator('.tabulator-row').count(), 1, 'ts typed filter');
    await tsText.fill('');
    await page.waitForTimeout(400);
    assert.equal(await logCard.locator('.tabulator-row').count(), 30, 'ts filter cleared');
    assert.equal(await logCard.getByRole('button', { name: '시각 달력에서 선택' }).count(), 1, 'calendar button');
    // 달력에서 고른 값 — 숨긴 datetime-local 칸에 값을 넣고 change 를 보냅니다(브라우저 선택기는 자동화로 조작하지 않음)
    await logCard.locator('.tabulator-col[tabulator-field="ts"] input[type="datetime-local"]').evaluate((el) => {
      el.value = '2026-09-30T09:00';
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForTimeout(400);
    assert.equal(await tsText.inputValue(), '2026-09-30 09:00', 'picker fills text');
    assert.equal(await logCard.locator('.tabulator-row').count(), 1, 'ts picker filter');
    await tsText.fill('');
    const byFilter = logCard.locator('.tabulator-col[tabulator-field="byLabel"] .tabulator-header-filter input');
    await byFilter.fill('최전산');
    await page.waitForTimeout(500);
    assert.equal(await logCard.locator('.tabulator-row').count(), 1, 'performer filter');
    await byFilter.fill('');
    await page.waitForTimeout(400);
    assert.equal(await page.getByRole('button', { name: '부서 추가', exact: true }).count(), 0, 'add-dept button only on matrix tab');
    await page.locator('#menu-perm-tab-matrix').click();
    await table.waitFor();
    assert((state.logReads || 0) >= 2, 'logs reloaded after save');
    assert.equal(state.logActType, 'MENU_PERM,USER_MENU_PERM', 'logs include account grants');

    // MNP-09 계정 0명 부서 흐림 · MNP-10 상위 꺼진 하위 화면 주의 표시 · 상위 끄기 시 하위 함께 끄기
    assert.equal(await table.locator('.tabulator-headers div[style*="opacity"]', { hasText: '빈부서 · 0명' }).count(), 1, 'empty dept dimmed');
    assert.equal(await page.getByRole('img', { name: /상위 화면 「AI 통합 대시보드」 이 꺼져 있어/ }).count(), 1, 'child-without-parent warning');
    const beforeChild = state.puts.length;
    await box(page, 'AI 통합 대시보드 · 검증부서 접근 허용').click();
    await page.getByText('도 함께 끌까요?', { exact: false }).first().waitFor();
    await page.getByRole('button', { name: '함께 끄기', exact: true }).click();
    await page.waitForTimeout(800);
    assert.deepEqual(state.puts.slice(beforeChild), [
      { deptId: '2', screenId: 'dash-ai', allowed: false },
      { deptId: '2', screenId: 'dash-ai-upload', allowed: false },
    ], 'parent then child turned off');
    await page.getByText('하위 화면 1개도 함께 껐습니다', { exact: false }).first().waitFor();

    // ── 부서 추가(2026-10-07) — 예전 「부서 권한 복사」 는 새 부서를 만들지 않아 바꿨습니다 ──
    assert.equal(await page.getByRole('button', { name: '부서 권한 복사', exact: true }).count(), 0, 'no copy button');
    await page.getByRole('button', { name: '부서 추가', exact: true }).click();
    const initFrom = page.getByRole('combobox', { name: '초기 권한 (복사해 올 부서)' });
    await initFrom.waitFor();
    const initOptions = await initFrom.locator('option').allTextContents();
    assert(!initOptions.some((t) => t.includes('미배정') || t.includes('통합관리자')), `no system dept in init perm: ${initOptions}`);
    assert(initOptions.includes('검증부서'), 'init perm lists normal dept');
    await page.getByRole('button', { name: '추가', exact: true }).click();
    await page.getByText('부서명을 입력해 주세요.', { exact: false }).first().waitFor();
    assert.equal(state.depts.length, 0, 'empty name sends nothing');
    await page.getByPlaceholder('예) 공정기술팀').fill('신규부서');
    await initFrom.selectOption('2');
    await page.getByRole('button', { name: '추가', exact: true }).click();
    await page.waitForTimeout(600);
    assert.deepEqual(state.depts.at(-1), { deptNm: '신규부서', initPermFrom: 2 }, 'POST /system/depts body');

    // ── 엑셀 옵션 패널 — 대시보드만 펼친 상태 ──
    for (const g of ['생산 및 품질 관리', '자연어 질의 이력', '시스템관리']) {
      await page.getByRole('button', { name: `${g} 접기`, exact: true }).click();
      await page.waitForTimeout(150);
    }
    await page.getByRole('button', { name: '엑셀 다운로드 ▾', exact: true }).click();
    await page.waitForTimeout(300);
    await page.getByRole('menuitem', { name: /조회 목록 다운로드/ }).click();
    await page.waitForTimeout(600);
    await page.getByRole('button', { name: '엑셀 다운로드 ▾', exact: true }).click();
    await page.getByRole('menuitem', { name: /전체 다운로드/ }).click();
    await page.waitForTimeout(600);
    const [view, all] = state.logs.slice(-2);
    assert.equal(view.scopeCd, 'VIEW'); assert.equal(view.rowCnt, 3, 'view = dashboard screens'); assert.equal(view.blindCnt, 0);
    assert(String(view.condSummary).includes('대시보드'));
    assert.equal(all.scopeCd, 'ALL'); assert.equal(all.rowCnt, SCREENS.length); assert.equal(all.blindCnt, 0);
    assert.equal(view.menuId ?? view.reportId, 'sys-menu', 'download log carries screen id');

    // ── 390px 가로 스크롤 — 마지막 부서(미배정) 칸 ──
    for (const g of ['생산 및 품질 관리', '자연어 질의 이력', '시스템관리']) await page.getByRole('button', { name: `${g} 펼치기`, exact: true }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(800);
    const scroll = await table.evaluate(async (el) => {
      const holder = el.querySelector('.tabulator-tableholder');
      holder.scrollLeft = holder.scrollWidth;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const hb = holder.getBoundingClientRect();
      const header = el.querySelector('.tabulator-col[tabulator-field="dept_59"]').getBoundingClientRect();
      const cell = el.querySelector('.tabulator-row:not(.tabulator-calcs) .tabulator-cell[tabulator-field="dept_59"]').getBoundingClientRect();
      const card = el.closest('[class]').getBoundingClientRect();
      return { scrolled: holder.scrollLeft > 0, inView: header.right <= hb.right + 2 && header.left >= hb.left - 2, aligned: Math.abs(header.x - cell.x) < 2, within: hb.right <= window.innerWidth + 1 && card.right <= window.innerWidth + 1, pageScroll: document.documentElement.scrollWidth <= window.innerWidth + 1 };
    });
    assert(scroll.scrolled && scroll.inView && scroll.aligned, `rightmost dept column visible and aligned ${JSON.stringify(scroll)}`);
    assert(scroll.within, `scroll area stays inside viewport ${JSON.stringify(scroll)}`);
    assert.deepEqual(state.errors, []);
  } finally { await browser.close(); }

  // ── 2. 읽기 전용 (미배정 계정 — 접근은 있어도 쓰기 불가) ──
  const ro = await setup({ write: false });
  try {
    await ro.page.getByText('읽기 전용', { exact: false }).first().waitFor();
    const boxes = ro.page.locator('.tabulator input[type="checkbox"]');
    const n = await boxes.count();
    assert(n > 0);
    for (let i = 0; i < n; i += 1) assert(await boxes.nth(i).isDisabled(), `checkbox ${i} disabled in read-only`);
    // 개인 허용 명단 보기(n명 ▸)는 조회라 읽기 전용에서도 열립니다 — 그룹 일괄 버튼만 셉니다
    const bulk = ro.page.locator('.tabulator .tabulator-row .tbtn:not([aria-label$="보기"])');
    for (let i = 0; i < await bulk.count(); i += 1) assert(await bulk.nth(i).isDisabled(), 'group bulk disabled in read-only');
    assert(await ro.page.getByRole('button', { name: '부서 추가', exact: true }).isDisabled(), 'add dept disabled');
    assert(!(await ro.page.getByRole('button', { name: '엑셀 다운로드 ▾', exact: true }).isDisabled()), 'excel stays enabled');
    await ro.page.getByRole('button', { name: '엑셀 다운로드 ▾', exact: true }).click();
    await ro.page.getByRole('menuitem', { name: /전체 다운로드/ }).click();
    await ro.page.waitForTimeout(500);
    assert.equal(ro.state.logs.at(-1)?.scopeCd, 'ALL', 'read-only can download');
    assert.equal(ro.state.puts.length + ro.state.groups.length + ro.state.copies.length + ro.state.depts.length, 0);
    assert.deepEqual(ro.state.errors, []);
  } finally { await ro.browser.close(); }

  console.log('PASS: menu-perm — empty dept dim, parent/child confirm+warn, multi actType logs, grants popover/note, change-log card, action label, group order(menu.js), one access cell per dept, super/unassigned/admin locks, body without perm, no write-revoke confirm, 409 keep+toast, 1 group request, add dept(POST /system/depts, no system dept in init perm), header cleanup, logs paging(10/25/50/100), logs column filters + ts text/calendar, 작업자 header, tree toggle, excel VIEW/ALL blindCnt 0, read-only(unassigned), 390px scroll');
})().catch((e) => { console.error(e); process.exitCode = 1; });
