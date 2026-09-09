import './_rnw';
import React from 'react';
import { ScreenSysModelVer } from 'dwje-ax-web';

/** AI 모델 버전 관리 — /system/model-version (데모 계정 · 목 데이터) */
export const Default = () => (
  <div style={{ width: 1280, height: 800 }}>
    <ScreenSysModelVer />
  </div>
);
