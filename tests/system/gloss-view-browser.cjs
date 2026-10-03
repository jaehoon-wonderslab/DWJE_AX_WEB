/**
 * 브라우저 시험 — 용어 사전 조회(gloss-view, /glossary/view) · 13 기획서 6장
 *
 * API 응답은 page.route 로 고정합니다(실 서버 모드 웹 서버 필요 — 목 모드는 앱 안에서 응답해 가로챌 수 없습니다).
 *   API_URL=http://localhost:18081 WEB_URL=http://localhost:<실 API 모드 포트> node tests/system/gloss-view-browser.cjs
 *
 *  (1) 허브 /menu/glossary 에 카드 1개 → 화면
 *  (2) 등록·수정·삭제·정규화·재생성 버튼 없음
 *  (3) 검색 연속 입력 — 요청 1회 · 포커스 유지
 *  (4) 행 선택 → 넓은 화면 오른쪽 패널 · 360px 표 위 카드
 *  (5) ?term= 새로 고침에도 상세 유지 · 없는 ID 안내
 *  (6) 360px 에서 마지막 「유사어」 열까지 가로 스크롤
 *  (7) [엑셀 다운로드 ▾] 패널 두 항목 · Esc 닫힘 · 다운로드 이벤트
 *  (8) sys-gloss 쓰기 권한이 없으면 관리 링크 없음 / 있으면 링크 → /system/glossary?keyword= 검색 상태 (GLV-09)
 *  (9) 「조회 목록」 파일 행 수 = 그리드 행 수 · 가린 용어 비공개
 *  (10) 「전체」 가 scope:'ALL' · menuId:'gloss-view' 로 서버 생성 API
 *  (11) 360px 에서 패널이 화면 밖으로 잘리지 않음
 *  (12) 2026-10-03 분류 삭제 — 분류 열·분류 칩·분류 선택·분류 카드·상세의 분류 칩 없음, /glossary/domains 요청 없음, 엑셀 분류 열 없음
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

const TERMS = Array.from({ length: 30 }, (_, i) => ({
  termId: 2000 + i,
  term: i === 0 ? 'Stiffener' : `용어${String(i).padStart(2, '0')}`,
  definition: i === 0 ? '스티프너 / FPCB 보강판' : `뜻 ${i}`,
  // 2026-10-03 분류 삭제 — domain 대신 customerInfo(고객사 정보). 가린 용어(i=3)가 고객사 정보입니다
  customerInfo: i === 3,
  blinded: i === 3,
  // 서버는 가린 용어의 이름·뜻·유사어를 비워 보냅니다(결정 R-18)
  ...(i === 3 ? { term: '비공개 용어', definition: null } : {}),
  variants: i === 3 ? null : [{ variantId: 300 + i, word: i === 0 ? '보강판' : `현장${i}`, byName: '박생산', byEmpNo: null, at: '2026-09-10' }],
}));

async function setup(page, opts = {}) {
  await redirectApi(page);
  // 다운로드 이력 기록 — 서버가 아직 scopeCd·condSummary(공통 CMN-07)를 받지 않아 고정합니다. 받은 본문은 st.logs 에 남깁니다
  const logs = [];
  await page.route('**/api/v1/download-logs', (r) => {
    if (r.request().method() !== 'POST') return r.continue();
    logs.push(r.request().postDataJSON());
    return r.fulfill({ json: { success: true, code: 'SUCCESS', message: '기록했습니다.', data: { dlId: logs.length } } });
  });
  const st = { logs, requests: [], exports: [] };
  await page.route('**/api/v1/auth/me', async (route) => {
    const res = await route.fetch({ url: realUrl(route.request().url()) });
    const j = await res.json();
    j.data.menuPerms = ['ai-chat', 'gloss-view', 'dash-ai', ...(opts.manage ? ['sys-gloss'] : [])];
    j.data.user = { ...j.data.user, superAdmin: false };
    await route.fulfill({ response: res, json: j });
  });
  await page.route('**/api/v1/glossary/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const p = url.pathname.replace('/api/v1/glossary/', '');
    const ok = (data, meta) => route.fulfill({ json: { success: true, code: 'SUCCESS', message: '완료', data, meta } });
    if (p === 'summary') return ok({ termCnt: TERMS.length, variantCnt: 30, myVariantCnt: null, noVariantTermCnt: null, canEditTerm: null, lastChangedAt: '2026-09-30 14:02:11' });
    // 2026-10-03 분류 삭제 — /glossary/domains 는 없어졌습니다. 부르면 기록해 두고 404
    if (p === 'domains') {
      st.domainCalls = (st.domainCalls || 0) + 1;
      return route.fulfill({ status: 404, json: { success: false, code: 'E-NOTFOUND', message: '없는 API' } });
    }
    if (p === 'terms/export') {
      st.exports.push(req.postDataJSON());
      return route.fulfill({ status: 200, headers: { 'content-type': 'application/octet-stream', 'content-disposition': 'attachment; filename="glossary_view.xlsx"' }, body: 'test' });
    }
    if (/^terms\/\d+$/.test(p)) {
      const t = TERMS.find((x) => String(x.termId) === p.split('/')[1]);
      if (!t) return route.fulfill({ status: 404, json: { success: false, code: 'E-NOTFOUND', message: '용어를 찾을 수 없습니다.' } });
      return ok({ ...t, updatedAt: '2026-09-10 11:02:13', relatedTerms: [{ termId: 2001, term: '용어01', reasonCd: 'REF_IN_DEF' }] });
    }
    if (p === 'terms') {
      const kw = (url.searchParams.get('keyword') || '').toLowerCase();
      const page = Number(url.searchParams.get('page') || 1);
      const size = Number(url.searchParams.get('size') ?? 50);
      st.requests.push({ keyword: url.searchParams.get('keyword') || '', domainCd: url.searchParams.get('domainCd') });
      const rows = TERMS.filter((t) => !kw || [t.term, t.definition, ...(t.variants || []).map((v) => v.word)].join(' ').toLowerCase().includes(kw));
      return ok({ items: size ? rows.slice((page - 1) * size, page * size) : rows }, { page, size, total: rows.length, totalPages: 1 });
    }
    return route.continue();
  });
  return st;
}

(async () => {
  const { browser, page } = await open('admin');
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    let st = await setup(page, { manage: false });

    // (1) 허브
    await page.goto(`${WEB}/menu/glossary`);
    await page.getByText('용어 사전 조회', { exact: true }).first().waitFor({ timeout: 30000 });
    await page.goto(`${WEB}/glossary/view`);
    await page.locator('.tabulator-row').first().waitFor({ timeout: 30000 });

    // (2) 쓰기 버튼 없음
    for (const name of ['공식 용어 등록', '유사어 등록', '편집', '삭제', '정규화', '용어 임베딩 재생성']) {
      assert.equal(await page.getByRole('button', { name, exact: true }).count(), 0, `${name} 없음`);
    }
    // (8) 쓰기 권한 없음 → 관리 링크 없음
    assert.equal(await page.getByRole('button', { name: '용어 사전 관리로 이동', exact: true }).count(), 0, '관리 이동 없음');

    // (12) 분류 삭제 — 분류 열 · 칩 · 선택 · 카드 · API 요청 없음
    assert.equal(await page.locator('.tabulator-col[tabulator-field="domain"]').count(), 0, '분류 열 없음');
    for (const gone of ['분류', '전체 분류', '용어 분류']) assert.equal(await page.getByText(gone, { exact: true }).count(), 0, `빠짐: ${gone}`);
    assert(!st.domainCalls, '/glossary/domains 를 부르지 않음');
    assert(st.requests.every((r) => r.domainCd === null), '목록 요청에 domainCd 없음');

    // 가린 용어 표시
    assert(await page.getByText('비공개 용어', { exact: true }).count(), '가린 용어는 비공개 용어');

    // (3) 검색 연속 입력
    const search = page.getByPlaceholder('공식 용어 · 뜻 · 유사어', { exact: true });
    const before = st.requests.length;
    await search.click();
    await search.pressSequentially('stiff', { delay: 60 });
    await page.waitForTimeout(900);
    assert(await search.evaluate((el) => el === document.activeElement), '포커스 유지');
    const typed = st.requests.slice(before).filter((r) => r.keyword);
    assert.equal(typed.length, 1, `요청 1회 ${JSON.stringify(st.requests.slice(before))}`);
    assert.equal(await page.locator('.tabulator-row').count(), 1);
    assert(await page.locator('mark').count(), '검색어 강조');

    // (4) 행 선택 → 오른쪽 패널, ?term=
    await page.locator('.tabulator-row').first().click();
    await page.waitForURL(/term=2000/);
    await page.getByText('관련 용어', { exact: true }).waitFor();
    assert.equal(await page.getByText('분류', { exact: true }).count(), 0, '상세에 분류 없음');
    const close = await page.getByRole('button', { name: '닫기', exact: true }).boundingBox();
    const grid = await page.locator('.tabulator').first().boundingBox();
    assert(close.x > grid.x + grid.width - 2, `넓은 화면은 표 오른쪽 패널 ${JSON.stringify({ close, grid })}`);

    // 결정 R-18 — 가린 용어 상세는 내용 없이 안내만
    await page.goto(`${WEB}/glossary/view?term=2003`);
    await page.getByText('데이터 접근 권한이 없어 내용을 표시하지 않습니다.', { exact: true }).waitFor({ timeout: 30000 });
    assert.equal(await page.getByText('관련 용어', { exact: true }).count(), 0, '가린 용어는 관련 용어 없음');
    await page.goto(`${WEB}/glossary/view?term=2000`);
    await page.getByText('관련 용어', { exact: true }).waitFor({ timeout: 30000 });

    // (5) 새로 고침에도 상세 유지 · 없는 ID
    await page.reload();
    await page.getByText('관련 용어', { exact: true }).waitFor({ timeout: 30000 });
    await page.goto(`${WEB}/glossary/view?term=9999`);
    await page.getByText(/용어를 찾을 수 없습니다/).waitFor({ timeout: 30000 });
    await page.goto(`${WEB}/glossary/view`);
    await page.locator('.tabulator-row').first().waitFor();

    // (7) 패널 · (9) 조회 목록 · (10) 전체
    const exportBtn = page.getByRole('button', { name: /엑셀 다운로드/ });
    await exportBtn.click();
    await page.getByRole('menuitem', { name: /조회 목록 다운로드/ }).waitFor();
    assert.equal(await page.getByRole('menuitem').count(), 2);
    assert(/(30건)/.test(await page.getByRole('menuitem', { name: /전체 다운로드/ }).innerText()), '전체 건수 = termCnt');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    assert.equal(await page.getByRole('menuitem').count(), 0, 'Esc 닫힘');
    const gridRows = await page.locator('.tabulator-row').count();
    await exportBtn.click();
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: /조회 목록 다운로드/ }).click()]);
    const html = fs.readFileSync(await dl.path(), 'utf8');
    assert.equal((html.match(/<tr>/g) || []).length - 1, gridRows, '파일 행 = 그리드 행');
    assert(html.includes('<td>비공개 용어</td>') && html.includes('비공개 처리 1건'), '가린 용어 비공개 · 건수');
    assert(!/박생산/.test(html), '조회 화면 파일에 등록자 없음');
    assert(!/>분류</.test(html), '엑셀에 분류 열 없음');
    assert(!/분류=/.test(st.logs.at(-1)?.condSummary || ''), '이력 조건 요약에 분류 없음');
    await exportBtn.click();
    await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: /전체 다운로드/ }).click()]);
    assert.equal(st.exports.at(-1).scope, 'ALL');
    assert.equal(st.exports.at(-1).menuId, 'gloss-view');

    // (6) 360px — 「유사어」 열 · (4) 표 위 카드 · (11) 패널 잘림 없음
    await page.setViewportSize({ width: 360, height: 800 });
    await page.waitForTimeout(800);
    const last = await page.locator('.tabulator').first().evaluate(async (tab) => {
      let scroll = tab.parentElement;
      while (scroll && !(scroll.scrollWidth > scroll.clientWidth + 2 && ['auto', 'scroll'].includes(getComputedStyle(scroll).overflowX))) scroll = scroll.parentElement;
      const holder = tab.querySelector('.tabulator-tableholder');
      const box = scroll || holder;
      box.scrollLeft = box.scrollWidth;
      if (holder !== box) holder.scrollLeft = holder.scrollWidth;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const head = tab.querySelector('.tabulator-col[tabulator-field="variants"]').getBoundingClientRect();
      const cell = tab.querySelector('.tabulator-row .tabulator-cell[tabulator-field="variants"]').getBoundingClientRect();
      const right = Math.min(window.innerWidth, box.getBoundingClientRect().right);
      return { scrolled: box.scrollLeft > 0, head: head.right <= right + 2 && head.width > 40, cell: cell.right <= right + 2, aligned: Math.abs(head.x - cell.x) < 2 };
    });
    assert(last.scrolled && last.head && last.cell && last.aligned, `360px 유사어 열 ${JSON.stringify(last)}`);
    await page.screenshot({ path: '/tmp/gloss-view-360.png' }).catch(() => {});
    await page.evaluate(() => window.scrollTo(0, 0));
    await exportBtn.click();
    const pm = await page.getByRole('menuitem').first().boundingBox();
    assert(pm.x >= 0 && pm.x + pm.width <= 362, `360px 패널 잘림 없음 ${JSON.stringify(pm)}`);
    await page.keyboard.press('Escape');
    await page.locator('.tabulator-row').first().click();
    await page.getByText('관련 용어', { exact: true }).waitFor();
    const card = await page.getByText('관련 용어', { exact: true }).boundingBox();
    const table = await page.locator('.tabulator').first().boundingBox();
    assert(card.y < table.y, '좁은 화면은 표 위 상세 카드');
    await page.setViewportSize({ width: 1440, height: 960 });

    // (8) 쓰기 권한 있음 → 관리 링크 → /system/glossary?keyword=
    // 경로를 모두 풀면 그 사이 요청이 꺼진 8080 으로 가 세션이 끊길 수 있어, 새 흉내를 위에 덧씌웁니다(나중 경로가 먼저 받음)
    st = await setup(page, { manage: true });
    await page.goto(`${WEB}/glossary/view?term=2000`);
    await page.getByText('관리 화면에서 편집', { exact: true }).waitFor({ timeout: 30000 });
    assert(await page.getByRole('button', { name: '용어 사전 관리로 이동', exact: true }).count(), '관리 이동 버튼');
    await page.getByText('관리 화면에서 편집', { exact: true }).click();
    await page.waitForURL(/\/system\/glossary\?keyword=Stiffener/);
    // 관리 화면의 검색칸은 2026-10-04 에 뺐습니다 — 「공식 용어」 머리글 필터에 들어갑니다
    const termFilter = page.locator('.tabulator-col[tabulator-field="term"] .tabulator-header-filter input');
    await termFilter.waitFor({ timeout: 30000 });
    await page.waitForFunction(() => document.querySelector('.tabulator-col[tabulator-field="term"] .tabulator-header-filter input')?.value === 'Stiffener', null, { timeout: 15000 });
    assert.equal(await termFilter.inputValue(), 'Stiffener', '관리 화면이 그 용어 필터 상태');
    assert(!st.requests.some((r) => r.keyword === 'Stiffener' && r.path?.includes?.('/glossary/terms')), '관리 화면은 서버 검색어 없이 전부 받음');

    assert.equal(errors.length, 0, errors.join('\n'));
    console.log('PASS: gloss-view — 분류 삭제(열·칩·선택·카드·상세·API·엑셀 열 없음), 허브, 가린 용어 상세(R-18), 쓰기 버튼 없음, 검색 1회·포커스·강조, 오른쪽 패널·?term= 유지·없는 ID, 엑셀 패널(조회 목록=그리드·비공개·등록자 없음, 전체=서버 ALL gloss-view), 360px 유사어 열·패널·표 위 카드, 쓰기 권한자 관리 링크 → 관리 화면 ?keyword=');
  } catch (e) {
    // 실패 원인 확인용 — 그 순간 화면 글자(토스트 포함)를 함께 남깁니다
    console.error('화면:', (await page.evaluate(() => document.body.innerText).catch(() => '')).slice(0, 800));
    throw e;
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exitCode = 1; });
