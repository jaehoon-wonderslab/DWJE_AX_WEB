/**
 * [Controller] PR-01 생산 모니터링
 *
 * 실시간 갱신 — 폴링 10초 (「공통 규약」 7절)
 */
import { useCallback, useEffect, useState } from 'react';
import { useAsync } from '@shared/hooks/useAsync';
import { usePaging } from '@shared/hooks/usePaging';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadXls } from '@shared/utils/exportUtil';
import { fixed } from '@shared/utils/formatUtil';
import { loadMonitor, monitorStateLabel } from '../model/productionRepository';

const POLL_MS = 10000;

export function useProductionMonitorController() {
  const toast = useUiStore((state) => state.toast);

  const [targetDate, setTargetDate] = useState('2026-08-30');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // 설비가 1,000대를 넘어 한 쪽씩 끊어 봅니다 (조회 조건이 바뀌면 1쪽으로)
  const paging = usePaging({ resetKey: targetDate });

  const { data, loading, reload } = useAsync(
    () => loadMonitor({ targetDate, ...paging.params }),
    [targetDate, paging.page, paging.size],
    { silent: true }
  );

  const items = data?.equipments?.items || [];
  const itemsMeta = data?.equipmentsMeta;

  // 마지막 갱신 시각 — 실시간 화면인데 값이 전부 0 이면 살아 있는지 알 수 없습니다
  const [updatedAt, setUpdatedAt] = useState(null);
  useEffect(() => {
    if (data) setUpdatedAt(new Date());
  }, [data]);

  /**
   * 값이 비는 이유가 둘인데 성격이 다릅니다. 섞어서 안내하면 오해가 생깁니다.
   *
   *  iotMissing     가동률·타발 속도·최근 수집 — IoT 수집 경로가 아직 없어 **상시** 빈 값입니다
   *                 (원천 ax.tb_met_metric_value 가 0행)
   *  noOutputToday  생산량·불량률 — 모니터링은 당일 기준이라, 그날 이관 전이면 0 입니다.
   *                 이관이 돌면 채워집니다. 오전에는 정상적으로 0 일 수 있습니다
   */
  const iotMissing = items.length > 0
    && items.every((x) => x.uptimeRate === null && x.strokeSpeed === null && !x.lastCollectedAt);
  const noOutputToday = items.length > 0 && items.every((x) => !x.qty);

  // 10초마다 자동 새로고침 (조회 조건은 그대로 유지 · 화면을 떠나면 정리)
  useEffect(() => {
    if (!autoRefresh) return undefined;
    const timer = setInterval(reload, POLL_MS);
    return () => clearInterval(timer);
  }, [autoRefresh, reload]);

  const toggleAutoRefresh = useCallback(() => {
    setAutoRefresh((v) => {
      toast(v ? '자동 새로고침을 껐습니다' : '10초 간격 자동 새로고침을 켰습니다');
      return !v;
    });
  }, [toast]);

  const search = useCallback(() => {
    reload();
    toast(`조회 조건으로 ${(itemsMeta?.total ?? items.length).toLocaleString('ko-KR')}건을 조회했습니다`);
  }, [reload, toast, items.length, itemsMeta?.total]);

  /**
   * 엑셀 내려받기 — 화면은 한 쪽만 보여 주지만 파일은 조회 조건 전체여야 합니다.
   * 설비가 1,331대라 현재 쪽만 받으면 50대짜리 파일이 나옵니다.
   */
  const exportExcel = useCallback(async () => {
    let rows = items;
    try {
      // size=0 은 전량입니다 (한 쪽 상한 1,000 을 넘어 전부 옵니다)
      const all = await loadMonitor({ targetDate, size: 0 });
      rows = all?.equipments?.items || items;
    } catch {
      toast('전체를 불러오지 못해 현재 쪽만 내려받습니다');
    }
    const pct = (v) => (v === null || v === undefined ? '' : `${fixed(v)}%`);
    downloadXls({
      name: '생산 모니터링',
      head: ['설비', '설비명', '모델', '생산량', '불량률', '가동률', '타발 속도', '최근 수집', '상태'],
      rows: rows.map((l) => [
        l.eqptCd,
        l.eqptNm || '',
        l.model || '',
        l.qty ?? '',
        pct(l.defectRate),
        pct(l.uptimeRate),
        l.strokeSpeed === null || l.strokeSpeed === undefined ? '' : `${l.strokeSpeed} spm`,
        l.lastCollectedAt || '',
        monitorStateLabel(l.state),
      ]),
    });
  }, [items, targetDate, itemsMeta?.total, toast]);

  return {
    loading,
    summary: data?.summary,
    items,
    paging,
    itemsMeta,
    filters: { targetDate },
    iotMissing,
    noOutputToday,
    updatedAt,
    setTargetDate,
    autoRefresh,
    toggleAutoRefresh,
    search,
    exportExcel,
  };
}
