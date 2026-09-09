import './_rnw';
import React from 'react';
import { ScreenRptLrrCustomer } from 'dwje-ax-web';

/** 고객사별 LRR — /report/lrr-by-customer (데모 계정 · 목 데이터) */
export const Default = () => (
  <div style={{ width: 1280, height: 800 }}>
    <ScreenRptLrrCustomer />
  </div>
);
