/**
 * [Controller] SY-02 메뉴 접근 권한
 *
 * 체크를 바꾸면 그 부서에 속한 모든 계정의 좌측 메뉴가 즉시 바뀝니다.
 * 내 부서 권한이 바뀐 경우 사이드바에 바로 반영되도록 내 권한도 다시 받아옵니다.
 */
import { useCallback, useMemo } from 'react';
import { fetchMe } from '@domains/auth/model/authRepository';
import { EXTRA_PAGES, pageName } from '@shared/constants/menu';
import { useAsync } from '@shared/hooks/useAsync';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadXls } from '@shared/utils/exportUtil';
import * as repo from '../model/systemRepository';

export function useMenuPermController() {
  const toast = useUiStore((state) => state.toast);
  const setMe = useAuthStore((state) => state.setMe);
  const myDept = useAuthStore((state) => state.userInfo?.dept);

  const { data, loading, reload } = useAsync(() => repo.loadMenuPerms(), []);

  const matrixData = data?.matrix;
  /**
   * 화면 행 — 서버(또는 목)가 준 목록에 「동작 권한」 표시를 붙입니다.
   * `dash-ai-upload` 처럼 화면이 아니라 버튼 동작을 막는 행은 메뉴 정의(EXTRA_PAGES.action)로 가려냅니다.
   * 서버가 `kind: 'ACTION'` 을 주면 그것도 같은 뜻으로 봅니다.
   */
  const screens = useMemo(
    () => (matrixData?.screens || []).map((r) => {
      const extra = EXTRA_PAGES.find((e) => e.id === r.id);
      const action = !!(r.action || String(r.kind || r.type || '').toUpperCase() === 'ACTION' || extra?.action);
      // 동작 권한 행은 「상위 화면 › 동작」 으로 — 서버는 sub: true 만 주므로 상위 이름은 메뉴 정의에서 찾습니다
      const parentId = r.parent || r.parentId || extra?.parent;
      const label = action && parentId ? `${pageName(parentId)} › ${r.name}` : undefined;
      return { ...r, sub: r.sub ? 1 : 0, action, label };
    }),
    [matrixData]
  );
  const depts = matrixData?.depts || [];
  const matrix = matrixData?.matrix || {};

  /** 권한 변경 후 목록과 내 권한을 함께 갱신합니다 */
  const run = useCallback(
    async (fn) => {
      const res = await fn();
      toast(res.message);
      if (res.ok) {
        reload();
        const me = await fetchMe();
        if (me.ok) setMe(me.me);
      }
      return res;
    },
    [toast, reload, setMe]
  );

  const exportExcel = useCallback(() => {
    downloadXls({
      name: '부서별 메뉴 접근 권한',
      head: ['메뉴 그룹', '화면', ...depts.map((d) => d.name)],
      rows: screens.map((r) => [r.group, r.name, ...depts.map((d) => ((matrix[d.id] || []).includes(r.id) ? 'O' : '-'))]),
    });
  }, [screens, depts, matrix]);

  const adminDepts = matrixData?.adminDepts || [];

  /**
   * 부서별 적용 현황 — 서버 행은 `deptId · deptNm · menuCnt · dataCnt · userCnt` 입니다.
   * 전체 화면 수는 매트릭스의 화면 수이고, 통합관리자(전 권한)는 menuCnt 가 null 로 오므로 전체로 봅니다.
   * 예전엔 `dept · allowedCnt · totalCnt` 를 그대로 읽어 세 열이 늘 비어 있었습니다.
   */
  const status = (data?.status?.items || []).map((r) => {
    const isAdmin = adminDepts.includes(String(r.deptId));
    const totalCnt = screens.length;
    const allowedCnt = isAdmin ? totalCnt : (r.menuCnt ?? (matrix[String(r.deptId)] || []).length);
    return { deptId: r.deptId, dept: r.deptNm ?? r.dept ?? String(r.deptId), allowedCnt, totalCnt, userCnt: r.userCnt ?? 0, isAdmin };
  });

  return {
    loading,
    screens,
    depts,
    matrix,
    adminDepts,
    status,
    myDept,
    myCount: (matrix[depts.find((d) => d.name === myDept)?.id] || []).length,
    avgCount: depts.length ? (depts.reduce((n, d) => n + (matrix[d.id] || []).length, 0) / depts.length).toFixed(1) : '0',
    // 서버 요청은 `allowed` 를 함께 받습니다(없으면 true 로 간주해 해제가 되지 않습니다).
    // 지금 체크돼 있으면 해제, 아니면 허용을 보냅니다.
    toggle: (screenId, deptId) => run(() => repo.setMenuPerm(deptId, screenId, !(matrix[deptId] || []).includes(screenId))),
    // 그룹 일괄 — 서버 본문 키는 groupNm 입니다 (PermMatrix 가 넘기는 group 은 그룹 이름)
    toggleGroup: (group, deptId, allowed) => run(() => repo.setMenuGroupPerm(deptId, group, allowed)),
    copyPerm: (v) => run(() => repo.copyMenuPerm(v)),
    exportExcel,
  };
}
