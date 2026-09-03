/**
 * [Controller] QC-01 불량 현황 조회
 */
import { useCallback, useState } from 'react';
import { useAsync } from '@shared/hooks/useAsync';
import { currentMonthRange } from '@shared/stores/useAppStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadXls } from '@shared/utils/exportUtil';
import { loadProcessOptions } from '@domains/common/model/dataRangeRepository';
import { loadDefectByLine, loadDefectStatus } from '../model/qualityRepository';

export function useDefectStatusController() {
  const toast = useUiStore((state) => state.toast);

  const [from, setFrom] = useState(currentMonthRange().from);
  const [to, setTo] = useState(currentMonthRange().to);
  const [processId, setProcessId] = useState('전체');
  const [defectTypeCd, setDefectTypeCd] = useState('전체');

  // 선택지는 서버에서 받습니다 — 화면에 박아 두면 서버가 받는 코드와 달라 조회가 0건이 됩니다
  const { data: processOptions } = useAsync(loadProcessOptions, [], { silent: true, initialData: [{ value: '전체', label: '전체' }] });

  const { data, loading, reload } = useAsync(
    () => loadDefectStatus({ from, to, processId, defectTypeCd }),
    [from, to, processId, defectTypeCd]
  );

  // 라인별은 느려서 따로 받습니다 — 늦어도 나머지 카드는 먼저 그려집니다
  const { data: byLine, loading: lineLoading } = useAsync(
    () => loadDefectByLine({ from, to, processId, defectTypeCd }),
    [from, to, processId, defectTypeCd],
    { silent: true }
  );

  const typeItems = data?.byType?.items || [];

  const search = useCallback(() => {
    reload();
    toast(`조회 조건으로 ${typeItems.length}건을 조회했습니다`);
  }, [reload, toast, typeItems.length]);

  const exportExcel = useCallback(() => {
    downloadXls({
      name: '불량 현황',
      head: ['불량 유형', '불량 수량', '비중', '전월 대비'],
      rows: typeItems.map((d) => [d.defectType, d.cnt, `${d.ratio}%`, Number.isFinite(Number(d.momChange)) ? `${d.momChange}%` : '—']),
    });
  }, [typeItems]);

  return {
    loading,
    summary: data?.summary,
    typeItems,
    lineItems: byLine?.items || [],
    lineLoading,
    filters: { from, to, processId, defectTypeCd },
    processOptions,
    // 불량 유형 선택지는 조회 결과에서 만듭니다 (그 기간에 실제로 나온 유형만 고를 수 있게)
    defectTypeOptions: [
      { value: '전체', label: '전체' },
      ...(data?.byType?.items || [])
        .filter((x) => x.defectCd)
        .map((x) => ({ value: x.defectCd, label: x.defectType })),
    ],
    setFrom,
    setTo,
    setProcessId,
    setDefectTypeCd,
    search,
    exportExcel,
  };
}
