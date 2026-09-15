/**
 * 라우트 — 자연어 질의 (AI-01) · 로그인 직후 첫 화면
 * 경로 /ai/chat · 화면 ID ai-chat
 *
 * 전체 영역을 쓰는 화면이라 FullPageContainer 를 사용합니다.
 * 빈 대화 상태에서는 인사말과 프리셋 브리핑(불량률 · 공정 현황 · 현재 이슈)을 먼저 보여 줍니다.
 */
import React from 'react';
import { FullPageContainer } from '@shared/components/layout/PageContainer';
import { useChatController } from '@domains/ai/controller/useChatController';
import { useHomeBriefing } from '@domains/ai/controller/useHomeBriefing';
import ChatView from '@domains/ai/view/ChatView';

export default function ChatPage() {
  const controller = useChatController();
  // 대화가 시작되면 브리핑은 더 부르지 않습니다 (빈 상태에서만 보입니다)
  const briefing = useHomeBriefing({ enabled: !controller.messages.length });
  return (
    <FullPageContainer>
      <ChatView {...controller} briefing={briefing} />
    </FullPageContainer>
  );
}
