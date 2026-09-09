import './_rnw';
import React from 'react';
import { ScreenAlertCond } from 'dwje-ax-web';

/** 이상 알림 발송 조건 관리 — /system/alert-condition (데모 계정 · 목 데이터) */
export const Default = () => (
  <div style={{ width: 1280, height: 800 }}>
    <ScreenAlertCond />
  </div>
);
