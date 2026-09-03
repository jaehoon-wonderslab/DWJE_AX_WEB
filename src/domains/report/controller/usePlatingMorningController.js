/**
 * [Controller] RP-02 아침회의 자료 (Plating·Coating)
 *
 * 전일 Plating·Coating 라인의 일목표 대비 실적과 주간누적 달성률을 정리합니다.
 */
import { useCallback, useState } from 'react';
import { useAsync } from '@shared/hooks/useAsync';
import { lastDataDate } from '@shared/stores/useAppStore';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { loadPlatingMorning } from '../model/reportRepository';

export function usePlatingMorningController() {
  const toast = useUiStore((state) => state.toast);
  const role = useAuthStore((state) => state.userInfo?.dept);

  const [baseDate, setBaseDate] = useState(lastDataDate());
  const [processScope, setProcessScope] = useState('전체');
  const [state, setState] = useState('전체');

  const { data, loading, reload } = useAsync(
    () => loadPlatingMorning({ baseDate, processScope, state }),
    [baseDate, processScope, state],
  );

  const search = useCallback(() => {
    reload();
    toast('조회 조건으로 다시 조회했습니다');
  }, [reload, toast]);

  return {
    loading,
    data,
    role,
    reportName: '아침회의 자료 (Plating·Coating)',
    filters: { baseDate, processScope, state },
    setBaseDate,
    setProcessScope,
    setState,
    search,
  };
}
