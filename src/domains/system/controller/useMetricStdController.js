/**
 * [Controller] SY-13 지표 측정 데이터 관리
 *
 * 여기서 정한 정상/주의/위험 값이 이상 알림 발송 조건과 화면 색상 판정에 그대로 사용됩니다.
 */
import { useCallback, useState } from 'react';
import { loadCodeGroups } from '@domains/common/model/codeRepository';
import { useAsync } from '@shared/hooks/useAsync';
import { usePaging } from '@shared/hooks/usePaging';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadXls } from '@shared/utils/exportUtil';
import * as repo from '../model/systemRepository';

export function useMetricStdController() {
  const toast = useUiStore((state) => state.toast);

  const [category, setCategory] = useState('전체');
  const [enabled, setEnabled] = useState('전체');
  const [grade, setGrade] = useState('전체');

  // 구분·단위·구간·판정은 서버 공통코드가 정본입니다.
  // 화면에 '생산' 같은 표시명을 박아 두면 서버가 받는 코드(PROD)와 달라 조회가 0건이 됩니다
  const { data: codes } = useAsync(
    () => loadCodeGroups('MET_CATEGORY', 'MET_UNIT', 'MET_WINDOW', 'MET_JUDGE'),
    [],
    { silent: true, initialData: {} }
  );

  const paging = usePaging({ resetKey: `${category}|${enabled}|${grade}` });

  const { data, loading, reload } = useAsync(
    () => repo.loadMetricStandards({ category, enabled, grade, ...paging.params }),
    [category, enabled, grade, paging.page, paging.size]
  );

  const items = data?.list?.items || [];

  const run = useCallback(
    async (fn) => {
      const res = await fn();
      toast(res.message);
      if (res.ok) reload();
      return res;
    },
    [toast, reload]
  );

  const exportExcel = useCallback(() => {
    downloadXls({
      name: '지표 기준 수치',
      head: ['구분', '지표명', '단위', '현재값', '정상 기준', '주의 임계', '위험 임계', '집계 구간', '산출 근거', '판정', '적용'],
      rows: items.map((m) => [m.category, m.name, m.unit, m.current, m.ok, m.warn, m.bad, m.window, m.basis, m.grade, m.enabled ? '적용' : '미적용']),
    });
  }, [items]);

  return {
    loading,
    items,
    summary: data?.summary,
    history: data?.history?.items || [],
    filters: { category, enabled, grade },
    codes,
    paging,
    itemsMeta: data?.listMeta,
    setCategory,
    setEnabled,
    setGrade,
    reload,
    exportExcel,
    saveNumber: (stdId, field, value) => run(() => repo.updateMetricValue(stdId, field, value)),
    toggleEnabled: (stdId) => run(() => repo.toggleMetricState(stdId)),
    submitStandard: (v) => run(() => repo.createMetricStandard(v)),
    loadUsage: repo.fetchMetricUsage,
  };
}
