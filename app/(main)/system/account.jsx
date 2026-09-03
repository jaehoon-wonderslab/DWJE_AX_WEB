/**
 * 라우트 — 계정 관리 (SY-01)
 * 경로 /system/account · 화면 ID sys-account
 */
import React from 'react';
import PageContainer from '@shared/components/layout/PageContainer';
import { useAccountController } from '@domains/system/controller/useAccountController';
import AccountView from '@domains/system/view/AccountView';

export default function AccountPage() {
  const controller = useAccountController();
  return (
    <PageContainer>
      <AccountView {...controller} />
    </PageContainer>
  );
}
