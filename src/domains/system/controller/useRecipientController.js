/**
 * [Controller] SY-05 알림 수신자 관리
 *
 * '누구에게 · 어떤 연락처로' 보낼지를 관리합니다.
 * 발송 조건(SY-04)은 여기서 만든 수신 그룹의 이름만 참조합니다.
 */
import { useCallback, useState } from 'react';
import { useAsync } from '@shared/hooks/useAsync';
import { usePaging } from '@shared/hooks/usePaging';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadXls } from '@shared/utils/exportUtil';
import * as repo from '../model/systemRepository';

export function useRecipientController() {
  const toast = useUiStore((state) => state.toast);

  const [tab, setTab] = useState('수신 그룹');
  const [groupFilter, setGroupFilter] = useState('전체');
  const [stateFilter, setStateFilter] = useState('전체');

  const paging = usePaging({ resetKey: `${groupFilter}|${stateFilter}` });

  const { data, loading, reload } = useAsync(
    () => repo.loadRecipients({ groupId: groupFilter, state: stateFilter, ...paging.params }),
    [groupFilter, stateFilter, paging.page, paging.size]
  );

  const recipients = data?.recipients?.items || [];

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
      name: '알림 수신자',
      head: ['이름', '부서', '직급', '메일', '휴대전화', '메신저', '야간 수신', '상태', '소속 그룹'],
      rows: recipients.map((r) => [r.name, r.dept, r.pos, r.mail, r.phone, r.messenger, r.night ? 'Y' : 'N', r.state, r.groups.join(' · ')]),
    });
  }, [recipients]);

  return {
    loading,
    summary: data?.summary,
    groups: data?.groups?.items || [],
    recipients,
    paging,
    itemsMeta: data?.recipientsMeta,
    duties: data?.duties?.items || [],
    escalation: data?.escalation?.items || [],
    tab,
    setTab,
    filters: { groupFilter, stateFilter },
    setGroupFilter,
    setStateFilter,
    reload,
    exportExcel,
    submitGroup: (groupId, v) => run(() => (groupId ? repo.updateGroup(groupId, v) : repo.createGroup(v))),
    submitRecipient: (recipientId, v) => run(() => (recipientId ? repo.updateRecipient(recipientId, v) : repo.createRecipient(v))),
    toggleRecipient: (recipientId) => run(() => repo.toggleRecipientState(recipientId)),
    testGroup: async (groupId) => toast((await repo.testGroup(groupId)).message),
    submitDuty: (v) => run(() => repo.createDuty(v)),
    removeDuty: (dutyId) => run(() => repo.deleteDuty(dutyId)),
  };
}
