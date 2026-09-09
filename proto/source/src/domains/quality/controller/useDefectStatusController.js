/**
 * [Controller] QC-01 불량 현황 조회
 */
import { useCallback, useMemo, useState } from 'react';
import { useAsync } from '@shared/hooks/useAsync';
import { currentMonthRange } from '@shared/stores/useAppStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadXls } from '@shared/utils/exportUtil';
import { fixed } from '@shared/utils/formatUtil';
import { loadProcessOptions } from '@domains/common/model/dataRangeRepository';
import { compositionOf } from '@domains/common/model/metricModel';
import { loadDefectByLine, loadDefectStatus } from '../model/qualityRepository';

/** 전월 대비 증감률(%) — 숫자가 아니면 — */
const momText = (v) => {
  const n = Number(v);
  return v === null || v === undefined || !Number.isFinite(n) ? '—' : `${n > 0 ? '+' : ''}${fixed(n, 1)}%`;
};

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
  const summary = data?.summary;

  /**
   * 유형별 구성 — 비중의 분모는 **불량 수량 원장(ngQty)** 입니다.
   * 서버가 준 ratio 는 표시된 유형들의 합을 분모로 써서 유형이 없는 몫만큼 부풀려져 있습니다.
   * 남는 몫은 '유형 미상' 으로 드러내 합이 원장과 맞게 합니다. 화면과 엑셀이 같은 행을 씁니다.
   */
  const typeRows = useMemo(() => {
    const { rows } = compositionOf(typeItems, summary?.ngQty, { labelKey: 'defectType', valueKey: 'cnt' });
    // compositionOf 는 label/value/ratio 만 남기므로 전월 대비는 원본 행에서 다시 붙입니다 (유형 미상 행은 —)
    return rows.map((r) => ({ ...r, momChange: r.raw?.momChange ?? null }));
  }, [typeItems, summary?.ngQty]);

  const search = useCallback(async () => {
    await reload();
    toast('조회 조건으로 다시 조회했습니다');
  }, [reload, toast]);

  const exportExcel = useCallback(() => {
    downloadXls({
      name: '불량 현황',
      head: ['불량 유형', '불량 수량', '비중', '전월 대비'],
      rows: typeRows.map((r) => [r.label, r.value, `${fixed(r.ratio)}%`, momText(r.momChange)]),
    });
  }, [typeRows]);

  return {
    loading,
    summary,
    typeItems,
    typeRows,
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
