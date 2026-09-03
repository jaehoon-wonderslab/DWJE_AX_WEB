/**
 * [Controller] AL-01 알림 목록·상세
 *
 * 확인되지 않은 건은 승격 규칙에 따라 상위 담당으로 자동 전달됩니다.
 */
import { useCallback, useState } from 'react';
import { useAsync } from '@shared/hooks/useAsync';
import { usePaging } from '@shared/hooks/usePaging';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadXls } from '@shared/utils/exportUtil';
import { acknowledgeAlert, fetchAlertDetail, loadAlerts } from '../model/alertRepository';

export function useAlertListController() {
  const toast = useUiStore((state) => state.toast);

  const [tab, setTab] = useState('미확인');
  const [type, setType] = useState('전체');
  const [target, setTarget] = useState('전체');
  const [period, setPeriod] = useState('오늘');

  const paging = usePaging({ resetKey: `${tab}|${type}|${target}|${period}` });

  const { data, loading, reload } = useAsync(
    () => loadAlerts({ state: tab === '전체' ? undefined : tab, type, target, period, ...paging.params }),
    [tab, type, target, period, paging.page, paging.size]
  );

  const items = data?.list?.items || [];
  /** 설비 선택지 — 실제 설비 코드에서 뽑습니다 (범위 표기로는 서버가 거를 수 없습니다) */
  const equipments = [...new Set(items.map((a) => a.eqptCd).filter(Boolean))].sort();

  /** 확인 처리 후 목록을 다시 불러옵니다 */
  const acknowledge = useCallback(
    async (alertId, actionNote) => {
      const res = await acknowledgeAlert(alertId, actionNote);
      toast(res.message);
      if (res.ok) reload();
      return res;
    },
    [toast, reload]
  );

  const exportExcel = useCallback(() => {
    downloadXls({
      name: '이상 알림 목록',
      head: ['등급', '제목', '대상', '근거 수치', '감지 Agent', '발생', '상태'],
      rows: items.map((a) => [a.level, a.title, a.target, a.metric, a.agent, a.occurredAt, a.state]),
    });
  }, [items]);

  return {
    loading,
    items,
    counts: data?.list?.counts || {},
    escalations: data?.escalations?.items || [],
    sendLogs: data?.sendLogs?.items || [],
    tab,
    setTab,
    filters: { type, target, period },
    paging,
    itemsMeta: data?.listMeta,
    equipments,
    setType,
    setTarget,
    setPeriod,
    reload,
    loadDetail: fetchAlertDetail,
    acknowledge,
    exportExcel,
  };
}
