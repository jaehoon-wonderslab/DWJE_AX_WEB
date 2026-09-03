/**
 * [Controller] RP-01 아침회의 자료 (PRESS)
 *
 * Press 공정 모델별 일목표 대비 실적과 주간 누적 달성률을 신호등으로 점검합니다.
 */
import { useCallback, useState } from 'react';
import { useAsync } from '@shared/hooks/useAsync';
import { lastDataDate } from '@shared/stores/useAppStore';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { loadPressMorning } from '../model/reportRepository';

export function usePressMorningController() {
  const toast = useUiStore((state) => state.toast);
  const role = useAuthStore((state) => state.userInfo?.dept);

  const [baseDate, setBaseDate] = useState(lastDataDate());
  const [processScope, setProcessScope] = useState('Press 전체');
  const [state, setState] = useState('전체');

  const { data, loading, reload } = useAsync(
    () => loadPressMorning({ baseDate, processScope, state }),
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
    reportName: '아침회의 자료 (PRESS)',
    filters: { baseDate, processScope, state },
    setBaseDate,
    setProcessScope,
    setState,
    search,
  };
}
