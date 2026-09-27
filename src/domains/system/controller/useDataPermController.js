/**
 * [Controller] SY-03 데이터 접근 권한
 *
 * 허용되지 않은 항목은 화면·보고서·인쇄물·CSV 전 구간에서 blind 처리됩니다.
 */
import { useCallback } from 'react';
import { fetchMe } from '@domains/auth/model/authRepository';
import { useAsync } from '@shared/hooks/useAsync';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadXls } from '@shared/utils/exportUtil';
import * as repo from '../model/systemRepository';

export function useDataPermController() {
  const toast = useUiStore((state) => state.toast);
  const setMe = useAuthStore((state) => state.setMe);

  const { data, loading, reload } = useAsync(() => repo.loadDataPerms(), []);

  const fields = data?.fields || [];
  const depts = data?.depts || [];
  const matrix = data?.matrix || {};

  const toggle = useCallback(
    async (fieldKey, deptId) => {
      // 서버 요청은 `allowed` 를 함께 받습니다(없으면 true 로 간주해 해제가 되지 않습니다)
      const allowed = !(matrix[deptId] || []).includes(fieldKey);
      const res = await repo.setDataPerm(deptId, fieldKey, allowed);
      toast(res.message);
      if (res.ok) {
        reload();
        const meRes = await fetchMe();
        if (meRes.ok) setMe(meRes.me);
      }
      return res;
    },
    [toast, reload, setMe, matrix]
  );

  const exportExcel = useCallback(() => {
    downloadXls({
      name: '데이터 접근 권한',
      head: ['데이터 항목', '포함 데이터', ...depts.map((d) => d.name)],
      rows: fields.map((f) => [f.name, f.desc, ...depts.map((d) => ((matrix[d.id] || []).includes(f.key) ? 'O' : '-'))]),
    });
  }, [fields, depts, matrix]);

  return {
    loading,
    fields,
    depts,
    matrix,
    adminDepts: data?.adminDepts || [],
    toggle,
    exportExcel,
    reload,
  };
}
