/*
 * 업로드 문서 목록(SY-16) · 데이터 연동 이력(SY-15) — 실 API 브라우저 시험 (3단계)
 *
 *   WEB_URL=http://localhost:8097 LIVE_API=http://localhost:18081 node tests/system/sync-upload-live-browser.cjs
 *
 * 실 API 모드 개발 서버(EXPO_PUBLIC_USE_MOCK=false, 번들 API 주소 localhost:8080)를 띄워 두고,
 * 앱의 8080 호출을 page.route 로 LIVE_API(최신 코드의 API)로 돌립니다. 8080 사용자 프로세스는 건드리지 않습니다.
 * 재실행·업로드 같은 쓰기 동작은 누르지 않습니다(확인창 문구만 확인).
 *
 * 확인 항목
 *  업로드 문서: 목록 요청에 page·size 가 실림 · 문서 수 카드 = summary.docCnt(전체 기준) · 업로더 선택지 = uploaders ·
 *               기간 2030 → 빈 상태 · 「전체」 파일 행 수 = size=0 응답 건수
 *  연동 이력:   진입 요청 state 에 한글 없음 · 상태 「실패」 → state=FAIL 200 · 연동 상태 줄 = healthState ·
 *               원본 테이블 선택 → srcTable 전달 · 실행 이력 쪽 나눔 · 실행 행 클릭 → runId 로 작업 필터 ·
 *               실패 작업 상세 모달(정합성·확인창 부제 undefined 없음) · 「전체」 → POST /sync/export 200 xlsx ·
 *               폭 390px 에서 작업 표 마지막 열(관리)까지 가로 스크롤
 */
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const { readXlsx } = require('../lib/xlsx');

const WEB = process.env.WEB_URL || 'http://localhost:8097';
const LIVE = process.env.LIVE_API || 'http://localhost:18081';
const APP_API = process.env.APP_API || 'http://localhost:8080';
const PASSWORD = process.env.TEST_PASSWORD || 'Dwje!2026';

const results = [];
const step = async (name, fn) => {
  try { await fn(); results.push(`ok   ${name}`); } catch (e) { results.push(`FAIL ${name} — ${String(e.message).split("\n")[0]}`); if (process.env.DEBUG_FULL) console.error(e.message); throw e; }
};

/**
 * 선택 칸을 엽니다 — 열리면 화면의 「전체」 글자가 하나 늘어납니다(선택지 목록).
 * 선택지 목록은 문서 끝(포털)에 그려지므로, 고를 때는 화면에서 마지막에 나오는 같은 글자를 누릅니다.
 */
async function openSelect(page, label) {
  const field = page.getByText(label, { exact: true }).locator('..');
  const before = await page.getByText('전체', { exact: true }).count();
  for (let i = 0; i < 3; i += 1) {
    await field.getByText('전체', { exact: true }).first().click({ timeout: 5000 }).catch(() => {});
    for (let k = 0; k < 10; k += 1) {
      if ((await page.getByText('전체', { exact: true }).count()) > before) return field;
      await page.waitForTimeout(300);
    }
  }
  throw new Error(`${label} 선택 칸이 열리지 않습니다`);
}

async function api(path, token, init = {}) {
  const res = await fetch(`${LIVE}/api/v1${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers || {}) } });
  return res.json();
}

(async () => {
  const login = await api('/auth/login', null, { method: 'POST', body: JSON.stringify({ loginId: '10004', password: PASSWORD }) });
  assert(login.success, `로그인 실패 ${login.message}`);
  const t = login.data;
  const browser = await chromium.launch({ channel: 'chrome', headless: process.env.HEADED !== '1' });
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, acceptDownloads: true });
  const page = await context.newPage();
  const errors = [];
  const reqs = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // 앱이 부르는 8080 을 최신 API 로 돌립니다
  await page.route(`${APP_API}/**`, async (route) => {
    const req = route.request();
    const url = req.url().replace(APP_API, LIVE);
    reqs.push(`${req.method()} ${url.replace(`${LIVE}/api/v1`, '')}`);
    const res = await route.fetch({ url });
    return route.fulfill({ response: res });
  });
  const lastReq = (re) => [...reqs].reverse().find((r) => re.test(r)) || '';

  try {
    await page.goto(`${WEB}/login`);
    await page.evaluate((s) => localStorage.setItem('dwje.ax.session', JSON.stringify(s)), { accessToken: t.accessToken, refreshToken: t.refreshToken, userInfo: t.user });

    /* ───────── 업로드 문서 목록 ───────── */
    const list = await api('/system/uploads?page=1&size=50', t.accessToken);
    const all = await api('/system/uploads?page=1&size=0', t.accessToken);
    await page.goto(`${WEB}/system/upload-doc`);
    const ugrid = page.locator('.tabulator').first();

    await step('업로드 — 목록 요청에 page·size, 문서 수 카드 = summary.docCnt(전체 기준)', async () => {
      await ugrid.locator('.tabulator-row').first().waitFor({ timeout: 60000 });
      assert.match(lastReq(/GET \/system\/uploads\?/), /page=1/);
      assert.match(lastReq(/GET \/system\/uploads\?/), /size=50/);
      const text = await page.evaluate(() => document.body.innerText);
      // 3단계 서버는 조건과 무관한 전체 기준 docCnt 를 줍니다(UPD-07). 2단계 서버는 조건 기준 total 만 줍니다
      const sm = list.data.summary || {};
      const cardCnt = sm.docCnt ?? sm.total;
      assert(new RegExp(`문서 수\\s*\\n\\s*${Number(cardCnt).toLocaleString('ko-KR')}\\b`).test(text), `docCnt=${cardCnt}`);
      if (sm.docCnt === undefined) assert.match(text, /정상 \d+ · 경고 \d+ · 실패 \d+/);
      // 4단계 — 3단계에서 「—」 로 두었던 카드가 서버 값으로 (UPD-07)
      if (sm.versionCnt !== undefined) assert(new RegExp(`총 버전\\s*\\n\\s*${Number(sm.versionCnt).toLocaleString('ko-KR')}\\b`).test(text), `versionCnt=${sm.versionCnt}`);
      if (sm.lastUploadedAt) assert(text.includes(String(sm.lastUploadedAt).slice(5, 16)), `lastUploadedAt=${sm.lastUploadedAt}`);
      assert(!/서버 집계 준비 중/.test(text) || sm.docCnt === undefined, '3단계 대체 문구가 남지 않음');
      assert.match(text, new RegExp(`조건 결과 ${list.meta.total}건`));
    });

    await step('업로드 — 업로더 선택지 = uploaders(이름)', async () => {
      const field = await openSelect(page, '업로더');
      assert(field);
      for (const u of list.data.uploaders) await page.getByText(u.name, { exact: true }).last().waitFor({ timeout: 5000 });
      // 「전체」 를 다시 골라 닫습니다
      await page.getByText('전체', { exact: true }).last().click();
      await page.waitForTimeout(300);
      await page.waitForTimeout(300);
    });

    await step('업로드 — 기간 2030 → 빈 상태(서버 거름)', async () => {
      const dates = page.getByPlaceholder('YYYY-MM-DD');
      await dates.nth(0).fill('2030-01-01');
      await dates.nth(1).fill('2030-01-02');
      await page.getByText('조회', { exact: true }).click();
      await page.getByText('조회 조건에 맞는 업로드 문서가 없습니다. 조건을 넓혀 보십시오.').waitFor({ timeout: 15000 });
      assert.match(lastReq(/GET \/system\/uploads\?/), /from=2030-01-01/);
    });

    await step('업로드 — 「전체」 파일 행 수 = size=0 응답', async () => {
      await page.getByText('엑셀 다운로드 ▾').click();
      const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.getByText(/^전체 다운로드/).last().click()]);
      const xl = await readXlsx(await dl.path());
      assert.equal(xl.body.length, all.data.items.length);
      assert.match(xl.meta, /범위 전체/);
    });

    /* ───────── 데이터 연동 이력 ───────── */
    const summary = (await api('/sync/jobs/summary', t.accessToken)).data;
    let entryMaps = 0;
    reqs.length = 0;
    await page.goto(`${WEB}/system/sync-history`);
    const runsGrid = page.locator('.tabulator').nth(0);
    const jobsGrid = page.locator('.tabulator').nth(1);

    await step('연동 — 진입 요청에 한글 state 없음 · 연동 상태 줄 = healthState', async () => {
      await page.locator('#sync-health-line').waitFor({ timeout: 60000 });
      await page.waitForTimeout(1500);
      assert(!reqs.some((r) => /state=%[EC]/.test(r)), `한글 state: ${reqs.join(' | ')}`);
      entryMaps = reqs.filter((r) => /GET \/sync\/maps/.test(r)).length;
      const line = await page.locator('#sync-health-line').innerText();
      assert(!/(중단|주의) · (중단|주의)/.test(line), `상태 표시명 중복: ${line}`);
      const label = { OK: '정상', WARN: '주의', DOWN: '중단' }[summary.healthState];
      assert(line.includes(label), `${summary.healthState} → ${line}`);
      if (summary.healthReason && summary.healthState !== 'OK') assert(line.includes(summary.healthReason));
    });

    await step('연동 — 상태 「실패」 · 기간 9월 → state=FAIL 200 · 표가 비지 않음', async () => {
      const dates = page.getByPlaceholder('YYYY-MM-DD');
      await dates.nth(0).fill('2026-09-01');
      await dates.nth(1).fill('2026-09-30');
      await page.getByText('조회', { exact: true }).click();
      await page.waitForTimeout(800);
      const stateField = await openSelect(page, '상태');
      assert(stateField);
      await page.getByText('실패', { exact: true }).last().click();
      await jobsGrid.locator('.tabulator-row', { hasText: '실패' }).first().waitFor({ timeout: 20000 });
      assert.match(lastReq(/GET \/sync\/jobs\?/), /state=FAIL/);
    });

    await step('연동 — 실패 작업 상세 · 정합성 · 재실행 확인창 부제', async () => {
      await jobsGrid.locator('.tabulator-row').first().locator('.tabulator-cell[tabulator-field="jobId"]').click();
      await page.getByText('이관 작업 상세').waitFor({ timeout: 15000 });
      const text = await page.evaluate(() => document.body.innerText);
      assert.match(text, /정합성 검증/);
      assert.match(text, /일치|불일치|검증 전/);
      const retry = page.getByText('재실행', { exact: true }).last();
      if (await retry.count()) {
        await retry.click();
        await page.getByText('이관 재실행').waitFor({ timeout: 15000 });
        const dlg = await page.evaluate(() => document.body.innerText);
        assert(!dlg.includes('undefined'));
        assert.match(dlg, /원인이 남아 있으면 같은 오류가 반복됩니다/);
        await page.getByText('취소', { exact: true }).last().click();
      } else {
        await page.getByText('닫기', { exact: true }).last().click();
      }
    });

    await step('연동 — 원본 테이블 선택 → srcTable 전달', async () => {
      const srcField = await openSelect(page, '원본 테이블');
      // 선택지는 연동 매핑(GET /sync/maps)의 srcTable(스키마 없는 테이블명) — 서버 비교 기준과 같습니다
      const maps = (await api('/sync/maps', t.accessToken)).data.items;
      const name = [...new Set(maps.map((m) => m.srcTable))].sort()[0];
      assert(srcField);
      await page.getByText(name, { exact: true }).last().click();
      await page.waitForTimeout(1500);
      assert(lastReq(/GET \/sync\/jobs\?/).includes(`srcTable=${encodeURIComponent(name)}`), lastReq(/GET \/sync\/jobs\?/));
    });

    await step('연동 — 실행 이력 쪽 나눔 · 실행 행 클릭 → runId 로 작업 필터', async () => {
      await page.getByText('초기화', { exact: true }).click();
      await page.waitForTimeout(1500);
      assert.match(lastReq(/GET \/sync\/runs\?/), /size=20/);
      assert.match(lastReq(/GET \/sync\/runs\?/), /source=MES/);
      assert.equal(await runsGrid.locator('.tabulator-row', { hasText: '그룹웨어' }).count(), 0, 'MES 이관 기본에서 그룹웨어 실행 없음');
      // 표 작업이 있는 실행(대상 테이블 > 0)을 고릅니다
      const runs = (await api('/sync/runs?size=100', t.accessToken)).data.items;
      const shown = (await runsGrid.locator('.tabulator-row .tabulator-cell[tabulator-field="runId"]').allInnerTexts()).map((x) => x.replace(/\s+/g, ''));
      const target = runs.find((r) => shown.includes(r.runId) && Number(r.tableCnt) > 0 && !['PREFLIGHT_FAIL', 'NO_WORK', 'SKIPPED'].includes(r.state));
      assert(target, `표 작업이 있는 실행이 화면에 없음: ${shown}`);
      await runsGrid.locator('.tabulator-row', { hasText: target.runId }).first().locator('.tabulator-cell[tabulator-field="startedAt"]').click();
      await page.getByText(`실행 ${target.runId} 의 작업`, { exact: false }).waitFor({ timeout: 15000 });
      assert.match(lastReq(/GET \/sync\/jobs\?/), new RegExp(`runId=${target.runId}`));
      // 서버가 runId 로 거릅니다(API 3단계) — 화면 쪽 이중 거름은 없으므로 응답 그대로가 표입니다
      const filtered = (await api(`/sync/jobs?runId=${target.runId}&size=50`, t.accessToken)).data.items;
      assert(filtered.every((j) => j.runId === target.runId), 'runId 필터');
      await page.waitForTimeout(1500);
      assert.equal(await jobsGrid.locator('.tabulator-row').count(), filtered.length);
      await page.getByText('실행 조건 해제', { exact: true }).click();
    });

    await step('연동 — 숨긴 카드 조회 없음 · 매핑은 진입 1회 · MES 출처에 그룹웨어 없음 (SYN-09·10)', async () => {
      assert(!reqs.some((r) => r.includes('/sync/schema-drift')), '드리프트 조회 없음');
      // 진입 때 받은 뒤로는 조회·쪽 이동·필터를 여러 번 해도 늘지 않아야 합니다(개발 모드는 진입 때 두 번 부를 수 있음)
      const nowMaps = reqs.filter((r) => /GET \/sync\/maps/.test(r)).length;
      assert(entryMaps >= 1 && nowMaps === entryMaps, `매핑 조회 진입 ${entryMaps} → 지금 ${nowMaps}`);
      assert(reqs.filter((r) => /GET \/sync\/jobs\?/.test(r)).length > nowMaps, '작업 조회는 여러 번 있었음');
      const runs = (await api('/sync/runs?source=MES&size=20', t.accessToken)).data.items;
      assert(runs.every((r) => r.mode !== 'GROUPWARE'), '서버가 source 로 거름');
      assert.equal(await runsGrid.locator('.tabulator-row', { hasText: '그룹웨어' }).count(), 0);
    });

    await step('연동 — 작업 표 「전체」 → POST /sync/export 200 xlsx', async () => {
      // 단추를 화면 위쪽으로 올려 둡니다 — 패널이 화면 아래로 넘치면 위로 펼치지 않습니다(공통 변경 요청)
      const exBtn = page.getByText('엑셀 다운로드 ▾').nth(1);
      await exBtn.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await page.waitForTimeout(300);
      await exBtn.click();
      const [res, dl] = await Promise.all([
        page.waitForResponse((r) => r.url().includes('/sync/export'), { timeout: 60000 }),
        page.waitForEvent('download', { timeout: 60000 }),
        page.getByText('전체 다운로드', { exact: true }).last().click(),
      ]);
      assert.equal(res.status(), 200);
      const body = JSON.parse(res.request().postData());
      assert.equal(body.target, 'JOBS');
      assert.equal(body.scope, 'ALL');
      assert.match(dl.suggestedFilename(), /\.xlsx$/);
    });

    await step('연동 — 폭 390px 작업 표 마지막 열(관리)', async () => {
      await page.setViewportSize({ width: 390, height: 860 });
      await page.waitForTimeout(800);
      const r = await jobsGrid.evaluate(async (root) => {
        const holder = root.querySelector('.tabulator-tableholder');
        holder.scrollLeft = holder.scrollWidth;
        await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
        const col = root.querySelector('.tabulator-col[tabulator-field="action"]');
        const cell = root.querySelector('.tabulator-row .tabulator-cell[tabulator-field="action"]');
        const box = holder.getBoundingClientRect(); const h = col.getBoundingClientRect(); const c = cell.getBoundingClientRect();
        return { scrolled: holder.scrollLeft > 0, headerIn: h.right <= box.right + 2, cellIn: c.right <= box.right + 2, inside: box.right <= window.innerWidth + 1 };
      });
      assert(r.scrolled && r.headerIn && r.cellIn && r.inside, JSON.stringify(r));
    });

    assert.deepEqual(errors, [], `화면 오류: ${errors.join(' | ')}`);
  } finally {
    if (process.env.DEBUG_FULL) await page.screenshot({ path: process.env.DEBUG_FULL }).catch(() => {});
    console.log(results.join('\n'));
    await browser.close();
  }
})().then(() => process.exit(0)).catch((e) => { console.error(String(e.message).split('\n')[0]); process.exit(1); });
