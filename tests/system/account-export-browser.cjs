/*
 * 계정 관리 엑셀 옵션 패널 (기획 01 ACC-17, 공통 CMN-07 · R-10 · R-16)
 *
 *  · [엑셀 다운로드 ▾] → 버튼 바로 아래 패널(조회 목록 n건 / 전체 N건), Esc·바깥 클릭으로 닫힘
 *  · 조회 목록 파일 = 그리드(열 필터·정렬·열 순서) 그대로
 *  · 전체 파일 = 검색어·필터와 무관하게 size=0 전량
 *  · 다운로드 이력 scopeCd VIEW/ALL · 조건 요약
 *  · 조회 전용(canWrite=false)이어도 받을 수 있음
 *  · 360px 화면에서 패널이 잘리지 않음
 *
 *   WEB_URL=http://localhost:8081 node tests/system/account-export-browser.cjs
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { open, WEB } = require('../lib/browser');
const { pickListFilter } = require('../lib/accountTabs');

(async () => {
  const { browser, page } = await open();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // 앱 번들은 8080 을 부릅니다 — API_URL 이 다르면(예: 18081) 그쪽으로 돌립니다. 아래의 화면별 가로채기가 먼저 걸립니다
  const apiTarget = (process.env.API_URL || 'http://localhost:8080').replace(/\/$/, '');
  if (!apiTarget.endsWith('localhost:8080')) {
    await page.route('http://localhost:8080/**', (r) => r.continue({ url: r.request().url().replace('http://localhost:8080', apiTarget) }));
  }

  const users = Array.from({ length: 24 }, (_, i) => ({
    empNo: `E${String(i).padStart(2, '0')}`, name: `내보내기 ${i}`, deptId: 2, dept: i % 2 ? '품질보증팀' : '제조팀', pos: 'STAFF', posNm: '사원',
    state: i % 5 === 0 ? 'LOCKED' : 'ACTIVE', stateNm: i % 5 === 0 ? '잠김' : '사용', loginFailCnt: i, pwdChangeRequired: i % 3 === 0,
    lastLoginAt: `2026-09-${String(10 + i).padStart(2, '0')} 08:00`, extraMenuIds: [],
  }));
  const summary = { userCnt: { total: 24, active: 19, locked: 5, suspended: 0, pending: 0 }, deptCnt: 2, canWrite: false, currentUser: { superAdmin: false } };
  const logs = [];
  const userCalls = [];
  await page.route('**/api/v1/download-logs**', async (route) => {
    if (route.request().method() === 'POST') logs.push(route.request().postDataJSON());
    return route.fulfill({ json: { success: true, data: { logId: logs.length }, message: '기록' } });
  });
  await page.route('**/api/v1/system/**', async (route) => {
    const req = route.request(); const url = new URL(req.url());
    const path = url.pathname.replace('/api/v1/system/', '');
    const ok = (data, meta) => route.fulfill({ json: { success: true, data, meta, message: '완료' } });
    if (path === 'accounts/summary') return ok(summary);
    if (path === 'users/pending') return ok({ items: [] }, { total: 0, page: 1, size: 10, totalPages: 1 });
    if (path === 'depts') return ok({ items: [{ deptId: 2, deptNm: '품질보증팀', userCnt: 24 }] }, { total: 1 });
    if (path === 'perm-logs') return ok({ items: [] }, { total: 0 });
    if (path === 'users') {
      const keyword = url.searchParams.get('keyword') || '';
      userCalls.push({ keyword, size: url.searchParams.get('size') });
      const rows = users.filter((u) => Object.values(u).join(' ').includes(keyword));
      return ok({ items: rows }, { total: rows.length, page: 1, size: 0, totalPages: 1 });
    }
    return route.fallback();
  });

  const grid = page.locator('[id="account-grid-계정"]');
  const exportBtn = page.getByRole('button', { name: /엑셀 다운로드/ });
  const readDownload = async (itemName) => {
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: itemName }).click()]);
    const text = fs.readFileSync(await dl.path(), 'utf8');
    const rows = [...text.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map((m) => [...m[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map((c) => c[1].replace(/<[^>]+>/g, '').trim()));
    return { text, head: rows[0], body: rows.slice(1) };
  };

  try {
    await page.goto(`${WEB}/system/account`);
    await grid.locator('.tabulator-row').first().waitFor();

    // 패널 열림 · Esc · 바깥 클릭
    assert(await exportBtn.isEnabled(), '조회 전용이어도 엑셀 버튼 활성(R-10)');
    await exportBtn.click();
    const viewItem = page.getByRole('menuitem', { name: /조회 목록 다운로드/ });
    const allItem = page.getByRole('menuitem', { name: /전체 다운로드/ });
    await viewItem.waitFor();
    assert((await viewItem.innerText()).includes('24건'), await viewItem.innerText());
    assert((await allItem.innerText()).includes('24건'), await allItem.innerText());
    const btnBox = await exportBtn.boundingBox(); const panelBox = await page.getByRole('menu').boundingBox();
    assert(panelBox.y >= btnBox.y + btnBox.height - 1 && panelBox.y - (btnBox.y + btnBox.height) < 16, '패널이 버튼 바로 아래');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    assert.equal(await page.getByRole('menu').count(), 0, 'Esc 로 닫힘');
    await exportBtn.click();
    await page.mouse.click(20, 880);
    await page.waitForTimeout(150);
    assert.equal(await page.getByRole('menu').count(), 0, '바깥 클릭으로 닫힘');

    // 열 필터 「상태=잠김」 + 정렬 「로그인 실패↓」
    // 상태 머리글은 목록입니다(2026-10-02) — 눌러서 「잠김」 을 고릅니다
    await pickListFilter(grid, 'state', '잠김');
    const failHeader = grid.locator('.tabulator-col[tabulator-field="loginFailCnt"] .tabulator-col-title');
    await failHeader.click(); await page.waitForTimeout(150); await failHeader.click(); await page.waitForTimeout(300);
    const gridNames = await grid.locator('.tabulator-row .tabulator-cell[tabulator-field="empNo"]').allInnerTexts();
    assert.equal(gridNames.length, 5, `열 필터 결과 5행: ${gridNames}`);

    await exportBtn.click();
    assert((await page.getByRole('menuitem', { name: /조회 목록 다운로드/ }).innerText()).includes('5건'), '조회 목록 건수 = 필터 결과');
    const view = await readDownload(/조회 목록 다운로드/);
    assert.deepEqual(view.head, ['아이디', '이름', '이메일', '소속 부서', '직급', '관리자', '상태', '가입 경로', '초기 비밀번호', '로그인 실패', '최근 접속'], `열 순서: ${view.head}`);
    assert.deepEqual(view.body.slice(0, 5).map((r) => r[0]), gridNames.map((t) => t.trim()), '행 순서 = 그리드 정렬');
    assert(view.body.slice(0, 5).every((r) => r[6] === '잠김'), '상태는 한글 표기');
    assert(view.text.includes('비공개 처리'), '파일 안 비공개 건수 표기');
    await page.waitForTimeout(300);
    const vlog = logs.at(-1);
    assert.equal(vlog.scopeCd, 'VIEW');
    assert.equal(vlog.menuId, 'sys-account');
    assert(vlog.condSummary.includes('열 필터 상태=잠김') && vlog.condSummary.includes('정렬 로그인 실패↓'), vlog.condSummary);

    // 열 필터를 걸어도 전체 파일은 조건 무시(계정 탭에는 검색줄이 없습니다, 2026-10-02)
    await grid.locator('.tabulator-col[tabulator-field="name"] input').fill('내보내기 1');
    await page.waitForTimeout(500);
    await exportBtn.click();
    const all = await readDownload(/전체 다운로드/);
    assert.equal(all.body.filter((r) => /^E\d+$/.test(r[0])).length, 24, '전체 파일 = 전량');
    assert.equal(userCalls.at(-1).keyword, '', '전체는 검색어 없이 다시 조회');
    assert.equal(userCalls.at(-1).size, '0');
    await page.waitForTimeout(300);
    assert.equal(logs.at(-1).scopeCd, 'ALL');
    assert.equal(logs.at(-1).condSummary, '전체(조건 무시)');

    // 360px — 패널이 화면 밖으로 잘리지 않음
    await page.setViewportSize({ width: 360, height: 800 });
    await page.waitForTimeout(400);
    await exportBtn.scrollIntoViewIfNeeded();
    await exportBtn.click();
    const box = await page.getByRole('menu').boundingBox();
    assert(box.x >= 0 && box.x + box.width <= 361, `360px 패널 위치: ${JSON.stringify(box)}`);

    assert.equal(errors.length, 0, errors.join('\n'));
    console.log('PASS: account export — 패널 열림/닫힘, 조회 목록=그리드(필터·정렬·열 순서), 전체=전량, 이력 VIEW/ALL·조건 요약, 조회 전용 허용, 360px');
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
