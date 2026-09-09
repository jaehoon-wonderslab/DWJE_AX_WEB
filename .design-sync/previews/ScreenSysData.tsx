import './_rnw';
import React from 'react';
import { ScreenSysData } from 'dwje-ax-web';

/** 데이터 접근 권한 — /system/data-perm (데모 계정 · 목 데이터) */
export const Default = () => (
  <div style={{ width: 1280, height: 800 }}>
    <ScreenSysData />
  </div>
);
