/*
 * 이상 알림 발송 조건 관리(alert-cond) 화면 시험 — 기획 05 6.2 (2026-10-01)
 *
 * page.route 로 API 응답을 흉내 냅니다(실제 DB 를 바꾸지 않습니다). 로그인만 실제 API 로 합니다.
 * 목 모드 개발 서버는 API 를 네트워크로 부르지 않아 가로챌 수 없으므로, 로컬 대상 개발 서버(npm run web)에서 돌립니다.
 *   WEB_URL=http://localhost:8081 [API_URL=http://localhost:18081] node tests/system/alert-cond-browser.cjs
 *
 * 확인하는 것
 *  · ALC-01 활성/중지 본문 { on } — 중지는 확인 창, 활성은 바로
 *  · ALC-04 편집은 상세(GET /alert-conditions/{id})로 채움 — 이름만 바꾸면 PUT 본문은 name·updatedAt 뿐
 *  · ALC-05 대상 범위 PICK → 설비 검색·선택 → targetScope·pickTargets 본문, 엔진 미지원 범위 안내
 *  · ALC-03 테스트 결과 모달 — 발송 대기 N건 · 수신 예정 · 제외 사유 · 알림 목록에서 보기
 *  · ALC-16 전산팀(쓰기 O) 삭제 비활성 + R-13 툴팁 / 읽기 전용 쓰기 버튼 4종 비활성 + 툴팁 / 통합관리자 삭제 활성
 *  · ALC-02 감지 지표 403 → 오류 문구, 조건 등록 비활성
 *  · ALC-17 엑셀 패널 — Esc 닫힘, 조회 목록(VIEW, 현재 쪽) · 전체(ALL, size=0), 데이터 권한 걸린 임계값 blindCnt
 *  · 390px 에서 표를 오른쪽 끝까지 밀어 「관리」 머리글·버튼이 보이고 머리글·본문 정렬
 */
const assert = require('node:assert/strict');
const { open, WEB } = require('../lib/browser');

const R13 = '삭제는 통합관리자만 할 수 있습니다. 사용하지 않는 조건은 중지하세요.';
const WRITE_TIP = '미배정 계정은 이 동작을 할 수 없습니다. 전산팀에 부서 배정을 요청하세요.';

const CODES = [
  ['ALM_SEVERITY', 'CRIT', '위험'], ['ALM_SEVERITY', 'WARN', '주의'], ['ALM_SEVERITY', 'LOW', '낮음'],
  ['ALM_CHANNEL', 'MAIL', '메일'], ['ALM_CHANNEL', 'POPUP', '시스템 팝업'], ['ALM_CHANNEL', 'SMS', 'SMS'], ['ALM_CHANNEL', 'MSG', '메신저'],
  ['ALM_TARGET', 'ALL_EQPT', '전체 설비'], ['ALM_TARGET', 'PICK', '개별 설비 선택'], ['ALM_TARGET', 'PRESS', '프레스 전체'],
  ['ALM_OP', 'GT', '> (초과)'], ['ALM_OP', 'GE', '>= (이상)'], ['ALM_OP', 'LT', '< (미만)'],
  ['ALM_WINDOW', 'ALWAYS', '24시간 상시'], ['ALM_DEDUP', 'M30', '30분'], ['ALM_DURATION', 'IMMEDIATE', '즉시'],
].map(([groupCd, cd, nm], i) => ({ groupCd, cd, nm, sort: i, useYn: 'Y' }));

function cond(id, extra = {}) {
  return {
    condId: id, on: true, name: `시험 조건 ${id}`, metricId: 9, metric: '공정 불량률', op: 'GT', threshold: '10', thresholdVal: 10, thresholdUnit: 'PCT',
    duration: 'IMMEDIATE', targetScope: 'ALL_EQPT', target: '전체 설비', pickTargets: [], severity: 'CRIT', validWindow: 'ALWAYS', dedupMin: 'M30',
    blindFieldKey: null, channels: ['MAIL', 'POPUP'], groupIds: [15], groups: [{ groupId: 15, name: 'E2E 알림 검증', useFlg: 'Y', memberCnt: 1, receivingCnt: 1 }], groupNames: ['E2E 알림 검증'],
    evalState: { breach: 0, pending: 0, normal: 3, lastEvalAt: null }, metricStale: false, alert7dCnt: 0, receivingCnt: 1, deletable: true,
    updatedAt: '2026-09-23 21:57:05', ...extra,
  };
}

function me({ write = true, superAdmin = false } = {}) {
  return {
    user: { empNo: superAdmin ? '10000' : '10004', name: superAdmin ? '관리자' : '최전산', dept: superAdmin ? '통합관리자' : '전산팀', deptId: superAdmin ? 1 : 5, pos: 'SENIOR', superAdmin },
    // 2026-10-03 — 접근이 있는데 쓰기가 막히는 경우는 미배정뿐입니다(write=false → 미배정)
    dept: { deptId: 5, deptNm: '전산팀', superAdmin, unassigned: !write && !superAdmin },
    menuPerms: ['ai-chat', 'alert-cond', 'alert-list', 'sys-recip'],
    writePerms: superAdmin ? ['*'] : write ? ['alert-cond'] : [],
    dataPerms: ['qty', 'worker'],
    dataFields: [{ key: 'price', name: '단가', attrs: ['unitPrice'] }],
    pwdChangeRequired: false,
  };
}

async function setup(opts = {}) {
  const { page, browser } = await open('it');
  const state = {
    conds: [cond(5, { alert7dCnt: 2 }), cond(6, { on: false, name: '시험 조건 6 중지', evalState: { breach: 1, pending: 0, normal: 2, lastEvalAt: null }, receivingCnt: 0 }), cond(7, { name: '단가 조건', blindFieldKey: 'price', threshold: null, thresholdVal: null, metricStale: true })],
    patches: [], puts: [], posts: [], deletes: [], tests: [], logs: [], details: [], listSizes: [], listQueries: [], errors: [],
  };
  page.on('pageerror', (e) => state.errors.push(e.message));
  // 앱 번들은 8080 을 부릅니다. API_URL 이 다른 포트면(예: 18081) 흉내 내지 않은 호출을 그쪽으로 돌립니다
  const apiBase = process.env.API_URL || 'http://localhost:8080';
  if (!apiBase.includes('localhost:8080')) {
    await page.route('http://localhost:8080/**', (r) => r.continue({ url: r.request().url().replace('http://localhost:8080', apiBase) }));
  }
  const ok = (route, data, extra = {}) => route.fulfill({ json: { success: true, code: 'SUCCESS', message: extra.message || '정상 처리되었습니다.', data, ...extra } });
  await page.route('**/api/v1/auth/me', (route) => ok(route, me(opts)));
  await page.route('**/api/v1/common/codes**', (route) => ok(route, { codes: CODES }));
  await page.route('**/api/v1/download-logs', (route) => { state.logs.push(route.request().postDataJSON()); return ok(route, {}); });
  await page.route('**/api/v1/metrics/standards**', (route) => (opts.metricFail
    ? route.fulfill({ status: 403, json: { success: false, code: 'E-AUTH-002', message: '메뉴 접근 권한이 없습니다.' } })
    : ok(route, { items: [{ stdId: 9, category: 'DEFECT', name: '공정 불량률', unit: 'PCT', unitNm: '%', normal: 2, warn: 5, critical: 10, collecting: true }, { stdId: 3, category: 'UPTIME', name: '설비 가동률', unit: 'PCT', unitNm: '%', collecting: false }] }, { meta: { page: 1, size: 200, total: 2 } })));
  // 2단계 계약 — alert-cond 권한만이면 members 키가 없고 memberCnt·receivingCnt 만 옵니다
  await page.route('**/api/v1/alert-recipient-groups**', (route) => ok(route, { items: [{ groupId: 15, name: 'E2E 알림 검증', channels: ['MAIL', 'POPUP'], useFlg: 'Y', memberCnt: 1, receivingCnt: 1 }, { groupId: 11, name: '엔진 가동', channels: ['MAIL'], useFlg: 'Y', memberCnt: 2, receivingCnt: 0 }] }));
  await page.route('**/api/v1/alert-escalation-rules**', (route) => ok(route, { stages: [1, 2, 3].map((stage) => ({ stage, stageNm: `${stage}차`, targetGroupId: null, on: true })) }));
  await page.route('**/api/v1/common/masters/equipments**', (route) => ok(route, { equipments: [{ eqptCd: 'PR-01', eqptNm: '1호기 프레스' }, { eqptCd: 'PR-02', eqptNm: '2호기 프레스' }] }));
  await page.route('**/api/v1/alert-conditions**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname.replace('/api/v1/alert-conditions', '');
    const m = req.method();
    if (m === 'GET' && path === '/summary') {
      return ok(route, {
        totalCnt: state.conds.length, activeCnt: state.conds.filter((c) => c.on).length, todaySentCnt: 3, todaySuppressedCnt: 7, todaySkippedCnt: 0, todayFailCnt: 1, dedupCnt: 1,
        evalIssueCnt: { breach: 1, stale: 1 },
        engine: { lastRunAt: '2026-10-01 10:24:00', lastState: 'OK', lagSec: opts.engineStopped ? 4000 : 40, pendingQueueCnt: 0, deadQueueCnt: 0, judge: opts.engineStopped ? 'STOPPED' : 'OK' },
      });
    }
    if (m === 'GET' && path === '') {
      const size = Number(url.searchParams.get('size') ?? 50);
      state.listSizes.push(size);
      state.listQueries.push(Object.fromEntries(url.searchParams));
      const rows = size === 0 ? [...state.conds, cond(99, { name: '다른 쪽 조건' })] : state.conds;
      return ok(route, { items: rows }, { meta: { page: 1, size, total: rows.length, totalPages: 1 } });
    }
    if (m === 'POST' && path === '') { state.posts.push(req.postDataJSON()); return ok(route, { condId: 50 }, { message: '발송 조건을 등록했습니다.' }); }
    const id = Number(path.split('/')[1]);
    const c = state.conds.find((x) => x.condId === id);
    if (m === 'GET') {
      state.details.push(id);
      return ok(route, { ...c, metricStdId: c.metricId, msgTemplate: '맞춤 틀 {{condNm}}', scopeDim: 'EQPT', groups: [{ groupId: 15, name: 'E2E 알림 검증', useFlg: 'Y', memberCnt: 1, receivingCnt: 1 }] });
    }
    if (m === 'PATCH') {
      const body = req.postDataJSON(); state.patches.push({ id, body });
      c.on = body.on;
      return ok(route, { on: body.on, changed: true }, { message: `조건을 ${body.on ? '활성화' : '중지'}했습니다.` });
    }
    if (m === 'PUT') { state.puts.push({ id, body: req.postDataJSON() }); return ok(route, { success: true, condId: id, updatedAt: '2026-10-01 10:30:00' }, { message: '발송 조건을 수정했습니다.' }); }
    if (m === 'POST' && path.endsWith('/test-send')) {
      state.tests.push(id);
      return ok(route, {
        alertId: 9123, queuedCnt: 2, sentCnt: 2, channels: ['MAIL'],
        recipients: [{ empNo: '10003', name: '이제조', dept: '제조팀', channel: 'MAIL', groupId: 11 }, { empNo: '10004', name: '최전산', dept: '전산팀', channel: 'MAIL', groupId: 11 }],
        skipped: [{ empNo: '10005', name: '정경영', reason: 'ABSENT', reasonNm: '부재' }],
      }, { message: '테스트 알림 2건을 발송 대기열에 넣었습니다.' });
    }
    if (m === 'DELETE') { state.deletes.push(id); state.conds = state.conds.filter((x) => x.condId !== id); return ok(route, {}, { message: '삭제했습니다.' }); }
    return route.continue();
  });
  await page.goto(`${WEB}/system/alert-condition`);
  await page.getByText('시험 조건 5', { exact: true }).first().waitFor({ timeout: 90000 });
  await page.waitForTimeout(500);
  return { page, browser, state };
}

/** 표의 n 번째 행 안에서 이름이 label 인 버튼 */
const rowButton = (page, rowIdx, label) => page.locator('.tabulator-row').nth(rowIdx).getByRole('button', { name: label, exact: true });

(async () => {
  // ── 1. 전산팀 — 쓰기 O, 삭제 X ─────────────────────
  const { page, browser, state } = await setup({ write: true });
  try {
    // 삭제 버튼 — 모든 행 비활성 + R-13 툴팁
    const denied = page.locator(`[data-denied="1"][title="${R13}"]`);
    assert.equal(await denied.count(), state.conds.length, 'every delete is denied for non super admin');
    assert(await rowButton(page, 0, '삭제').isDisabled(), 'delete disabled');
    assert(!(await rowButton(page, 0, '편집').isDisabled()), 'edit enabled for writer');
    assert(!(await page.getByRole('button', { name: '조건 등록', exact: true }).isDisabled()), 'create enabled');

    // ALC-01 — 중지 조건 활성은 바로, 활성 조건 중지는 확인 창
    await rowButton(page, 1, '활성').click();
    await page.waitForTimeout(500);
    assert.deepEqual(state.patches.at(-1), { id: 6, body: { on: true } }, 'activate sends on:true');
    await rowButton(page, 0, '중지').click();
    await page.getByText('판정 대상에서 빠집니다', { exact: false }).waitFor();
    await page.getByRole('button', { name: '중지', exact: true }).last().click();
    await page.waitForTimeout(500);
    assert.deepEqual(state.patches.at(-1), { id: 5, body: { on: false } }, 'stop sends on:false after confirm');

    // ALC-04 — 상세로 채우고, 이름만 바꾸면 name·updatedAt 만
    await rowButton(page, 0, '편집').click();
    const nameInput = page.getByPlaceholder('예) 불량률 임계 초과', { exact: true });
    await nameInput.waitFor();
    assert.equal(state.details.at(-1), 5, 'detail fetched before edit');
    assert.equal(await nameInput.inputValue(), '시험 조건 5');
    await nameInput.fill('시험 조건 5 개명');
    await page.getByRole('button', { name: '수정', exact: true }).click();
    await page.waitForTimeout(600);
    assert.deepEqual(state.puts.at(-1), { id: 5, body: { name: '시험 조건 5 개명', updatedAt: '2026-09-23 21:57:05' } }, 'only changed keys are sent');

    // ALC-05 — 대상 범위 PICK + 설비 선택
    await rowButton(page, 0, '편집').click();
    await page.getByPlaceholder('예) 불량률 임계 초과', { exact: true }).waitFor();
    assert(await page.getByText('프레스 전체 은(는) 엔진 미지원', { exact: false }).count(), 'unsupported target scopes are explained');
    await page.getByRole('combobox', { name: '대상 범위', exact: true }).selectOption('PICK');
    await page.getByLabel('설비 검색', { exact: true }).fill('PR');
    await page.getByRole('button', { name: '설비 검색', exact: true }).click();
    await page.getByLabel('PR-01 추가', { exact: true }).click();
    await page.getByRole('button', { name: '수정', exact: true }).click();
    await page.waitForTimeout(600);
    const pick = state.puts.at(-1).body;
    assert.equal(pick.targetScope, 'PICK');
    assert.deepEqual(pick.pickTargets, ['PR-01']);
    assert.equal('channels' in pick, false, 'untouched channels are not resent');
    assert.equal('msgTemplate' in pick, false, 'advanced values untouched are not resent');

    // ALC-07·08 — 요약 카드·판정 열
    for (const t of ['억제 7 · 제외 0 · 실패 1', '발생 1 · 수집 중단 1', '정상', '수신 그룹 2개 관리 →']) {
      assert(await page.getByText(t, { exact: true }).count(), `summary shows ${t}`);
    }
    assert(await page.getByText('수집 중단', { exact: true }).count(), 'stale badge');
    assert(await page.getByText('발생 1 · 정상 2', { exact: true }).count(), 'breach badge');
    assert(await page.getByText('0명', { exact: true }).count(), 'zero receivers');

    // ALC-11 — 검색은 Enter 에만, 채널 필터는 서버로
    const before = state.listQueries.length;
    await page.getByLabel('조건 검색', { exact: true }).fill('가동률');
    await page.waitForTimeout(700);
    assert.equal(state.listQueries.length, before, 'typing does not reload');
    await page.getByLabel('조건 검색', { exact: true }).press('Enter');
    await page.waitForTimeout(700);
    assert.equal(state.listQueries.at(-1).keyword, '가동률', 'keyword sent on Enter');
    await page.getByRole('combobox', { name: '발송 채널', exact: true }).selectOption('POPUP');
    await page.waitForTimeout(700);
    assert.equal(state.listQueries.at(-1).channel, 'POPUP');
    await page.getByRole('combobox', { name: '발송 채널', exact: true }).selectOption('전체');
    await page.getByLabel('조건 검색', { exact: true }).fill('');
    await page.getByRole('button', { name: '조회', exact: true }).click();
    await page.waitForTimeout(700);

    // ALC-06·10·09 — 등록: 위험값 넣기, 0명 그룹 → 경고·확인, 승격 경고
    await page.getByRole('button', { name: '조건 등록', exact: true }).click();
    await page.getByPlaceholder('예) 불량률 임계 초과', { exact: true }).fill('P1 등록 시험');
    await page.getByRole('combobox', { name: '감지 지표', exact: true }).selectOption('9');
    assert(await page.getByText('지표 기준  정상 2 · 주의 5 · 위험 10 (%)', { exact: true }).count(), 'metric standard shown');
    await page.getByRole('button', { name: '위험값 넣기', exact: true }).click();
    assert.equal(await page.getByLabel('임계값', { exact: true }).inputValue(), '10');
    await page.getByText('엔진 가동', { exact: true }).last().click();
    assert(await page.getByText('이 조건으로는 아무도 받지 못합니다', { exact: true }).count(), 'reach preview warns 0');
    await page.getByRole('button', { name: /고급 설정/ }).click();
    await page.getByText('1차', { exact: true }).last().click();
    assert(await page.getByText('대상 그룹 미지정', { exact: false }).count(), 'escalation target warning');
    await page.getByRole('button', { name: '등록', exact: true }).last().click();
    await page.getByText('그래도 저장할까요?', { exact: false }).waitFor();
    await page.getByRole('button', { name: '저장', exact: true }).click();
    await page.waitForTimeout(700);
    const created = state.posts.at(-1);
    assert.equal(created.thresholdVal, 10); assert.deepEqual(created.groupIds, [11]); assert.equal(created.metricStdId, 9);
    assert.deepEqual(created.escalation, [{ stage: 1, on: true }, { stage: 2, on: false }, { stage: 3, on: false }]);
    assert.equal('msgTemplate' in created, false, 'empty template uses server default');

    // ALC-03 — 테스트 결과 모달
    await rowButton(page, 0, '테스트').click();
    await page.getByText('발송 대기 2건', { exact: false }).waitFor();
    assert(await page.getByText('정경영', { exact: true }).count(), 'skipped person shown');
    assert(await page.getByText('부재', { exact: true }).count(), 'skip reason shown');
    assert(await page.getByRole('button', { name: '알림 목록에서 보기', exact: true }).count(), 'link to alert list');
    await page.getByRole('button', { name: '닫기', exact: true }).last().click();

    // ALC-17 — 엑셀 패널
    const excel = page.getByRole('button', { name: '엑셀 다운로드 ▾', exact: true });
    await excel.click();
    await page.getByRole('menuitem', { name: /조회 목록 다운로드/ }).waitFor();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    assert.equal(await page.getByRole('menuitem', { name: /조회 목록 다운로드/ }).count(), 0, 'Esc closes the panel');
    await excel.click();
    await page.getByRole('menuitem', { name: /조회 목록 다운로드/ }).click();
    await page.waitForTimeout(700);
    await excel.click();
    await page.getByRole('menuitem', { name: /전체 다운로드/ }).click();
    await page.waitForTimeout(900);
    const [view, all] = state.logs.slice(-2);
    assert.equal(view.scopeCd, 'VIEW'); assert.equal(view.rowCnt, 3, 'view = rows on this page'); assert.equal(view.menuId ?? view.reportId, 'alert-cond');
    assert.equal(view.blindCnt, 1, 'threshold guarded by price is blinded');
    assert(String(view.condSummary).includes('쪽=1'));
    assert.equal(all.scopeCd, 'ALL'); assert.equal(all.rowCnt, 4, 'all = size=0 result'); assert(state.listSizes.includes(0), 'size=0 requested');

    // 390px — 관리 열까지 가로 스크롤
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(900);
    const scroll = await page.evaluate(async () => {
      const holder = [...document.querySelectorAll('div')].find((el) => getComputedStyle(el).overflowX === 'auto' && el.scrollWidth > el.clientWidth && el.querySelector('.tabulator'))
        || document.querySelector('.tabulator-tableholder');
      holder.scrollLeft = holder.scrollWidth;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const hb = holder.getBoundingClientRect();
      const header = document.querySelector('.tabulator-col[tabulator-field="action"]').getBoundingClientRect();
      const cell = document.querySelector('.tabulator-row .tabulator-cell[tabulator-field="action"]').getBoundingClientRect();
      return { scrolled: holder.scrollLeft > 0, atEnd: holder.scrollLeft + holder.clientWidth >= holder.scrollWidth - 2, inView: header.right <= hb.right + 2 && header.left < hb.right - 40, aligned: Math.abs(header.x - cell.x) < 2, noPageScroll: document.documentElement.scrollWidth <= window.innerWidth + 1, hb: [hb.left, hb.right], header: [header.left, header.right] };
    });
    assert(scroll.scrolled && scroll.atEnd && scroll.inView && scroll.aligned, `관리 column reachable at 390px ${JSON.stringify(scroll)}`);
    await page.setViewportSize({ width: 1440, height: 960 });

    // 「최근 7일」 → 알림 목록이 condId 로 거릅니다 (4단계)
    await page.getByRole('button', { name: '2건', exact: true }).click();
    await page.waitForURL(/\/alert\/list\?condId=5/, { timeout: 30000 });
    assert.deepEqual(state.errors, []);
  } finally { await browser.close(); }

  // ── 2. 읽기 전용 + 지표 선택지 403 ─────────────────
  const ro = await setup({ write: false, metricFail: true, engineStopped: true });
  try {
    for (const label of ['편집', '중지', '테스트']) {
      assert(await rowButton(ro.page, 0, label).isDisabled(), `${label} disabled in read-only`);
    }
    assert(await ro.page.getByRole('button', { name: '조건 등록', exact: true }).isDisabled(), 'create disabled');
    assert(await ro.page.locator(`[data-testid="alert-cond-create"][title="${WRITE_TIP}"]`).count(), 'create tooltip says write permission');
    assert(await ro.page.locator(`[data-denied="1"][title="${WRITE_TIP}"]`).count() >= 9, 'row write buttons carry tooltip');
    assert(await ro.page.getByText('감지 지표 목록을 불러오지 못했습니다', { exact: false }).count(), 'metric load error shown');
    assert(await ro.page.getByText('읽기 전용', { exact: false }).count());
    assert(await ro.page.getByText('알림 엔진 마지막 실행이 67분 전입니다', { exact: false }).count(), 'engine stopped banner');
    assert(await ro.page.getByText('중지 의심', { exact: true }).count());
    await ro.page.getByRole('button', { name: '엑셀 다운로드 ▾', exact: true }).click();
    await ro.page.getByRole('menuitem', { name: /전체 다운로드/ }).click();
    await ro.page.waitForTimeout(800);
    assert.equal(ro.state.logs.at(-1)?.scopeCd, 'ALL', 'read-only can download');
    assert.equal(ro.state.patches.length + ro.state.puts.length + ro.state.tests.length + ro.state.deletes.length, 0);
    assert.deepEqual(ro.state.errors, []);
  } finally { await ro.browser.close(); }

  // ── 3. 통합관리자 — 삭제 활성 ─────────────────────
  const sa = await setup({ superAdmin: true });
  try {
    assert.equal(await sa.page.locator(`[data-denied="1"][title="${R13}"]`).count(), 0, 'no R-13 lock for super admin');
    const del = rowButton(sa.page, 0, '삭제');
    assert(!(await del.isDisabled()), 'delete enabled for super admin');
    await del.click();
    await sa.page.getByText('복구할 수 없습니다', { exact: false }).waitFor();
    await sa.page.getByRole('button', { name: '삭제', exact: true }).last().click();
    await sa.page.waitForTimeout(600);
    assert.deepEqual(sa.state.deletes, [5]);
    assert.deepEqual(sa.state.errors, []);
  } finally { await sa.browser.close(); }

  console.log('PASS: alert-cond — P1 cards·engine banner·eval columns·filters(Enter·channel)·reach 0 confirm·metric std fill·escalation warn, toggle body {on}, confirm on stop, detail-based edit sends changed keys only, PICK targets, test result modal, R-13 delete lock/tooltip, read-only write lock/tooltip, metric 403 error, excel VIEW/ALL(size=0) blindCnt, 390px 관리 column');
})().catch((error) => { console.error(error); process.exitCode = 1; });
