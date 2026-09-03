/**
 * 이상 알림 서비스 — API 5건
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

/* ───────── 알림 목록·상세 ───────── */

/**
 * 알림 목록 조회
 *
 * `GET /api/v1/alerts`
 * @param {object} params type, eqptCd, period(today|7d|30d), state, page, size
 * @returns {Promise<object>} items[{alertId,level,type,eqptCd,basisValue,threshold,agent,occurredAt,elapsed,ackState}], meta
 * @remarks 심각도 + 최신 순 정렬
 * @privateRemarks 접근 권한 전 부서 · 우선순위 1
 */
export function getAlerts(params) {
  return request('getAlerts', params);
}

/**
 * 알림 상세 조회
 *
 * `GET /api/v1/alerts/{alertId}`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} eqptCd, eqptNm, lotNo, basisValue, threshold, mainDefectType, causeCandidates[], recommendation, agent
 * @privateRemarks 접근 권한 전 부서 · 우선순위 1
 */
export function getAlertsByAlertId(params) {
  return request('getAlertsByAlertId', params);
}

/**
 * 알림 확인 처리
 *
 * `POST /api/v1/alerts/{alertId}/ack`
 * @param {object} params actionNote
 * @returns {Promise<object>} ackAt, ackBy
 * @privateRemarks 접근 권한 전 부서 · 우선순위 1
 */
export function postAlertsByAlertIdAck(params) {
  return request('postAlertsByAlertIdAck', params);
}

/**
 * 승격 대상 조회
 *
 * `GET /api/v1/alerts/escalation-targets`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} stages[{stage,waitMin,targets[]}]
 * @privateRemarks 접근 권한 전 부서 · 우선순위 2
 */
export function getAlertsEscalationTargets(params) {
  return request('getAlertsEscalationTargets', params);
}

/**
 * 알림 발송 로그 조회
 *
 * `GET /api/v1/alerts/send-logs`
 * @param {object} params from, to, condId, channel, page, size
 * @returns {Promise<object>} items[{ts,condNm,channel,recipient,result,delaySec}], meta
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 2
 */
export function getAlertsSendLogs(params) {
  return request('getAlertsSendLogs', params);
}
