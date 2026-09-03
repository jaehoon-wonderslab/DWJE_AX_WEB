/**
 * [Controller] PR-04 이전 보고서
 *
 * 상태 조회 조건은 서버 공통코드 RPT_DOC_STATE(DRAFT·SAVED·CONFIRMED·REJECTED·PUBLISHED)를 그대로 보냅니다.
 * 화면에 '검토 대기' 같은 말을 박아 두면 서버가 모르는 값이라 0건이 됩니다.
 */
import { useCallback, useMemo, useState } from 'react';
import { useAsync } from '@shared/hooks/useAsync';
import { usePaging } from '@shared/hooks/usePaging';
import { currentMonthRange, useAppStore } from '@shared/stores/useAppStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadXls } from '@shared/utils/exportUtil';
import { labelOf, withAll } from '@domains/common/model/codeRepository';
import { copyDailyReport, isDailyReportEditable, loadDailyHistory, loadDailyReportCodes } from '../model/productionRepository';

export function useDailyHistoryController() {
  const toast = useUiStore((state) => state.toast);
  const setBaseDate = useAppStore((state) => state.setBaseDate);

  const [from, setFrom] = useState(currentMonthRange().from);
  const [to, setTo] = useState(currentMonthRange().to);
  const [state, setState] = useState('전체');

  // 상태 선택지·표시명 (서버 공통코드)
  const { data: codes } = useAsync(loadDailyReportCodes, [], { silent: true, initialData: { RPT_DOC_STATE: [] } });
  const stateOptions = useMemo(() => withAll(codes?.RPT_DOC_STATE), [codes]);
  const stateLabel = useCallback((code) => labelOf(codes?.RPT_DOC_STATE, code), [codes]);

  const paging = usePaging({ resetKey: `${from}|${to}|${state}` });
  const { data, loading, reload } = useAsync(
    () => loadDailyHistory({ from, to, state, ...paging.params }),
    [from, to, state, paging.page, paging.size]
  );
  const items = data?.items || [];

  const search = useCallback(() => {
    reload();
    toast(`조회 조건으로 ${(data?.meta?.total ?? items.length).toLocaleString('ko-KR')}건을 조회했습니다`);
  }, [reload, toast, data?.meta?.total, items.length]);

  /**
   * 행 클릭 — 검토가 끝나지 않은 보고서(초안·임시 저장·반려)는 작성 화면으로 보냅니다.
   * 작성 화면은 기준일(baseDate)의 초안을 여니, 먼저 기준일을 그 보고서 일자로 맞춥니다.
   * 확정·발행본은 수정할 수 없으므로 안내만 합니다.
   * @returns {'edit'|'locked'} 어디로 분기했는지
   */
  const openRow = useCallback(
    (row) => {
      if (isDailyReportEditable(row.state)) {
        if (row.targetDate) setBaseDate(row.targetDate);
        return 'edit';
      }
      toast(`${row.targetDate} 확정본을 열었습니다 (v${row.version} · ${stateLabel(row.state)})`);
      return 'locked';
    },
    [setBaseDate, toast, stateLabel]
  );

  /** 복제 — 서버는 새 대상 일자만 받습니다. 성공하면 목록을 다시 불러옵니다 */
  const copyReport = useCallback(
    async (reportId, targetDate) => {
      const res = await copyDailyReport(reportId, targetDate);
      toast(res.message || (res.ok ? '복제되었습니다' : '복제하지 못했습니다'));
      if (res.ok) reload();
      return res;
    },
    [toast, reload]
  );

  const exportExcel = useCallback(() => {
    downloadXls({
      name: '일일 생산현황 보고서 이력',
      head: ['대상 일자', '버전', '상태', '생성 일시', '확정 일시', '확정자', '보정 건수'],
      rows: items.map((r) => [
        r.targetDate, `v${r.version}`, stateLabel(r.state), r.generatedAt || '', r.confirmedAt || '', r.confirmedBy || '', r.correctionCnt ?? 0,
      ]),
    });
  }, [items, stateLabel]);

  return {
    paging,
    itemsMeta: data?.meta,
    loading,
    items,
    filters: { from, to, state },
    stateOptions,
    stateLabel,
    setFrom,
    setTo,
    setState,
    reload,
    search,
    openRow,
    copyReport,
    exportExcel,
  };
}
