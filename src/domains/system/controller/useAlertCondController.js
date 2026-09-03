/**
 * [Controller] SY-04 이상 알림 발송 조건 관리
 *
 * '언제 · 무엇을 기준으로' 보낼지를 정의합니다.
 * '누구에게' 는 알림 수신자 관리(SY-05)가 담당하며, 여기서는 수신 그룹 이름만 참조합니다.
 */
import { useCallback, useState } from 'react';
import { loadCodeGroups } from '@domains/common/model/codeRepository';
import { useAsync } from '@shared/hooks/useAsync';
import { usePaging } from '@shared/hooks/usePaging';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadXls } from '@shared/utils/exportUtil';
import * as repo from '../model/systemRepository';

export function useAlertCondController() {
  const toast = useUiStore((state) => state.toast);

  const [severity, setSeverity] = useState('전체');
  const [enabled, setEnabled] = useState('전체');
  const [keyword, setKeyword] = useState('');

  // 심각도·채널·연산자 등은 서버 공통코드가 정본입니다.
  // '주의'·'메일' 같은 표시명을 보내면 등록이 400 으로 막힙니다 (서버는 WARN·MAIL 을 받습니다)
  const { data: codes } = useAsync(
    () => loadCodeGroups('ALM_SEVERITY', 'ALM_CHANNEL', 'ALM_TARGET', 'ALM_OP', 'ALM_WINDOW', 'ALM_DEDUP', 'ALM_DURATION'),
    [],
    { silent: true, initialData: {} }
  );

  // 감지 지표는 자유 입력이 아니라 지표 기준(SY-13)을 고르는 것입니다 (서버는 metricStdId 를 받습니다)
  const { data: stds } = useAsync(() => repo.loadMetricStandards({ size: 200 }), [], { silent: true });

  const paging = usePaging({ resetKey: `${severity}|${enabled}|${keyword}` });

  const { data, loading, reload } = useAsync(
    () => repo.loadAlertConditions({ severity, enabled, keyword, ...paging.params }),
    [severity, enabled, keyword, paging.page, paging.size]
  );

  const items = data?.list?.items || [];

  const run = useCallback(
    async (fn, { silent = false } = {}) => {
      const res = await fn();
      if (!silent) toast(res.message);
      if (res.ok) reload();
      return res;
    },
    [toast, reload]
  );

  const exportExcel = useCallback(() => {
    downloadXls({
      name: '이상 알림 발송 조건',
      head: ['조건명', '감지 지표', '비교·임계값', '지속 조건', '대상 범위', '심각도', '발송 채널', '수신 그룹', '유효 시간대', '중복 억제', '상태'],
      rows: items.map((c) => [c.name, c.metric, `${c.op} ${c.threshold}`, c.duration, c.target, c.severity, (c.channels || []).join(' · '), (c.groups || []).join(' · '), c.validWindow, c.dedupMin, c.on ? '활성' : '중지']),
    });
  }, [items]);

  return {
    loading,
    items,
    summary: data?.summary,
    codes,
    groupOptions: (data?.groups?.items || []).map((g) => ({ value: g.groupId, label: g.name })),
    metricOptions: (stds?.list?.items || []).map((m) => ({ value: m.stdId, label: `${m.name} (${m.metricCd})` })),
    filters: { severity, enabled, keyword },
    paging,
    itemsMeta: data?.listMeta,
    setSeverity,
    setEnabled,
    setKeyword,
    reload,
    exportExcel,
    submitCond: (condId, v) => run(() => (condId ? repo.updateAlertCondition(condId, v) : repo.createAlertCondition(v))),
    toggleCond: (condId) => run(() => repo.toggleAlertCondition(condId)),
    testCond: (condId) => repo.testAlertCondition(condId),
  };
}
