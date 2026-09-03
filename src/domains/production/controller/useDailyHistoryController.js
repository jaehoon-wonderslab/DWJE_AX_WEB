/**
 * [Controller] PR-04 이전 보고서
 */
import { useCallback, useState } from 'react';
import { useAsync } from '@shared/hooks/useAsync';
import { usePaging } from '@shared/hooks/usePaging';
import { currentMonthRange } from '@shared/stores/useAppStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadXls } from '@shared/utils/exportUtil';
import { copyDailyReport, loadDailyHistory } from '../model/productionRepository';

export function useDailyHistoryController() {
  const toast = useUiStore((state) => state.toast);

  const [from, setFrom] = useState(currentMonthRange().from);
  const [to, setTo] = useState(currentMonthRange().to);
  const [state, setState] = useState('전체');

  const paging = usePaging({ resetKey: `${from}|${to}|${state}` });
  const { data, loading, reload } = useAsync(
    () => loadDailyHistory({ from, to, state, ...paging.params }),
    [from, to, state, paging.page, paging.size]
  );
  const items = data?.items || [];

  const copyReport = useCallback(
    async (reportId, targetDate) => {
      const res = await copyDailyReport(reportId, targetDate);
      toast(res.message);
      if (res.ok) reload();
      return res;
    },
    [toast, reload]
  );

  const exportExcel = useCallback(() => {
    downloadXls({
      name: '일일 생산현황 보고서 이력',
      head: ['대상 일자', '버전', '상태', '생성 일시', '확정 일시', '보정 건수'],
      rows: items.map((r) => [r.targetDate, `v${r.version}`, r.state, r.generatedAt, r.confirmedAt || '—', r.correctionCnt]),
    });
  }, [items]);

  return {
    paging,
    itemsMeta: data?.meta,
    loading, items, filters: { from, to, state }, setFrom, setTo, setState, reload, copyReport, exportExcel };
}
