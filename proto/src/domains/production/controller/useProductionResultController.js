/** PR-02 실적 집계·조회 — 일별·전체 제품, 조회 버튼으로 날짜 조건 적용. */
import { useCallback, useMemo, useState } from 'react';
import { useAsync } from '@shared/hooks/useAsync';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadFromServer, downloadXlsxTree } from '@shared/utils/exportUtil';
import { today, shiftDate } from '@shared/utils/formatUtil';
import { loadResults, trendSeriesOf } from '../model/productionRepository';
import { rangeError } from '@domains/dashboard/model/aiDashboardFilterModel';

export function useProductionResultController() {
  const toast = useUiStore((state) => state.toast);
  const [initialRange] = useState(() => {
    const to = today();
    return { from: shiftDate(to, -7), to };
  });
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [applied, setApplied] = useState(initialRange);
  const [exportingGrid, setExportingGrid] = useState(false);
  const [exportingScreen, setExportingScreen] = useState(false);
  // 조회 기간 전체를 받고 Tabulator 내부에서 페이지를 나눕니다.
  const { data, loading, reload } = useAsync(
    () => loadResults({ ...applied, unit: '일별', modelCd: '전체', page: 1, size: 100 }),
    [applied.from, applied.to]
  );
  const items = data?.results?.items || [];
  const trendChart = useMemo(() => {
    const trend = data?.trend;
    if (!trend) return null;
    return {
      labels: trend.labels || [],
      qty: trendSeriesOf(trend, ['생산량', '투입', 'inputQty', 'qty']),
      ngQty: trendSeriesOf(trend, ['불량 수량', '불량수량', 'ngQty']),
      defectRate: trendSeriesOf(trend, ['불량률', 'defectRate']),
    };
  }, [data?.trend]);
  const search = useCallback(() => {
    const error = rangeError(from, to);
    if (error) { toast(error); return; }
    if (applied.from === from && applied.to === to) reload();
    else setApplied({ from, to });
  }, [from, to, applied, reload, toast]);

  const exportExcel = useCallback(async () => {
    if (loading || exportingGrid) return;
    setExportingGrid(true);
    try {
      await downloadXlsxTree({ name: `생산_실적_집계_${applied.from}_${applied.to}`, rows: items });
    } finally { setExportingGrid(false); }
  }, [items, applied, loading, exportingGrid]);

  const exportScreenExcel = useCallback(async () => {
    if (loading || exportingScreen) return;
    setExportingScreen(true);
    try {
      await downloadFromServer({
        path: '/production/results/export?scope=screen&unit=day',
        body: { ...applied, format: 'xlsx' },
        name: `실적_집계_전체_${applied.from}_${applied.to}`,
      });
    } finally { setExportingScreen(false); }
  }, [applied, loading, exportingScreen]);

  return {
    loading, items, summary: data?.results?.summary, trend: data?.trend, trendChart,
    filters: { from, to, unit: '일별' }, period: applied,
    itemsMeta: data?.resultsMeta, setFrom, setTo, search,
    exportExcel, exportScreenExcel, exportingGrid, exportingScreen,
  };
}
