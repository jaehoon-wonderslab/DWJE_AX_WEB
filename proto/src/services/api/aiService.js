/**
 * AI 자연어 질의 서비스 — API 7건
 *
 * 각 함수는 파라미터 객체 하나만 받습니다.
 * 경로 변수({param})는 이름이 같은 키에서 자동으로 채워지고, 나머지는
 * GET/DELETE 는 쿼리스트링, POST/PUT/PATCH 는 요청 바디로 전달됩니다.
 *
 * 사용 예)
 *   const res = await dashboardService.getDashboardAiSummary({ date: '2026-08-28' });
 *   if (res.success) setSummary(res.data);
 */
import { request } from './client';

/* ───────── 자연어 질의 ───────── */

/**
 * 자연어 질의 요청
 *
 * `POST /api/v1/ai/chat/ask`
 * @param {object} params sessionId, question
 * @returns {Promise<object>} messageId, intent(denied|unknown|trend|trace|downtime|metric), answerHtml, blocks[], agents[], sources[], followups[], elapsedMs
 * @remarks denied 분기 시 감사 로그 기록. unknown 분기는 답을 추정하지 않고 자료 소재 안내
 * @privateRemarks 접근 권한 전 부서 · 우선순위 1
 */
export function postAiChatAsk(params) {
  return request('postAiChatAsk', params);
}

/**
 * 세션 대화 조회
 *
 * `GET /api/v1/ai/chat/sessions/{sessionId}`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} messages[{who,html,intent,ts}]
 * @privateRemarks 접근 권한 전 부서 · 우선순위 1
 */
export function getAiChatSessionsBySessionId(params) {
  return request('getAiChatSessionsBySessionId', params);
}

/**
 * 새 대화 시작
 *
 * `DELETE /api/v1/ai/chat/sessions/{sessionId}`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} newSessionId
 * @remarks 세션 맥락 초기화
 * @privateRemarks 접근 권한 전 부서 · 우선순위 2
 */
export function deleteAiChatSessionsBySessionId(params) {
  return request('deleteAiChatSessionsBySessionId', params);
}

/**
 * 추천 질의 목록
 *
 * `GET /api/v1/ai/chat/suggestions`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} suggestions[{q,desc}]
 * @remarks 현장 빈출 질의 기반 갱신
 * @privateRemarks 접근 권한 전 부서 · 우선순위 2
 */
export function getAiChatSuggestions(params) {
  return request('getAiChatSuggestions', params);
}

/**
 * 응답 결과 내려받기
 *
 * `POST /api/v1/ai/chat/messages/{messageId}/export`
 * @param {object} params format(xls|csv)
 * @returns {Promise<object>} file(binary)
 * @remarks blind 항목 제외 후 저장
 * @privateRemarks 접근 권한 전 부서 · 우선순위 2
 */
export function postAiChatMessagesByMessageIdExport(params) {
  return request('postAiChatMessagesByMessageIdExport', params);
}

/**
 * 응답 평가
 *
 * `POST /api/v1/ai/chat/messages/{messageId}/feedback`
 * @param {object} params rating(good|bad), comment
 * @returns {Promise<object>} success
 * @remarks 파인튜닝 학습데이터 후보
 * @privateRemarks 접근 권한 전 부서 · 우선순위 2
 */
export function postAiChatMessagesByMessageIdFeedback(params) {
  return request('postAiChatMessagesByMessageIdFeedback', params);
}

/**
 * 음성 입력 변환
 *
 * `POST /api/v1/ai/chat/asr`
 * @param {object} params audio(multipart)
 * @returns {Promise<object>} text
 * @remarks 현장 PC·PDA 용. 프로토타입 미동작
 * @privateRemarks 접근 권한 전 부서 · 우선순위 3
 */
export function postAiChatAsr(params) {
  return request('postAiChatAsr', params);
}
