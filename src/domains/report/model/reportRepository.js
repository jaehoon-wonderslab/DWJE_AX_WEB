/**
 * [Model] 보고서 리포지토리 (RP-01 ~ RP-07)
 *
 * API 호출과 응답 풀기만 맡습니다. 코드 ↔ 표기 변환 규칙은 reportModel.js 에 있습니다.
 */
import * as commonService from '@services/api/commonService';
import * as reportService from '@services/api/reportService';
import { command, unwrap, unwrapAll, unwrapPaged } from '@services/api/request';
import { amountUnit, periodUnit, yearMonthOf, yearOf } from '@domains/common/model/paramModel';
import { approvalLinePayload, groupProcesses, manualRowPayload, scrapCondParams, scrapFormPayload, stateCodeOf } from './reportModel';

/* ───────── 공통 — 공정 묶음 (아침회의 2종) ───────── */
/**
 * 공정 마스터를 Press / A Plating / B Plating / Coating 묶음으로 나눠 돌려줍니다.
 * 아침회의 화면의 공정 선택지와 `processScope`(공정 id 쉼표 목록) 파라미터의 근거입니다.
 */
export async function loadMorningProcessGroups() {
  try {
    const data = await unwrap(commonService.getCommonMastersProcesses({}), { processes: [] });
    return groupProcesses(data?.processes || []);
  } catch {
    // 공정 마스터를 못 받아도 보고서는 떠야 합니다 — 묶음이 비면 processScope 없이(전체) 조회합니다
    return groupProcesses([]);
  }
}

/* ───────── RP-01 아침회의 자료 (PRESS) ───────── */
/**
 * @param {object} p baseDate · processScope(공정 id 쉼표 목록, 없으면 전체) · state('정상'|'주의'|'위험'|'전체')
 */
export function loadPressMorning({ baseDate, processScope, state }) {
  return unwrapAll({
    report: reportService.getReportsPressMorning({ baseDate, processScope, state: stateCodeOf(state) }),
    decisions: reportService.getReportsPressMorningDecisions({ baseDate }),
  });
}

/* ───────── RP-02 아침회의 자료 (Plating·Coating) ───────── */
export const loadPlatingMorning = ({ baseDate, processScope, state }) =>
  unwrap(reportService.getReportsPlatingMorning({ baseDate, processScope, state: stateCodeOf(state) }));

/* ───────── RP-03 연간 출하계획 ───────── */
/**
 * 출하 계획 대비 실적 — 화면 표시값을 API 코드로 바꿔 보냅니다.
 * ('2026년' → 2026 / '수량 (EA)' → qty / '전체' → 조건 없음)
 */
export const loadShipPlan = ({ planYear, unit, modelCd, customerCd }) =>
  unwrap(
    reportService.getReportsShipPlan({
      planYear: yearOf(planYear),
      unit: amountUnit(unit),
      modelCd: modelCd === '전체' ? undefined : modelCd,
      customerCd: customerCd === '전체' ? undefined : customerCd,
    })
  );

/** 고객사 선택지 — 고객사 기준정보 (`/common/masters/customers`). 0건이면 '전체' 만 남습니다 */
export async function loadCustomerOptions() {
  const data = await unwrap(commonService.getCommonMastersCustomers({}), { customers: [] });
  const items = (data?.customers || []).map((c) => ({ value: c.code, label: c.name || c.code }));
  return [{ value: '전체', label: '전체' }, ...items];
}

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
/** 고객사별 LRR — '2026년' → 2026 / '월별' → month / '전체' → 조건 없음 */
export const loadLrrByCustomer = ({ baseYear, unit, customerCd }) =>
  unwrap(
    reportService.getReportsLrrByCustomer({
      baseYear: yearOf(baseYear),
      unit: periodUnit(unit),
      customerCd: customerCd === '전체' ? undefined : customerCd,
    })
  );

/* ───────── RP-06 폐기 보고서 ───────── */
/**
 * 폐기 보고서 목록 + 상세
 *
 * 문서번호를 고르지 않았으면 목록에서 문서번호가 있는 첫 건을 펼칩니다.
 * (임시 저장 초안은 docNo 가 null 이라 상세를 부를 수 없습니다 → 목록에만 남깁니다)
 */
export async function loadScrapReport({ docNo, from, to, originType }) {
  const list = await unwrap(
    reportService.getReportsScrap({ from, to, originType: originType === '전체' ? undefined : originType }),
    { items: [] }
  );
  const items = list?.items || [];
  const targetDocNo = docNo || items.find((x) => x.docNo)?.docNo;
  const detail = targetDocNo
    ? await unwrap(reportService.getReportsScrapByDocNo({ docNo: targetDocNo }), null).catch(() => null)
    : null;
  return { list: { ...list, items }, detail, docNo: targetDocNo };
}

/* ───────── RP-07 폐기 보고서 작성 위저드 ───────── */

/** 1단계 — MES 폐기 전표 조회 ('전체' 는 조건 없음으로 보냅니다) */
export const loadMesVouchers = ({ page, size, ...cond }) =>
  unwrapPaged(reportService.getReportsScrapMesVouchers({ ...scrapCondParams(cond), page, size }));

/** 초안 생성 (2단계로 넘어갈 때 1회) — 응답 { draftId, docNo, step } */
export const createScrapDraft = () => command(reportService.postReportsScrapDrafts({}));

/**
 * 단계 이동·조건·문서 기본 정보 임시 저장
 * 서버는 cond 에 processId·modelCd·originType·from·to 만, form 에는 평평한 값만 받습니다.
 * (검토·결재선은 approval-line API 로 따로 저장합니다)
 */
export const saveScrapDraft = ({ draftId, step, cond, pickedVoucherIds, form }) => {
  const body = { draftId };
  if (step !== undefined) body.step = step;
  if (cond) body.cond = scrapCondParams(cond);
  if (pickedVoucherIds) body.pickedVoucherIds = pickedVoucherIds;
  if (form) body.form = scrapFormPayload(form);
  return command(reportService.putReportsScrapDraftsByDraftId(body));
};

/** 초안 취소·삭제 — 200 { success, draftId } · 404 없는 초안 · 409 발행·확정본 */
export const deleteScrapDraft = (draftId) =>
  command(reportService.deleteReportsScrapDraftsByDraftId({ draftId }));

/** 2단계 — 수기 폐기 행 (응답 { rowId, qty }) */
export const addManualRow = (draftId, values) =>
  command(reportService.postReportsScrapDraftsByDraftIdManualRows({ draftId, ...manualRowPayload(values) }));
export const removeManualRow = (draftId, rowId) =>
  command(reportService.deleteReportsScrapDraftsByDraftIdManualRowsByRowId({ draftId, rowId }));

/** 3단계 — 폐기 금액 산정 · 단가 조정 (key: model|process · keyValue · unitPrice(숫자 필수) · reason) */
export const calculateScrap = (draftId) => command(reportService.postReportsScrapDraftsByDraftIdCalculate({ draftId }));
export const adjustUnitPrice = (draftId, { key, keyValue, unitPrice, reason }) =>
  command(reportService.putReportsScrapDraftsByDraftIdUnitPrice({ draftId, key, keyValue, unitPrice: Number(unitPrice), reason }));

/** 4단계 — 검토·결재선 (응답 { success, approvalCnt }) · 검토 요청 발송 (응답 { sentCnt, recipients }) */
export const saveApprovalLine = (draftId, review) =>
  command(reportService.putReportsScrapDraftsByDraftIdApprovalLine({ draftId, ...approvalLinePayload(review) }));
export const sendReviewRequest = (draftId) =>
  command(reportService.postReportsScrapDraftsByDraftIdReviewRequest({ draftId }));

/** 5단계 — 보고서 생성 (응답 docNo · reportId) */
export const publishScrapReport = (draftId) =>
  command(reportService.postReportsScrapDraftsByDraftIdPublish({ draftId }));
