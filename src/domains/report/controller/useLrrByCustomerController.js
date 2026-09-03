/**
 * [Controller] RP-05 고객사별 LRR
 *
 * 고객사 출하수량 대비 고객사 라인 불량 통보 수량을 집계한 LRR 현황표입니다.
 */
import { useCallback, useState } from 'react';
import { useAsync } from '@shared/hooks/useAsync';
import { lastDataDate } from '@shared/stores/useAppStore';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { loadLrrByCustomer } from '../model/reportRepository';

export function useLrrByCustomerController() {
  const toast = useUiStore((state) => state.toast);
  const role = useAuthStore((state) => state.userInfo?.dept);

  const [baseYear, setBaseYear] = useState(`${lastDataDate().slice(0, 4)}년`);
  const [customerCd, setCustomerCd] = useState('전체');
  const [unit, setUnit] = useState('월별');

  const { data, loading, reload } = useAsync(
    () => loadLrrByCustomer({ baseYear, customerCd, unit }),
    [baseYear, customerCd, unit],
  );

  const search = useCallback(() => {
    reload();
    toast('조회 조건으로 다시 조회했습니다');
  }, [reload, toast]);

  return {
    loading,
    data,
    role,
    reportName: '고객사별 LRR',
    filters: { baseYear, customerCd, unit },
    setBaseYear,
    setCustomerCd,
    setUnit,
    search,
  };
}
