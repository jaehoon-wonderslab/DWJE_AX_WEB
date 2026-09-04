/**
 * [Controller] DB-02 공정 및 제품 대시보드
 *
 * 공정·제품 선택 상태는 화면 간 공유가 필요해 전역 스토어(useAppStore)에 둡니다.
 * 선택이 바뀌면 리포지토리를 다시 호출해 모든 카드가 함께 갱신됩니다.
 */
import { useCallback, useEffect } from 'react';
import { useAsync } from '@shared/hooks/useAsync';
import { useAppStore } from '@shared/stores/useAppStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadXls } from '@shared/utils/exportUtil';
import { DEFAULT_PLANT_CD, fetchDataRange } from '@domains/common/model/dataRangeRepository';
import { firstError } from '@services/api/request';
import { loadProcessDashboard, loadProcessMasters } from '../model/dashboardRepository';

export function useProcessDashboardController() {
  const baseDate = useAppStore((state) => state.baseDate);
  const processId = useAppStore((state) => state.dashProcess);
  const models = useAppStore((state) => state.dashModels);
  const topN = useAppStore((state) => state.dashTopN);
  const recentModels = useAppStore((state) => state.recentModels);
  const setDashProcess = useAppStore((state) => state.setDashProcess);
  const setDashModels = useAppStore((state) => state.setDashModels);
  const setDashTopN = useAppStore((state) => state.setDashTopN);
  const setBaseDate = useAppStore((state) => state.setBaseDate);
  const toggleDashModel = useAppStore((state) => state.toggleDashModel);
  const toast = useUiStore((state) => state.toast);

  // 선택 UI 를 구성할 마스터 (공정이 정해지면 그 공정의 생산 제품까지 함께 받습니다)
  const { data: masters } = useAsync(
    () => loadProcessMasters(baseDate, processId),
    [baseDate, processId],
    { silent: true }
  );
  const processes = masters?.processes?.processes || [];
  const products = masters?.products?.products || [];
  const madeProducts = masters?.madeProducts?.items || [];

  /**
   * 기본 공정 — 기준일에 실적이 가장 많은 공정.
   * 서버 공정 목록은 ID 순이라 첫 항목이 실적 없는 공정일 수 있습니다.
   */
  const activeProcesses = masters?.activeProcesses?.items || [];
  const busiest = [...activeProcesses].sort((a, b) => (b.qty || 0) - (a.qty || 0))[0];
  const fallback = processes.find((p) => p.id === busiest?.processId) || processes[0];

  // 저장된 공정이 서버 목록에 없으면(초기값·공정 개편) 기본 공정으로 맞춥니다
  const proc = processes.find((p) => p.id === processId) || fallback;

  useEffect(() => {
    if (proc && proc.id !== processId) setDashProcess(proc.id);
  }, [proc, processId, setDashProcess]);

  /** 지금 선택된 공정으로 받아 온 마스터인지 (공정 확정 직후의 이전 응답 방지) */
  const mastersReady = !!processId && masters?.forProcessId === processId;

  // 첫 진입 기본 선택 — 그날 그 공정이 실제로 만든 제품 상위 5종
  useEffect(() => {
    if (models.length || !mastersReady || !madeProducts.length) return;
    setDashModels(madeProducts.slice(0, 5).map((x) => x.product));
  }, [models.length, mastersReady, madeProducts, setDashModels]);

  /**
   * 그 공정이 기준일에 아무것도 만들지 않은 경우
   *
   * 여기서 제품군 순위 같은 무관한 제품으로 채우면 "선택은 됐는데 값이 0" 이라
   * 사용자가 원인을 오해합니다. 채우지 않고 이유를 알려 줍니다.
   */
  const noProduction = mastersReady && !madeProducts.length && !models.length;

  const { data, loading } = useAsync(
    () => loadProcessDashboard({ date: baseDate, processId: proc?.id, productCodes: models }),
    [baseDate, proc?.id, models.join(',')],
    { skip: !models.length || !proc }
  );

  const rows = data?.detail?.items || [];
  const summary = data?.summary || {};
  const target = proc?.targetYield ?? 97;

  /**
   * 조회가 막혔을 때의 안내
   *
   * 등록되지 않은 공정 코드로 조회하면 서버가 404 를 줍니다.
   * 그냥 두면 위젯만 비어 원인을 알 수 없으므로 화면 위에 이유를 띄웁니다.
   */
  const loadError = firstError(data);

  /** 주력 제품 Top N 선택 */
  const pickTopN = useCallback(
    (n) => {
      setDashTopN(n);
      setDashModels(n === 'all' ? products.map((p) => p.code) : products.filter((p) => p.rank <= n).map((p) => p.code));
    },
    [products, setDashModels, setDashTopN]
  );

  /**
   * 공정 변경
   *
   * 공정마다 실적 보유 구간이 다릅니다(예: W120 은 08-30, W110 은 08-29 가 마지막).
   * 전사 기준일 그대로 두면 그 공정에 실적이 없어 0 으로 보이므로,
   * 바뀐 공정의 보유 구간을 다시 받아 기준일을 그 공정의 마지막 실적일로 맞춥니다.
   */
  const changeProcess = useCallback(
    async (id) => {
      setDashProcess(id);
      setDashModels([]); // 공정이 바뀌면 제품 선택도 그 공정 기준으로 다시 고릅니다
      const name = processes.find((p) => p.id === id)?.name || id;

      const res = await fetchDataRange(DEFAULT_PLANT_CD, id);
      if (res.ok && res.range?.toDate && res.range.toDate !== baseDate) {
        setBaseDate(res.range.toDate);
        toast(`${name} — 실적 마지막 날짜인 ${res.range.toDate} 기준으로 조회합니다`);
      } else {
        toast(`${name} 기준으로 다시 계산했습니다`);
      }
    },
    [processes, setDashProcess, setDashModels, setBaseDate, baseDate, toast]
  );

  /** 선택 칩 해제 (최소 1개는 남깁니다) */
  const removeModel = useCallback(
    (code) => {
      if (!toggleDashModel(code)) toast('제품은 1개 이상 선택해야 합니다');
    },
    [toggleDashModel, toast]
  );

  /** 제품 선택 팝업 결과 반영 */
  const applyModels = useCallback(
    (codes) => {
      setDashModels(codes);
      setDashTopN('custom');
    },
    [setDashModels, setDashTopN]
  );

  const addModel = useCallback(
    (code) => {
      if (!models.includes(code)) applyModels([...models, code]);
    },
    [models, applyModels]
  );

  /**
   * 기본값으로 되돌리기
   *
   * 공정을 고정 값으로 되돌리면 안 됩니다 — 서버 공정 코드는 W110·W150·W120 처럼
   * 사업장마다 다르고 개편될 수도 있습니다. 기준일에 실적이 가장 많은 공정으로 돌립니다.
   * 제품은 비워 두면 위의 기본 선택 로직이 그 공정의 생산 제품으로 다시 채웁니다.
   */
  const resetSelection = useCallback(() => {
    const id = fallback?.id || '';
    setDashProcess(id);
    setDashModels([]);
    setDashTopN(5);
    toast(`${fallback?.name || '기본 공정'} 기준으로 되돌렸습니다`);
  }, [fallback, setDashProcess, setDashModels, setDashTopN, toast]);

  const exportExcel = useCallback(() => {
    downloadXls({
      name: '공정 및 제품 대시보드',
      head: ['순위', '제품', '고객사', '프로젝트', '투입', '양품', '불량', '불량률', '수율', '가동률'],
      rows: rows.map((r) => [r.rank, r.code, r.customer, r.project, r.qty, r.okQty, r.ngQty, `${r.defectRate}%`, `${r.yieldRate}%`, `${r.uptimeRate}%`]),
    });
  }, [rows]);

  // 실적이 없는 공정으로 바꾼 직후에는 이전 공정 수치가 남아 있으면 안 됩니다.
  // 안내는 안내대로 띄우고 카드는 비웁니다.
  const view = noProduction ? {} : data || {};

  return {
    loading: (loading || !models.length) && !noProduction,
    loadError,
    noProduction,
    baseDate,
    processes,
    products,
    proc,
    processId,
    models,
    topN,
    recentModels,
    target,
    summary: noProduction ? {} : summary,
    rows: noProduction ? [] : rows,
    trend: view.trend,
    production: view.production,
    composition: view.composition,
    productYield: view.productYield,
    productUptime: view.productUptime,
    processCompare: view.processCompare,
    heatmap: view.heatmap,
    processYield: view.processYield,
    changeProcess,
    pickTopN,
    removeModel,
    applyModels,
    addModel,
    resetSelection,
    exportExcel,
  };
}
