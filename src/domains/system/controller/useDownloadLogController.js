/**
 * [Controller] SY-14 보고서 다운로드 이력
 *
 * 인쇄·PDF 출력도 함께 기록되며, blind 처리된 항목은 파일에서 제외된 채 저장됩니다.
 */
import { useCallback, useState } from 'react';
import { labelOf, loadCodeGroups } from '@domains/common/model/codeRepository';
import { MENU } from '@shared/constants/menu';
import { useAsync } from '@shared/hooks/useAsync';
import { usePaging } from '@shared/hooks/usePaging';
import { recentDays } from '@shared/stores/useAppStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadXls } from '@shared/utils/exportUtil';
import * as repo from '../model/systemRepository';

/** 보고서 선택지 — 메뉴의 「보고서」 그룹 항목 (서버 파라미터 reportId 에는 화면 ID 를 보냅니다) */
const REPORT_OPTIONS = (MENU.find((g) => g.group === '보고서')?.items || []).map((x) => ({ value: x.id, label: x.name }));

export function useDownloadLogController() {
  const toast = useUiStore((state) => state.toast);

  // 내려받기 이력도 시스템 기록입니다 (실적 기준일과 무관 · 오늘 기준)
  const [from, setFrom] = useState(recentDays(8).from);
  const [to, setTo] = useState(recentDays(8).to);
  const [reportId, setReportId] = useState('전체');
  const [deptId, setDeptId] = useState('전체');
  const [format, setFormat] = useState('전체');

  // 부서는 서버 부서 목록(ID), 형식은 공통코드 RPT_FORMAT(XLS · CSV · PDF)이 정본입니다
  const { data: deptOptions } = useAsync(repo.loadDeptIdOptions, [], { silent: true, initialData: [] });
  const { data: codes } = useAsync(() => loadCodeGroups('RPT_FORMAT'), [], { silent: true, initialData: {} });
  const formatCodes = codes?.RPT_FORMAT || [];

  const paging = usePaging({ resetKey: `${from}|${to}|${reportId}|${deptId}|${format}` });
  // 서버 파라미터 이름은 reportId · deptId · format 입니다 ('전체' 는 client 가 요청에서 걸러 냅니다)
  const { data, loading, reload } = useAsync(
    () => repo.loadDownloadLogs({ from, to, reportId, deptId, format, ...paging.params }),
    [from, to, reportId, deptId, format, paging.page, paging.size]
  );

  const items = data?.list?.items || [];
  const rawSummary = data?.summary;

  /**
   * 요약 — 서버 필드(totalCnt · todayCnt · blindIncludedCnt · topUser{name,cnt} · byUser[{name,dept,cnt}])를 화면 이름으로 맞추고,
   * 계정별 비중(%)은 전체 건수 대비로 계산합니다.
   */
  const summary = rawSummary
    ? (() => {
        const total = rawSummary.totalCnt ?? rawSummary.total ?? 0;
        const byUser = (rawSummary.byUser || []).map((u) => ({
          ...u,
          user: u.name || u.empNo || u.user || '—',
          ratio: total ? Math.round(((u.cnt ?? 0) / total) * 1000) / 10 : 0,
        }));
        return {
          total,
          today: rawSummary.todayCnt ?? rawSummary.today ?? 0,
          blindCnt: rawSummary.blindIncludedCnt ?? rawSummary.blindCnt ?? 0,
          totalRows: rawSummary.totalRows,
          topUser: rawSummary.topUser || null,
          byUser,
          byReport: rawSummary.byReport || [],
        };
      })()
    : null;

  /** 형식 코드 → 표시명 (XLS → 엑셀 (.xls)). 이미 표시명으로 저장된 예전 기록은 그대로 */
  const formatLabel = useCallback((code) => (code ? labelOf(formatCodes, code) : '—'), [formatCodes]);

  const search = useCallback(async () => {
    await reload();
    toast('조회 조건으로 다시 조회했습니다');
  }, [reload, toast]);

  const exportExcel = useCallback(() => {
    downloadXls({
      name: '보고서 다운로드 이력',
      head: ['일시', '계정', '부서', '보고서 · 화면', '형식', '대상 범위', '행 수', 'blind 항목', 'IP'],
      rows: items.map((d) => [d.ts, d.name || d.empNo, d.dept, d.report, formatLabel(d.format), d.scope || '', d.rowCnt ?? '', d.blindCnt ?? 0, d.ip]),
    });
  }, [items, formatLabel]);

  return {
    paging,
    itemsMeta: data?.listMeta,
    loading,
    items,
    summary,
    filters: { from, to, reportId, deptId, format },
    reportOptions: [{ value: '전체', label: '전체' }, ...REPORT_OPTIONS],
    deptOptions: [{ value: '전체', label: '전체' }, ...(deptOptions || [])],
    formatOptions: [{ value: '전체', label: '전체' }, ...formatCodes],
    formatLabel,
    setFrom,
    setTo,
    setReportId,
    setDeptId,
    setFormat,
    search,
    exportExcel,
    loadPolicy: repo.fetchRetentionPolicy,
  };
}
