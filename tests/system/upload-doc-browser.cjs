/*
 * 업로드 문서 목록(SY-16 · sys-upload-doc) 브라우저 시험 — 기획 11 의 6장 WEB 시험
 *
 *   WEB_URL=http://localhost:8090 node tests/system/upload-doc-browser.cjs
 *
 * 목 모드 개발 서버(EXPO_PUBLIC_USE_MOCK=true)를 기준으로 합니다. 목 모드에서는 화면이 네트워크로 API 를
 * 부르지 않으므로 page.route() 를 쓰지 않고, 목(systemMock.getSystemUploads)이 서버 계약(기획 4.4)과 같은
 * 응답을 돌려주는 것을 이용합니다. 목 시드: 문서 2건(UPD-2026-0001 v2 · UPD-2026-0002 v1).
 *
 * 확인 항목
 *  1. 카드 4종이 서버 summary(전체 기준) 값 — 문서 수 2 · 총 버전 3
 *  2. 기간 2030 으로 조회 → 「조건을 넓혀 보십시오」 빈 상태, 카드 값은 그대로(UPD-01·07)
 *  3. 엑셀 패널 — 단추 아래 두 항목, Esc 로 닫힘, 「전체」 파일 2행 · 범위 전체(UPD-15)
 *  4. 「크기」 내림차순 정렬 후 「조회 목록」 파일 행 순서 = 표 순서
 *  5. 행 클릭 → 드로어 버전 2개 · 메모 표시(UPD-02)
 *  6. 숨기기(사유 필수)·숨긴 문서 포함·흐림·숨김 태그·복원 (R-19)
 *  7. 폭 360px 에서 패널이 화면 안, 폭 390px 에서 표를 끝까지 가로 스크롤해 마지막 열 「관리」 머리글·값이 보임
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { open, WEB } = require('../lib/browser');

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

/** 내려받은 .xls(HTML 표) 의 본문 행 — 머리글 제외 */
async function readXls(download) {
  const file = await download.path();
  const html = fs.readFileSync(file, 'utf8');
  const rows = [...html.matchAll(/<tr>(.*?)<\/tr>/g)].map((m) => [...m[1].matchAll(/<t[dh]>(.*?)<\/t[dh]>/g)].map((c) => c[1]));
  const meta = (html.match(/<p>(.*?)<\/p>/) || [])[1] || '';
  return { head: rows[0] || [], body: rows.slice(1), meta };
}

(async () => {
  const { browser, page } = await openPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const grid = page.locator('.tabulator').first();
  try {
    await page.goto(`${WEB}/system/upload-doc`);
    await grid.locator('.tabulator-row').first().waitFor({ timeout: 60000 });

    await step('카드 — 서버 summary 전체 기준 값', async () => {
      const text = await page.evaluate(() => document.body.innerText);
      assert.match(text, /문서 수\s*\n\s*2\s*\n?\s*건/);
      assert.match(text, /총 버전\s*\n\s*3/);
      assert.match(text, /원본 용량/);
      assert.match(text, /조건 결과 2건/);
    });

    await step('기간 2030 조회 → 조건 결과 빈 상태 · 카드 유지', async () => {
      const dates = page.getByPlaceholder('YYYY-MM-DD');
      await dates.nth(0).fill('2030-01-01');
      await dates.nth(1).fill('2030-01-02');
      await page.getByText('조회', { exact: true }).click();
      await page.getByText('조회 조건에 맞는 업로드 문서가 없습니다. 조건을 넓혀 보십시오.').waitFor({ timeout: 10000 });
      const text = await page.evaluate(() => document.body.innerText);
      assert.match(text, /문서 수\s*\n\s*2/, '카드는 조건과 무관');
      assert.match(text, /조건 결과 0건/);
    });

    await step('엑셀 패널 — 두 항목 · Esc 닫힘 · 전체 파일 2행', async () => {
      const button = page.getByText('엑셀 다운로드 ▾');
      await button.click();
      await page.getByText('조회 목록 다운로드 (0건)').waitFor();
      await page.getByText('전체 다운로드 (2건)').waitFor();
      const bBox = await button.boundingBox();
      const pBox = await page.getByRole('menu').boundingBox();
      assert(pBox.y >= bBox.y + bBox.height - 2, '패널은 단추 바로 아래');
      await page.keyboard.press('Escape');
      await page.getByText('전체 다운로드 (2건)').waitFor({ state: 'detached' });
      await button.click();
      const [dl] = await Promise.all([page.waitForEvent('download'), page.getByText('전체 다운로드 (2건)').click()]);
      const x = await readXls(dl);
      assert.equal(x.body.length, 2, '전체 = 조건 무시 전 문서');
      assert.match(x.meta, /범위 전체/);
      assert.match(x.meta, /조건 무시\(전체\)/);
      assert(x.head.includes('크기(byte)') && x.head.includes('최신 파일명') && x.head.includes('문서 ID'), `내보내기 전용 열: ${x.head}`);
      const stateCol = x.head.indexOf('파싱 상태');
      assert(x.body.every((r) => ['정상', '경고', '실패'].includes(r[stateCol])), '파싱 상태는 표시명');
    });

    await step('초기화 → 크기 내림차순 → 조회 목록 파일 순서 = 표 순서', async () => {
      await page.getByText('초기화', { exact: true }).click();
      await grid.locator('.tabulator-row').nth(1).waitFor({ timeout: 10000 });
      const sizeHead = grid.locator('.tabulator-col[tabulator-field="sizeBytes"] .tabulator-col-title');
      await sizeHead.click();
      await page.waitForTimeout(200);
      await sizeHead.click();
      await page.waitForTimeout(300);
      const order = await grid.locator('.tabulator-row .tabulator-cell[tabulator-field="title"]').allInnerTexts();
      await page.getByText('엑셀 다운로드 ▾').click();
      const [dl] = await Promise.all([page.waitForEvent('download'), page.getByText('조회 목록 다운로드 (2건)').click()]);
      const x = await readXls(dl);
      assert.match(x.meta, /범위 조회 목록/);
      assert.equal(x.body.length, 2);
      const titleCol = x.head.indexOf('문서명');
      assert.equal(x.head[0], '문서명', '그리드 열 순서가 먼저');
      assert.deepEqual(x.body.map((r) => r[titleCol]), order.map((t) => t.split('\n')[0].trim()), '파일 행 순서 = 표 순서');
    });

    await step('행 클릭 → 드로어 버전 이력 · 메모', async () => {
      await grid.locator('.tabulator-row', { hasText: '8월 4주 회의 자료' }).first().click();
      await page.getByText('버전 이력', { exact: true }).waitFor();
      await page.getByText('v2', { exact: true }).waitFor();
      await page.getByText('v1', { exact: true }).waitFor();
      await page.getByText(/^메모: 8\/31 실적 추가/).waitFor();
      await page.keyboard.press('Escape');
    });

    await step('숨기기(사유 필수) → 기본 목록에서 빠짐 → 숨긴 문서 포함 → 흐림·숨김 태그 → 복원 (R-19)', async () => {
      await page.goto(`${WEB}/system/upload-doc`);
      await grid.locator('.tabulator-row').nth(1).waitFor({ timeout: 60000 });
      const row = grid.locator('.tabulator-row', { hasText: '도금 두께 공정능력 요약' }).first();
      await row.getByRole('button', { name: '숨기기' }).click();
      await page.getByText('업로드 문서 숨기기').waitFor();
      // 사유 없이 제출 → 막힘
      await page.getByText('숨기기', { exact: true }).last().click();
      await page.getByText(/숨기는 사유을? ?를? ?입력해 주세요|숨기는 사유.*입력/).first().waitFor({ timeout: 5000 });
      await page.getByPlaceholder(/잘못 올린 파일/).fill('시험 — 잘못 올린 파일');
      await page.getByText('숨기기', { exact: true }).last().click();
      await page.getByText('업로드 문서 숨기기').waitFor({ state: 'detached', timeout: 10000 });
      await grid.locator('.tabulator-row', { hasText: '도금 두께 공정능력 요약' }).first().waitFor({ state: 'detached', timeout: 10000 });
      let text = await page.evaluate(() => document.body.innerText);
      assert.match(text, /숨긴 문서 1건 별도/);
      assert.match(text, /문서 수\s*\n\s*1/);
      await page.getByText(/^숨긴 문서 포함/).click();
      const hidden = grid.locator('.tabulator-row', { hasText: '도금 두께 공정능력 요약' }).first();
      await hidden.waitFor({ timeout: 10000 });
      assert.match(await hidden.innerText(), /숨김/);
      assert.equal(await hidden.evaluate((el) => el.style.opacity), '0.55');
      await hidden.getByRole('button', { name: '복원' }).click();
      await page.waitForTimeout(800);
      const back = grid.locator('.tabulator-row', { hasText: '도금 두께 공정능력 요약' }).first();
      assert.equal(await back.evaluate((el) => el.style.opacity), '');
      await back.getByRole('button', { name: '숨기기' }).waitFor();
      text = await page.evaluate(() => document.body.innerText);
      assert.doesNotMatch(text, /숨긴 문서 \d+건 별도/);
      await page.getByText(/^숨긴 문서 포함/).click();
    });

    await step('폭 360px — 패널이 화면 안', async () => {
      await page.setViewportSize({ width: 360, height: 800 });
      await page.goto(`${WEB}/system/upload-doc`);
      await grid.locator('.tabulator-row').first().waitFor({ timeout: 60000 });
      await page.getByText('엑셀 다운로드 ▾').click();
      const box = await page.getByRole('menu').boundingBox();
      assert(box.x >= 0 && box.x + box.width <= 360 + 1, `패널 x=${box.x} w=${box.width}`);
      await page.keyboard.press('Escape');
    });

    await step('폭 390px — 표 가로 스크롤로 마지막 열(관리) 머리글·값', async () => {
      await page.setViewportSize({ width: 390, height: 800 });
      await page.waitForTimeout(600);
      const r = await grid.evaluate(async (root) => {
        const holder = root.querySelector('.tabulator-tableholder');
        holder.scrollLeft = holder.scrollWidth;
        await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
        const col = root.querySelector('.tabulator-col[tabulator-field="action"]');
        const cell = root.querySelector('.tabulator-row .tabulator-cell[tabulator-field="action"]');
        const box = holder.getBoundingClientRect(); const h = col.getBoundingClientRect(); const c = cell.getBoundingClientRect();
        const card = root.closest('[data-testid], div').getBoundingClientRect();
        return { scrolled: holder.scrollLeft > 0, headerIn: h.right <= box.right + 2 && h.left >= box.left - 2, cellIn: c.right <= box.right + 2, aligned: Math.abs(h.left - c.left) < 2, inside: box.right <= window.innerWidth + 1, card: card.width };
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
