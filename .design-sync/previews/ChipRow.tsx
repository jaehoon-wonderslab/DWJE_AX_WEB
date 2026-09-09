import './_rnw';
import React from 'react';
import { ChipRow, Chip, SourceChip } from 'dwje-ax-web';

/** 후속 질문 줄 — AI 답변 아래 6px 간격으로 줄바꿈 */
export const FollowUps = () => (
  <div style={{ width: 300 }}>
    <ChipRow>
      <Chip label="PR-03 최근 이벤트" onPress={() => {}} />
      <Chip label="도금 두께 추이" onPress={() => {}} />
      <Chip label="불량 유형별 비율" onPress={() => {}} />
      <Chip label="보고서로 저장" onPress={() => {}} />
    </ChipRow>
  </div>
);

/** 소스 표기 줄 — 답변 근거로 쓴 데이터 소스 */
export const Sources = () => (
  <div style={{ width: 300 }}>
    <ChipRow>
      <SourceChip label="MES 실적" />
      <SourceChip label="AOI 판정 로그" />
      <SourceChip label="설비 이벤트" />
      <SourceChip label="ERP 재고" off />
    </ChipRow>
  </div>
);

/** style 로 위 여백 제거 — 카드 머리말 바로 아래에 붙일 때 */
export const NoTopMargin = () => (
  <div style={{ width: 300 }}>
    <div style={{ fontSize: 11, fontWeight: 500, color: '#787878', letterSpacing: 0.22, marginBottom: 6 }}>이어서 물어보기</div>
    <ChipRow style={{ marginTop: 0 }}>
      <Chip label="LOT L260909-0412 상세" onPress={() => {}} />
      <Chip label="담당자 알림" onPress={() => {}} />
    </ChipRow>
  </div>
);
