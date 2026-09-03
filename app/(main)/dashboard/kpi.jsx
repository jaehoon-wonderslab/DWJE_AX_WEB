/**
 * 라우트 — 성과지표 대시보드 (DB-03)
 *
 * 경로   : /dashboard/kpi
 * 화면 ID: dash-kpi
 */
import React from 'react';
import PageContainer from '@shared/components/layout/PageContainer';
import { useKpiDashboardController } from '@domains/dashboard/controller/useKpiDashboardController';
import KpiDashboardView from '@domains/dashboard/view/KpiDashboardView';

export default function KpiDashboardPage() {
  const controller = useKpiDashboardController();
  return (
    <PageContainer>
      <KpiDashboardView {...controller} />
    </PageContainer>
  );
}
