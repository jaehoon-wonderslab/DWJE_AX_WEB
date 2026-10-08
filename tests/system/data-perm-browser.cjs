/*
 * 데이터 접근 권한(sys-data) 화면 시험 — 기획 04 6.2 (2026-10-01 신설)
 *
 * page.route 로 로그인 세션과 API 응답을 모두 흉내 냅니다(실제 API·DB 를 쓰지 않습니다).
 * 목 모드 개발 서버는 API 를 네트워크로 부르지 않아 가로챌 수 없으므로, 로컬 대상 개발 서버(npm run web)에서 돌립니다.
 *   WEB_URL=http://localhost:8081 node tests/system/data-perm-browser.cjs
 *
 * 확인하는 것 (2026-10-07 항목 단위 권한 — 「항목 × 부서」 표 하나, 항목 관리 모달 · 종류 표는 「제거됨」)
 *  · 머리글: 항목 · 출력 화면 · 부서(「부서명 · n명」, 통합관리자 부제 없음, 미배정 「0건 고정」), [항목 관리] · 포함 데이터 · 적용 열 없음
 *  · 안내 상자(표의 행 · 부서 칸 체크 · 저장 · 가릴 수 없는 항목), 머리글 필터, 쪽 나누기 10 · 25 · 50(기본) · 100
 *  · 통합관리자 · 미배정 칸 잠금(미배정은 꺼짐), 가릴 수 없는 항목(공용 키) 칸 잠금 + 이유
 *  · 체크 1회 = PUT /system/data-fields/item-perms {name, attrs, perms} 1건, 응답 전 두 번째 클릭은 요청 0건, 표를 다시 만들지 않음
 *  · 새로 발견된 응답 데이터(2026-10-08) — 안내 → 탭, 화면 · 추천 · 공용 키 표시, [항목 지정](기존 = item-perms 그 항목 키 + 새 이름 · 새 항목 = 제안 이름), 가리지 않음 = discovered/ignore
 *  · 서버 409 — 상태 유지 + 토스트 / 변경 이력 탭 / 엑셀 항목 × 부서(VIEW · ALL, blindCnt 0) / 390px 가로 스크롤 / 읽기 전용
 */
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const { WEB } = require('../lib/browser');
const { readXlsx } = require('../lib/xlsx');

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
  { key: 'qty', name: '생산·출하 수량', desc: '투입·양품·불량 수량', applyFlg: 'Y', builtIn: true, attrs: ['ngQty'] },
  { key: 'price', name: '단가·금액', desc: '품목 단가', applyFlg: 'Y', builtIn: true, attrs: ['unitPrice'] },
  { key: 'f_eq', name: '설비 코드', desc: '', applyFlg: 'N', builtIn: false, attrs: ['zzEqptCode'], attrDetails: [{ attrName: 'zzEqptCode', remark: 'AI 통합 대시보드 · 설비 코드' }] },
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
    puts: [], itemPerms: [], ignores: [], mappings: [], applies: [],
    found: [
      { attrName: 'ngQtyDaily', firstSeenAt: '2026-10-08T09:30:00', lastSeenAt: '2026-10-08T09:40:00', seenCnt: 2, apiPaths: ['/api/v1/dashboard/ai/summary'], status: 'NEW' },
      { attrName: 'reworkCnt', firstSeenAt: '2026-10-08T09:12:00', lastSeenAt: '2026-10-08T09:12:00', seenCnt: 1, apiPaths: ['/api/v1/quality/aoi/dimension/summary'], status: 'NEW' },
      { attrName: 'lrrCnt', firstSeenAt: '2026-10-08T09:22:00', lastSeenAt: '2026-10-08T09:51:00', seenCnt: 2, apiPaths: ['/api/v1/reports/lrr-by-customer'], status: 'NEW' },
      { attrName: 'loss', firstSeenAt: '2026-10-08T09:51:00', lastSeenAt: '2026-10-08T09:51:00', seenCnt: 1, apiPaths: ['/api/v1/reports/yield-by-model'], status: 'NEW' },
      { attrName: 'amount', firstSeenAt: '2026-10-08T09:12:00', lastSeenAt: '2026-10-08T09:12:00', seenCnt: 1, apiPaths: ['/api/v1/quality/aoi/dimension/summary'], status: 'NEW' },
    ], kindEdits: [], logs: [], errors: [], failPut: false, failMapping: false, delayMs: 0,
  };
  page.on('pageerror', (e) => state.errors.push(e.message));
  await page.route('**/api/v1/auth/me', (route) => route.fulfill({ json: { success: true, data: {
    user: { empNo: '10004', name: '최전산', dept: '검증부서', deptId: 2, superAdmin: false },
    dept: { deptId: 2, deptNm: '검증부서', unassigned: !write },
    menuPerms: ['ai-chat', 'sys-menu', 'sys-data'], writePerms: write ? ['sys-data'] : [], dataPerms: ['qty'], dataFields: [], pwdChangeRequired: false,
  } } }));
  await page.route('**/api/v1/common/codes**', (route) => route.fulfill({ json: { success: true, data: { codes: [
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
    return route.fulfill({ json: { success: true, data: { fields: FIELDS, depts: DEPTS, matrix: state.matrix, reservedAttrs: ['name', 'empNo', 'dept', 'question'] } } });
  });
  await page.route('**/api/v1/system/data-fields**', async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    // 새로 발견된 응답 데이터(2026-10-08, V83)
    if (req.method() === 'GET' && path.endsWith('/discovered')) {
      return route.fulfill({ json: { success: true, data: { ready: true, items: state.found } } });
    }
    if (req.method() === 'PUT' && path.endsWith('/discovered/ignore')) {
      const body = req.postDataJSON(); state.ignores.push(body);
      state.found.forEach((x) => { if (body.attrNames.includes(x.attrName)) x.status = body.ignore ? 'IGNORED' : 'NEW'; });
      return route.fulfill({ json: { success: true, message: '가리지 않음으로 처리했습니다.', data: { attrNames: body.attrNames, status: body.ignore ? 'IGNORED' : 'NEW' } } });
    }
    // 항목별 부서 열람(2026-10-07, V82) — 시험에서는 필드명이 든 종류의 칸을 바꾼 것으로 흉내 냅니다
    if (req.method() === 'PUT' && path.endsWith('/item-perms')) {
      const body = req.postDataJSON(); state.itemPerms.push(body);
      if (state.delayMs) await new Promise((r) => setTimeout(r, state.delayMs));
      if (state.failPut) { state.failPut = false; return route.fulfill({ status: 409, json: { success: false, code: 'E-RULE-001', message: '검증용 데이터 권한 거부' } }); }
      const owner = FIELDS.find((f) => f.attrs.includes(body.attrs[0]))?.key;
      Object.entries(body.perms).forEach(([d, allowed]) => {
        const list = state.matrix[d] || (state.matrix[d] = []);
        if (allowed && owner && !list.includes(owner)) list.push(owner);
        if (!allowed) state.matrix[d] = list.filter((k) => k !== owner);
      });
      return route.fulfill({ json: { success: true, message: '항목 권한을 저장했습니다.', data: { fieldKey: owner, created: false, removed: [], attrs: body.attrs } } });
    }
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
    return route.fulfill({ json: { success: true, data: { items: FIELDS, reservedAttrs: ['name', 'empNo', 'dept', 'question'] } } });
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
    const table = page.locator('#data-perm-panel-matrix .tabulator').first();
    await table.waitFor();
    const header = await table.locator('.tabulator-headers').innerText();
    assert(header.includes('미배정 · 349명') && header.includes('0건 고정'), 'unassigned header');
    assert(header.includes('통합관리자 · 1명') && !header.includes('전 권한'), 'super admin header without 「전 권한」');
    assert(header.includes('검증부서 · 3명'), 'dept header with account count');
    // 2026-10-07 항목 × 부서 — 열: 항목 · 출력 화면 · 부서들, [항목 관리] 단추 · 포함 데이터 · 적용 열 없음
    const heads = (await table.locator('.tabulator-col-title').allTextContents()).map((t) => t.trim()).filter(Boolean);
    assert.deepEqual(heads.slice(0, 2), ['항목', '출력 화면'], `heads ${heads}`);
    assert.equal(await page.getByRole('button', { name: '항목 관리', exact: true }).count(), 0, 'no 항목 관리 button');
    assert.equal(await table.locator('.tabulator-col[tabulator-field="included"]').count(), 0, 'no included column');
    assert.equal(await table.locator('.tabulator-col[tabulator-field="applyLabel"]').count(), 0, 'no apply column');
    assert.equal(await page.getByPlaceholder('예) 10001').count(), 0, 'no account preview card');
    const guide = await page.locator('#data-perm-guide').innerText();
    for (const head of ['표의 행', '부서 칸 체크', '저장', '가릴 수 없는 항목']) assert(guide.includes(head), `guide ${head}`);
    assert(!guide.includes('항목 관리'), 'guide without 항목 관리');
    assert.equal(await table.locator('select.tabulator-page-size').inputValue(), '50', 'default page size 50');
    assert.deepEqual(await table.locator('select.tabulator-page-size option').allTextContents(), ['10', '25', '50', '100']);

    // 머리글 필터로 항목 찾기 · 출력 화면은 화면 이름만
    const itemFilter = table.locator('.tabulator-col[tabulator-field="name"] .tabulator-header-filter input');
    await itemFilter.fill('불량 수량');
    await box(page, '불량 수량 · 검증부서 열람').waitFor();
    assert(await table.getByText('불량 현황 조회', { exact: true }).first().isVisible(), 'screen name listed');
    assert(await box(page, '불량 수량 · 검증부서 열람').isChecked(), 'qty allowed for 검증부서');
    assert(await box(page, '불량 수량 · 미배정 열람').isDisabled(), 'unassigned locked');
    assert(!(await box(page, '불량 수량 · 미배정 열람').isChecked()), 'unassigned shows 0');
    assert(await box(page, '불량 수량 · 통합관리자 열람').isDisabled(), 'super admin locked');
    // 가릴 수 없는 항목 — 칸 잠금, 이유 표시
    await itemFilter.fill('확인된 값');
    await table.getByText('가릴 수 없음 (공용 키)', { exact: true }).first().waitFor();
    assert(await box(page, '확인된 값 · 검증부서 열람').isDisabled(), 'generic item locked');

    // 체크 1회 = PUT item-perms 1건, 응답 전 두 번째 클릭은 요청 0건, 표는 그대로
    await itemFilter.fill('단가·금액');
    await box(page, '단가·금액 · 검증부서 열람').waitFor();
    // 화면 코드 어디에도 쓰지 않는 키(unitPrice)는 「웹 화면에 나오지 않음」(2026-10-07 — 예전 「화면 표에 없음」)
    assert(await table.getByText('웹 화면에 나오지 않음', { exact: true }).first().isVisible(), 'not on web label');
    assert.equal(await table.getByText('화면 표에 없음', { exact: true }).count(), 0, 'old label gone');
    await table.evaluate((el) => { el.dataset.mark = 'same'; });
    state.delayMs = 400;
    await box(page, '단가·금액 · 검증부서 열람').click();
    await box(page, '단가·금액 · 검증부서 열람').click({ force: true }).catch(() => {});
    await page.waitForTimeout(1200);
    state.delayMs = 0;
    assert.equal(state.itemPerms.length, 1, 'second click during save makes no request');
    assert.deepEqual(state.itemPerms[0], { name: '단가·금액', attrs: ['unitPrice'], perms: { 2: true } });
    assert(await box(page, '단가·금액 · 검증부서 열람').isChecked());
    assert.equal(await page.locator('.tabulator[data-mark="same"]').count(), 1, 'table not rebuilt');
    assert.equal(state.puts.length + state.mappings.length, 0, 'no old per-kind requests');

    // 서버 409 — 상태 유지 + 토스트
    await itemFilter.fill('불량 수량');
    state.failPut = true;
    await box(page, '불량 수량 · 둘째부서 열람').click();
    await page.getByText('검증용 데이터 권한 거부').first().waitFor();
    assert(await box(page, '불량 수량 · 둘째부서 열람').isChecked(), 'failed save keeps state');
    await itemFilter.fill('');

    // 새로 발견된 응답 데이터(2026-10-08) — 표 위 안내 → 탭, 추천 · 항목에 넣기 · 새 항목 · 가리지 않음, 공용 키는 가리지 않음만
    await page.getByText('처리하지 않은 새 응답 데이터가', { exact: false }).first().waitFor();
    await page.getByRole('button', { name: '확인하기', exact: true }).click();
    const found = page.locator('#data-perm-found');
    await found.waitFor();
    await found.getByText('ngQtyDaily', { exact: true }).waitFor();
    assert(await found.getByText('AI 통합 대시보드', { exact: true }).first().isVisible(), 'path → screen');
    assert(await found.getByText('불량 수량', { exact: true }).first().isVisible(), 'suggest 불량 수량 for ngQtyDaily');
    assert(await found.getByText('공용 키 — 화면마다 뜻이 달라 항목에 넣을 수 없음').isVisible(), 'generic note');
    // 「처리」 → 「관리」 + 머리글 도움말, 안내 상자의 항목 지정 · 가리지 않음 설명은 도움말로 옮김(2026-10-08)
    assert.equal(await found.locator('.tabulator-col[tabulator-field="act"] .tabulator-col-title').innerText().then((t) => t.replace('?', '').trim()), '관리');
    assert.equal(await found.getByText('다시 알리지 않습니다', { exact: false }).count(), 0, 'hint trimmed');
    await found.getByRole('img', { name: '관리 도움말' }).hover();
    await page.locator('.ax-col-help-tip').waitFor();
    assert((await page.locator('.ax-col-help-tip').innerText()).includes('가리지 않음 항목으로 이동합니다'), 'help text');
    await page.mouse.move(5, 5);
    assert.equal(await page.locator('.ax-col-help-tip').count(), 0, 'help closes');
    // 항목 지정(2026-10-08 두 단추를 하나로) — 처리 단추는 [항목 지정] · [가리지 않음] 둘
    assert.equal(await found.getByRole('button', { name: '항목에 넣기', exact: true }).count(), 0, 'no separate add button');
    assert.equal(await found.getByRole('button', { name: '새 항목', exact: true }).count(), 0, 'no separate new button');
    // 추천 항목이 미리 골라져 있고 「그 줄의 부서 설정을 따른다」 안내 → item-perms 에 그 항목의 키 + 새 이름, perms {}
    await found.locator('.tabulator-row', { hasText: 'ngQtyDaily' }).getByRole('button', { name: '항목 지정', exact: true }).click();
    const assign = page.locator('#item-assign');
    await assign.waitFor();
    assert(await assign.getByText('「불량 수량」 항목에 함께 들어갑니다', { exact: false }).isVisible(), 'existing item note');
    // 선택 상자 대신 검색 + 목록(2026-10-08) — 검색어로 거르고 고르면 안내가 바뀜, 다시 추천으로
    assert.equal(await assign.locator('select').count(), 0, 'no long select');
    await page.getByRole('textbox', { name: '항목 검색' }).fill('단가');
    await assign.getByRole('radio', { name: '단가·금액', exact: true }).click();
    assert(await assign.getByText('「단가·금액」 항목에 함께 들어갑니다', { exact: false }).isVisible(), 'picked from search');
    await page.getByRole('textbox', { name: '항목 검색' }).fill('');
    await assign.getByRole('radio', { name: '불량 수량 (추천)', exact: true }).click();
    await page.getByRole('button', { name: '지정', exact: true }).last().click();
    await page.waitForTimeout(800);
    assert.deepEqual(state.itemPerms.at(-1), { name: '불량 수량', attrs: ['ngQty', 'ngQtyDaily'], perms: {} }, `add body ${JSON.stringify(state.itemPerms.at(-1))}`);
    // 가리지 않음
    await found.locator('.tabulator-row', { hasText: 'reworkCnt' }).getByRole('button', { name: '가리지 않음', exact: true }).click();
    await page.waitForTimeout(500);
    assert.deepEqual(state.ignores.at(-1), { attrNames: ['reworkCnt'], ignore: true });
    // 항목명(제안) — 화면 이름표(카드 label · 유형별 열)를 가져옵니다(2026-10-08)
    const lrrRow = found.locator('.tabulator-row', { hasText: 'lrrCnt' });
    assert(await lrrRow.getByText('LRR 건수', { exact: true }).isVisible(), 'label from StatCard');
    assert(await lrrRow.getByText('고객사별 LRR · 카드·차트', { exact: true }).isVisible(), 'where');
    const lossRow = found.locator('.tabulator-row', { hasText: 'loss' }).first();
    assert(await lossRow.getByText('유형별 불량 수량', { exact: true }).isVisible(), 'map label');
    assert(await lossRow.getByText('불량 수량', { exact: true }).isVisible(), 'map suggests 불량 수량');
    // 추천이 없으면 「+ 새 항목」 이 골라져 있고 제안 이름이 미리 들어감 → 새 줄 안내
    await lrrRow.getByRole('button', { name: '항목 지정', exact: true }).click();
    await page.locator('#item-assign').waitFor();
    assert.equal(await page.getByRole('textbox', { name: '새 항목 이름' }).inputValue(), 'LRR 건수', 'prefilled name');
    assert(await page.locator('#item-assign').getByText('표에 새 항목이 생깁니다', { exact: false }).isVisible(), 'new item note');
    await page.getByRole('button', { name: '지정', exact: true }).last().click();
    await page.waitForTimeout(800);
    assert.deepEqual(state.itemPerms.at(-1), { name: 'LRR 건수', attrs: ['lrrCnt'], perms: {} });
    state.itemPerms.length = 0;
    await page.locator('#data-perm-tab-matrix').click();
    await table.waitFor();

    // 변경 이력 (DTP-10) — 「최근 변경 이력」 탭
    await page.locator('#data-perm-tab-logs').click();
    await page.getByText('품질보증팀 단가·금액 회수').waitFor();
    const logGrid = page.locator('#data-perm-panel-logs .tabulator');
    const logHeads = (await logGrid.locator('.tabulator-col-title').allTextContents()).map((t) => t.trim());
    assert.deepEqual(logHeads, ['시각', '대상', '변경 내용', '작업자'], `log heads ${logHeads}`);
    assert.equal(await logGrid.locator('select.tabulator-page-size').inputValue(), '50', 'log default page size 50');
    await page.locator('#data-perm-tab-matrix').click();
    await table.waitFor();

    // ── 엑셀 — 항목 × 부서 ──
    await page.getByRole('button', { name: '엑셀 다운로드 ▾', exact: true }).click();
    const [viewDl] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: /조회 목록 다운로드/ }).click()]);
    const viewBook = await readXlsx(await viewDl.path());
    assert.deepEqual(viewBook.head.slice(0, 3), ['항목', '출력 화면', '통합관리자'], `excel head ${viewBook.head}`);
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: '엑셀 다운로드 ▾', exact: true }).click();
    await page.getByRole('menuitem', { name: /전체 다운로드/ }).click();
    await page.waitForTimeout(800);
    const [view, all] = state.logs.slice(-2);
    assert.equal(view.scopeCd, 'VIEW'); assert.equal(view.blindCnt, 0); assert.equal(view.menuId ?? view.reportId, 'sys-data');
    assert.equal(all.scopeCd, 'ALL'); assert(all.rowCnt > view.rowCnt, 'all includes locked items'); assert.equal(all.blindCnt, 0);

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
    const boxes = ro.page.locator('#data-perm-panel-matrix .tabulator input[type="checkbox"]');
    for (let i = 0; i < Math.min(await boxes.count(), 40); i += 1) assert(await boxes.nth(i).isDisabled(), 'read-only checkbox disabled');
    await ro.page.getByRole('button', { name: '엑셀 다운로드 ▾', exact: true }).click();
    await ro.page.getByRole('menuitem', { name: /조회 목록 다운로드/ }).click();
    await ro.page.waitForTimeout(500);
    assert.equal(ro.state.logs.at(-1)?.scopeCd, 'VIEW', 'read-only can download');
    assert.equal(ro.state.puts.length + ro.state.itemPerms.length + ro.state.mappings.length, 0);
    assert.deepEqual(ro.state.errors, []);
  } finally { await ro.browser.close(); }

  console.log('PASS: data-perm — 항목 × 부서 표(항목 · 출력 화면 · 부서, 항목 관리 없음), dept headers/locks(super·unassigned 0건), header filter · 50/page, generic item locked with reason, item-perms 1 request · no double request · no rebuild, 409 keep+toast, change log, excel 항목 × 부서 VIEW/ALL blindCnt 0, 390px scroll, read-only');
})().catch((e) => { console.error(e); process.exit(1); });
