/**
 * [Controller] RP-01 아침회의 자료 (PRESS)
 *
 * Press 공정별 일목표 대비 실적과 주간 누적 달성률을 신호등으로 점검합니다.
 * 공정 선택지는 공정 마스터의 Press 묶음에서 만들고, 서버에는 공정 id 목록(processScope)으로 보냅니다.
 */
import { useCallback, useMemo, useState } from 'react';
import { useAsync } from '@shared/hooks/useAsync';
import { lastDataDate } from '@shared/stores/useAppStore';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { SIGNAL_STATE_OPTIONS, morningScopeParam } from '../model/reportModel';
import { loadMorningProcessGroups, loadPressMorning } from '../model/reportRepository';

/** 이 화면이 다루는 공정 묶음 */
const GROUP_KEYS = ['press'];

export function usePressMorningController() {
  const toast = useUiStore((state) => state.toast);
  const role = useAuthStore((state) => state.userInfo?.dept);

  const [baseDate, setBaseDate] = useState(lastDataDate());
  const [processScope, setProcessScope] = useState('전체');
  const [state, setState] = useState('전체');

  // 공정 묶음(공정 마스터) — 선택지와 processScope 파라미터의 근거
  const { data: groups } = useAsync(loadMorningProcessGroups, [], { silent: true, initialData: null });

  const processOptions = useMemo(
    () => [{ value: '전체', label: 'Press 전체' }, ...(groups?.press || []).map((p) => ({ value: p.id, label: p.name }))],
    [groups]
  );
  const scopeParam = useMemo(() => morningScopeParam(processScope, groups || {}, GROUP_KEYS), [processScope, groups]);

  const { data, loading, reload } = useAsync(
    () => loadPressMorning({ baseDate, processScope: scopeParam, state }),
    [baseDate, scopeParam, state],
    { skip: !groups }
  );

  const search = useCallback(() => {
    reload();
    toast('조회 조건으로 다시 조회했습니다');
  }, [reload, toast]);

  return {
    loading: loading || !groups,
    data,
    role,
    reportName: '아침회의 자료 (PRESS)',
    filters: { baseDate, processScope, state },
    processOptions,
    stateOptions: SIGNAL_STATE_OPTIONS,
    scopeLabel: processOptions.find((o) => o.value === processScope)?.label || 'Press 전체',
    setBaseDate,
    setProcessScope,
    setState,
    search,
  };
}
