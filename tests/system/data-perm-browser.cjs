/*
 * 데이터 접근 권한(sys-data) 화면 시험 — 기획 04 6.2 (2026-10-01 신설)
 *
 * page.route 로 로그인 세션과 API 응답을 모두 흉내 냅니다(실제 API·DB 를 쓰지 않습니다).
 * 목 모드 개발 서버는 API 를 네트워크로 부르지 않아 가로챌 수 없으므로, 로컬 대상 개발 서버(npm run web)에서 돌립니다.
 *   WEB_URL=http://localhost:8081 node tests/system/data-perm-browser.cjs
 *
 * 확인하는 것
 *  · 부서 머리글 「부서명 · n명」, 통합관리자 「전 권한」·미배정 「0건 고정」, 미배정 열 전부 잠금·꺼짐(응답이 잘못 와도)
 *  · 체크 1회 본문 {deptId, fieldKey, allowed}, 응답 전 두 번째 클릭은 요청 0건, 표를 다시 만들지 않음
 *  · 서버 409 — 상태 유지 + 토스트 / 분류·적용 열
 *  · 항목 관리 — 시스템관리 화면 없음, 예약어 행 잠금, 저장 = PUT /data-fields/mapping 1건, 실패 시 고른 내용 유지,
 *    미적용 종류 안내(notApplied), 자동 적용 켜기(PATCH apply) 없음
 *  · 엑셀 옵션 패널 — 조회 목록(VIEW, 종류 행 수) · 전체(ALL, 가리는 값 포함), blindCnt 0
 *  · 읽기 전용(writePerms 에 sys-data 없음) — 체크·항목 관리 저장 비활성, 「읽기 전용」, 엑셀은 활성
 *  · 390px 에서 마지막 부서(미배정) 열 머리글·값까지 가로 스크롤, 머리글과 본문 정렬
 */
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const { WEB } = require('../lib/browser');

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

const FIELDS = [
  { key: 'qty', name: '생산·출하 수량', desc: '투입·양품·불량 수량', category: 'QTY', categoryNm: '수량', applyFlg: 'Y', builtIn: true, attrs: ['ngQty'] },
  { key: 'price', name: '단가·금액', desc: '품목 단가', category: 'COST', categoryNm: '원가', applyFlg: 'Y', builtIn: true, attrs: ['unitPrice'] },
  { key: 'f_eq', name: '설비 코드', desc: '', category: 'EQUIP', categoryNm: '설비', applyFlg: 'N', builtIn: false, attrs: ['zzEqptCode'], attrDetails: [{ attrName: 'zzEqptCode', remark: 'AI 통합 대시보드 · 설비 코드' }] },
];
const DEPTS = [
  { deptId: 1, deptNm: '통합관리자', superAdmin: true, locked: 'SUPER_ADMIN', userCnt: 1 },
  { deptId: 2, deptNm: '검증부서', userCnt: 3 },
  { deptId: 3, deptNm: '둘째부서', userCnt: 6 },
  { deptId: 59, deptNm: '미배정', unassigned: true, locked: 'UNASSIGNED', userCnt: 349 },
];

async function setup({ write = true } = {}) {
  const { page, browser } = await openFixture();
  const state = {
    // 미배정 행을 일부러 잘못 넣어도 화면은 0건으로 보여야 합니다
    matrix: { 1: FIELDS.map((f) => f.key), 2: ['qty'], 3: ['qty', 'price'], 59: ['qty'] },
    puts: [], mappings: [], applies: [], kindEdits: [], logs: [], errors: [], failPut: false, failMapping: false, delayMs: 0,
  };
  page.on('pageerror', (e) => state.errors.push(e.message));
  await page.route('**/api/v1/auth/me', (route) => route.fulfill({ json: { success: true, data: {
    user: { empNo: '10004', name: '최전산', dept: '검증부서', deptId: 2, superAdmin: false },
    dept: { deptId: 2, deptNm: '검증부서', unassigned: false },
    menuPerms: ['ai-chat', 'sys-menu', 'sys-data'], writePerms: write ? ['sys-data'] : [], dataPerms: ['qty'], dataFields: [], pwdChangeRequired: false,
  } } }));
  await page.route('**/api/v1/common/codes**', (route) => route.fulfill({ json: { success: true, data: { codes: [
    { groupCd: 'DATA_FIELD_CATEGORY', cd: 'QTY', nm: '수량', sort: 1, useYn: 'Y' },
    { groupCd: 'DATA_FIELD_CATEGORY', cd: 'EQUIP', nm: '설비', sort: 2, useYn: 'Y' },
  ] } } }));
  await page.route('**/api/v1/system/perm-logs**', (route) => route.fulfill({ json: { success: true, data: { items: [
    { ts: '2026-09-30 14:10:00', target: 'price', actType: 'DATA_PERM', detail: '품질보증팀 단가·금액 회수', by: '최전산', byEmpNo: '10004' },
  ] }, meta: { page: 1, size: 20, total: 1 } } }));
  await page.route('**/api/v1/system/data-perms/preview**', (route) => {
    state.previewEmp = new URL(route.request().url()).searchParams.get('empNo');
    return route.fulfill({ json: { success: true, data: { empNo: '10001', name: '김품질', dept: '품질보증팀', items: [
      { fieldKey: 'qty', name: '생산·출하 수량', applied: true, rendered: '원본 노출', masked: false },
      { fieldKey: 'price', name: '단가·금액', applied: true, rendered: '비공개', masked: true },
      { fieldKey: 'f_eq', name: '설비 코드', applied: false, rendered: '원본 노출', masked: false },
    ] } } });
  });
  await page.route('**/api/v1/download-logs', (route) => { state.logs.push(route.request().postDataJSON()); return route.fulfill({ json: { success: true, data: {} } }); });
  await page.route('**/api/v1/system/data-perms**', async (route) => {
    const req = route.request();
    // 미리보기는 따로 흉내 냅니다(나중에 등록한 route 가 먼저 받으므로 넘깁니다)
    if (new URL(req.url()).pathname.endsWith('/preview')) return route.fallback();
    if (req.method() === 'PUT') {
      const body = req.postDataJSON(); state.puts.push(body);
      if (state.delayMs) await new Promise((r) => setTimeout(r, state.delayMs));
      if (state.failPut) { state.failPut = false; return route.fulfill({ status: 409, json: { success: false, code: 'E-RULE-001', message: '검증용 데이터 권한 거부' } }); }
      const list = state.matrix[body.deptId] || (state.matrix[body.deptId] = []);
      if (body.allowed && !list.includes(body.fieldKey)) list.push(body.fieldKey);
      if (!body.allowed) state.matrix[body.deptId] = list.filter((k) => k !== body.fieldKey);
      return route.fulfill({ json: { success: true, message: '데이터 권한을 바꿨습니다.', data: { allowed: !!body.allowed } } });
    }
    return route.fulfill({ json: { success: true, data: { fields: FIELDS, depts: DEPTS, matrix: state.matrix } } });
  });
  await page.route('**/api/v1/system/data-fields**', async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    if (req.method() === 'PUT' && path.endsWith('/mapping')) {
      const body = req.postDataJSON(); state.mappings.push(body);
      if (state.failMapping) { state.failMapping = false; return route.fulfill({ status: 409, json: { success: false, code: 'E-RULE-001', message: '시스템이 쓰는 필드명이라 가릴 수 없습니다. [defectType]' } }); }
      const moved = body.moves.filter((m) => m.toFieldKey).map((m) => ({ attrName: m.attrName, from: null, to: m.toFieldKey }));
      const notApplied = [...new Set(moved.map((m) => m.to))].filter((k) => FIELDS.find((f) => f.key === k)?.applyFlg === 'N');
      return route.fulfill({ json: { success: true, message: `${body.moves.length}개 열을 저장했습니다.`, data: { created: [], moved, released: [], applied: [], notApplied } } });
    }
    if (req.method() === 'PUT' && /\/data-fields\/f_eq$/.test(path)) {
      state.kindEdits.push(req.postDataJSON());
      return route.fulfill({ json: { success: true, message: '데이터 항목을 수정했습니다.', data: { success: true } } });
    }
    if (req.method() === 'PATCH') { state.applies.push({ path, body: req.postDataJSON() }); return route.fulfill({ json: { success: true, message: '적용했습니다. 서버 응답에는 다음 조회부터 적용됩니다.', data: { applyFlg: 'Y' } } }); }
    return route.fulfill({ json: { success: true, data: { items: FIELDS, reservedAttrs: ['name', 'empNo', 'dept'] } } });
  });
  await page.goto(`${WEB}/system/data-perm`);
  await page.locator('.tabulator').first().waitFor();
  await page.waitForTimeout(400);
  return { page, browser, state };
}

const box = (page, label) => page.getByRole('checkbox', { name: label, exact: true });

(async () => {
  const { page, browser, state } = await setup();
  try {
    const table = page.locator('.tabulator').first();
    const header = await table.locator('.tabulator-headers').innerText();
    assert(header.includes('미배정 · 349명') && header.includes('0건 고정'), 'unassigned header');
    assert(header.includes('통합관리자 · 1명') && header.includes('전 권한'), 'super admin header');
    assert(header.includes('검증부서 · 3명'), 'dept header with account count');
    for (const f of FIELDS) {
      const cell = box(page, `${f.name} · 미배정 열람 허용`);
      assert(await cell.isDisabled(), `unassigned locked ${f.key}`);
      assert(!(await cell.isChecked()), `unassigned shows 0 (${f.key})`);
      assert(await box(page, `${f.name} · 통합관리자 열람 허용`).isDisabled());
    }
    assert.equal(await table.locator('.tabulator-cell[tabulator-field="applyLabel"]', { hasText: '미적용' }).count(), 1, 'apply column');
    assert.equal(await table.locator('.tabulator-cell[tabulator-field="categoryNm"]', { hasText: '원가' }).count(), 1, 'category column');

    // 포함 데이터 요약(DTP-07) · 기본 7종 적용 고정(DTP-05) · 적용 켜기 확인(DTP-04)
    assert.equal(await table.locator('.tabulator-cell[tabulator-field="included"]', { hasText: '설비 코드' }).count(), 1, 'included summary from attrDetails');
    assert.equal(await table.locator('.tabulator-cell[tabulator-field="applyLabel"]', { hasText: '적용 중 (고정)' }).count(), 2, 'built-in fixed');
    assert.equal(await page.getByRole('button', { name: '생산·출하 수량 적용 끄기', exact: true }).count(), 0, 'no off button for built-in');
    await page.getByRole('button', { name: '설비 코드 적용 켜기', exact: true }).click();
    await page.getByText('가려지는 부서', { exact: false }).first().waitFor();
    assert(await page.getByText('미배정 349명 — 미배정은 고정', { exact: false }).first().isVisible(), 'unassigned always listed as hidden');
    assert.equal(state.applies.length, 0, 'no request before confirm');
    await page.getByRole('button', { name: '적용', exact: true }).click();
    await page.waitForTimeout(600);
    assert.equal(state.applies.length, 1);
    assert(state.applies[0].path.endsWith('/f_eq/apply') && state.applies[0].body.on === true, 'PATCH apply on');

    // 계정으로 확인 · 변경 이력 (DTP-10)
    await page.getByPlaceholder('예) 10001').fill('10001');
    await page.getByRole('button', { name: '확인', exact: true }).click();
    await page.getByText('김품질(10001) · 품질보증팀').waitFor();
    assert.equal(state.previewEmp, '10001');
    assert(await page.getByText('●●●● 비공개').first().isVisible());
    assert(await page.getByText('미적용 — 가리지 않음').first().isVisible());
    await page.getByText('품질보증팀 단가·금액 회수').waitFor();
    assert.equal(await page.getByRole('button', { name: '보안 감사 로그에서 더 보기', exact: true }).count(), 0, 'no audit link without sys-audit');
    state.applies.length = 0;

    // 체크 1회 — 응답 전 두 번째 클릭은 요청 0건, 표는 그대로
    await table.evaluate((el) => { el.dataset.mark = 'same'; });
    state.delayMs = 400;
    await box(page, '단가·금액 · 검증부서 열람 허용').click();
    await box(page, '단가·금액 · 검증부서 열람 허용').click({ force: true }).catch(() => {});
    await page.waitForTimeout(1200);
    state.delayMs = 0;
    assert.equal(state.puts.length, 1, 'second click during save makes no request');
    assert.deepEqual(state.puts[0], { deptId: '2', fieldKey: 'price', allowed: true });
    assert(await box(page, '단가·금액 · 검증부서 열람 허용').isChecked());
    assert.equal(await page.locator('.tabulator[data-mark="same"]').count(), 1, 'table not rebuilt');

    // 서버 409 — 상태 유지 + 토스트
    state.failPut = true;
    await box(page, '생산·출하 수량 · 둘째부서 열람 허용').click();
    await page.getByText('검증용 데이터 권한 거부').first().waitFor();
    assert(await box(page, '생산·출하 수량 · 둘째부서 열람 허용').isChecked(), 'failed save keeps state');

    // ── 항목 관리 ──
    await page.getByRole('button', { name: '항목 관리', exact: true }).click();
    const screenSelect = page.getByRole('combobox', { name: '화면' });
    await screenSelect.waitFor();
    const screenOptions = await screenSelect.locator('option').allTextContents();
    assert(!screenOptions.some((t) => t.startsWith('시스템관리')), 'no system screens');
    assert(screenOptions.some((t) => t.includes('AI 통합 대시보드')));
    await screenSelect.selectOption('chat-history');
    const reserved = page.getByRole('checkbox', { name: '부서·사용자 가리기', exact: true });
    await reserved.waitFor();
    assert.equal(await reserved.getAttribute('aria-disabled'), 'true', 'reserved attr locked');
    await screenSelect.selectOption('dash-ai');
    await page.getByRole('checkbox', { name: '불량 유형 가리기', exact: true }).click();
    // 종류를 미적용 종류(설비 코드)로 바꿉니다
    await page.locator('select').filter({ has: page.locator('option', { hasText: '설비 코드 (미적용)' }) }).first().selectOption('f_eq');
    state.failMapping = true;
    await page.getByRole('button', { name: '저장', exact: true }).click();
    await page.getByText('시스템이 쓰는 필드명이라 가릴 수 없습니다. [defectType]', { exact: false }).first().waitFor();
    assert.equal(state.mappings.length, 1, 'one mapping request');
    assert.deepEqual(state.mappings[0], {
      screenId: 'dash-ai', newFields: [],
      moves: [{ attrName: 'defectType', toFieldKey: 'f_eq', remark: 'AI 통합 대시보드 · 불량 유형' }],
    });
    assert(await page.getByText('바꾼 열 1개', { exact: false }).isVisible(), 'draft kept after failure');
    await page.getByRole('button', { name: '저장', exact: true }).click();
    await page.getByText('「설비 코드」 종류는 미적용 상태입니다', { exact: false }).first().waitFor();
    assert.equal(state.mappings.length, 2);
    assert.equal(state.applies.length, 0, 'no automatic apply');

    // 종류 편집 (DTP-11) — 51자는 화면에서 막고, 고친 값은 PUT /data-fields/{key}
    await page.getByRole('button', { name: '편집', exact: true }).nth(2).click();
    const nameInput = page.getByPlaceholder('예) LOT·시리얼 · 작업자 연락처');
    await nameInput.fill('가'.repeat(51));
    await page.getByRole('button', { name: '저장', exact: true }).last().click();
    await page.getByText('종류 이름은 50자 이내로 입력해 주세요.').waitFor();
    assert.equal(state.kindEdits.length, 0, 'too long name never sent');
    await nameInput.fill('설비 코드2');
    await page.getByPlaceholder('이 종류로 무엇을 가리는지 (300자 이내)').fill('설비 코드와 설비명');
    await page.getByRole('button', { name: '저장', exact: true }).last().click();
    await page.getByText('데이터 항목을 수정했습니다.').first().waitFor();
    assert.deepEqual(state.kindEdits[0], { name: '설비 코드2', desc: '설비 코드와 설비명', category: 'EQUIP' });

    // 닫기 전 확인 (DTP-14) — 바꾼 열이 있으면 묻습니다
    await page.getByRole('checkbox', { name: '불량 유형 가리기', exact: true }).click();
    await page.getByRole('button', { name: '닫기', exact: true }).last().click();
    await page.getByText('저장되지 않았습니다. 닫으면 버립니다', { exact: false }).waitFor();
    await page.getByRole('button', { name: '버리고 닫기', exact: true }).click();
    await page.getByRole('combobox', { name: '화면' }).waitFor({ state: 'detached' });
    await page.waitForTimeout(300);

    // ── 엑셀 옵션 패널 ──
    await page.getByRole('button', { name: '엑셀 다운로드 ▾', exact: true }).click();
    await page.getByRole('menuitem', { name: /조회 목록 다운로드/ }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: '엑셀 다운로드 ▾', exact: true }).click();
    await page.getByRole('menuitem', { name: /전체 다운로드/ }).click();
    await page.waitForTimeout(800);
    const [view, all] = state.logs.slice(-2);
    assert.equal(view.scopeCd, 'VIEW'); assert.equal(view.rowCnt, FIELDS.length); assert.equal(view.blindCnt, 0); assert.equal(view.menuId ?? view.reportId, 'sys-data');
    assert.equal(all.scopeCd, 'ALL'); assert(all.rowCnt > FIELDS.length, 'all includes 가리는 값 rows'); assert.equal(all.blindCnt, 0);

    // ── 390px 가로 스크롤 ──
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(800);
    const scroll = await table.evaluate(async (el) => {
      const holder = el.querySelector('.tabulator-tableholder');
      holder.scrollLeft = holder.scrollWidth;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const hb = holder.getBoundingClientRect();
      const head = el.querySelector('.tabulator-col[tabulator-field="dept_59"]').getBoundingClientRect();
      const cell = el.querySelector('.tabulator-row:not(.tabulator-calcs) .tabulator-cell[tabulator-field="dept_59"]').getBoundingClientRect();
      return { scrolled: holder.scrollLeft > 0, inView: head.right <= hb.right + 2 && head.left >= hb.left - 2, aligned: Math.abs(head.x - cell.x) < 2, within: hb.right <= window.innerWidth + 1 };
    });
    assert(scroll.scrolled && scroll.inView && scroll.aligned && scroll.within, `rightmost dept visible ${JSON.stringify(scroll)}`);
    assert.deepEqual(state.errors, []);
  } finally { await browser.close(); }

  // ── 읽기 전용 ──
  const ro = await setup({ write: false });
  try {
    await ro.page.getByText('읽기 전용', { exact: false }).first().waitFor();
    const boxes = ro.page.locator('.tabulator input[type="checkbox"]');
    for (let i = 0; i < await boxes.count(); i += 1) assert(await boxes.nth(i).isDisabled(), 'read-only checkbox disabled');
    await ro.page.getByRole('button', { name: '항목 관리', exact: true }).click();
    const first = ro.page.getByRole('checkbox', { name: '불량 유형 가리기', exact: true });
    await first.waitFor();
    assert.equal(await first.getAttribute('aria-disabled'), 'true', 'field manager read-only');
    await ro.page.getByRole('button', { name: '닫기', exact: true }).last().click();
    await ro.page.getByRole('button', { name: '엑셀 다운로드 ▾', exact: true }).click();
    await ro.page.getByRole('menuitem', { name: /조회 목록 다운로드/ }).click();
    await ro.page.waitForTimeout(500);
    assert.equal(ro.state.logs.at(-1)?.scopeCd, 'VIEW', 'read-only can download');
    assert.equal(ro.state.puts.length + ro.state.mappings.length, 0);
    assert.deepEqual(ro.state.errors, []);
  } finally { await ro.browser.close(); }

  console.log('PASS: data-perm — kind edit(50자 검사·PUT), close guard, included summary, built-in fixed, apply confirm+PATCH, account preview, change log, dept headers/locks(super·unassigned 0건), single request while saving, no rebuild, 409 keep+toast, category/apply columns, field manager(no system screens, reserved locked, 1 mapping request, draft kept on failure, notApplied notice, no auto apply), excel VIEW/ALL blindCnt 0, read-only, 390px scroll');
})().catch((e) => { console.error(e); process.exitCode = 1; });
