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
    ? unwrap(aiService.getAiChatSessionsBySessionId({ sessionId }), { messages: [], sessionId }).then((res) => ({
        ...res,
        messages: (res?.messages || []).map(fromSessionMessage),
      }))
    : Promise.resolve({ messages: [], sessionId: null });

/**
 * 서버 이력 한 건 → 화면 말풍선
 *
 * 서버는 `{ who: 'user' | 'ai', html }` 로 줍니다. 화면은 `who: 'me' | 'ai'` 와 `text` 를 읽습니다
 * (그대로 쓰면 질문이 AI 말풍선으로, 답이 「응답 내용이 없습니다」로 보였습니다).
 * 사내 LLM 답은 마크다운 글로, 그 전의 검색 요약 답은 HTML 로 저장돼 있어 둘을 가려 둡니다.
 */
function fromSessionMessage(m) {
  const body = m?.html ?? m?.text ?? '';
  if (m?.who === 'user' || m?.who === 'me') return { ...m, who: 'me', text: body };
  const isHtml = /<\/?(p|ol|ul|li|br|div|strong|b)\b/i.test(body);
  return isHtml ? { ...m, who: 'ai', answerHtml: body } : { ...m, who: 'ai', llm: true, status: 'done', text: body };
}

/** 추천 질의 목록 */
export const loadSuggestions = () => unwrap(aiService.getAiChatSuggestions({}), { suggestions: [] });

/**
 * 자연어 질의 요청 — 사내 문서 검색 · 권한 마스킹 · 질의 이력 기록
 *
 * 답 문장은 여기서 받지 않습니다. 여기서 받은 근거(`sources[].snippet`)로 사내 LLM 에 다시 묻고
 * (services/api/llmStream.js), 받은 답은 서버가 이 질의 이력(`messageId`)에 저장합니다.
 */
export const ask = (sessionId, question) => command(aiService.postAiChatAsk({ sessionId, question }));

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
