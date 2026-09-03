/**
 * 라우트 — 데이터 연동 이력 (SY-15)
 * 경로 /system/sync-history · 화면 ID sys-sync
 */
import React from 'react';
import PageContainer from '@shared/components/layout/PageContainer';
import { useSyncHistoryController } from '@domains/system/controller/useSyncHistoryController';
import SyncHistoryView from '@domains/system/view/SyncHistoryView';

export default function SyncHistoryPage() {
  const controller = useSyncHistoryController();
  return (
    <PageContainer>
      <SyncHistoryView {...controller} />
    </PageContainer>
  );
}
