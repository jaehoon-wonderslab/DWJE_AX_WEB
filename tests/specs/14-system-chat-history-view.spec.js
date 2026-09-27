/** Regression checks for the system chat-history presentation contract. */
const fs = require('fs');
const path = require('path');
const { suite, test, ok } = require('../lib/runner');

const read = (file) => fs.readFileSync(path.join(__dirname, '..', '..', file), 'utf8');

suite('시스템 채팅 이력 표시 계약', () => {
  test('상세에 질문·응답·근거·미응답·시간·평가기준을 두고 intent/agent를 노출하지 않는다', () => {
    const view = read('src/domains/system/view/ChatHistoryView.jsx');
    ['질의', '응답', '판단 근거', '미응답 사유', '응답 시간', '답변 평가 기준'].forEach((label) => ok(view.includes(label), `${label} 표시`));
    ok(!view.includes('해석된 의도'));
    ok(!view.includes('호출 Agent'));
    ok(!view.includes('agentsText'));
  });

  test('표는 경계·가로 스크롤·넓은 줄바꿈 열을 사용하고 controller가 최신순 정렬한다', () => {
    const view = read('src/domains/system/view/ChatHistoryView.jsx');
    const controller = read('src/domains/system/controller/useChatHistoryController.js');
    ok(/minWidth=\{2050\}/.test(view));
    ok(/bordered/.test(view));
    ok(/width: 390, minWidth: 390, wrap: true/.test(view));
    ok(/return tb - ta/.test(controller));
    ok(/answerRate: raw\.answerRate/.test(controller));
  });

  test('요약 요청은 화면의 날짜와 사용자 그룹 조건을 같이 전달한다', () => {
    const repository = read('src/domains/system/model/systemRepository.js');
    ok(/getAiChatHistorySummary\(\{ from, to, userGroup: group \}\)/.test(repository));
  });

  test('디버그 상세는 통합관리자에만 표시한다', () => {
    const view = read('src/domains/system/view/ChatHistoryView.jsx');
    ok(/userInfo\?\.dept === '통합관리자'/.test(view));
    ok(/const debugTrace = d\.debugTrace \?\? d\.debugDetails/.test(view));
    ok(/isIntegratedAdmin \? \([\s\S]*?디버그 기록 · 통합관리자 전용/.test(view));
  });
});
