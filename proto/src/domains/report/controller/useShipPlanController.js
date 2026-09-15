/**
 * [Controller] RP-03 연간 출하계획
 *
 * 모델 × 고객사 × 월 단위 연간 출하계획(회계연도 8월 시작 12개월)입니다.
 * 모델·고객사 선택지는 서버 기준정보(제품 마스터 · 고객사 마스터)에서 받습니다 — 고객사 0건이면 '전체' 만 남습니다.
 */
import { useCallback, useState } from 'react';
import { useAsync } from '@shared/hooks/useAsync';
import { lastDataDate } from '@shared/stores/useAppStore';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { loadModelOptions } from '@domains/production/model/productionRepository';
import { loadCustomerOptions, loadShipPlan } from '../model/reportRepository';

const ALL = [{ value: '전체', label: '전체' }];

export function useShipPlanController() {
  const toast = useUiStore((state) => state.toast);
  const role = useAuthStore((state) => state.userInfo?.dept);

  const [planYear, setPlanYear] = useState(`${lastDataDate().slice(0, 4)}년`);
  const [modelCd, setModelCd] = useState('전체');
  const [customerCd, setCustomerCd] = useState('전체');
  const [unit, setUnit] = useState('수량 (EA)');

  const { data: modelOptions } = useAsync(loadModelOptions, [], { silent: true, initialData: ALL });
  const { data: customerOptions } = useAsync(loadCustomerOptions, [], { silent: true, initialData: ALL });

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
    reportName: `${planYear} 출하계획`,
    filters: { planYear, modelCd, customerCd, unit },
    modelOptions: modelOptions || ALL,
    customerOptions: customerOptions || ALL,
    setPlanYear,
    setModelCd,
    setCustomerCd,
    setUnit,
    search,
  };
}
