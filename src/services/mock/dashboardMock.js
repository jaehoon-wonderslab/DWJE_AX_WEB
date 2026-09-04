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
  getDashboardAiBriefing: () => ({
    status: 'WARN',
    overallYield: 97.86,
    targetYield: 97.0,
    overallDefectRate: 2.14,
    targetDefectRate: 3.0,
    todayQty: 142850,
    planQty: 150000,
    achievementRate: 95.2,
    criticalLine: {
      eqptCd: 'PR-03',
      eqptNm: '프레스 3호기 (PR-03)',
      defectRate: 4.25,
      primaryDefect: '치수 불량',
      anomalyScore: 84,
    },
    summaryLines: [
      '금일 제1공장 평균 불량률은 2.14% (관리 목표 3.0% 대비 양호)이며, 일일 계획 대비 생산 달성률은 95.2%를 기록 중입니다.',
      '실시간 모니터링 분석 결과, 프레스 3호기 (PR-03) 설비에서 치수 불량 비중 증가로 불량률이 4.25%까지 상승한 국소 이상 징후가 감지되었습니다.',
      'AI 인과관계 추론(XAI) 결과, 타발 압력 편차(±14%) 및 금형 온도 상승(48.5℃)이 해당 불량 발생 원인의 58%를 차지하고 있습니다.',
      '프레스 3호기의 SPM 타발 속도 5% 일시 감속 및 하사점(BDC) +2μm 미세 보정을 권고합니다.',
    ],
    generatedAt: '2026-09-04 22:50:00',
    engine: 'Master AI v2.4 (Qwen2.5-7B LoRA + GraphRAG)',
  }),
  getDashboardAiCausePrescription: ({ eqptCd = 'PR-03' } = {}) => {
    const code = String(eqptCd).toUpperCase();
    const availableEquipments = [
      { eqptCd: 'PR-01', eqptNm: '프레스 1호기 (PR-01)', defectRate: 1.82, riskLevel: 'NORMAL' },
      { eqptCd: 'PR-02', eqptNm: '프레스 2호기 (PR-02)', defectRate: 2.15, riskLevel: 'NORMAL' },
      { eqptCd: 'PR-03', eqptNm: '프레스 3호기 (PR-03)', defectRate: 4.25, riskLevel: 'CRITICAL' },
      { eqptCd: 'PR-04', eqptNm: '프레스 4호기 (PR-04)', defectRate: 2.30, riskLevel: 'NORMAL' },
      { eqptCd: 'PR-05', eqptNm: '프레스 5호기 (PR-05)', defectRate: 3.42, riskLevel: 'WARN' },
      { eqptCd: 'PR-06', eqptNm: '프레스 6호기 (PR-06)', defectRate: 1.95, riskLevel: 'NORMAL' },
      { eqptCd: 'PR-07', eqptNm: '프레스 7호기 (PR-07)', defectRate: 2.05, riskLevel: 'NORMAL' },
      { eqptCd: 'PR-08', eqptNm: '프레스 8호기 (PR-08)', defectRate: 1.70, riskLevel: 'NORMAL' },
      { eqptCd: 'PR-09', eqptNm: '프레스 9호기 (PR-09)', defectRate: 2.65, riskLevel: 'WARN' },
      { eqptCd: 'PR-10', eqptNm: '프레스 10호기 (PR-10)', defectRate: 1.88, riskLevel: 'NORMAL' },
    ];
    return {
      selectedEqpt: {
        eqptCd: code,
        eqptNm: availableEquipments.find((x) => x.eqptCd === code)?.eqptNm || `프레스 (${code})`,
        model: 'A-Type High Speed Press (110T)',
        anomalyScore: code === 'PR-03' ? 84 : code === 'PR-05' ? 72 : 25,
        riskLevel: code === 'PR-03' ? 'CRITICAL' : code === 'PR-05' ? 'WARN' : 'NORMAL',
        defectRate: code === 'PR-03' ? 4.25 : code === 'PR-05' ? 3.42 : 1.85,
        primaryDefect: code === 'PR-03' ? '치수 불량 (DIM_NG)' : code === 'PR-05' ? '버 / 찍힘 (BURR_NG)' : '미세 스크래치 (극소량)',
      },
      availableEquipments,
      featureContributions: [
        { factor: '타발 압력 편차 (Peak Tonnage)', importance: 36.5, measured: '118.4 Ton (정상 105±5)', impact: code === 'PR-03' ? 'CRITICAL' : 'NORMAL', description: '상하 타발 압력 불균형 및 피크 하중 초과' },
        { factor: '타발 속도 (SPM)', importance: 22.0, measured: '182 SPM (정상 160~170)', impact: code === 'PR-03' ? 'WARN' : 'NORMAL', description: '고속 타발에 의한 원자재 미세 슬립 현상' },
        { factor: '금형 온도 (Die Temp)', importance: 18.2, measured: '48.5 ℃ (정상 35~42)', impact: code === 'PR-03' ? 'WARN' : 'NORMAL', description: '연속 타발로 인한 하형 다이 열팽창' },
        { factor: '하사점 변위 (BDC Offset)', importance: 13.8, measured: '+8.2 μm (정상 ±3.0)', impact: code === 'PR-03' ? 'WARN' : 'NORMAL', description: '금형 하사점 정밀도 허용공차 초과' },
        { factor: '피딩 텐션 (Feed Tension)', importance: 9.5, measured: '4.2 kgf (정상 4.0±0.5)', impact: 'NORMAL', description: '코일 원자재 공급 장력 양호' },
      ],
      prescriptions: [
        {
          priority: 1,
          title: '프레스 SPM 속도 5~10% 일시 감속 권고',
          action: '현재 182 SPM을 165 SPM으로 하향 조정하여 금형 열부하 저감 및 원자재 이송 안정화 유도',
          targetFactor: '타발 속도 (SPM)',
          expectedImpact: '치수 불량률 -1.8%p 개선 예상',
        },
        {
          priority: 2,
          title: '하사점(BDC) 오프셋 미세 보정 및 다이 냉각 점검',
          action: '서보 프레스 BDC 위치를 -5μm 보정하고, 하형 냉각 노즐 분사압 정상 여부 점검',
          targetFactor: '하사점 변위 & 금형 온도',
          expectedImpact: '타발 치수 공차(±0.02mm) 이내 복귀',
        },
      ],
      analyzedAt: '2026-09-04 22:50:00',
    };
  },

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
