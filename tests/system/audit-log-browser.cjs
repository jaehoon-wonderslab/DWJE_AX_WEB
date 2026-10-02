/*
 * 보안 감사 로그(sys-audit) 화면 — 기획 09 6.2 의 WEB 브라우저 시험 1~6
 *
 *  1. 9열 머리글 순서, 행 클릭 상세(id · IP · 접속 환경)
 *  2. 폭 390px 에서 표를 오른쪽 끝까지 밀면 마지막 열 「IP」 머리글·값이 보이고 머리글·본문이 함께 움직인다
 *  3. [엑셀 다운로드 ▾] 패널(단추 바로 아래 · Esc 로 닫힘 · 360px 에서 잘리지 않음)
 *     - 전체 = POST /audit-logs/export {scope:'ALL'} 만, POST /download-logs 는 부르지 않음 · 상한 안내 토스트
 *     - 조회 목록 = 현재 쪽 행을 표 정렬 순서대로, 기록 본문 scopeCd:'VIEW' · condSummary · blindCnt
 *       기록이 먼저 나가고, 기록이 실패하면 파일을 만들지 않는다(10 DLG-05)
 *  4. 검색어는 Enter 에서만 요청, 선택(결과) 변경은 즉시 요청
 *  5. API 500 → 오류 문구 · 「다시 시도」, 표 행 0
 *  6. LOG_AUDIT_RESULT 에 MASKED 가 있으면 「마스킹 후 제공」 배지
 *
 * API 응답은 page.route 로 고정합니다. 목(mock) 모드 번들은 네트워크를 쓰지 않으므로
 * 실 API 모드로 띄운 개발 서버에서 돌립니다(예: WEB_URL=http://localhost:8081 — npm run web).
 * 실행: WEB_URL=http://localhost:8081 node tests/system/audit-log-browser.cjs
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { WEB } = require('../lib/browser');
const { openStubbed, adminMe } = require('../lib/stubSession');

const HEADS = ['시각', '유형', '계정', '이름', '부서', '대상', '처리 결과', '비고', 'IP'];

/** 감사 로그 시험 자료 — 1쪽 3건(시각이 섞여 있어 정렬 결과가 응답 순서와 다릅니다) */
function pageRows(page) {
  const base = page === 2 ? 20 : 10;
  return [
    { id: `A-${base + 3}`, src: 'AUDIT', ts: `2026-09-30 1${page}:05:00`, type: 'PERM_CHANGE', result: 'ALLOW', empNo: '10000', name: '관리자', dept: '통합관리자', menuId: 'sys-account', menuNm: '계정 관리', fieldKey: null, maskedCnt: 0, target: '계정 부서 이동 [T1 → 생산관리팀]', detail: '메뉴 16건', ip: '10.1.2.3', ua: 'Mozilla/5.0 (시험 UA)' },
    { id: `L-${base + 1}`, src: 'LOGIN', ts: `2026-09-28 0${page}:00:00`, type: 'LOGIN', result: 'REJECT', empNo: '10001', name: '김품질', dept: '품질보증팀', target: '로그인', detail: '비밀번호 불일치(1회)', ip: '10.9.9.9', ua: 'Mozilla/5.0 (로그인 UA)' },
    { id: `A-${base + 2}`, src: 'AUDIT', ts: `2026-09-29 0${page}:30:00`, type: 'MASK', result: 'MASKED', empNo: '10004', name: '최전산', dept: '전산팀', target: 'AI 질의 응답', detail: '단가 마스킹', ip: '10.1.2.40', ua: 'Mozilla/5.0' },
  ];
}

const CODES = [
  { groupCd: 'LOG_AUDIT_TYPE', cd: 'LOGIN', nm: '로그인', sort: 1 },
  { groupCd: 'LOG_AUDIT_TYPE', cd: 'PERM_CHANGE', nm: '권한 변경', sort: 2 },
  { groupCd: 'LOG_AUDIT_TYPE', cd: 'MASK', nm: '마스킹 처리', sort: 3 },
  { groupCd: 'LOG_AUDIT_TYPE', cd: 'UNMASK_REQ', nm: '마스킹 해제 요청 (제거됨)', sort: 4 },
  { groupCd: 'LOG_AUDIT_TYPE', cd: 'EXPORT', nm: '내려받기 · 인쇄', sort: 5 },
  { groupCd: 'LOG_AUDIT_RESULT', cd: 'ALLOW', nm: '허용', sort: 1 },
  { groupCd: 'LOG_AUDIT_RESULT', cd: 'REJECT', nm: '반려', sort: 2 },
  { groupCd: 'LOG_AUDIT_RESULT', cd: 'MASKED', nm: '마스킹 후 제공', sort: 3 },
];

/** 내려받은 .xls(HTML 표)에서 머리글·본문 행을 꺼냅니다 */
function readXls(file) {
  const html = fs.readFileSync(file, 'utf8');
  const rows = [...html.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map((m) => [...m[1].matchAll(/<t[hd]>([\s\S]*?)<\/t[hd]>/g)].map((c) => c[1]));
  return { html, head: rows[0], body: rows.slice(1) };
}

/** 라벨로 SelectField 를 열고 항목을 고릅니다 (react-native-web 은 select 요소가 아닙니다) */
async function pickSelect(page, label, option) {
  const field = page.getByText(label, { exact: true }).first().locator('xpath=..');
  await field.locator('[tabindex="0"]').first().click();
  // 선택지 목록은 웹에서 document.body 끝에 포털로 그려집니다(공통 SelectField, 2026-10-01).
  // 표의 배지에도 같은 글자가 있으므로 문서 맨 끝(열린 목록)의 것을 고릅니다
  await page.getByText(option, { exact: true }).last().click();
}

const step = (m) => process.env.DEBUG && console.log('·', m);

(async () => {
  // 「이름(name)」 을 데이터 항목(작업자)의 응답 필드명으로 등록하고 그 항목 권한을 주지 않습니다 —
  // 파일의 이름 열이 「비공개」 로 채워지고 파일 안 n = 기록 blindCnt 인지 봅니다(AUD-17 수용 기준 4)
  const { browser, page } = await openStubbed({ me: adminMe({ dataPerms: [], dataFields: [{ key: 'worker', name: '작업자', attrs: ['name'] }] }) });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  if (process.env.DEBUG) page.on('console', (m) => ['error', 'warning'].includes(m.type()) && console.log('  console.' + m.type(), m.text().slice(0, 300)));
  const auditReqs = [];
  const logPosts = [];
  const exportPosts = [];
  let fail500 = false;
  let logFail = false;
  let truncated = false;

  await page.route('**/api/v1/common/codes**', (route) => route.fulfill({ json: { success: true, data: { codes: CODES } } }));
  await page.route('**/api/v1/audit-logs**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.pathname.endsWith('/audit-logs/export')) {
      exportPosts.push(req.postDataJSON());
      return route.fulfill({
        status: 200,
        headers: {
          'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'content-disposition': "attachment; filename*=UTF-8''%EB%B3%B4%EC%95%88_%EA%B0%90%EC%82%AC_%EB%A1%9C%EA%B7%B8_%EC%A0%84%EC%B2%B4.xlsx",
          'access-control-allow-origin': '*',
          'access-control-expose-headers': 'Content-Disposition, X-Export-Truncated, X-Export-Total, X-Export-Limit',
          ...(truncated ? { 'x-export-truncated': 'true', 'x-export-total': '50001', 'x-export-limit': '50000' } : {}),
        },
        body: Buffer.from('PK-test'),
      });
    }
    if (url.pathname.endsWith('/audit-logs/retention-policy')) {
      return route.fulfill({ json: { success: true, data: { retentionYears: 3, enabled: true, sources: [
        { src: 'AUDIT', totalCnt: 313, expiredCnt: 0, archivedCnt: 0, oldestAt: '2026-09-04 14:18:42' },
        { src: 'PERM', totalCnt: 635, expiredCnt: 0, archivedCnt: 0, oldestAt: '2026-09-04 14:37:13' },
        { src: 'LOGIN', totalCnt: 1509, expiredCnt: 2, archivedCnt: 0, oldestAt: '2026-09-04 14:15:30' },
      ], lastArchiveAt: null, nextArchiveAt: '2026-11-01 03:00:00', writeFailSinceBoot: 1, mailFailSinceBoot: 2 } } });
    }
    const q = Object.fromEntries(url.searchParams);
    auditReqs.push(q);
    if (fail500) return route.fulfill({ status: 500, json: { success: false, code: 'E-SYS-001', message: '시험용 서버 오류' } });
    const p = Number(q.page || 1);
    return route.fulfill({ json: { success: true, data: { items: pageRows(p) }, meta: { page: p, size: Number(q.size || 50), total: 6, totalPages: 2 } } });
  });
  await page.route('**/api/v1/download-logs', async (route) => {
    const req = route.request();
    if (req.method() !== 'POST') return route.continue();
    logPosts.push({ at: Date.now(), body: req.postDataJSON() });
    if (logFail) return route.fulfill({ status: 500, json: { success: false, code: 'E-SYS-001', message: '내려받기 기록에 실패했습니다.' } });
    return route.fulfill({ json: { success: true, data: { logId: 99 } } });
  });

  try {
    await page.goto(`${WEB}/system/audit-log`);
    const grid = page.locator('.tabulator').first();
    await grid.locator('.tabulator-row').first().waitFor({ timeout: 30000 });

    step('1. 9열');
    // 1. 9열 머리글 · 상세
    const heads = await grid.locator('.tabulator-col .tabulator-col-title').allInnerTexts();
    assert.deepEqual(heads.map((h) => h.trim()), HEADS, `9열 머리글: ${heads}`);
    assert(await page.getByText('마스킹 후 제공', { exact: true }).count(), '6. MASKED 배지 「마스킹 후 제공」');
    await grid.locator('.tabulator-row').nth(1).click();
    await page.getByText('감사 기록 L-11').waitFor();
    const modal = await page.evaluate(() => document.body.innerText);
    assert(modal.includes('10.9.9.9') && modal.includes('Mozilla/5.0 (로그인 UA)'), '상세에 IP · 접속 환경');
    await page.getByRole('button', { name: '닫기', exact: true }).last().click();
    await page.waitForTimeout(300);

    step('4. 검색어');
    // 1-b. 보존 정책 모달 (AUD-11 · AUD-13)
    await page.getByRole('button', { name: '보존 정책', exact: true }).click();
    await page.getByText('감사 로그 보존 정책', { exact: true }).waitFor();
    const pol = await page.evaluate(() => document.body.innerText);
    // R-20(2026-10-02) 배치 켜짐 — 다음 아카이브 시각을 보이고 「꺼짐」 안내는 없음. R-17 메일 발송 실패 수를 기록 실패 옆에
    assert(pol.includes('현재 2,457건 보관 중') && pol.includes('로그인 이력'), '보존 정책: 원천 합계·원천명');
    assert(pol.includes('2026-11-01 03:00:00') && pol.includes('매월 1일 03:00'), '다음 아카이브 시각·배치 안내');
    assert(!pol.includes('꺼짐') && !pol.includes('꺼져'), '「아카이브 배치 꺼짐」 안내 없음');
    assert(pol.includes('1건 · 메일 발송 실패 2건(기동 후)'), '기록 실패 · 메일 발송 실패 수');
    await page.getByRole('button', { name: '닫기', exact: true }).last().click();
    await page.waitForTimeout(300);

    // 4. 검색어는 Enter 에서만, 선택 변경은 즉시
    let before = auditReqs.length;
    const kw = page.getByRole('textbox', { name: '계정·검색어' });
    await kw.fill('10000');
    await page.waitForTimeout(700);
    assert.equal(auditReqs.length, before, '입력 중에는 요청하지 않는다');
    await kw.press('Enter');
    await page.waitForTimeout(700);
    assert.equal(auditReqs.at(-1).keyword, '10000', 'Enter 로 keyword 요청');
    before = auditReqs.length;
    await pickSelect(page, '결과', '반려');
    await page.waitForTimeout(700);
    assert(auditReqs.length > before && auditReqs.at(-1).result === 'REJECT', '결과 선택은 즉시 요청');
    await pickSelect(page, '결과', '전체');
    await kw.fill('');
    await kw.press('Enter');
    await grid.locator('.tabulator-row').first().waitFor();
    await page.waitForTimeout(500);

    step('3. 패널');
    // 3. 패널 — 단추 바로 아래, Esc 로 닫힘
    const btn = page.getByRole('button', { name: /엑셀 다운로드/ });
    await btn.click();
    const viewItem = page.getByRole('menuitem', { name: /조회 목록 다운로드 \(3건\)/ });
    await viewItem.waitFor();
    const b = await btn.boundingBox();
    const m = await page.getByRole('menu').boundingBox();
    assert(m.y >= b.y + b.height - 1 && m.y - (b.y + b.height) < 16, `패널이 단추 바로 아래: btn ${JSON.stringify(b)} menu ${JSON.stringify(m)}`);
    assert(await page.getByRole('menuitem', { name: /^전체 다운로드/ }).count(), '전체 다운로드 항목');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    assert.equal(await page.getByRole('menu').count(), 0, 'Esc 로 닫힘');

    step('3-a.');
    // 3-a. 조회 목록 — 「시각」 오름차순으로 정렬한 상태 그대로
    await grid.locator('.tabulator-col[tabulator-field="ts"] .tabulator-col-title').click();
    await page.waitForTimeout(300);
    const shown = await grid.locator('.tabulator-row .tabulator-cell[tabulator-field="ts"]').allInnerTexts();
    await btn.click();
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: /조회 목록 다운로드/ }).click()]);
    const savedAt = Date.now();
    const file = readXls(await dl.path());
    assert.deepEqual(file.head, HEADS, '파일 9열 = 화면 9열');
    assert.deepEqual(file.body.map((r) => r[0]), shown.map((t) => t.trim()), '파일 행 순서 = 표 정렬 순서');
    assert.equal(file.body.length, 3, '현재 쪽 행만');
    assert(file.html.indexOf('비공개 처리 3건(데이터 접근 권한 기준)') >= 0 && file.html.indexOf('비공개 처리 3건') < file.html.indexOf('<table'), '첫 줄에 비공개 처리 n건');
    assert.deepEqual(file.body.map((r) => r[3]), ['비공개', '비공개', '비공개'], '권한 밖 이름 열은 「비공개」');
    const log = logPosts.at(-1);
    assert(log && log.at <= savedAt, '기록이 파일 저장보다 먼저');
    assert.equal(log.body.scopeCd, 'VIEW');
    assert.equal(log.body.menuId, 'sys-audit');
    assert.equal(log.body.format, 'XLS');
    assert.equal(log.body.blindCnt, 3, '파일 안 n = 기록 blindCnt');
    assert.equal(log.body.reportId, undefined, 'reportId 는 보내지 않는다(DLG-03)');
    assert(/1쪽\/50건/.test(log.body.condSummary), `condSummary: ${log.body.condSummary}`);

    step('3-b.');
    // 3-b. 기록 실패 → 파일 없음(DLG-05)
    logFail = true;
    let downloads = 0;
    const onDl = () => { downloads += 1; };
    page.on('download', onDl);
    await btn.click();
    await page.getByRole('menuitem', { name: /조회 목록 다운로드/ }).click();
    await page.getByText('내려받기 기록을 남기지 못해 파일을 만들지 않았습니다', { exact: false }).first().waitFor();
    await page.waitForTimeout(500);
    assert.equal(downloads, 0, '기록 실패 시 파일을 만들지 않는다');
    page.off('download', onDl);
    logFail = false;

    step('3-c.');
    // 3-c. 전체 — 서버 생성만, 기록 API 는 부르지 않음 · 상한 안내
    const logsBefore = logPosts.length;
    truncated = true;
    await btn.click();
    const [dlAll] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: /^전체 다운로드/ }).click()]);
    assert(/보안_감사_로그_전체/.test(dlAll.suggestedFilename()), `서버 파일명: ${dlAll.suggestedFilename()}`);
    assert.equal(exportPosts.length, 1);
    assert.equal(exportPosts[0].scope, 'ALL');
    assert.equal(exportPosts[0].menuId, 'sys-audit');
    assert.equal(exportPosts[0].format, 'xlsx');
    assert(!('from' in exportPosts[0]) && !('keyword' in exportPosts[0]), '전체는 기간·검색어를 보내지 않는다');
    await page.getByText('상한 50,000건까지 내려받았습니다(전체 50,001건)').first().waitFor();
    assert.equal(logPosts.length, logsBefore, '전체 다운로드는 POST /download-logs 를 부르지 않는다');

    step('2. 390px');
    // 2. 390px 가로 스크롤 — 마지막 열 IP
    await page.setViewportSize({ width: 390, height: 860 });
    await page.waitForTimeout(600);
    const scroll = await page.evaluate(async () => {
      const box = document.querySelector('.ax-table-scroller');
      box.scrollLeft = box.scrollWidth;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const outer = box.getBoundingClientRect();
      const head = box.querySelector('.tabulator-col[tabulator-field="ip"]').getBoundingClientRect();
      const cell = box.querySelector('.tabulator-row .tabulator-cell[tabulator-field="ip"]').getBoundingClientRect();
      return { scrolled: box.scrollLeft > 0, headIn: head.right <= outer.right + 2 && head.left >= outer.left - 2, cellIn: cell.right <= outer.right + 2, aligned: Math.abs(head.left - cell.left) < 2, pageScroll: document.documentElement.scrollWidth - window.innerWidth };
    });
    assert(scroll.scrolled && scroll.headIn && scroll.cellIn && scroll.aligned, `390px 마지막 열: ${JSON.stringify(scroll)}`);

    step('3-d.');
    // 3-d. 360px 에서 패널이 화면 밖으로 잘리지 않는다
    await page.setViewportSize({ width: 360, height: 800 });
    await page.waitForTimeout(400);
    await btn.scrollIntoViewIfNeeded();
    await btn.click();
    const m360 = await page.getByRole('menu').boundingBox();
    assert(m360.x >= 0 && m360.x + m360.width <= 360 + 1, `360px 패널: ${JSON.stringify(m360)}`);
    await page.keyboard.press('Escape');
    await page.setViewportSize({ width: 1440, height: 960 });

    step('5. API 500');
    // 5. API 500 → 오류 · 다시 시도 · 행 0
    fail500 = true;
    await page.getByRole('button', { name: '조회', exact: true }).click();
    await page.getByText('감사 로그를 불러오지 못했습니다', { exact: false }).waitFor();
    assert(await page.getByRole('button', { name: '다시 시도', exact: true }).count(), '다시 시도 단추');
    assert.equal(await page.locator('.tabulator-row').count(), 0, '오류 시 표 행 0');
    fail500 = false;
    await page.getByRole('button', { name: '다시 시도', exact: true }).click();
    await page.locator('.tabulator-row').first().waitFor();

    assert.equal(errors.length, 0, errors.join('\n'));
    console.log('PASS: sys-audit 9열·상세, 390px 가로 스크롤, 엑셀 패널(조회 목록 VIEW·기록 선행·실패 차단·전체 ALL·상한 안내·360px), 검색 Enter/선택 즉시, 오류 상태, MASKED 배지');
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exitCode = 1; });
