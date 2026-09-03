/**
 * 보고서 서비스 — API 20건
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

/* ───────── 아침회의 자료 (PRESS) ───────── */

/**
 * PRESS 아침회의 자료 조회
 *
 * `GET /api/v1/reports/press-morning`
 * @param {object} params baseDate, processScope, state
 * @returns {Promise<object>} summary{dayTarget,dayActual,avgRate,issueCnt}, rows[{state,process,issue,dayTarget,dayActual,rate,weekTarget,weekActual,weekRate,impactEqptCnt,decision,dri,due}], total{}
 * @remarks 신호등 판정
 * @privateRemarks 접근 권한 생산관리팀·제조팀·통합관리자 · 우선순위 1
 */
export function getReportsPressMorning(params) {
  return request('getReportsPressMorning', params);
}

/**
 * 금일 결정 사항·DRI 조회
 *
 * `GET /api/v1/reports/press-morning/decisions`
 * @param {object} params baseDate
 * @returns {Promise<object>} items[{team,action,dri,due}]
 * @privateRemarks 접근 권한 생산관리팀·제조팀·통합관리자 · 우선순위 2
 */
export function getReportsPressMorningDecisions(params) {
  return request('getReportsPressMorningDecisions', params);
}

/* ───────── 아침회의 자료 (Plating·Coating) ───────── */

/**
 * Plating·Coating 아침회의 자료 조회
 *
 * `GET /api/v1/reports/plating-morning`
 * @param {object} params baseDate, processScope(all|A Plating|B Plating|Coating), state
 * @returns {Promise<object>} summary{}, rows[], total{}
 * @remarks 11개 라인
 * @privateRemarks 접근 권한 생산관리팀·제조팀·통합관리자 · 우선순위 1
 */
export function getReportsPlatingMorning(params) {
  return request('getReportsPlatingMorning', params);
}

/* ───────── 연간 출하계획 ───────── */

/**
 * 연간 출하계획 조회
 *
 * `GET /api/v1/reports/ship-plan`
 * @param {object} params planYear, modelCd, customerCd, unit(qty|amount)
 * @returns {Promise<object>} months[], rows[{model,customer,total,monthly[12]}], grandTotal, monthlyTotal[], peakMonth
 * @remarks 회계연도 8월 시작 12개월
 * @privateRemarks 접근 권한 생산관리팀·경영진·통합관리자 · 우선순위 1
 */
export function getReportsShipPlan(params) {
  return request('getReportsShipPlan', params);
}

/* ───────── 제품별 수율 ───────── */

/**
 * 제품별 수율 조회
 *
 * `GET /api/v1/reports/yield-by-model`
 * @param {object} params yearMonth, modelCd, processId
 * @returns {Promise<object>} summary{inputQty,okQty,yield,ngQty,defectRate,target}, rows[{no,date,model,inputQty,okQty,ngQty,defectRate,yield,loss{11종},mgmt{3종}}]
 * @remarks Loss 11종 + 관리항목 3종 분해
 * @privateRemarks 접근 권한 품질보증팀·경영진·통합관리자 · 우선순위 1
 */
export function getReportsYieldByModel(params) {
  return request('getReportsYieldByModel', params);
}

/* ───────── 고객사별 LRR ───────── */

/**
 * 고객사별 LRR 조회
 *
 * `GET /api/v1/reports/lrr-by-customer`
 * @param {object} params baseYear, customerCd, unit(month|quarter|year)
 * @returns {Promise<object>} summary{shipQty,lrrCnt,lrrRate,yoyImprove}, byDefectType[], byCustomerMonth[], byCustomerQuarter[], trend[]
 * @remarks 고객사 통보 접수 이력 테이블 신규 필요
 * @privateRemarks 접근 권한 품질보증팀·경영진·통합관리자 · 우선순위 1
 */
export function getReportsLrrByCustomer(params) {
  return request('getReportsLrrByCustomer', params);
}

/* ───────── 폐기 보고서 ───────── */

/**
 * 폐기 보고서 목록 조회
 *
 * `GET /api/v1/reports/scrap`
 * @param {object} params from, to, originType, page, size
 * @returns {Promise<object>} items[{docNo,periodFrom,periodTo,totalQty,totalAmt,state}], meta
 * @privateRemarks 접근 권한 품질보증팀·생산관리팀·경영진·통합관리자 · 우선순위 1
 */
export function getReportsScrap(params) {
  return request('getReportsScrap', params);
}

/**
 * 폐기 보고서 상세 조회
 *
 * `GET /api/v1/reports/scrap/{docNo}`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} header{docNo,draft,review,approve,retention}, occurInfo{}, summary{totalQty,ngQty,lossQty,totalAmt}, rows[{model,process,reason,qty,amount,ratio}], reviewOpinions[]
 * @remarks 결재 양식
 * @privateRemarks 접근 권한 상동 · 우선순위 1
 */
export function getReportsScrapByDocNo(params) {
  return request('getReportsScrapByDocNo', params);
}

/* ───────── 폐기 보고서 작성 위저드 ───────── */

/**
 * MES 폐기 전표 조회 (1단계)
 *
 * `GET /api/v1/reports/scrap/mes-vouchers`
 * @param {object} params from, to, processId, modelCd, defectTypeCd, originType, page, size
 * @returns {Promise<object>} items[{voucherId,occurDate,lotNo,model,process,defectType,qty,originType,docNo}], meta
 * @privateRemarks 접근 권한 상동 · 우선순위 1
 */
export function getReportsScrapMesVouchers(params) {
  return request('getReportsScrapMesVouchers', params);
}

/**
 * 초안 생성·임시저장
 *
 * `POST /api/v1/reports/scrap/drafts`
 * @param {object} params cond{}, pickedVoucherIds[], form{}
 * @returns {Promise<object>} draftId, docNo
 * @privateRemarks 접근 권한 상동 · 우선순위 1
 */
export function postReportsScrapDrafts(params) {
  return request('postReportsScrapDrafts', params);
}

/**
 * 초안 수정
 *
 * `PUT /api/v1/reports/scrap/drafts/{draftId}`
 * @param {object} params step, cond{}, pickedVoucherIds[], form{}, review{}
 * @returns {Promise<object>} success
 * @remarks 단계 상태 보존
 * @privateRemarks 접근 권한 상동 · 우선순위 1
 */
export function putReportsScrapDraftsByDraftId(params) {
  return request('putReportsScrapDraftsByDraftId', params);
}

/**
 * 수기 폐기 행 추가 (2단계)
 *
 * `POST /api/v1/reports/scrap/drafts/{draftId}/manual-rows`
 * @param {object} params model, process, reason, kind(Loss|불용재고), qty
 * @returns {Promise<object>} rowId
 * @remarks MES 미보유 항목
 * @privateRemarks 접근 권한 상동 · 우선순위 1
 */
export function postReportsScrapDraftsByDraftIdManualRows(params) {
  return request('postReportsScrapDraftsByDraftIdManualRows', params);
}

/**
 * 수기 폐기 행 삭제
 *
 * `DELETE /api/v1/reports/scrap/drafts/{draftId}/manual-rows/{rowId}`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} success
 * @privateRemarks 접근 권한 상동 · 우선순위 2
 */
export function deleteReportsScrapDraftsByDraftIdManualRowsByRowId(params) {
  return request('deleteReportsScrapDraftsByDraftIdManualRowsByRowId', params);
}

/**
 * 폐기 금액 산정 (3단계)
 *
 * `POST /api/v1/reports/scrap/drafts/{draftId}/calculate`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} rows[{model,process,qty,unitPrice,priceSource,amount}], summary{totalQty,ngQty,lossQty,totalAmt}
 * @remarks 모델·공정 단위 단가 자동 적용
 * @privateRemarks 접근 권한 상동 · 우선순위 1
 */
export function postReportsScrapDraftsByDraftIdCalculate(params) {
  return request('postReportsScrapDraftsByDraftIdCalculate', params);
}

/**
 * 단가 수기 조정
 *
 * `PUT /api/v1/reports/scrap/drafts/{draftId}/unit-price`
 * @param {object} params key(model|process), unitPrice, reason
 * @returns {Promise<object>} success
 * @remarks 조정 이력 보존
 * @privateRemarks 접근 권한 상동 · 우선순위 2
 */
export function putReportsScrapDraftsByDraftIdUnitPrice(params) {
  return request('putReportsScrapDraftsByDraftIdUnitPrice', params);
}

/**
 * 검토 부서·결재선 지정 (4단계)
 *
 * `PUT /api/v1/reports/scrap/drafts/{draftId}/approval-line`
 * @param {object} params depts[{dept,manager}], appr{draft,review,approve}, due, notifyChannels[]
 * @returns {Promise<object>} success
 * @privateRemarks 접근 권한 상동 · 우선순위 1
 */
export function putReportsScrapDraftsByDraftIdApprovalLine(params) {
  return request('putReportsScrapDraftsByDraftIdApprovalLine', params);
}

/**
 * 검토 요청 발송
 *
 * `POST /api/v1/reports/scrap/drafts/{draftId}/review-request`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} sentCnt
 * @privateRemarks 접근 권한 상동 · 우선순위 1
 */
export function postReportsScrapDraftsByDraftIdReviewRequest(params) {
  return request('postReportsScrapDraftsByDraftIdReviewRequest', params);
}

/**
 * 보고서 생성 (5단계)
 *
 * `POST /api/v1/reports/scrap/drafts/{draftId}/publish`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} docNo, reportId
 * @remarks RP-06 문서로 등록
 * @privateRemarks 접근 권한 상동 · 우선순위 1
 */
export function postReportsScrapDraftsByDraftIdPublish(params) {
  return request('postReportsScrapDraftsByDraftIdPublish', params);
}

/* ───────── 보고서 공통 ───────── */

/**
 * 보고서 출력 (엑셀·CSV·PDF)
 *
 * `POST /api/v1/reports/{reportId}/export`
 * @param {object} params format(xls|csv|pdf), scope(view|all), fileName
 * @returns {Promise<object>} file(binary)
 * @remarks blind 항목 제외 후 저장 + 이력 기록
 * @privateRemarks 접근 권한 보고서별 열람 권한 · 우선순위 1
 */
export function postReportsByReportIdExport(params) {
  return request('postReportsByReportIdExport', params);
}

/**
 * 보고서 인쇄용 조회
 *
 * `GET /api/v1/reports/{reportId}/print`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} html
 * @remarks 인쇄도 다운로드 이력 기록
 * @privateRemarks 접근 권한 보고서별 열람 권한 · 우선순위 2
 */
export function getReportsByReportIdPrint(params) {
  return request('getReportsByReportIdPrint', params);
}
