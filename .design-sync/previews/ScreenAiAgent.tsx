import './_rnw';
import React from 'react';
import { ScreenAiAgent } from 'dwje-ax-web';

/** Agent 실행 현황 — /system/agent (데모 계정 · 목 데이터) */
export const Default = () => (
  <div style={{ width: 1280, height: 800 }}>
    <ScreenAiAgent />
  </div>
);
