/*
 * 그룹웨어 부서 매핑 2026-10 개선 회귀 (기획 02 GWD-01·02·03·08·14·15)
 *
 *  · 미배정 탭 — 검색 · 상태 칸과 [매핑대로 재배정] 은 없음(2026-10-02), 체크한 계정은 [선택 n명 부서 지정] 으로 옮김
 *  · 부서 선택지(지정·부서 지정)에 통합관리자 없음
 *  · health 이상 경고, 미배정 표기 「고정 5개 화면 · 데이터 비공개」
 *  · 엑셀 옵션 패널: 조회 목록 = 보이는 행, 전체 = 조건 무시, 이력 VIEW/ALL
 *  · 조회 전용(canWrite=false) → 쓰기 버튼·선택 칸 비활성, 엑셀은 그대로
 *  · 1000px 에서 두 표 마지막 열 「관리」 까지 가로 스크롤
 *
 *   WEB_URL=http://localhost:8081 node tests/system/gw-dept-map-browser.cjs
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { open, WEB } = require('../lib/browser');

const WRITE_DENIED = '이 화면의 쓰기 권한이 없습니다. 전산팀에 요청하세요.';

(async () => {
  const { browser, page } = await open();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // 앱 번들은 8080 을 부릅니다 — API_URL 이 다르면(예: 18081) 그쪽으로 돌립니다. 아래의 화면별 가로채기가 먼저 걸립니다
  const apiTarget = (process.env.API_URL || 'http://localhost:8080').replace(/\/$/, '');
  if (!apiTarget.endsWith('localhost:8080')) {
    await page.route('http://localhost:8080/**', (r) => r.continue({ url: r.request().url().replace('http://localhost:8080', apiTarget) }));
  }

  const maps = [
    { gwDeptNm: 'IPQC파트(M)', activeCnt: 25, joinedCnt: 25, unassignedCnt: 25, deptId: null, deptNm: null, joinYn: 'Y', state: 'UNMAPPED', remark: '', hasRow: false, inSource: true },
    { gwDeptNm: '제조1파트(M)', activeCnt: 12, joinedCnt: 12, unassignedCnt: 5, deptId: 4, deptNm: '제조팀', joinYn: 'Y', state: 'MAPPED', remark: '확인', hasRow: true, inSource: true, updDate: '2026-09-30 10:00', updUserNm: '최전산' },
    { gwDeptNm: '품질보증(구)', activeCnt: 0, joinedCnt: 0, unassignedCnt: 0, deptId: 2, deptNm: '품질보증팀', joinYn: 'Y', state: 'MAPPED', remark: '', hasRow: true, inSource: false },
  ];
  const users = [
    ...Array.from({ length: 6 }, (_, i) => ({ empNo: `IP${i}`, name: `아이피${i}`, gwDeptNm: 'IPQC파트(M)', posNm: '사원', stateNm: '사용', joinedAt: '2026-09-30 14:38', suggestDeptId: null, suggestDeptNm: null })),
    ...Array.from({ length: 5 }, (_, i) => ({ empNo: `MF${i}`, name: `제조${i}`, gwDeptNm: '제조1파트(M)', posNm: '사원', stateNm: '사용', joinedAt: '2026-09-30 14:38', suggestDeptId: 4, suggestDeptNm: '제조팀' })),
  ];
  const summary = {
    gwDeptCnt: 2, mappedCnt: 1, unmappedCnt: 1, excludedCnt: 0, unmappedUserCnt: 25, unassignedUserCnt: users.length,
    unassignedDept: { deptId: 59, deptNm: '미배정' }, canWrite: true,
    health: { unassignedDeptFound: true, sourceExists: true, sourceRowCnt: 0, engineDeptName: '미배정' },
    lastSyncAt: '2026-09-30 14:38', lastJoinMessage: 'AX 가입 1(미배정 1)',
  };
  const depts = [
    { deptId: 1, deptNm: '통합관리자', superAdmin: true, systemRole: 'SUPER_ADMIN' },
    { deptId: 2, deptNm: '품질보증팀', superAdmin: false },
    { deptId: 4, deptNm: '제조팀', superAdmin: false },
    { deptId: 59, deptNm: '미배정', superAdmin: false, systemRole: 'UNASSIGNED' },
  ];
  const sent = [];
  const logs = [];
  const listCalls = [];
  await page.route('**/api/v1/download-logs**', async (route) => {
    if (route.request().method() === 'POST') logs.push(route.request().postDataJSON());
    return route.fulfill({ json: { success: true, data: { logId: logs.length }, message: '기록' } });
  });
  await page.route('**/api/v1/system/**', async (route) => {
    const req = route.request(); const url = new URL(req.url());
    const path = url.pathname.replace('/api/v1/system/', '');
    const ok = (data, meta, message = '완료') => route.fulfill({ json: { success: true, data, meta, message } });
    if (req.method() !== 'GET') {
      const body = req.postDataJSON();
      sent.push({ method: req.method(), path, body });
      if (path === 'gw-dept-maps/reassign') {
        const items = (body.empNos || []).map((empNo) => ({ empNo, deptNm: '제조팀' }));
        return ok({ movedCnt: items.length, skippedCnt: 0, items, byDept: [{ deptNm: '제조팀', cnt: items.length }], skipped: [] }, undefined, `미배정 계정 ${items.length}명을 옮겼습니다.`);
      }
      // 체크한 계정 일괄 부서 지정 — IP1 은 실패를 흉내 냅니다(2026-10-02)
      if (path === 'users/IP1/dept') return route.fulfill({ status: 409, json: { success: false, code: 'E-CONFLICT', message: '이미 다른 부서입니다' } });
      return ok({});
    }
    const kw = url.searchParams.get('keyword') || '';
    if (path === 'gw-dept-maps/summary') return ok(summary);
    if (path === 'depts') return ok({ items: depts }, { total: depts.length });
    if (path === 'gw-dept-maps') {
      listCalls.push({ path, kw });
      const rows = maps.filter((m) => `${m.gwDeptNm}${m.deptNm || ''}${m.remark}`.includes(kw));
      return ok({ items: rows }, { total: rows.length });
    }
    if (path === 'gw-dept-maps/unassigned-users') {
      listCalls.push({ path, kw });
      const rows = users.filter((u) => `${u.empNo}${u.name}${u.gwDeptNm}`.includes(kw));
      return ok({ items: rows }, { total: rows.length });
    }
    return route.fallback();
  });

  const exportBtn = page.getByRole('button', { name: /엑셀 다운로드/ });
  const titleOf = (loc) => loc.evaluate((el) => el.closest('[title]')?.getAttribute('title') || '');
  const readDownload = async (itemName) => {
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: itemName }).click()]);
    const text = fs.readFileSync(await dl.path(), 'utf8');
    const rows = [...text.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map((m) => [...m[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map((c) => c[1].replace(/<[^>]+>/g, '').trim()));
    return { head: rows[0], body: rows.slice(1) };
  };
  const scrollCheck = (root) => root.evaluate(async (el) => {
    const scroll = [...el.querySelectorAll('div')].find((d) => getComputedStyle(d).overflowX === 'auto' && d.scrollWidth > d.clientWidth && (d.querySelector('.tabulator') || d.classList.contains('tabulator-tableholder')));
    if (!scroll) return { scroll: false };
    scroll.scrollLeft = scroll.scrollWidth;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const col = [...el.querySelectorAll('.tabulator-headers .tabulator-col')].at(-1);
    const cell = el.querySelector('.tabulator-row .tabulator-cell:last-of-type');
    const box = scroll.getBoundingClientRect(); const h = col.getBoundingClientRect(); const c = cell.getBoundingClientRect();
    return { scroll: scroll.scrollLeft > 0, header: h.right <= box.right + 2, cell: c.right <= box.right + 2, aligned: Math.abs(h.x - c.x) < 2, title: col.innerText.trim() };
  });

  try {
    await page.goto(`${WEB}/system/gw-dept-map`);
    await page.locator('.tabulator-row').first().waitFor();
    const body = await page.locator('body').innerText();

    // GWD-03 · GWD-08 표기
    assert(body.includes('그룹웨어 인사정보가 아직 들어오지 않았습니다'), '원천 없음 경고');
    // 2026-10-02 — 요약 카드 부제 · 머리말 설명은 뺐고, 안내는 두 줄로 줄였습니다
    assert(!body.includes('옮길 수 있음'), '미배정 요약 부제 없음');
    assert(!body.includes('그룹웨어 인사정보를 받아 올 때'), '머리말 설명 없음');
    assert(body.includes('매핑은 엔진을 통해 자동 가입을 하는 순간에 사용됩니다.'), '안내 1줄');
    assert(body.includes('이미 미배정으로 분류된 계정은 계정 관리에서 부서 지정이 가능합니다.'), '안내 2줄');

    // GWD-02 지정 모달 부서 선택지에 통합관리자 없음
    await page.locator('.tabulator-row', { hasText: 'IPQC파트(M)' }).getByRole('button', { name: '지정', exact: true }).click();
    const axSelect = page.getByRole('combobox', { name: 'AX 부서', exact: true });
    await axSelect.waitFor();
    const opts = await axSelect.locator('option').allTextContents();
    assert(!opts.some((o) => o.includes('통합관리자')) && !opts.includes('미배정'), `지정 선택지: ${opts}`);
    await page.getByRole('button', { name: '취소', exact: true }).last().click();

    // GWD-15 매핑 탭 엑셀 — 전체
    await exportBtn.click();
    assert((await page.getByRole('menuitem', { name: /전체 다운로드/ }).innerText()).includes('3건'));
    const mapAll = await readDownload(/전체 다운로드/);
    assert.equal(mapAll.body.length, 3);
    assert(mapAll.head.includes('수정자'), `매핑 열: ${mapAll.head}`);
    await page.waitForTimeout(300);
    assert.equal(logs.at(-1).scopeCd, 'ALL');

    // 미배정 탭
    await page.getByText(/^미배정 계정 \d+$/).click();
    await page.locator('.tabulator-row', { hasText: 'IP0' }).waitFor();
    // 검색 · 상태 칸과 [매핑대로 재배정] 은 뺐습니다(2026-10-02) — 찾기는 열 머리글 필터, 옮기기는 [선택 n명 부서 지정]
    assert.equal(await page.getByRole('button', { name: /매핑대로 재배정/ }).count(), 0, '재배정 단추 없음');
    assert.equal(await page.getByPlaceholder('사번 · 이름 · 그룹웨어 부서').count(), 0, '검색칸 없음');
    // 「상태」 글자는 표 머리글 하나만 남습니다(위쪽 상태 선택 없음)
    assert.equal(await page.getByText('상태', { exact: true }).count(), 1, '위쪽 상태 선택 없음');

    // 부서 지정 모달 — 통합관리자 없음
    await page.locator('.tabulator-row', { hasText: 'MF0' }).getByRole('button', { name: '부서 지정', exact: true }).click();
    const moveOpts = await page.getByRole('combobox', { name: 'AX 부서', exact: true }).locator('option').allTextContents();
    assert(!moveOpts.includes('통합관리자'), `부서 지정 선택지: ${moveOpts}`);
    await page.getByRole('button', { name: '취소', exact: true }).last().click();

    // 열 검색으로 좁힘 → 조회 목록 = 보이는 행 (GWD-15)
    await page.locator('.tabulator-col[tabulator-field="empNo"] input').first().fill('MF1');
    await page.waitForTimeout(500);
    await exportBtn.click();
    assert((await page.getByRole('menuitem', { name: /조회 목록 다운로드/ }).innerText()).includes('1건'));
    const view = await readDownload(/조회 목록 다운로드/);
    assert.deepEqual(view.body.map((r) => r[0]), ['MF1'], '조회 목록 = 보이는 행');
    assert.equal(view.head[0], '사번');
    await page.waitForTimeout(300);
    assert.equal(logs.at(-1).scopeCd, 'VIEW');
    assert(logs.at(-1).condSummary.startsWith('탭=미배정 계정'), logs.at(-1).condSummary);
    await exportBtn.click();
    const uAll = await readDownload(/전체 다운로드/);
    assert.equal(uAll.body.length, users.length, '전체 = 조건 무시');
    assert.equal(listCalls.at(-1).kw, '');
    assert.equal(sent.filter((x) => x.path === 'gw-dept-maps/reassign').length, 0, '재배정 요청 없음');

    // 체크한 계정 일괄 부서 지정(2026-10-02) — 고른 부서 하나로, 한 명씩 PUT users/{empNo}/dept
    await page.locator('.tabulator-col[tabulator-field="empNo"] input').first().fill('IP');
    await page.waitForTimeout(500);
    const bulkBtn = page.getByRole('button', { name: /^선택 \d+명 부서 지정$/ });
    assert(await bulkBtn.isDisabled(), '체크 전에는 비활성');
    for (const empNo of ['IP0', 'IP1', 'IP2']) await page.locator('.tabulator-row', { hasText: empNo }).locator('input[type="checkbox"]').check();
    assert.equal((await bulkBtn.innerText()).trim(), '선택 3명 부서 지정');
    await bulkBtn.click();
    await page.getByText('선택 계정 부서 지정').waitFor();
    const bulkOpts = await page.getByRole('combobox', { name: 'AX 부서', exact: true }).locator('option').allTextContents();
    assert(!bulkOpts.includes('통합관리자'), `일괄 지정 선택지: ${bulkOpts}`);
    await page.getByText('아이피0(IP0), 아이피1(IP1), 아이피2(IP2)').waitFor();
    await page.getByRole('combobox', { name: 'AX 부서', exact: true }).selectOption('2');
    const sentBefore = sent.length;
    await page.getByRole('button', { name: '3명 옮기기', exact: true }).click();
    await page.getByText('부서 지정 결과').waitFor();
    const moves = sent.slice(sentBefore).filter((x) => /^users\/IP\d\/dept$/.test(x.path));
    assert.deepEqual(moves.map((x) => [x.method, x.path, x.body.deptId]), [['PUT', 'users/IP0/dept', 2], ['PUT', 'users/IP1/dept', 2], ['PUT', 'users/IP2/dept', 2]], JSON.stringify(moves));
    assert(await page.getByText('옮김 2명 · 옮기지 못함 1명').count(), '일괄 지정 결과 모달');
    assert(await page.getByText('아이피1(IP1) — 이미 다른 부서입니다').count(), '실패 사유');
    await page.getByRole('button', { name: '닫기', exact: true }).last().click();

    // 좁은 화면 — 두 표 마지막 열
    await page.setViewportSize({ width: 1000, height: 900 });
    await page.locator('.tabulator-col[tabulator-field="empNo"] input').first().fill('');
    await page.waitForTimeout(500);
    let r = await scrollCheck(page.locator('body'));
    assert(r.header && r.cell && r.aligned && r.title === '관리', `미배정 표 마지막 열: ${JSON.stringify(r)}`);
    await page.getByText(/^부서 매핑 \d+$/).click();
    await page.locator('.tabulator-row', { hasText: 'IPQC' }).waitFor();
    r = await scrollCheck(page.locator('body'));
    assert(r.header && r.cell && r.aligned && r.title === '관리', `매핑 표 마지막 열: ${JSON.stringify(r)}`);
    await page.setViewportSize({ width: 1440, height: 960 });

    // GWD-14 조회 전용
    summary.canWrite = false;
    await page.goto(`${WEB}/system/gw-dept-map`);
    await page.locator('.tabulator-row').first().waitFor();
    const edit = page.locator('.tabulator-row', { hasText: '제조1파트(M)' }).getByRole('button', { name: '지정', exact: true });
    assert(await edit.isDisabled(), '[지정] 비활성');
    assert.equal(await edit.getAttribute('title'), WRITE_DENIED);
    assert(await page.locator('.tabulator-row', { hasText: '제조1파트(M)' }).getByRole('button', { name: '삭제', exact: true }).isDisabled());
    assert.equal(await page.locator('.tabulator-row input[type="checkbox"], .tabulator-row .tabulator-row-handle').count(), 0, '선택 칸 없음');
    // 일괄 지정 단추는 화면에서 뺐습니다(2026-10-02)
    assert.equal(await page.getByRole('button', { name: /일괄 지정/ }).count(), 0, '일괄 지정 단추 없음');
    assert(await exportBtn.isEnabled(), '엑셀은 조회 권한으로 활성');
    await page.getByText(/^미배정 계정 \d+$/).click();
    await page.locator('.tabulator-row', { hasText: 'MF0' }).waitFor();
    assert(await page.locator('.tabulator-row', { hasText: 'MF0' }).getByRole('button', { name: '부서 지정', exact: true }).isDisabled());
    assert(await page.getByRole('button', { name: /^선택 \d+명 부서 지정$/ }).isDisabled(), '조회 전용이면 일괄 부서 지정 비활성');

    // GWD-03 미배정 부서 없음 경고
    summary.health = { ...summary.health, unassignedDeptFound: false, sourceRowCnt: 373 };
    await page.goto(`${WEB}/system/gw-dept-map`);
    await page.getByText("미배정 부서('미배정')를 찾지 못했습니다", { exact: false }).waitFor();

    assert.equal(errors.length, 0, errors.join('\n'));
    console.log('PASS: gw-dept-map — 선택 계정 일괄 부서 지정·재배정 단추 없음·통합관리자 선택지 제외·health 경고·미배정 표기·엑셀 VIEW/ALL·조회 전용·좁은 화면');
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
