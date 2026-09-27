/** Regression checks for the AI session and XLSX contracts shared with API. */
const fs = require('fs');
const path = require('path');
const { suite, test, ok } = require('../lib/runner');

const read = (file) => fs.readFileSync(path.join(__dirname, '..', '..', file), 'utf8');

suite('AI 채팅 세션·내보내기 계약', () => {
  test('최근 세션 복원과 불량 Top 10 XLSX 경로가 endpoint catalog에 정의되어 있다', () => {
    const endpoints = read('src/services/api/endpoints.js');
    ok(endpoints.includes("path: '/api/v1/ai/chat/sessions/latest'"));
    ok(endpoints.includes("path: '/api/v1/ai/chat/defects/top/export'"));
    ok(/postAiChatDefectsTopExport:[\s\S]*?live: true/.test(endpoints));
  });

  test('latest session 복원·top export가 각 전용 service 경로를 사용한다', () => {
    const service = read('src/services/api/aiService.js');
    const repo = read('src/domains/ai/model/aiRepository.js');
    ok(/getAiChatSessionsLatest\(\)[\s\S]*?getAiChatSessionsLatest/.test(service));
    ok(/postAiChatDefectsTopExport\(params\)[\s\S]*?postAiChatDefectsTopExport/.test(service));
    ok(/exportTopDefects[\s\S]*?postAiChatDefectsTopExport/.test(repo));
    ok(!/exportTopDefects[\s\S]*?postAiChatMessagesByMessageIdExport/.test(repo));
  });

  test('LLM chat payload에 messageId와 sessionId를 보낸다', () => {
    const stream = read('src/services/api/llmStream.js');
    ok(/messageId, sessionId/.test(stream));
    ok(/\{\s*sessionId\s*\}/.test(stream));
  });

  test('Excel 다운로드는 표 결과에만 표시하고 Top 20은 전용 export로 보내지 않는다', () => {
    const controller = read('src/domains/ai/controller/useChatController.js');
    const view = read('src/domains/ai/view/ChatView.jsx');
    ok(/answerExportAvailable: data\.length > 0/.test(controller));
    ok(/limit > 10\) return null/.test(controller));
    ok(/hasTableResult && !message\.defectTopRange/.test(view));
    ok(/message\.blocks \|\| \[\]\)\.some\(\(block\) => block\.type === 'table'\)/.test(view));
    ok(/message\.defectTopRange \?/.test(view));
    ok(!/엑셀 다운로드/.test(view), '일반 응답 블록에 공통 Excel 버튼이 없어야 함');
  });

  test('질문 입력창의 음성·추천 버튼을 숨기고 기존 로고 입자 spinner를 사용한다', () => {
    const view = read('src/domains/ai/view/ChatView.jsx');
    const home = read('src/domains/ai/view/ChatHome.jsx');
    ok(view.includes("import SparkleSpinner from '@shared/components/ui/SparkleSpinner'"));
    ok(view.includes('<SparkleSpinner'));
    ok(!view.includes('음성'));
    ok(!view.includes('추천 질의'));
    ok(!view.includes('suggestions.map'));
    ok(!view.includes('근거 문서'));
    ok(!view.includes('contextOpen'));
    ok(!home.includes('빠른 질의'));
    ok(!home.includes('suggestions.map'));
  });

  test('운영 빌드는 현재 응답하는 API 8080 포트를 사용한다', () => {
    const build = read('scripts/build-deploy.cjs');
    ok(/DEPLOY_API_URL = 'http:\/\/192\.168\.2\.8:8080'/.test(build));
  });

  test('출처는 접고 펼칠 수 있으며 채팅 본문은 표가 들어갈 너비를 확보한다', () => {
    const view = read('src/domains/ai/view/ChatView.jsx');
    ok(/function SourceAccordion/.test(view));
    ok(/accessibilityState=\{\{ expanded \}\}/.test(view));
    ok(/Math\.max\(theme\.metrics\.contentColumn, 1120\)/.test(view));
  });
});
