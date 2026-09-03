/**
 * [Controller] PR-02 실적 집계·조회
 */
import { useCallback, useMemo, useState } from 'react';
import { useAsync } from '@shared/hooks/useAsync';
import { usePaging } from '@shared/hooks/usePaging';
import { recentRange } from '@shared/stores/useAppStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadFromServer, downloadXls } from '@shared/utils/exportUtil';
import { minutesText } from '@shared/utils/formatUtil';
import { periodUnit } from '@domains/common/model/paramModel';
import { loadModelOptions, loadResults, trendSeriesOf } from '../model/productionRepository';

export function useProductionResultController() {
  const toast = useUiStore((state) => state.toast);

  const [from, setFrom] = useState(recentRange(7).from);
  const [to, setTo] = useState(recentRange(7).to);
  const [unit, setUnit] = useState('일별');
  const [modelCd, setModelCd] = useState('전체');

  const paging = usePaging({ resetKey: `${from}|${to}|${unit}|${modelCd}` });

  const { data, loading, reload } = useAsync(
    () => loadResults({ from, to, unit, modelCd, ...paging.params }),
    [from, to, unit, modelCd, paging.page, paging.size]
  );

  // 제품 코드는 서버 기준정보에서 받습니다 (화면에 박아 두면 조회가 0건이 됩니다)
  const { data: modelOptions } = useAsync(loadModelOptions, [], { silent: true, initialData: [{ value: '전체', label: '전체' }] });

  const items = data?.results?.items || [];
  const itemsMeta = data?.resultsMeta;

  /**
   * 추이 차트 계열 — 이름으로 골라 냅니다.
   *
   * 명세는 생산량·불량 수량 이중 막대인데 서버는 현재 생산량·불량률·수율을 줍니다.
   * 불량 수량 계열이 있으면 이중 막대로, 없으면 생산량 막대 + 불량률 선으로 그립니다.
   * (수량과 비율을 한 막대 축에 놓으면 비율 막대가 보이지 않습니다)
   */
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
    reload();
    toast(`조회 조건으로 ${(itemsMeta?.total ?? items.length).toLocaleString('ko-KR')}건을 조회했습니다`);
  }, [reload, toast, items.length, itemsMeta?.total]);

  /**
   * 실적 내려받기 — 서버가 파일을 만듭니다.
   *
   * 화면은 쪽 단위로만 들고 있어서 여기서 표를 조립하면 그 쪽만 받게 됩니다.
   * 서버 export 는 조회 조건 전체를 뽑고 내려받기 이력도 직접 남깁니다.
   * 집계 단위·제품은 서버가 쿼리스트링으로 받으므로 경로에 붙입니다(본문은 from·to·format 만 받습니다).
   * 서버가 응답하지 못하면 화면에 있는 만큼이라도 내려받게 둡니다.
   */
  const exportExcel = useCallback(async () => {
    const qs = new URLSearchParams({ unit: periodUnit(unit) || 'day' });
    if (modelCd && modelCd !== '전체') qs.set('modelCd', modelCd);
    const ok = await downloadFromServer({
      path: `/production/results/export?${qs.toString()}`,
      body: { from, to, format: 'xlsx' },
      name: '생산 실적 집계',
    });
    if (ok) return;
    downloadXls({
      name: '생산 실적 집계',
      head: ['일자', '투입', '양품', '불량', '불량률', '가동률', '비가동 시간'],
      rows: items.map((r) => [
        r.period, r.inputQty, r.okQty, r.ngQty,
        r.defectRate === null || r.defectRate === undefined ? '' : `${r.defectRate}%`,
        r.uptimeRate === null || r.uptimeRate === undefined ? '' : `${r.uptimeRate}%`,
        r.downtimeMin === null || r.downtimeMin === undefined ? '' : minutesText(r.downtimeMin),
      ]),
    });
  }, [items, from, to, unit, modelCd]);

  return {
    loading,
    items,
    summary: data?.results?.summary,
    trend: data?.trend,
    trendChart,
    filters: { from, to, unit, modelCd },
    paging,
    itemsMeta,
    modelOptions,
    setFrom,
    setTo,
    setUnit,
    setModelCd,
    search,
    exportExcel,
  };
}
