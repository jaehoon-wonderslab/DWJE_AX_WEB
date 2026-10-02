/**
 * Regression checks for the system chat-history presentation contract.
 * 2026-10-01 08 기획서(CHH-01·04·05·11·12·16·18·19) 에 맞춰 갱신했습니다.
 */
const fs = require('fs');
const path = require('path');
const { suite, test, ok } = require('../lib/runner');

const read = (file) => fs.readFileSync(path.join(__dirname, '..', '..', file), 'utf8');

suite('시스템 채팅 이력 표시 계약', () => {
  test('상세에 질문·응답·근거·미응답·시간·평가기준을 두고 intent/agent를 노출하지 않는다', () => {
    const view = read('src/domains/system/view/ChatHistoryView.jsx');
    ['질의', '응답', '판단 근거', '근거 문서', '미응답 사유', '응답 시간', '답변 평가 기준', '검토(관리자)'].forEach((label) => ok(view.includes(label), `${label} 표시`));
    ok(!view.includes('해석된 의도'));
    ok(!view.includes('호출 Agent'));
    ok(!view.includes('agentsText'));
  });

  test('질의 표는 경계·가로 스크롤(1850)·넓은 줄바꿈 열·검토 열을 쓰고 「답변 평가 기준」 은 표에서 뺀다(CHH-11)', () => {
    const view = read('src/domains/system/view/ChatHistoryView.jsx');
    ok(/minWidth=\{1850\}/.test(view));
    ok(/minWidth=\{1200\}/.test(view), '세션 표 1200');
    ok(/bordered/.test(view));
    ok(/width: 390, minWidth: 390, wrap: true/.test(view));
    ok(/key: 'review', title: '검토', width: 90/.test(view));
    ok(!/key: 'evaluationCriteria'/.test(view), '표에 답변 평가 기준 열 없음');
  });

  test('controller 는 서버 정렬을 그대로 쓰고(현재 쪽 재정렬 없음) 요약 필드명을 맞춘다', () => {
    const controller = read('src/domains/system/controller/useChatHistoryController.js');
    ok(!/return tb - ta/.test(controller), '현재 쪽 재정렬 제거(CHH-12)');
    ok(/answerRate: rawSummary\.answerRate/.test(controller));
  });

  test('요약·목록·세션 요청은 화면의 날짜·사용자 그룹·검색어를 같이 전달한다', () => {
    const repository = read('src/domains/system/model/systemRepository.js');
    ok(/getAiChatHistorySummary\(\{ from, to, userGroup: group, keyword \}\)/.test(repository));
    ok(/getAiChatHistorySessions\(\{ from, to, userGroup: group, keyword, rating, review, answered, page, size \}\)/.test(repository));
  });

  test('관리 기능(디버그·검토·학습데이터)은 쓰기 권한(canManage)으로 판정한다', () => {
    const view = read('src/domains/system/view/ChatHistoryView.jsx');
    const controller = read('src/domains/system/controller/useChatHistoryController.js');
    ok(!/userInfo\?\.dept === '통합관리자'/.test(view), '부서명 문자열 판정 제거');
    ok(/rawSummary\?\.canManage \?\? canWriteScreen/.test(controller));
    ok(/const debug = canManage \? d\.debug \?\? null : null/.test(view));
    ok(/학습데이터 내보내기" size="sm" icon="upload" disabled=\{!canManage\}/.test(view));
  });
});
