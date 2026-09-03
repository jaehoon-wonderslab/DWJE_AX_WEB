/**
 * [Controller] RP-06 폐기 보고서
 *
 * 금액 열은 원가(price) 열람 권한이 있는 계정에만 표시됩니다.
 * 문서 상태 표기는 공통코드 RPT_DOC_STATE 에서, 발생 구분은 MES 전표 판정값(제조공정·협력업체·IQC 발생)에서 옵니다.
 */
import { useCallback, useMemo, useState } from 'react';
import { useAsync } from '@shared/hooks/useAsync';
import { currentMonthRange } from '@shared/stores/useAppStore';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { labelOf, loadCodeGroups } from '@domains/common/model/codeRepository';
import { VOUCHER_ORIGIN_TYPES } from '../model/reportModel';
import { loadScrapReport } from '../model/reportRepository';

export function useScrapReportController() {
  const toast = useUiStore((state) => state.toast);
  const role = useAuthStore((state) => state.userInfo?.dept);

  // 문서번호를 고르기 전에는 목록의 첫 건(문서번호가 있는)을 펼칩니다 (리포지토리가 정합니다)
  const [docNo, setDocNo] = useState('');
  const [from, setFrom] = useState(currentMonthRange().from);
  const [to, setTo] = useState(currentMonthRange().to);
  const [originType, setOriginType] = useState('제조공정 발생');

  const { data: codes } = useAsync(() => loadCodeGroups('RPT_DOC_STATE'), [], { silent: true, initialData: {} });

  const { data, loading, reload } = useAsync(
    () => loadScrapReport({ docNo, from, to, originType }),
    [docNo, from, to, originType]
  );

  const docList = data?.list?.items || [];
  const stateLabel = useCallback((code) => labelOf(codes?.RPT_DOC_STATE, code), [codes]);

  /** 문서번호 선택지 — 문서번호가 확정된 건만 (임시 저장 초안은 docNo 가 없어 상세를 열 수 없습니다) */
  const docOptions = useMemo(
    () => docList.filter((x) => x.docNo).map((x) => ({ value: x.docNo, label: `${x.docNo} · ${stateLabel(x.state)}` })),
    [docList, stateLabel]
  );

  const search = useCallback(() => {
    reload();
    toast('조회 조건으로 다시 조회했습니다');
  }, [reload, toast]);

  return {
    loading,
    detail: data?.detail,
    docList,
    docOptions,
    stateLabel,
    originOptions: ['전체', ...VOUCHER_ORIGIN_TYPES],
    role,
    filters: { docNo: data?.docNo || docNo, from, to, originType },
    setDocNo,
    setFrom,
    setTo,
    setOriginType,
    search,
  };
}
