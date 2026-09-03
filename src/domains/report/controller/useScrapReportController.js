/**
 * [Controller] RP-06 폐기 보고서
 *
 * 금액 열은 원가(price) 열람 권한이 있는 계정에만 표시됩니다.
 */
import { useCallback, useState } from 'react';
import { useAsync } from '@shared/hooks/useAsync';
import { currentMonthRange } from '@shared/stores/useAppStore';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { loadScrapReport } from '../model/reportRepository';

export function useScrapReportController() {
  const toast = useUiStore((state) => state.toast);
  const role = useAuthStore((state) => state.userInfo?.dept);

  // 문서번호를 고르기 전에는 목록의 첫 건을 펼칩니다 (리포지토리가 정합니다)
  const [docNo, setDocNo] = useState('');
  const [from, setFrom] = useState(currentMonthRange().from);
  const [to, setTo] = useState(currentMonthRange().to);
  const [originType, setOriginType] = useState('제조공정 발생');

  const { data, loading, reload } = useAsync(
    () => loadScrapReport({ docNo, from, to, originType }),
    [docNo, from, to, originType]
  );

  const search = useCallback(() => {
    reload();
    toast('조회 조건으로 다시 조회했습니다');
  }, [reload, toast]);

  return {
    loading,
    detail: data?.detail,
    docList: data?.list?.items || [],
    role,
    filters: { docNo, from, to, originType },
    setDocNo,
    setFrom,
    setTo,
    setOriginType,
    search,
  };
}
