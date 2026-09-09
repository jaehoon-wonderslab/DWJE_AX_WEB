import './_rnw';
import React from 'react';
import { Hint } from 'dwje-ax-web';

/** 기본 — 정보 아이콘 + 한 줄 안내(#FAFAFA 카드 · 헤어라인) */
export const Basic = () => (
  <div style={{ width: 300 }}>
    <Hint>조회 기간은 최근 90일까지 지정할 수 있습니다.</Hint>
  </div>
);

/** 아이콘 교체 — 주의 문구에는 alert, 시각 안내에는 clock */
export const Icons = () => (
  <div style={{ width: 300, display: 'flex', flexDirection: 'column', gap: 8 }}>
    <Hint icon="alert">PR-03 은 08:12 금형 교체 이후 첫 로트입니다. 치수 편차를 함께 확인하세요.</Hint>
    <Hint icon="clock">실적은 5분 간격으로 MES 에서 집계됩니다. 마지막 집계 09:55.</Hint>
  </div>
);

/** 여러 줄 — 긴 안내는 12px · 19px 행간으로 자연스럽게 줄바꿈 */
export const Multiline = () => (
  <div style={{ width: 300 }}>
    <Hint>
      AOI 판정 결과는 자동 저장되며, 오판정으로 표시한 항목은 품질보증팀 검토 후 수율 집계에서 제외됩니다. 검토는 보통 1 영업일 안에 끝납니다.
    </Hint>
  </div>
);
