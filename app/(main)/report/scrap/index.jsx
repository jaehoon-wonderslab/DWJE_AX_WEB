/**
 * 라우트 — 폐기 보고서 (RP-06)
 * 경로 /report/scrap · 화면 ID rpt-scrap
 */
import React from 'react';
import PageContainer from '@shared/components/layout/PageContainer';
import { useScrapReportController } from '@domains/report/controller/useScrapReportController';
import ScrapReportView from '@domains/report/view/ScrapReportView';

export default function ScrapReportPage() {
  const controller = useScrapReportController();
  return (
    <PageContainer>
      <ScrapReportView {...controller} />
    </PageContainer>
  );
}
