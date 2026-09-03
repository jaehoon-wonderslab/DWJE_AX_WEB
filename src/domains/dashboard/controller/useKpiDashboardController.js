/**
 * [Controller] DB-03 성과지표 대시보드
 */
import { useCallback } from 'react';
import { useAsync } from '@shared/hooks/useAsync';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadXls } from '@shared/utils/exportUtil';
import { exportKpiEvidence, loadKpiDashboard } from '../model/dashboardRepository';

export function useKpiDashboardController() {
  const toast = useUiStore((state) => state.toast);
  const { data, loading } = useAsync(() => loadKpiDashboard(), []);

  // AI 성능 목표는 도넛(요약 segments)과 표(상세 items)가 같은 API 응답을 나눠 씁니다
  const goals = (data?.goalStatus?.items || []).map((g) => ({
    item: g.item,
    key: g.key,
    target: g.target,
    current: g.actual,
    state: g.actual === null || g.actual === undefined ? '측정 전' : g.pass ? '충족' : '미충족',
  }));
  const goalSummary = data?.goalStatus?.segments || [];

  /**
   * KPI 카드 — 서버는 지표 정의와 실측값을 함께 줍니다.
   * 측정값이 아직 없으면(value=null) 게이지는 '데이터 없음' 으로 그려집니다.
   */
  const cards = (data?.cards?.kpis || []).map((k) => ({
    key: k.metricCd,
    title: k.name,
    sub: `가중치 ${Math.round((k.weight || 0) * 100)}%`,
    progress: k.rate,
    level: k.level,
    current: k.value === null || k.value === undefined ? '—' : `${k.value}${k.unit === 'PCT' ? '%' : ''}`,
    target: k.target === null || k.target === undefined ? '—' : `${k.target}${k.unit === 'PCT' ? '%' : ''}`,
  }));

  /** 월별 불량 유형 추이 — {labels, series} 를 누적 막대 [{l,v,v2}] 로 바꿉니다 */
  const trendSeries = data?.defectMonthly?.series || [];
  const defectMonthly = (data?.defectMonthly?.labels || []).map((l, i) => ({
    l: String(l).slice(2),
    v: trendSeries[0]?.data?.[i] ?? 0,
    v2: trendSeries[1]?.data?.[i] ?? 0,
  }));
  const defectMonthlyNames = trendSeries.map((x) => x.name);

  const exportExcel = useCallback(() => {
    downloadXls({
      name: '성과지표',
      head: ['항목', '목표', '현재', '상태'],
      rows: goals.map((g) => [g.item, g.target, g.current ?? '—', g.state]),
    });
  }, [goals]);

  const exportEvidence = useCallback(async () => {
    const res = await exportKpiEvidence('xls');
    toast(res.message || '성과지표 증빙을 내려받았습니다');
  }, [toast]);

  return {
    loading,
    cards,
    trend: data?.trend,
    defectDist: data?.defectDist?.segments || [],
    defectMonthly,
    defectMonthlyNames,
    aiPerf: data?.aiPerf,
    manhour: data?.manhour?.items || [],
    achieve: data?.achieve,
    heatmap: data?.heatmap,
    basis: data?.basis?.kpis || [],
    goals,
    goalSummary,
    exportExcel,
    exportEvidence,
  };
}
