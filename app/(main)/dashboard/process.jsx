/**
 * 라우트 — 공정 및 제품 대시보드 (DB-02)
 *
 * 경로   : /dashboard/process
 * 화면 ID: dash-proc
 */
import React from 'react';
import PageContainer from '@shared/components/layout/PageContainer';
import { useProcessDashboardController } from '@domains/dashboard/controller/useProcessDashboardController';
import ProcessDashboardView from '@domains/dashboard/view/ProcessDashboardView';

export default function ProcessDashboardPage() {
  const controller = useProcessDashboardController();
  return (
    <PageContainer>
      <ProcessDashboardView {...controller} />
    </PageContainer>
  );
}
