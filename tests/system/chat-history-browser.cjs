/**
 * 브라우저 시험 — 자연어 질의 이력(chat-history, /history/chat) · 2026-10-03 본인 이력 전용 · 2026-10-03 (2차) 질의 표 하나
 *
 * 세션과 API 응답을 모두 page.route 로 고정합니다(실 API·DB 를 쓰지 않습니다 — tests/lib/stubSession).
 * 실 API 모드 웹 서버가 필요합니다(목 모드는 앱 안에서 응답해 가로챌 수 없습니다).
 *   WEB_URL=http://localhost:8081 node tests/system/chat-history-browser.cjs
 *
 *  (1) 모든 질의 이력 조회에 scope=mine, userGroup 없음, 그룹 선택지(groups) · 세션 목록(sessions) 호출 없음
 *  (2) /system/chat-history 는 /history/chat 으로 넘어가지 않음(전사 화면 — 권한 없으면 차단 안내, scope=all 요청 없음)
 *  (3) 학습데이터 · 검토 · 디버그 · 사용자 그룹 · 「전 사용자」/가림 안내 · 「세션 보기 / 질의 보기」 전환 없음
 *  (4) 열 순서 — 질문 시간 · 질문 · 응답 · 판단 근거 · 근거 문서 · 응답 시간 · 모델 · 토큰 · 답변 상태 · 의도 · 평가 · 대화.
 *      답변 시간 · 미응답 사유 · 부서·사용자 · 검토 열 없음
 *  (5) LLM 메타 — 모델, 「입력 n · 출력 m」(합계 title), length → 「길이 제한으로 잘림」 배지, 값 없으면 '—'.
 *      근거 문서 — 같은 제목은 한 줄로 묶고 「근거 n건」, 없으면 '—'
 *  (6) 행 클릭 → 상세 모달 없음 · 요청 없음
 *  (7) 평가 열 「유용 · 개선 필요」 → POST …/feedback (good · bad), 답변 평가 기준은 표 위 [?]
 *  (8) 「대화 보기 ›」 → 대화 패널(오른쪽, 시간순 · 그 질의 강조), 닫기 · 뒤로 가기
 *  (9) 엑셀 패널 두 항목, 조회 목록 = 그리드 행 · 열(대화 열 제외), 전체 = 서버 생성(본문 scope ALL · 주소 ?scope=mine · menuId chat-history)
 *  (10) 360px 에서 마지막 열(대화)까지 가로 스크롤, 대화 패널은 전체 폭 · 뒤로 가기 복귀
 */
const assert = require('node:assert/strict');
const { WEB } = require('../lib/browser');
const { openStubbed } = require('../lib/stubSession');
const { readXlsx } = require('../lib/xlsx');

const ME = {
  user: { empNo: '10004', name: '최전산', dept: '전산팀', deptId: 2, pos: 'SENIOR', superAdmin: false },
  dept: { deptId: 2, deptNm: '전산팀', superAdmin: false, unassigned: false },
  menuPerms: ['ai-chat', 'chat-history', 'gloss-view', 'dash-ai'],
  writePerms: ['ai-chat', 'chat-history', 'gloss-view', 'dash-ai'],
  dataPerms: ['qty'],
  dataFields: [],
  pwdChangeRequired: false,
};

const DOCS = [{ title: '공정 기준서', page: 3, score: 0.81 }, { title: '공정 기준서', page: 5, score: 0.77 }, { title: '수율 집계 지침', page: 2, score: 0.64 }];
const LLM = { llmModel: 'dwje-ax', finishReason: 'stop', promptTokens: 1234, completionTokens: 210, totalTokens: 1444, llmMs: 6100, intentNm: '수율 집계 조회' };
const MSGS = [
  { messageId: 63, sessionKey: 'S-1', ts: '2026-09-23 08:39:03', answeredAt: '2026-09-23 08:39:12', dept: '전산팀', name: '최전산', empNo: '10004', question: '이번 주 수율 추이 알려줘', answer: '수율은 97.1% 입니다.', judgmentBasis: '수율 집계', answerHidden: false, unansweredReason: null, responseSec: 9.8, rating: 'USEFUL', review: null, ...LLM, docs: DOCS, docCnt: 5 },
  { messageId: 62, sessionKey: 'S-1', ts: '2026-09-23 08:35:00', answeredAt: '2026-09-23 08:35:07', dept: '전산팀', name: '최전산', empNo: '10004', question: '지난주와 비교', answer: '지난주보다 1.2%p 낮습니다.', judgmentBasis: '집계 표', answerHidden: false, responseSec: 7.1, rating: null, review: null, ...LLM, finishReason: 'length', docs: [], docCnt: 0 },
  { messageId: 61, sessionKey: 'S-1', ts: '2026-09-23 08:30:11', answeredAt: '2026-09-23 08:30:16', dept: '전산팀', name: '최전산', empNo: '10004', question: '불량 현황', answer: '불량 12건입니다.', judgmentBasis: '불량 집계', answerHidden: false, responseSec: 5.0, rating: null, review: null, ...LLM, finishReason: 'tool_calls' },
  // V71 전 서버 — LLM 메타 · docs 없음
  { messageId: 12, sessionKey: 'chat-12', ts: '2026-09-22 10:02:00', answeredAt: '2026-09-22 10:02:03', dept: '전산팀', name: '최전산', empNo: '10004', question: '설비 가동률', answer: '92%', judgmentBasis: '가동 집계', answerHidden: false, unansweredReason: '일부 원천 없음', responseSec: 3.2, rating: null, review: null },
];
const SESSIONS = [
  { sessionKey: 'S-1', sessionId: 'S-1', startedAt: '2026-09-23 08:30:11', lastAskedAt: '2026-09-23 08:39:03', empNo: '10004', name: '최전산', dept: '전산팀', questionCnt: 3, firstQuestion: '불량 현황', answeredCnt: 3, usefulCnt: 1, badCnt: 0, reviewedCnt: 0, hiddenCnt: 0 },
  { sessionKey: 'chat-12', sessionId: null, startedAt: '2026-09-22 10:02:00', lastAskedAt: '2026-09-22 10:02:00', empNo: '10004', name: '최전산', dept: '전산팀', questionCnt: 1, firstQuestion: '설비 가동률', answeredCnt: 1, usefulCnt: 0, badCnt: 0, reviewedCnt: 0, hiddenCnt: 0 },
];
const COLS = ['질문 시간', '질문', '응답', '판단 근거', '근거 문서', '응답 시간', '모델', '토큰', '답변 상태', '의도', '평가', '대화'];

async function setup(page) {
  const st = { logs: [], lists: [], scopes: [], groupsCalls: 0, userGroups: [], exports: [], feedback: [], details: 0 };
  await page.route('**/api/v1/download-logs', (r) => {
    if (r.request().method() !== 'POST') return r.continue();
    st.logs.push(r.request().postDataJSON());
    return r.fulfill({ json: { success: true, code: 'SUCCESS', message: '기록했습니다.', data: { dlId: st.logs.length } } });
  });
  await page.route('**/api/v1/ai/chat/messages/*/feedback', (route) => {
    st.feedback.push({ url: route.request().url(), body: route.request().postDataJSON() });
    return route.fulfill({ json: { success: true, code: 'SUCCESS', message: '평가를 저장했습니다.', data: { messageId: 62 } } });
  });
  await page.route('**/api/v1/ai/chat/history**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const p = url.pathname.replace(/^\/api\/v1\/ai\/chat\/history\/?/, '');
    if (req.method() === 'GET') {
      st.scopes.push(`${p || 'list'}:${url.searchParams.get('scope')}`);
      if (url.searchParams.has('userGroup')) st.userGroups.push(p);
    }
    const ok = (data, meta) => route.fulfill({ json: { success: true, code: 'SUCCESS', message: '완료', data, meta } });
    const file = (name) => route.fulfill({ status: 200, headers: { 'content-type': 'application/octet-stream', 'content-disposition': `attachment; filename="${name}"` }, body: 'test' });
    if (p === 'summary') return ok({ questionCnt: 4, sessionCnt: 2, answerRate: 100, avgResponseSec: 6.3, requeryRate: 50, usefulCnt: 1, badCnt: 0, reviewedCnt: 0, retentionDays: 1095, expiredCnt: 12, canManage: false });
    if (p === 'groups') { st.groupsCalls += 1; return ok({ items: [] }); }
    if (p === 'sessions') { st.lists.push('sessions'); return ok({ items: SESSIONS }, { page: 1, size: 50, total: SESSIONS.length, totalPages: 1 }); }
    if (p.startsWith('sessions/')) {
      const key = decodeURIComponent(p.slice(9));
      const sess = SESSIONS.find((x) => x.sessionKey === key);
      if (!sess) return route.fulfill({ status: 404, json: { success: false, code: 'E-NOTFOUND', message: '세션을 찾을 수 없습니다.' } });
      const turns = MSGS.filter((m) => m.sessionKey === key).sort((a, b) => a.ts.localeCompare(b.ts)).map((m) => ({ ...m, askedAt: m.ts }));
      return ok({ ...sess, turns });
    }
    if (p === 'export') { st.exports.push({ ...req.postDataJSON(), queryScope: url.searchParams.get('scope') }); return file('chat_history_test.xlsx'); }
    if (/^\d+$/.test(p)) {
      st.details += 1;
      const m = MSGS.find((x) => String(x.messageId) === p);
      return ok({ ...m, askedAt: m.ts, userName: m.name, hits: [{ docId: 'D1', title: '공정 기준서', page: 3, score: 0.81 }] });
    }
    if (p === '') { st.lists.push('messages'); return ok({ items: MSGS, maskedRowCnt: 0 }, { page: 1, size: 50, total: MSGS.length, totalPages: 1 }); }
    return route.fulfill({ status: 404, json: { success: false, code: 'E-NOTFOUND', message: `unexpected ${p}` } });
  });
  return st;
}

/** 표를 오른쪽 끝까지 밀고 마지막 열 머리글·값이 보이는지 */
async function lastColumnVisible(page, field) {
  return page.locator('.tabulator').first().evaluate(async (tab, f) => {
    let scroll = tab.parentElement;
    while (scroll && !(scroll.scrollWidth > scroll.clientWidth + 2 && ['auto', 'scroll'].includes(getComputedStyle(scroll).overflowX))) scroll = scroll.parentElement;
    if (!scroll) return { scrolled: false };
    scroll.scrollLeft = scroll.scrollWidth;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const head = tab.querySelector(`.tabulator-col[tabulator-field="${f}"]`).getBoundingClientRect();
    const cell = tab.querySelector(`.tabulator-row .tabulator-cell[tabulator-field="${f}"]`).getBoundingClientRect();
    const right = Math.min(window.innerWidth, scroll.getBoundingClientRect().right);
    return { scrolled: scroll.scrollLeft > 0, head: head.right <= right + 2 && head.width > 40, cell: cell.right <= right + 2, aligned: Math.abs(head.x - cell.x) < 2 };
  }, field);
}

(async () => {
  const { browser, page } = await openStubbed({ me: ME });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    const st = await setup(page);

    // (2) 옛 주소는 이제 전사 화면 — 넘어가지 않고, 권한이 없으면 차단 안내
    await page.goto(`${WEB}/system/chat-history`);
    await page.waitForTimeout(2500);
    assert(!/\/history\/chat/.test(page.url()), `no redirect to /history/chat: ${page.url()}`);
    assert(/\/system\/chat-history/.test(page.url()) || !(await page.getByText('전사 자연어 질의 이력', { exact: true }).count()), 'no access to admin screen');
    assert(!st.scopes.some((x) => x.endsWith(':all')), 'no scope=all request without sys-chat-history');

    await page.goto(`${WEB}/history/chat`);
    await page.locator('.tabulator-row').first().waitFor({ timeout: 30000 });
    await page.waitForTimeout(600);
    const text = await page.evaluate(() => document.body.innerText);
    // (3) 관리 기능 · 전 사용자 개념 · 보기 전환 없음
    assert(text.includes('내 질의 이력입니다'), '본인 이력 안내');
    assert(!text.includes('전 사용자'), '「전 사용자」 문구 없음');
    assert(!text.includes('권한 밖 응답은 가려집니다'), '가림 안내 없음');
    assert.equal(await page.getByRole('button', { name: '학습데이터 내보내기', exact: true }).count(), 0, '학습데이터 단추 없음');
    assert.equal(await page.getByText('사용자 그룹', { exact: true }).count(), 0, '사용자 그룹 조건 없음');
    assert.equal(await page.getByText('검토', { exact: true }).count(), 0, '검토 조건·열 없음');
    assert.equal(await page.getByText('세션 보기', { exact: true }).count(), 0, '세션 보기 전환 없음');
    assert.equal(await page.getByText('질의 보기', { exact: true }).count(), 0, '질의 보기 전환 없음');
    assert.equal(await page.getByText('세션 시작', { exact: true }).count(), 0, '세션 목록 없음');
    assert(!st.lists.includes('sessions'), '세션 목록 API 호출 없음');
    assert(text.includes('보존 3년 · 기간 지난 12건은 매일 03:10 정리'), '보존 안내(R-20)');

    // (4) 열 순서
    const titles = (await page.locator('.tabulator-col .tabulator-col-title').allTextContents()).map((t) => t.trim());
    assert.deepEqual(titles, COLS, `columns ${titles}`);
    for (const f of ['answeredAt', 'unansweredReason', 'name', 'review']) {
      assert.equal(await page.locator(`.tabulator-col[tabulator-field="${f}"]`).count(), 0, `${f} 열 없음`);
    }

    // (5) LLM 메타 · 근거 문서
    const cell = (i, f) => page.locator('.tabulator-row').nth(i).locator(`.tabulator-cell[tabulator-field="${f}"]`);
    assert.equal((await cell(0, 'llmModel').innerText()).trim(), 'dwje-ax');
    assert.equal((await cell(0, 'totalTokens').innerText()).trim(), '입력 1,234 · 출력 210');
    assert.equal(await cell(0, 'totalTokens').locator('[title="합계 1,444 토큰"]').count(), 1, '토큰 합계 title');
    assert.equal((await cell(0, 'finishReason').innerText()).trim(), '정상');
    assert.equal((await cell(1, 'finishReason').innerText()).trim(), '길이 제한으로 잘림');
    assert.equal((await cell(2, 'finishReason').innerText()).trim(), '도구 호출');
    assert.equal((await cell(0, 'intentNm').innerText()).trim(), '수율 집계 조회');
    const docs0 = (await cell(0, 'docs').innerText()).trim().split('\n').map((x) => x.trim()).filter(Boolean);
    assert.deepEqual(docs0, ['공정 기준서 · p.3, 5 · 0.81', '수율 집계 지침 · p.2 · 0.64', '근거 5건'], `docs dedupe ${docs0}`);
    assert.equal((await cell(1, 'docs').innerText()).trim(), '—', '근거 없음 —');
    for (const f of ['docs', 'llmModel', 'totalTokens', 'finishReason', 'intentNm']) {
      assert.equal((await cell(3, f).innerText()).trim(), '—', `V71 전 행 ${f} = —`);
    }

    // (6) 행 클릭 → 상세 모달 없음
    await cell(1, 'question').click();
    await page.waitForTimeout(700);
    assert.equal(await page.getByText('질의 상세', { exact: true }).count(), 0, '행 클릭 상세 모달 없음');
    assert.equal(st.details, 0, '상세 API 호출 없음');

    // (7) 평가 — 표 안 단추 · 평가 기준 [?]
    assert(await page.getByLabel(/답변 평가 기준 — 질문에 직접 답했는지/).count(), '평가 기준 안내');
    await page.locator('.tabulator-row').nth(1).getByRole('button', { name: '개선 필요', exact: true }).click();
    await page.waitForTimeout(500);
    assert(/\/ai\/chat\/messages\/62\/feedback/.test(st.feedback.at(-1)?.url || ''), `feedback on own row ${JSON.stringify(st.feedback)}`);
    assert.equal(st.feedback.at(-1).body.rating, 'bad');
    await page.locator('.tabulator-row').nth(2).getByRole('button', { name: '유용', exact: true }).click();
    await page.waitForTimeout(500);
    assert(/\/messages\/61\/feedback/.test(st.feedback.at(-1)?.url || ''));
    assert.equal(st.feedback.at(-1).body.rating, 'good');

    // (8) 대화 보기 → 오른쪽 패널(시간순 · 강조)
    await page.getByLabel('09-23 08:35:00 질의의 대화 보기', { exact: true }).click();
    await page.waitForURL(/session=S-1/);
    assert(/focus=62/.test(page.url()), 'focus');
    await page.getByLabel('선택한 질의').waitFor();
    const panel = await page.getByText('이 대화 내려받기').boundingBox();
    assert(panel.x > 700, '넓은 화면은 오른쪽 패널');
    const order = await page.getByLabel('선택한 질의').evaluate((el) => {
      const t = el.parentElement.innerText;
      return [t.indexOf('불량 현황'), t.indexOf('지난주와 비교'), t.indexOf('이번 주 수율 추이')];
    });
    assert(order[0] >= 0 && order[0] < order[1] && order[1] < order[2], `시간순 ${order}`);
    assert.equal(await page.getByText('질의 상세 ›').count(), 0, '패널에 상세 링크 없음');
    assert.equal(await page.locator('.tabulator-row').count(), MSGS.length, '넓은 화면은 표가 남음');
    await page.getByRole('button', { name: '닫기', exact: true }).click();
    await page.waitForTimeout(500);
    assert.equal(await page.getByText('이 대화 내려받기').count(), 0, '닫기');

    // (9) 엑셀 패널
    const exportBtn = page.getByRole('button', { name: /엑셀 다운로드/ });
    await exportBtn.click();
    await page.getByRole('menuitem', { name: /조회 목록 다운로드/ }).waitFor();
    assert.equal(await page.getByRole('menuitem').count(), 2, '패널 두 항목');
    let [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: /조회 목록 다운로드/ }).click()]);
    const xl = await readXlsx(await dl.path());
    const html = xl.text;
    assert.equal(xl.body.length, await page.locator('.tabulator-row').count(), '파일 행 = 그리드 행');
    const heads = xl.head;
    assert.deepEqual(heads, ['질문 시간', '질문', '응답', '판단 근거', '근거 문서', '응답 시간(초)', '모델', '토큰', '답변 상태', '의도', '평가'], `excel head ${heads}`);
    assert(!html.includes('검토') && !html.includes('미응답 사유') && !html.includes('답변 시간'), '엑셀에 빠진 열 없음');
    assert(html.includes('입력 1,234 · 출력 210') && html.includes('길이 제한으로 잘림'), '엑셀 LLM 메타');
    await exportBtn.click();
    [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: /전체 다운로드/ }).click()]);
    const ex = st.exports.at(-1);
    assert.deepEqual([ex.view, ex.scope, ex.queryScope, ex.menuId], ['MESSAGE', 'ALL', 'mine', 'chat-history']);

    // (10) 360px — 마지막 「대화」 열 · 대화 패널 전체 폭 · 뒤로 가기
    await page.setViewportSize({ width: 360, height: 800 });
    await page.waitForTimeout(800);
    const last = await lastColumnVisible(page, 'actions');
    assert(last.scrolled && last.head && last.cell && last.aligned, `360px 질의 표 대화 열 ${JSON.stringify(last)}`);
    await page.getByLabel('09-23 08:39:03 질의의 대화 보기', { exact: true }).click();
    await page.waitForURL(/session=S-1/);
    await page.getByRole('button', { name: '목록으로', exact: true }).waitFor();
    assert.equal(await page.locator('.tabulator-row').count(), 0, '좁은 화면은 전체 폭 패널만');
    await page.goBack();
    await page.locator('.tabulator-row').first().waitFor();
    await page.setViewportSize({ width: 1440, height: 960 });

    // (1) 모든 조회 scope=mine · userGroup 없음 · groups 호출 없음
    assert(st.scopes.length > 0, 'history requests seen');
    const bad = st.scopes.filter((x) => !x.endsWith(':mine'));
    assert.deepEqual(bad, [], `every history GET has scope=mine: ${st.scopes.join(', ')}`);
    assert.deepEqual(st.userGroups, [], 'no userGroup param');
    assert.equal(st.groupsCalls, 0, 'no groups lookup');

    assert.equal(errors.length, 0, errors.join('\n'));
    console.log('PASS: chat-history(본인) — scope=mine 전 요청, 옛 주소 리다이렉트 없음, 보기 전환·세션 목록·행 상세 모달 없음, 열 순서(LLM 메타·근거 문서 묶음·평가·대화), 답변 시간·미응답 사유 열 없음, V71 전 행 —, 표 안 평가 feedback good/bad, 대화 보기 패널·강조·시간순·닫기, 엑셀 VIEW 열=표 열·ALL ?scope=mine, 360px 마지막 열·전체 폭 패널·뒤로 가기');
  } catch (e) {
    console.error('화면:', (await page.evaluate(() => document.body.innerText).catch(() => '')).slice(0, 800));
    throw e;
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exitCode = 1; });
