/**
 * [Controller] SY-14 보고서 다운로드 이력
 *
 * 인쇄·PDF 출력도 함께 기록되며, blind 처리된 항목은 파일에서 제외된 채 저장됩니다.
 */
import { useCallback, useState } from 'react';
import { useAsync } from '@shared/hooks/useAsync';
import { usePaging } from '@shared/hooks/usePaging';
import { recentDays } from '@shared/stores/useAppStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadXls } from '@shared/utils/exportUtil';
import * as repo from '../model/systemRepository';

export function useDownloadLogController() {
  const toast = useUiStore((state) => state.toast);

  // 내려받기 이력도 시스템 기록입니다 (실적 기준일과 무관)
  const [from, setFrom] = useState(recentDays(8).from);
  const [to, setTo] = useState(recentDays(8).to);
  const [reportName, setReportName] = useState('전체');
  const [dept, setDept] = useState('전체');
  const [format, setFormat] = useState('전체');

  const paging = usePaging({ resetKey: `${from}|${to}|${reportName}|${dept}|${format}` });
  const { data, loading, reload } = useAsync(
    () => repo.loadDownloadLogs({ from, to, reportName, dept, format, ...paging.params }),
    [from, to, reportName, dept, format]
  );

  const items = data?.list?.items || [];

  const search = useCallback(() => {
    reload();
    toast(`조회 조건으로 ${items.length}건을 조회했습니다`);
  }, [reload, toast, items.length]);

  const exportExcel = useCallback(() => {
    downloadXls({
      name: '보고서 다운로드 이력',
      head: ['일시', '계정', '부서', '보고서 · 화면', '형식', '대상 범위', '행 수', 'blind 항목', 'IP'],
      rows: items.map((d) => [d.ts, d.user, d.dept, d.reportName, d.format, d.scope, d.rowCount, d.blindCount, d.ip]),
    });
  }, [items]);

  return {
    paging,
    itemsMeta: data?.listMeta,
    loading,
    items,
    summary: data?.summary,
    filters: { from, to, reportName, dept, format },
    setFrom,
    setTo,
    setReportName,
    setDept,
    setFormat,
    search,
    exportExcel,
    loadPolicy: repo.fetchRetentionPolicy,
  };
}
