/**
 * 라우트 — 일일 생산현황 보고 (PR-03)
 * 경로 /production/daily-report · 화면 ID prod-daily
 */
import React from 'react';
import PageContainer from '@shared/components/layout/PageContainer';
import { useDailyReportController } from '@domains/production/controller/useDailyReportController';
import DailyReportView from '@domains/production/view/DailyReportView';

export default function DailyReportPage() {
  const controller = useDailyReportController();
  return (
    <PageContainer>
      <DailyReportView {...controller} />
    </PageContainer>
  );
}
