import './_rnw';
import React from 'react';
import { ScreenProdMonitor } from 'dwje-ax-web';

/** 생산 모니터링 — /production/monitor (데모 계정 · 목 데이터) */
export const Default = () => (
  <div style={{ width: 1280, height: 800 }}>
    <ScreenProdMonitor />
  </div>
);
