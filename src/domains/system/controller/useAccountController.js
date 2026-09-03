/**
 * [Controller] SY-01 계정 관리
 *
 * 접근 권한은 계정이 아니라 부서에 부여되므로, 계정에 부서를 지정하면
 * 그 부서의 메뉴·데이터 접근 권한이 그대로 적용됩니다.
 *
 * 회원가입(/signup)으로 들어온 신청은 `PENDING` 으로 쌓입니다.
 * 이 화면에서 승인해야 해당 계정이 로그인할 수 있습니다.
 */
import { useCallback } from 'react';
import { loadCodeGroups } from '@domains/common/model/codeRepository';
import { useAsync } from '@shared/hooks/useAsync';
import { usePaging } from '@shared/hooks/usePaging';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadXls } from '@shared/utils/exportUtil';
import * as repo from '../model/systemRepository';

export function useAccountController() {
  const toast = useUiStore((state) => state.toast);
  const me = useAuthStore((state) => state.userInfo);

  const paging = usePaging();

  const { data, loading, reload } = useAsync(
    () => repo.loadAccounts(paging.params),
    [paging.page, paging.size]
  );

  // 직급 선택지는 서버 공통코드(SYS_POSITION)가 정본입니다.
  // shared/constants/accounts 의 POSITIONS 는 표기 변환용이며 서버와 어긋날 수 있습니다(DIRECTOR 임원 ↔ 상무).
  const { data: codes } = useAsync(() => loadCodeGroups('SYS_POSITION'), [], { silent: true, initialData: {} });

  const users = data?.users || [];
  const depts = data?.depts || [];
  const pending = data?.pending || [];

  /** 등록·수정·삭제 공통 처리 — 메시지 표시 후 목록을 다시 불러옵니다 */
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
      name: '계정 목록',
      head: ['아이디', '이름', '소속 부서', '직급', '상태', '최근 접속'],
      rows: users.map((u) => [u.empNo, u.name, u.dept, u.posNm, u.stateNm, u.lastLoginAt || '—']),
    });
  }, [users]);

  return {
    paging,
    itemsMeta: data?.usersMeta,
    loading,
    me,
    summary: data?.summary,
    users,
    depts,
    /** 승인 대기 계정 (회원가입 신청) */
    pending,
    deptOptions: depts.map((d) => ({ value: d.id, label: d.name })),
    positionOptions: codes?.SYS_POSITION || [],
    logs: data?.logs || [],
    exportExcel,
    submitUser: (empNo, v) => run(() => (empNo ? repo.updateUser({ empNo, ...v }) : repo.createUser(v))),
    /**
     * 부서 등록·수정
     *
     * 서버는 `deptNm · abbr · desc · initPermFrom`(등록 시 초기 권한을 복사해 올 부서 ID)을 받습니다.
     * 화면 폼도 같은 키를 쓰므로 여기서는 빈 초기 권한('')만 걸러 냅니다.
     */
    submitDept: (deptId, v) => {
      const body = { deptNm: v.deptNm, abbr: v.abbr, desc: v.desc };
      if (!deptId && v.initPermFrom !== '' && v.initPermFrom !== undefined && v.initPermFrom !== null) {
        body.initPermFrom = Number(v.initPermFrom);
      }
      return run(() => (deptId ? repo.updateDept(deptId, body) : repo.createDept(body)));
    },
    removeUser: (empNo) => run(() => repo.deleteUser(empNo)),
    removeDept: (deptId) => run(() => repo.deleteDept(deptId)),
    // 현재 상태의 반대로 바꿉니다 (서버가 바꿀 상태를 받습니다 — ACTIVE · SUSPENDED)
    toggleState: (empNo, current) => run(() => repo.setUserState(empNo, current === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE')),
    moveDept: (empNo, deptId) => run(() => repo.moveUserDept(empNo, deptId)),
    /** 가입 승인 — PENDING → ACTIVE */
    approveSignup: (empNo) => run(() => repo.approveSignup(empNo, true)),
    /** 가입 반려 — PENDING → SUSPENDED (사유는 감사 로그에 남습니다) */
    rejectSignup: (empNo, reason) => run(() => repo.approveSignup(empNo, false, reason)),
  };
}
