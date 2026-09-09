import './_rnw';
import React from 'react';
import { EmptyState, Card } from 'dwje-ax-web';

/** 기본 문구 — 28px 원 안의 minus 아이콘 + 캡션 회색 한 줄 */
export const Default = () => (
  <div style={{ width: 300 }}>
    <EmptyState />
  </div>
);

/** 상황에 맞춘 문구 — 필터 결과·기간 없음 등 */
export const CustomText = () => (
  <div style={{ width: 300 }}>
    <EmptyState text="선택한 기간(09-01 ~ 09-08)에 PR-03 이상 알림이 없습니다." />
  </div>
);

/** 카드 본문 안 — 표 자리에 그대로 넣습니다 */
export const InCard = () => (
  <div style={{ width: 300 }}>
    <Card title="재검 대기 LOT" sub="Plating · 오늘">
      <EmptyState text="재검 대기 중인 LOT 가 없습니다." />
    </Card>
  </div>
);
