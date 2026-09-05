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
    // 차트·매트릭스가 많아 폭이 넓을수록 잘 보입니다.
    // 기본 1,400px 상한을 두면 넓은 화면에서 오른쪽이 크게 비어 정보 밀도가 떨어집니다.
    <PageContainer fluid>
      <AiDashboardView {...controller} />
    </PageContainer>
  );
}
