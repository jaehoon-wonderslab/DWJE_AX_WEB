/**
 * [Controller] SY-01 계정 관리
 *
 * 부서의 기본 메뉴 권한에 계정별 추가 허용 메뉴를 합칩니다. 데이터 권한은 부서 기준입니다.
 *
 * 회원가입(/signup)으로 들어온 신청은 `PENDING` 으로 쌓입니다.
 * 이 화면에서 승인해야 해당 계정이 로그인할 수 있습니다.
 */
import { useCallback, useEffect, useState } from 'react';
import { loadCodeGroups } from '@domains/common/model/codeRepository';
import { useAsync } from '@shared/hooks/useAsync';
import { usePaging } from '@shared/hooks/usePaging';
import { fetchMe } from '@domains/auth/model/authRepository';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadXls } from '@shared/utils/exportUtil';
import * as repo from '../model/systemRepository';

/** 각 표를 독립적으로 검색·페이지 이동하고 조회 중에도 입력창을 유지합니다. */
function useAccountList(loader, localFilters = false) {
  const [keyword, setKeyword] = useState('');
  const paging = usePaging({ size: 10 });
  const result = useAsync(() => loader({ ...paging.params, ...(localFilters ? { page: 1, size: 0 } : {}), keyword }), [keyword, paging.page, paging.size]);
  useEffect(() => {
    const last = Math.max(1, Number(result.data?.meta?.totalPages || 1));
    if (!result.loading && result.data && paging.page > last) paging.setPage(last);
  }, [result.data, result.loading, paging.page, paging.setPage]);
  return {
    ...result, paging, keyword, localFilters,
    search: (value) => {
      const next = value.trim();
      if (next === keyword && paging.page === 1) result.reload();
      else { paging.reset(); setKeyword(next); }
    },
    rows: result.data?.items || [], meta: result.data?.meta,
  };
}

export function useAccountController() {
  const toast = useUiStore((state) => state.toast);
  const me = useAuthStore((state) => state.userInfo);

  const { data, loading, reload } = useAsync(() => repo.loadAccounts(), []);
  const userGrid = useAccountList(repo.loadAccountUsers, true);
  const pendingGrid = useAccountList(repo.loadAccountPending);
  const deptGrid = useAccountList(repo.loadAccountDepts, true);
  const logGrid = useAccountList(repo.loadAccountLogs, true);

  // 직급 선택지는 서버 공통코드(SYS_POSITION)가 정본입니다.
  // shared/constants/accounts 의 POSITIONS 는 표기 변환용이며 서버와 어긋날 수 있습니다(DIRECTOR 임원 ↔ 상무).
  const { data: codes } = useAsync(() => loadCodeGroups('SYS_POSITION'), [], { silent: true, initialData: {} });

  const users = userGrid.rows;
  const depts = data?.depts || [];
  const pending = pendingGrid.rows;

  /** 등록·수정·삭제 공통 처리 — 메시지 표시 후 목록을 다시 불러옵니다 */
  const run = useCallback(
    async (fn) => {
      const res = await fn();
      toast(res.message);
      if (res.ok) {
        reload(); userGrid.reload(); pendingGrid.reload(); deptGrid.reload(); logGrid.reload();
      }
      return res;
    },
    [toast, reload, userGrid.reload, pendingGrid.reload, deptGrid.reload, logGrid.reload]
  );

  const exportExcel = useCallback(() => {
    downloadXls({
      name: '계정 목록',
      head: ['아이디', '이름', '소속 부서', '직급', '상태', '최근 접속'],
      rows: users.map((u) => [u.empNo, u.name, u.dept, u.posNm, u.stateNm, u.lastLoginAt || '—']),
    });
  }, [users]);

  return {
    userGrid, pendingGrid, deptGrid, logGrid,
    loadMenuOptions: repo.loadAccountMenuOptions,
    loading: loading && !data,
    me,
    summary: data?.summary,
    users,
    depts: deptGrid.rows,
    /** 승인 대기 계정 (회원가입 신청) */
    pending,
    deptOptions: depts.map((d) => ({ value: d.id, label: d.name })),
    positionOptions: codes?.SYS_POSITION || [],
    logs: logGrid.rows,
    exportExcel,
    submitUser: async (empNo, v) => {
      const { passwordConfirm, ...fields } = v;
      const body = { ...fields, deptId: Number(v.deptId) };
      if (!data?.summary?.canChangePassword || !body.password) delete body.password;
      const res = await run(() => empNo ? repo.updateUser({ ...body, empNo }) : repo.createUser(body));
      if (res.ok && empNo === me?.empNo) {
        const current = await fetchMe();
        if (current.ok) useAuthStore.getState().setMe(current.me);
        else toast(current.message);
      }
      return res;
    },
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
    /** 가입 승인 — PENDING → ACTIVE */
    approveSignup: (empNo) => run(() => repo.approveSignup(empNo, true)),
    /** 가입 반려 — PENDING → SUSPENDED (사유는 감사 로그에 남습니다) */
    rejectSignup: (empNo, reason) => run(() => repo.approveSignup(empNo, false, reason)),
  };
}
