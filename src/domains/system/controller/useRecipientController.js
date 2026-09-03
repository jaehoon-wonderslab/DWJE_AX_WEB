/**
 * [Controller] SY-05 알림 수신자 관리
 *
 * '누구에게 · 어떤 연락처로' 보낼지를 관리합니다.
 * 발송 조건(SY-04)은 여기서 만든 수신 그룹의 이름만 참조합니다.
 */
import { useCallback, useState } from 'react';
import { loadCodeGroups } from '@domains/common/model/codeRepository';
import { useAsync } from '@shared/hooks/useAsync';
import { usePaging } from '@shared/hooks/usePaging';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadXls } from '@shared/utils/exportUtil';
import * as repo from '../model/systemRepository';

/**
 * 수신자 한 명의 수신/부재 상태
 *
 * 서버 목록의 `state` 는 표기('수신' | '부재')로 선언돼 있습니다. 코드로 바뀌어도 같게 읽도록
 * 몇 가지 표현을 함께 받습니다.
 *
 * @param {object} r 수신자 행
 * @returns {{receiving:boolean,label:string}}
 */
export function recipientState(r) {
  const v = r?.state;
  const receiving = v === '수신' || v === 'RECEIVING' || v === 'RECV' || v === 'ON' || v === true;
  return { receiving, label: r?.stateNm || (receiving ? '수신' : '부재') };
}

export function useRecipientController() {
  const toast = useUiStore((state) => state.toast);

  const [tab, setTab] = useState('수신 그룹');
  const [groupFilter, setGroupFilter] = useState('전체');
  const [stateFilter, setStateFilter] = useState('전체');

  // 채널·유효 시간대 선택지와 표기는 서버 공통코드가 정본입니다 (예전엔 '메일' 같은 표기를 화면 상수로 들고 있었습니다)
  const { data: codes } = useAsync(() => loadCodeGroups('ALM_CHANNEL', 'ALM_WINDOW', 'ALM_SEVERITY'), [], { silent: true, initialData: {} });

  const paging = usePaging({ resetKey: `${groupFilter}|${stateFilter}` });

  // 수신자 목록 API 의 필터는 state 만 있습니다. 그룹 필터는 현재 쪽 안에서 걸러 냅니다 (API 요청 사항)
  const { data, loading, reload } = useAsync(
    () => repo.loadRecipients({ state: stateFilter, ...paging.params }),
    [stateFilter, paging.page, paging.size]
  );

  const allRecipients = data?.recipients?.items || [];
  const recipients =
    groupFilter === '전체' ? allRecipients : allRecipients.filter((r) => (r.groups || []).map((g) => (g && typeof g === 'object' ? g.name : g)).includes(groupFilter));

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
      rows: recipients.map((r) => [r.name, r.dept, r.pos, r.mail, r.hp, r.messenger, r.night ? 'Y' : 'N', recipientState(r).label, (r.groups || []).join(' · ')]),
    });
  }, [recipients]);

  return {
    loading,
    codes,
    summary: data?.summary,
    groups: data?.groups?.items || [],
    recipients,
    paging,
    itemsMeta: data?.recipientsMeta,
    duties: data?.duties?.items || [],
    // 승격 규칙 응답은 stages[] 입니다 (예전엔 items 를 읽어 표가 늘 비어 있었습니다)
    escalation: data?.escalation?.stages || data?.escalation?.items || [],
    tab,
    setTab,
    filters: { groupFilter, stateFilter },
    setGroupFilter,
    setStateFilter,
    reload,
    exportExcel,
    /** 수신 그룹 등록·수정 — 본문은 name · channels[] · validWindow · night · memberEmpNos[] */
    submitGroup: (groupId, v) => {
      const body = { name: v.name, channels: v.channels || [], validWindow: v.validWindow, night: !!v.night, memberEmpNos: v.memberEmpNos || [] };
      return run(() => (groupId ? repo.updateGroup(groupId, body) : repo.createGroup(body)));
    },
    /** 수신자 등록(empNo 포함)·수정(mail · hp · messenger · night 만) */
    submitRecipient: (recipientId, v) => {
      const body = { mail: v.mail, hp: v.hp, messenger: v.messenger, night: !!v.night };
      return run(() => (recipientId ? repo.updateRecipient(recipientId, body) : repo.createRecipient({ empNo: v.empNo, ...body })));
    },
    toggleRecipient: (recipientId) => run(() => repo.toggleRecipientState(recipientId)),
    testGroup: async (groupId) => toast((await repo.testGroup(groupId)).message),
    /** 당번 등록·수정 — 본문은 from · to · groupId · mainEmpNo · subEmpNo · reason (예전 폼 키 group · main · sub 는 서버가 받지 않아 400) */
    submitDuty: (dutyId, v) => {
      const body = { from: v.from, to: v.to, groupId: v.groupId, mainEmpNo: v.mainEmpNo, subEmpNo: v.subEmpNo, reason: v.reason };
      return run(() => (dutyId ? repo.updateDuty(dutyId, body) : repo.createDuty(body)));
    },
    removeDuty: (dutyId) => run(() => repo.deleteDuty(dutyId)),
    /** 승격 규칙 수정 — 서버가 받는 항목은 stage · waitMin · targetGroupId 뿐입니다 */
    submitEscalation: (stages) =>
      run(() =>
        repo.updateEscalationRules(
          stages.map((st) => ({ stage: st.stage, waitMin: Number(st.waitMin), targetGroupId: st.targetGroupId === '' || st.targetGroupId === undefined ? null : st.targetGroupId }))
        )
      ),
  };
}
