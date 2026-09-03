/**
 * 라우트 — Agent 실행 현황 (SY-12)
 * 경로 /system/agent · 화면 ID ai-agent
 */
import React from 'react';
import PageContainer from '@shared/components/layout/PageContainer';
import { useAgentStatusController } from '@domains/system/controller/useAgentStatusController';
import AgentStatusView from '@domains/system/view/AgentStatusView';

export default function AgentStatusPage() {
  const controller = useAgentStatusController();
  return (
    <PageContainer>
      <AgentStatusView {...controller} />
    </PageContainer>
  );
}
