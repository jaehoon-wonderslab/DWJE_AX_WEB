/**
 * [Model] 보고서 리포지토리 (RP-01 ~ RP-07)
 */
import * as reportService from '@services/api/reportService';
import { command, unwrap, unwrapAll, unwrapPaged } from '@services/api/request';
import { amountUnit, periodUnit, yearMonthOf, yearOf } from '@domains/common/model/paramModel';

/* ───────── RP-01 아침회의 자료 (PRESS) ───────── */
export function loadPressMorning({ baseDate, processScope, state }) {
  return unwrapAll({
    report: reportService.getReportsPressMorning({ baseDate, processScope, state }),
    decisions: reportService.getReportsPressMorningDecisions({ baseDate }),
  });
}

/* ───────── RP-02 아침회의 자료 (Plating·Coating) ───────── */
export const loadPlatingMorning = (params) => unwrap(reportService.getReportsPlatingMorning(params));

/* ───────── RP-03 연간 출하계획 ───────── */
/**
 * 출하 계획 대비 실적 — 화면 표시값을 API 코드로 바꿔 보냅니다.
 * ('2026년' → 2026 / '수량 (EA)' → qty)
 */
export const loadShipPlan = ({ planYear, unit, ...rest }) =>
  unwrap(reportService.getReportsShipPlan({ ...rest, planYear: yearOf(planYear), unit: amountUnit(unit) }));

/* ───────── RP-04 제품별 수율 ───────── */
/**
 * 제품별 수율 — '2026년 7월' → '2026-07'
 *
 * 상세 행이 500건을 넘어 쪽 단위로 받습니다 (size 0 이면 전량).
 * summary·lossTypes·mgmtTypes 는 쪽과 무관하게 전체 기준입니다.
 */
export async function loadYieldByModel({ yearMonth, ...rest }) {
  const { items, meta, data } = await unwrapPaged(
    reportService.getReportsYieldByModel({ ...rest, yearMonth: yearMonthOf(yearMonth) }),
    'rows'
  );
  // 서버가 data 자체를 비워 보내면 화면이 빈 상태를 그리도록 null 을 유지합니다
  if (!data) return null;
  return { ...data, rows: items, rowsMeta: meta };
}

/* ───────── RP-05 고객사별 LRR ───────── */
/** 고객사별 LRR — '2026년' → 2026 / '월별' → month */
export const loadLrrByCustomer = ({ baseYear, unit, ...rest }) =>
  unwrap(reportService.getReportsLrrByCustomer({ ...rest, baseYear: yearOf(baseYear), unit: periodUnit(unit) }));

/* ───────── RP-06 폐기 보고서 ───────── */
/**
 * 폐기 보고서 목록 + 상세
 *
 * 문서번호를 고르지 않았으면 목록의 첫 건을 펼칩니다.
 * (없는 문서번호로 상세를 부르면 404 가 나므로 목록을 받은 뒤에 상세를 조회합니다)
 */
export async function loadScrapReport({ docNo, from, to, originType }) {
  const list = await unwrap(reportService.getReportsScrap({ from, to, originType }), { items: [] });
  const targetDocNo = docNo || list?.items?.[0]?.docNo;
  const detail = targetDocNo ? await unwrap(reportService.getReportsScrapByDocNo({ docNo: targetDocNo }), null).catch(() => null) : null;
  return { list, detail, docNo: targetDocNo };
}

/* ───────── RP-07 폐기 보고서 작성 위저드 ───────── */

/** 1단계 — MES 폐기 전표 조회 */
export const loadMesVouchers = ({ from, to, process, model, originType, page, size }) =>
  unwrapPaged(
    reportService.getReportsScrapMesVouchers({ from, to, processId: process, modelCd: model, originType, page, size })
  );

/** 초안 생성 (화면 진입 시 1회) */
export const createScrapDraft = () => command(reportService.postReportsScrapDrafts({}));

/** 단계 이동·조건 임시 저장 */
export const saveScrapDraft = ({ draftId, step, cond, pickedVoucherIds, form, review }) =>
  command(reportService.putReportsScrapDraftsByDraftId({ draftId, step, cond, pickedVoucherIds, form, review }));

/** 2단계 — 수기 폐기 행 */
export const addManualRow = (draftId, values) =>
  command(reportService.postReportsScrapDraftsByDraftIdManualRows({ draftId, ...values }));
export const removeManualRow = (draftId, rowId) =>
  command(reportService.deleteReportsScrapDraftsByDraftIdManualRowsByRowId({ draftId, rowId }));

/** 3단계 — 폐기 금액 산정 · 단가 조정 */
export const calculateScrap = (draftId) => command(reportService.postReportsScrapDraftsByDraftIdCalculate({ draftId }));
export const adjustUnitPrice = (draftId, key, unitPrice, reason) =>
  command(reportService.putReportsScrapDraftsByDraftIdUnitPrice({ draftId, key, unitPrice, reason }));

/** 4단계 — 검토·결재선 */
export const saveApprovalLine = (draftId, review) =>
  command(reportService.putReportsScrapDraftsByDraftIdApprovalLine({ draftId, ...review }));
export const sendReviewRequest = (draftId) =>
  command(reportService.postReportsScrapDraftsByDraftIdReviewRequest({ draftId }));

/** 5단계 — 보고서 생성 */
export const publishScrapReport = (draftId) =>
  command(reportService.postReportsScrapDraftsByDraftIdPublish({ draftId }));
