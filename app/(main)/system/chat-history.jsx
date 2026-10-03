/**
 * 라우트 — 전사 자연어 질의 이력 (SY-18)
 * 경로 /system/chat-history · 화면 ID sys-chat-history · 대그룹 「시스템관리」
 *
 * 2026-10-03 신규. 예전에는 /history/chat 으로 넘겨주던 옛 주소였습니다(리다이렉트 제거).
 * 본인 이력만 보는 화면은 /history/chat(chat-history)입니다.
 */
import React from 'react';
import PageContainer from '@shared/components/layout/PageContainer';
import { useChatHistoryAdminController } from '@domains/system/controller/useChatHistoryAdminController';
import ChatHistoryAdminView from '@domains/system/view/ChatHistoryAdminView';

export default function ChatHistoryAdminPage() {
  const controller = useChatHistoryAdminController();
  return (
    <PageContainer>
      <ChatHistoryAdminView {...controller} />
    </PageContainer>
  );
}
