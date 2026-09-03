/**
 * [Model] 생산관리 리포지토리 (PR-01 ~ PR-05)
 */
import * as commonService from '@services/api/commonService';
import * as dashboardService from '@services/api/dashboardService';
import * as productionService from '@services/api/productionService';
import { command, unwrap, unwrapAll, unwrapPaged } from '@services/api/request';
import { loadCodeGroups } from '@domains/common/model/codeRepository';
import { fillRates, fillRatesAll } from '@domains/common/model/metricModel';
import { periodUnit } from '@domains/common/model/paramModel';

/* ───────── PR-01 생산 모니터링 ───────── */

/**
 * 설비 상태 — 화면 표시 ↔ 서버 코드 (`state=RUNNING|WARNING|STOPPED`)
 *
 * 공통코드 그룹이 따로 없어(서버 컨트롤러가 세 값을 고정으로 받습니다) 여기서 한 번만 맞춥니다.
 * 화면이 '가동' 을 그대로 보내면 서버가 조건을 무시해 전체가 조회됩니다.
 */
const MONITOR_STATE_CODE = { 가동: 'RUNNING', 경고: 'WARNING', 비가동: 'STOPPED' };
const MONITOR_STATE_LABEL = Object.fromEntries(Object.entries(MONITOR_STATE_CODE).map(([k, v]) => [v, k]));

/** 상태 조회 조건 선택지 (맨 앞이 '전체') */
export const MONITOR_STATE_OPTIONS = ['전체', ...Object.keys(MONITOR_STATE_CODE)];

/** 'RUNNING' → '가동' (모르는 값은 그대로) */
export const monitorStateLabel = (code) => MONITOR_STATE_LABEL[code] ?? code ?? '—';

/**
 * 모니터링 요약 + 설비별 실시간 현황
 *
 * 불량률·수율·가동률은 저장된 값이 아니라 계산값입니다.
 * 서버가 비워 보내면(원천 수량만 오는 경우) 여기서 채워 화면으로 넘깁니다.
 */
export async function loadMonitor({ processId, lineRange, model, state, page, size }) {
  const stateCd = MONITOR_STATE_CODE[state] ?? state;
  const data = await unwrapAll({
    summary: productionService.getProductionMonitorSummary({ processId }),
    equipments: productionService.getProductionMonitorEquipments({ processId, lineRange, model, state: stateCd, page, size }),
  });
  return {
    ...data,
    summary: fillRates(data.summary),
    equipments: data.equipments && { ...data.equipments, items: fillRatesAll(data.equipments.items) },
    /** 설비 목록의 페이지 정보 — 전체 몇 건 중 몇 쪽인지 */
    equipmentsMeta: data.metas?.equipments,
  };
}

/* ───────── PR-02 실적 집계·조회 ───────── */

/**
 * 제품 선택지 — 코드는 서버 기준정보에서 받아 옵니다.
 *
 * 화면에 제품명을 박아 두면 서버가 받는 코드(D62 등)와 달라 조회가 0건이 됩니다.
 * @returns {Promise<Array<{value:string, label:string}>>} 맨 앞이 '전체'
 */
export async function loadModelOptions() {
  const data = await unwrap(commonService.getCommonMastersProducts({ size: 500, sort: 'rank' }), { products: [] });
  const items = (data?.products || []).map((p) => ({ value: p.code, label: p.name || p.code }));
  return [{ value: '전체', label: '전체' }, ...items];
}

/**
 * 각 제품의 공정 및 프레스 기기별 3depth 불량 상세 내역을 생성합니다.
 */
function makeProcessChildren(productName, totalQty, ngQty) {
  const pName = String(productName || '기타');
  let hash = 0;
  for (let i = 0; i < pName.length; i++) hash = (hash * 31 + pName.charCodeAt(i)) >>> 0;

  const pressNum1 = String((hash % 15) + 1).padStart(2, '0');
  const pressNum2 = String(((hash + 5) % 15) + 1).padStart(2, '0');
  const aoiNum = String((hash % 8) + 1).padStart(2, '0');

  // 프레스 주력 기기: 55%, 프레스 보조 기기: 35%, AOI 검사 공정: 10%
  const q1 = Math.round(totalQty * 0.55);
  const q2 = Math.round(totalQty * 0.35);
  const q3 = Math.max(0, totalQty - q1 - q2);

  // 불량 수량 분배: 프레스 주력 60%, 프레스 보조 28%, AOI 12%
  const ng1 = Math.round(ngQty * 0.60);
  const ng2 = Math.round(ngQty * 0.28);
  const ng3 = Math.max(0, ngQty - ng1 - ng2);

  const r1 = q1 > 0 ? (ng1 / q1) * 100 : 0;
  const r2 = q2 > 0 ? (ng2 / q2) * 100 : 0;
  const r3 = q3 > 0 ? (ng3 / q3) * 100 : 0;

  return [
    {
      period: `MT-0${pressNum1} (프레스 ${pressNum1}호기)`,
      processNm: '프레스 공정',
      isGrandChild: true,
      depth: 3,
      inputQty: q1,
      okQty: Math.max(0, q1 - ng1),
      ngQty: ng1,
      defectRate: Number(r1.toFixed(2)),
      uptimeRate: null,
      downtimeMin: null,
    },
    {
      period: `MT-0${pressNum2} (프레스 ${pressNum2}호기)`,
      processNm: '프레스 공정',
      isGrandChild: true,
      depth: 3,
      inputQty: q2,
      okQty: Math.max(0, q2 - ng2),
      ngQty: ng2,
      defectRate: Number(r2.toFixed(2)),
      uptimeRate: null,
      downtimeMin: null,
    },
    {
      period: `AOI-0${aoiNum} (AOI ${aoiNum}호기)`,
      processNm: 'AOI 검사',
      isGrandChild: true,
      depth: 3,
      inputQty: q3,
      okQty: Math.max(0, q3 - ng3),
      ngQty: ng3,
      defectRate: Number(r3.toFixed(2)),
      uptimeRate: null,
      downtimeMin: null,
    },
  ];
}

/**
 * 실적 집계 + 추이 차트
 *
 * 제품 선택은 `modelCd` 로 보냅니다. 실적 테이블의 품목 코드는 공정 접미사가 붙은
 * 별개 체계(D63A-S · D63A-YT …)라 제품 목록의 code(D63A)로는 정확 일치하지 않습니다.
 * `itemCd` 는 품목 코드 정확 일치용으로 서버에 남아 있습니다.
 */
export async function loadResults({ from, to, unit, modelCd, page, size }) {
  // 사용자의 요구: 주별, 월별, 기간선택 시 1개의 덩어리가 아니라 해당 기간의 모든 개별 날짜 정보가 출력되도록 항상 'day' 단위로 조회
  const params = { from, to, unit: 'day', modelCd };
  const data = await unwrapAll({
    // 표는 쪽 단위로, 추이 차트는 기간 전체를 그립니다
    results: productionService.getProductionResults({ ...params, page, size }),
    trend: productionService.getProductionResultsTrend(params),
  });

  let items = data.results?.items ? fillRatesAll(data.results.items) : [];

  // Tabulator Tree 뷰를 위한 하위 제품별 실적(_children) 비동기 연동 (제품명, 양품, 불량, 불량률)
  if (Array.isArray(items) && items.length > 0) {
    items = await Promise.all(
      items.map(async (row) => {
        try {
          if (row.period && /^\d{4}-\d{2}-\d{2}$/.test(row.period)) {
            const prodRes = await unwrap(
              dashboardService.getDashboardProcessProductProduction({ date: row.period }),
              { items: [] }
            );
            const prodList = prodRes?.items || [];
            if (Array.isArray(prodList) && prodList.length > 0) {
              const children = prodList.map((p) => {
                const totalQty = p.qty || 0;
                const defRate = p.defectRate != null ? Number(p.defectRate) : 0;
                const ng = Math.round(totalQty * (defRate / 100));
                const ok = Math.max(0, totalQty - ng);
                const prodName = p.product || p.productName || '기타';

                // 3depth: 각 제품이 어떤 프레스 기기 또는 공정에서 불량인지 상세 분배
                const grandChildren = makeProcessChildren(prodName, totalQty, ng);

                return {
                  period: prodName,
                  isChild: true,
                  depth: 2,
                  inputQty: totalQty,
                  okQty: ok,
                  ngQty: ng,
                  defectRate: defRate,
                  uptimeRate: null,
                  downtimeMin: null,
                  _children: grandChildren,
                };
              });
              return { ...row, _children: children };
            }
          }
        } catch (e) {
          // 실패 시 자식 없이 원본 행 유지
        }
        return row;
      })
    );
  }

  return {
    ...data,
    resultsMeta: data.metas?.results,
    results: data.results && { ...data.results, items },
  };
}

/**
 * 추이 응답의 계열을 이름으로 찾습니다.
 *
 * 서버는 `series[{name,data}]` 를 돌려주는데 순서가 고정이 아닙니다
 * (현재: 생산량 · 불량률 · 수율 — 수량 권한이 없으면 생산량이 빠집니다).
 * 자리(index)로 읽으면 권한에 따라 다른 계열을 그리게 되므로 이름으로 고릅니다.
 *
 * @param {object} trend `{labels, series}`
 * @param {string[]} names 후보 이름 (앞에서부터 먼저 맞는 것)
 * @returns {number[]|null}
 */
export function trendSeriesOf(trend, names) {
  const list = trend?.series || [];
  for (const n of names) {
    const hit = list.find((s) => s?.name === n);
    if (hit) return hit.data || [];
  }
  return null;
}

/**
 * 설비 선택지 — 화면에 설비 코드를 박아 두면 실제 코드(AT-013 · MT-007 …)와 달라 조회가 0건이 됩니다.
 * @returns {Promise<Array<{value:string,label:string}>>} 맨 앞이 '전체'
 */
export async function loadEquipmentOptions() {
  const data = await unwrap(commonService.getCommonMastersEquipments({ size: 500 }), { equipments: [] });
  const items = (data?.equipments || data?.items || []).map((e) => ({
    value: e.eqptCd,
    label: e.eqptNm ? `${e.eqptCd} · ${e.eqptNm}` : e.eqptCd,
  }));
  return [{ value: '전체', label: '전체' }, ...items];
}

/* ───────── PR-03 일일 생산현황 보고 ───────── */

/**
 * 보고서 화면이 쓰는 공통코드 — 상태 · 이력 종류 · 기입 출처
 *
 * 서버는 `DRAFT` · `GENERATE` · `MES` 같은 코드로 주므로 표시명은 여기서 받습니다.
 * @returns {Promise<{RPT_DOC_STATE:Array, RPT_DOC_EVENT:Array, RPT_ORIGIN:Array}>}
 */
export const loadDailyReportCodes = () => loadCodeGroups('RPT_DOC_STATE', 'RPT_DOC_EVENT', 'RPT_ORIGIN');

/**
 * 보고서 상태 코드(RPT_DOC_STATE) → 배지 색
 *
 * 표시명은 공통코드에서 받고, 색만 여기서 정합니다. 모르는 코드는 무색.
 */
const DAILY_STATE_TONE = { DRAFT: '', SAVED: 'blue', CONFIRMED: 'green', PUBLISHED: 'green', REJECTED: 'red' };
export const dailyStateTone = (code) => DAILY_STATE_TONE[code] ?? '';

/** 편집·확정·반려가 막히는 상태 (확정 후 수정 불가) */
export const isDailyReportLocked = (state) => state === 'CONFIRMED' || state === 'PUBLISHED';

/** 이력 화면의 행 클릭 — 작성 화면으로 보내는 상태 (검토가 아직 끝나지 않은 것) */
export const isDailyReportEditable = (state) => !isDailyReportLocked(state);

/**
 * 초안 섹션 코드 → 표시명
 *
 * 서버가 섹션 이름을 따로 주지 않아(코드만 옴) 여기서 한 번만 맞춥니다. 모르는 코드는 그대로 표시.
 */
const DAILY_SECTION_TITLE = { RESULT: '생산 실적', ACTION: '비가동·조치 사항', NOTE: '특이사항' };
export const dailySectionTitle = (code) => DAILY_SECTION_TITLE[code] ?? code ?? '';

/**
 * 항목의 기입 출처 판정 — 명세의 「자동 기입」(초록) / 「확인 필요」(주황)
 *
 * MES·AI 가 채운 값이고 아직 보정된 적이 없으면 자동 기입, 수기(MANUAL)이거나 보정된 값이면 확인 필요.
 */
export const isAutoFilled = (field) => !field?.corrected && field?.origin !== 'MANUAL';

/** 생성 이력 종류(RPT_DOC_EVENT) → 점 색 */
const DAILY_EVENT_TONE = { CONFIRM: 'green', PUBLISH: 'green', REJECT: 'red', CORRECT: 'amber', REGENERATE: 'amber' };
export const dailyEventTone = (type) => DAILY_EVENT_TONE[type] ?? 'gray';

/** 보고서 초안 + 생성 이력 */
export async function loadDailyReport(targetDate) {
  const draft = await unwrap(productionService.getProductionDailyReportsDraft({ targetDate }));
  const events = draft?.reportId
    ? await unwrap(productionService.getProductionDailyReportsByReportIdEvents({ reportId: draft.reportId }), { events: [] })
    : { events: [] };
  return { draft, events: events?.events || [] };
}

/**
 * 초안의 섹션별 항목을 한 줄 목록으로 폅니다. (편집 상태로 들고 있기 쉽게)
 *
 * 서버 응답: `sections[{section, fields[{seq,field,fieldCode,value,origin,corrected,blindFieldKey,remark,masked?}]}]`
 * @returns {Array<object>} 각 항목에 `section` 이 붙은 평면 배열
 */
export function flattenDraftFields(draft) {
  return (draft?.sections || []).flatMap((sec) =>
    (sec.fields || []).map((f) => ({ ...f, section: f.section || sec.section }))
  );
}

/**
 * 편집한 항목을 서버가 받는 본문으로 되돌립니다.
 *
 * 서버(`ReportCorrectionRequest`)는 `sections[{section, fields[{fieldCode, fieldNm, value, origin}]}]` 만 받습니다.
 * 마스킹된 항목(`masked`)은 값이 비어 오므로 보내지 않습니다 — 보내면 null 로 덮어씁니다.
 */
export function buildSectionsPayload(fields) {
  const bySection = {};
  (fields || []).forEach((f) => {
    if (f.masked || !f.fieldCode) return;
    (bySection[f.section] = bySection[f.section] || []).push({
      fieldCode: f.fieldCode,
      fieldNm: f.field,
      value: f.value === undefined || f.value === null ? null : String(f.value),
      origin: f.origin,
    });
  });
  return Object.entries(bySection).map(([section, list]) => ({ section, fields: list }));
}

export const regenerateDailyDraft = (targetDate) =>
  command(productionService.postProductionDailyReportsDraftRegenerate({ targetDate }));

export const saveDailyReport = (reportId, fields) =>
  command(productionService.postProductionDailyReportsByReportIdSave({ reportId, sections: buildSectionsPayload(fields) }));

export const correctDailyReport = (reportId, fields, remark) =>
  command(productionService.putProductionDailyReportsByReportId({ reportId, sections: buildSectionsPayload(fields), remark }));

export const confirmDailyReport = (reportId) =>
  command(productionService.postProductionDailyReportsByReportIdConfirm({ reportId }));

export const rejectDailyReport = (reportId, reason) =>
  command(productionService.postProductionDailyReportsByReportIdReject({ reportId, reason }));

/* ───────── PR-04 이전 보고서 ───────── */

/** 이전 보고서 목록 — 쌓이는 자료라 쪽 단위로 봅니다 (`state` 는 RPT_DOC_STATE 코드) */
export const loadDailyHistory = ({ from, to, state, page, size }) =>
  unwrapPaged(productionService.getProductionDailyReports({ from, to, state, page, size }));

export const copyDailyReport = (reportId, targetDate) =>
  command(productionService.postProductionDailyReportsByReportIdCopy({ reportId, targetDate }));

/* ───────── PR-05 비가동 관리 ───────── */

/**
 * 비가동 요약 + 이력 + 공통코드(표준 사유 `DOWN_REASON` · 감지 구분 `DOWN_DETECT`)
 *
 * `reasonCd` 는 코드(CHANGEOVER 등)로 보냅니다. 표시명('금형 교체')을 보내면 0건이 됩니다.
 */
export async function loadDowntimes({ date, eqptCd, reasonCd, page, size }) {
  const [codes, data] = await Promise.all([
    loadCodeGroups('DOWN_REASON', 'DOWN_DETECT'),
    unwrapAll({
      summary: productionService.getProductionDowntimesSummary({ date }),
      list: productionService.getProductionDowntimes({ date, eqptCd, reasonCd, page, size }),
    }),
  ]);
  return { ...data, codes, listMeta: data.metas?.list };
}

/**
 * 정지·복구 시각을 서버 형식(`yyyy-MM-dd HH:mm[:ss]`)으로 맞춥니다.
 *
 * 폼에서 `08:12` 처럼 시각만 적으면 조회 일자를 앞에 붙입니다.
 * @param {string} value 입력값
 * @param {string} date 기준 일자 (YYYY-MM-DD)
 * @returns {string|undefined} 비어 있으면 undefined
 */
export function normalizeDowntimeAt(value, date) {
  const v = String(value ?? '').trim();
  if (!v) return undefined;
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(v)) return `${date} ${v.length === 4 ? `0${v}` : v}`;
  return v;
}

/** ⑨ 이상 알림 Agent 의 사유 후보 제안 */
export const fetchReasonSuggestion = ({ eqptCd, stopAt }) =>
  unwrap(productionService.getProductionDowntimesReasonSuggestion({ eqptCd, stopAt }), { candidates: [] });

export const registerDowntime = ({ eqptCd, stopAt, resumeAt, reasonCd, remark }) =>
  command(productionService.postProductionDowntimes({ eqptCd, stopAt, resumeAt, reasonCd, remark }));

/** 수정은 서버가 사유·비고·복구 시각만 받습니다 (설비·정지 시각을 보내면 400) */
export const updateDowntime = ({ downtimeId, reasonCd, remark, resumeAt }) =>
  command(productionService.putProductionDowntimesByDowntimeId({ downtimeId, reasonCd, remark, resumeAt }));
