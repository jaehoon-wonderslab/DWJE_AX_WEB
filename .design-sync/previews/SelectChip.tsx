import './_rnw';
import React from 'react';
import { SelectChip } from 'dwje-ax-web';

const Row = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', width: 300 }}>{children}</div>
);

/** 공정 선택 — on 이면 잉크 채움 + 흰 글자 600 */
export const Process = () => (
  <Row>
    <SelectChip label="PRESS" on />
    <SelectChip label="Plating" />
    <SelectChip label="Coating" />
    <SelectChip label="AOI" on />
  </Row>
);

/** sub — 라벨 옆 보조 설명(건수·비율) */
export const WithSub = () => (
  <Row>
    <SelectChip label="전체" sub="48" on />
    <SelectChip label="가동" sub="42" />
    <SelectChip label="점검 중" sub="3" />
    <SelectChip label="비가동" sub="3" />
  </Row>
);

/** small — 표 머리말·카드 안의 촘촘한 선택 */
export const Small = () => (
  <Row>
    <SelectChip small label="Krios_s" on />
    <SelectChip small label="Krios_m" />
    <SelectChip small label="Atlas_x" sub="신규" />
    <SelectChip small label="Atlas_p" />
  </Row>
);
