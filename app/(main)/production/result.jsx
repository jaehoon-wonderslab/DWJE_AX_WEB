/**
 * 라우트 — 실적 집계·조회 (PR-02)
 * 경로 /production/result · 화면 ID prod-result
 */
import React from 'react';
import PageContainer from '@shared/components/layout/PageContainer';
import { useProductionResultController } from '@domains/production/controller/useProductionResultController';
import ProductionResultView from '@domains/production/view/ProductionResultView';

export default function ProductionResultPage() {
  const controller = useProductionResultController();
  return (
    <PageContainer fluid>
      <ProductionResultView {...controller} />
    </PageContainer>
  );
}
