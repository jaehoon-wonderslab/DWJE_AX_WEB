import './_rnw';
import React from 'react';
import { Chip } from 'dwje-ax-web';

const Row = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, width: 300 }}>{children}</div>
);

/** 후속 질문 칩 — onPress 가 있으면 눌러서 실행 */
export const FollowUps = () => (
  <Row>
    <Chip label="PR-03 불량 원인은?" onPress={() => {}} />
    <Chip label="전일 대비 추이" onPress={() => {}} />
    <Chip label="담당자에게 알림" onPress={() => {}} />
  </Row>
);

/** onPress 없음 — 눌리지 않는 표기용 (모양은 같음) */
export const Static = () => (
  <Row>
    <Chip label="Krios_s" />
    <Chip label="L260909-0412" />
    <Chip label="수율 97.4%" />
  </Row>
);

/** disabled — 눌림만 막고 모양은 유지 · textStyle 로 글자색 조정 가능 */
export const DisabledAndCustom = () => (
  <Row>
    <Chip label="재분석 (처리 중)" onPress={() => {}} disabled />
    <Chip label="긴급 재검" textStyle={{ color: '#B42318' }} style={{ borderColor: '#F0B4B0' }} />
  </Row>
);
