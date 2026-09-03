/**
 * 라우트 — 이전 보고서 (PR-04)
 * 경로 /production/daily-report/history · 화면 ID daily-history
 */
import React from 'react';
import PageContainer from '@shared/components/layout/PageContainer';
import { useDailyHistoryController } from '@domains/production/controller/useDailyHistoryController';
import DailyHistoryView from '@domains/production/view/DailyHistoryView';

export default function DailyHistoryPage() {
  const controller = useDailyHistoryController();
  return (
    <PageContainer>
      <DailyHistoryView {...controller} />
    </PageContainer>
  );
}
