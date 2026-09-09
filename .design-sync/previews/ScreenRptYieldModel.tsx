import './_rnw';
import React from 'react';
import { ScreenRptYieldModel } from 'dwje-ax-web';

/** 제품별 수율 — /report/yield-by-model (데모 계정 · 목 데이터) */
export const Default = () => (
  <div style={{ width: 1280, height: 800 }}>
    <ScreenRptYieldModel />
  </div>
);
