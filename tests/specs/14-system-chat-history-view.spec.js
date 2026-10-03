/**
 * Regression checks for the system chat-history presentation contract.
 * 2026-10-01 08 기획서(CHH-01·04·05·11·12·16·18·19) 에 맞춰 갱신했습니다.
 * 2026-10-03 — /history/chat 은 본인 이력(scope=mine), 전 사용자 · 관리 기능은 /system/chat-history(sys-chat-history).
 * 2026-10-03 (2차) — /history/chat 은 질의 표 하나(보기 전환 · 세션 목록 · 행 상세 모달 없음), 근거 문서 · 평가 · 대화를 열로.
 *   sys-chat-history 는 관리 화면(ADMIN_SCREENS, 통합관리자 전용).
 */
const fs = require('fs');
const path = require('path');
const { suite, test, ok } = require('../lib/runner');

const read = (file) => fs.readFileSync(path.join(__dirname, '..', '..', file), 'utf8');

suite('시스템 채팅 이력 표시 계약', () => {
  test('질의 표 열 — 근거 문서·LLM 메타·평가·대화를 열로 두고 intent/agent 원문·상세 모달을 쓰지 않는다', () => {
    const view = read('src/domains/system/view/ChatHistoryView.jsx');
    ['질문 시간', '질문', '응답', '판단 근거', '근거 문서', '응답 시간', '모델', '토큰', '답변 상태', '의도', '평가', '대화']
      .forEach((t) => ok(view.includes(`title: '${t}'`), `열 ${t}`));
    ok(view.includes('답변 평가 기준'), '답변 평가 기준 안내');
    ok(!/title: '답변 시간'|title: '미응답 사유'/.test(view), '답변 시간 · 미응답 사유 열 없음');
    ok(!/openModal|onRowPress|loadDetail/.test(view), '행 상세 모달 없음');
    ok(!/<Tabs|setView|label: '세션 보기'/.test(view), '보기 전환 없음');
    ok(view.includes('대화 보기 ›'), '대화 보기');
    ok(!view.includes('해석된 의도'));
    ok(!view.includes('호출 Agent'));
    ok(!view.includes('agentsText'));
  });

  test('본인 이력 화면에는 검토·디버그·학습데이터·사용자 그룹이 없다', () => {
    const view = read('src/domains/system/view/ChatHistoryView.jsx');
    const controller = read('src/domains/system/controller/useChatHistoryController.js');
    ok(!/key: 'review'/.test(view), '검토 열 없음');
    ok(!/검토\(관리자\)|검토: 유용/.test(view), '검토 단추 없음');
    ok(!/DebugTable|디버그/.test(view), '디버그 없음');
    ok(!/학습데이터 내보내기/.test(view), '학습데이터 없음');
    ok(!/사용자 그룹/.test(view), '사용자 그룹 조건 없음');
    ok(!/전 사용자/.test(view), '「전 사용자」 문구 없음');
    ok(/const SCOPE = 'mine'/.test(controller), 'scope=mine');
    ok(!/exportTrainset|reviewChatMessage|canManage/.test(controller), '관리 기능 없음');
  });

  test('질의 표는 경계·가로 스크롤·넓은 줄바꿈 열을 쓰고 「답변 평가 기준」 은 표 열로 두지 않는다(CHH-11)', () => {
    const view = read('src/domains/system/view/ChatHistoryView.jsx');
    ok(/minWidth=\{2280\}/.test(view));
    ok(/bordered/.test(view));
    ok(/width: 320, minWidth: 320, wrap: true/.test(view));
    ok(!/key: 'evaluationCriteria'/.test(view), '표에 답변 평가 기준 열 없음');
  });

  test('controller 는 서버 정렬을 그대로 쓰고(현재 쪽 재정렬 없음) 요약 필드명을 맞춘다', () => {
    const controller = read('src/domains/system/controller/useChatHistoryController.js');
    ok(!/return tb - ta/.test(controller), '현재 쪽 재정렬 제거(CHH-12)');
    ok(/answerRate: rawSummary\.answerRate/.test(controller));
  });

  test('요약·목록·세션 요청은 scope 를 붙이고 부서 조건은 scope=all 일 때만 보낸다', () => {
    const repository = read('src/domains/system/model/systemRepository.js');
    ok(/scope === 'all'\s*\n?\s*\? \{ scope: 'all', userGroup: group, empNo \}\s*\n?\s*: \{ scope: 'mine' \}/.test(repository), 'chatScopeParams');
    ok(/export function normChatRow/.test(repository), 'LLM 메타 정리(normChatRow)');
    ok(/getAiChatHistorySummary\(\{ \.\.\.sp, from, to, keyword \}\)/.test(repository));
    ok(/getAiChatHistorySessions\(\{ \.\.\.sp, from, to, keyword, rating, review, answered, page, size \}\)/.test(repository));
    ok(/putAiChatHistoryByMessageIdTrainAnswer/.test(repository), '학습 데이터 답변 저장');
  });

  test('전사 화면 — 관리 기능(디버그·검토·학습데이터·답변 추가)은 canManage 로 판정한다', () => {
    const view = read('src/domains/system/view/ChatHistoryAdminView.jsx');
    const controller = read('src/domains/system/controller/useChatHistoryAdminController.js');
    ok(!/userInfo\?\.dept === '통합관리자'/.test(view), '부서명 문자열 판정 제거');
    ok(/const SCOPE = 'all'/.test(controller), 'scope=all');
    ok(/rawSummary\?\.canManage \?\? canWriteScreen/.test(controller));
    ok(/const debug = canManage \? d\.debug \?\? null : null/.test(view));
    ok(/학습데이터 내보내기" size="sm" icon="upload" disabled=\{!canManage\}/.test(view));
    ok(/allowed=\{canManage\}/.test(view), '답변 추가 단추');
    ['사용자', '질문', '답변', '판단 근거', '미응답 사유', '사용자 평가', '검토', '질문 시간', '답변 시간', '응답 시간', '모델', '토큰', '답변 상태', '의도', '답변 추가(학습 데이터)']
      .forEach((t) => ok(view.includes(`title: '${t}'`), `열 ${t}`));
    ['사용자 그룹', '사용자(사번)', 'label="검색"', 'label="평가"', 'label="검토"', 'label="응답"', '세션 보기', '요청 ID'].forEach((t) => ok(view.includes(t), `전사 화면 ${t}`));
  });

  test('전사 자연어 질의 이력은 관리 화면(통합관리자 전용)이고 기본 부서 권한이 없다', () => {
    const picker = read('src/domains/system/view/AccountMenuPicker.jsx');
    const mock = read('src/services/mock/systemMock.js');
    const fields = read('src/shared/constants/dataFields.js');
    ok(/ADMIN_SCREENS = \[[^\]]*'sys-chat-history'/.test(picker), 'ADMIN_SCREENS');
    ok(/MOCK_ADMIN_SCREENS = \[[^\]]*'sys-chat-history'/.test(mock), 'MOCK_ADMIN_SCREENS');
    const block = fields.slice(fields.indexOf('export const MENU_ACCESS_DEFAULT'), fields.indexOf('통합관리자: \'*\''));
    ok(!block.includes("'sys-chat-history'"), '기본 부서 행 없음');
  });
});
