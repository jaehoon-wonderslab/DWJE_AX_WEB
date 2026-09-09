import './_rnw';
import React from 'react';
import { NoAccess } from 'dwje-ax-web';

/** 기본 — 아이브로 "Access denied" · 21px 제목 · 안내 문장 · 40px 헤어라인 */
export const Basic = () => (
  <div style={{ width: 520 }}>
    <NoAccess />
  </div>
);

/** 부서명 — 어느 부서에 막힌 화면인지 문장 앞에 붙습니다 */
export const WithDept = () => (
  <div style={{ width: 520 }}>
    <NoAccess dept="생산1팀" />
  </div>
);
