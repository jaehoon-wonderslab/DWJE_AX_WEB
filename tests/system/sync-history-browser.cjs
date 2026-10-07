/*
 * 데이터 연동 이력(SY-15 · sys-sync) 브라우저 시험 — 기획 12 의 6장 WEB 시험
 *
 *   WEB_URL=http://localhost:8090 node tests/system/sync-history-browser.cjs
 *
 * 목 모드 개발 서버를 기준으로 합니다. 목 모드에서는 화면이 네트워크로 API 를 부르지 않으므로
 * page.route() 대신 목(systemMock 의 sync 핸들러)이 서버 계약(기획 4.4)과 같은 응답을 돌려주는 것을 씁니다.
 * 목 시드: 작업 9건(실패 1 · 진행 중 1), 실행 5건(점검 실패 메시지에 문서용 주소 192.0.2.10 포함).
 *
 * 확인 항목
 *  1. 연동 상태 줄(주의 · 미조치 실패) · 카드 2종(금일 이관 건수 · 미조치 실패 1건) (SYN-03)
 *  2. 머리말 엑셀 단추 없음 · 카드마다 [엑셀 다운로드 ▾] 2개 (SYN-15)
 *  3. 실행 메시지의 주소가 가려져 보임 (SYN-05)
 *  4. 「실패 작업 보기」 → 상태 FAIL · 기간 시작 = 가장 오래된 미조치 실패 날짜 (SYN-03·08)
 *  5. 「재실행」 확인창 부제에 undefined 없음 · 문구가 동작(워터마크 이후 구간)과 맞음 (SYN-07)
 *     목에서는 실제로 등록해 본 뒤 같은 작업의 단추가 「상세」 로 바뀌는지(중복 방지, SYN-02) 확인합니다
 *  6. 작업 표 엑셀 패널 — Esc 닫힘, 「조회 목록」 파일 행 수 = 표 행 수
 *  7. 폭 390px 에서 작업 표를 끝까지 가로 스크롤해 「관리」 머리글·값이 보임
 */
const assert = require('node:assert/strict');
const { open, WEB } = require('../lib/browser');
const { readXlsx } = require('../lib/xlsx');

/**
 * 로그인 API(8080)가 응답하지 않을 때도 목 모드 화면은 데모 자동 로그인으로 열립니다.
 * 공용 open() 이 실패하면 세션 없이 브라우저만 띄웁니다(실서버 대상이면 그대로 실패합니다).
 */
async function openPage() {
  try {
    return await open('it');
  } catch (e) {
    console.log(`(로그인 API 없이 진행 — ${String(e.message).split('\n')[0]})`);
    const { chromium } = require('playwright-core');
    const browser = await chromium.launch({ channel: 'chrome', headless: process.env.HEADED !== '1' });
    const page = await (await browser.newContext({ viewport: { width: 1440, height: 960 } })).newPage();
    return { browser, page };
  }
}

const results = [];
const step = async (name, fn) => {
  try { await fn(); results.push(`ok   ${name}`); } catch (e) { results.push(`FAIL ${name} — ${e.message}`); throw e; }
};

const readXls = async (download) => readXlsx(await download.path());

(async () => {
  const { browser, page } = await openPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const grids = page.locator('.tabulator');
  const jobs = grids.nth(1);
  try {
    await page.goto(`${WEB}/system/sync-history`);
    await jobs.locator('.tabulator-row').first().waitFor({ timeout: 60000 });

    await step('연동 상태 줄 · 카드 2종', async () => {
      const line = await page.locator('#sync-health-line').innerText();
      assert.match(line, /주의/);
      assert.match(line, /미조치 실패 작업 1건/);
      assert.match(line, /실패 작업 보기/);
      const text = await page.evaluate(() => document.body.innerText);
      assert.match(text, /금일 이관 건수/);
      assert.match(text, /미조치 실패\s*\n\s*1\s*\n?\s*건/);
    });

    await step('머리말 엑셀 단추 없음 · 카드마다 패널 단추', async () => {
      assert.equal(await page.getByText('엑셀 다운로드 ▾').count(), 2);
      assert.equal(await page.getByText('엑셀 다운로드', { exact: true }).count(), 0);
    });

    await step('실행 메시지 내부 주소 가림', async () => {
      const text = await grids.nth(0).innerText();
      assert(!/\b\d{1,3}(\.\d{1,3}){3}\b/.test(text), 'IPv4 형식 문자열이 없어야 합니다');
      assert.match(text, /host \(가림\)|\*\*\*\.\*\*\*\.\*\*\*\.\*\*\*/);
      assert.match(text, /port 1433/, '포트·원인 문구는 남습니다');
    });

    await step('실패 작업 보기 → 상태 FAIL · 기간 시작일', async () => {
      await page.getByText('실패 작업 보기', { exact: true }).click();
      await page.waitForTimeout(800);
      const states = await jobs.locator('.tabulator-row .tabulator-cell[tabulator-field="state"]').allInnerTexts();
      assert(states.length >= 1 && states.every((t) => t.includes('실패')), `상태: ${states}`);
      const from = await page.getByPlaceholder('YYYY-MM-DD').nth(0).inputValue();
      assert.equal(from, '2026-08-27');
    });

    await step('작업 상세 — 매핑 파라미터 · 오류 상세 표 · 원본 행 펼침 (SYN-07)', async () => {
      await jobs.locator('.tabulator-row', { hasText: 'MIG-260827-04' }).locator('.tabulator-cell[tabulator-field="srcTable"]').click();
      await page.getByText('이관 작업 상세').waitFor();
      await page.getByText('오류 3건', { exact: true }).waitFor();
      const table = page.locator('.tabulator').last();
      const heads = await table.locator('.tabulator-col-title').allInnerTexts();
      assert.deepEqual(heads.map((h) => h.trim()), ['순번', '오류 코드', '메시지', '원본 키']);
      await table.locator('.tabulator-row').first().click();
      await page.getByText(/원본 행 — 순번 1/).waitFor();
      await page.getByText(/"judge_seq": 88120/).waitFor();
      const text = await page.evaluate(() => document.body.innerText);
      assert.match(text, /키 컬럼/);
      assert.match(text, /스테이징 적재 실패/);
      await page.getByText('닫기', { exact: true }).last().click();
    });

    await step('실행 행 클릭 → 그 실행의 작업만 · 조건 해제 (SYN-09)', async () => {
      await page.getByText('초기화', { exact: true }).click();
      await page.waitForTimeout(600);
      await grids.nth(0).locator('.tabulator-row', { hasText: 'RUN-260828-01' }).locator('.tabulator-cell[tabulator-field="startedAt"]').click();
      await page.getByText(/실행 RUN-260828-01 의 작업/).waitFor();
      // 부제는 바로 바뀌고 표는 다시 조회한 뒤 바뀝니다 — 다른 날 작업이 사라질 때까지 기다립니다
      await jobs.locator('.tabulator-row', { hasText: 'MIG-260827-' }).first().waitFor({ state: 'detached', timeout: 10000 });
      const ids = await jobs.locator('.tabulator-row .tabulator-cell[tabulator-field="jobId"]').allInnerTexts();
      assert(ids.length >= 1 && ids.every((t) => /MIG-260828-0[1-3]/.test(t)), `작업: ${ids}`);
      await page.getByText('실행 조건 해제', { exact: true }).click();
      // 작업이 없는 실행(모의·대상 0)은 실행 상세
      await grids.nth(0).locator('.tabulator-row', { hasText: 'RUN-260827-02' }).locator('.tabulator-cell[tabulator-field="startedAt"]').click();
      await page.getByText('엔진 실행 상세').waitFor();
      const t2 = await page.evaluate(() => document.body.innerText);
      assert(!/\b\d{1,3}(\.\d{1,3}){3}\b/.test(t2), '실행 상세 메시지도 가림');
      await page.getByText('닫기', { exact: true }).last().click();
      await page.getByText('실패 작업 보기', { exact: true }).click();
      await page.waitForTimeout(600);
    });

    await step('재실행 확인창 문구 · 등록 후 중복 방지', async () => {
      const row = jobs.locator('.tabulator-row', { hasText: 'MIG-260827-04' });
      await row.getByRole('button', { name: '재실행' }).click();
      await page.getByText('이관 재실행').waitFor();
      const dialog = await page.evaluate(() => document.body.innerText);
      assert(!dialog.includes('undefined'), '부제·본문에 undefined 없음');
      assert.match(dialog, /DWJ_MES\.dbo\.AOI_JUDGE → ax\.aoi_judge/);
      assert.match(dialog, /워터마크/);
      assert.match(dialog, /원인이 남아 있으면 같은 오류가 반복됩니다/);
      await page.getByText('재실행', { exact: true }).last().click();
      await page.getByText(/재실행을 등록했습니다 — SYNC-/).waitFor({ timeout: 10000 });
      // 새 목록이 오면 원 작업은 진행 중 재실행이 있어 「상세」 로 바뀝니다
      await page.waitForTimeout(1200);
      const failRow = jobs.locator('.tabulator-row', { hasText: 'MIG-260827-04' });
      assert.equal(await failRow.getByRole('button', { name: '재실행' }).count(), 0, '재실행 단추가 다시 열리지 않음');
      assert.equal(await failRow.getByRole('button', { name: '상세' }).count(), 1);
    });

    await step('작업 표 엑셀 패널 — Esc 닫힘 · 조회 목록 행 수 = 표', async () => {
      await page.getByText('초기화', { exact: true }).click();
      await page.waitForTimeout(800);
      const shown = await jobs.locator('.tabulator-row').count();
      const btn = page.getByText('엑셀 다운로드 ▾').nth(1);
      await btn.click();
      await page.getByText(`조회 목록 다운로드 (${shown}건)`).waitFor();
      await page.getByText('전체 다운로드', { exact: true }).waitFor();
      await page.keyboard.press('Escape');
      await page.getByText(`조회 목록 다운로드 (${shown}건)`).waitFor({ state: 'detached' });
      await btn.click();
      const [dl] = await Promise.all([page.waitForEvent('download'), page.getByText(`조회 목록 다운로드 (${shown}건)`).click()]);
      const x = await readXls(dl);
      assert.equal(x.body.length, shown);
      assert.match(x.meta, /범위 조회 목록/);
      assert.equal(x.head[0], '작업 ID');
      assert(!x.head.includes('관리'), '동작 열은 내보내지 않음');
    });

    await step('폭 390px — 작업 표 마지막 열(관리) 머리글·값', async () => {
      await page.setViewportSize({ width: 390, height: 860 });
      await page.waitForTimeout(800);
      const r = await jobs.evaluate(async (root) => {
        const holder = root.querySelector('.tabulator-tableholder');
        holder.scrollLeft = holder.scrollWidth;
        await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
        const col = root.querySelector('.tabulator-col[tabulator-field="action"]');
        const cell = root.querySelector('.tabulator-row .tabulator-cell[tabulator-field="action"]');
        const box = holder.getBoundingClientRect(); const h = col.getBoundingClientRect(); const c = cell.getBoundingClientRect();
        return { scrolled: holder.scrollLeft > 0, headerIn: h.right <= box.right + 2, cellIn: c.right <= box.right + 2, aligned: Math.abs(h.left - c.left) < 2, inside: box.right <= window.innerWidth + 1 };
      });
      assert(r.scrolled && r.headerIn && r.cellIn && r.aligned && r.inside, JSON.stringify(r));
    });

    assert.deepEqual(errors, [], `화면 오류: ${errors.join(' | ')}`);
  } finally {
    console.log(results.join('\n'));
    await browser.close();
  }
// 공용 open() 이 로그인 전에 띄운 브라우저가 남아 있을 수 있어 끝나면 프로세스를 닫습니다
})().then(() => process.exit(0)).catch((e) => { console.error(e.message); process.exit(1); });
