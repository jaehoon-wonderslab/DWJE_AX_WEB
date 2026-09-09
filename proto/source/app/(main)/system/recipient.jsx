/**
 * 라우트 — 알림 수신자 관리 (SY-05)
 * 경로 /system/recipient · 화면 ID sys-recip
 */
import React from 'react';
import PageContainer from '@shared/components/layout/PageContainer';
import { useRecipientController } from '@domains/system/controller/useRecipientController';
import RecipientView from '@domains/system/view/RecipientView';

export default function RecipientPage() {
  const controller = useRecipientController();
  return (
    <PageContainer>
      <RecipientView {...controller} />
    </PageContainer>
  );
}
