/*
 * 메뉴 접근 권한(sys-menu) 화면 시험 — 기획 03 6.2 (2026-10-01 개편)
 *
 * page.route 로 로그인 세션과 API 응답을 모두 흉내 냅니다(실제 API·DB 를 쓰지 않습니다).
 * 목 모드 개발 서버는 API 를 네트워크로 부르지 않아 가로챌 수 없으므로, 로컬 대상 개발 서버(npm run web)에서 돌립니다.
 *   WEB_URL=http://localhost:8081 node tests/system/menu-perm-browser.cjs
 *
 * 확인하는 것
 *  · 대그룹 순서(menu.js), 부서마다 조회·쓰기 두 칸, 통합관리자·미배정 열 잠금, 미배정 머리글 「고정(5화면) · 변경 불가」
 *  · 관리 화면 행 잠금(canEditAdminScreens=false), 조회가 꺼진 칸의 쓰기 잠금, 개인 허용 n명
 *  · 쓰기 체크 본문 perm:'WRITE', 조회 해제 확인 창(쓰기도 회수), 서버 409 시 상태 유지 + 토스트
 *  · 그룹 일괄 = PUT /group 1건(groupId·perm·includeActions:false), 관리 화면 그룹은 비관리자에게 잠금
 *  · 복사 2단계 — 기본값 없음·미배정 없음·빈 값 미리보기는 요청 0건·dryRun → requiresSuperAdmin 이면 실행 잠금 → 실행 본문 expectedHash
 *  · 엑셀 옵션 패널 — 조회 목록(펼친 그룹만, VIEW) · 전체(ALL), blindCnt 0
 *  · 읽기 전용(writePerms 에 sys-menu 없음) — 모든 체크·복사 비활성, 「읽기 전용」, 엑셀은 활성
 *  · 390px 에서 마지막 부서(미배정) 쓰기 칸 머리글·값까지 가로 스크롤, 머리글과 본문 정렬
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

function me({ write = true } = {}) {
  return {
    user: { empNo: '10004', name: '최전산', dept: '검증부서', deptId: 2, pos: 'SENIOR', superAdmin: false },
    dept: { deptId: 2, deptNm: '검증부서', superAdmin: false, unassigned: false },
    menuPerms: ['ai-chat', 'sys-menu', 'sys-data', 'sys-account', 'sys-audit'],
    writePerms: write ? ['sys-menu'] : [],
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
    writeMatrix: { 2: ['prod-result', 'sys-menu'], 3: [], 59: [] },
    puts: [], groups: [], copies: [], logs: [], errors: [], failNext: false, previewAdmin: true,
  };
  page.on('pageerror', (e) => state.errors.push(e.message));
  await page.route('**/api/v1/auth/me', (route) => route.fulfill({ json: { success: true, data: me({ write }) } }));
  await page.route('**/api/v1/system/perm-logs**', (route) => {
    state.logReads = (state.logReads || 0) + 1;
    state.logActType = new URL(route.request().url()).searchParams.get('actType');
    return route.fulfill({ json: { success: true, data: { items: [
      { ts: '2026-10-01 14:02:00', target: '검증부서 / prod-result', actType: 'MENU_PERM', detail: '메뉴 권한 회수(조회)', by: '최전산', byEmpNo: '10004' },
    ] }, meta: { page: 1, size: 20, total: 1 } } });
  });
  await page.route('**/api/v1/download-logs', (route) => { state.logs.push(route.request().postDataJSON()); return route.fulfill({ json: { success: true, data: {} } }); });
  await page.route('**/api/v1/system/menu-perms**', async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    const ok = (data, message = '저장 완료') => route.fulfill({ json: { success: true, message, data } });
    if (req.method() === 'PUT' && path.endsWith('/group')) {
      const body = req.postDataJSON(); state.groups.push(body);
      const ids = SCREENS.filter((s) => s.groupId === body.groupId && s.kind !== 'ACTION').map((s) => s.id);
      const list = body.perm === 'WRITE' ? state.writeMatrix : state.matrix;
      list[body.deptId] = [...new Set([...(list[body.deptId] || []).filter((id) => !ids.includes(id)), ...(body.allowed ? ids : [])])];
      return ok({ changedCnt: ids.length, added: body.allowed ? ids : [], removed: body.allowed ? [] : ids }, '그룹 권한이 변경되었습니다.');
    }
    if (req.method() === 'PUT') {
      const body = req.postDataJSON(); state.puts.push(body);
      if (state.failNext) { state.failNext = false; return route.fulfill({ status: 409, json: { success: false, code: 'E-RULE-001', message: '검증용 거부 메시지' } }); }
      const read = state.matrix[body.deptId] || (state.matrix[body.deptId] = []);
      const wr = state.writeMatrix[body.deptId] || (state.writeMatrix[body.deptId] = []);
      const add = (l) => { if (!l.includes(body.screenId)) l.push(body.screenId); };
      const del = (l) => { const i = l.indexOf(body.screenId); if (i >= 0) l.splice(i, 1); };
      if (body.perm === 'WRITE') { if (body.allowed) { add(read); add(wr); } else del(wr); } else if (body.allowed) add(read); else { del(read); del(wr); }
      return ok({ success: true, read: read.includes(body.screenId), write: wr.includes(body.screenId) });
    }
    if (req.method() === 'POST' && path.endsWith('/copy')) {
      const body = req.postDataJSON(); state.copies.push(body);
      if (body.dryRun) {
        return ok({
          dryRun: true, from: { deptId: 2, deptNm: '검증부서' }, to: { deptId: 3, deptNm: '둘째부서', userCnt: 6 },
          added: [{ id: 'dash-ai', read: true, write: false }, ...(state.previewAdmin ? [{ id: 'sys-menu', read: true, write: true }] : [])],
          removed: [],
          adminScreensChanged: state.previewAdmin ? ['sys-menu'] : [],
          requiresSuperAdmin: state.previewAdmin,
          expectedHash: state.previewAdmin ? 'hash-admin' : 'hash-1',
        }, '미리보기');
      }
      return ok({ copiedCnt: 1, added: ['dash-ai'], removed: [] }, '권한이 복사되었습니다.');
    }
    return ok({
      screens: SCREENS, depts: DEPTS, matrix: state.matrix, writeMatrix: state.writeMatrix,
      grantCounts: { 'prod-result': 1 },
      grants: { 'prod-result': [{ empNo: '10009', name: '개인허용자', deptId: 2, write: false }] },
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
  // ── 1. 쓰기 권한이 있는 전산팀 계정 ─────────────────────
  const { page, browser, state } = await setup();
  try {
    const table = page.locator('.tabulator').first();
    // 대그룹 순서 — menu.js 정의 순서(대시보드 → 생산 및 품질 관리 → 자연어 질의 이력 → 시스템관리)
    const groups = await table.locator('.tabulator-row .tbtn[aria-expanded]').allTextContents();
    assert.deepEqual(groups.map((t) => t.replace(/^[−+]\s*/, '')), ['대시보드', '생산 및 품질 관리', '자연어 질의 이력', '시스템관리'], 'group order follows menu.js');
    // 머리글 — 부서명 · n명, 미배정 고정 표기
    const headerText = await table.locator('.tabulator-headers').innerText();
    assert(headerText.includes('미배정 · 349명') && headerText.includes('고정(5화면) · 변경 불가'), 'unassigned header');
    assert(headerText.includes('통합관리자 · 1명') && headerText.includes('전 권한'), 'super admin header');
    assert.equal(await table.locator('.tabulator-col[tabulator-field="dept_2_read"]').count(), 1);
    assert.equal(await table.locator('.tabulator-col[tabulator-field="dept_2_write"]').count(), 1);
    // 잠금 — 통합관리자·미배정 열, 관리 화면 행, 조회 꺼진 쓰기 칸
    assert(await box(page, '실적 집계·조회 · 통합관리자 조회 허용').isDisabled(), 'super admin locked');
    for (const label of ['AI 통합 대시보드 · 미배정 조회 허용', 'AI 통합 대시보드 · 미배정 쓰기 허용', '자연어 질의 이력 · 미배정 조회 허용']) {
      assert(await box(page, label).isDisabled(), `unassigned locked: ${label}`);
    }
    assert(await box(page, 'AI 통합 대시보드 · 미배정 조회 허용').isChecked(), 'unassigned shows fixed screens');
    assert(await box(page, '메뉴 접근 권한 · 검증부서 조회 허용').isDisabled(), 'admin screen row locked for non super admin');
    assert(await box(page, '실적 집계·조회 · 둘째부서 쓰기 허용').isDisabled(), 'write needs read');
    assert(!(await box(page, '보안 감사 로그 · 검증부서 조회 허용').isDisabled()), 'sys-audit not locked');
    // 화면 이름 접미 · 개인 허용 열
    assert.equal(await table.getByText('메뉴 접근 권한 (관리)', { exact: true }).count(), 1);
    assert.equal(await table.getByText('자연어 질의 이력 (전사 공통)', { exact: true }).count(), 1);
    assert.equal(await table.locator('.tabulator-cell[tabulator-field="grantCount"]', { hasText: '1명' }).count(), 1, 'grant count');
    assert(await page.getByRole('button', { name: '시스템관리 검증부서 조회 전체 허용', exact: true }).isDisabled(), 'admin group bulk locked');

    // 쓰기 칸 체크 → perm:'WRITE'
    await box(page, 'AI 통합 대시보드 · 검증부서 쓰기 허용').click();
    await page.waitForTimeout(500);
    assert.deepEqual(state.puts.at(-1), { deptId: '2', screenId: 'dash-ai', allowed: true, perm: 'WRITE' });
    assert(await box(page, 'AI 통합 대시보드 · 검증부서 쓰기 허용').isChecked());

    // 조회 해제 → 확인 창(쓰기도 회수) → READ 해제 → 쓰기 칸도 꺼지고 잠김
    const before = state.puts.length;
    await box(page, '실적 집계·조회 · 검증부서 조회 허용').click();
    await page.getByText('쓰기 권한도 함께 회수됩니다', { exact: false }).first().waitFor();
    assert.equal(state.puts.length, before, 'no request before confirm');
    await page.getByRole('button', { name: '회수', exact: true }).click();
    await page.waitForTimeout(600);
    assert.deepEqual(state.puts.at(-1), { deptId: '2', screenId: 'prod-result', allowed: false, perm: 'READ' });
    await page.getByText('개인 허용 1명은 계속 접근합니다', { exact: false }).first().waitFor();
    assert(!(await box(page, '실적 집계·조회 · 검증부서 쓰기 허용').isChecked()));
    assert(await box(page, '실적 집계·조회 · 검증부서 쓰기 허용').isDisabled());

    // 서버 409 — 상태 유지 + 서버 메시지 토스트
    state.failNext = true;
    await box(page, '생산 모니터링 · 검증부서 조회 허용').click();
    await page.getByText('검증용 거부 메시지').first().waitFor();
    assert(!(await box(page, '생산 모니터링 · 검증부서 조회 허용').isChecked()), 'failed save retains old state');

    // 그룹 일괄 — 요청 1건, 본문 groupId·perm·includeActions:false, 동작 행은 그대로
    await page.getByRole('button', { name: '대시보드 둘째부서 조회 전체 허용', exact: true }).click();
    await page.waitForTimeout(600);
    assert.equal(state.groups.length, 1, 'one group request');
    assert.deepEqual(state.groups[0], { deptId: '3', groupId: 'dashboard', allowed: true, perm: 'READ', includeActions: false });
    assert(await box(page, '생산 모니터링 · 둘째부서 조회 허용').isChecked());
    assert(!(await box(page, 'AI 통합 대시보드 › 업로드 리포트 업로드 · 둘째부서 조회 허용').isChecked()), 'action row untouched');

    // 개인 허용 명단(MNP-06) · 변경 이력 카드(MNP-07) · 동작 행 표기(MNP-05)
    await page.getByRole('button', { name: '실적 집계·조회 개인 허용 1명 보기', exact: true }).click();
    await page.getByText('개인허용자 (10009) · 검증부서').waitFor();
    await page.getByRole('button', { name: '닫기', exact: true }).last().click();
    await page.getByText('개인허용자 (10009) · 검증부서').waitFor({ state: 'detached' });
    assert.equal(await table.locator('.tabulator-cell[tabulator-field="kindLabel"]', { hasText: '동작(쓰기)' }).count(), 1, 'action row label');
    const logCard = page.locator('.tabulator').nth(1);
    await logCard.getByText('검증부서 / 실적 집계·조회').waitFor();
    assert.equal(await logCard.getByText('최전산(10004)').count(), 1, 'log performer');
    assert.equal(await page.getByRole('button', { name: '보안 감사 로그에서 더 보기', exact: true }).count(), 1, 'audit link with sys-audit');
    assert((state.logReads || 0) >= 2, 'logs reloaded after save');
    assert.equal(state.logActType, 'MENU_PERM,USER_MENU_PERM', 'logs include account grants');

    // MNP-09 계정 0명 부서 흐림 · MNP-10 상위 꺼진 하위 화면 주의 표시 · 상위 끄기 시 하위 함께 끄기
    assert.equal(await table.locator('.tabulator-headers div[style*="opacity"]', { hasText: '빈부서 · 0명' }).count(), 1, 'empty dept dimmed');
    assert.equal(await page.getByRole('img', { name: /상위 화면 「AI 통합 대시보드」 이 꺼져 있어/ }).count(), 1, 'child-without-parent warning');
    const beforeChild = state.puts.length;
    await box(page, 'AI 통합 대시보드 · 검증부서 조회 허용').click();
    await page.getByText('도 함께 끌까요?', { exact: false }).first().waitFor();
    await page.getByRole('button', { name: '함께 끄기', exact: true }).click();
    await page.waitForTimeout(800);
    assert.deepEqual(state.puts.slice(beforeChild), [
      { deptId: '2', screenId: 'dash-ai', allowed: false, perm: 'READ' },
      { deptId: '2', screenId: 'dash-ai-upload', allowed: false, perm: 'READ' },
    ], 'parent then child turned off');
    await page.getByText('하위 화면 1개도 함께 껐습니다', { exact: false }).first().waitFor();

    // ── 복사 2단계 ──
    await page.getByRole('button', { name: '부서 권한 복사', exact: true }).click();
    const from = page.getByRole('combobox', { name: '복사할 부서 (원본)' });
    const to = page.getByRole('combobox', { name: '적용할 부서 (대상)' });
    await from.waitFor();
    assert.equal(await from.inputValue(), '', 'no default source');
    assert.equal(await to.inputValue(), '', 'no default target');
    const fromOptions = await from.locator('option').allTextContents();
    const toOptions = await to.locator('option').allTextContents();
    assert(!fromOptions.some((t) => t.includes('미배정')), 'no unassigned in source');
    assert(!toOptions.some((t) => t.includes('미배정') || t.includes('통합관리자')), 'no unassigned/super in target');
    assert(fromOptions.includes('검증부서 (계정 3명)'), 'label with account count');
    await page.getByRole('button', { name: '미리보기', exact: true }).click();
    await page.getByText('복사할 부서(원본)를 고르세요.').waitFor();
    assert.equal(state.copies.length, 0, 'empty preview sends nothing');
    await from.selectOption('2');
    await to.selectOption('3');
    await page.getByRole('button', { name: '미리보기', exact: true }).click();
    await page.getByText('통합관리자만 실행할 수 있습니다', { exact: false }).waitFor();
    assert.deepEqual(state.copies.at(-1), { fromDeptId: '2', toDeptId: '3', dryRun: true });
    assert(await page.getByText('원본: 검증부서 → 대상: 둘째부서 · 계정 6명', { exact: true }).isVisible(), 'preview shows affected accounts');
    assert(await page.getByRole('button', { name: '복사', exact: true }).isDisabled(), 'admin change blocks non super admin');
    state.previewAdmin = false;
    await page.getByRole('button', { name: '미리보기', exact: true }).click();
    await page.getByText('위 내용을 확인했습니다').waitFor();
    assert(await page.getByRole('button', { name: '복사', exact: true }).isDisabled(), 'needs confirmation');
    await page.getByText('위 내용을 확인했습니다').click();
    await page.getByRole('button', { name: '복사', exact: true }).click();
    await page.waitForTimeout(600);
    assert.deepEqual(state.copies.at(-1), { fromDeptId: '2', toDeptId: '3', dryRun: false, expectedHash: 'hash-1' });

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

    // ── 390px 가로 스크롤 — 마지막 부서(미배정) 쓰기 칸 ──
    for (const g of ['생산 및 품질 관리', '자연어 질의 이력', '시스템관리']) await page.getByRole('button', { name: `${g} 펼치기`, exact: true }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(800);
    const scroll = await table.evaluate(async (el) => {
      const holder = el.querySelector('.tabulator-tableholder');
      holder.scrollLeft = holder.scrollWidth;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const hb = holder.getBoundingClientRect();
      const header = el.querySelector('.tabulator-col[tabulator-field="dept_59_write"]').getBoundingClientRect();
      const cell = el.querySelector('.tabulator-row:not(.tabulator-calcs) .tabulator-cell[tabulator-field="dept_59_write"]').getBoundingClientRect();
      const card = el.closest('[class]').getBoundingClientRect();
      return { scrolled: holder.scrollLeft > 0, inView: header.right <= hb.right + 2 && header.left >= hb.left - 2, aligned: Math.abs(header.x - cell.x) < 2, within: hb.right <= window.innerWidth + 1 && card.right <= window.innerWidth + 1, pageScroll: document.documentElement.scrollWidth <= window.innerWidth + 1 };
    });
    assert(scroll.scrolled && scroll.inView && scroll.aligned, `rightmost write column visible and aligned ${JSON.stringify(scroll)}`);
    assert(scroll.within, `scroll area stays inside viewport ${JSON.stringify(scroll)}`);
    assert.deepEqual(state.errors, []);
  } finally { await browser.close(); }

  // ── 2. 읽기 전용 (writePerms 에 sys-menu 없음) ───────────
  const ro = await setup({ write: false });
  try {
    await ro.page.getByText('읽기 전용', { exact: false }).first().waitFor();
    const boxes = ro.page.locator('.tabulator input[type="checkbox"]');
    const n = await boxes.count();
    assert(n > 0);
    for (let i = 0; i < n; i += 1) assert(await boxes.nth(i).isDisabled(), `checkbox ${i} disabled in read-only`);
    // 개인 허용 명단 보기(n명 ▸)는 조회라 읽기 전용에서도 열립니다 — 그룹 일괄 버튼만 셉니다
    const bulk = ro.page.locator('.tabulator .tabulator-row .tbtn:not([aria-expanded]):not([aria-label$="보기"])');
    for (let i = 0; i < await bulk.count(); i += 1) assert(await bulk.nth(i).isDisabled(), 'group bulk disabled in read-only');
    assert(await ro.page.getByRole('button', { name: '부서 권한 복사', exact: true }).isDisabled(), 'copy disabled');
    assert(!(await ro.page.getByRole('button', { name: '엑셀 다운로드 ▾', exact: true }).isDisabled()), 'excel stays enabled');
    await ro.page.getByRole('button', { name: '엑셀 다운로드 ▾', exact: true }).click();
    await ro.page.getByRole('menuitem', { name: /전체 다운로드/ }).click();
    await ro.page.waitForTimeout(500);
    assert.equal(ro.state.logs.at(-1)?.scopeCd, 'ALL', 'read-only can download');
    assert.equal(ro.state.puts.length + ro.state.groups.length + ro.state.copies.length, 0);
    assert.deepEqual(ro.state.errors, []);
  } finally { await ro.browser.close(); }

  console.log('PASS: menu-perm — empty dept dim, parent/child confirm+warn, multi actType logs, grants popover/note, change-log card, action label, group order(menu.js), read/write cells, super/unassigned/admin locks, write perm body, read-off confirm, 409 keep+toast, 1 group request, copy 2-step(no default/no unassigned/dryRun/requiresSuperAdmin/expectedHash), excel VIEW/ALL blindCnt 0, read-only, 390px scroll');
})().catch((e) => { console.error(e); process.exitCode = 1; });
