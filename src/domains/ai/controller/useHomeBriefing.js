/**
 * [Controller] 자연어 질의 홈 브리핑
 *
 * 로그인 직후 첫 화면(자연어 질의)에서 인사말과 브리핑(AI 브리핑 · 현재 이슈)을 채웁니다.
 * 기간은 실적 보유 기간 기준 최근 7일 — AI 대시보드 기본 기간과 같아 서버가 미리 계산한 결과를 받습니다.
 */
import { useMemo } from 'react';
import { useAsync } from '@shared/hooks/useAsync';
import { unitRange } from '@shared/stores/useAppStore';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { loadHomeBriefing } from '../model/homeBriefingRepository';
import { buildBriefingSections, greetingFor } from '../model/homeBriefingModel';

export function useHomeBriefing({ enabled = true } = {}) {
  const userInfo = useAuthStore((state) => state.userInfo);
  const period = useMemo(() => ({ ...unitRange('일별'), plant: undefined }), []);

  const { data, loading, error, reload } = useAsync(() => loadHomeBriefing(period), [period], { silent: true, skip: !enabled });

  const sections = useMemo(() => (data ? buildBriefingSections(data) : []), [data]);

  return {
    greeting: greetingFor(userInfo?.name),
    userName: userInfo?.name || '',
    dept: userInfo?.dept || '',
    period,
    sections,
    loading,
    error,
    generatedAt: data?.generatedAt || null,
    modelVer: data?.briefing?.modelVer || null,
    reload,
  };
}
