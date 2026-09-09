import './_rnw';
import React from 'react';
import { ScreenProdDaily } from 'dwje-ax-web';

/** 일일 생산현황 보고 — /production/daily-report (데모 계정 · 목 데이터) */
export const Default = () => (
  <div style={{ width: 1280, height: 800 }}>
    <ScreenProdDaily />
  </div>
);
