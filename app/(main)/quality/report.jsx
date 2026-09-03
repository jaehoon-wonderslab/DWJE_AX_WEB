/**
 * 라우트 — 품질 보고서 (QC-03)
 * 경로 /quality/report · 화면 ID qc-report
 */
import React from 'react';
import PageContainer from '@shared/components/layout/PageContainer';
import { useQualityReportController } from '@domains/quality/controller/useQualityReportController';
import QualityReportView from '@domains/quality/view/QualityReportView';

export default function QualityReportPage() {
  const controller = useQualityReportController();
  return (
    <PageContainer>
      <QualityReportView {...controller} />
    </PageContainer>
  );
}
