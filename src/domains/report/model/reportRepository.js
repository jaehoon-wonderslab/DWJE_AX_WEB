/**
 * [Model] 보고서 리포지토리 (RP-01 ~ RP-07)
 *
 * API 호출과 응답 풀기만 맡습니다. 코드 ↔ 표기 변환 규칙은 reportModel.js 에 있습니다.
 */
import * as commonService from '@services/api/commonService';
import * as reportService from '@services/api/reportService';
import { command, unwrap, unwrapAll, unwrapPaged } from '@services/api/request';
import { amountUnit, periodUnit, yearMonthOf, yearOf } from '@domains/common/model/paramModel';
import { groupProcesses, stateCodeOf } from './reportModel';

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
 * 폐기 보고서 한 판 — 「품질팀_폐기보고서」 양식에 채울 값
 *
 * 결재·발행·인쇄를 서버에서 하지 않습니다(2026-09-04). 양식과 내용만 채워 엑셀로 내려받고,
 * 결재·인쇄는 내려받은 파일에서 진행합니다. 그래서 남은 조회는 MES 폐기 전표 하나뿐입니다.
 *
 * 전표를 받아 화면에서 묶습니다 — 총 수량 · 모델별 수량 · 발생공정 · 발생일자.
 *
 * ■ 세 갈래 중 둘만 근거가 있습니다
 * 양식은 총 수량을 「공정불량 / 불용 재고 / Loss」 로 나눕니다. 서버가 주는 `scrapKind` 는
 * `DEFECT`(불량 이력이 붙는 전표 = 공정불량) 와 `OTHER`(안 붙는 전표) 둘뿐입니다.
 * **불용 재고와 Loss 를 가르는 근거는 스키마에 없습니다** — `hist_type` 은 SCRAP 하나뿐이고
 * 남은 단서는 `remark` 자유 텍스트입니다. 키워드로 나누면 근거 없는 숫자가 되므로 나누지 않고,
 * `OTHER` 를 한 줄로 두고 사유(`remark`)를 그대로 보여 줍니다. 규칙은 현업에 물어야 합니다.
 *
 * ■ 폐기 금액 · 업체명은 아예 없습니다
 * 단가 표(`ax.tb_prod_item_price`)는 살아 있으나 0행이고, 전표에 거래처 컬럼이 없습니다.
 * 두 칸은 **엑셀에서 손으로 채우는 칸**입니다.
 *
 * @param {object} p from · to · originTypes(체크된 발생 구분) · processId
 */
export async function loadScrapSheet({ from, to, originTypes, processId }) {
  const picked = (originTypes || []).filter(Boolean);
  /** 발생 구분은 서버가 한 번에 하나만 받습니다 — 체크한 것마다 부르고 합칩니다 */
  const lists = await Promise.all(
    (picked.length ? picked : [undefined]).map((originType) =>
      unwrapPaged(reportService.getReportsScrapMesVouchers({ from, to, processId, originType, size: 0 }))
    )
  );
  const items = lists.flatMap((x) => x?.items || []);

  const byModel = {};
  const byRemark = {};
  const processes = new Set();
  const origins = new Set();
  const kinds = { DEFECT: 0, OTHER: 0 };
  let totalQty = 0;
  let occurFrom = null;
  let occurTo = null;

  items.forEach((v) => {
    // 원천은 재고 감소라 음수였는데 서버가 양수로 뒤집어 내립니다 — 여기서 또 뒤집지 않습니다
    const qty = v.qty || 0;
    totalQty += qty;
    if (v.model) byModel[v.model] = (byModel[v.model] || 0) + qty;
    if (v.scrapKind in kinds) kinds[v.scrapKind] += qty;
    const rm = v.remark || '(사유 없음)';
    byRemark[rm] = (byRemark[rm] || 0) + qty;
    if (v.process) processes.add(v.process);
    if (v.originType) origins.add(v.originType);
    const d = String(v.occurDate || '').slice(0, 10);
    if (d) {
      if (!occurFrom || d < occurFrom) occurFrom = d;
      if (!occurTo || d > occurTo) occurTo = d;
    }
  });

  return {
    voucherCnt: items.length,
    totalQty,
    models: Object.entries(byModel)
      .map(([model, qty]) => ({ model, qty }))
      .sort((a, b) => b.qty - a.qty),
    processes: [...processes].sort(),
    origins: [...origins],
    occurFrom,
    occurTo,
    /** 공정불량(DEFECT) 과 그 밖(OTHER). 불용 재고 · Loss 로 더 나누지는 않습니다 */
    kinds,
    /** 폐기 사유 — 세 갈래 규칙을 정하려면 현업이 이 목록을 봐야 합니다 */
    remarks: Object.entries(byRemark)
      .map(([remark, qty]) => ({ remark, qty }))
      .sort((a, b) => b.qty - a.qty),
  };
}

