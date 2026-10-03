/*
 * 업로드 문서 숨기기·복원(R-19 · D-13) — 실 API 모드 화면 + page.route 흉내 시험
 *
 *   WEB_URL=http://localhost:8097 LIVE_API=http://localhost:18081 node tests/system/upload-doc-hide-route-browser.cjs
 *
 * 서버의 숨기기·복원 API 가 만들어지는 중이라, 업로드 목록·숨기기·복원 세 경로만 page.route 로 흉내 내고
 * 나머지(로그인·/auth/me·공통코드 등)는 LIVE_API 로 돌립니다. 8080 사용자 프로세스는 건드리지 않습니다.
 *
 * 확인 항목
 *  1. 「숨긴 문서 포함」 → 목록 요청에 includeDeleted=true, 숨긴 행 흐림 + 「숨김」 태그 + 사유, 카드 「숨긴 문서 1건 별도」
 *  2. 「숨기기」 → 사유 필수 모달 → DELETE /system/uploads/{docId} 본문 {reason} (사유가 주소에 없음)
 *  3. 「복원」 → POST /system/uploads/{docId}/restore
 *  4. 쓰기가 막히면(2026-10-03 — 미배정 계정만 해당, /auth/me 의 unassigned) 단추 비활성 + 툴팁 안내
 */
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');

const WEB = process.env.WEB_URL || 'http://localhost:8097';
const LIVE = process.env.LIVE_API || 'http://localhost:18081';
const APP_API = process.env.APP_API || 'http://localhost:8080';
const PASSWORD = process.env.TEST_PASSWORD || 'Dwje!2026';

const results = [];
const step = async (name, fn) => {
  try { await fn(); results.push(`ok   ${name}`); } catch (e) { results.push(`FAIL ${name} — ${String(e.message).split('\n')[0]}`); if (process.env.DEBUG_FULL) console.error(e.message); throw e; }
};

/** 흉내 자료 — 문서 2건, 하나는 숨김 */
function seed() {
  const base = { latestVersion: 1, versionCnt: 1, createdBy: '10004', createdByName: '최전산', updatedBy: '10004', updatedByName: '최전산', fileName: 'a.xlsx', sizeBytes: 7261, parseState: 'OK', fileState: 'OK' };
  return [
    { ...base, docId: 101, title: '시험 문서 A', memo: '', createdAt: '2026-10-01 09:00:00', updatedAt: '2026-10-01 09:00:00', deleted: false },
    { ...base, docId: 102, title: '시험 문서 B (숨김)', memo: '', createdAt: '2026-09-30 09:00:00', updatedAt: '2026-09-30 09:00:00', deleted: true, deletedAt: '2026-10-02 10:00:00', deletedByName: '최전산', deleteReason: '잘못 올린 파일' },
  ];
}

async function run({ writable }) {
  const login = await (await fetch(`${LIVE}/api/v1/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ loginId: '10004', password: PASSWORD }) })).json();
  assert(login.success, `로그인 실패 ${login.message}`);
  const t = login.data;
  const browser = await chromium.launch({ channel: 'chrome', headless: process.env.HEADED !== '1' });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 960 } })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const docs = seed();
  const calls = [];

  await page.route(`${APP_API}/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname.replace('/api/v1', '');
    const json = (data, meta) => route.fulfill({ json: { success: true, code: 'SUCCESS', message: '완료', data, meta } });
    // 업로드 목록 — includeDeleted 가 true 일 때만 숨긴 문서 포함, 요약 docCnt 는 숨김 제외
    if (req.method() === 'GET' && path === '/system/uploads') {
      calls.push(`GET ${url.search}`);
      const withHidden = url.searchParams.get('includeDeleted') === 'true';
      const items = docs.filter((d) => withHidden || !d.deleted);
      const live = docs.filter((d) => !d.deleted);
      return json({
        items,
        summary: { docCnt: live.length, deletedDocCnt: docs.length - live.length, versionCnt: live.length, monthVersionCnt: live.length, totalBytes: 7261 * live.length, failDocCnt: 0, lastUploadedAt: '2026-10-01 09:00:00', maxBytesPerFile: 20971520, total: items.length, ok: items.length, warn: 0, fail: 0 },
        uploaders: [{ userId: '10004', userName: '최전산', docCnt: 2 }],
      }, { page: 1, size: 50, total: items.length, totalPages: 1 });
    }
    const hide = path.match(/^\/system\/uploads\/(\d+)$/);
    if (req.method() === 'DELETE' && hide) {
      calls.push(`DELETE ${path}${url.search} ${req.postData() || ''}`);
      const d = docs.find((x) => String(x.docId) === hide[1]);
      Object.assign(d, { deleted: true, deletedAt: '2026-10-02 11:00:00', deletedByName: '최전산', deleteReason: JSON.parse(req.postData() || '{}').reason });
      return json({ docId: d.docId, deleted: true, deletedAt: d.deletedAt });
    }
    const restore = path.match(/^\/system\/uploads\/(\d+)\/restore$/);
    if (req.method() === 'POST' && restore) {
      calls.push(`POST ${path}`);
      const d = docs.find((x) => String(x.docId) === restore[1]);
      Object.assign(d, { deleted: false, deletedAt: null, deletedByName: null, deleteReason: null });
      return json({ docId: d.docId, deleted: false });
    }
    // 쓰기 — 접근(sys-upload-doc)은 그대로 두고 미배정 여부로 막거나 엽니다
    const target = req.url().replace(APP_API, LIVE);
    const res = await route.fetch({ url: target });
    if (path === '/auth/me') {
      const body = await res.json();
      const mp = body.data?.menuPerms;
      if (mp === '*' || (Array.isArray(mp) && mp.includes('*'))) body.data.menuPerms = ['ai-chat', 'sys-upload-doc', 'dash-ai'];
      else if (Array.isArray(mp) && !mp.includes('sys-upload-doc')) body.data.menuPerms = [...mp, 'sys-upload-doc'];
      body.data.user = { ...body.data.user, superAdmin: false };
      body.data.unassigned = !writable;
      if (body.data.dept && typeof body.data.dept === 'object') body.data.dept = { ...body.data.dept, unassigned: !writable };
      return route.fulfill({ response: res, json: body });
    }
    return route.fulfill({ response: res });
  });

  try {
    await page.goto(`${WEB}/login`);
    await page.evaluate((s) => localStorage.setItem('dwje.ax.session', JSON.stringify(s)), { accessToken: t.accessToken, refreshToken: t.refreshToken, userInfo: t.user });
    await page.goto(`${WEB}/system/upload-doc`);
    const grid = page.locator('.tabulator').first();
    await grid.locator('.tabulator-row').first().waitFor({ timeout: 60000 });

    if (writable) {
      await step('기본 목록 — 숨긴 문서 빠짐 · 카드에 숨긴 문서 수', async () => {
        assert.equal(await grid.locator('.tabulator-row').count(), 1);
        assert(!calls[calls.length - 1].includes('includeDeleted'), '기본은 includeDeleted 를 보내지 않음');
        const text = await page.evaluate(() => document.body.innerText);
        assert.match(text, /숨긴 문서 1건 별도/);
        assert.match(text, /숨긴 문서 포함 \(1건\)/);
      });

      await step('숨긴 문서 포함 → includeDeleted=true · 흐림 · 숨김 태그 · 사유', async () => {
        await page.getByText(/^숨긴 문서 포함/).click();
        const hidden = grid.locator('.tabulator-row', { hasText: '시험 문서 B' }).first();
        await hidden.waitFor({ timeout: 15000 });
        assert.match(calls[calls.length - 1], /includeDeleted=true/);
        assert.equal(await hidden.evaluate((el) => el.style.opacity), '0.55');
        const txt = await hidden.innerText();
        assert.match(txt, /숨김/);
        assert.match(txt, /잘못 올린 파일/);
        await hidden.getByRole('button', { name: '복원' }).waitFor();
      });

      await step('복원 → POST …/restore', async () => {
        await grid.locator('.tabulator-row', { hasText: '시험 문서 B' }).first().getByRole('button', { name: '복원' }).click();
        await page.waitForTimeout(1200);
        assert(calls.some((c) => c === 'POST /system/uploads/102/restore'), calls.join(' | '));
        const back = grid.locator('.tabulator-row', { hasText: '시험 문서 B' }).first();
        assert.equal(await back.evaluate((el) => el.style.opacity), '');
      });

      await step('숨기기 → 사유 필수 → DELETE 본문 {reason}', async () => {
        await grid.locator('.tabulator-row', { hasText: '시험 문서 A' }).first().getByRole('button', { name: '숨기기' }).click();
        await page.getByText('업로드 문서 숨기기').waitFor();
        await page.getByText('숨기기', { exact: true }).last().click();
        await page.waitForTimeout(400);
        assert(!calls.some((c) => c.startsWith('DELETE')), '사유 없이 요청하지 않음');
        await page.getByPlaceholder(/잘못 올린 파일/).fill('시험 — 중복 업로드');
        await page.getByText('숨기기', { exact: true }).last().click();
        await page.getByText('업로드 문서 숨기기').waitFor({ state: 'detached', timeout: 10000 });
        const del = calls.find((c) => c.startsWith('DELETE'));
        assert(del, calls.join(' | '));
        assert.match(del, /^DELETE \/system\/uploads\/101 \{"reason":"시험 — 중복 업로드"\}$/, del);
      });
    } else {
      await step('쓰기 권한 없음 → 숨기기·복원 단추 비활성 + 툴팁', async () => {
        await page.getByText(/^숨긴 문서 포함/).click();
        await grid.locator('.tabulator-row', { hasText: '시험 문서 B' }).first().waitFor({ timeout: 15000 });
        for (const name of ['숨기기', '복원']) {
          const b = grid.getByRole('button', { name }).first();
          assert(await b.isDisabled(), `${name} 비활성`);
          assert.equal(await b.getAttribute('title'), '미배정 계정은 이 동작을 할 수 없습니다. 전산팀에 부서 배정을 요청하세요.');
        }
        await grid.getByRole('button', { name: '숨기기' }).first().click({ force: true }).catch(() => {});
        await page.waitForTimeout(500);
        assert.equal(await page.getByText('업로드 문서 숨기기').count(), 0, '모달이 열리지 않음');
      });
    }
    assert.deepEqual(errors, [], `화면 오류: ${errors.join(' | ')}`);
  } finally {
    await browser.close();
  }
}

(async () => {
  try {
    await run({ writable: true });
    await run({ writable: false });
  } finally {
    console.log(results.join('\n'));
  }
})().then(() => process.exit(0)).catch((e) => { console.error(String(e.message).split('\n')[0]); process.exit(1); });
