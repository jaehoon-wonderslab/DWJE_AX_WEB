/**
 * [Controller] QC-04 보고서 양식 관리
 *
 * 양식 구조가 바뀌면 파서 버전을 함께 올려 관리합니다.
 */
import { useCallback } from 'react';
import { loadCodeGroups } from '@domains/common/model/codeRepository';
import { useAsync } from '@shared/hooks/useAsync';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadXls } from '@shared/utils/exportUtil';
import { createReportForm, loadFormFields, loadReportForms, updateReportForm } from '../model/qualityRepository';

export function useReportFormsController() {
  const toast = useUiStore((state) => state.toast);
  const { data, loading, reload } = useAsync(() => loadReportForms(), []);

  // 유형·공개 정책은 서버 공통코드가 정본입니다.
  // 화면에 표시명을 박아 두면 코드가 아니라 라벨이 저장되어 typeNm 이 null 이 됩니다
  const { data: codes } = useAsync(
    () => loadCodeGroups('RPT_FORM_TYPE', 'VEC_CONFIDENTIAL'),
    [],
    { silent: true, initialData: {} }
  );
  const items = data?.items || [];

  const submitForm = useCallback(
    async (formId, values) => {
      const res = formId ? await updateReportForm(formId, values) : await createReportForm(values);
      toast(res.message);
      if (res.ok) reload();
      return res;
    },
    [toast, reload]
  );

  const exportExcel = useCallback(() => {
    downloadXls({
      name: '보고서 양식 목록',
      head: ['양식명', '유형', '항목 수', '고객사 공개 정책', '파서 버전', '수정일'],
      rows: items.map((f) => [f.name, f.type, f.fieldCnt, f.disclosurePolicy, f.parserVer, f.updatedAt]),
    });
  }, [items]);

  return { loading, items, codes, submitForm, exportExcel, loadFormFields };
}
