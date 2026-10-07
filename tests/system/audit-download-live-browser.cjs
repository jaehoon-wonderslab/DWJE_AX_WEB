/*
 * 보안 감사 로그(sys-audit) · 보고서 다운로드 이력(sys-dl) — 실 API 호출 시험 (기획 09 · 10, 3단계)
 *
 * page.route 로 응답을 흉내 내는 시험(audit-log-browser · download-log-browser)과 달리,
 * 여기서는 서버가 실제로 받는지·남기는지를 봅니다.
 *  1. 감사 로그 목록 — 행 id 가 원천 접두어 문자열(A-·P-·L-), 상세 모달 제목에 같은 id
 *  2. 조회 목록 다운로드 → 파일 저장, 서버 이력에 menuId=sys-audit · scopeCd=VIEW · condSummary 가 남음
 *  3. 전체 다운로드 → 서버 생성 xlsx, 서버 이력에 scopeCd=ALL (브라우저는 기록 API 를 부르지 않음)
 *  4. 보존 정책 모달 — 서버에 API 가 있으면 원천별 건수, 없으면 「준비 중」 안내
 *  5. 다운로드 이력 — 목록·요약 카드·행 상세(실 상세 API), 조회 목록 다운로드 기록(menuId=sys-dl)
 *
 * 앱 번들은 localhost:8080 을 부르므로 API_URL(기본 http://localhost:18081)로 돌립니다.
 * 실 API 모드 개발 서버가 필요합니다. 이 시험은 실제 내려받기 이력을 남깁니다(이력 표는 지울 수 없음).
 * 실행: API_URL=http://localhost:18081 WEB_URL=http://localhost:8094 node tests/system/audit-download-live-browser.cjs
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright-core');
const { WEB } = require('../lib/browser');
const { readXlsx } = require('../lib/xlsx');

const API = process.env.API_URL || 'http://localhost:18081';
const PASSWORD = process.env.TEST_PASSWORD || 'Dwje!2026';
const step = (m) => process.env.DEBUG && console.log('·', m);

async function apiGet(token, path) {
  const res = await fetch(`${API}/api/v1${path}`, { headers: { Authorization: `Bearer ${token}` } });
  return res.json();
}

/** 이 시험이 시작한 뒤의 내려받기 기록 중 조건에 맞는 것 */
async function findLog(token, menuId, since, pred) {
  for (let i = 0; i < 10; i += 1) {
    // 끝은 오늘(한국 시각) — 시작 기록이 어제 것이면 since 날짜만으로는 오늘 기록이 빠집니다
    const today = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
    const r = await apiGet(token, `/download-logs?menuId=${menuId}&size=20&from=${since.slice(0, 10)}&to=${today}`);
    const hit = (r.data?.items || []).find((x) => x.ts >= since && pred(x));
    if (hit) return hit;
    await new Promise((res) => setTimeout(res, 500));
  }
  return null;
}

(async () => {
  const login = await (await fetch(`${API}/api/v1/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ loginId: '10000', password: PASSWORD }),
  })).json();
  if (!login.success) throw new Error(`로그인 실패(${API}): ${login.message}`);
  const token = login.data.accessToken;
  // 서버 시각 기준 시작 시각 — 목록의 ts 와 비교합니다
  const first = await apiGet(token, '/download-logs?size=1');
  const since = String(first.data?.items?.[0]?.ts || '2000-01-01 00:00:00');

  const browser = await chromium.launch({ channel: 'chrome', headless: process.env.HEADED !== '1' });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 960 }, acceptDownloads: true })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const target = new URL(API).host;
  if (target !== 'localhost:8080') {
    await page.route('http://localhost:8080/**', (r) => r.continue({ url: r.request().url().replace('localhost:8080', target) }));
  }
  let browserLogPosts = 0;
  const auditGets = [];
  page.on('request', (r) => { if (r.method() === 'GET' && /\/api\/v1\/audit-logs\?/.test(r.url())) auditGets.push(Object.fromEntries(new URL(r.url()).searchParams)); });
  page.on('request', (r) => { if (r.method() === 'POST' && /\/api\/v1\/download-logs$/.test(r.url())) browserLogPosts += 1; });

  try {
    await page.goto(`${WEB}/login`);
    await page.evaluate((s) => localStorage.setItem('dwje.ax.session', JSON.stringify(s)), {
      accessToken: login.data.accessToken, refreshToken: login.data.refreshToken, userInfo: login.data.user,
    });

    // 1. 감사 로그 — 접두어 id
    step('1. 감사 로그');
    await page.goto(`${WEB}/system/audit-log`);
    const grid = page.locator('.tabulator').first();
    await grid.locator('.tabulator-row').first().waitFor({ timeout: 60000 });
    await grid.locator('.tabulator-row').first().click();
    const title = page.getByText(/^감사 기록 [APL]-\d+$/);
    await title.first().waitFor();
    step(`상세 ${await title.first().innerText()}`);
    await page.getByRole('button', { name: '닫기', exact: true }).last().click();
    await page.waitForTimeout(300);

    // 1-b. 2쪽은 1쪽 기준 시각(asOf)으로 받습니다 — 쪽 경계 고정(4.7)
    const firstTs = (await grid.locator('.tabulator-row .tabulator-cell[tabulator-field="ts"]').first().innerText()).trim();
    const firstIds = await page.evaluate(() => [...document.querySelectorAll('.tabulator-row')].length);
    await page.getByRole('button', { name: '다음 쪽', exact: true }).first().click();
    await page.waitForTimeout(1500);
    const p2 = auditGets.filter((q) => q.page === '2').at(-1);
    assert(p2 && p2.asOf === firstTs, `2쪽 요청에 asOf=1쪽 첫 시각: ${JSON.stringify(p2)} / ${firstTs}`);
    step(`2쪽 asOf=${p2.asOf} (1쪽 ${firstIds}행)`);
    await page.getByRole('button', { name: '이전 쪽', exact: true }).first().click();
    await page.waitForTimeout(1000);

    // 2. 조회 목록 — 서버 이력 VIEW
    step('2. 조회 목록');
    const btn = page.getByRole('button', { name: /엑셀 다운로드/ });
    await btn.click();
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.getByRole('menuitem', { name: /조회 목록 다운로드/ }).click()]);
    assert(/\.xlsx$/.test(dl.suggestedFilename()), `조회 목록 파일: ${dl.suggestedFilename()}`);
    const xls = await readXlsx(await dl.path());
    assert(/비공개 처리 \d+건\(데이터 접근 권한 기준\)/.test(xls.meta), '파일 첫 줄 비공개 처리 n건');
    const viewLog = await findLog(token, 'sys-audit', since, (x) => x.scopeCd === 'VIEW');
    assert(viewLog, '서버 이력에 sys-audit VIEW 기록');
    assert(/쪽\/\d+건/.test(viewLog.condSummary || ''), `condSummary 저장: ${viewLog.condSummary}`);
    assert.equal(viewLog.format, 'XLSX');
    assert.equal(viewLog.origin, 'CLIENT');
    const posts = browserLogPosts;

    // 3. 전체 — 서버 생성, 브라우저 기록 없음
    step('3. 전체');
    await btn.click();
    const [dlAll] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.getByRole('menuitem', { name: /^전체 다운로드/ }).click()]);
    assert(/\.xlsx$/.test(dlAll.suggestedFilename()), `서버 파일: ${dlAll.suggestedFilename()}`);
    const head = fs.readFileSync(await dlAll.path()).subarray(0, 2).toString();
    assert.equal(head, 'PK', 'xlsx(zip) 파일');
    assert.equal(browserLogPosts, posts, '전체 다운로드는 브라우저가 기록 API 를 부르지 않는다');
    const allLog = await findLog(token, 'sys-audit', since, (x) => x.scopeCd === 'ALL');
    assert(allLog, '서버 이력에 sys-audit ALL 기록(서버가 남김)');
    assert.equal(allLog.origin, 'SERVER');

    // 4. 보존 정책 모달
    step('4. 보존 정책');
    await page.getByRole('button', { name: '보존 정책', exact: true }).click();
    await page.getByText('감사 로그 보존 정책', { exact: true }).waitFor();
    const policyText = await page.evaluate(() => document.body.innerText);
    assert(policyText.includes('보존 기간') && policyText.includes('로그인 이력') && policyText.includes('기록 실패') && policyText.includes('메일 발송 실패'), '보존 정책 원천별 건수·기록 실패·메일 발송 실패 수');
    step(policyText.includes('서버 설정 꺼짐') ? '18081 보존 배치 설정은 아직 꺼짐' : '18081 보존 배치 켜짐');
    assert(!policyText.includes('아직 서버에 없습니다'), '보존 정책 API 가 응답');
    await page.getByRole('button', { name: '닫기', exact: true }).last().click();

    // 5. 다운로드 이력 — 목록·상세·조회 목록 기록
    step('5. 다운로드 이력');
    await page.goto(`${WEB}/system/download-log`);
    const g2 = page.locator('.tabulator').first();
    await g2.locator('.tabulator-row').first().waitFor({ timeout: 60000 });
    const txt = await page.evaluate(() => document.body.innerText);
    assert(txt.includes('조회 기간') && /전체 [\d,]+건 중 최근 [\d,]+건/.test(txt), '요약 카드 · 부제');
    assert(txt.includes('조회 목록') || txt.includes('전체'), '범위 칸 표시');
    await g2.locator('.tabulator-row').first().click();
    await page.getByText(/^내려받기 기록 #\d+$/).first().waitFor();
    const detail = await page.evaluate(() => document.body.innerText);
    assert(detail.includes('생성 조건') && detail.includes('제외된 항목'), '실 상세 API');
    assert(!detail.includes('상세를 불러오지 못해'), '상세 API 가 응답');
    assert(/비공개 처리\s*\n?\s*\d+건/.test(detail), '상세의 비공개 처리 건수(서버 blindCellSum·blindBasis)');
    await page.getByRole('button', { name: '닫기', exact: true }).last().click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /엑셀 다운로드/ }).click();
    await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.getByRole('menuitem', { name: /조회 목록 다운로드/ }).click()]);
    const dlLog = await findLog(token, 'sys-dl', since, (x) => x.scopeCd === 'VIEW');
    assert(dlLog, '서버 이력에 sys-dl VIEW 기록');

    assert.equal(errors.length, 0, errors.join('\n'));
    console.log(`PASS(live ${API}): 감사 로그 접두어 id·상세, 조회 목록 VIEW 기록(condSummary), 전체 ALL 서버 기록·xlsx, 보존 정책 모달, 다운로드 이력 목록·실 상세·VIEW 기록`);
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exitCode = 1; });
