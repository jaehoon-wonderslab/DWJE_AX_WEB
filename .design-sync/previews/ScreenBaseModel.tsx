import './_rnw';
import React from 'react';
import { ScreenBaseModel } from 'dwje-ax-web';

/** AI 모델 설정 — /system/model-config (데모 계정 · 목 데이터) */
export const Default = () => (
  <div style={{ width: 1280, height: 800 }}>
    <ScreenBaseModel />
  </div>
);
