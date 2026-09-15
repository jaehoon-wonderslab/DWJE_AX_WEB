/**
 * [Controller] SY-02 메뉴 접근 권한
 *
 * 체크를 바꾸면 그 부서에 속한 모든 계정의 좌측 메뉴가 즉시 바뀝니다.
 * 내 부서 권한이 바뀐 경우 사이드바에 바로 반영되도록 내 권한도 다시 받아옵니다.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { fetchMe } from '@domains/auth/model/authRepository';
import { EXTRA_PAGES, pageName, permRows } from '@shared/constants/menu';
import { useAsync } from '@shared/hooks/useAsync';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadXls } from '@shared/utils/exportUtil';
import * as repo from '../model/systemRepository';

export function useMenuPermController() {
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
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
    () => {
      const definitions = permRows();
      const ordered = definitions.filter(r => !r.sub).flatMap(r => [r, ...definitions.filter(e => EXTRA_PAGES.some(extra => extra.id === e.id && extra.parent === r.id))]);
      const order = new Map(ordered.map((r, index) => [r.id, index]));
      return (matrixData?.screens || []).map((r) => {
      const definition = definitions.find(e => e.id === r.id);
      const extra = EXTRA_PAGES.find((e) => e.id === r.id);
      const action = !!(r.action || String(r.kind || r.type || '').toUpperCase() === 'ACTION' || extra?.action);
      // 동작 권한 행은 「상위 화면 › 동작」 으로 — 서버는 sub: true 만 주므로 상위 이름은 메뉴 정의에서 찾습니다
      const parentId = r.parent || r.parentId || extra?.parent;
      const label = action && parentId ? `${pageName(parentId)} › ${definition?.name || r.name}` : undefined;
      const knownName = pageName(r.id);
      return { ...r, group: definition?.group || r.group, name: knownName === r.id ? r.name : knownName, sub: definition?.sub ?? (r.sub ? 1 : 0), action, label };
    }).sort((a, b) => (order.get(a.id) ?? Infinity) - (order.get(b.id) ?? Infinity));
    },
    [matrixData]
  );
  const depts = matrixData?.depts || [];
  const matrix = matrixData?.matrix || {};

  /** 권한 변경 후 목록과 내 권한을 함께 갱신합니다 */
  const run = useCallback(
    async (fn) => {
      if (running.current) return { ok: false, message: '변경 사항을 저장 중입니다.' };
      running.current = true;
      setBusy(true);
      try {
        const res = await fn();
        toast(res.message);
        if (res.ok || res.refresh) {
          await reload();
          const me = await fetchMe();
          if (me.ok) setMe(me.me);
        }
        return res;
      } finally {
        running.current = false;
        setBusy(false);
      }
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

  return {
    loading: loading && !data,
    busy,
    screens,
    depts,
    matrix,
    adminDepts,
    myDept,
    myCount: (matrix[depts.find((d) => d.name === myDept)?.id] || []).length,
    avgCount: depts.length ? (depts.reduce((n, d) => n + (matrix[d.id] || []).length, 0) / depts.length).toFixed(1) : '0',
    // 서버 요청은 `allowed` 를 함께 받습니다(없으면 true 로 간주해 해제가 되지 않습니다).
    // 지금 체크돼 있으면 해제, 아니면 허용을 보냅니다.
    toggle: (screenId, deptId) => run(() => repo.setMenuPerm(deptId, screenId, !(matrix[deptId] || []).includes(screenId))),
    // 서버의 이전 그룹명 대신 현재 메뉴 정의에 속한 화면 ID로 적용합니다.
    toggleGroup: (group, deptId, allowed) => run(async () => {
      if (adminDepts.includes(String(deptId))) return { ok: false, message: '통합관리자 부서는 전 권한으로 고정됩니다.' };
      const targets = screens.filter(s => s.group === group && (matrix[deptId] || []).includes(s.id) !== allowed);
      let saved = 0;
      for (const screen of targets) {
        try {
          const result = await repo.setMenuPerm(deptId, screen.id, allowed);
          if (!result.ok) return { ok: false, refresh: true, message: `${saved}/${targets.length}개 저장. ${result.message || '저장에 실패했습니다.'}` };
          saved++;
        } catch {
          return { ok: false, refresh: true, message: `${saved}/${targets.length}개 저장 후 오류가 발생했습니다. 권한을 다시 확인해 주세요.` };
        }
      }
      return { ok: true, message: `${group}: ${saved}개 화면 권한을 변경했습니다.` };
    }),
    copyPerm: (v) => run(() => repo.copyMenuPerm(v)),
    exportExcel,
  };
}
