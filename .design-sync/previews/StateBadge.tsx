import './_rnw';
import React from 'react';
import { StateBadge } from 'dwje-ax-web';

const Row = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>{children}</div>
);
const Line = ({ name, state }: { name: string; state: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #DFE1E7' }}>
    <span style={{ fontSize: 12, fontWeight: 500, color: '#0B1440' }}>{name}</span>
    <StateBadge state={state} />
  </div>
);

/** 정상 계열 — 가동·정상·양품·완료는 green 으로 자동 매핑 */
export const Normal = () => (
  <Row>
    <StateBadge state="가동" />
    <StateBadge state="정상" />
    <StateBadge state="양품" />
    <StateBadge state="완료" />
    <StateBadge state="서비스 중" />
  </Row>
);

/** 주의·진행 계열 — 경고·주의·보류는 amber, 진행 중·검토중은 blue */
export const Caution = () => (
  <Row>
    <StateBadge state="경고" />
    <StateBadge state="주의" />
    <StateBadge state="보류" />
    <StateBadge state="진행 중" />
    <StateBadge state="검토중" />
  </Row>
);

/** 오류·정지 계열 — red */
export const Fault = () => (
  <Row>
    <StateBadge state="비가동" />
    <StateBadge state="정지" />
    <StateBadge state="불량" />
    <StateBadge state="점검필요" />
    <StateBadge state="반려" />
  </Row>
);

/** 중립 — 대기·점검 중·보관, 사전에 없는 문자열은 기본 회색 */
export const Neutral = () => (
  <Row>
    <StateBadge state="대기" />
    <StateBadge state="점검 중" />
    <StateBadge state="보관" />
    <StateBadge state="출하대기" />
  </Row>
);

/** 설비 목록 안에서 — 이름 오른쪽에 상태만 놓는 전형적인 쓰임 */
export const InList = () => (
  <div style={{ width: 260 }}>
    <Line name="PR-01 · PRESS" state="가동" />
    <Line name="PR-03 · PRESS" state="경고" />
    <Line name="PL-01 · Plating" state="점검 중" />
    <Line name="CT-02 · Coating" state="비가동" />
  </div>
);
