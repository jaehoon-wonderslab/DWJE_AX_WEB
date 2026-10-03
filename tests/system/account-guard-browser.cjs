/*
 * 계정 관리 2026-10 개선 — 화면 규칙 회귀 (기획 01 ACC-02·03·04·05·14·15·16)
 *
 * API 응답은 page.route 로 흉내 냅니다(서버 세션이 같은 계약으로 따로 구현 중).
 * 로그인은 8080 의 기존 API 로 하고, 화면이 부르는 /system/** 와 다운로드 이력만 가로챕니다.
 * 실 API 를 부르는 개발 서버(npm run web, 목 모드 아님)에서 돌립니다 — 목 모드는 네트워크를 타지 않습니다.
 *
 *   WEB_URL=http://localhost:8081 node tests/system/account-guard-browser.cjs
 */
const assert = require('node:assert/strict');
const { open, WEB } = require('../lib/browser');
const { openAccountTab } = require('../lib/accountTabs');

const WRITE_DENIED = '미배정 계정은 이 동작을 할 수 없습니다. 전산팀에 부서 배정을 요청하세요.';

(async () => {
  const { browser, page } = await open();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // 앱 번들은 8080 을 부릅니다 — API_URL 이 다르면(예: 18081) 그쪽으로 돌립니다. 아래의 화면별 가로채기가 먼저 걸립니다
  const apiTarget = (process.env.API_URL || 'http://localhost:8080').replace(/\/$/, '');
  if (!apiTarget.endsWith('localhost:8080')) {
    await page.route('http://localhost:8080/**', (r) => r.continue({ url: r.request().url().replace('http://localhost:8080', apiTarget) }));
  }

  const users = [
    { empNo: '10000', name: '관리자', deptId: 1, dept: '통합관리자', pos: 'ADMIN', posNm: '관리자', state: 'ACTIVE', stateNm: '사용', loginFailCnt: 0, lastLoginAt: '2026-10-01 09:00', extraMenuIds: [] },
    { empNo: 'L1', name: '잠김계정', deptId: 2, dept: '품질보증팀', pos: 'STAFF', posNm: '사원', state: 'LOCKED', stateNm: '잠김', loginFailCnt: 5, lockedAt: '2026-10-01 08:10', emailMasked: 'l***@derkwoo.com', lastLoginAt: '2026-09-30 17:00', extraMenuIds: [] },
    { empNo: 'S1', name: '퇴사계정', deptId: 2, dept: '품질보증팀', pos: 'STAFF', posNm: '사원', state: 'SUSPENDED', stateNm: '정지', stateReason: 'RETIRED', loginFailCnt: 0, lastLoginAt: null, extraMenuIds: [] },
    { empNo: 'U1', name: '미배정계정', deptId: 59, dept: '미배정', pos: 'STAFF', posNm: '사원', state: 'ACTIVE', stateNm: '사용', pwdChangeRequired: true, loginFailCnt: 0, lastLoginAt: null, extraMenuIds: [] },
    { empNo: 'Q1', name: '품질계정', deptId: 2, dept: '품질보증팀', pos: 'STAFF', posNm: '사원', state: 'ACTIVE', stateNm: '사용', loginFailCnt: 1, lastLoginAt: '2026-10-01 08:00', extraMenuIds: ['qc-defect'], remark: '[2026-09-01] 기존 비고' },
  ];
  const depts = [
    { deptId: 1, deptNm: '통합관리자', desc: '전 권한', superAdmin: true, systemRole: 'SUPER_ADMIN', userCnt: 1 },
    { deptId: 2, deptNm: '품질보증팀', desc: '품질', superAdmin: false, systemRole: null, userCnt: 3, menuCnt: 10, dataCnt: 4 },
    { deptId: 70, deptNm: '빈부서', desc: '소속 없음', superAdmin: false, systemRole: null, userCnt: 0, menuCnt: 2, dataCnt: 0 },
    { deptId: 59, deptNm: '미배정', desc: '자동 가입', superAdmin: false, systemRole: 'UNASSIGNED', lockedPerms: true, fixedMenus: ['dash-ai', 'dash-proc', 'prod-monitor', 'ai-chat', 'chat-history'], fixedDataFields: [], userCnt: 1 },
  ];
  const summary = {
    userCnt: { total: 5, active: 3, locked: 1, suspended: 1, pending: 0 }, deptCnt: 3, pwdChangeRequiredCnt: 1,
    currentUser: { empNo: '10000', name: '관리자', superAdmin: false }, canChangePassword: false, canWrite: true, mailEnabled: false,
  };
  const screens = [
    { id: 'dash-ai', name: 'AI 통합 대시보드', group: '대시보드' },
    { id: 'qc-defect', name: '불량 현황 조회', group: '생산 및 품질 관리' },
    { id: 'sys-menu', name: '메뉴 접근 권한', group: '시스템관리' },
    // 2026-10-03 (2차) — 전사 자연어 질의 이력도 관리 화면(통합관리자만 부여·회수)
    { id: 'sys-chat-history', name: '전사 자연어 질의 이력', group: '시스템관리' },
  ];
  const sent = [];
  await page.route('**/api/v1/system/**', async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace('/api/v1/system/', '');
    const ok = (data, meta) => route.fulfill({ json: { success: true, data, meta, message: '처리했습니다.' } });
    if (req.method() !== 'GET') { sent.push({ method: req.method(), path, body: req.postDataJSON() }); return ok({}); }
    if (path === 'accounts/summary') return ok(summary);
    if (path === 'menu-perms') return ok({ screens, matrix: { 2: ['dash-ai'], 59: ['dash-ai'] } });
    if (path === 'users/pending') return ok({ items: [] }, { total: 0, page: 1, size: 10, totalPages: 1 });
    const rows = path === 'users' ? users : path === 'depts' ? depts : path === 'perm-logs' ? [] : null;
    if (!rows) return route.fallback();
    return ok({ items: rows }, { total: rows.length, page: 1, size: 0, totalPages: 1 });
  });

  const grid = (label) => page.locator(`[id="account-grid-${label}"]`);
  const rowOf = (label, text) => grid(label).locator('.tabulator-row', { hasText: text });
  const titleOf = (loc) => loc.evaluate((el) => el.closest('[title]')?.getAttribute('title') || '');
  const lastSent = () => sent[sent.length - 1];
  const modalButton = (name) => page.getByRole('button', { name, exact: true }).last();

  try {
    await page.goto(`${WEB}/system/account`);
    await grid('계정').locator('.tabulator-row').first().waitFor();

    // ACC-05 상태 배지 · ACC-03 초기 비밀번호 열
    // 배지는 행이 그려진 뒤 포털로 채워집니다 — 바로 세지 말고 나타날 때까지 기다립니다
    await rowOf('계정', 'L1').getByText('잠김', { exact: true }).first().waitFor({ timeout: 10000 });
    assert(await rowOf('계정', 'L1').getByRole('button', { name: '잠금 해제', exact: true }).count(), '잠김 행은 [잠금 해제]');
    assert(await rowOf('계정', 'S1').getByText('퇴사', { exact: true }).count(), '정지 사유 배지');
    assert(await rowOf('계정', 'U1').getByText('변경 전', { exact: true }).count(), '초기 비밀번호 변경 전 배지');
    assert((await page.locator('body').innerText()).includes('잠김 1'), '요약 부제의 잠김 수');

    // ACC-04 · ACC-14 부서 표 — 시스템 부서 삭제 비활성, 미배정 고정 권한 (부서 탭)
    await openAccountTab(page, '부서');
    const superRow = rowOf('부서', '통합관리자');
    const unassignedRow = rowOf('부서', '자동 가입');
    for (const r of [superRow, unassignedRow]) {
      const del = r.getByRole('button', { name: '삭제', exact: true });
      assert(await del.isDisabled(), '시스템 부서 삭제 비활성');
      assert((await titleOf(del)).includes('삭제할 수 없습니다'), '삭제 비활성 이유 툴팁');
    }
    // 소속 계정이 있는 부서는 [삭제] 를 끄고 이유를 보입니다(2026-10-02, 서버도 409) — 빈 부서만 삭제할 수 있습니다
    const busyDel = rowOf('부서', '품질보증팀').getByRole('button', { name: '삭제', exact: true });
    assert(await busyDel.isDisabled(), '소속 계정이 있는 부서 삭제 비활성');
    assert((await titleOf(busyDel)).includes('소속 계정 3명'), '삭제 비활성 이유(소속 계정 수)');
    assert(await rowOf('부서', '빈부서').getByRole('button', { name: '삭제', exact: true }).isEnabled(), '빈 부서 삭제는 활성');
    assert(await unassignedRow.getByText('고정 권한 · 변경 불가').count(), '미배정 고정 권한 배지');
    assert(await unassignedRow.getByText('5(고정)').count() && await unassignedRow.getByText('0(고정)').count(), '미배정 권한 수 5(고정)/0(고정)');
    assert(await superRow.getByText('전체', { exact: true }).count(), '통합관리자 권한 수 전체');
    // 미배정 부서 편집 — 부서명은 바꿀 수 없음
    await unassignedRow.getByRole('button', { name: '편집', exact: true }).click();
    assert(await page.getByText('미배정 부서는 이름을 바꿀 수 없습니다', { exact: false }).count(), '미배정 부서명 잠금 안내');
    assert.equal(await page.getByPlaceholder('예) 공정기술팀', { exact: true }).count(), 0, '미배정 부서명 입력칸 없음');
    // 약칭 칸은 없앴습니다(2026-10-02) — 미배정 부서는 설명만 고칩니다
    assert.equal(await page.getByPlaceholder('예) PE', { exact: true }).count(), 0, '약칭 입력칸 없음');
    await page.getByPlaceholder('예) 공정 조건 · 금형 관리', { exact: true }).fill('자동 가입 · 설명 수정');
    await modalButton('수정').click();
    await page.waitForTimeout(300);
    assert.equal(lastSent().path, 'depts/59');
    assert.equal(lastSent().body.deptNm, undefined, '미배정 부서명은 보내지 않음');
    assert.equal('abbr' in lastSent().body, false, '약칭은 보내지 않음');

    // ACC-02 본인 계정 편집 — 소속 부서·수동 메뉴 읽기 전용
    await openAccountTab(page, '계정');
    await rowOf('계정', '관리자').getByRole('button', { name: '편집', exact: true }).click();
    await page.getByRole('checkbox', { name: '불량 현황 조회 추가 허용', exact: true }).waitFor();
    assert.equal(await page.getByRole('combobox', { name: '소속 부서', exact: true }).count(), 0, '본인 편집은 부서 선택 없음');
    assert(await page.getByText('본인 계정의 부서와 추가 메뉴는 다른 관리자가 바꿔야 합니다.', { exact: false }).count(), '본인 편집 안내');
    assert(await page.getByRole('checkbox', { name: '불량 현황 조회 추가 허용', exact: true }).isDisabled(), '본인 편집 수동 메뉴 비활성');
    await page.getByRole('button', { name: '취소', exact: true }).last().click();

    // ACC-02·16·14 타 계정 편집 — 통합관리자 부서 미노출, 관리 화면 잠금, 미배정 이동 시 회수
    await rowOf('계정', 'Q1').getByRole('button', { name: '편집', exact: true }).click();
    const deptSelect = page.getByRole('combobox', { name: '소속 부서', exact: true });
    await deptSelect.waitFor();
    const optionTexts = await deptSelect.locator('option').allTextContents();
    assert(!optionTexts.includes('통합관리자'), `통합관리자 부서 선택지 없음: ${optionTexts}`);
    const adminBox = page.getByRole('checkbox', { name: '메뉴 접근 권한 추가 허용', exact: true });
    assert(await adminBox.isDisabled(), '관리 화면 줄 잠금');
    assert(await page.getByRole('checkbox', { name: '전사 자연어 질의 이력 추가 허용', exact: true }).isDisabled(), '전사 자연어 질의 이력 = 관리 화면 줄 잠금');
    assert(await page.getByText('통합관리자만 변경', { exact: false }).count(), '통합관리자만 변경 표시');
    assert(await page.getByRole('checkbox', { name: '불량 현황 조회 추가 허용', exact: true }).isChecked());
    await deptSelect.selectOption('59');
    await page.getByText('저장하면 수동 허용 1개가 회수됩니다.').waitFor();
    assert(await page.getByRole('checkbox', { name: '불량 현황 조회 추가 허용', exact: true }).isDisabled(), '미배정이면 수동 메뉴 전체 비활성');
    assert(await page.getByText('미배정 계정은 대시보드 3개·덕반장 AI·자연어 질의 이력만', { exact: false }).count(), '미배정 안내');
    await page.getByPlaceholder('예) 10월 말까지 겸직', { exact: false }).fill('미배정으로 이동');
    await modalButton('수정').click();
    await page.waitForTimeout(300);
    assert.equal(lastSent().method, 'PUT');
    assert.deepEqual(lastSent().body.extraMenuIds, [], '미배정 이동 시 추가 메뉴 회수');
    assert.equal(lastSent().body.deptId, 59);
    assert(String(lastSent().body.remark).startsWith('[2026-09-01] 기존 비고\n['), '비고는 기존 기록에 덧붙임');

    // ACC-14 미배정 계정 편집 — 수동 메뉴 비활성
    await rowOf('계정', 'U1').getByRole('button', { name: '편집', exact: true }).click();
    await page.getByText('미배정 계정은 대시보드 3개·덕반장 AI·자연어 질의 이력만', { exact: false }).waitFor();
    assert(await page.getByRole('checkbox', { name: '불량 현황 조회 추가 허용', exact: true }).isDisabled());
    await page.getByRole('button', { name: '취소', exact: true }).last().click();

    // ACC-05 잠금 해제 — 잠긴 시각·마스킹 이메일·SMTP 안내·비밀번호 초기화 선택
    await rowOf('계정', 'L1').getByRole('button', { name: '잠금 해제', exact: true }).click();
    await page.getByText('l***@derkwoo.com').waitFor();
    assert(await page.getByText('2026-10-01 08:10').count(), '잠긴 시각');
    assert(await page.getByText('이메일 잠금 해제는 메일 서버 설정 후 열립니다', { exact: false }).count(), 'SMTP 미설정 안내');
    await page.getByText('비밀번호도 초기화', { exact: false }).click();
    await modalButton('잠금 해제').click();
    await page.waitForTimeout(300);
    assert.deepEqual({ path: lastSent().path, body: lastSent().body }, { path: 'users/L1/state', body: { state: 'ACTIVE', resetPassword: true } });

    // ACC-05 정지 — 사유 입력
    await rowOf('계정', 'Q1').getByRole('button', { name: '정지', exact: true }).click();
    await page.getByPlaceholder('예) 휴직', { exact: false }).fill('휴직');
    await modalButton('정지').click();
    await page.waitForTimeout(300);
    assert.deepEqual(lastSent().body, { state: 'SUSPENDED', reason: '휴직' });

    // ACC-03 계정 등록 — 초기 비밀번호 안내(폼·토스트), 통합관리자 부서 미노출
    await page.getByRole('button', { name: '계정 등록', exact: true }).click();
    await page.waitForTimeout(500);
    assert(await page.getByText('초기 비밀번호는 사번!Dwje1234', { exact: false }).count() >= 1, `등록 폼 안내: ${(await page.locator('body').innerText()).slice(-600)}`);
    await page.getByPlaceholder('예) 20260101', { exact: true }).fill('NEW1');
    await page.getByPlaceholder('예) 20260101', { exact: true }).locator('xpath=following::input[1]').fill('신규계정');
    await modalButton('등록').click();
    await page.getByText('초기 비밀번호는 NEW1!Dwje1234', { exact: false }).waitFor();
    assert.equal(lastSent().method, 'POST');
    assert.notEqual(String(lastSent().body.deptId), '1', '기본 부서가 통합관리자가 아님');

    // ACC-15 조회 전용 — 쓰기 버튼 비활성 + 이유, 엑셀은 그대로
    summary.canWrite = false;
    await page.goto(`${WEB}/system/account`);
    await grid('계정').locator('.tabulator-row').first().waitFor();
    // 「계정 등록」 은 계정 탭, 「부서 등록」 은 부서 탭 머리에 있습니다
    for (const [tab, name] of [['부서', '부서 등록'], ['계정', '계정 등록']]) {
      await openAccountTab(page, tab);
      const b = page.getByRole('button', { name, exact: true }).first();
      assert(await b.isDisabled(), `${name} 비활성`);
      assert.equal(await titleOf(b), WRITE_DENIED, `${name} 툴팁`);
    }
    for (const name of ['편집', '정지', '삭제']) {
      assert(await rowOf('계정', 'Q1').getByRole('button', { name, exact: true }).isDisabled(), `계정 ${name} 비활성`);
    }
    assert(await rowOf('계정', 'L1').getByRole('button', { name: '잠금 해제', exact: true }).isDisabled(), '잠금 해제 비활성');
    assert(await page.getByText(`조회 전용입니다 — ${WRITE_DENIED}`).count(), '조회 전용 안내');
    assert(await page.getByRole('button', { name: /엑셀 다운로드/ }).isEnabled(), '엑셀은 조회 권한으로 활성(R-10)');

    // 좁은 화면 — 계정·부서 표 마지막 열까지 가로 스크롤
    await page.setViewportSize({ width: 1000, height: 900 });
    await page.waitForTimeout(600); // 표가 새 폭으로 다시 그려질 때까지
    for (const label of ['계정', '부서']) {
      await openAccountTab(page, label);
      const result = await grid(label).evaluate(async (root) => {
        const scroll = [...root.querySelectorAll('div')].find((el) => getComputedStyle(el).overflowX === 'auto' && el.scrollWidth > el.clientWidth && (el.querySelector('.tabulator') || el.classList.contains('tabulator-tableholder')));
        if (!scroll) return { scroll: false };
        scroll.scrollLeft = scroll.scrollWidth;
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const col = [...root.querySelectorAll('.tabulator-headers .tabulator-col')].at(-1);
        const cell = root.querySelector('.tabulator-row .tabulator-cell:last-of-type');
        const box = scroll.getBoundingClientRect(); const h = col.getBoundingClientRect(); const c = cell.getBoundingClientRect();
        return { scroll: scroll.scrollLeft > 0, header: h.right <= box.right + 2, cell: c.right <= box.right + 2, aligned: Math.abs(h.x - c.x) < 2, title: col.innerText.trim() };
      });
      assert(result.scroll && result.header && result.cell && result.aligned && result.title === '관리', `${label} 마지막 열 스크롤: ${JSON.stringify(result)}`);
    }

    assert.equal(errors.length, 0, errors.join('\n'));
    console.log('PASS: account guards — 상태 배지·잠금 해제·정지 사유·초기 비밀번호·시스템 부서·본인 편집·미배정·관리 화면 잠금·조회 전용·좁은 화면');
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
