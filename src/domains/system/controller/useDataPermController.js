/**
 * [Controller] SY-03 데이터 접근 권한
 *
 * 허용되지 않은 항목은 화면·보고서·인쇄물·CSV 전 구간에서 blind 처리됩니다.
 */
import { useCallback, useState } from 'react';
import { fetchMe } from '@domains/auth/model/authRepository';
import { useAsync } from '@shared/hooks/useAsync';
import { usePaging } from '@shared/hooks/usePaging';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadXls } from '@shared/utils/exportUtil';
import * as repo from '../model/systemRepository';

export function useDataPermController() {
  const toast = useUiStore((state) => state.toast);
  const setMe = useAuthStore((state) => state.setMe);
  const me = useAuthStore((state) => state.userInfo);

  // 미리보기 대상 — 기본값은 로그인 계정. 사번이 있어야 미리보기 API 를 부를 수 있습니다.
  const [previewEmpNo, setPreviewEmpNo] = useState(me?.empNo || '');
  const auditPaging = usePaging({ resetKey: previewEmpNo });
  const { data, loading, reload } = useAsync(
    () => repo.loadDataPerms(previewEmpNo, auditPaging.params),
    [previewEmpNo, auditPaging.page, auditPaging.size]
  );

  const matrixData = data?.matrix;
  const fields = matrixData?.fields || [];
  const depts = matrixData?.depts || [];
  const matrix = matrixData?.matrix || {};

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

  /** 항목 key → 이름 (계정별 적용 결과의 비공개 항목을 코드가 아닌 이름으로 보이게) */
  const fieldNameOf = useCallback((key) => fields.find((f) => f.key === key)?.name || key, [fields]);

  const exportExcel = useCallback(() => {
    downloadXls({
      name: '데이터 접근 권한',
      head: ['데이터 항목', '포함 데이터', ...depts.map((d) => d.name)],
      rows: fields.map((f) => [f.name, f.desc, ...depts.map((d) => ((matrix[d.id] || []).includes(f.key) ? 'O' : '-'))]),
    });
  }, [fields, depts, matrix]);

  return {
    loading,
    me,
    fields,
    depts,
    matrix,
    adminDepts: matrixData?.adminDepts || [],
    /** 미리보기 — 서버 행은 `{ fieldKey, name, rendered, masked }` 입니다 (대상 계정 기준 판정) */
    preview: data?.preview,
    previewEmpNo,
    setPreviewEmpNo,
    byUser: data?.byUser?.items || [],
    audit: data?.audit?.items || [],
    auditPaging,
    auditMeta: data?.auditMeta,
    fieldNameOf,
    toggle,
    exportExcel,
    notifySaved: () => toast('데이터 접근 권한을 저장했습니다 — 변경 이력은 감사 로그에 기록됩니다'),
  };
}
