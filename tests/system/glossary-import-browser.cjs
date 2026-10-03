/**
 * 브라우저 시험 — 용어 사전 관리(sys-gloss) 엑셀 업로드 · 업로드용 템플릿 (2026-10-03)
 *
 * API 응답은 page.route 로 고정합니다(실 서버 모드 웹 서버 필요 — 목 모드는 앱 안에서 응답해 가로챌 수 없습니다).
 *   WEB_URL=http://localhost:<실 API 모드 포트> node tests/system/glossary-import-browser.cjs
 *   SHOT_DIR=<폴더> 를 주면 머리 단추·미리보기 모달을 1208×805 로 찍어 둡니다.
 *
 *  (1) [템플릿 내려받기] → GET /glossary/import/template, 서버 파일명 그대로 저장
 *  (2) [엑셀 업로드] → .xlsx 고르기 → POST /glossary/import multipart(file · dryRun=true)
 *      → 「엑셀 업로드 미리보기」 모달: 파일명 · 건수 · 행 표(처리 배지 · 되살림 · 건너뛸 사유 · 오류·안내)
 *  (3) [n건 등록](n = ERROR 가 아닌 행) → 같은 파일을 dryRun=false 로, 모달 닫힘 · 서버 문구 토스트 · 목록 다시 조회
 *  (4) 머리글이 다른 파일(예전 「분류」 열 템플릿) → 400 문구 토스트, 모달 열리지 않음
 *  (6) 2026-10-03 분류 삭제 — 템플릿 머리글 [공식 용어* · 뜻* · 고객사 정보 · 유사어], 미리보기에 분류 없음 · 고객사 정보 표시
 *  (5) 쓰기 권한 없음(미배정) → [엑셀 업로드] 비활성 + 이유 도움말, [템플릿 내려받기] 는 그대로
 */
const assert = require('node:assert/strict');
const path = require('node:path');
const ExcelJS = require('exceljs');
const { open, WEB } = require('../lib/browser');

const REAL_API = process.env.API_URL || 'http://localhost:8080';
const APP_API = process.env.APP_API_URL || 'http://localhost:8080';
const realUrl = (u) => u.replace(APP_API, REAL_API);
const SHOT_DIR = process.env.SHOT_DIR || '';
const NO_WRITE = '미배정 계정은 이 동작을 할 수 없습니다. 전산팀에 부서 배정을 요청하세요.';

const TERMS = [
  { termId: 5, term: '8D', definition: '8단계 문제 해결 보고서', customerInfo: false, variants: [{ variantId: 1, word: '8디', byEmpNo: '10000', byName: '관리자', at: '2026-09-30', editable: true }] },
  { termId: 6, term: 'CAN', definition: '쉴드캔', customerInfo: false, variants: [] },
];

/** 미리보기 응답 — 새 용어(되살림) · 기존 용어(건너뜀·경고) · 오류 행 */
function previewData(dryRun) {
  return {
    dryRun,
    fileName: '용어.xlsx',
    totalRows: 3,
    termNew: 1,
    termExisting: 1,
    variantNew: 3,
    variantSkipped: 1,
    errorCnt: 1,
    rows: [
      {
        row: 2, term: '8D', termId: 5, action: 'EXISTING_TERM',
        variantsAdded: ['팔디보고'],
        variantsSkipped: [{ word: '8디', reason: '이미 등록된 유사어입니다. [8디] 공식 용어 [8D] 에 붙어 있습니다.' }],
        errors: [], notes: ['기존 용어 — 뜻·고객사 정보는 바꾸지 않음'], warnings: ['\'8D보\' 가 공식 용어 [8D보고서] 안에 들어 있습니다.'],
      },
      {
        row: 3, term: '스티프너', termId: dryRun ? null : 77, action: 'NEW_TERM', definition: 'FPCB 보강판', customerInfo: true, restored: true,
        variantsAdded: ['보강판', '스티프'], variantsSkipped: [], errors: [], notes: ['예전 유사어 2건이 함께 돌아옴'], warnings: [],
      },
      {
        row: 4, term: '값오류', termId: null, action: 'ERROR', variantsAdded: [], variantsSkipped: [],
        errors: [{ field: 'customerInfo', message: '고객사 정보는 Y 또는 N 으로 적어 주세요. [예]' }], notes: [], warnings: [],
      },
    ],
  };
}

async function setup(page, opts = {}) {
  if (REAL_API !== APP_API) await page.route(`${APP_API}/**`, (r) => r.continue({ url: realUrl(r.request().url()) }));
  const st = { imports: [], templates: [], termLoads: 0, mode: 'ok' };
  await page.route('**/api/v1/download-logs', (r) => (r.request().method() === 'POST'
    ? r.fulfill({ json: { success: true, code: 'SUCCESS', message: '기록했습니다.', data: { dlId: 1 } } })
    : r.continue()));
  await page.route('**/api/v1/auth/me', async (route) => {
    const res = await route.fetch({ url: realUrl(route.request().url()) });
    const j = await res.json();
    j.data.menuPerms = ['ai-chat', 'sys-gloss', 'gloss-view', 'chat-history', 'dash-ai'];
    j.data.writePerms = opts.write ? ['sys-gloss'] : [];
    const unassigned = !opts.write;
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
    if (p === 'summary') return ok({ termCnt: TERMS.length, variantCnt: 1, myVariantCnt: 1, noVariantTermCnt: 1, canEditTerm: !!opts.admin, canWriteVariant: !!opts.write, riskVariantCnt: opts.admin ? 0 : null });
    if (p === 'variants/risks') return ok({ items: [] });
    if (p === 'terms') {
      st.termLoads += 1;
      return ok({ items: TERMS }, { page: 1, size: 50, total: TERMS.length, totalPages: 1 });
    }
    if (p === 'import/template') {
      st.templates.push({ method: req.method(), auth: !!req.headers().authorization });
      return route.fulfill({ status: 200, headers: { 'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'content-disposition': 'attachment; filename="glossary_import_template.xlsx"', 'access-control-expose-headers': 'Content-Disposition' }, body: 'PK-template' });
    }
    if (p === 'import' && req.method() === 'POST') {
      const raw = (req.postDataBuffer() || Buffer.alloc(0)).toString('latin1');
      const dry = (raw.match(/name="dryRun"\r\n\r\n([^\r\n]*)/) || [])[1];
      const fileName = Buffer.from((raw.match(/name="file"; filename="([^"]*)"/) || [])[1] || '', 'latin1').toString('utf8');
      st.imports.push({ dryRun: dry, fileName, multipart: /multipart\/form-data/.test(req.headers()['content-type'] || ''), hasXlsx: raw.includes('PK') });
      if (st.mode === 'badHeader') {
        return route.fulfill({ status: 400, json: { success: false, code: 'E-VALID-001', message: '템플릿의 머리글과 다릅니다. 1행은 [공식 용어* · 뜻* · 고객사 정보 · 유사어] 이어야 합니다. (파일: 공식 용어 · 뜻 · 분류 · 유사어)', error: { code: 'E-VALID-001', field: 'file' } } });
      }
      const isDry = dry !== 'false';
      return ok(previewData(isDry), undefined, isDry ? '미리보기입니다. 아직 등록하지 않았습니다.' : '용어 사전을 등록했습니다.');
    }
    return route.continue();
  });
  return st;
}

/** 시험용 xlsx — 머리글을 바꿔 가며 만듭니다 (2026-10-03 분류 삭제 — 3열이 「고객사 정보」 Y/N) */
async function makeXlsx(head = ['공식 용어*', '뜻*', '고객사 정보', '유사어']) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('용어');
  ws.addRow(head);
  ws.addRow(['8D', '', '', '팔디보고, 8디']);
  ws.addRow(['스티프너', 'FPCB 보강판', 'Y', '보강판, 스티프']);
  ws.addRow(['값오류', '뜻', '예', '']);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

async function chooseFile(page, buffer, name = '용어.xlsx') {
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: '엑셀 업로드', exact: true }).click(),
  ]);
  assert.match(await chooser.element().getAttribute('accept'), /\.xlsx/, 'accept .xlsx');
  await chooser.setFiles({ name, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer });
}

(async () => {
  const { browser, page } = await open('admin');
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    await page.setViewportSize({ width: 1208, height: 805 });
    /* ── 통합관리자 · 쓰기 권한 ── */
    let st = await setup(page, { admin: true, write: true });
    await page.goto(`${WEB}/system/glossary`);
    await page.locator('.tabulator-row').first().waitFor({ timeout: 30000 });
    if (SHOT_DIR) await page.screenshot({ path: path.join(SHOT_DIR, 'glossary-import-header.png') });

    // (1) 템플릿 — GET, 토큰, 서버 파일명
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: '템플릿 내려받기', exact: true }).click()]);
    assert.equal(dl.suggestedFilename(), 'glossary_import_template.xlsx', '서버 파일명');
    assert.deepEqual(st.templates, [{ method: 'GET', auth: true }], '템플릿 GET 1회 · 토큰');

    // (2) 업로드 → 미리보기
    const loadsBefore = st.termLoads;
    await chooseFile(page, await makeXlsx());
    await page.getByText('엑셀 업로드 미리보기', { exact: true }).waitFor();
    assert.equal(st.imports.length, 1, '미리보기 요청 1회');
    assert.equal(st.imports[0].dryRun, 'true', 'dryRun=true');
    assert(st.imports[0].multipart && st.imports[0].hasXlsx, 'multipart 로 xlsx 본문');
    assert.equal(st.imports[0].fileName, '용어.xlsx', '파일 이름');
    const modalText = await page.evaluate(() => document.body.innerText);
    for (const want of ['용어.xlsx · 데이터 3행', '새 용어 1', '기존 용어 1', '새 유사어 3', '건너뜀 1', '오류 1',
      '오류 행은 빼고 등록합니다', '뜻·고객사 정보는 바꾸지 않습니다', '되살림', '팔디보고', '보강판 · 스티프',
      '이미 등록된 유사어입니다. [8디]', '고객사 정보: 고객사 정보는 Y 또는 N 으로 적어 주세요. [예]', '기존 용어 — 뜻·고객사 정보는 바꾸지 않음',
      '고객사 정보 · FPCB 보강판', '예전 유사어 2건이 함께 돌아옴', '8D보고서']) {
      assert(modalText.includes(want), `모달에 「${want}」`);
    }
    // 2026-10-03 분류 삭제 — 미리보기 어디에도 「분류」 가 없습니다
    assert(!modalText.includes('분류'), '미리보기에 분류 없음');
    assert.equal(await page.getByText('오류', { exact: true }).count() >= 1, true, '오류 배지');
    if (SHOT_DIR) { await page.waitForTimeout(1200); await page.screenshot({ path: path.join(SHOT_DIR, 'glossary-import-preview.png') }); }

    // 미리보기 표도 좁으면 가로 스크롤 — 마지막 열(오류·안내) 머리글이 있음
    assert(await page.locator('.tabulator-col[tabulator-field="messages"]').count() >= 1, '오류·안내 열');

    // (3) [2건 등록] → dryRun=false · 닫힘 · 토스트 · 다시 조회
    const applyBtn = page.getByRole('button', { name: '2건 등록', exact: true });
    await applyBtn.click();
    await page.getByText(/용어 사전을 등록했습니다\./).first().waitFor();
    assert.equal(st.imports.length, 2, '등록 요청');
    assert.equal(st.imports[1].dryRun, 'false', 'dryRun=false');
    assert.equal(st.imports[1].fileName, '용어.xlsx', '같은 파일');
    await page.getByText('엑셀 업로드 미리보기', { exact: true }).waitFor({ state: 'detached' });
    await page.waitForTimeout(500);
    assert(st.termLoads > loadsBefore, '등록 뒤 목록 다시 조회');

    // (4) 머리글 오류 400 → 토스트, 모달 없음
    st.mode = 'badHeader';
    await page.waitForTimeout(3500); // 앞 토스트가 사라지기를 기다립니다
    // 예전 4열 템플릿(분류 열) 파일 — 서버가 400 「템플릿의 머리글과 다릅니다」
    await chooseFile(page, await makeXlsx(['공식 용어*', '뜻*', '분류', '유사어']), 'old.xlsx');
    await page.getByText(/템플릿의 머리글과 다릅니다/).first().waitFor();
    assert.equal(await page.getByText('엑셀 업로드 미리보기', { exact: true }).count(), 0, '400 이면 모달 없음');

    /* ── 쓰기 권한 없음(미배정) ── */
    st = await setup(page, { admin: false, write: false });
    await page.goto(`${WEB}/system/glossary`);
    await page.locator('.tabulator-row').first().waitFor();
    const up = page.getByRole('button', { name: '엑셀 업로드', exact: true });
    assert(await up.isDisabled(), '엑셀 업로드 비활성');
    assert(await page.getByLabel(NO_WRITE).count() >= 1, '비활성 이유 도움말');
    assert(!(await page.getByRole('button', { name: '템플릿 내려받기', exact: true }).isDisabled()), '템플릿은 조회 권한으로');
    await up.click({ force: true }).catch(() => {});
    await page.waitForTimeout(400);
    assert.equal(st.imports.length, 0, '비활성 단추는 요청 없음');

    assert.equal(errors.length, 0, errors.join('\n'));
    console.log('PASS: glossary import — 분류 삭제(미리보기 분류 없음·고객사 정보 표시·옛 분류 템플릿 400), 템플릿 GET 내려받기, 업로드 미리보기(multipart·dryRun=true·건수·행 표·되살림·건너뜀 사유·오류·안내), [2건 등록] dryRun=false·닫힘·토스트·재조회, 머리글 400 안내, 미배정 업로드 비활성 + 이유');
  } catch (e) {
    console.error('화면:', (await page.evaluate(() => document.body.innerText).catch(() => '')).slice(0, 1200));
    throw e;
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exitCode = 1; });
