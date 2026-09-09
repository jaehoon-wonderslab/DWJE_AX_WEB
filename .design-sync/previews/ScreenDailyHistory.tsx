import './_rnw';
import React from 'react';
import { ScreenDailyHistory } from 'dwje-ax-web';

/** 이전 보고서 — /production/daily-report/history (데모 계정 · 목 데이터) */
export const Default = () => (
  <div style={{ width: 1280, height: 800 }}>
    <ScreenDailyHistory />
  </div>
);
