/**
 * 라우트 — 아침회의 자료 (PRESS) (RP-01)
 * 경로 /report/press-morning · 화면 ID rpt-press-morning
 */
import React from 'react';
import PageContainer from '@shared/components/layout/PageContainer';
import { usePressMorningController } from '@domains/report/controller/usePressMorningController';
import PressMorningView from '@domains/report/view/PressMorningView';

export default function PressMorningPage() {
  const controller = usePressMorningController();
  return (
    <PageContainer>
      <PressMorningView {...controller} />
    </PageContainer>
  );
}
