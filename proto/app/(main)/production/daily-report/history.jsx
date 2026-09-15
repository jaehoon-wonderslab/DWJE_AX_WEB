/**
 * 라우트 — 이전 보고서 (PR-04)
 * 경로 /production/daily-report/history · 화면 ID daily-history
 *
 * 붙일 API 가 없어 컨트롤러 없이 안내만 그립니다(2026-09-04).
 */
import React from 'react';
import PageContainer from '@shared/components/layout/PageContainer';
import DailyHistoryView from '@domains/production/view/DailyHistoryView';

export default function DailyHistoryPage() {
  return (
    <PageContainer>
      <DailyHistoryView />
    </PageContainer>
  );
}
