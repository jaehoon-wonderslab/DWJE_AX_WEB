import './_rnw';
import React from 'react';
import { ScreenRptShipPlan } from 'dwje-ax-web';

/** 연간 출하계획 — /report/ship-plan (데모 계정 · 목 데이터) */
export const Default = () => (
  <div style={{ width: 1280, height: 800 }}>
    <ScreenRptShipPlan />
  </div>
);
