/**
 * [Controller] 부서 관리 — 부서 매핑 화면(SY-17)의 「부서」 탭 (2026-10-07)
 *
 * 계정 관리(SY-01)의 「부서」 탭 내용과 기능을 옮겨 왔습니다. 목록 · 등록 · 편집 · 삭제는 예전 그대로입니다.
 *  · 목록   GET    /system/depts?size=0 — 서버는 계정 관리 · 메뉴 · 데이터 · 부서 매핑 중 하나의 조회 권한을 봅니다
 *  · 등록   POST   /system/depts {deptNm, desc, initPermFrom}
 *  · 편집   PUT    /system/depts/{deptId} {deptNm?, desc}
 *  · 삭제   DELETE /system/depts/{deptId}
 *  등록 · 편집 · 삭제는 서버가 **계정 관리 쓰기 권한**을 봅니다. 부서 매핑 쓰기 권한만으로는 바꿀 수 없습니다.
 */
import { useCallback, useMemo } from 'react';
import { useAsync } from '@shared/hooks/useAsync';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import * as repo from '../model/systemRepository';

/** 부서 쓰기 권한이 없을 때 안내 */
export const DEPT_WRITE_DENIED = '부서 등록 · 편집 · 삭제는 계정 관리 쓰기 권한이 있어야 합니다.';

const EMPTY = [];

/**
 * @param {object} [opts]
 * @param {Function} [opts.onChanged] 등록 · 편집 · 삭제가 성공한 뒤 부를 함수 — 부서 매핑 화면의 부서 선택지를 다시 읽습니다
 */
export function useDeptManageController({ onChanged } = {}) {
  const toast = useUiStore((state) => state.toast);
  // 권한이 바뀌면 다시 그립니다 (canWrite 는 함수라 구독만으로는 바뀌지 않습니다)
  useAuthStore((state) => state.menuPerms);
  useAuthStore((state) => state.unassigned);
  const me = useAuthStore((state) => state.userInfo);
  const storeCanWrite = useAuthStore((state) => state.canWrite);

  const q = useAsync(() => repo.loadAccountDepts({ size: 0 }), [], { silent: true });
  const depts = q.data?.items || EMPTY;
  const canWrite = !!me?.superAdmin || storeCanWrite('sys-account');

  /** 초기 권한(복사해 올 부서) 선택지 — 시스템 부서(통합관리자 · 미배정)는 복사 대상이 아닙니다 */
  const initPermOptions = useMemo(() => [
    { value: '', label: '빈 권한 — 등록 후 직접 지정' },
    ...depts.filter((d) => !d.systemRole).map((d) => ({ value: d.id, label: d.name })),
  ], [depts]);

  const run = useCallback(async (fn) => {
    let res;
    try {
      res = await fn();
    } catch (e) {
      res = { ok: false, message: e?.message || '저장하지 못했습니다.' };
    }
    if (res?.message) toast(res.message);
    if (res?.ok) { q.reload(); onChanged?.(); }
    return res;
  }, [toast, q.reload, onChanged]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * 부서 등록 · 편집 — 폼 키는 서버 요청 본문(deptNm · desc · initPermFrom)과 같습니다.
   * 미배정 부서는 이름을 바꿀 수 없어 폼에 부서명 칸이 없습니다 — 그때는 deptNm 을 보내지 않습니다.
   */
  const submitDept = (deptId, v) => {
    const body = { desc: v.desc };
    if (v.deptNm !== undefined) body.deptNm = v.deptNm;
    if (!deptId && v.initPermFrom !== '' && v.initPermFrom !== undefined && v.initPermFrom !== null) {
      body.initPermFrom = Number(v.initPermFrom);
    }
    return run(() => (deptId ? repo.updateDept(deptId, body) : repo.createDept(body)));
  };

  const removeDept = (deptId) => run(() => repo.deleteDept(deptId));

  return {
    depts,
    deptTotal: q.data ? depts.length : undefined,
    deptLoading: q.loading && !q.data,
    deptError: q.error ? `부서 목록을 받지 못했습니다 — ${q.error.message || '서버 오류'}` : '',
    deptCanWrite: canWrite,
    initPermOptions,
    submitDept,
    removeDept,
    reloadDepts: q.reload,
  };
}
