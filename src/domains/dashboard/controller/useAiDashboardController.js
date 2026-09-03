/**
 * [Controller] DB-01 AI 통합 대시보드
 *
 * 화면 상태와 데이터 로딩, 도메인 동작만 담당합니다. (JSX 없음)
 * 모달·토스트 같은 화면 표현은 View 가 처리합니다.
 */
import { useCallback } from 'react';
import { useAsync } from '@shared/hooks/useAsync';
import { usePaging } from '@shared/hooks/usePaging';
import { useAppStore } from '@shared/stores/useAppStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadXls } from '@shared/utils/exportUtil';
import { fetchAiLines, fetchEquipmentDetail, loadAiDashboard } from '../model/dashboardRepository';

export function useAiDashboardController() {
  const baseDate = useAppStore((state) => state.baseDate);
  const toast = useUiStore((state) => state.toast);

  const { data, loading, reload } = useAsync(() => loadAiDashboard(baseDate), [baseDate]);

  // 라인별 현황은 설비가 1,300대를 넘어 따로 · 쪽 단위로 조회합니다.
  // 대시보드 묶음과 분리해 두어야 쪽을 넘길 때 차트 11개를 다시 부르지 않습니다.
  const paging = usePaging({ resetKey: baseDate });
  const { data: lineData, loading: linesLoading, reload: reloadLines } = useAsync(
    () => fetchAiLines(baseDate, paging.params),
    [baseDate, paging.page, paging.size],
    { silent: true }
  );

  const lines = lineData?.lines || [];

  /** 설비 상세 조회 — 모달 표시는 View 가 합니다 */
  const loadEquipmentDetail = useCallback((eqptCd) => fetchEquipmentDetail(eqptCd, baseDate), [baseDate]);

  /**
   * 라인별 현황을 엑셀로 내려받습니다.
   *
   * 화면은 한 쪽만 보여 주지만 내려받기는 전량이어야 합니다 (size 0 = 전량).
   */
  const exportExcel = useCallback(async () => {
    let rows = lines;
    try {
      const all = await fetchAiLines(baseDate, { size: 0 });
      rows = all.lines;
    } catch {
      toast('전체를 불러오지 못해 현재 쪽만 내려받습니다');
    }
    downloadXls({
      name: 'AI 통합 대시보드',
      head: ['설비', '모델', '생산량', '불량률', '가동률', '상태'],
      rows: rows.map((l) => [l.eqptCd, l.model, l.qty, `${l.defectRate}%`, `${l.uptimeRate}%`, l.state]),
    });
  }, [lines, baseDate, toast]);

  const refresh = useCallback(() => {
    reload();
    reloadLines();
    toast('최신 데이터로 새로고침했습니다');
  }, [reload, reloadLines, toast]);

  return {
    loading,
    baseDate,
    summary: data?.summary || {},
    trend: data?.trend,
    lineProduction: data?.lineProduction,
    qualityIndex: data?.qualityIndex,
    composition: data?.composition,
    processYield: data?.processYield,
    planActual: data?.planActual,
    heatmap: data?.heatmap,
    alerts: data?.alerts?.alerts || [],
    agents: data?.agents?.agents || [],
    lines,
    linesLoading,
    linesMeta: lineData?.meta,
    paging,
    loadEquipmentDetail,
    exportExcel,
    refresh,
  };
}
