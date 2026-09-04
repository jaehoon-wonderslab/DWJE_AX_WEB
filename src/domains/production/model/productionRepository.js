/**
 * [Model] 생산관리 리포지토리 (PR-01 ~ PR-05)
 */
import * as commonService from '@services/api/commonService';
import * as dashboardService from '@services/api/dashboardService';
import * as productionService from '@services/api/productionService';
import { command, unwrap, unwrapAll, unwrapPaged } from '@services/api/request';
import { shiftDate } from '@shared/utils/formatUtil';
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

  const plant1 = Number(pressNum1) <= 10 ? '제1공장' : '제2공장';
  const plant2 = Number(pressNum2) <= 10 ? '제1공장' : '제3공장';
  const plant3 = '제1공장';

  return [
    {
      period: `MT-0${pressNum1} (프레스 ${pressNum1}호기)`,
      plantNm: plant1,
      processNm: '프레스 공정',
      isGrandChild: true,
      depth: 3,
      inputQty: q1,
      okQty: Math.max(0, q1 - ng1),
      ngQty: ng1,
      defectRate: Number(r1.toFixed(2)),
      uptimeRate: null,
      downtimeMin: null,
      _children: [],
    },
    {
      period: `MT-0${pressNum2} (프레스 ${pressNum2}호기)`,
      plantNm: plant2,
      processNm: '프레스 공정',
      isGrandChild: true,
      depth: 3,
      inputQty: q2,
      okQty: Math.max(0, q2 - ng2),
      ngQty: ng2,
      defectRate: Number(r2.toFixed(2)),
      uptimeRate: null,
      downtimeMin: null,
      _children: [],
    },
    {
      period: `AOI-0${aoiNum} (AOI ${aoiNum}호기)`,
      plantNm: plant3,
      processNm: 'AOI 검사',
      isGrandChild: true,
      depth: 3,
      inputQty: q3,
      okQty: Math.max(0, q3 - ng3),
      ngQty: ng3,
      defectRate: Number(r3.toFixed(2)),
      uptimeRate: null,
      downtimeMin: null,
      _children: [],
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

/* ───────── PR-03 일일 생산현황 보고 ─────────
 *
 * 2026-09-04 — 보고서 **문서·결재 모형이 서버에서 걷혔습니다.**
 * 초안 조회·재생성·임시 저장·항목 보정·확정·반려·생성 이력·이전 보고서 목록 API 가
 * 전부 404 입니다. 남은 것은 아래 두 건뿐입니다.
 *
 *   GET  /production/daily-reports/sheet          조간회의 자료 본문
 *   POST /production/daily-reports/rows           회의 결과 저장 (대상일, 제품)
 *
 * 회의 결과(일목표·판정·담당·기한)는 문서와 함께 지워지지 않고 `ax.tb_prod_daily_decision`
 * 으로 옮겨 갔습니다. 확정 상태가 없어 언제든 고칠 수 있습니다.
 * 결재 기능을 되살릴지는 사용자 판단으로 남겨 두었습니다.
 */

/** 조간회의 자료가 보는 야간 근무 구간 */
export const SHIFT_FROM = '20:00';
export const SHIFT_TO = '08:00';

/** 대상일의 집계 구간 — 전날 20:00 ~ 당일 08:00 (서버가 못 줄 때의 표기용) */
export function shiftWindow(targetDate) {
  return { from: `${shiftDate(targetDate, -1)} ${SHIFT_FROM}`, to: `${targetDate} ${SHIFT_TO}` };
}

/**
 * 양식 오른쪽 위 범례 — 달성률 구간별 색
 *
 * 🟢 95% 이상 · 🟡 95% 미만 · 🔴 85% 미만
 */
export const PRESS_LEVELS = [
  { level: 'normal', label: '정상', tone: 'green', min: 95 },
  { level: 'watch', label: '주의', tone: 'amber', min: 85 },
  { level: 'risk', label: '지연', tone: 'red', min: -Infinity },
];

/** 달성률(%) → 범례 구간 (값이 없으면 판정하지 않습니다) */
export function pressLevel(rate) {
  if (rate === null || rate === undefined || Number.isNaN(rate)) return null;
  return PRESS_LEVELS.find((l) => rate >= l.min) || PRESS_LEVELS[PRESS_LEVELS.length - 1];
}

/** 프레스 공정 여부 — 공정명에 '프레스' 또는 'PRESS' 가 든 작업장 (공정 선택지용) */
const isPress = (p) => /프레스|press/i.test(`${p?.name || ''}`);

/**
 * 조간회의 자료 한 판 — 제품 한 줄씩
 *
 * @param {object} p targetDate · processId('전체' 면 프레스 작업장 전부) · topN(0 이면 전량)
 * @returns {Promise<{rows:Array, processes:Array, processCds:Array, window:object, baseline:string}>}
 */
export async function loadPressReport({ targetDate, processId, topN = 10 }) {
  const pid = processId && processId !== '전체' ? processId : undefined;

  const [master, sheet] = await Promise.all([
    unwrap(commonService.getCommonMastersProcesses({}), { processes: [] }),
    sheetOf(targetDate, pid),
  ]);

  /**
   * 주간실적은 서버 `weekQty` 를 그대로 씁니다
   *
   * 그 주 **보고 구간들의 합**입니다 — 주간목표(`일목표 × weekDays`)와 기준이 같아 나눌 수 있습니다.
   * 낮 근무까지 포함한 연속 구간은 `weekQtyAllShift` 로 따로 옵니다(2026-09-04 열 분리).
   * 한 이름에 두 기준이 섞여 있던 동안에는 화면이 날짜만큼 시트를 되풀이해 불러 다시 더했는데,
   * 이제 필요 없습니다.
   */
  const weekDays = sheet?.weekDays || 1;

  /**
   * 서버가 이미 제품 한 줄씩 줍니다 — **여기서 합치지 않습니다.**
   *
   * `eqptCnt` 는 제품 단위 `count(DISTINCT eqpt_cd)` 라 행끼리 더하면 같은 설비를 두 번 셉니다
   * (D63A 의 S136 은 실제 1대인데 품목별로 세어 더하면 2대 — API 세션 확인, 2026-09-04).
   */
  const all = (sheet?.rows || [])
    .map((r) => ({
      product: r.product,
      productNm: r.productNm || r.product,
      process: pid ? r.processNm || r.processId : 'Press',
      qty: r.qty ?? 0,
      okQty: r.okQty ?? null,
      ngQty: r.ngQty ?? 0,
      defectRate: r.qty ? round1(((r.ngQty || 0) / r.qty) * 100) : null,
      eqptCnt: r.eqptCnt ?? null,
      /**
       * 이미 정해져 있는 일목표와 그 출처
       *
       * `MANUAL` 작성자가 그날 넣은 값 · `MASTER` 목표 마스터의 밑값 · `null` 둘 다 없음.
       * 마스터 값은 **덮어쓸 수 있는 밑값**이라, 누가 정한 목표인지 화면에서 구분해 보여 줍니다.
       */
      savedTarget: r.targetQty ?? null,
      targetOrigin: r.targetQtyOrigin ?? null,
      decision: r.decision || undefined,
      dri: r.dri || undefined,
      due: r.due || undefined,
      /**
       * 일목표 **참고값** — 그 주 보고 구간 일평균 실적
       *
       * 진짜 목표가 아닙니다. 제품별 일목표는 데이터도 스키마도 없어 서버가 `targetQty: null` 을 줍니다
       * (`PROD_DAY_TARGET` 은 공정 단위이고 값도 비어 있습니다 — API 세션 확인, 2026-09-04).
       * 입력칸의 회색 밑값으로만 씁니다. 이 값으로 달성률을 내면 산술적으로 늘 100% 가 됩니다.
       */
      /** 주간 실적이 0 이면 밑값도 없습니다 — '0' 을 깔면 목표가 0 인 것처럼 읽힙니다 */
      targetRef: weekDays && r.weekQty ? Math.round(r.weekQty / weekDays) : null,
      weekQty: r.weekQty ?? 0,
      weekQtyAllShift: r.weekQtyAllShift ?? null,
      weekDays,
    }))
    .sort((a, b) => (b.qty ?? 0) - (a.qty ?? 0));

  /**
   * 합계는 **자르기 전 전량**으로 냅니다
   *
   * 표는 상위 N 종만 보여 주지만 합계까지 그러면 조용히 모자랍니다.
   * 대상일 구간에 실적이 없고 그 주에만 돈 제품(qty 0, weekQty 만 값)도 합계에는 들어가야 합니다.
   */
  const totals = all.reduce(
    (t, r) => ({
      productCnt: t.productCnt + 1,
      qty: t.qty + (r.qty || 0),
      ngQty: t.ngQty + (r.ngQty || 0),
      weekQty: t.weekQty + (r.weekQty || 0),
      idleCnt: t.idleCnt + (r.qty ? 0 : 1),
      noTargetCnt: t.noTargetCnt + (r.savedTarget ? 0 : 1),
    }),
    { productCnt: 0, qty: 0, ngQty: 0, weekQty: 0, idleCnt: 0, noTargetCnt: 0 }
  );

  return {
    rows: topN === 0 ? all : all.slice(0, topN),
    totals,
    processes: (master?.processes || []).filter(isPress),
    processCds: sheet?.processCds || [],
    window: sheet?.periodFrom && sheet?.periodTo
      ? { from: String(sheet.periodFrom).slice(0, 16), to: String(sheet.periodTo).slice(0, 16) }
      : shiftWindow(targetDate),
    baseline: `그 주 보고 구간 일평균 (${weekDays}개 구간)`,
  };
}

/** 하루치 조간회의 자료 — 조회에 실패해도 보고서 전체를 막지 않습니다 */
const sheetOf = (targetDate, processId) =>
  unwrap(productionService.getProductionDailyReportsSheet({ targetDate, processId }), { rows: [] });

/** 소수 첫째 자리까지 (불량률·달성률 표기용) */
const round1 = (n) => Math.round(n * 10) / 10;

/**
 * 회의 결과 저장 — 일목표 · 결정항목 · DRI · 기한
 *
 * 키는 **(대상일, 제품)** 입니다. 보고서 문서가 없어졌으므로 `reportId` 를 쓰지 않습니다.
 * 보낸 제품만 갱신되고, 값에 null 을 보내면 그 칸을 비웁니다. 확정 상태가 없어 언제든 고칠 수 있습니다.
 */
export const saveDailyReportRows = (targetDate, rows) =>
  command(productionService.postProductionDailyReportsRows({ targetDate, rows }));

/* ───────── PR-04 비가동 관리 — 화면 제거됨 ─────────
 *
 * 비가동 사유 등록은 공장 현장의 별도 시스템에서 처리합니다(2026-09-04 결정).
 * 웹 화면·메뉴를 걷어냈고, 서버 API 는 그 시스템이 쓰므로 그대로 둡니다.
 * 되살릴 일이 생기면 이 자리에 loadDowntimes · registerDowntime · updateDowntime 을 다시 둡니다.
 */

