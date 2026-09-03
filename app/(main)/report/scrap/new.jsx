/**
 * 라우트 — 폐기 보고서 작성 (RP-07)
 * 경로 /report/scrap/new · 화면 ID rpt-scrap-new
 */
import React from 'react';
import PageContainer from '@shared/components/layout/PageContainer';
import { useScrapWizardController } from '@domains/report/controller/useScrapWizardController';
import ScrapWizardView from '@domains/report/view/ScrapWizardView';

export default function ScrapWizardPage() {
  const controller = useScrapWizardController();
  return (
    <PageContainer>
      <ScrapWizardView {...controller} />
    </PageContainer>
  );
}
