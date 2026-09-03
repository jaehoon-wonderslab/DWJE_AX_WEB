/**
 * 라우트 — 불량 현황 조회 (QC-01)
 * 경로 /quality/defect · 화면 ID qc-defect
 */
import React from 'react';
import PageContainer from '@shared/components/layout/PageContainer';
import { useDefectStatusController } from '@domains/quality/controller/useDefectStatusController';
import DefectStatusView from '@domains/quality/view/DefectStatusView';

export default function DefectStatusPage() {
  const controller = useDefectStatusController();
  return (
    <PageContainer>
      <DefectStatusView {...controller} />
    </PageContainer>
  );
}
