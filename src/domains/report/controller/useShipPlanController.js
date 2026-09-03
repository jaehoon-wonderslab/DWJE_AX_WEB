/**
 * [Controller] RP-03 연간 출하계획
 *
 * 모델 × 고객사 × 월 단위 연간 출하계획(회계연도 8월 시작 12개월)입니다.
 */
import { useCallback, useState } from 'react';
import { useAsync } from '@shared/hooks/useAsync';
import { lastDataDate } from '@shared/stores/useAppStore';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { loadShipPlan } from '../model/reportRepository';

export function useShipPlanController() {
  const toast = useUiStore((state) => state.toast);
  const role = useAuthStore((state) => state.userInfo?.dept);

  const [planYear, setPlanYear] = useState(`${lastDataDate().slice(0, 4)}년`);
  const [modelCd, setModelCd] = useState('전체');
  const [customerCd, setCustomerCd] = useState('전체');
  const [unit, setUnit] = useState('수량 (EA)');

  const { data, loading, reload } = useAsync(
    () => loadShipPlan({ planYear, modelCd, customerCd, unit }),
    [planYear, modelCd, customerCd, unit],
  );

  const search = useCallback(() => {
    reload();
    toast('조회 조건으로 다시 조회했습니다');
  }, [reload, toast]);

  return {
    loading,
    data,
    role,
    reportName: '2026년 출하계획',
    filters: { planYear, modelCd, customerCd, unit },
    setPlanYear,
    setModelCd,
    setCustomerCd,
    setUnit,
    search,
  };
}
