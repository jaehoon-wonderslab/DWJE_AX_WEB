/**
 * 라우트 — 자연어 질의 이력 (SY-08)
 * 경로 /history/chat · 화면 ID chat-history · 대그룹 「자연어 질의 이력」
 *
 * 2026-10-01 결정 R-08 로 시스템관리에서 옮겼습니다. 옛 주소 /system/chat-history 는 이리로 넘겨줍니다.
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
