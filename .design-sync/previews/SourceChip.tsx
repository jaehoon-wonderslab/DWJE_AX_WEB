import './_rnw';
import React from 'react';
import { SourceChip } from 'dwje-ax-web';

const Row = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, width: 300 }}>{children}</div>
);

/** AI 답변 하단의 데이터 소스 표기 — 회색 면, 테두리 없음 */
export const Basic = () => (
  <Row>
    <SourceChip label="MES 실적" />
    <SourceChip label="AOI 판정 로그" />
    <SourceChip label="설비 이벤트" />
    <SourceChip label="품질 검사" />
  </Row>
);

/** off — 이번 답변에 쓰이지 않은 소스는 흐리게 + 취소선 */
export const WithOff = () => (
  <Row>
    <SourceChip label="MES 실적" />
    <SourceChip label="AOI 판정 로그" />
    <SourceChip label="ERP 재고" off />
    <SourceChip label="설비 이벤트" />
    <SourceChip label="작업 일지" off />
  </Row>
);
