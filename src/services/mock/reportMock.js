/**
 * 보고서 목 핸들러 (API 20건)
 */
import { nowClock, nowStamp, today } from '@shared/utils/formatUtil';
import {
  LRR_BY_CUSTOMER, LRR_BY_DEFECT, LRR_DEFECT_TOTAL, LRR_MONTHS, LRR_PERCENT_ROW, LRR_QUARTER_TOTAL,
  PLATING_MORNING_ROWS, PLATING_MORNING_TOTAL, PLATING_PROCESS_SUMMARY, PRESS_MORNING_DECISIONS,
  PRESS_MORNING_ROWS, SCRAP_DETAIL, SCRAP_HEADER, SCRAP_LIST, SCRAP_MES_VOUCHERS,
  SCRAP_MODELS, SCRAP_REVIEW_OPINIONS, SCRAP_SUMMARY, SCRAP_UNIT_PRICE,
  SHIP_PLAN_DATA, SHIP_PLAN_MONTHS, YIELD_LOSS_MIX, YIELD_ROWS, YIELD_TOTAL,
  newScrapDraft, signalOf,
} from './data/reports';
import { mockState } from './state';

function store() {
  if (!mockState.store.report) mockState.store.report = { draft: newScrapDraft(), published: [...SCRAP_LIST] };
  return mockState.store.report;
}

/** 작성 상태 기록 (`screenId|baseDate` → 행) */
function stateStore() {
  if (!mockState.store.reportState) mockState.store.reportState = {};
  return mockState.store.reportState;
}

/** 보고서 사용 기록 (screenId → { useCount, lastUsedAt }) */
function usageStore() {
  if (!mockState.store.reportUsage) mockState.store.reportUsage = {};
  return mockState.store.reportUsage;
}
const USAGE_TOP_MAX = 20;
function usageTop(top) {
  const n = Math.min(Math.max(Number(top) || 5, 1), USAGE_TOP_MAX);
  return {
    items: Object.entries(usageStore())
      .sort((a, b) => (b[1].useCount - a[1].useCount) || (b[1].lastUsedAt > a[1].lastUsedAt ? 1 : -1))
      .slice(0, n)
      .map(([screenId, u]) => ({ screenId, ...u })),
  };
}

const sumOf = (arr) => arr.reduce((a, b) => a + b, 0);
const nullableSum = (arr) => {
  let s = 0;
  let any = false;
  arr.forEach((v) => {
    if (v !== null && v !== undefined) {
      s += v;
      any = true;
    }
  });
  return any ? s : null;
};

/** 선택된 전표 + 수기 행을 모델·공정 단위 그룹으로 묶어 금액을 산정합니다 */
function calcGroups(draft) {
  const map = {};
  const out = [];
  SCRAP_MES_VOUCHERS.filter((v) => draft.pickedVoucherIds.includes(v.voucherId)).forEach((v) => {
    const key = `${v.model}|${v.process}`;
    if (!map[key]) {
      map[key] = { key, model: v.model, process: v.process, qty: 0, basePrice: SCRAP_UNIT_PRICE[v.model] || 60.5, source: '기준정보', kind: '공정불량', lotCnt: 0 };
      out.push(map[key]);
    }
    map[key].qty += v.qty;
    map[key].lotCnt += 1;
  });
  draft.manualRows.forEach((m) => {
    out.push({ key: `MAN-${m.rowId}`, model: m.model, process: m.process, qty: m.qty, basePrice: m.unitPrice, source: '수기', kind: m.kind, lotCnt: 0, name: m.name });
  });

  out.forEach((g) => {
    const adj = draft.priceAdj[g.key];
    // 단가를 확정할 수 없는 항목은 '미산정' 으로 두고 금액 합계에서 제외합니다
    g.pending = !!(adj && adj.pending);
    g.unitPrice = g.pending ? 0 : adj ? adj.unitPrice : g.basePrice;
    g.reason = adj ? adj.reason : '';
    g.adjusted = !!(adj && !adj.pending);
    g.amount = g.pending ? 0 : g.qty * g.unitPrice;
  });
  return out;
}

function calcSummary(groups) {
  const s = { totalQty: 0, totalAmt: 0, ngQty: 0, deadQty: 0, lossQty: 0, pendingCnt: 0, pendingQty: 0 };
  groups.forEach((g) => {
    s.totalQty += g.qty;
    s.totalAmt += g.amount;
    if (g.pending) {
      s.pendingCnt += 1;
      s.pendingQty += g.qty;
    }
    if (g.kind === '공정불량') s.ngQty += g.qty;
    else if (g.kind === '불용 재고') s.deadQty += g.qty;
    else s.lossQty += g.qty;
  });
  return s;
}

export const reportMock = {
  /* ── 보고서 작성 상태 (보고서 센터 "오늘 작성할 보고서" · 각 화면 머리말) — API 회신 스펙과 같은 필드명 ── */
  getReportsUsage: ({ top } = {}) => usageTop(top),
  postReportsUsage: ({ screenId }) => {
    const u = usageStore();
    const prev = u[screenId] || { useCount: 0 };
    u[screenId] = { useCount: prev.useCount + 1, lastUsedAt: `${today()} ${nowClock()}` }; // 서버 형식 yyyy-MM-dd HH:mm:ss
    return usageTop(5);
  },

  getReportsStatus: ({ baseDate }) => {
    const d = baseDate || nowStamp().slice(0, 10);
    const recorded = stateStore();
    const derived = {
      'prod-daily': { state: 'DRAFT', source: 'DERIVED', updatedAt: `${d} 08:41:12`, updatedBy: '20220418', updatedByName: '최민아' },
      'rpt-press-morning': { state: 'DRAFT', source: 'DERIVED', updatedAt: `${d} 08:55:03`, updatedBy: '20170905', updatedByName: '정우진' },
    };
    const RANK = { NONE: 0, DRAFT: 1, SUBMITTED: 2, APPROVED: 3 };
    const items = ['prod-daily', 'rpt-press-morning', 'rpt-plating-morning', 'rpt-scrap'].map((screenId) => {
      const rec = recorded[`${screenId}|${d}`];
      const der = derived[screenId];
      // 판정 = max(파생, 기록)
      const pick = rec && (!der || RANK[rec.state] >= RANK[der.state]) ? rec : der;
      return pick ? { screenId, ...pick } : { screenId, state: 'NONE', source: null, updatedAt: null, updatedBy: null, updatedByName: null };
    });
    return { baseDate: d, items };
  },
  putReportsStatus: ({ screenId, baseDate, state }) => {
    if (!['DRAFT', 'SUBMITTED', 'APPROVED'].includes(state)) {
      return { success: false, code: 'E-VALIDATION', message: 'state 는 DRAFT · SUBMITTED · APPROVED 중 하나여야 합니다.', data: null };
    }
    const row = { state, source: 'RECORDED', updatedAt: nowStamp(), updatedBy: mockState.currentUser.empNo, updatedByName: mockState.currentUser.name };
    stateStore()[`${screenId}|${baseDate}`] = row;
    return { success: true, code: 'SUCCESS', message: '작성 상태를 기록했습니다.', data: { screenId, ...row } };
  },

  /* ───────── RP-01 아침회의 자료 (PRESS) ───────── */
  getReportsPressMorning: ({ state }) => {
    let rows = PRESS_MORNING_ROWS.map((r) => {
      const rate = (r.dayActual / r.dayTarget) * 100;
      const weekRate = (r.weekActual / r.weekTarget) * 100;
      return { ...r, rate, weekRate, signal: signalOf(rate) };
    });
    if (state && state !== '전체') rows = rows.filter((r) => r.signal.label === state);

    const dayTarget = sumOf(PRESS_MORNING_ROWS.map((r) => r.dayTarget));
    const dayActual = sumOf(PRESS_MORNING_ROWS.map((r) => r.dayActual));
    const weekTarget = sumOf(PRESS_MORNING_ROWS.map((r) => r.weekTarget));
    const weekActual = sumOf(PRESS_MORNING_ROWS.map((r) => r.weekActual));
    const all = PRESS_MORNING_ROWS.map((r) => signalOf((r.dayActual / r.dayTarget) * 100).label);

    return {
      baseDate: '2026-08-21',
      actualDate: '26.08.20(목)',
      rows,
      summary: {
        dayTarget,
        dayActual,
        avgRate: (dayActual / dayTarget) * 100,
        weekRate: (weekActual / weekTarget) * 100,
        issueCnt: all.filter((x) => x !== '정상').length,
        warnCnt: all.filter((x) => x === '주의').length,
        badCnt: all.filter((x) => x === '위험').length,
        okCnt: all.filter((x) => x === '정상').length,
      },
      total: {
        dayTarget, dayActual, weekTarget, weekActual,
        rate: (dayActual / dayTarget) * 100,
        weekRate: (weekActual / weekTarget) * 100,
        eqptCnt: sumOf(PRESS_MORNING_ROWS.map((r) => r.impactEqptCnt)),
        modelCnt: PRESS_MORNING_ROWS.length,
      },
    };
  },

  getReportsPressMorningDecisions: () => ({ items: PRESS_MORNING_DECISIONS }),

  /* ───────── RP-02 아침회의 자료 (Plating·Coating) ───────── */
  getReportsPlatingMorning: ({ processScope, state }) => {
    let rows = PLATING_MORNING_ROWS;
    if (processScope && processScope !== '전체') rows = rows.filter((r) => r.process === processScope);
    if (state && state !== '전체') rows = rows.filter((r) => r.state === state);
    return {
      baseDate: '2026-08-21',
      actualDate: '26.08.20(목)',
      rows,
      total: PLATING_MORNING_TOTAL,
      processSummary: PLATING_PROCESS_SUMMARY,
      summary: {
        dayTarget: '3,360', dayActual: '3,441', avgRate: '102.4', weekRate: '100.9',
        riskCnt: PLATING_MORNING_ROWS.filter((r) => r.state === '위험').length,
        riskDetail: 'B Plating BOI · 62.0%',
        gap: '+81k',
      },
    };
  },

  /* ───────── RP-03 연간 출하계획 ───────── */
  getReportsShipPlan: ({ modelCd, customerCd }) => {
    let data = SHIP_PLAN_DATA;
    if (modelCd && modelCd !== '전체') data = data.filter((d) => d.code === modelCd);
    data = data.map((d) => ({
      ...d,
      rows: customerCd && customerCd !== '전체' ? d.rows.filter((r) => r.customer === customerCd) : d.rows,
    }));

    const modelSum = data.map((d) => ({
      code: d.code,
      alias: d.alias,
      total: sumOf(d.rows.map((r) => r.total)),
      monthly: SHIP_PLAN_MONTHS.map((_, i) => sumOf(d.rows.map((r) => r.monthly[i]))),
    }));
    const grandTotal = sumOf(modelSum.map((x) => x.total));
    const monthlyTotal = SHIP_PLAN_MONTHS.map((_, i) => sumOf(modelSum.map((x) => x.monthly[i])));
    const peakIndex = monthlyTotal.indexOf(Math.max(...monthlyTotal));

    return {
      months: SHIP_PLAN_MONTHS,
      data,
      modelSum,
      grandTotal,
      monthlyTotal,
      peakMonth: SHIP_PLAN_MONTHS[peakIndex],
      peakQty: monthlyTotal[peakIndex],
      modelCnt: modelSum.length,
      customerCnt: 2,
    };
  },

  /* ───────── RP-04 제품별 수율 ───────── */
  getReportsYieldByModel: ({ modelCd }) => {
    let rows = YIELD_ROWS;
    if (modelCd && modelCd !== '전체') rows = rows.filter((r) => r.model === modelCd);
    const lossTotal = sumOf(YIELD_LOSS_MIX.map(([, v]) => v));
    return {
      yearMonth: '2026년 7월',
      rows,
      total: YIELD_TOTAL,
      lossMix: YIELD_LOSS_MIX.slice()
        .sort((a, b) => b[1] - a[1])
        .map(([label, value]) => ({ label, value, ratio: (value / lossTotal) * 100 })),
      lossTotal,
      summary: { inputQty: '98,090,363', okQty: '97,202,170', yieldRate: '99.1', ngQty: '888,193', target: '99.0' },
    };
  },

  /* ───────── RP-05 고객사별 LRR ───────── */
  getReportsLrrByCustomer: ({ customerCd }) => {
    let customers = LRR_BY_CUSTOMER;
    if (customerCd && customerCd !== '전체') customers = customers.filter((c) => c.name === customerCd);

    const rows = customers.map((c) => {
      const ship = nullableSum(c.ship);
      const lrr = nullableSum(c.lrr);
      return {
        name: c.name,
        ship: c.ship,
        lrr: c.lrr,
        shipTotal: ship,
        lrrTotal: lrr,
        rate: lrr === null || ship === null || !ship ? '-' : `${((lrr / ship) * 100).toFixed(1)}%`,
      };
    });
    const colShip = LRR_MONTHS.map((_, i) => nullableSum(customers.map((c) => c.ship[i])));
    const colLrr = LRR_MONTHS.map((_, i) => nullableSum(customers.map((c) => c.lrr[i])));
    const totalShip = nullableSum(rows.map((r) => r.shipTotal));
    const totalLrr = nullableSum(rows.map((r) => r.lrrTotal));

    return {
      months: LRR_MONTHS,
      byDefectType: LRR_BY_DEFECT,
      lrrPercentRow: LRR_PERCENT_ROW,
      defectTotal: LRR_DEFECT_TOTAL,
      rows,
      colShip,
      colLrr,
      totalShip,
      totalLrr,
      quarterTotal: LRR_QUARTER_TOTAL,
      summary: { shipQty: totalShip, lrrCnt: totalLrr, lrrRate: '0.12', yoyImprove: '-0.24' },
    };
  },

  /* ───────── RP-06 폐기 보고서 ───────── */











};

export { calcGroups, calcSummary };

/* ───────── 명세 외 · 백엔드 구현분 목 ───────── */

/** 폐기 전표 — 위저드 1단계에서 고르는 MES 원장입니다 */
const SCRAP_VOUCHERS = (() => {
  const models = ['KRIOS', 'EOS-S', 'BOI', 'MEM-B', 'CM-01'];
  const procs = ['프레스 공정', 'B 도금 공정', 'A 도금 공정', '코팅 공정'];
  const types = ['chip (찍힘)', 'stain (얼룩)', 'bend (변형)', '미도금', 'BURR'];
  // 발생 구분은 화면(VOUCHER_ORIGIN_TYPES)이 보내는 값과 **같아야** 합니다 — 다르면 거르기에서 0건이 됩니다
  const origins = ['제조공정 발생', '협력업체 발생', 'IQC 발생'];
  const remarks = ['치수 Spec Out', '도금 불량', '외관 스크래치', '불용 재고 정리', '초물 폐기'];
  const out = [];
  for (let i = 0; i < 46; i += 1) {
    const day = `2026-08-${String(10 + (i % 19)).padStart(2, '0')}`;
    out.push({
      voucherId: `SCR-${day.replace(/-/g, '').slice(2)}-${String(i + 1).padStart(3, '0')}`,
      occurDate: day,
      lotNo: `${day.replace(/-/g, '')}-${String(100 + i * 7).padStart(5, '0')}`,
      model: models[i % models.length],
      process: procs[i % procs.length],
      defectType: types[i % types.length],
      qty: 20 + ((i * 37) % 480),
      originType: origins[i % origins.length],
      // 폐기 양식이 「공정불량」과 「그 밖」을 갈라 세웁니다
      scrapKind: i % 5 === 3 ? 'OTHER' : 'DEFECT',
      remark: remarks[i % remarks.length],
      docNo: `PO-2608-${String(200 + i).padStart(4, '0')}`,
    });
  }
  return out.sort((a, b) => (a.occurDate < b.occurDate ? 1 : -1));
})();

Object.assign(reportMock, {
  /** MES 폐기 전표 조회 (RP-07-F01) */
  getReportsScrapMesVouchers: ({ from, to, processId, modelCd, defectTypeCd, originType, page = 1, size = 25 }) => {
    const items = SCRAP_VOUCHERS.filter((v) => {
      if (from && v.occurDate < from) return false;
      if (to && v.occurDate > to) return false;
      if (processId && processId !== '전체' && !v.process.includes(String(processId))) return false;
      if (modelCd && modelCd !== '전체' && v.model !== modelCd) return false;
      if (defectTypeCd && defectTypeCd !== '전체' && !v.defectType.includes(String(defectTypeCd))) return false;
      if (originType && originType !== '전체' && v.originType !== originType) return false;
      return true;
    });
    const p = Math.max(1, Number(page) || 1);
    const sz = Math.max(1, Number(size) || 25);
    return {
      success: true,
      code: 'SUCCESS',
      message: '폐기 전표 조회가 완료되었습니다.',
      data: { items: items.slice((p - 1) * sz, p * sz) },
      meta: { page: p, size: sz, total: items.length, totalPages: Math.max(1, Math.ceil(items.length / sz)) },
      masked: [],
    };
  },
});
