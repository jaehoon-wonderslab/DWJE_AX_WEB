/**
 * [Controller] RP-02 아침회의 자료 (Plating·Coating)
 *
 * 전일 Plating·Coating 라인의 일목표 대비 실적과 주간누적 달성률을 정리합니다.
 * 공정 선택지는 A Plating / B Plating / Coating 묶음(공정 마스터 이름 기준)이고,
 * 서버에는 묶음에 속한 공정 id 목록(processScope)으로 보냅니다.
 */
import { useCallback, useMemo, useState } from 'react';
import { useAsync } from '@shared/hooks/useAsync';
import { lastDataDate } from '@shared/stores/useAppStore';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { PROCESS_GROUPS, SIGNAL_STATE_OPTIONS, morningScopeParam } from '../model/reportModel';
import { loadMorningProcessGroups, loadPlatingMorning } from '../model/reportRepository';

/** 이 화면이 다루는 공정 묶음 */
const GROUP_KEYS = ['aPlating', 'bPlating', 'coating'];

export function usePlatingMorningController() {
  const toast = useUiStore((state) => state.toast);
  const role = useAuthStore((state) => state.userInfo?.dept);

  const [baseDate, setBaseDate] = useState(lastDataDate());
  const [processScope, setProcessScope] = useState('전체');
  const [state, setState] = useState('전체');

  const { data: groups } = useAsync(loadMorningProcessGroups, [], { silent: true, initialData: null });

  const processOptions = useMemo(
    () => [
      { value: '전체', label: '전체' },
      ...PROCESS_GROUPS.filter((g) => GROUP_KEYS.includes(g.key)).map((g) => ({ value: g.key, label: g.label })),
    ],
    []
  );
  const scopeParam = useMemo(() => morningScopeParam(processScope, groups || {}, GROUP_KEYS), [processScope, groups]);

  const { data, loading, reload } = useAsync(
    () => loadPlatingMorning({ baseDate, processScope: scopeParam, state }),
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
    reportName: '아침회의 자료 (Plating·Coating)',
    filters: { baseDate, processScope, state },
    processOptions,
    stateOptions: SIGNAL_STATE_OPTIONS,
    groupKeys: GROUP_KEYS,
    setBaseDate,
    setProcessScope,
    setState,
    search,
  };
}
