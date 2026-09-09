/**
 * 라우트 — 보고서 (대메뉴 허브) · 경로 /menu/report (?report=<화면 ID>)
 *
 * 드롭다운에서 보고서를 고르면 그 자리에서 보고서를 만들어 보여 줍니다.
 * 각 보고서의 개별 경로(/report/press-morning 등)도 그대로 살아 있습니다.
 */
import React from 'react';
import PageContainer from '@shared/components/layout/PageContainer';
import ReportPicker from '@domains/report/view/ReportPicker';

export default function ReportMenuPage() {
  return (
    <PageContainer>
      <ReportPicker />
    </PageContainer>
  );
}
