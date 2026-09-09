import './_rnw';
import React from 'react';
import { FormAlert } from 'dwje-ax-web';

/** error(기본) — API 실패 응답에 field 가 없을 때 폼 상단에 붙입니다 */
export const ErrorTone = () => (
  <div style={{ width: 300 }}>
    <FormAlert>같은 사번(2019034)으로 등록된 계정이 이미 있습니다.</FormAlert>
  </div>
);

/** success — 저장·반영 완료 */
export const Success = () => (
  <div style={{ width: 300 }}>
    <FormAlert tone="success">PR-03 점검 기준을 저장했습니다. 다음 집계부터 반영됩니다.</FormAlert>
  </div>
);

/** info — 제출 전 확인 문구 */
export const Info = () => (
  <div style={{ width: 300 }}>
    <FormAlert tone="info">LOT L260909-0412 는 재검 판정 대기 상태입니다. 저장하면 수율 집계에서 제외됩니다.</FormAlert>
  </div>
);

/** 세 톤 나열 — 틴트 8% 배경 · 24% 테두리 · 아이콘 alert/check/info */
export const Tones = () => (
  <div style={{ width: 300, display: 'flex', flexDirection: 'column', gap: 8 }}>
    <FormAlert>필수 항목이 비어 있습니다.</FormAlert>
    <FormAlert tone="success">저장했습니다.</FormAlert>
    <FormAlert tone="info">변경 사항은 승인 후 적용됩니다.</FormAlert>
  </div>
);
