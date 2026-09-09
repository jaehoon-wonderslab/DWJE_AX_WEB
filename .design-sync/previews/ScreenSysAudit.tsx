import './_rnw';
import React from 'react';
import { ScreenSysAudit } from 'dwje-ax-web';

/** 보안 감사 로그 — /system/audit-log (데모 계정 · 목 데이터) */
export const Default = () => (
  <div style={{ width: 1280, height: 800 }}>
    <ScreenSysAudit />
  </div>
);
