/**
 * 라우트 — AI 통합 대시보드 (DB-01)
 *
 * 경로   : /dashboard/ai
 * 화면 ID: dash-ai
 *
 * MVC 결선만 담당합니다. 상태·데이터는 Controller, 렌더링은 View 가 맡습니다.
 */
import React from 'react';
import PageContainer from '@shared/components/layout/PageContainer';
import { useAiDashboardController } from '@domains/dashboard/controller/useAiDashboardController';
import AiDashboardView from '@domains/dashboard/view/AiDashboardView';

export default function AiDashboardPage() {
  const controller = useAiDashboardController();
  return (
    <PageContainer>
      <AiDashboardView {...controller} />
    </PageContainer>
  );
}
