/**
 * 대시보드 목 핸들러 (API 34건)
 *
 * DB-02 는 선택한 공정·제품에 따라 값을 그때그때 계산합니다.
 */
import {
  AGENTS, AI_DEFECT_COMPOSITION, AI_DEFECT_TREND, AI_GOAL_DONUT, AI_PERF_AXES, AI_PERF_GOALS,
  AI_PLAN_VS_ACTUAL, AI_PROCESS_YIELD, AI_QUALITY_INDEX, AI_SUMMARY, AI_UPTIME_HEATMAP,
  ALERT_SUMMARY, DEFECT_DISTRIBUTION, DEFECT_MONTHLY, KPI_ACHIEVE_TREND, KPI_BASIS, KPI_CARDS,
  KPI_TREND, MANHOUR_BY_DEPT, MASTER_AI, METRIC_HEATMAP,
} from './data/dashboard';
import { factOf, LINES, MOLDS, PROC_DEFECT, PROC_TREND, PROCESSES, PRODUCTS } from './data/masters';

/** 선택된 제품들의 공정 실적을 계산합니다 */
function rowsOf(processId, codes) {
  const list = (codes?.length ? codes : PRODUCTS.slice(0, 5).map((p) => p.code)).map((code) => {
    const p = PRODUCTS.find((x) => x.code === code) || { code, rank: 99, customer: '—', project: '—' };
    const f = factOf(processId, code);
    const ngQty = Math.round((f.qty * f.defectRate) / 100);
    return {
      code,
      rank: p.rank,
      customer: p.customer,
      project: p.project,
      qty: f.qty,
      okQty: f.qty - ngQty,
      ngQty,
      defectRate: f.defectRate,
      yieldRate: Number((100 - f.defectRate).toFixed(1)),
      uptimeRate: f.uptimeRate,
    };
  });
  return list.sort((a, b) => a.rank - b.rank);
}

/** 합계 지표 — 불량률·수율은 가중 평균(총불량/총투입)으로 산출합니다 */
function summaryOf(processId, codes) {
  const rows = rowsOf(processId, codes);
  const qty = rows.reduce((a, r) => a + r.qty, 0);
  const ngQty = rows.reduce((a, r) => a + r.ngQty, 0);
  const defectRate = qty ? Number(((ngQty / qty) * 100).toFixed(1)) : 0;
  return {
    qty,
    okQty: qty - ngQty,
    ngQty,
    defectRate,
    yieldRate: Number((100 - defectRate).toFixed(1)),
    avgUptime: rows.length ? Math.round(rows.reduce((a, r) => a + r.uptimeRate, 0) / rows.length) : 0,
    productCnt: rows.length,
  };
}

export const dashboardMock = {
  /* ───────── DB-01 AI 통합 대시보드 ───────── */
  getDashboardAiSummary: () => AI_SUMMARY,
  getDashboardAiDefectTrend: () => AI_DEFECT_TREND,
  getDashboardAiLineProduction: () => ({ lines: LINES.map((l) => ({ eqptCd: l.eqptCd, qty: l.qty, defectRate: l.defectRate })) }),
  getDashboardAiQualityIndex: () => ({ axes: AI_QUALITY_INDEX }),
  getDashboardAiDefectComposition: () => AI_DEFECT_COMPOSITION,
  getDashboardAiProcessYield: () => AI_PROCESS_YIELD,
  getDashboardAiPlanVsActual: () => AI_PLAN_VS_ACTUAL,
  getDashboardAiEquipmentUptimeHeatmap: () => AI_UPTIME_HEATMAP,
  getDashboardAiLines: () => ({ lines: LINES }),
  getDashboardAiAlerts: () => ({ alerts: ALERT_SUMMARY }),
  getDashboardAiAgents: () => ({ master: MASTER_AI, agents: AGENTS }),

  getProductionEquipmentsByEqptCd: ({ eqptCd }) => {
    const l = LINES.find((x) => x.eqptCd === eqptCd) || LINES[0];
    const mold = MOLDS.find((m) => m.eqptCd === l.eqptCd);
    return {
      eqptCd: l.eqptCd,
      model: l.model,
      qty: l.qty,
      defectRate: l.defectRate,
      uptimeRate: l.uptimeRate,
      workcenter: 'Press / 제1공장',
      iotState: l.state === '비가동' ? '정지 신호 수신' : '정상 수신 (지연 12초)',
      stopElapsedMin: l.state === '비가동' ? 34 : 0,
      mold: mold ? `${mold.moldCd} · 잔여 ${mold.remainShot.toLocaleString()} 타` : '—',
    };
  },

  /* ───────── DB-02 공정 및 제품 대시보드 ───────── */
  getDashboardProcessSummary: ({ processId, productCodes }) => summaryOf(processId, productCodes),

  getDashboardProcessDefectTrend: ({ processId }) => ({
    labels: ['06', '08', '10', '12', '14', '16', '18', '20'],
    series: [{ name: `${PROCESSES.find((p) => p.id === processId)?.name || processId} 불량률 (%)`, data: PROC_TREND[processId] || PROC_TREND.Press }],
    target: Number((100 - (PROCESSES.find((p) => p.id === processId)?.targetYield ?? 97)).toFixed(1)),
  }),

  getDashboardProcessProductProduction: ({ processId, productCodes }) => ({
    items: rowsOf(processId, productCodes).map((r) => ({ product: r.code, qty: r.qty, defectRate: r.defectRate })),
  }),

  getDashboardProcessDefectComposition: ({ processId }) => ({
    segments: (PROC_DEFECT[processId] || PROC_DEFECT.Press).map(([label, value]) => ({ label, value })),
  }),

  getDashboardProcessProductYield: ({ processId, productCodes }) => {
    const target = PROCESSES.find((p) => p.id === processId)?.targetYield ?? 97;
    return {
      target,
      items: rowsOf(processId, productCodes).map((r) => ({
        product: r.code,
        yieldRate: r.yieldRate,
        level: r.yieldRate < target - 1.5 ? 'bad' : r.yieldRate < target ? 'warn' : '',
      })),
    };
  },

  getDashboardProcessProductUptime: ({ processId, productCodes }) => ({
    items: rowsOf(processId, productCodes).map((r) => ({ product: r.code, uptimeRate: r.uptimeRate })),
  }),

  getDashboardProcessProcessCompare: ({ productCodes }) => ({
    items: PROCESSES.map((pr) => {
      let q = 0;
      let g = 0;
      (productCodes || []).forEach((code) => {
        const f = factOf(pr.id, code);
        q += f.qty;
        g += (f.qty * f.defectRate) / 100;
      });
      return { process: pr.id, defectRate: q ? Number(((g / q) * 100).toFixed(1)) : 0 };
    }),
  }),

  getDashboardProcessEquipmentUptimeHeatmap: ({ processId }) => {
    const proc = PROCESSES.find((p) => p.id === processId) || PROCESSES[0];
    return {
      cols: ['06', '08', '10', '12', '14', '16', '18', '20'],
      rows: Array.from({ length: proc.eqptCnt }, (_, i) => `${proc.pre}-${String(i + 1).padStart(2, '0')}`),
      lo: 40,
      hi: 100,
      data: Array.from({ length: proc.eqptCnt }, (_, i) => {
        const base = 86 + ((i * 7) % 9) - 3;
        return [0, 1, 2, 3, 4, 5, 6, 7].map((t) => {
          // 일부 설비의 오전 구간에 의도적으로 낮은 값을 넣어 히트맵 대비를 만듭니다
          const dip = i % 4 === 2 && t >= 2 && t <= 3 ? 34 : i % 5 === 0 && t === 3 ? 12 : 0;
          return Math.max(38, Math.min(97, base + [3, 4, 1, -3, 0, 2, 1, 0][t] - dip));
        });
      }),
    };
  },

  getDashboardProcessProducts: ({ processId, productCodes }) => ({ items: rowsOf(processId, productCodes) }),

  getDashboardProcessTopProducts: ({ n = 5 }) => ({ products: PRODUCTS.filter((p) => p.rank <= n) }),

  getDashboardProcessSelectionSummary: ({ processId, productCodes }) => ({
    process: processId,
    productCnt: productCodes?.length || 0,
    ...summaryOf(processId, productCodes),
  }),

  /* ───────── DB-03 성과지표 대시보드 ───────── */
  getDashboardKpiSummary: () => ({ cards: KPI_CARDS }),
  getDashboardKpiTrend: () => KPI_TREND,
  getDashboardKpiDefectDistribution: () => ({ items: DEFECT_DISTRIBUTION }),
  getDashboardKpiDefectTypeTrend: () => ({ items: DEFECT_MONTHLY }),
  getDashboardKpiAiPerformance: () => ({ axes: AI_PERF_AXES }),
  getDashboardKpiManhourSaving: () => ({ items: MANHOUR_BY_DEPT }),
  getDashboardKpiAchievementTrend: () => KPI_ACHIEVE_TREND,
  getDashboardKpiAiTargetStatus: () => ({ summary: AI_GOAL_DONUT, items: AI_PERF_GOALS }),
  getDashboardKpiMonthlyMatrix: () => METRIC_HEATMAP,
  getDashboardKpiBasis: () => ({ items: KPI_BASIS }),
  postDashboardKpiEvidenceExport: () => ({
    success: true,
    code: 'SUCCESS',
    message: '성과지표 증빙 파일을 생성했습니다 (다운로드 이력에 기록됨)',
    data: { fileName: '성과지표_증빙_20260828.xls' },
  }),
};

export { rowsOf, summaryOf };
