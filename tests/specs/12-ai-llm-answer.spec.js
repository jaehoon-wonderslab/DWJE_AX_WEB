const { suite, test, eq, contains } = require('../lib/runner');
const fs = require('fs');
const path = require('path');
const { formatLlmContext, parseLlmSse, mergeAssistantResponse, shouldGenerateAnswer, formatCitationSources, formatChatError } = require('../../src/domains/ai/model/llmAnswer.cjs');
const smallTalkReply = require('../../src/domains/ai/model/smallTalk.cjs');

suite('AI 검색 근거와 LLM 답변 연결', () => {
  test('수치 및 문서 검색 근거를 번호와 함께 LLM context에 담는다', async () => {
    const context = formatLlmContext({
      dataEvidence: [{ title: '오늘 불량 집계', text: '불량 A 12건, 불량 B 8건' }],
      sources: [{ title: '품질 보고서', docDate: '2026-09-24', page: 3, snippet: '불량 A의 주요 원인은 접합 불량이다.' }],
      blocks: [{ type: 'sources', rows: [] }],
    });
    contains(context, '[1] 오늘 불량 집계');
    contains(context, '[2] 품질 보고서 (2026-09-24 · p.3)');
    contains(context, '불량 A의 주요 원인은 접합 불량이다.');
    eq(context.includes('[확인된 근거 없음]'), false);
  });

  test('근거가 없을 때 최신 외부 사실을 지어내지 않도록 한계를 전달한다', async () => {
    const context = formatLlmContext({ sources: [], dataEvidence: [], blocks: [] });
    contains(context, '[확인된 근거 없음]');
    contains(context, '길 안내');
    contains(context, '지어내지 말고');
  });

  test('근거가 있는 업무 질문도 생성 답변 경로에 보내고 거부 응답은 보내지 않는다', async () => {
    eq(shouldGenerateAnswer('metric'), true);
    eq(shouldGenerateAnswer('trend'), true);
    eq(shouldGenerateAnswer('unknown'), true);
    eq(shouldGenerateAnswer('denied'), false);
  });

  test('단독 인사와 감사만 로컬 응답하고 짧은 사실 질문은 ask 흐름으로 통과시킨다', async () => {
    eq(smallTalkReply('안녕'), '안녕하세요! 무엇을 도와드릴까요?');
    eq(smallTalkReply('감사합니다.'), '천만에요! 더 궁금한 점이 있으면 말씀해 주세요.');
    eq(smallTalkReply('안녕, 불량률은?'), null);
    eq(smallTalkReply('고마워요. 오늘 생산량 알려줘'), null);
    eq(smallTalkReply('수율?'), null);
  });

  test('로컬 대화 분기 뒤의 나머지 질문은 ask와 근거 기반 생성 흐름을 유지한다', async () => {
    const controller = fs.readFileSync(path.join(__dirname, '../../src/domains/ai/controller/useChatController.js'), 'utf8');
    const localReply = controller.indexOf('const smallTalk = smallTalkReply(question)');
    const askCall = controller.indexOf('res = await ask(sessionId, question)');
    const evidenceCall = controller.indexOf('askWithEvidence(question, messages, res.data.messageId, res.data)');
    eq(localReply >= 0 && localReply < askCall && askCall < evidenceCall, true);
  });

  test('SSE의 여러 delta 조각을 순서대로 합친다', async () => {
    const response = [
      'data: {"choices":[{"delta":{"content":"오늘 불량은 "}}]}',
      'data: {"choices":[{"delta":{"content":"A가 가장 많습니다 [1]."}}]}',
      'data: [DONE]',
    ].join('\n');
    eq(parseLlmSse(response), '오늘 불량은 A가 가장 많습니다 [1].');
    eq(parseLlmSse({ success: true, data: response }), '오늘 불량은 A가 가장 많습니다 [1].');
  });

  test('401 인증 실패, 502 게이트웨이 오류, 500 서버 오류를 구분하고 서버 원문은 노출하지 않는다', async () => {
    contains(formatChatError({ code: 'E-AUTH-001', httpStatus: 401, message: 'sensitive server detail' }), '401 / E-AUTH-001');
    contains(formatChatError({ code: 'E-SERVER', httpStatus: 500 }), '500 / E-SERVER');
    contains(formatChatError({ code: 'E-LLM-001', httpStatus: 502 }), '502 / E-LLM-001');
    contains(formatChatError({ code: 'E-LLM-001', httpStatus: 502 }), '인증 또는 연결');
    contains(formatChatError({ code: 'E-LLM-004', httpStatus: 502 }), '게이트웨이가 요청을 거부했습니다');
    contains(formatChatError({ code: 'E-LLM-004', httpStatus: 502 }), '502 / E-LLM-004');
    eq(formatChatError({ httpStatus: 502 }).includes('E-LLM-001'), true);
    eq(formatChatError({ code: 'E-LLM-004', httpStatus: 502 }).includes('E-LLM-001'), false);
    eq(formatChatError({ code: 'E-AUTH-001', message: 'sensitive server detail' }).includes('sensitive'), false);
  });

  test('LLM 프록시 오류 envelope에서 오류 코드와 HTTP 상태를 보존한다', async () => {
    let thrown;
    try { parseLlmSse({ success: false, code: 'E-AUTH-001', httpStatus: 401, message: 'private detail' }); } catch (error) { thrown = error; }
    eq(thrown?.code, 'E-AUTH-001');
    eq(thrown?.status, 401);
    contains(formatChatError(thrown), '401 / E-AUTH-001');
  });

  test('생성 답변을 ask 응답에 병합해 blocks와 출처를 유지한다', async () => {
    const askData = {
      intent: 'metric',
      blocks: [{ type: 'sources', rows: [{ title: '품질 보고서' }] }],
      sources: [{ title: '품질 보고서', page: 3 }],
    };
    eq(mergeAssistantResponse(askData, '불량 A가 1위입니다 [1].'), {
      ...askData,
      llmAnswer: '불량 A가 1위입니다 [1].',
    });
  });

  test('출처 번호가 LLM context의 데이터 근거 다음에 이어진다', async () => {
    eq(formatCitationSources({
      dataEvidence: [{ title: '오늘 불량 집계', text: 'A 12건' }],
      sources: [{ title: '품질 보고서', docDate: '2026-09-24', page: 3 }],
    }), [
      { number: 1, title: '오늘 불량 집계', detail: 'A 12건' },
      { number: 2, title: '품질 보고서', detail: '2026-09-24 · p.3' },
    ]);
  });

  test('Chat UI는 blocks가 있어도 생성 답변을 출처보다 먼저 렌더링한다', async () => {
    const view = fs.readFileSync(path.join(__dirname, '../../src/domains/ai/view/ChatView.jsx'), 'utf8');
    const answer = view.indexOf('{message.llmAnswer ?');
    const blocks = view.indexOf('{(message.blocks || []).length ?');
    const sources = view.indexOf('{citationSources.length ?');
    eq(answer >= 0 && answer < blocks && blocks < sources, true);
  });

  test('Chat UI는 생성 실패 안내를 근거 블록과 출처보다 먼저 표시한다', async () => {
    const view = fs.readFileSync(path.join(__dirname, '../../src/domains/ai/view/ChatView.jsx'), 'utf8');
    const warning = view.indexOf('{message.generationWarning ?');
    const blocks = view.indexOf('{(message.blocks || []).length ?');
    const sources = view.indexOf('{citationSources.length ?');
    eq(warning >= 0 && warning < blocks && blocks < sources, true);
  });
});
