/**
 * 생산관리 서비스 — API 18건
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

/* ───────── 생산 모니터링 ───────── */

/**
 * 모니터링 요약
 *
 * `GET /api/v1/production/monitor/summary`
 * @param {object} params processId
 * @returns {Promise<object>} running, warning, stopped, hourlyThroughput, stoppedDetail
 * @privateRemarks 접근 권한 품질보증팀·생산관리팀·제조팀·통합관리자 · 우선순위 1
 */
export function getProductionMonitorSummary(params) {
  return request('getProductionMonitorSummary', params);
}

/**
 * 설비별 실시간 현황
 *
 * `GET /api/v1/production/monitor/equipments`
 * @param {object} params lineRange, model, state, page, size
 * @returns {Promise<object>} items[{eqptCd,model,qty,defectRate,uptimeRate,strokeSpeed,lastCollectedAt,state}], meta
 * @remarks 10초 폴링. 운영 시 SSE 검토
 * @privateRemarks 접근 권한 상동 · 우선순위 1
 */
export function getProductionMonitorEquipments(params) {
  return request('getProductionMonitorEquipments', params);
}

/* ───────── 실적 집계·조회 ───────── */

/**
 * 실적 집계 조회
 *
 * `GET /api/v1/production/results`
 * @param {object} params from, to, unit(day|week|month), itemCd, lineCd, page, size
 * @returns {Promise<object>} items[{period,inputQty,okQty,ngQty,defectRate,uptimeRate,downtimeMin}], summary, meta
 * @privateRemarks 접근 권한 품질보증팀·생산관리팀·경영진·통합관리자 · 우선순위 1
 */
export function getProductionResults(params) {
  return request('getProductionResults', params);
}

/**
 * 실적 추이 차트
 *
 * `GET /api/v1/production/results/trend`
 * @param {object} params from, to, unit, itemCd
 * @returns {Promise<object>} labels[], series[]
 * @privateRemarks 접근 권한 상동 · 우선순위 1
 */
export function getProductionResultsTrend(params) {
  return request('getProductionResultsTrend', params);
}

/* ───────── 일일 생산현황 보고 ───────── */

/**
 * 보고서 초안 조회
 *
 * `GET /api/v1/production/daily-reports/draft`
 * @param {object} params targetDate
 * @returns {Promise<object>} reportId, version, state, periodFrom, periodTo, generatedAt, sections[], summary
 * @remarks 전일 08:00~당일 08:00
 * @privateRemarks 접근 권한 생산관리팀·통합관리자 · 우선순위 1
 */
export function getProductionDailyReportsDraft(params) {
  return request('getProductionDailyReportsDraft', params);
}

/**
 * 조간회의 자료 본문 — 제품별 한 행
 *
 * 집계 구간은 서버가 대상일로 정합니다(전일 20:00 ~ 당일 08:00).
 * `processId` 를 빼면 프레스 작업장 전부입니다.
 *
 * @param {object} params targetDate, processId
 * @returns {Promise<object>} periodFrom, periodTo, weekFrom, rows[]
 */
export function getProductionDailyReportsSheet(params) {
  return request('getProductionDailyReportsSheet', params);
}

/**
 * 조간회의 자료 행 저장 — 작성자가 채운 일목표 · 결정항목 · DRI · 기한
 *
 * 보낸 제품만 갱신합니다. 값에 null 을 보내면 그 칸을 비웁니다.
 * 저장 키는 (보고서, 제품)이라 같은 제품이 여러 작업장에 있으면 값을 함께 씁니다.
 *
 * @param {object} params reportId, rows[{product, targetQty, decision, dri, due}]
 */
export function postProductionDailyReportsByReportIdRows(params) {
  return request('postProductionDailyReportsByReportIdRows', params);
}

/**
 * 보고서 초안 재생성
 *
 * `POST /api/v1/production/daily-reports/draft/regenerate`
 * @param {object} params targetDate
 * @returns {Promise<object>} reportId, version
 * @remarks 기존 초안 버전 증가
 * @privateRemarks 접근 권한 생산관리팀·통합관리자 · 우선순위 1
 */
export function postProductionDailyReportsDraftRegenerate(params) {
  return request('postProductionDailyReportsDraftRegenerate', params);
}

/**
 * 보고서 항목 보정
 *
 * `PUT /api/v1/production/daily-reports/{reportId}`
 * @param {object} params sections[], remark
 * @returns {Promise<object>} reportId, correctionCnt
 * @remarks 보정 건수 기록
 * @privateRemarks 접근 권한 생산관리팀·통합관리자 · 우선순위 1
 */
export function putProductionDailyReportsByReportId(params) {
  return request('putProductionDailyReportsByReportId', params);
}

/**
 * 보고서 임시 저장
 *
 * `POST /api/v1/production/daily-reports/{reportId}/save`
 * @param {object} params sections[]
 * @returns {Promise<object>} success
 * @privateRemarks 접근 권한 생산관리팀·통합관리자 · 우선순위 2
 */
export function postProductionDailyReportsByReportIdSave(params) {
  return request('postProductionDailyReportsByReportIdSave', params);
}

/**
 * 보고서 확정
 *
 * `POST /api/v1/production/daily-reports/{reportId}/confirm`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} state, confirmedAt, confirmedBy
 * @remarks 확정 후 수정 불가
 * @privateRemarks 접근 권한 생산관리팀·통합관리자 · 우선순위 1
 */
export function postProductionDailyReportsByReportIdConfirm(params) {
  return request('postProductionDailyReportsByReportIdConfirm', params);
}

/**
 * 보고서 반려
 *
 * `POST /api/v1/production/daily-reports/{reportId}/reject`
 * @param {object} params reason
 * @returns {Promise<object>} state
 * @privateRemarks 접근 권한 생산관리팀·통합관리자 · 우선순위 1
 */
export function postProductionDailyReportsByReportIdReject(params) {
  return request('postProductionDailyReportsByReportIdReject', params);
}

/**
 * 보고서 생성 이력
 *
 * `GET /api/v1/production/daily-reports/{reportId}/events`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} events[{ts,type,detail,by}]
 * @privateRemarks 접근 권한 생산관리팀·통합관리자 · 우선순위 2
 */
export function getProductionDailyReportsByReportIdEvents(params) {
  return request('getProductionDailyReportsByReportIdEvents', params);
}

/* ───────── 이전 보고서 ───────── */

/**
 * 보고서 이력 조회
 *
 * `GET /api/v1/production/daily-reports`
 * @param {object} params from, to, state, page, size
 * @returns {Promise<object>} items[{targetDate,version,state,generatedAt,confirmedAt,correctionCnt}], meta
 * @privateRemarks 접근 권한 생산관리팀·통합관리자 · 우선순위 1
 */
export function getProductionDailyReports(params) {
  return request('getProductionDailyReports', params);
}

/**
 * 보고서 복제
 *
 * `POST /api/v1/production/daily-reports/{reportId}/copy`
 * @param {object} params targetDate
 * @returns {Promise<object>} newReportId
 * @remarks 구조 유지·기간만 변경
 * @privateRemarks 접근 권한 생산관리팀·통합관리자 · 우선순위 2
 */
export function postProductionDailyReportsByReportIdCopy(params) {
  return request('postProductionDailyReportsByReportIdCopy', params);
}

/* ───────── 비가동 관리 ───────── */

/**
 * 비가동 요약
 *
 * `GET /api/v1/production/downtimes/summary`
 * @param {object} params date
 * @returns {Promise<object>} totalMin, registeredCnt, unregisteredCnt, byReason[]
 * @privateRemarks 접근 권한 생산관리팀·제조팀·통합관리자 · 우선순위 1
 */
export function getProductionDowntimesSummary(params) {
  return request('getProductionDowntimesSummary', params);
}

/**
 * 비가동 이력 조회
 *
 * `GET /api/v1/production/downtimes`
 * @param {object} params date, eqptCd, reasonCd, registered, page, size
 * @returns {Promise<object>} items[{eqptCd,stopAt,resumeAt,elapsedMin,registered,reasonCd,reasonNm,remark}], meta
 * @remarks 미등록 구간 포함
 * @privateRemarks 접근 권한 생산관리팀·제조팀·통합관리자 · 우선순위 1
 */
export function getProductionDowntimes(params) {
  return request('getProductionDowntimes', params);
}

/**
 * Agent 사유 후보 제안
 *
 * `GET /api/v1/production/downtimes/reason-suggestion`
 * @param {object} params eqptCd, stopAt
 * @returns {Promise<object>} candidates[{reasonCd,reasonNm,confidence,basis}]
 * @remarks ⑨ 이상 알림 Agent
 * @privateRemarks 접근 권한 생산관리팀·제조팀·통합관리자 · 우선순위 1
 */
export function getProductionDowntimesReasonSuggestion(params) {
  return request('getProductionDowntimesReasonSuggestion', params);
}

/**
 * 비가동 사유 등록
 *
 * `POST /api/v1/production/downtimes`
 * @param {object} params eqptCd, stopAt, resumeAt, reasonCd, remark
 * @returns {Promise<object>} downtimeId
 * @remarks 가동률(KPI③) 산출 근거
 * @privateRemarks 접근 권한 생산관리팀·제조팀·통합관리자 · 우선순위 1
 */
export function postProductionDowntimes(params) {
  return request('postProductionDowntimes', params);
}

/**
 * 비가동 사유 수정
 *
 * `PUT /api/v1/production/downtimes/{downtimeId}`
 * @param {object} params reasonCd, remark, resumeAt
 * @returns {Promise<object>} success
 * @remarks 변경 이력 보존
 * @privateRemarks 접근 권한 생산관리팀·제조팀·통합관리자 · 우선순위 2
 */
export function putProductionDowntimesByDowntimeId(params) {
  return request('putProductionDowntimesByDowntimeId', params);
}

/**
 * 실적 집계 내려받기 (백엔드 구현 확장분)
 *
 * `POST /api/v1/production/results/export`
 * @param {object} params fromDate, toDate, procCd, itemCd, format
 */
export function postProductionResultsExport(params) {
  return request('postProductionResultsExport', params);
}
