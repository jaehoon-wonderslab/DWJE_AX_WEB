/**
 * 라우트 — 자연어 질의 (AI-01)
 * 경로 /ai/chat · 화면 ID ai-chat
 *
 * 전체 영역을 쓰는 화면이라 FullPageContainer 를 사용합니다.
 */
import React from 'react';
import { FullPageContainer } from '@shared/components/layout/PageContainer';
import { useChatController } from '@domains/ai/controller/useChatController';
import ChatView from '@domains/ai/view/ChatView';

export default function ChatPage() {
  const controller = useChatController();
  return (
    <FullPageContainer>
      <ChatView {...controller} />
    </FullPageContainer>
  );
}
