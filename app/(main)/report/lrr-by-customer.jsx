/**
 * 라우트 — 고객사별 LRR (RP-05)
 * 경로 /report/lrr-by-customer · 화면 ID rpt-lrr-customer
 */
import React from 'react';
import PageContainer from '@shared/components/layout/PageContainer';
import { useLrrByCustomerController } from '@domains/report/controller/useLrrByCustomerController';
import LrrByCustomerView from '@domains/report/view/LrrByCustomerView';

export default function LrrByCustomerPage() {
  const controller = useLrrByCustomerController();
  return (
    <PageContainer>
      <LrrByCustomerView {...controller} />
    </PageContainer>
  );
}
