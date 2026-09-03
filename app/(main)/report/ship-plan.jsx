/**
 * 라우트 — 연간 출하계획 (RP-03)
 * 경로 /report/ship-plan · 화면 ID rpt-ship-plan
 */
import React from 'react';
import PageContainer from '@shared/components/layout/PageContainer';
import { useShipPlanController } from '@domains/report/controller/useShipPlanController';
import ShipPlanView from '@domains/report/view/ShipPlanView';

export default function ShipPlanPage() {
  const controller = useShipPlanController();
  return (
    <PageContainer>
      <ShipPlanView {...controller} />
    </PageContainer>
  );
}
