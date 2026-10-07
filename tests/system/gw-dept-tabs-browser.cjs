/*
 * 부서 매핑 화면 「부서」 · 「배정 계정」 탭 (2026-10-07)
 *
 *  · 탭 순서 — 부서 매핑 · 미배정 계정 · 배정 계정 · 부서(맨 끝)
 *  · 부서 탭(계정 관리에서 옮김) — 시스템 부서 · 소속 계정이 있는 부서 [삭제] 비활성 + 이유, 빈 부서만 삭제 가능,
 *    미배정 고정 권한 배지 · 권한 수, 미배정 편집은 부서명 없이 설명만(PUT depts/59 에 deptNm 없음),
 *    [부서 등록] 초기 권한 선택지에 시스템 부서 없음 · 숫자로 전송, 1000px 에서 「관리」 열까지 가로 스크롤
 *  · 계정 관리에는 「부서」 탭이 없음
 *  · 배정 계정 탭 — 미배정 계정은 빠짐, 체크한 계정을 고른 부서로 변경(사람마다 PUT users/{empNo}/dept, 이미 그 부서인 사람은 보내지 않음),
 *    부서 선택지 끝에 미배정(되돌리기), 실패한 사람은 결과 창에 사유, 쪽 나누기(기본 50 · 10/25/50/100), 머리글 「전체 선택」은 지금 쪽만 고르고
 *    필터 · 쪽 이동 · 표시 건수가 바뀌면 선택이 풀림
 *
 * page.route 로 시스템 API 를 흉내 냅니다(로그인만 실제 API).
 *   WEB_URL=http://localhost:8081 node tests/system/gw-dept-tabs-browser.cjs
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

  const depts = [
    { deptId: 1, deptNm: '통합관리자', desc: '전 권한', superAdmin: true, systemRole: 'SUPER_ADMIN', userCnt: 1 },
    { deptId: 2, deptNm: '품질보증팀', desc: '품질', superAdmin: false, systemRole: null, userCnt: 3, menuCnt: 10, dataCnt: 4 },
    { deptId: 4, deptNm: '제조팀', desc: '제조', superAdmin: false, systemRole: null, userCnt: 1, menuCnt: 8, dataCnt: 2 },
    { deptId: 70, deptNm: '빈부서', desc: '소속 없음', superAdmin: false, systemRole: null, userCnt: 0, menuCnt: 2, dataCnt: 0 },
    { deptId: 59, deptNm: '미배정', desc: '자동 가입', superAdmin: false, systemRole: 'UNASSIGNED', lockedPerms: true, fixedMenus: ['dash-ai', 'dash-proc', 'prod-monitor', 'ai-chat', 'chat-history'], fixedDataFields: [], userCnt: 1 },
  ];
  const accounts = [
    { empNo: 'Q1', name: '품질일', deptId: 2, dept: '품질보증팀', pos: 'STAFF', posNm: '사원', state: 'ACTIVE', stateNm: '사용', joinSrc: 'GROUPWARE', requestedAt: '2026-09-30 14:00' },
    { empNo: 'Q2', name: '품질이', deptId: 2, dept: '품질보증팀', pos: 'STAFF', posNm: '사원', state: 'ACTIVE', stateNm: '사용', joinSrc: 'ADMIN' },
    { empNo: 'M1', name: '제조일', deptId: 4, dept: '제조팀', pos: 'STAFF', posNm: '대리', state: 'LOCKED', stateNm: '잠김', joinSrc: 'SIGNUP' },
    { empNo: 'U1', name: '미배정일', deptId: 59, dept: '미배정', pos: 'STAFF', posNm: '사원', state: 'ACTIVE', stateNm: '사용', joinSrc: 'GROUPWARE' },
    // 쪽 나누기 확인용 — 제조팀 60명(배정 계정 63명 → 50건씩 2쪽)
    ...Array.from({ length: 60 }, (_, i) => ({ empNo: `P${String(i + 1).padStart(2, '0')}`, name: `제조${i + 1}`, deptId: 4, dept: '제조팀', pos: 'STAFF', posNm: '사원', state: 'ACTIVE', stateNm: '사용', joinSrc: 'GROUPWARE' })),
  ];
  const summary = {
    gwDeptCnt: 1, mappedCnt: 0, unmappedCnt: 1, excludedCnt: 0, unassignedUserCnt: 1,
    unassignedDept: { deptId: 59, deptNm: '미배정' }, canWrite: true,
    health: { unassignedDeptFound: true, sourceExists: true, sourceRowCnt: 10, engineDeptName: '미배정' },
  };
  const sent = [];
  await page.route('**/api/v1/system/**', async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace('/api/v1/system/', '');
    const ok = (data, meta, message = '처리했습니다.') => route.fulfill({ json: { success: true, data, meta, message } });
    if (req.method() !== 'GET') {
      sent.push({ method: req.method(), path, body: req.postDataJSON() });
      // M1 은 부서 변경 실패를 흉내 냅니다
      if (path === 'users/M1/dept') return route.fulfill({ status: 409, json: { success: false, code: 'E-CONFLICT', message: '검증용 거부' } });
      return ok({ deptId: 33 });
    }
    if (path === 'gw-dept-maps/summary') return ok(summary);
    if (path === 'gw-dept-maps') return ok({ items: [{ gwDeptNm: 'IPQC파트(M)', deptId: null, joinYn: 'Y', state: 'UNMAPPED', hasRow: false, inSource: true }] }, { total: 1 });
    if (path === 'gw-dept-maps/unassigned-users') return ok({ items: [{ empNo: 'U1', name: '미배정일', gwDeptNm: 'IPQC파트(M)', stateNm: '사용' }] }, { total: 1 });
    if (path === 'depts') return ok({ items: depts }, { total: depts.length, page: 1, size: 0, totalPages: 1 });
    if (path === 'users') return ok({ items: accounts }, { total: accounts.length, page: 1, size: 0, totalPages: 1 });
    if (path === 'perm-logs') return ok({ items: [] }, { total: 0 });
    return ok({ items: [] }, { total: 0 });
  });

  const titleOf = (loc) => loc.evaluate((el) => el.closest('[title]')?.getAttribute('title') || '');
  const lastSent = () => sent[sent.length - 1];
  const modalButton = (name) => page.getByRole('button', { name, exact: true }).last();

  try {
    // 계정 관리에는 「부서」 탭이 없습니다
    await page.goto(`${WEB}/system/account`);
    await page.locator('#account-tab-users').waitFor();
    assert.equal(await page.locator('#account-tab-depts').count(), 0, '계정 관리 부서 탭 없음');

    await page.goto(`${WEB}/system/gw-dept-map`);
    await page.locator('#gw-dept-tab-map').waitFor();
    const tabs = await page.locator('[role="tab"][id^="gw-dept-tab-"]').evaluateAll((els) => els.map((e) => e.id.replace('gw-dept-tab-', '')));
    assert.deepEqual(tabs, ['map', 'users', 'assigned', 'depts'], `탭 순서 ${tabs}`);

    // ── 부서 탭 ──
    await page.locator('#gw-dept-tab-depts').click();
    const grid = page.locator('[id="account-grid-부서"]');
    await grid.locator('.tabulator-row').first().waitFor();
    const rowOf = (text) => grid.locator('.tabulator-row', { hasText: text });
    assert(await page.getByText('권한 부여 단위 · 소속 계정이 있으면 삭제할 수 없습니다').count(), '삭제 규칙 안내');
    const superRow = rowOf('통합관리자');
    const unassignedRow = rowOf('자동 가입');
    for (const r of [superRow, unassignedRow]) {
      const del = r.getByRole('button', { name: '삭제', exact: true });
      assert(await del.isDisabled(), '시스템 부서 삭제 비활성');
      assert((await titleOf(del)).includes('삭제할 수 없습니다'), '삭제 비활성 이유 툴팁');
    }
    const busyDel = rowOf('품질보증팀').getByRole('button', { name: '삭제', exact: true });
    assert(await busyDel.isDisabled(), '소속 계정이 있는 부서 삭제 비활성');
    assert((await titleOf(busyDel)).includes('소속 계정 3명'), '삭제 비활성 이유(소속 계정 수)');
    assert(await rowOf('빈부서').getByRole('button', { name: '삭제', exact: true }).isEnabled(), '빈 부서 삭제는 활성');
    assert(await unassignedRow.getByText('고정 권한 · 변경 불가').count(), '미배정 고정 권한 배지');
    assert(await unassignedRow.getByText('5', { exact: true }).count(), '미배정 메뉴 권한 수 5');
    assert(await superRow.getByText('전체', { exact: true }).count(), '통합관리자 권한 수 전체');

    // 미배정 부서 편집 — 부서명 없이 설명만
    await unassignedRow.getByRole('button', { name: '편집', exact: true }).click();
    assert(await page.getByText('미배정 부서는 이름을 바꿀 수 없습니다', { exact: false }).count(), '미배정 부서명 잠금 안내');
    assert.equal(await page.getByPlaceholder('예) 공정기술팀', { exact: true }).count(), 0, '미배정 부서명 입력칸 없음');
    await page.getByPlaceholder('예) 공정 조건 · 금형 관리', { exact: true }).fill('자동 가입 · 설명 수정');
    await modalButton('수정').click();
    await page.waitForTimeout(400);
    assert.equal(lastSent().path, 'depts/59');
    assert.equal(lastSent().body.deptNm, undefined, '미배정 부서명은 보내지 않음');

    // [부서 등록] — 초기 권한 선택지에 시스템 부서 없음, 숫자로 전송
    await page.getByRole('button', { name: '부서 등록', exact: true }).click();
    const init = page.getByRole('combobox', { name: '초기 권한 (복사해 올 부서)', exact: true });
    await init.waitFor();
    const initTexts = await init.locator('option').allTextContents();
    assert(!initTexts.some((t) => t === '통합관리자' || t === '미배정'), `초기 권한에 시스템 부서 없음: ${initTexts}`);
    await init.selectOption('70');
    await page.getByPlaceholder('예) 공정기술팀', { exact: true }).fill('신규부서');
    await modalButton('등록').click();
    await page.waitForTimeout(400);
    assert.equal(lastSent().method, 'POST');
    assert.equal(lastSent().path, 'depts');
    assert.equal(lastSent().body.deptNm, '신규부서');
    assert.equal(lastSent().body.initPermFrom, 70, '초기 권한은 숫자');

    // 1000px — 「관리」 열까지 가로 스크롤
    await page.setViewportSize({ width: 1000, height: 900 });
    await page.waitForTimeout(600);
    const scroll = await grid.evaluate(async (root) => {
      const box = [...root.querySelectorAll('div')].find((el) => getComputedStyle(el).overflowX === 'auto' && el.scrollWidth > el.clientWidth && (el.querySelector('.tabulator') || el.classList.contains('tabulator-tableholder')));
      if (!box) return { scroll: false };
      box.scrollLeft = box.scrollWidth;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const col = [...root.querySelectorAll('.tabulator-headers .tabulator-col')].at(-1);
      const cell = root.querySelector('.tabulator-row .tabulator-cell:last-of-type');
      const b = box.getBoundingClientRect(); const h = col.getBoundingClientRect(); const c = cell.getBoundingClientRect();
      return { scroll: box.scrollLeft > 0, header: h.right <= b.right + 2, cell: c.right <= b.right + 2, aligned: Math.abs(h.x - c.x) < 2, title: col.innerText.trim() };
    });
    assert(scroll.scroll && scroll.header && scroll.cell && scroll.aligned && scroll.title === '관리', `부서 표 마지막 열 스크롤: ${JSON.stringify(scroll)}`);
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.waitForTimeout(400);

    // ── 배정 계정 탭 ──
    await page.locator('#gw-dept-tab-assigned').click();
    const panel = page.locator('#gw-dept-panel-assigned');
    await panel.locator('.tabulator-row').first().waitFor();
    const empNos = () => panel.locator('.tabulator-row .tabulator-cell[tabulator-field="empNo"]').allTextContents();
    const shown = await empNos();
    assert.equal(shown.length, 50, `기본 50건: ${shown.length}`);
    assert(!shown.includes('U1'), '미배정 계정은 빠짐');
    assert.deepEqual(shown.slice(0, 3), ['Q1', 'Q2', 'M1']);
    const sizeSel = panel.locator('.tabulator-page-size');
    assert.deepEqual(await sizeSel.locator('option').allTextContents(), ['10', '25', '50', '100'], '표시 건수 선택지');
    assert.equal(await sizeSel.inputValue(), '50', '기본 표시 건수 50');
    const moveBtn = () => page.getByRole('button', { name: /^선택 \d+명 부서 변경$/ });
    const moveLabel = async () => (await moveBtn().textContent()).trim();
    assert(await moveBtn().isDisabled(), '체크 전 비활성');
    // 머리글 전체 선택 — 지금 쪽(50건)만
    const allBox = panel.locator('input.dw-page-select-all');
    await allBox.click();
    assert.equal(await moveLabel(), '선택 50명 부서 변경', '전체 선택은 지금 쪽 50명');
    assert(await allBox.isChecked(), '머리글 체크');
    // 쪽 이동 → 선택 해제
    await panel.locator('.tabulator-page[data-page="next"]').click();
    await page.waitForTimeout(200);
    assert.equal(await moveLabel(), '선택 0명 부서 변경', '쪽 이동하면 선택 해제');
    assert.equal((await empNos()).length, 13, '2쪽 13건');
    await allBox.click();
    assert.equal(await moveLabel(), '선택 13명 부서 변경', '2쪽 전체 선택');
    // 표시 건수 변경 → 선택 해제
    await sizeSel.selectOption('10');
    await page.waitForTimeout(200);
    assert.equal(await moveLabel(), '선택 0명 부서 변경', '표시 건수 바꾸면 선택 해제');
    // 필터 → 걸러진 행만 전체 선택, 필터를 바꾸면 해제
    const empFilter = panel.locator('.tabulator-col[tabulator-field="empNo"] .tabulator-header-filter input');
    await empFilter.fill('Q');
    await page.waitForTimeout(400);
    await allBox.click();
    assert.equal(await moveLabel(), '선택 2명 부서 변경', '필터된 2명 전체 선택');
    await empFilter.fill('');
    await page.waitForTimeout(400);
    assert.equal(await moveLabel(), '선택 0명 부서 변경', '필터 바꾸면 선택 해제');
    assert(!(await allBox.isChecked()), '머리글 체크 풀림');
    await sizeSel.selectOption('50');
    await page.waitForTimeout(200);
    for (const empNo of ['Q1', 'Q2', 'M1']) {
      await panel.locator('.tabulator-row', { hasText: empNo }).locator('input[type="checkbox"]').check();
    }
    await page.getByRole('button', { name: '선택 3명 부서 변경', exact: true }).click();
    const assignedOpts = await page.getByRole('combobox', { name: '부서', exact: true }).locator('option').allTextContents();
    assert.equal(assignedOpts[assignedOpts.length - 1], '미배정', `배정 계정 선택지 끝에 미배정: ${assignedOpts}`);
    assert(!assignedOpts.includes('통합관리자'), '통합관리자 선택지 없음');
    await page.getByRole('combobox', { name: '부서', exact: true }).selectOption('4');
    const before = sent.length;
    await modalButton('3명 변경').click();
    await page.getByText('2명의 부서를 바꿨습니다.').first().waitFor();
    const moves = sent.slice(before).map((x) => `${x.method} ${x.path} ${x.body?.deptId}`);
    // M1 은 이미 제조팀이라 보내지 않습니다
    assert.deepEqual(moves, ['PUT users/Q1/dept 4', 'PUT users/Q2/dept 4'], `부서 변경 요청 ${moves}`);
    // 실패 — 사번과 사유를 결과 창에 보입니다
    await panel.locator('.tabulator-row', { hasText: 'M1' }).locator('input[type="checkbox"]').waitFor();
    await page.waitForTimeout(500);
    await panel.locator('.tabulator-row', { hasText: 'M1' }).locator('input[type="checkbox"]').check();
    await page.getByRole('button', { name: '선택 1명 부서 변경', exact: true }).click();
    await page.getByRole('combobox', { name: '부서', exact: true }).selectOption('2');
    await modalButton('1명 변경').click();
    await page.getByText('부서 변경 결과').waitFor();
    assert(await page.getByText('제조일(M1) — 검증용 거부', { exact: true }).count(), '실패 사유');
    assert.equal(errors.length, 0, errors.join('\n'));
    console.log('PASS: gw-dept tabs — 탭 순서·계정 관리 부서 탭 없음·부서 탭(삭제 잠금·고정 권한·미배정 편집·부서 등록·좁은 화면)·배정 계정(미배정 제외·쪽 나누기·쪽 전체 선택·조건 변경 시 해제·일괄 부서 변경·같은 부서 건너뜀)');
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exitCode = 1; });
