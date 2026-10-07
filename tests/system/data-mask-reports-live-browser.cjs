/*
 * 데이터 접근 권한 — 보고서 표 · 엑셀 누출 차단 시험 (2026-10-07 데이터 항목 설계 7.1)
 *   docs/DATA_ITEM_MASKING_DESIGN_20261007.md
 *
 * 로컬 API(8080) 와 로컬 대상 개발 서버(npm run web, 8081)에서 돌립니다.
 *   node tests/system/data-mask-reports-live-browser.cjs
 *
 * DB 는 바꾸지 않습니다. 「항목 관리 > 화면별 가리기」 로 화면 열을 고른 상태는 `/auth/me` 응답에
 * 시험용 종류(zz_mask_test — 이 계정은 열람 불가)를 끼워 넣어 흉내 냅니다. 내려받기 이력 기록(POST /download-logs)도
 * 가로채 성공으로 돌려줍니다.
 *
 * 확인하는 것
 *  · 아침회의(PRESS) — 제조팀(수율 종류 없음): 달성률 · 상태 「비공개」 / 화면별 가리기로 고른 일목표(tgt) 열 「비공개」
 *  · 일일 생산현황 — 생산관리팀: 고른 결정항목(decision) 열 「비공개」, 달성률은 그대로
 *  · 실적 집계 · 조회 트리 엑셀 — 품질보증팀: 고른 투입(inputQty) 열이 엑셀에서 전부 「비공개」, 1행 비공개 건수 > 0
 *  · 제품별 수율 — 품질보증팀: 고른 양품 수량(okQty) 열이 화면 표와 엑셀에서 「비공개」
 */
const assert = require('node:assert/strict');
const { open, visit } = require('../lib/browser');
const { readXlsx } = require('../lib/xlsx');

/** 화면이 깨졌는지만 봅니다 — 부서 권한 밖 보조 API 의 403(브라우저 콘솔 「Failed to load resource」)은 이 시험의 대상이 아닙니다 */
const crashes = (v) => v.errors.filter((e) => !/status of 403/.test(e));

const KIND = { key: 'zz_mask_test', name: '시험 가리기', attrs: [] };

/** /auth/me 에 시험용 종류를 끼워 넣습니다 — 이 계정의 dataPerms 에는 없으므로 attrs 가 모두 막힙니다 */
async function injectKind(page, attrs) {
  await page.route('**/api/v1/auth/me', async (route) => {
    const res = await route.fetch();
    const body = await res.json();
    if (body?.data) {
      // 맨 앞에 둡니다 — 이미 다른 종류에 든 필드명(inputQty 등)은 WEB 대응표가 먼저 온 종류를 남기므로,
      // 앞에 두어야 「그 값을 시험 종류로 옮긴」 상태가 됩니다
      body.data.dataFields = [{ ...KIND, attrs }, ...(body.data.dataFields || [])];
      body.data.blindFields = [...(body.data.blindFields || []), KIND.key];
    }
    await route.fulfill({ response: res, json: body });
  });
  await page.route('**/api/v1/download-logs', (route) => (route.request().method() === 'POST'
    ? route.fulfill({ json: { success: true, code: 'SUCCESS', message: '', data: { logId: 0 } } })
    : route.continue()));
}

/** 열 제목 → 그 열 칸 글자들 (XlsTable 은 머리글 줄과 본문 줄의 칸 순서가 같습니다) */
async function xlsColumn(page, rootSel, title) {
  return page.evaluate(({ rootSel: sel, title: t }) => {
    const root = document.querySelector(sel) || document;
    const rows = [...root.querySelectorAll('div')].filter((d) => d.children.length > 3 && [...d.children].every((c) => c.tagName === 'DIV'));
    const head = rows.find((r) => [...r.children].some((c) => c.innerText.replace(/\s+/g, ' ').trim() === t));
    if (!head) return null;
    const idx = [...head.children].findIndex((c) => c.innerText.replace(/\s+/g, ' ').trim() === t);
    const siblings = [...head.parentElement.children].filter((r) => r !== head && r.children.length === head.children.length);
    return siblings.map((r) => r.children[idx]?.innerText.trim());
  }, { rootSel, title });
}

async function run() {
  // 1) 아침회의(PRESS) — 제조팀
  {
    const { browser, page } = await open('mfg');
    try {
      await injectKind(page, ['tgt']);
      const v = await visit(page, '/report/press-morning');
      assert(!crashes(v).length, `errors ${crashes(v)} / failed ${v.failed}`);
      const tgt = await xlsColumn(page, '#rpt-press-morning-doc', '일목표');
      const rate = await xlsColumn(page, '#rpt-press-morning-doc', '달성률');
      const st = await xlsColumn(page, '#rpt-press-morning-doc', '상태');
      if (tgt && tgt.length) {
        assert(tgt.every((x) => x === '비공개'), `tgt ${tgt.slice(0, 3)}`);
        assert(rate.every((x) => x === '비공개' || x === '-'), `rate ${rate.slice(0, 3)}`);
        assert(st.every((x) => x === '비공개' || x === '-'), `state ${st.slice(0, 3)}`);
        console.log(`  press-morning: 일목표 ${tgt.length}칸 · 달성률 · 상태 비공개`);
      } else {
        console.log('  press-morning: 행 없음 — 건너뜀');
      }
    } finally { await browser.close(); }
  }

  // 2) 일일 생산현황 — 생산관리팀
  {
    const { browser, page } = await open('prod');
    try {
      await injectKind(page, ['decision']);
      const v = await visit(page, '/production/daily-report');
      assert(!crashes(v).length, `errors ${crashes(v)} / failed ${v.failed}`);
      const dec = await xlsColumn(page, 'body', '결정항목 / 기타');
      const rate = await xlsColumn(page, 'body', '달성률');
      if (dec && dec.length) {
        assert(dec.every((x) => x === '비공개'), `decision ${dec.slice(0, 3)}`);
        assert(rate.some((x) => x !== '비공개'), 'rate visible to 생산관리팀');
        console.log(`  daily-report: 결정항목 ${dec.length}칸 비공개, 달성률 보임`);
      } else {
        console.log('  daily-report: 행 없음 — 건너뜀');
      }
    } finally { await browser.close(); }
  }

  // 3) 실적 집계 · 조회 트리 엑셀 — 품질보증팀
  {
    const { browser, page } = await open('qa');
    try {
      await injectKind(page, ['inputQty']);
      const v = await visit(page, '/production/result');
      assert(!crashes(v).length, `errors ${crashes(v)} / failed ${v.failed}`);
      const btn = page.getByRole('button', { name: '집계 결과 엑셀 다운로드' });
      await btn.waitFor();
      if (await btn.isEnabled()) {
        const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), btn.click()]);
        const book = await readXlsx(await dl.path());
        const col = book.head.indexOf('투입 수량');
        assert(col >= 0, `head ${book.head}`);
        const vals = book.body.map((r) => r[col]).filter((x) => x !== '—' && x !== '');
        assert(vals.length && vals.every((x) => x === '비공개'), `inputQty ${vals.slice(0, 3)}`);
        assert(!/비공개 처리 0건/.test(book.meta), `meta ${book.meta}`);
        const ok = book.head.indexOf('양품 수량');
        assert(book.body.some((r) => /^\d/.test(r[ok] || '')), 'okQty still visible');
        console.log(`  prod-result 트리 엑셀: 투입 수량 ${vals.length}칸 비공개 · ${book.meta}`);
      } else {
        console.log('  prod-result: 자료 없음 — 건너뜀');
      }
    } finally { await browser.close(); }
  }

  // 4) 제품별 수율 — 품질보증팀
  {
    const { browser, page } = await open('qa');
    try {
      await injectKind(page, ['okQty']);
      const v = await visit(page, '/report/yield-by-model');
      assert(!crashes(v).length, `errors ${crashes(v)} / failed ${v.failed}`);
      const ok = await xlsColumn(page, '#rpt-yield-model-doc', '양품 수량');
      if (ok && ok.length) {
        assert(ok.every((x) => x === '비공개'), `okQty ${ok.slice(0, 3)}`);
        const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.getByRole('button', { name: '엑셀 다운로드' }).click()]);
        const book = await readXlsx(await dl.path());
        const col = book.head.indexOf('양품 수량');
        assert(book.body.length && book.body.every((r) => r[col] === '비공개'), `xls okQty ${book.body.slice(0, 2).map((r) => r[col])}`);
        const inCol = book.head.indexOf('투입 수량');
        assert(book.body.some((r) => r[inCol] !== '비공개'), 'inputQty visible');
        console.log(`  yield-by-model: 화면 ${ok.length}칸 · 엑셀 ${book.body.length}행 양품 수량 비공개`);
      } else {
        console.log('  yield-by-model: 행 없음 — 건너뜀');
      }
    } finally { await browser.close(); }
  }

  console.log('PASS: data-mask-reports — morning(tgt·rate·state), daily(decision), prod-result tree xlsx(inputQty), yield-by-model(okQty screen+xlsx)');
}

run().catch((e) => { console.error(e); process.exit(1); });
