/**
 * [Controller] RP-04 제품별 수율
 *
 * MES 투입·양품 실적과 AOI 판정 로그를 모델별로 집계한 월간 수율 현황입니다.
 */
import { useCallback, useState } from 'react';
import { useAsync } from '@shared/hooks/useAsync';
import { usePaging } from '@shared/hooks/usePaging';
import { lastDataDate } from '@shared/stores/useAppStore';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { loadProcessOptions } from '@domains/common/model/dataRangeRepository';
import { loadModelOptions } from '@domains/production/model/productionRepository';
import { loadYieldByModel } from '../model/reportRepository';

/** 이 화면의 한 쪽 건수 선택지 — 인쇄를 위해 '전체'(0)를 함께 둡니다 */
const SIZES = [50, 100, 200, 0];

export function useYieldByModelController() {
  const toast = useUiStore((state) => state.toast);
  const role = useAuthStore((state) => state.userInfo?.dept);

  const [yearMonth, setYearMonth] = useState(`${lastDataDate().slice(0, 4)}년 ${Number(lastDataDate().slice(5, 7))}월`);
  const [modelCd, setModelCd] = useState('전체');
  const [processId, setProcessId] = useState('전체');

  // 선택지는 서버에서 받습니다 — 화면에 박아 두면 서버가 받는 코드와 달라 조회가 0건이 됩니다
  const { data: modelOptions } = useAsync(loadModelOptions, [], { silent: true, initialData: [{ value: '전체', label: '전체' }] });
  const { data: processOptions } = useAsync(loadProcessOptions, [], { silent: true, initialData: [{ value: '전체', label: '전체' }] });

  // 상세 행이 500건을 넘어 쪽 단위로 봅니다 (조회 조건이 바뀌면 1쪽으로)
  const paging = usePaging({ size: 100, resetKey: `${yearMonth}|${modelCd}|${processId}` });

  const { data, loading, reload } = useAsync(
    () => loadYieldByModel({ yearMonth, modelCd, processId, ...paging.params }),
    [yearMonth, modelCd, processId, paging.page, paging.size],
  );

  const search = useCallback(() => {
    reload();
    toast('조회 조건으로 다시 조회했습니다');
  }, [reload, toast]);

  /** 내려받기용 전량 조회 — 화면의 쪽 상태는 건드리지 않습니다 */
  const fetchAllRows = useCallback(
    () => loadYieldByModel({ yearMonth, modelCd, processId, size: 0 }),
    [yearMonth, modelCd, processId],
  );

  /**
   * 인쇄는 문서 전체가 나와야 합니다.
   * 쪽을 나눠 보는 중이면 전체 보기로 바꾸고, 자료가 도착한 뒤에 인쇄합니다.
   * @returns {boolean} true 면 지금 바로 인쇄해도 됩니다
   */
  const [printPending, setPrintPending] = useState(false);
  const requestPrint = useCallback(() => {
    if (paging.size === 0) return true;
    toast('인쇄를 위해 전체 행을 불러옵니다');
    setPrintPending(true);
    paging.setSize(0);
    return false;
  }, [paging, toast]);
  const clearPrintPending = useCallback(() => setPrintPending(false), []);

  return {
    loading,
    data,
    role,
    reportName: '제품별 수율',
    filters: { yearMonth, modelCd, processId },
    modelOptions,
    processOptions,
    setYearMonth,
    setModelCd,
    setProcessId,
    search,
    paging,
    sizes: SIZES,
    rowsMeta: data?.rowsMeta,
    fetchAllRows,
    printPending,
    requestPrint,
    clearPrintPending,
  };
}
