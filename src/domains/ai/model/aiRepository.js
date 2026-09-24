/**
 * [Model] AI 자연어 질의 리포지토리 (AI-01)
 */
import * as aiService from '@services/api/aiService';
import { command, unwrap } from '@services/api/request';
import llmAnswerTools from './llmAnswer.cjs';

/**
 * 세션 대화 복원
 *
 * 서버에 "현재 세션" 이라는 개념이 없습니다. 세션 ID 는 첫 질의 응답으로 받아
 * 화면이 들고 있다가 이어지는 요청에 실어 보냅니다.
 * 그래서 ID 가 없으면 서버를 부르지 않고 빈 대화로 시작합니다.
 */
export const loadSession = (sessionId) =>
  sessionId
    ? unwrap(aiService.getAiChatSessionsBySessionId({ sessionId }), { messages: [], sessionId })
    : Promise.resolve({ messages: [], sessionId: null });

/** 추천 질의 목록 */
export const loadSuggestions = () => unwrap(aiService.getAiChatSuggestions({}), { suggestions: [] });

/** 자연어 질의 요청 */
export const ask = (sessionId, question) => command(aiService.postAiChatAsk({ sessionId, question }));

/** 질문과 ask 검색 근거를 API 서버 LLM 프록시로 보내 생성 답변을 반환합니다. */
export async function askWithEvidence(question, priorMessages = [], messageId = null, askData = {}) {
  const response = await aiService.postLlmChat({
    messages: [
      ...priorMessages.slice(-10).map((message) => ({
        role: message.who === 'me' ? 'user' : 'assistant',
        content: message.text || message.llmAnswer || message.answerHtml || message.answer || '',
      })),
      { role: 'user', content: question },
    ],
    context: llmAnswerTools.formatLlmContext(askData),
    messageId,
  });
  return llmAnswerTools.parseLlmSse(response);
}

/** 새 대화 시작 (세션 맥락 초기화) */
export const startNewSession = (sessionId) => command(aiService.deleteAiChatSessionsBySessionId({ sessionId }));

/** 응답 결과 내려받기 */
export const exportMessage = (messageId, format = 'xls') =>
  command(aiService.postAiChatMessagesByMessageIdExport({ messageId, format }));

/** 응답 평가 (파인튜닝 학습데이터 후보) */
export const rateMessage = (messageId, rating) =>
  command(aiService.postAiChatMessagesByMessageIdFeedback({ messageId, rating }));

/** 음성 입력 변환 */
export const speechToText = () => command(aiService.postAiChatAsr({}));
