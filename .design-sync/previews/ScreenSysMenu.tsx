import './_rnw';
import React from 'react';
import { ScreenSysMenu } from 'dwje-ax-web';

/** 메뉴 접근 권한 — /system/menu-perm (데모 계정 · 목 데이터) */
export const Default = () => (
  <div style={{ width: 1280, height: 800 }}>
    <ScreenSysMenu />
  </div>
);
