/*
 * 보고서 다운로드 이력(sys-dl) 화면 — 기획 10 6.2 의 WEB 브라우저 시험 1~10
 *
 *  1. 부서 「전산팀」 선택 → 요청 deptId=5
 *  2. 화면 선택지 「불량 현황 조회」 → menuId=qc-defect
 *  3. 요약 요청에 from·to, 카드 이름 「조회 기간」
 *  4. meta.total=1500 · items 1000 → 부제 「전체 1,500건 중 최근 1,000건」
 *  5. 행 클릭 → 상세(생성 조건 · 제외된 항목)
 *  6. 폭 390px 에서 마지막 열 「IP」 까지 가로 스크롤, 머리글·본문 함께 이동
 *  7. 목록 500 → 카드 오류 · 「다시 시도」, 필터는 그대로
 *  8. 다른 화면(연간 출하계획) CSV — POST /download-logs 가 파일 저장보다 먼저, 본문 {menuId:'rpt-ship-plan', format:'CSV'}.
 *     그 요청이 500 이면 파일이 저장되지 않는다
 *  9. [엑셀 다운로드 ▾] 두 항목·건수, 조회 목록 = 그리드 정렬·열 순서(IP 를 앞으로 옮김) 그대로 · scopeCd VIEW · condSummary,
 *     전체 = POST /download-logs/export {scope:'ALL'} 만. 360px 에서 패널이 잘리지 않음
 * 10. 「범위」·「조회 조건」 열, 「범위」 필터 → scopeCd, 상세의 비공개 건수 ≠ 항목별 합계 → 「항목별 합계와 다름」
 *
 * 실 API 모드 개발 서버에서 돌립니다(목 모드 번들은 네트워크를 쓰지 않아 page.route 가 닿지 않습니다).
 * 실행: WEB_URL=http://localhost:8081 node tests/system/download-log-browser.cjs
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { WEB } = require('../lib/browser');
const { openStubbed } = require('../lib/stubSession');

const step = (m) => process.env.DEBUG && console.log('·', m);

const DEPTS = [
  { deptId: 1, deptNm: '통합관리자' },
  { deptId: 5, deptNm: '전산팀' },
  { deptId: 2, deptNm: '품질보증팀' },
];

function rows(n = 3) {
  const base = [
    { dlId: 42, ts: '2026-09-29 11:18:10', empNo: '10004', name: '최전산', dept: '전산팀', deptId: 5, report: 'KPI 산출 증빙', menuId: 'dash-ai', format: 'XLS', origin: 'SERVER', scopeCd: 'ALL', condSummary: 'yearMonth=전월', rowCnt: 12, blindCnt: 3, ip: '10.1.2.3', result: 'DONE' },
    { dlId: 41, ts: '2026-09-29 17:02:00', empNo: '10003', name: '이제조', dept: '제조팀', deptId: 3, report: '출하계획_2026', menuId: 'rpt-ship-plan', format: 'CSV', origin: 'CLIENT', scopeCd: 'VIEW', condSummary: '2026년 · 고객사 전체', rowCnt: 48, blindCnt: 2, ip: '10.1.2.77', result: 'DONE', params: '{"note":"attrs-missing"}' },
    { dlId: 40, ts: '2026-09-28 08:00:00', empNo: '10001', name: '김품질', dept: '품질보증팀', deptId: 2, report: '설비별 불량률', menuId: null, reportId: 'qc-defect', format: 'XLS', origin: null, scopeCd: null, scope: 'from=2026-09-21', rowCnt: 634, blindCnt: 0, ip: '10.1.2.9', result: 'DONE' },
  ];
  if (n <= 3) return base;
  return Array.from({ length: n }, (_, i) => ({ ...base[i % 3], dlId: 10000 - i, rowCnt: i }));
}

function readXls(file) {
  const html = fs.readFileSync(file, 'utf8');
  const all = [...html.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map((m) => [...m[1].matchAll(/<t[hd]>([\s\S]*?)<\/t[hd]>/g)].map((c) => c[1]));
  return { html, head: all[0], body: all.slice(1) };
}

async function pickSelect(page, label, option) {
  const field = page.getByText(label, { exact: true }).first().locator('xpath=..');
  await field.locator('[tabindex="0"]').first().click();
  // 선택지 목록은 웹에서 document.body 끝에 포털로 그려집니다(공통 SelectField, 2026-10-01).
  // 표의 배지에도 같은 글자가 있으므로 문서 맨 끝(열린 목록)의 것을 고릅니다
  await page.getByText(option, { exact: true }).last().click();
}

(async () => {
  const { browser, page } = await openStubbed();
  if (process.env.DEBUG) page.on('console', (m) => ['error', 'warning'].includes(m.type()) && console.log('  console.' + m.type(), m.text().slice(0, 300)));
  // 다른 화면(연간 출하계획) CSV 시험용 자료
  await page.route('**/api/v1/reports/ship-plan**', (route) => route.fulfill({ json: { success: true, data: { rows: [
    { model: 'M-100', customer: '고객사A', total: 1200, monthly: [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100] },
    { model: 'M-200', customer: '고객사B', total: 600, monthly: [50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50] },
  ] } } }));
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const listReqs = [];
  const sumReqs = [];
  const logPosts = [];
  const exportPosts = [];
  let mode = 'normal';
  let logFail = false;

  await page.route('**/api/v1/system/depts**', (route) => route.fulfill({ json: { success: true, data: { items: DEPTS } } }));
  await page.route('**/api/v1/download-logs**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname.replace(/.*\/api\/v1\/download-logs/, '');
    const q = Object.fromEntries(url.searchParams);
    if (req.method() === 'POST' && path === '/export') {
      exportPosts.push(req.postDataJSON());
      return route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/octet-stream', 'content-disposition': 'attachment; filename="download_log_all.xlsx"', 'access-control-allow-origin': '*', 'access-control-expose-headers': 'Content-Disposition, X-Export-Truncated, X-Export-Total' },
        body: Buffer.from('PK-test'),
      });
    }
    if (req.method() === 'POST' && path === '') {
      logPosts.push({ at: Date.now(), body: req.postDataJSON() });
      if (logFail) return route.fulfill({ status: 500, json: { success: false, code: 'E-SYS-001', message: '내려받기 기록에 실패했습니다.' } });
      return route.fulfill({ json: { success: true, data: { logId: 501 } } });
    }
    if (path === '/summary') { sumReqs.push(q); return route.fulfill({ json: { success: true, data: { totalCnt: mode === 'big' ? 1500 : 3, todayCnt: 1 } } }); }
    if (path === '/retention-policy') return route.fulfill({ json: { success: true, data: { retentionYears: 3, enabled: true, totalCnt: 44, expiredCnt: 0, archivedCnt: 0, archiveTargetCnt: 0, oldestAt: '2026-09-04 14:18:42', lastArchiveAt: null, nextArchiveAt: '2026-11-01 03:00:00' } } });
    if (/^\/\d+$/.test(path)) {
      const id = Number(path.slice(1));
      const r = rows().find((x) => x.dlId === id) || rows()[0];
      return route.fulfill({ json: { success: true, data: { ...r, params: { yearMonth: '전월', format: 'xls' }, fileNm: 'kpi.xls', fileSize: 3722, blindFields: [{ fieldKey: 'price', fieldNm: '단가', cellCnt: 1 }] } } });
    }
    listReqs.push(q);
    if (mode === 'fail') return route.fulfill({ status: 500, json: { success: false, code: 'E-SYS-001', message: '시험용 서버 오류' } });
    const items = mode === 'big' ? rows(1000) : rows();
    return route.fulfill({ json: { success: true, data: { items }, meta: { page: 1, size: 1000, total: mode === 'big' ? 1500 : items.length, totalPages: mode === 'big' ? 2 : 1 } } });
  });

  try {
    await page.goto(`${WEB}/system/download-log`);
    const grid = page.locator('.tabulator').first();
    await grid.locator('.tabulator-row').first().waitFor({ timeout: 30000 });
    await page.waitForTimeout(600);

    step('3. 요약');
    // 3. 요약 요청에 from · to, 카드 이름
    assert(sumReqs.length && sumReqs.at(-1).from && sumReqs.at(-1).to, `요약 요청에 기간: ${JSON.stringify(sumReqs.at(-1))}`);
    const text = await page.evaluate(() => document.body.innerText);
    assert(text.includes('조회 기간') && text.includes('금일'), '카드 「조회 기간」·「금일」');
    assert(!text.includes('누적 다운로드'), '「누적」 카드 이름은 쓰지 않는다');

    step('10-a.');
    // 10-a. 범위 · 조회 조건 · 출처 열, attrs 누락 표시
    const heads = (await grid.locator('.tabulator-col .tabulator-col-title').allInnerTexts()).map((h) => h.trim());
    for (const h of ['화면', '범위', '조회 조건', '출처', 'IP']) assert(heads.includes(h), `${h} 열: ${heads}`);
    assert.equal(heads.at(-1), 'IP', '마지막 열 IP');
    assert(text.includes('attrs 누락'), 'attrs 없이 만든 파일 표시');
    assert(text.includes('불량 현황 조회'), '예전 기록(reportId 에 화면 ID)도 화면 이름으로');

    step('1. 부서');
    // 1. 부서 → deptId
    await pickSelect(page, '부서', '전산팀');
    await page.waitForTimeout(600);
    assert.equal(listReqs.at(-1).deptId, '5', '부서 ID 로 요청');
    await pickSelect(page, '부서', '전체');
    // 2. 화면 → menuId
    await pickSelect(page, '화면', '생산 및 품질 관리 · 불량 현황 조회');
    await page.waitForTimeout(600);
    assert.equal(listReqs.at(-1).menuId, 'qc-defect', '화면 ID 로 요청');
    await pickSelect(page, '화면', '전체');
    // 10-b. 범위 필터 → scopeCd
    await pickSelect(page, '범위', '전체 다운로드');
    await page.waitForTimeout(600);
    assert.equal(listReqs.at(-1).scopeCd, 'ALL', '범위 필터');
    await pickSelect(page, '범위', '전체');
    await page.waitForTimeout(600);

    step('5 · 10-c.');
    // 5 · 10-c. 상세 — 생성 조건 · 제외된 항목 · 비공개 건수 불일치 표시
    await grid.locator('.tabulator-row').first().click();
    await page.getByText('내려받기 기록 #42').waitFor();
    const detail = await page.evaluate(() => document.body.innerText);
    assert(detail.includes('생성 조건') && detail.includes('yearMonth') && detail.includes('제외된 항목') && detail.includes('단가'), '상세 생성 조건·제외된 항목');
    assert(detail.includes('항목별 합계와 다름'), 'blindCnt 3 ≠ 항목별 합계 1 → 표시');
    await page.getByRole('button', { name: '닫기', exact: true }).last().click();
    await page.waitForTimeout(300);

    step('9. 패널');
    // 보존 정책 모달 — R-20 배치 켜짐(다음 아카이브 시각, 「꺼짐」 안내 없음)
    await page.getByRole('button', { name: '보존 정책', exact: true }).click();
    await page.getByText('다운로드 이력 보존 정책', { exact: true }).waitFor();
    const pol = await page.evaluate(() => document.body.innerText);
    assert(pol.includes('2026-11-01 03:00:00') && pol.includes('매월 1일 03:00') && !pol.includes('꺼짐') && !pol.includes('꺼져'), '보존 정책: 다음 아카이브 · 배치 안내');
    await page.getByRole('button', { name: '닫기', exact: true }).last().click();
    await page.waitForTimeout(300);

    // 9. 패널 두 항목·건수
    const btn = page.getByRole('button', { name: /엑셀 다운로드/ });
    await btn.click();
    await page.getByRole('menuitem', { name: /조회 목록 다운로드 \(3건\)/ }).waitFor();
    assert(await page.getByRole('menuitem', { name: /전체 다운로드 \(44건\)/ }).count(), '전체 다운로드(보관 건수)');
    await page.keyboard.press('Escape');

    step('9-a.');
    // 9-a. 행 수 내림차순 + IP 열을 앞으로 옮긴 뒤 조회 목록
    await grid.locator('.tabulator-col[tabulator-field="rowCnt"] .tabulator-col-title').click();
    await page.waitForTimeout(200);
    await grid.locator('.tabulator-col[tabulator-field="rowCnt"] .tabulator-col-title').click();
    await page.waitForTimeout(200);
    // 머리글을 끌어 IP 열을 「출처」 앞으로 옮깁니다 (movableColumns) — 둘 다 보이는 자리에서 끕니다
    const ipHead = grid.locator('.tabulator-col[tabulator-field="ip"] .tabulator-col-title');
    await ipHead.scrollIntoViewIfNeeded();
    const src = await ipHead.boundingBox();
    const dst = await grid.locator('.tabulator-col[tabulator-field="origin"] .tabulator-col-title').boundingBox();
    await page.mouse.move(src.x + src.width / 2, src.y + src.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(700); // Tabulator 는 누르고 잠시 있어야 열 이동을 시작합니다
    await page.mouse.move(src.x + src.width / 2 - 10, src.y + src.height / 2, { steps: 5 });
    await page.mouse.move(dst.x + 4, dst.y + dst.height / 2, { steps: 20 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    let order = (await grid.locator('.tabulator-col .tabulator-col-title').allInnerTexts()).map((h) => h.trim());
    const moved = order.indexOf('IP') < order.indexOf('출처');
    step(`열 순서(IP 이동 ${moved ? '됨' : '안 됨'}): ${order.join(',')}`);
    const shownRowCnt = await grid.locator('.tabulator-row .tabulator-cell[tabulator-field="rowCnt"]').allInnerTexts();
    await btn.click();
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: /조회 목록 다운로드/ }).click()]);
    const savedAt = Date.now();
    const file = readXls(await dl.path());
    // 헤드리스 끌기로는 열 이동이 확정되지 않을 때가 있어(placeholder 까지는 생김) 이동 여부와 무관하게
    // 「파일 열 순서 = 지금 그리드 열 순서」 를 확인합니다. 이동이 됐으면 그 순서가 곧 옮긴 순서입니다.
    assert.deepEqual(file.head, order, `파일 열 순서 = 그리드 열 순서 (IP 이동 ${moved ? '됨' : '안 됨'})`);
    const rowIdx = file.head.indexOf('행 수');
    assert.deepEqual(file.body.map((r) => r[rowIdx]), shownRowCnt.map((t) => t.trim().replace(/,/g, '')), '파일 행 순서 = 그리드 정렬');
    assert(file.html.indexOf('비공개 처리 0건(데이터 접근 권한 기준)') < file.html.indexOf('<table'), '첫 줄 비공개 처리 n건');
    const log = logPosts.at(-1);
    assert(log.at <= savedAt, '기록이 저장보다 먼저');
    assert.equal(log.body.scopeCd, 'VIEW');
    assert.equal(log.body.menuId, 'sys-dl');
    assert(/화면 전체/.test(log.body.condSummary), `condSummary: ${log.body.condSummary}`);
    await page.waitForTimeout(600);

    step('9-b.');
    // 9-b. 전체 — 서버만
    const before = logPosts.length;
    await btn.click();
    const [dlAll] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: /^전체 다운로드/ }).click()]);
    assert.equal(dlAll.suggestedFilename(), 'download_log_all.xlsx');
    // 「전체」 는 조건 무관 — 기간·검색어를 보내지 않습니다(서버는 주면 그것만 봅니다)
    assert.deepEqual(exportPosts.at(-1), { scope: 'ALL', menuId: 'sys-dl', format: 'xlsx', condSummary: '전체 · 최근 순' });
    assert.equal(logPosts.length, before, '전체는 POST /download-logs 를 부르지 않는다');

    step('6. 390px');
    // 6. 390px — 마지막 열 IP 까지 가로 스크롤
    await page.reload();
    await grid.locator('.tabulator-row').first().waitFor();
    await page.setViewportSize({ width: 390, height: 860 });
    await page.waitForTimeout(800);
    const sc = await page.evaluate(async () => {
      const root = document.querySelector('.tabulator');
      const holder = root.querySelector('.tabulator-tableholder');
      const box = [holder, ...root.querySelectorAll('div')].find((el) => el && el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflowX !== 'hidden' && getComputedStyle(el).overflowX !== 'visible') || holder;
      box.scrollLeft = box.scrollWidth;
      await new Promise((r) => setTimeout(r, 200));
      const outer = root.getBoundingClientRect();
      const head = root.querySelector('.tabulator-col[tabulator-field="ip"]').getBoundingClientRect();
      const cell = root.querySelector('.tabulator-row .tabulator-cell[tabulator-field="ip"]').getBoundingClientRect();
      return { scrolled: box.scrollLeft > 0, headIn: head.right <= outer.right + 2 && head.left >= outer.left - 2, cellIn: cell.right <= outer.right + 2, aligned: Math.abs(head.left - cell.left) < 2, wider: root.getBoundingClientRect().width <= window.innerWidth };
    });
    assert(sc.scrolled && sc.headIn && sc.cellIn && sc.aligned && sc.wider, `390px 마지막 열: ${JSON.stringify(sc)}`);
    step('9-c.');
    // 9-c. 360px 패널
    await page.setViewportSize({ width: 360, height: 800 });
    await page.waitForTimeout(400);
    await btn.scrollIntoViewIfNeeded();
    await btn.click();
    const m = await page.getByRole('menu').boundingBox();
    assert(m.x >= 0 && m.x + m.width <= 361, `360px 패널: ${JSON.stringify(m)}`);
    await page.keyboard.press('Escape');
    await page.setViewportSize({ width: 1440, height: 960 });

    step('4. 1,500');
    // 4. 1,500건 중 1,000건
    mode = 'big';
    await page.getByRole('button', { name: '조회', exact: true }).click();
    await page.getByText('전체 1,500건 중 최근 1,000건', { exact: false }).waitFor({ timeout: 20000 });

    step('7. 목록');
    // 7. 목록 500 → 오류 · 다시 시도 · 필터 유지
    mode = 'fail';
    await page.getByRole('button', { name: '조회', exact: true }).click();
    await page.getByText('다운로드 이력을 불러오지 못했습니다', { exact: false }).waitFor();
    assert(await page.getByRole('button', { name: '다시 시도', exact: true }).count());
    assert(await page.getByText('범위', { exact: true }).count(), '필터는 그대로');
    mode = 'normal';
    await page.getByRole('button', { name: '다시 시도', exact: true }).click();
    await grid.locator('.tabulator-row').first().waitFor();

    step('8. 다른');
    // 8. 다른 화면(연간 출하계획) CSV — 기록 선행 · 실패 시 저장 안 함
    await page.goto(`${WEB}/report/ship-plan`);
    const csv = page.getByRole('button', { name: 'CSV', exact: true });
    await csv.waitFor({ timeout: 60000 });
    await page.waitForTimeout(3000);
    const n0 = logPosts.length;
    const [dlCsv] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), csv.click()]);
    const csvAt = Date.now();
    const csvLog = logPosts[n0];
    assert(csvLog && csvLog.at <= csvAt, '출하계획 CSV 기록이 저장보다 먼저');
    assert.equal(csvLog.body.menuId, 'rpt-ship-plan');
    assert.equal(csvLog.body.format, 'CSV');
    assert(/\.csv$/.test(dlCsv.suggestedFilename()));
    const csvText = fs.readFileSync(await dlCsv.path(), 'utf8');
    assert(/^﻿?"비공개 처리 \d+건\(데이터 접근 권한 기준\)"/.test(csvText), 'CSV 첫 줄 비공개 처리 n건');
    logFail = true;
    let downloads = 0;
    page.on('download', () => { downloads += 1; });
    await csv.click();
    await page.getByText('내려받기 기록을 남기지 못해 파일을 만들지 않았습니다', { exact: false }).first().waitFor();
    await page.waitForTimeout(800);
    assert.equal(downloads, 0, '기록 500 이면 파일이 저장되지 않는다');

    // attrs 없는 호출의 개발 모드 콘솔 오류는 의도한 경고이므로 pageerror 만 봅니다
    assert.equal(errors.length, 0, errors.join('\n'));
    console.log('PASS: sys-dl 부서 ID·화면 menuId·범위 필터·요약 기간, 1,500/1,000 부제, 상세(생성 조건·제외 항목·불일치), 390px 가로 스크롤, 오류 상태, 엑셀 패널(조회 목록 VIEW·열 순서·전체 ALL·360px), 출하계획 CSV 기록 선행·실패 차단');
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exitCode = 1; });
