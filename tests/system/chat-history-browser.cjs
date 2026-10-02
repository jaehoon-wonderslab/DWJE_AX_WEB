/**
 * 브라우저 시험 — 자연어 질의 이력(chat-history, /history/chat) · 08 기획서 6장
 *
 * API 응답은 page.route 로 고정합니다(실 서버 모드 웹 서버 필요 — 목 모드는 앱 안에서 응답해 가로챌 수 없습니다).
 *   API_URL=http://localhost:18081 WEB_URL=http://localhost:<실 API 모드 포트> node tests/system/chat-history-browser.cjs
 *
 *  (2) /system/chat-history → /history/chat
 *  (3) canManage=false → 학습데이터·검토 비활성, 디버그 없음(엑셀은 있음) / true → 모두 있음
 *  (4) 쓰기 권한 없는 계정도 다른 부서 행 상세가 열림
 *  (5) answerHidden 행 「권한 밖 응답」
 *  (6) 학습데이터 내보내기 → 다운로드 이벤트, 본문 ratingFilter
 *  (7) 날짜를 바꿔도 필터가 사라지지 않음
 *  (8)(15) 360px 에서 질의·세션 표 마지막 「검토」 열까지 가로 스크롤
 *  (10) 기본 보기 = 세션, 행 클릭 → 넓은 화면 오른쪽 패널 · 360px 전체 폭 · 뒤로 가기 복귀
 *  (11) 질의 보기 「세션 보기 ›」 → 그 세션 상세(강조)
 *  (12) 엑셀 패널 두 항목, 학습데이터 없음, Esc 닫힘
 *  (13) 「조회 목록」 파일 행 수 = 그리드 행 수, 가린 행 응답 「비공개」
 *  (14) 「전체」 가 scope:'ALL' 로 서버 생성 API 를 부름
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { open, WEB } = require('../lib/browser');

/** 앱 번들이 부르는 API(기본 8080)를 API_URL 로 돌립니다 — 8080 이 멈췄을 때 다른 포트의 API 로 시험합니다 */
const REAL_API = process.env.API_URL || 'http://localhost:8080';
const APP_API = process.env.APP_API_URL || 'http://localhost:8080';
const realUrl = (u) => u.replace(APP_API, REAL_API);
async function redirectApi(page) {
  if (REAL_API === APP_API) return;
  await page.route(`${APP_API}/**`, (r) => r.continue({ url: realUrl(r.request().url()) }));
}

const MSGS = [
  { messageId: 63, sessionKey: 'S-1', ts: '2026-09-23 08:39:03', dept: '생산관리팀', name: '박**', empNo: null, question: '이번 주 수율 추이 알려줘', answer: null, judgmentBasis: null, answerHidden: true, answerHiddenReason: '질의자보다 데이터 접근 권한이 좁아 응답을 표시하지 않습니다 (가려지는 항목: 수율)', unansweredReason: null, responseSec: 9.8, rating: 'USEFUL', review: null },
  { messageId: 62, sessionKey: 'S-1', ts: '2026-09-23 08:35:00', dept: '생산관리팀', name: '박**', empNo: null, question: '지난주와 비교', answer: '지난주보다 1.2%p 낮습니다.', judgmentBasis: '집계 표', answerHidden: false, responseSec: 7.1, rating: null, review: 'BAD' },
  { messageId: 61, sessionKey: 'S-1', ts: '2026-09-23 08:30:11', dept: '생산관리팀', name: '박**', empNo: null, question: '불량 현황', answer: '불량 12건입니다.', judgmentBasis: '불량 집계', answerHidden: false, responseSec: 5.0, rating: null, review: null },
  { messageId: 12, sessionKey: 'chat-12', ts: '2026-09-22 10:02:00', dept: '전산팀', name: '최전산', empNo: '10000', question: '설비 가동률', answer: '92%', judgmentBasis: '가동 집계', answerHidden: false, responseSec: 3.2, rating: null, review: null },
];
const SESSIONS = [
  { sessionKey: 'S-1', sessionId: 'S-1', startedAt: '2026-09-23 08:30:11', lastAskedAt: '2026-09-23 08:39:03', empNo: null, name: '박**', dept: '생산관리팀', questionCnt: 3, firstQuestion: '불량 현황', answeredCnt: 3, usefulCnt: 1, badCnt: 0, reviewedCnt: 1, hiddenCnt: 1 },
  { sessionKey: 'chat-12', sessionId: null, startedAt: '2026-09-22 10:02:00', lastAskedAt: '2026-09-22 10:02:00', empNo: '10000', name: '최전산', dept: '전산팀', questionCnt: 1, firstQuestion: '설비 가동률', answeredCnt: 1, usefulCnt: 0, badCnt: 0, reviewedCnt: 0, hiddenCnt: 0 },
];

async function setup(page, opts = {}) {
  await redirectApi(page);
  // 다운로드 이력 기록 — 서버가 아직 scopeCd·condSummary(공통 CMN-07)를 받지 않아 고정합니다. 받은 본문은 st.logs 에 남깁니다
  const logs = [];
  await page.route('**/api/v1/download-logs', (r) => {
    if (r.request().method() !== 'POST') return r.continue();
    logs.push(r.request().postDataJSON());
    return r.fulfill({ json: { success: true, code: 'SUCCESS', message: '기록했습니다.', data: { dlId: logs.length } } });
  });
  const st = { logs, lists: [], exports: [], trainset: [], reviews: [], canManage: !!opts.canManage };
  await page.route('**/api/v1/auth/me', async (route) => {
    const res = await route.fetch({ url: realUrl(route.request().url()) });
    const j = await res.json();
    j.data.menuPerms = ['ai-chat', 'chat-history', 'sys-gloss', 'gloss-view', 'dash-ai'];
    j.data.writePerms = st.canManage ? ['chat-history'] : [];
    await route.fulfill({ response: res, json: j });
  });
  await page.route('**/api/v1/ai/chat/history**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const p = url.pathname.replace(/^\/api\/v1\/ai\/chat\/history\/?/, '');
    const ok = (data, meta) => route.fulfill({ json: { success: true, code: 'SUCCESS', message: '완료', data, meta } });
    const file = (name) => route.fulfill({ status: 200, headers: { 'content-type': 'application/octet-stream', 'content-disposition': `attachment; filename="${name}"` }, body: 'test' });
    if (p === 'summary') return ok({ questionCnt: 4, sessionCnt: 2, answerRate: 100, avgResponseSec: 6.3, requeryRate: 50, usefulCnt: 1, badCnt: 0, reviewedCnt: 1, retentionDays: 1095, expiredCnt: 12, canManage: st.canManage });
    if (p === 'groups') return ok({ items: [{ dept: '생산관리팀', cnt: 3 }, { dept: '전산팀', cnt: 1 }] });
    if (p === 'sessions') { st.lists.push({ kind: 'sessions', from: url.searchParams.get('from') }); return ok({ items: SESSIONS }, { page: 1, size: 50, total: SESSIONS.length, totalPages: 1 }); }
    if (p.startsWith('sessions/')) {
      const key = decodeURIComponent(p.slice(9));
      const sess = SESSIONS.find((x) => x.sessionKey === key);
      if (!sess) return route.fulfill({ status: 404, json: { success: false, code: 'E-NOTFOUND', message: '세션을 찾을 수 없습니다.' } });
      const turns = MSGS.filter((m) => m.sessionKey === key).sort((a, b) => a.ts.localeCompare(b.ts)).map((m) => ({ ...m, askedAt: m.ts }));
      return ok({ ...sess, turns });
    }
    if (p === 'export') { st.exports.push(req.postDataJSON()); return file('chat_history_test.xlsx'); }
    if (p === 'export-trainset') {
      st.trainset.push(req.postDataJSON());
      if (!st.canManage) return route.fulfill({ status: 403, json: { success: false, code: 'E-AUTH-004', message: '이 화면의 쓰기 권한이 없습니다. [chat-history]' } });
      return file('trainset_test.jsonl');
    }
    if (/^\d+\/review$/.test(p)) { st.reviews.push(req.postDataJSON()); return ok({ messageId: Number(p.split('/')[0]), review: req.postDataJSON().reviewCd }); }
    if (/^\d+$/.test(p)) {
      const m = MSGS.find((x) => String(x.messageId) === p);
      return ok({ ...m, askedAt: m.ts, userName: m.name, hits: [{ docId: 'D1', title: '공정 기준서', page: 3, score: 0.81 }], ...(st.canManage ? { debug: { route: 'metric', rows: 12, totalMs: 9800 } } : {}) });
    }
    if (p === '') { st.lists.push({ kind: 'messages', from: url.searchParams.get('from') }); return ok({ items: MSGS, maskedRowCnt: 1 }, { page: 1, size: 50, total: MSGS.length, totalPages: 1 }); }
    return route.continue();
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
  const { browser, page } = await open('admin');
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    let st = await setup(page, { canManage: false });

    // (2) 옛 주소
    await page.goto(`${WEB}/system/chat-history`);
    await page.waitForURL(/\/history\/chat/, { timeout: 30000 });

    // (10) 기본 보기 = 세션
    await page.getByText('세션 시작', { exact: true }).first().waitFor({ timeout: 30000 });
    assert(st.lists.some((l) => l.kind === 'sessions'), '세션 목록을 부름');
    await page.locator('.tabulator-row').first().click();
    await page.waitForURL(/session=S-1/);
    await page.getByText('지난주와 비교', { exact: true }).waitFor();
    const panel = await page.getByText('이 세션 내려받기').boundingBox();
    assert(panel.x > 700, '넓은 화면은 오른쪽 패널');
    assert(await page.getByText('세션 시작', { exact: true }).count(), '넓은 화면은 목록과 함께');
    // 세션 대화 — 시간순, 가린 응답
    const order = await page.evaluate(() => {
      const t = document.body.innerText;
      return [t.indexOf('불량 현황'), t.indexOf('지난주와 비교'), t.indexOf('이번 주 수율 추이')];
    });
    assert(order[0] < order[1] && order[1] < order[2], `시간순 ${order}`);
    assert(await page.getByText('권한 밖 응답', { exact: true }).count(), '(5) 가린 응답 배지');
    assert((await page.evaluate(() => document.body.innerText)).includes('보존 3년 · 기간 지난 12건은 매일 03:10 정리'), '보존 안내(R-20)');

    // (12) 엑셀 패널
    const exportBtn = page.getByRole('button', { name: /엑셀 다운로드/ });
    await exportBtn.click();
    await page.getByRole('menuitem', { name: /조회 목록 다운로드/ }).waitFor();
    assert.equal(await page.getByRole('menuitem').count(), 2, '패널 두 항목');
    assert.equal(await page.getByRole('menuitem', { name: /학습/ }).count(), 0, '학습데이터는 패널에 없음');
    const b = await exportBtn.boundingBox();
    const m = await page.getByRole('menuitem').first().boundingBox();
    assert(m.y >= b.y + b.height - 2 && m.y - (b.y + b.height) < 40, '버튼 바로 아래');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    assert.equal(await page.getByRole('menuitem').count(), 0, 'Esc 닫힘');

    // (13) 세션 보기 조회 목록 = 그리드 행
    await exportBtn.click();
    let [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: /조회 목록 다운로드/ }).click()]);
    let html = fs.readFileSync(await dl.path(), 'utf8');
    assert.equal((html.match(/<tr>/g) || []).length - 1, SESSIONS.length, '세션 파일 행 = 그리드 행');

    // (14) 전체 = 서버 생성
    await exportBtn.click();
    await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: /전체 다운로드/ }).click()]);
    assert.deepEqual([st.exports.at(-1).view, st.exports.at(-1).scope, st.exports.at(-1).menuId], ['SESSION', 'ALL', 'chat-history']);

    // (3) 쓰기 권한 없음 — 학습데이터 비활성
    assert(await page.getByRole('button', { name: '학습데이터 내보내기', exact: true }).isDisabled(), '학습데이터 비활성');

    // (11) 질의 보기 → 「세션 보기 ›」
    await page.getByText('질의 보기', { exact: true }).click();
    await page.getByText('판단 근거', { exact: true }).first().waitFor();
    assert(st.lists.some((l) => l.kind === 'messages'), '질의 목록을 부름');
    assert(await page.getByText('권한 밖 응답', { exact: true }).count(), '질의 표 가림 배지');

    // (13) 질의 보기 조회 목록 — 가린 행 응답 비공개
    await exportBtn.click();
    [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: /조회 목록 다운로드/ }).click()]);
    html = fs.readFileSync(await dl.path(), 'utf8');
    assert.equal((html.match(/<tr>/g) || []).length - 1, await page.locator('.tabulator-row').count(), '질의 파일 행 = 그리드 행');
    assert(html.includes('<td>비공개</td>'), '가린 행은 비공개');
    assert(html.includes('비공개 처리 1건'), '비공개 처리 n건');

    // (4) 다른 부서 행 상세 · 쓰기 권한 없음 → 검토 비활성 · 디버그 없음
    await page.locator('.tabulator-row').nth(1).locator('.tabulator-cell[tabulator-field="question"]').click();
    await page.getByText('질의 상세', { exact: true }).first().waitFor();
    await page.getByText('공정 기준서', { exact: false }).waitFor();
    assert(await page.getByRole('button', { name: '검토: 오답', exact: true }).isDisabled(), '검토 비활성');
    assert.equal(await page.getByText(/디버그 기록/).count(), 0, '디버그 없음');
    await page.getByRole('button', { name: '닫기', exact: true }).last().click();
    await page.waitForTimeout(300);

    // (11) 세션 보기 링크 — 상세가 아니라 세션으로
    await page.getByLabel('09-23 08:35:00 질의의 세션 보기', { exact: true }).click();
    await page.waitForURL(/view=session.*session=S-1|session=S-1.*view=session/);
    await page.waitForURL(/focus=62/);
    await page.getByLabel('선택한 질의').waitFor();
    assert.equal(await page.getByText('질의 상세', { exact: true }).count(), 0, '세션 링크는 상세 모달을 열지 않음');

    await page.getByText('질의 보기', { exact: true }).click();
    await page.getByText('판단 근거', { exact: true }).first().waitFor();

    // (8) 360px — 질의 표 마지막 「검토」
    await page.setViewportSize({ width: 360, height: 800 });
    await page.waitForTimeout(800);
    let last = await lastColumnVisible(page, 'review');
    assert(last.scrolled && last.head && last.cell && last.aligned, `360px 질의 표 검토 열 ${JSON.stringify(last)}`);
    await page.screenshot({ path: '/tmp/chat-history-360-message.png' }).catch(() => {});

    // (15) 360px — 세션 표 마지막 「검토」 · 행 클릭 → 전체 폭 상세 · 뒤로 가기
    await page.getByText('세션 보기', { exact: true }).first().click();
    await page.getByText('세션 시작', { exact: true }).first().waitFor();
    await page.waitForTimeout(600);
    last = await lastColumnVisible(page, 'reviewedCnt');
    assert(last.scrolled && last.head && last.cell && last.aligned, `360px 세션 표 검토 열 ${JSON.stringify(last)}`);
    await page.screenshot({ path: '/tmp/chat-history-360-session.png' }).catch(() => {});
    await page.locator('.tabulator-row').first().locator('.tabulator-cell').nth(1).click();
    await page.waitForURL(/session=S-1/);
    await page.getByRole('button', { name: '목록으로', exact: true }).waitFor();
    assert.equal(await page.getByText('세션 시작', { exact: true }).count(), 0, '좁은 화면은 전체 폭 상세만');
    await page.goBack();
    await page.getByText('세션 시작', { exact: true }).first().waitFor();
    // 360px 패널 잘림 없음
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.getByRole('button', { name: /엑셀 다운로드/ }).click();
    const pm = await page.getByRole('menuitem').first().boundingBox();
    assert(pm.x >= 0 && pm.x + pm.width <= 362, `360px 패널 잘림 없음 ${JSON.stringify(pm)}`);
    await page.keyboard.press('Escape');
    await page.setViewportSize({ width: 1440, height: 960 });

    /* ── 쓰기 권한 있음 ── */
    // 경로를 모두 풀면 그 사이 요청이 꺼진 8080 으로 가 세션이 끊길 수 있어, 새 흉내를 위에 덧씌웁니다(나중 경로가 먼저 받음)
    st = await setup(page, { canManage: true });
    await page.goto(`${WEB}/history/chat?view=message`);
    await page.getByText('판단 근거', { exact: true }).first().waitFor({ timeout: 30000 });
    const trainBtn = page.getByRole('button', { name: '학습데이터 내보내기', exact: true });
    assert(!(await trainBtn.isDisabled()), '학습데이터 활성');
    // (6) 학습데이터 내보내기
    await trainBtn.click();
    await page.getByText('질의 원문이 파일로 반출되며', { exact: false }).waitFor();
    const [tdl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: '내보내기', exact: true }).click()]);
    assert(tdl, '학습데이터 다운로드');
    assert.equal(st.trainset.at(-1).ratingFilter, 'USEFUL');
    assert.equal(st.trainset.at(-1).format, 'jsonl');
    // 디버그·검토
    await page.locator('.tabulator-row').nth(1).locator('.tabulator-cell[tabulator-field="question"]').click();
    await page.getByText(/디버그 기록/).waitFor();
    await page.getByPlaceholder('선택', { exact: true }).fill('기간을 잘못 잡음');
    await page.getByRole('button', { name: '검토: 오답', exact: true }).click();
    await page.waitForTimeout(500);
    assert.deepEqual(st.reviews.at(-1), { reviewCd: 'BAD', comment: '기간을 잘못 잡음' });

    // (7) 날짜 변경 시 필터가 사라지지 않음(전체 Loading 으로 바뀌지 않음)
    const dates = page.locator('input[type="date"], input[placeholder*="-"]');
    if (await dates.count()) {
      await dates.first().fill('2026-09-20').catch(() => {});
      await page.waitForTimeout(100);
      assert(await page.getByText('사용자 그룹', { exact: true }).count(), '재조회 중에도 필터 유지');
    }

    assert.equal(errors.length, 0, errors.join('\n'));
    console.log('PASS: chat-history — 옛 주소 이동, 보존 3년 안내, 기본 세션 보기·오른쪽 패널·시간순·가림, 엑셀 패널(두 항목·학습데이터 없음·Esc), 조회 목록=그리드(비공개 n건), 전체=서버 ALL, 질의 보기 세션 링크·강조, 쓰기 권한 없음 학습데이터·검토 비활성·디버그 없음, 360px 두 표 검토 열·전체 폭 상세·뒤로 가기, 쓰기 권한 있음 학습데이터 파일·검토 저장·디버그');
  } catch (e) {
    // 실패 원인 확인용 — 그 순간 화면 글자(토스트 포함)를 함께 남깁니다
    console.error('화면:', (await page.evaluate(() => document.body.innerText).catch(() => '')).slice(0, 800));
    throw e;
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exitCode = 1; });
