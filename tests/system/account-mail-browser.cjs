/*
 * 계정 관리 — R-17 SMTP 반영 (공통 문서 11.1)
 *
 *  · 요약 mailEnabled=true → 잠금 해제 모달 「사용자가 이메일 인증으로 직접 풀 수 있습니다 · 관리자 해제도 가능」
 *  · 요약 mailLastFailAt 이 있으면 화면 위 경고 — 쓰기 권한자(통합관리자·전산팀)에게만
 * 요약·목록은 page.route 로 흉내 냅니다.
 *
 *   API_URL=http://localhost:18081 WEB_URL=http://localhost:8099 node tests/system/account-mail-browser.cjs
 */
const assert = require('node:assert/strict');
const { open, WEB } = require('../lib/browser');

(async () => {
  const { browser, page } = await open();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const apiTarget = (process.env.API_URL || 'http://localhost:8080').replace(/\/$/, '');
  if (!apiTarget.endsWith('localhost:8080')) {
    await page.route('http://localhost:8080/**', (r) => r.continue({ url: r.request().url().replace('http://localhost:8080', apiTarget) }));
  }
  const summary = {
    userCnt: { total: 1, active: 0, locked: 1, suspended: 0, pending: 0 }, deptCnt: 1,
    currentUser: { empNo: '10000', superAdmin: true }, canWrite: true, mailEnabled: true, mailLastFailAt: '2026-10-02 08:10',
  };
  const users = [{ empNo: 'L1', name: '잠김계정', deptId: 2, dept: '품질보증팀', pos: 'STAFF', posNm: '사원', state: 'LOCKED', stateNm: '잠김', loginFailCnt: 5, lockedAt: '2026-10-02 07:55', emailMasked: 'l***@derkwoo.com', extraMenuIds: [] }];
  await page.route('**/api/v1/system/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1/system/', '');
    const ok = (data, meta) => route.fulfill({ json: { success: true, data, meta } });
    if (path === 'accounts/summary') return ok(summary);
    if (path === 'users') return ok({ items: users }, { total: 1 });
    if (path === 'users/pending' || path === 'perm-logs') return ok({ items: [] }, { total: 0 });
    if (path === 'depts') return ok({ items: [{ deptId: 2, deptNm: '품질보증팀', abbr: 'QA', userCnt: 1 }] }, { total: 1 });
    return route.fallback();
  });
  const WARN = '최근 메일 발송 실패 2026-10-02 08:10 — 한비로 SMTP 계정이 32일 미로그인으로 꺼졌는지 확인하세요';

  try {
    await page.goto(`${WEB}/system/account`);
    await page.locator('[id="account-grid-계정"] .tabulator-row').first().waitFor({ timeout: 60000 });
    assert(await page.getByText(WARN, { exact: false }).count(), '쓰기 권한자에게 메일 발송 실패 경고');

    await page.getByRole('button', { name: '잠금 해제', exact: true }).first().click();
    await page.getByText('사용자가 이메일 인증으로 직접 풀 수 있습니다 · 관리자 해제도 가능합니다.', { exact: false }).waitFor();
    assert.equal(await page.getByText('메일 서버 설정 후 열립니다', { exact: false }).count(), 0, 'SMTP 미설정 안내 없음');
    await page.getByRole('button', { name: '취소', exact: true }).last().click();

    // 조회 전용(쓰기 권한 없음)이면 경고를 보이지 않음
    summary.canWrite = false;
    await page.goto(`${WEB}/system/account`);
    await page.locator('[id="account-grid-계정"] .tabulator-row').first().waitFor({ timeout: 60000 });
    assert.equal(await page.getByText(WARN, { exact: false }).count(), 0, '조회 전용에게는 경고 없음');

    // 실패가 없으면 경고 없음
    summary.canWrite = true; summary.mailLastFailAt = null;
    await page.goto(`${WEB}/system/account`);
    await page.locator('[id="account-grid-계정"] .tabulator-row').first().waitFor({ timeout: 60000 });
    assert.equal(await page.getByText('최근 메일 발송 실패', { exact: false }).count(), 0);

    assert.equal(errors.length, 0, errors.join('\n'));
    console.log('PASS: R-17 — 이메일 직접 해제 안내·메일 발송 실패 경고(쓰기 권한자만)');
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
