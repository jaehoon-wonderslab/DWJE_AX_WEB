import './_rnw';
import React from 'react';
import { CheckRow } from 'dwje-ax-web';

/** 켜짐 · 꺼짐 — 16px 둥근 사각, 켜지면 잉크 채움 + 흰 체크 */
export const States = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: 240 }}>
    <CheckRow label="불량 로트만 보기" checked />
    <CheckRow label="점검 중 설비 포함" checked={false} />
  </div>
);

/** 조회 조건의 공정 선택 목록 — 세로로 여러 줄 */
export const ProcessList = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 9, width: 220 }}>
    <CheckRow label="PRESS" checked />
    <CheckRow label="Plating" checked />
    <CheckRow label="Coating" checked={false} />
    <CheckRow label="AOI" checked />
  </div>
);

/** 필터 줄 끝에 가로로 붙이는 옵션 토글 */
export const Inline = () => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, width: 300 }}>
    <CheckRow label="야간조 포함" checked />
    <CheckRow label="재검 제외" checked={false} />
    <CheckRow label="AI 판정만" checked={false} />
  </div>
);
