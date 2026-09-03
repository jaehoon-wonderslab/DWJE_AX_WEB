/**
 * 라우트 — 보고서 양식 관리 (QC-04)
 * 경로 /quality/report-forms · 화면 ID report-forms
 */
import React from 'react';
import PageContainer from '@shared/components/layout/PageContainer';
import { useReportFormsController } from '@domains/quality/controller/useReportFormsController';
import ReportFormsView from '@domains/quality/view/ReportFormsView';

export default function ReportFormsPage() {
  const controller = useReportFormsController();
  return (
    <PageContainer>
      <ReportFormsView {...controller} />
    </PageContainer>
  );
}
