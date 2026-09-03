/**
 * [Model] 생산관리 리포지토리 (PR-01 ~ PR-05)
 */
import * as commonService from '@services/api/commonService';
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
 * 실적 집계 + 추이 차트
 *
 * 제품 선택은 `modelCd` 로 보냅니다. 실적 테이블의 품목 코드는 공정 접미사가 붙은
 * 별개 체계(D63A-S · D63A-YT …)라 제품 목록의 code(D63A)로는 정확 일치하지 않습니다.
 * `itemCd` 는 품목 코드 정확 일치용으로 서버에 남아 있습니다.
 */
export async function loadResults({ from, to, unit, modelCd, page, size }) {
  const params = { from, to, unit: periodUnit(unit), modelCd };
  const data = await unwrapAll({
    // 표는 쪽 단위로, 추이 차트는 기간 전체를 그립니다
    results: productionService.getProductionResults({ ...params, page, size }),
    trend: productionService.getProductionResultsTrend(params),
  });
  return {
    ...data,
    resultsMeta: data.metas?.results,
    results: data.results && { ...data.results, items: fillRatesAll(data.results.items) },
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
