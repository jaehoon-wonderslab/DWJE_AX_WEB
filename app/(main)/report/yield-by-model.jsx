/**
 * 라우트 — 제품별 수율 (RP-04)
 * 경로 /report/yield-by-model · 화면 ID rpt-yield-model
 */
import React from 'react';
import PageContainer from '@shared/components/layout/PageContainer';
import { useYieldByModelController } from '@domains/report/controller/useYieldByModelController';
import YieldByModelView from '@domains/report/view/YieldByModelView';

export default function YieldByModelPage() {
  const controller = useYieldByModelController();
  return (
    <PageContainer>
      <YieldByModelView {...controller} />
    </PageContainer>
  );
}
