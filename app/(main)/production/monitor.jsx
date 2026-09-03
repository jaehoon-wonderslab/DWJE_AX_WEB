/**
 * 라우트 — 생산 모니터링 (PR-01)
 * 경로 /production/monitor · 화면 ID prod-monitor
 */
import React from 'react';
import PageContainer from '@shared/components/layout/PageContainer';
import { useProductionMonitorController } from '@domains/production/controller/useProductionMonitorController';
import ProductionMonitorView from '@domains/production/view/ProductionMonitorView';

export default function ProductionMonitorPage() {
  const controller = useProductionMonitorController();
  return (
    <PageContainer>
      <ProductionMonitorView {...controller} />
    </PageContainer>
  );
}
