import './_rnw';
import React from 'react';
import { ScreenChatHistory } from 'dwje-ax-web';

/** 자연어 질의 이력 — /system/chat-history (데모 계정 · 목 데이터) */
export const Default = () => (
  <div style={{ width: 1280, height: 800 }}>
    <ScreenChatHistory />
  </div>
);
