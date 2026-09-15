/**
 * 라우트 — 아침회의 자료 (Plating·Coating) (RP-02)
 * 경로 /report/plating-morning · 화면 ID rpt-plating-morning
 */
import React from 'react';
import PageContainer from '@shared/components/layout/PageContainer';
import { usePlatingMorningController } from '@domains/report/controller/usePlatingMorningController';
import PlatingMorningView from '@domains/report/view/PlatingMorningView';

export default function PlatingMorningPage() {
  const controller = usePlatingMorningController();
  return (
    <PageContainer>
      <PlatingMorningView {...controller} />
    </PageContainer>
  );
}
