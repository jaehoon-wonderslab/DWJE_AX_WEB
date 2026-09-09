import './_rnw';
import React from 'react';
import { ScreenSysSync } from 'dwje-ax-web';

/** 데이터 연동 이력 — /system/sync-history (데모 계정 · 목 데이터) */
export const Default = () => (
  <div style={{ width: 1280, height: 800 }}>
    <ScreenSysSync />
  </div>
);
