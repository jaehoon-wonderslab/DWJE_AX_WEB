import './_rnw';
import React from 'react';
import { Badge, StateBadge, Dot } from 'dwje-ax-web';

const Row = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>{children}</div>
);

/** 톤 5종 — 기본(회색) · green · blue · amber · red */
export const Tones = () => (
  <Row>
    <Badge>대기</Badge>
    <Badge tone="green">가동</Badge>
    <Badge tone="blue">진행 중</Badge>
    <Badge tone="amber">주의</Badge>
    <Badge tone="red">비가동</Badge>
  </Row>
);

/** 상태 문자열만 주면 색을 자동으로 고릅니다 */
export const StateBadges = () => (
  <Row>
    <StateBadge state="가동" />
    <StateBadge state="점검 중" />
    <StateBadge state="경고" />
    <StateBadge state="불량" />
    <StateBadge state="완료" />
    <StateBadge state="검토중" />
  </Row>
);

/** 상태 점 — 설비 목록·범례의 7px 점 */
export const Dots = () => (
  <Row>
    <Dot /> <span style={{ fontSize: 12, color: '#3C3C3C' }}>기본</span>
    <Dot tone="amber" /> <span style={{ fontSize: 12, color: '#3C3C3C' }}>주의</span>
    <Dot tone="red" /> <span style={{ fontSize: 12, color: '#3C3C3C' }}>정지</span>
    <Dot tone="gray" /> <span style={{ fontSize: 12, color: '#3C3C3C' }}>비활성</span>
    <Dot tone="amber" size={10} /> <span style={{ fontSize: 12, color: '#3C3C3C' }}>size 10</span>
  </Row>
);
