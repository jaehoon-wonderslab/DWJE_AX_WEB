/**
 * 라우트 — 알림 목록·상세 (AL-01)
 * 경로 /alert/list · 화면 ID alert-list
 */
import React from 'react';
import PageContainer from '@shared/components/layout/PageContainer';
import { useAlertListController } from '@domains/alert/controller/useAlertListController';
import AlertListView from '@domains/alert/view/AlertListView';

export default function AlertListPage() {
  const controller = useAlertListController();
  return (
    <PageContainer>
      <AlertListView {...controller} />
    </PageContainer>
  );
}
