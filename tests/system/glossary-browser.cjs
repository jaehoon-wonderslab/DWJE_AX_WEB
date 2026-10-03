/**
 * 브라우저 시험 — 용어 사전 관리(sys-gloss, /system/glossary) · 07 기획서 6장
 *
 * API 응답은 page.route 로 고정합니다(실 서버 모드 웹 서버 필요 — 목 모드는 앱 안에서 응답해 가로챌 수 없습니다).
 *   API_URL=http://localhost:18081 API_URL=http://localhost:18081 WEB_URL=http://localhost:<실 API 모드 포트> node tests/system/glossary-browser.cjs
 *
 *  (1) ?keyword= 초기 검색어 · 검색칸 연속 입력 시 포커스 유지 · 요청 1회
 *  (2) 비관리자(canEditTerm:false · canWriteVariant:false) — 공식 용어 버튼 없음, 유사어 버튼 비활성 + 이유
 *  (3) mineOnly 체크 → 요청 쿼리 mineOnly=true
 *  (4) 요약 실패 → 오류 줄 + 카드 값 —
 *  (5) 360px 에서 목록 표를 오른쪽 끝까지 밀면 「관리」 머리글과 버튼이 보임
 *  (7) [엑셀 다운로드 ▾] 패널이 버튼 바로 아래 두 항목, Esc 로 닫힘, 360px 에서 잘리지 않음
 *  (8) 「조회 목록」 파일 행 수 = 그리드 행 수
 *  (9) 「전체」 가 scope:'ALL' 로 서버 내려받기를 부름
 *  GLS-01 공식 용어 403 → 「공식 용어는 통합관리자만 편집할 수 있습니다.」 · GLS-02 skipped 칩 · GLS-03 점검 필요 유사어 카드·모달 · 400 안내
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { open, WEB } = require('../lib/browser');

/** 앱 번들이 부르는 API(기본 8080)를 API_URL 로 돌립니다 — 8080 이 멈췄을 때 다른 포트의 API 로 시험합니다 */
const REAL_API = process.env.API_URL || 'http://localhost:8080';
const APP_API = process.env.APP_API_URL || 'http://localhost:8080';
const realUrl = (u) => u.replace(APP_API, REAL_API);
async function redirectApi(page) {
  if (REAL_API === APP_API) return;
  await page.route(`${APP_API}/**`, (r) => r.continue({ url: realUrl(r.request().url()) }));
}

const TERMS = Array.from({ length: 60 }, (_, i) => (i === 5 ? { termId: 1005, term: '비공개 용어', definition: null, domain: '고객사', blinded: true, variants: null } : {
  termId: 1000 + i,
  term: i === 0 ? 'CAN' : `용어${String(i).padStart(2, '0')}`,
  definition: `뜻 ${i}`,
  domain: i % 2 ? '제품/부품' : '품질관리',
  variants: i === 0
    ? [{ variantId: 1, word: '캔', byEmpNo: '10000', byName: '관리자', at: '2026-09-30', editable: true }, { variantId: 2, word: '9월', byEmpNo: '10002', byName: '박생산', at: '2026-09-30', editable: false }]
    : [{ variantId: 100 + i, word: `현장${i}`, byEmpNo: '10002', byName: '박생산', at: '2026-09-30', editable: false }],
}));
const BLIND = '고객사 데이터 권한이 없어 볼 수 없는 용어입니다';

async function setup(page, opts = {}) {
  await redirectApi(page);
  // 다운로드 이력 기록 — 서버가 아직 scopeCd·condSummary(공통 CMN-07)를 받지 않아 고정합니다. 받은 본문은 st.logs 에 남깁니다
  const logs = [];
  await page.route('**/api/v1/download-logs', (r) => {
    if (r.request().method() !== 'POST') return r.continue();
    logs.push(r.request().postDataJSON());
    return r.fulfill({ json: { success: true, code: 'SUCCESS', message: '기록했습니다.', data: { dlId: logs.length } } });
  });
  const st = { logs, requests: [], exports: [], posts: [], summaryFail: !!opts.summaryFail };
  // 권한 — /auth/me 를 받아 화면 권한·쓰기 권한·통합관리자 여부를 바꿔 줍니다
  await page.route('**/api/v1/auth/me', async (route) => {
    const res = await route.fetch({ url: realUrl(route.request().url()) });
    const j = await res.json();
    j.data.menuPerms = ['ai-chat', 'sys-gloss', 'gloss-view', 'chat-history', 'dash-ai'];
    j.data.writePerms = opts.write ? ['sys-gloss'] : [];
    // 2026-10-03 — 접근이 있는데 쓰기가 막히는 경우는 미배정뿐입니다(write=false → 미배정)
    const unassigned = !opts.write && !opts.admin;
    j.data.unassigned = unassigned;
    if (j.data.dept && typeof j.data.dept === 'object') j.data.dept = { ...j.data.dept, unassigned };
    j.data.user = { ...j.data.user, superAdmin: !!opts.admin };
    await route.fulfill({ response: res, json: j });
  });
  await page.route('**/api/v1/glossary/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const p = url.pathname.replace('/api/v1/glossary/', '');
    const ok = (data, meta, message = '완료') => route.fulfill({ json: { success: true, code: 'SUCCESS', message, data, meta } });
    if (p === 'summary') {
      if (st.summaryFail) return route.fulfill({ status: 500, json: { success: false, code: 'E-SERVER', message: '요약 시험 실패' } });
      return ok({ termCnt: TERMS.length, variantCnt: 61, domainCnt: 2, myVariantCnt: 1, noVariantTermCnt: 0, canEditTerm: !!opts.admin, canWriteVariant: !!opts.write, riskVariantCnt: opts.admin ? 1 : null, lastChangedAt: '2026-09-30 14:02:11', lastChangedBy: '박생산', byDomain: [{ domainId: 1, domain: '품질관리', termCnt: 30, variantCnt: 31, noVariantTermCnt: 0 }, { domainId: 2, domain: '제품/부품', termCnt: 30, variantCnt: 30, noVariantTermCnt: 0 }] });
    }
    if (p === 'domains') return ok({ domains: [{ domainId: 1, code: '품질관리', name: '품질관리' }, { domainId: 2, code: '제품/부품', name: '제품/부품' }] });
    if (p === 'changes') {
      st.changes = (st.changes || 0) + 1;
      return ok({ items: [
        { changeId: 9, at: '2026-10-02 10:11:05', actorId: '10002', actorNm: '박생산', targetCd: 'VARIANT', actionCd: 'UPDATE', termId: 1000, term: 'CAN', variantId: 1, before: { word: '깡' }, after: { word: '캔' } },
        { changeId: 8, at: '2026-10-02 09:00:00', actorId: '10002', actorNm: '박생산', targetCd: 'TERM', actionCd: 'UPDATE', termId: 1005, term: '비공개 용어', variantId: null, before: null, after: null, blinded: true },
      ] }, { page: 1, size: 50, total: 2, totalPages: 1 });
    }
    if (p === 'variants/risks') return ok({ items: [{ variantId: 2, word: '9월', termId: 1000, term: 'CAN', ownerName: '박생산', riskCd: 'DATE_LIKE', riskNm: '날짜 표현' }] });
    if (p === 'normalize') return ok({ normalizedText: '2026년 9월 22일 CAN 불량', replacements: [{ from: '캔', to: 'CAN' }], skipped: [{ word: '9월', reasonCd: 'DATE_LIKE', reason: '날짜 표현은 치환하지 않습니다' }] });
    if (p === 'terms/export') {
      st.exports.push(req.postDataJSON());
      return route.fulfill({ status: 200, headers: { 'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'content-disposition': 'attachment; filename="glossary_test.xlsx"' }, body: 'PK-test' });
    }
    if (p === 'terms' && req.method() === 'POST') {
      st.posts.push(req.postDataJSON());
      return route.fulfill({ status: 403, json: { success: false, code: 'E-AUTH-004', message: '공식 용어는 통합관리자만 편집할 수 있습니다. [sys-gloss]' } });
    }
    if (/^terms\/\d+\/variants$/.test(p) && req.method() === 'POST') {
      const body = req.postDataJSON();
      st.variantTerm = p.split('/')[1];
      st.posts.push(body);
      if (String(body.word).length < 2) return route.fulfill({ status: 400, json: { success: false, code: 'E-VALID-001', message: '유사어는 2자 이상이어야 합니다.', error: { field: 'word' } } });
      return ok({ variantId: 999, word: body.word, warnings: [] }, undefined, '유사어가 등록되었습니다.');
    }
    if (p === 'terms') {
      const kw = (url.searchParams.get('keyword') || '').toLowerCase();
      const mine = url.searchParams.get('mineOnly') === 'true';
      const page = Number(url.searchParams.get('page') || 1);
      const size = Number(url.searchParams.get('size') ?? 50);
      st.requests.push({ keyword: url.searchParams.get('keyword') || '', mineOnly: url.searchParams.get('mineOnly'), domainCd: url.searchParams.get('domainCd'), page, size });
      let rows = TERMS.filter((t) => !kw || [t.term, t.definition, ...(t.variants || []).map((v) => v.word)].join(' ').toLowerCase().includes(kw));
      if (mine) rows = rows.filter((t) => (t.variants || []).some((v) => v.byEmpNo === '10000'));
      const total = rows.length;
      return ok({ items: size ? rows.slice((page - 1) * size, page * size) : rows }, { page, size, total, totalPages: size ? Math.ceil(total / size) : 1 });
    }
    return route.continue();
  });
  return st;
}

const textOf = (page) => page.evaluate(() => document.body.innerText);

/** 카드 안 가로 스크롤 상자를 끝까지 밀고 마지막 열 머리글·값이 보이는지 */
async function lastColumnVisible(page, field) {
  return page.locator('.tabulator').first().evaluate(async (tab, f) => {
    let scroll = tab.parentElement;
    while (scroll && !(scroll.scrollWidth > scroll.clientWidth + 2 && ['auto', 'scroll'].includes(getComputedStyle(scroll).overflowX))) scroll = scroll.parentElement;
    const holder = tab.querySelector('.tabulator-tableholder');
    const box = scroll || holder;
    box.scrollLeft = box.scrollWidth;
    if (holder && holder !== box) holder.scrollLeft = holder.scrollWidth;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const head = tab.querySelector(`.tabulator-col[tabulator-field="${f}"]`).getBoundingClientRect();
    const cell = tab.querySelector(`.tabulator-row .tabulator-cell[tabulator-field="${f}"]`).getBoundingClientRect();
    const view = Math.min(window.innerWidth, (scroll || holder).getBoundingClientRect().right);
    return { scrolled: box.scrollLeft > 0, head: head.right <= view + 2 && head.width > 40, cell: cell.right <= view + 2, aligned: Math.abs(head.x - cell.x) < 2 };
  }, field);
}

(async () => {
  const { browser, page } = await open('admin');
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    /* ── 관리자 · 쓰기 권한 ── */
    let st = await setup(page, { admin: true, write: true });
    await page.goto(`${WEB}/system/glossary?keyword=can`);
    await page.locator('.tabulator-row').first().waitFor({ timeout: 30000 });
    assert.equal(st.requests[0]?.keyword, 'can', '?keyword= 가 첫 조회 검색어');
    const search = page.getByPlaceholder('용어 · 뜻 · 유사어', { exact: true });
    assert.equal(await search.inputValue(), 'can', '검색칸에 초기 검색어');

    // (1) 연속 입력 — 포커스 유지, 입력을 멈춘 뒤 1회
    await search.fill('');
    const before = st.requests.length;
    await search.pressSequentially('용어0', { delay: 60 });
    await page.waitForTimeout(900);
    assert(await search.evaluate((el) => el === document.activeElement), '입력 중 포커스 유지');
    const typed = st.requests.slice(before).filter((r) => r.keyword);
    assert.equal(typed.length, 1, `입력을 멈춘 뒤 1회만 요청 (${JSON.stringify(st.requests.slice(before))})`);
    assert.equal(typed[0].keyword, '용어0');

    // (3) mineOnly
    await search.fill('');
    await search.press('Enter');
    await page.waitForTimeout(500);
    await page.getByText('내가 등록한 유사어만', { exact: true }).click();
    await page.waitForTimeout(600);
    assert.equal(st.requests.at(-1).mineOnly, 'true', 'mineOnly=true 가 서버로');
    await page.getByText('내가 등록한 유사어만', { exact: true }).click();
    await page.waitForTimeout(600);

    // GLS-06 최근 변경자 · GLS-13 분류별 현황 — 행을 누르면 분류 필터
    assert((await textOf(page)).includes('최근 변경 2026-09-30 14:02 · 박생산'), '최근 변경 시각·수행자');
    // 「펼치기」 첫 번째가 분류별 현황 카드입니다(그다음이 반영 시점 카드)
    await page.getByRole('button', { name: '펼치기', exact: true }).first().click();
    await page.getByText('유사어 없음', { exact: true }).last().waitFor();
    await page.locator('.tabulator-row').filter({ hasText: '제품/부품' }).first().click();
    await page.waitForTimeout(700);
    assert.equal(st.requests.at(-1).domainCd, '제품/부품', '분류 행 → 분류 필터');
    await page.getByRole('button', { name: '접기', exact: true }).first().click();
    await page.getByText('분류', { exact: true }).first().waitFor();
    // 필터를 전체로 되돌립니다
    await page.goto(`${WEB}/system/glossary`);
    await page.locator('.tabulator-row').first().waitFor();

    // GLS-02 미리보기 skipped 칩
    await page.getByRole('button', { name: '정규화', exact: true }).click();
    await page.getByText('치환하지 않음: 9월 — 날짜 표현은 치환하지 않습니다').waitFor();

    // GLS-03 점검 필요 유사어 카드 · 모달
    await page.getByText('점검 필요 유사어 1건', { exact: false }).waitFor();
    await page.getByRole('button', { name: '목록 보기', exact: true }).click();
    await page.getByText('날짜 표현', { exact: true }).first().waitFor();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    if (await page.getByText('날짜 표현', { exact: true }).count()) {
      await page.getByRole('button', { name: /닫기/ }).last().click().catch(() => {});
    }

    // (7) 엑셀 패널 — 버튼 바로 아래 두 항목, 학습데이터 없음, Esc 닫힘
    const exportBtn = page.getByRole('button', { name: /엑셀 다운로드/ });
    await exportBtn.click();
    const viewItem = page.getByRole('menuitem', { name: /조회 목록 다운로드/ });
    const allItem = page.getByRole('menuitem', { name: /전체 다운로드/ });
    await viewItem.waitFor();
    const b = await exportBtn.boundingBox();
    const m = await viewItem.boundingBox();
    assert(m.y >= b.y + b.height - 2 && m.y - (b.y + b.height) < 40, '패널이 버튼 바로 아래');
    assert.equal(await page.getByRole('menuitem').count(), 2);
    assert(/(60건)/.test(await allItem.innerText()), '전체 건수 = 요약 termCnt');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    assert.equal(await viewItem.count(), 0, 'Esc 로 닫힘');

    // (8) 조회 목록 파일 = 그리드 행 수
    const gridRows = await page.locator('.tabulator-row').count();
    await exportBtn.click();
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: /조회 목록 다운로드/ }).click()]);
    const html = fs.readFileSync(await dl.path(), 'utf8');
    const fileRows = (html.match(/<tr>/g) || []).length - 1;
    assert.equal(fileRows, gridRows, `파일 ${fileRows}행 = 그리드 ${gridRows}행`);
    assert(html.includes('비공개 처리 1건') && html.includes('<td>비공개 용어</td>'), '가린 용어 비공개 · 파일 안 비공개 처리 n건');
    assert.equal(st.logs.at(-1)?.scopeCd, 'VIEW', '이력 범위 VIEW');
    assert.equal(st.logs.at(-1)?.menuId, 'sys-gloss', '이력 화면 sys-gloss');
    assert(/검색=.*분류=.*내 유사어만=.*쪽=/.test(st.logs.at(-1)?.condSummary || ''), '이력 조건 요약');

    // (9) 전체 = 서버 생성 scope ALL
    await exportBtn.click();
    const [dl2] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: /전체 다운로드/ }).click()]);
    assert(/\.xlsx$/.test(dl2.suggestedFilename()), '서버 파일 xlsx');
    assert.equal(st.exports.at(-1).scope, 'ALL');
    assert.equal(st.exports.at(-1).menuId, 'sys-gloss');

    // 결정 R-18 — 가린 용어 행: 「비공개 용어」 회색, 유사어 추가·편집·삭제 비활성 + 이유, 이력은 열림
    const blindRow = page.locator('.tabulator-row').filter({ hasText: '비공개 용어' }).first();
    for (const act of ['add', 'edit', 'del']) {
      const b2 = blindRow.locator(`button[data-act="${act}"]`);
      assert(await b2.isDisabled(), `가린 용어 ${act} 비활성`);
      assert.equal(await b2.getAttribute('title'), BLIND);
    }
    assert(!(await blindRow.locator('button[data-act="hist"]').isDisabled()), '가린 용어도 이력은 열림');

    // GLS-01 — 서버 403 이면 통합관리자 전용 안내
    await page.getByRole('button', { name: '공식 용어 등록', exact: true }).click();
    await page.getByPlaceholder('예) Stiffener', { exact: true }).fill('TEST-TERM');
    await page.getByPlaceholder('예) 스티프너 / FPCB 보강판 (Stiffener)', { exact: true }).fill('시험 용어');
    await page.getByRole('button', { name: '등록', exact: true }).click();
    await page.getByText('공식 용어는 통합관리자만 편집할 수 있습니다.', { exact: true }).waitFor();
    await page.keyboard.press('Escape');
    await page.goto(`${WEB}/system/glossary`);
    await page.locator('.tabulator-row').first().waitFor();

    // GLS-07 — 행 「이력」 → 그 용어 변경 이력 모달, 머리 「변경 이력」 → 최근 30일
    await page.locator('.tabulator-row').first().locator('button[data-act="hist"]').click();
    await page.getByText('변경 이력 — CAN', { exact: true }).waitFor();
    await page.getByText('유사어: 깡', { exact: true }).waitFor();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    if (await page.getByText('변경 이력 — CAN', { exact: true }).count()) await page.getByRole('button', { name: /닫기/ }).last().click().catch(() => {});
    await page.getByRole('button', { name: '변경 이력', exact: true }).click();
    await page.getByText('변경 이력 (최근 30일)', { exact: true }).waitFor();
    await page.getByText('공식 용어 · 비공개 용어', { exact: true }).waitFor();
    assert(await page.getByText('비공개', { exact: true }).count() >= 2, '가린 이력의 변경 전·후 비공개');
    assert.equal(st.changes, 2, '변경 이력 API 2회');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    if (await page.getByText('변경 이력 (최근 30일)', { exact: true }).count()) await page.getByRole('button', { name: /닫기/ }).last().click().catch(() => {});

    // GLS-11 — 머리 「유사어 등록」 은 검색형 공식 용어 선택(2쪽 이후 용어도) · GLS-10 남은 글자
    await page.getByRole('button', { name: '유사어 등록', exact: true }).click();
    await page.getByLabel('공식 용어 검색', { exact: true }).fill('용어5');
    await page.getByLabel('용어59 고르기', { exact: true }).click();
    await page.getByText('용어59 — 뜻 59', { exact: true }).waitFor();
    await page.getByPlaceholder('예) 보강판 · 스티프너 · 찍힘', { exact: true }).fill('현장말');
    await page.getByText('3/50자', { exact: true }).waitFor();
    await page.getByRole('button', { name: '등록', exact: true }).click();
    await page.waitForTimeout(600);
    assert.deepEqual(st.posts.at(-1), { word: '현장말' }, '유사어 등록 본문');
    assert.equal(st.variantTerm, '1059', '2쪽에 있는 용어(용어59)에 붙음');

    // GLS-03 — 한 글자 유사어 400 안내
    await page.locator('.tabulator-row').first().locator('button[data-act="add"]').click();
    await page.getByPlaceholder('예) 보강판 · 스티프너 · 찍힘', { exact: true }).fill('계');
    await page.getByRole('button', { name: '등록', exact: true }).click();
    await page.getByText('유사어는 2자 이상이어야 합니다.', { exact: true }).waitFor();
    await page.keyboard.press('Escape');

    // (5) 360px — 마지막 「관리」 열
    await page.setViewportSize({ width: 360, height: 800 });
    await page.waitForTimeout(800);
    const last = await lastColumnVisible(page, 'termId');
    assert(last.scrolled && last.head && last.cell && last.aligned, `360px 관리 열: ${JSON.stringify(last)}`);
    // 패널이 화면 밖으로 잘리지 않음
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.getByRole('button', { name: /엑셀 다운로드/ }).click();
    const pm = await page.getByRole('menuitem', { name: /조회 목록 다운로드/ }).boundingBox();
    assert(pm.x >= 0 && pm.x + pm.width <= 362, `360px 패널 잘림 없음 ${JSON.stringify(pm)}`);
    await page.screenshot({ path: '/tmp/glossary-360.png', fullPage: false }).catch(() => {});
    await page.keyboard.press('Escape');
    await page.setViewportSize({ width: 1440, height: 960 });

    /* ── 쓰기 권한 없음 · 비관리자 ── */
    // 경로를 모두 풀면 그 사이 요청이 꺼진 8080 으로 가 세션이 끊길 수 있어, 새 흉내를 위에 덧씌웁니다(나중 경로가 먼저 받음)
    st = await setup(page, { admin: false, write: false });
    await page.goto(`${WEB}/system/glossary`);
    await page.locator('.tabulator-row').first().waitFor();
    assert.equal(await page.getByRole('button', { name: '공식 용어 등록', exact: true }).count(), 0, '공식 용어 등록 없음');
    assert(await page.getByRole('button', { name: '유사어 등록', exact: true }).isDisabled(), '유사어 등록 비활성');
    const add = page.locator('.tabulator-row').first().locator('button[data-act="add"]');
    assert(await add.isDisabled(), '유사어 추가 비활성');
    assert.equal(await add.getAttribute('title'), '미배정 계정은 이 동작을 할 수 없습니다. 전산팀에 부서 배정을 요청하세요.');
    assert.equal(await page.locator('button[data-act="edit"]').count(), 0, '편집 없음');
    assert.equal(await page.locator('.chip-x').count(), 0, '쓰기 권한이 없으면 칩 삭제 없음');
    assert.equal(await page.getByText(/점검 필요 유사어/).count(), 0, '점검 목록은 통합관리자만');

    // (4) 요약 실패
    st.summaryFail = true;
    await page.goto(`${WEB}/system/glossary`);
    await page.locator('.tabulator-row').first().waitFor();
    const t = await textOf(page);
    assert(t.includes('요약을(를) 불러오지 못했습니다 — 요약 시험 실패'), '요약 실패 안내');
    assert(/공식 용어\s*\n\s*—/.test(t), '요약 값 —');

    assert.equal(errors.length, 0, errors.join('\n'));
    console.log('PASS: glossary — ?keyword 초기 검색, 입력 확정(1회·포커스), mineOnly 서버 필터, skipped 칩, 점검 필요 유사어, 엑셀 패널(조회 목록=그리드·전체=서버 ALL), GLS-01 403 안내, 가린 용어 행·이력 비공개(R-18), 변경 이력 모달(행·머리)·최근 변경자·분류별 현황→필터, 검색형 공식 용어 선택(2쪽 이후)·남은 글자, 400 안내, 360px 관리 열·패널, 쓰기 권한 없음 비활성, 요약 실패 —');
  } catch (e) {
    // 실패 원인 확인용 — 그 순간 화면 글자(토스트 포함)를 함께 남깁니다
    console.error('화면:', (await page.evaluate(() => document.body.innerText).catch(() => '')).slice(0, 800));
    throw e;
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exitCode = 1; });
