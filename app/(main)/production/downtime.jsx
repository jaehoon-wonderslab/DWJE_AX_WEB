/**
 * 라우트 — 비가동 관리 (PR-05)
 * 경로 /production/downtime · 화면 ID prod-down
 */
import React from 'react';
import PageContainer from '@shared/components/layout/PageContainer';
import { useDowntimeController } from '@domains/production/controller/useDowntimeController';
import DowntimeView from '@domains/production/view/DowntimeView';

export default function DowntimePage() {
  const controller = useDowntimeController();
  return (
    <PageContainer>
      <DowntimeView {...controller} />
    </PageContainer>
  );
}
