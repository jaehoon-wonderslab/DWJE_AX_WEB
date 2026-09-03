/**
 * 라우트 — 이상 알림 발송 조건 관리 (SY-04)
 * 경로 /system/alert-condition · 화면 ID alert-cond
 */
import React from 'react';
import PageContainer from '@shared/components/layout/PageContainer';
import { useAlertCondController } from '@domains/system/controller/useAlertCondController';
import AlertCondView from '@domains/system/view/AlertCondView';

export default function AlertCondPage() {
  const controller = useAlertCondController();
  return (
    <PageContainer>
      <AlertCondView {...controller} />
    </PageContainer>
  );
}
