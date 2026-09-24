/**
 * [Model] AI 자연어 질의 리포지토리 (AI-01)
 */
import * as aiService from '@services/api/aiService';
import { command, unwrap } from '@services/api/request';

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

/** 근거가 없는 일반 대화는 API 서버의 LLM 프록시로 보내 답변 텍스트를 반환합니다. */
export async function askGeneral(question, priorMessages = [], messageId = null) {
  const response = await aiService.postLlmChat({
    messages: [
      ...priorMessages.slice(-10).map((message) => ({
        role: message.who === 'me' ? 'user' : 'assistant',
        content: message.text || message.answerHtml || message.answer || '',
      })),
      { role: 'user', content: question },
    ],
    context: '일반 대화 요청입니다. 업무 데이터나 문서 근거가 없는 인사와 일상 대화에는 자연스럽게 응답하세요. 확인되지 않은 업무 수치나 사실은 만들지 마세요.',
    messageId,
  });
  const chunks = [];
  for (const line of String(response || '').split(/\r?\n/)) {
    if (!line.startsWith('data:')) continue;
    const data = line.slice(5).trim();
    if (!data || data === '[DONE]') continue;
    try {
      const text = JSON.parse(data)?.choices?.[0]?.delta?.content;
      if (typeof text === 'string') chunks.push(text);
    } catch {
      // SSE keepalive 또는 비 JSON 이벤트는 건너뜁니다.
    }
  }
  return chunks.join('').trim();
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
