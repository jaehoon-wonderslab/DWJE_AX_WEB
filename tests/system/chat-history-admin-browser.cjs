/**
 * 브라우저 시험 — 전사 자연어 질의 이력(sys-chat-history, /system/chat-history) · 2026-10-03 신규 · 2026-10-03 (2차) 관리자 전용
 *
 * 세션과 API 응답을 모두 page.route 로 고정합니다(실 API·DB 를 쓰지 않습니다 — tests/lib/stubSession).
 *   WEB_URL=http://localhost:8081 node tests/system/chat-history-admin-browser.cjs
 *
 *  (1) 열 순서 — 사용자 · 질문 · 답변 · 판단 근거 · 미응답 사유 · 사용자 평가 · 검토 · 질문 시간 · 답변 시간 · 응답 시간 ·
 *      모델 · 토큰 · 답변 상태 · 의도 · 답변 추가(학습 데이터). LLM 메타 값 · V71 전 행 '—'
 *  (2) 모든 조회 scope=all, 기간 기본 오늘-7 ~ 오늘
 *  (3) 조건 — 사용자 그룹 · 사용자(사번) · 검색 · 평가 · 검토 · 응답이 있고 요청 파라미터로 나감(userGroup · empNo · keyword · rating · review · answered)
 *  (4) 열 머리글 필터 — 질문 검색으로 행이 줄어듦
 *  (5) 답변 추가 칸 — 저장된 답변이 있으면 앞부분 + [수정], 없으면 [추가] → 모달 → PUT {answer}, 비우고 저장 = 지움
 *  (6) 학습데이터 내보내기 → POST export-trainset · 엑셀 전체 → 주소 ?scope=all · menuId sys-chat-history · 조회 목록 열 = 표 열
 *  (7) 행 클릭 → 상세(scope=all) — 근거 문서(제목 묶음) · 모델 · 토큰 · 답변 상태 · 요청 ID · 디버그 · 검토 저장
 *  (8) 세션 보기 — 세션 목록 → 오른쪽 대화 패널 · 「질의 상세 ›」 · 질의 표의 「세션 보기 ›」 → 강조
 *  (9) canManage=false(서버 판정) — 답변 추가 · 학습데이터 단추 비활성, 요청 없음
 *  (10) 관리자 전용 — sys-chat-history 접근이 없는 계정(전산팀)은 차단 안내, scope=all 요청 없음
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { WEB } = require('../lib/browser');
const { openStubbed, adminMe } = require('../lib/stubSession');

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const TODAY = ymd(new Date());
const FROM = ymd(new Date(Date.now() - 7 * 86400000));

/** 서버 canManage=false 방어 확인용 — 접근은 있으나 미배정(실서버에서는 관리자 전용이라 생기지 않는 조합) */
function me({ unassigned = false, chatAdmin = true } = {}) {
  const perms = ['ai-chat', 'chat-history', ...(chatAdmin ? ['sys-chat-history'] : [])];
  return {
    user: { empNo: '10004', name: '최전산', dept: unassigned ? '미배정' : '전산팀', deptId: unassigned ? 59 : 2, pos: 'SENIOR', superAdmin: false },
    dept: { deptId: unassigned ? 59 : 2, deptNm: unassigned ? '미배정' : '전산팀', superAdmin: false, unassigned },
    unassigned,
    menuPerms: perms,
    writePerms: unassigned ? [] : perms,
    dataPerms: ['qty'],
    dataFields: [],
    pwdChangeRequired: false,
  };
}

const LLM = { llmModel: 'dwje-ax', finishReason: 'stop', promptTokens: 1500, completionTokens: 320, totalTokens: 1820, llmMs: 7000, llmRequestId: 'chatcmpl-abc123', intentNm: '수율 집계 조회', docs: [{ title: '공정 기준서', page: 3, score: 0.81 }, { title: '공정 기준서', page: 4, score: 0.7 }], docCnt: 4 };
const MSGS = () => [
  { messageId: 63, sessionKey: 'S-1', ts: '2026-10-02 08:39:03', answeredAt: '2026-10-02 08:39:12', dept: '생산관리팀', name: '박생산', empNo: '10002', question: '이번 주 수율 추이 알려줘', answer: '수율은 97.1% 입니다.', judgmentBasis: '수율 집계', answerHidden: false, unansweredReason: null, responseSec: 9.8, rating: 'USEFUL', review: null, trainAnswer: null, ...LLM },
  { messageId: 62, sessionKey: 'S-1', ts: '2026-10-02 08:35:00', answeredAt: '2026-10-02 08:35:07', dept: '생산관리팀', name: '박생산', empNo: '10002', question: '지난주와 비교', answer: '지난주보다 1.2%p 낮습니다.', judgmentBasis: '집계 표', answerHidden: false, responseSec: 7.1, rating: 'BAD', review: 'BAD', ...LLM, finishReason: 'length', llmRequestId: 'chatcmpl-def456', trainAnswer: '지난주 대비 수율은 1.2%p 낮은 96.0% 입니다. 원인은 PRESS 라인 금형 교체입니다.', trainAnswerAt: '2026-10-02 09:00:00', trainAnswerByNm: '최전산' },
  { messageId: 12, sessionKey: 'chat-12', ts: '2026-10-01 10:02:00', answeredAt: null, dept: '전산팀', name: '최전산', empNo: '10004', question: '설비 가동률', answer: null, judgmentBasis: null, answerHidden: false, unansweredReason: '가동 집계 원천 없음', responseSec: null, rating: null, review: null, trainAnswer: null },
];

const SESSIONS = [
  { sessionKey: 'S-1', sessionId: 'S-1', startedAt: '2026-10-02 08:35:00', lastAskedAt: '2026-10-02 08:39:03', empNo: '10002', name: '박생산', dept: '생산관리팀', questionCnt: 2, firstQuestion: '지난주와 비교', answeredCnt: 2, usefulCnt: 1, badCnt: 1, reviewedCnt: 1, hiddenCnt: 0 },
  { sessionKey: 'chat-12', sessionId: null, startedAt: '2026-10-01 10:02:00', lastAskedAt: '2026-10-01 10:02:00', empNo: '10004', name: '최전산', dept: '전산팀', questionCnt: 1, firstQuestion: '설비 가동률', answeredCnt: 0, usefulCnt: 0, badCnt: 0, reviewedCnt: 0, hiddenCnt: 0 },
];
const COLS = ['사용자', '질문', '답변', '판단 근거', '미응답 사유', '사용자 평가', '검토', '질문 시간', '답변 시간', '응답 시간', '모델', '토큰', '답변 상태', '의도', '답변 추가(학습 데이터)'];

async function setup(page, { canManage = true } = {}) {
  const st = { scopes: [], ranges: [], params: [], puts: [], trainset: [], exports: [], reviews: [], details: [], groups: 0, rows: MSGS() };
  await page.route('**/api/v1/download-logs', (r) => r.fulfill({ json: { success: true, code: 'SUCCESS', data: { dlId: 1 } } }));
  await page.route('**/api/v1/ai/chat/history**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const p = url.pathname.replace(/^\/api\/v1\/ai\/chat\/history\/?/, '');
    if (req.method() === 'GET') {
      st.scopes.push(`${p || 'list'}:${url.searchParams.get('scope')}`);
      if (p === '' || p === 'summary') st.ranges.push([url.searchParams.get('from'), url.searchParams.get('to')]);
      if (p === '' || p === 'sessions') st.params.push({ p: p || 'list', ...Object.fromEntries(url.searchParams) });
    }
    const ok = (data, meta) => route.fulfill({ json: { success: true, code: 'SUCCESS', message: '완료', data, meta } });
    const file = (name) => route.fulfill({ status: 200, headers: { 'content-type': 'application/octet-stream', 'content-disposition': `attachment; filename="${name}"` }, body: 'test' });
    if (p === 'summary') return ok({ questionCnt: 3, sessionCnt: 2, answerRate: 66.7, avgResponseSec: 8.4, usefulCnt: 1, badCnt: 1, retentionDays: 1095, canManage });
    if (p === 'groups') { st.groups += 1; return ok({ items: [{ dept: '생산관리팀', cnt: 2 }, { dept: '전산팀', cnt: 1 }] }); }
    if (p === 'sessions') return ok({ items: SESSIONS }, { page: 1, size: 100, total: SESSIONS.length, totalPages: 1 });
    if (p.startsWith('sessions/')) {
      const key = decodeURIComponent(p.slice(9));
      const sess = SESSIONS.find((x) => x.sessionKey === key);
      const turns = st.rows.filter((m) => m.sessionKey === key).sort((a, b) => a.ts.localeCompare(b.ts)).map((m) => ({ ...m, askedAt: m.ts }));
      return ok({ ...sess, turns });
    }
    if (p === 'export') { st.exports.push({ ...req.postDataJSON(), queryScope: url.searchParams.get('scope') }); return file('chat_history_all.xlsx'); }
    if (p === 'export-trainset') { st.trainset.push(req.postDataJSON()); return file('trainset.jsonl'); }
    let m = /^(\d+)\/train-answer$/.exec(p);
    if (m && req.method() === 'PUT') {
      const body = req.postDataJSON();
      st.puts.push({ id: Number(m[1]), body });
      const row = st.rows.find((r) => r.messageId === Number(m[1]));
      row.trainAnswer = String(body.answer || '').trim() ? body.answer : null;
      return ok({ messageId: row.messageId, trainAnswer: row.trainAnswer, trainAnswerAt: row.trainAnswer ? '2026-10-03 10:00:00' : null, trainAnswerBy: '10004', trainAnswerByNm: '최전산' });
    }
    m = /^(\d+)\/review$/.exec(p);
    if (m) { st.reviews.push(req.postDataJSON()); return ok({ messageId: Number(m[1]), review: req.postDataJSON().reviewCd }); }
    if (/^\d+$/.test(p)) {
      st.details.push(url.searchParams.get('scope'));
      const row = st.rows.find((x) => String(x.messageId) === p);
      return ok({ ...row, askedAt: row.ts, userName: row.name, hits: [{ docId: 'D1', title: '공정 기준서', page: 3, score: 0.81 }, { docId: 'D1', title: '공정 기준서', page: 4, score: 0.7 }, { docId: 'D2', title: '수율 집계 지침', page: 1, score: 0.6 }], docCnt: 3, ...(canManage ? { debug: { route: 'metric', rows: 12 } } : {}) });
    }
    if (p === '') return ok({ items: st.rows, maskedRowCnt: 0 }, { page: 1, size: 100, total: st.rows.length, totalPages: 1 });
    return route.fulfill({ status: 404, json: { success: false, code: 'E-NOTFOUND', message: `unexpected ${p}` } });
  });
  return st;
}

const row = (page, i) => page.locator('.tabulator-row').nth(i);

(async () => {
  // ── 1. 관리 가능(통합관리자) ──
  let { browser, page } = await openStubbed({ me: adminMe() });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    const st = await setup(page);
    await page.goto(`${WEB}/system/chat-history`);
    await page.getByText('전사 자연어 질의 이력', { exact: true }).first().waitFor({ timeout: 30000 });
    await page.locator('.tabulator-row').first().waitFor();
    await page.waitForTimeout(500);

    // (1) 열 순서 · LLM 메타
    const titles = await page.locator('.tabulator-col .tabulator-col-title').allTextContents();
    assert.deepEqual(titles.map((t) => t.trim()), COLS, `columns ${titles}`);
    assert(await page.locator('.tabulator-cell[tabulator-field="userLabel"]', { hasText: '박생산 (생산관리팀)' }).count(), '사용자 = 이름(부서)');
    assert(await page.locator('.tabulator-cell[tabulator-field="answeredAt"]', { hasText: '2026-10-02 08:39:12' }).count(), '답변 시간');
    const cellText = async (i, f) => (await row(page, i).locator(`.tabulator-cell[tabulator-field="${f}"]`).innerText()).trim();
    assert.equal(await cellText(0, 'llmModel'), 'dwje-ax');
    assert.equal(await cellText(0, 'totalTokens'), '입력 1,500 · 출력 320');
    assert.equal(await cellText(0, 'finishText'), '정상');
    assert.equal(await cellText(1, 'finishText'), '길이 제한으로 잘림');
    // 공통코드(AI_CHAT_RATING)를 흉내 내지 않아 코드값 그대로일 수 있습니다
    assert(/^(오답|BAD)$/.test(await cellText(1, 'reviewText')), '검토 열');
    assert.equal(await cellText(0, 'intentNm'), '수율 집계 조회');
    for (const f of ['llmModel', 'totalTokens', 'finishText', 'intentNm']) assert.equal(await cellText(2, f), '—', `V71 전 행 ${f}`);

    // (3) 조건 — 모두 있음
    for (const label of ['시작일', '종료일', '사용자 그룹', '사용자(사번)', '검색', '평가', '검토', '응답']) {
      assert(await page.getByText(label, { exact: true }).count(), `조건 ${label}`);
    }
    assert(st.groups > 0, '사용자 그룹 선택지 조회');
    assert(await page.getByText('질의 보기', { exact: true }).count() && await page.getByText('세션 보기', { exact: true }).count(), '보기 전환');

    // (2) scope=all · 기본 기간
    assert(st.scopes.length && st.scopes.every((x) => x.endsWith(':all')), `scope=all ${st.scopes}`);
    assert.deepEqual(st.ranges[0], [FROM, TODAY], `default period ${JSON.stringify(st.ranges[0])}`);

    // (4) 답변 추가 칸
    assert.equal(await row(page, 1).getByRole('button', { name: '수정', exact: true }).count(), 1, 'saved → 수정');
    assert(await row(page, 1).getByText('지난주 대비 수율은 1.2%p 낮은', { exact: false }).count(), 'saved preview');
    assert.equal(await row(page, 0).getByRole('button', { name: '추가', exact: true }).count(), 1, 'empty → 추가');

    // (5) [추가] → 모달 → PUT
    await row(page, 0).getByRole('button', { name: '추가', exact: true }).click();
    await page.getByText('학습 데이터 답변 추가', { exact: true }).waitFor();
    await page.waitForTimeout(700);
    assert.equal(await page.getByText('질의 상세', { exact: true }).count(), 0, 'button does not open detail');
    assert(await page.getByText('이번 주 수율 추이 알려줘', { exact: true }).count() >= 2, '원 질문 표시');
    assert(await page.getByText('수율은 97.1% 입니다.', { exact: true }).count() >= 2, '원 답변 표시');
    await page.locator('textarea').last().fill('이번 주 수율은 97.1% 이며\n전주 대비 0.3%p 올랐습니다.');
    await page.getByRole('button', { name: '저장', exact: true }).click();
    await page.waitForTimeout(800);
    assert.deepEqual(st.puts.at(-1), { id: 63, body: { answer: '이번 주 수율은 97.1% 이며\n전주 대비 0.3%p 올랐습니다.' } });
    await row(page, 0).getByRole('button', { name: '수정', exact: true }).waitFor();

    // (6) [수정] → 채워진 값 → 비우고 저장 = 삭제
    await row(page, 1).getByRole('button', { name: '수정', exact: true }).click();
    await page.getByText('학습 데이터 답변 수정', { exact: true }).waitFor();
    const ta = page.locator('textarea').last();
    assert((await ta.inputValue()).startsWith('지난주 대비 수율은'), 'prefilled');
    await ta.fill('');
    await page.getByRole('button', { name: '저장', exact: true }).click();
    await page.waitForTimeout(800);
    assert.deepEqual(st.puts.at(-1), { id: 62, body: { answer: '' } });
    await row(page, 1).getByRole('button', { name: '추가', exact: true }).waitFor();

    // (3) 머리글 필터 — 질문
    const before = await page.locator('.tabulator-row').count();
    await page.locator('.tabulator-col[tabulator-field="question"] .tabulator-header-filter input').fill('가동률');
    await page.waitForTimeout(600);
    assert.equal(await page.locator('.tabulator-row').count(), 1, `header filter narrows (${before} → 1)`);
    await page.locator('.tabulator-col[tabulator-field="question"] .tabulator-header-filter input').fill('');
    await page.waitForTimeout(400);

    // (3) 조건 → 요청 파라미터
    // SelectField 는 select 요소가 아닙니다 — 칸을 눌러 열고 문서 끝(포털 목록)의 항목을 고릅니다
    await page.getByText('사용자 그룹', { exact: true }).first().locator('xpath=..').locator('[tabindex="0"]').first().click();
    await page.getByText('생산관리팀', { exact: true }).last().click();
    await page.waitForTimeout(400);
    await page.getByPlaceholder('예) 10002', { exact: true }).fill('10002');
    await page.getByPlaceholder('질문 내용', { exact: true }).fill('수율');
    await page.getByRole('button', { name: '조회', exact: true }).click();
    await page.waitForTimeout(900);
    const q = st.params.at(-1);
    assert.deepEqual([q.scope, q.userGroup, q.empNo, q.keyword], ['all', '생산관리팀', '10002', '수율'], `filter params ${JSON.stringify(q)}`);

    // (6) 학습데이터 · 엑셀 전체 · 조회 목록 열
    await page.getByRole('button', { name: '학습데이터 내보내기', exact: true }).click();
    await page.getByText('질의 원문이 파일로 반출되며', { exact: false }).waitFor();
    await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: '내보내기', exact: true }).click()]);
    assert.equal(st.trainset.at(-1).ratingFilter, 'USEFUL');
    assert.deepEqual([st.trainset.at(-1).from, st.trainset.at(-1).to], [FROM, TODAY]);
    const exportBtn = page.getByRole('button', { name: /엑셀 다운로드/ });
    await exportBtn.click();
    await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: /전체 다운로드/ }).click()]);
    const ex = st.exports.at(-1);
    assert.deepEqual([ex.view, ex.scope, ex.queryScope, ex.menuId], ['MESSAGE', 'ALL', 'all', 'sys-chat-history']);
    await exportBtn.click();
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: /조회 목록 다운로드/ }).click()]);
    const html = fs.readFileSync(await dl.path(), 'utf8');
    const heads = [...(/<tr>([\s\S]*?)<\/tr>/.exec(html)[1]).matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map((m) => m[1].replace(/<[^>]+>/g, '').trim());
    assert.deepEqual(heads, ['사용자', '부서', '질문', '답변', '판단 근거', '미응답 사유', '사용자 평가', '검토', '질문 시간', '답변 시간', '응답 시간(초)', '모델', '토큰', '답변 상태', '의도', '답변 추가(학습 데이터)'], `excel head ${heads}`);

    // (7) 행 클릭 → 상세 scope=all · LLM 메타 · 요청 ID · 검토
    await row(page, 1).locator('.tabulator-cell[tabulator-field="question"]').click();
    await page.getByText('질의 상세', { exact: true }).first().waitFor();
    await page.getByText(/디버그 기록/).waitFor();
    assert.equal(st.details.at(-1), 'all', 'detail scope=all');
    for (const t of ['chatcmpl-def456', '길이 제한으로 잘림', '입력 1,500 · 출력 320 · 합계 1,820 토큰', '공정 기준서 · p.3, 4 · 0.81', '근거 3건']) {
      assert(await page.getByText(t, { exact: false }).count(), `상세 ${t}`);
    }
    assert(await page.getByText('요청 ID', { exact: true }).count(), '요청 ID 행');
    await page.getByRole('button', { name: '검토: 유용', exact: true }).click();
    await page.waitForTimeout(500);
    assert.equal(st.reviews.at(-1).reviewCd, 'USEFUL');

    // (8) 질의 표 「세션 보기 ›」 → 세션 보기 · 강조 → 「질의 상세 ›」
    await page.getByLabel('10-02 08:35:00 질의의 세션 보기', { exact: true }).click();
    await page.waitForURL(/view=session/);
    assert(/session=S-1/.test(page.url()) && /focus=62/.test(page.url()), page.url());
    await page.getByLabel('선택한 질의').waitFor();
    assert.equal(await page.getByText('질의 상세', { exact: true }).count(), 0, '링크는 상세를 열지 않음');
    assert(await page.getByText('세션 시작', { exact: true }).count(), '세션 목록');
    const panelBox = await page.getByText('이 대화 내려받기').boundingBox();
    assert(panelBox.x > 700, '오른쪽 패널');
    await page.getByLabel('선택한 질의').getByText('질의 상세 ›').click();
    await page.getByText('질의 상세', { exact: true }).first().waitFor();
    await page.getByRole('button', { name: '닫기', exact: true }).last().click();
    await page.waitForTimeout(300);
    // 세션 목록 행 클릭 → 다른 세션
    await page.locator('.tabulator-row').nth(1).locator('.tabulator-cell').nth(3).click();
    await page.waitForURL(/session=chat-12/);
    await page.getByText('설비 가동률', { exact: true }).last().waitFor();
    assert(st.scopes.every((x) => x.endsWith(':all')), `scope=all ${st.scopes}`);
    assert.deepEqual(errors, []);
  } catch (e) {
    console.error('화면:', (await page.evaluate(() => document.body.innerText).catch(() => '')).slice(0, 800));
    throw e;
  } finally { await browser.close(); }

  // ── 2. 관리 불가(미배정 — 접근은 있어도 쓰기 불가) ──
  ({ browser, page } = await openStubbed({ me: me({ unassigned: true }) }));
  try {
    const st = await setup(page, { canManage: false });
    await page.goto(`${WEB}/system/chat-history`);
    await page.locator('.tabulator-row').first().waitFor({ timeout: 30000 });
    await page.waitForTimeout(500);
    const add = row(page, 0).getByRole('button', { name: '추가', exact: true });
    assert(await add.isDisabled(), 'train-answer add disabled');
    assert(await row(page, 1).getByRole('button', { name: '수정', exact: true }).isDisabled(), 'train-answer edit disabled');
    assert(await page.getByRole('button', { name: '학습데이터 내보내기', exact: true }).isDisabled(), 'trainset disabled');
    assert(!(await page.getByRole('button', { name: /엑셀 다운로드/ }).isDisabled()), 'excel stays enabled');
    await add.click({ force: true }).catch(() => {});
    await page.waitForTimeout(500);
    assert.equal(st.puts.length, 0, 'no PUT without manage');
    assert.equal(await page.getByText('학습 데이터 답변 추가', { exact: true }).count(), 0, 'no modal');
  } finally { await browser.close(); }

  // ── 3. 관리자 전용 — sys-chat-history 접근이 없는 전산팀 ──
  ({ browser, page } = await openStubbed({ me: me({ chatAdmin: false }) }));
  try {
    const st = await setup(page);
    await page.goto(`${WEB}/system/chat-history`);
    await page.waitForTimeout(2500);
    assert.equal(await page.locator('.tabulator-row').count(), 0, '표 없음');
    assert(!st.scopes.some((x) => x.endsWith(':all')), `no scope=all without access ${st.scopes}`);
  } finally { await browser.close(); }

  console.log('PASS: chat-history-admin — 통합관리자, 열 순서(사용자~답변 추가 · 검토 · LLM 메타), 조건 8종 · 파라미터, 상세 요청 ID · 근거 묶음, 세션 보기 · 패널 · 질의 상세, 엑셀 VIEW 열, 비접근 계정 scope=all 없음, scope=all · 기본 기간 오늘-7~오늘, 머리글 필터, 답변 추가/수정 표시, 추가 모달(원 질문·원 답변) PUT {answer}, 비우고 저장 = 지움, 학습데이터 내보내기, 엑셀 전체 ?scope=all, 상세 scope=all · 검토, canManage=false 비활성');
})().catch((e) => { console.error(e); process.exitCode = 1; });
