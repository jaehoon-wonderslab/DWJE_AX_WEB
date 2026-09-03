/**
 * 라우트 — 보안 감사 로그 (SY-09)
 * 경로 /system/audit-log · 화면 ID sys-audit
 */
import React from 'react';
import PageContainer from '@shared/components/layout/PageContainer';
import { useAuditLogController } from '@domains/system/controller/useAuditLogController';
import AuditLogView from '@domains/system/view/AuditLogView';

export default function AuditLogPage() {
  const controller = useAuditLogController();
  return (
    <PageContainer>
      <AuditLogView {...controller} />
    </PageContainer>
  );
}
