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

/**
 * 공정 선택지 — 설비가 실제로 있는 공정만, 이름은 기준정보에서 붙입니다.
 *
 * @param {Array} rows 설비 목록
 * @param {Array} master loadProcessOptions() 결과 (`{value,label}`)
 */
function buildProcessOptions(rows, master) {
  const present = [...new Set((rows || []).map((x) => x.processId).filter(Boolean))];
  const nameOf = Object.fromEntries((master || []).map((m) => [m.value, m.label]));
  return [
    { value: '전체', label: '전체' },
    ...present.sort().map((id) => ({ value: id, label: nameOf[id] || id })),
  ];
}

export function useProductionMonitorController() {
  const toast = useUiStore((state) => state.toast);

  const [processId, setProcessId] = useState('전체');
  const [model, setModel] = useState('전체');
  const [state, setState] = useState('전체');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // 선택지는 실제 설비 목록에서 만듭니다.
  // 기준정보 공정은 37종인데 설비가 있는 공정은 17종뿐이라, 마스터를 그대로 쓰면
  // 20종은 골라도 0건입니다 — 사용자는 필터가 고장난 것으로 봅니다.
  // (서버 한 쪽 상한이 1,000건이라 그만큼 받습니다)
  const { data: pool } = useAsync(() => loadMonitor({ size: 1000 }), [], { silent: true });
  const { data: processMaster } = useAsync(loadProcessOptions, [], { silent: true, initialData: [] });

  // 설비가 1,000대를 넘어 한 쪽씩 끊어 봅니다 (조회 조건이 바뀌면 1쪽으로)
  const paging = usePaging({ resetKey: `${processId}|${model}|${state}` });

  const { data, loading, reload } = useAsync(
    () => loadMonitor({ processId, model, state, ...paging.params }),
    [processId, model, state, paging.page, paging.size],
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
   * IoT 수집값이 하나도 없는지.
   * 가동률·타발 속도·최근 수집은 설비 IoT 에서 옵니다. 세 열이 통째로 비면
   * 화면에는 '—' 만 늘어서 고장으로 보입니다 — 왜 비었는지 알려 줘야 합니다.
   */
  const iotMissing = items.length > 0
    && items.every((x) => x.uptimeRate === null && x.strokeSpeed === null && !x.lastCollectedAt);

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
      const all = await loadMonitor({ processId, model, state, page: 1, size: 1000 });
      rows = all?.equipments?.items || items;
      if ((itemsMeta?.total ?? 0) > rows.length) {
        toast(`설비 ${itemsMeta.total.toLocaleString('ko-KR')}대 중 ${rows.length.toLocaleString('ko-KR')}대까지 내려받습니다`);
      }
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
  }, [items, processId, model, state, itemsMeta?.total, toast]);

  return {
    loading,
    summary: data?.summary,
    items,
    paging,
    itemsMeta,
    filters: { processId, model, state },
    processOptions: buildProcessOptions(pool?.equipments?.items, processMaster),
    modelOptions: ['전체', ...new Set((pool?.equipments?.items || []).map((x) => x.model).filter((m) => m && String(m).trim()))],
    iotMissing,
    updatedAt,
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
