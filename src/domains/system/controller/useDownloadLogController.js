/**
 * [Controller] SY-14 보고서 다운로드 이력
 *
 * 인쇄·PDF 출력도 함께 기록되며, blind 처리된 항목은 파일에서 제외된 채 저장됩니다.
 */
import { useCallback, useState } from 'react';
import { labelOf, loadCodeGroups } from '@domains/common/model/codeRepository';
import { MENU, permRows } from '@shared/constants/menu';
import { useAsync } from '@shared/hooks/useAsync';
import { recentDays } from '@shared/stores/useAppStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadXls } from '@shared/utils/exportUtil';
import * as repo from '../model/systemRepository';

/** 보고서 선택지 — 메뉴의 「보고서」 그룹 항목 (서버 파라미터 reportId 에는 화면 ID 를 보냅니다) */
const REPORT_OPTIONS = (MENU.find((g) => g.group === '보고서')?.items || []).map((x) => ({ value: x.id, label: x.name }));

/**
 * 한 번에 받아 오는 건수 — 쪽을 나누지 않고 조회 조건에 맞는 기록을 전부 표에 놓습니다 (2026-09-08 요청).
 * 서버가 `meta` 를 주지 않아 쪽 나눔이 동작하지 않았고, 사용자는 "최근 10건만 보인다" 로 느꼈습니다.
 * 이 수를 넘게 쌓이면 표 부제에 알립니다 — 조회 기간을 좁혀 보라는 뜻입니다.
 */
export const ALL_SIZE = 1000;

/**
 * 화면 ID(reportId) → { name: 메뉴명, path: 페이지 URL }
 *
 * 기록 API 는 내려받은 화면의 ID 를 reportId 로 받습니다(exportUtil 이 현재 URL 에서 알아내 보냅니다).
 * 메뉴에 있는 ID 면 메뉴명과 경로를, 없으면(예전 기록의 RPT_DAILY_PROD 같은 코드) 그 값을 이름 자리에
 * 그대로, 비어 있으면 null 을 돌려줍니다.
 */
export const screenInfo = (reportId) => {
  if (!reportId) return null;
  const row = permRows().find((r) => r.id === reportId);
  return row ? { name: row.name, path: row.path } : { name: reportId, path: null };
};

/** 화면 ID → 한 줄 문자열 (엑셀용) — 「메뉴명 (/경로)」 */
export const screenLabel = (reportId) => {
  const info = screenInfo(reportId);
  return info ? (info.path ? `${info.name} (${info.path})` : info.name) : '—';
};

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

  // 서버 파라미터 이름은 reportId · deptId · format 입니다 ('전체' 는 client 가 요청에서 걸러 냅니다)
  const { data, loading, reload } = useAsync(
    () => repo.loadDownloadLogs({ from, to, reportId, deptId, format, page: 1, size: ALL_SIZE }),
    [from, to, reportId, deptId, format]
  );

  const items = data?.list?.items || [];
  const rawSummary = data?.summary;

  /**
   * 요약 — 서버 필드(totalCnt · todayCnt)를 화면 이름으로 맞춥니다.
   * blind 포함 · 최다 이용 · 계정별 이용은 2026-09-08 요청으로 화면에서 빼서 더 다루지 않습니다.
   */
  const summary = rawSummary
    ? {
        total: rawSummary.totalCnt ?? rawSummary.total ?? 0,
        today: rawSummary.todayCnt ?? rawSummary.today ?? 0,
      }
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
      // 화면 표와 같은 열 — 계정·이름, 보고서·화면을 따로 둡니다
      head: ['일시', '계정', '이름', '부서', '보고서', '화면', '형식', '대상 범위', '행 수', 'blind 항목', 'IP'],
      rows: items.map((d) => [d.ts, d.empNo, d.name, d.dept, d.report, screenLabel(d.reportId), formatLabel(d.format), d.scope || '', d.rowCnt ?? '', d.blindCnt ?? 0, d.ip]),
    });
  }, [items, formatLabel]);

  return {
    loading,
    items,
    /** 받아 온 건수가 한도에 닿았는지 — 더 있을 수 있으니 기간을 좁히라고 알립니다 */
    capped: items.length >= ALL_SIZE,
    summary,
    filters: { from, to, reportId, deptId, format },
    reportOptions: [{ value: '전체', label: '전체' }, ...REPORT_OPTIONS],
    deptOptions: [{ value: '전체', label: '전체' }, ...(deptOptions || [])],
    formatOptions: [{ value: '전체', label: '전체' }, ...formatCodes],
    formatLabel,
    screenLabel,
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
