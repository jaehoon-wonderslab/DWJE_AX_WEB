/**
 * 라우트 — 자연어 질의 이력 (SY-08)
 * 경로 /system/chat-history · 화면 ID chat-history
 */
import React from 'react';
import PageContainer from '@shared/components/layout/PageContainer';
import { useChatHistoryController } from '@domains/system/controller/useChatHistoryController';
import ChatHistoryView from '@domains/system/view/ChatHistoryView';

export default function ChatHistoryPage() {
  const controller = useChatHistoryController();
  return (
    <PageContainer>
      <ChatHistoryView {...controller} />
    </PageContainer>
  );
}
