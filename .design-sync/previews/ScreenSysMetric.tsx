import './_rnw';
import React from 'react';
import { ScreenSysMetric } from 'dwje-ax-web';

/** 지표 측정 데이터 관리 — /system/metric-standard (데모 계정 · 목 데이터) */
export const Default = () => (
  <div style={{ width: 1280, height: 800 }}>
    <ScreenSysMetric />
  </div>
);
