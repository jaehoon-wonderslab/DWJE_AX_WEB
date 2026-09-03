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
import { loadProcessOptions } from '@domains/common/model/dataRangeRepository';
import { MONITOR_STATE_OPTIONS, loadMonitor, monitorStateLabel } from '../model/productionRepository';

const POLL_MS = 10000;

export function useProductionMonitorController() {
  const toast = useUiStore((state) => state.toast);

  const [processId, setProcessId] = useState('전체');
  const [model, setModel] = useState('전체');
  const [state, setState] = useState('전체');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // 모델 선택지는 설비 목록의 실제 값에서 만듭니다 (박아 둔 값은 서버에 존재하지 않습니다)
  const { data: modelPool } = useAsync(() => loadMonitor({ size: 500 }), [], { silent: true });
  const { data: processOptions } = useAsync(loadProcessOptions, [], { silent: true, initialData: [{ value: '전체', label: '전체' }] });

  // 설비가 1,000대를 넘어 한 쪽씩 끊어 봅니다 (조회 조건이 바뀌면 1쪽으로)
  const paging = usePaging({ resetKey: `${processId}|${model}|${state}` });

  const { data, loading, reload } = useAsync(
    () => loadMonitor({ processId, model, state, ...paging.params }),
    [processId, model, state, paging.page, paging.size],
    { silent: true }
  );

  const items = data?.equipments?.items || [];
  const itemsMeta = data?.equipmentsMeta;

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

  const exportExcel = useCallback(() => {
    const pct = (v) => (v === null || v === undefined ? '' : `${fixed(v)}%`);
    downloadXls({
      name: '생산 모니터링',
      head: ['설비', '설비명', '모델', '생산량', '불량률', '가동률', '타발 속도', '최근 수집', '상태'],
      rows: items.map((l) => [
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
  }, [items]);

  return {
    loading,
    summary: data?.summary,
    items,
    paging,
    itemsMeta,
    filters: { processId, model, state },
    processOptions,
    modelOptions: ['전체', ...new Set((modelPool?.equipments?.items || []).map((x) => x.model).filter((m) => m && String(m).trim()))],
    stateOptions: MONITOR_STATE_OPTIONS,
    setProcessId,
    setModel,
    setState,
    autoRefresh,
    toggleAutoRefresh,
    search,
    exportExcel,
  };
}
