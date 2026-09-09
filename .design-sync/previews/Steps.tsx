import './_rnw';
import React from 'react';
import { Steps } from 'dwje-ax-web';

const ITEMS = [
  { title: '전표 조회', sub: 'MES 폐기 전표' },
  { title: '항목 확인', sub: '수량 · 금액' },
  { title: '사유 작성', sub: 'AI 초안' },
  { title: '결재 요청', sub: '팀장 승인' },
];

/** 진행 중 — 1단계 완료(✓) · 2단계 현재(잉크) · 이후 대기 */
export const InProgress = () => (
  <div style={{ width: 720 }}>
    <Steps items={ITEMS} step={2} />
  </div>
);

/** 시작 — 1단계가 현재, 나머지는 회색 번호 */
export const Start = () => (
  <div style={{ width: 720 }}>
    <Steps items={ITEMS} step={1} />
  </div>
);

/** 마지막 단계 — 앞 단계는 모두 ✓ */
export const Last = () => (
  <div style={{ width: 720 }}>
    <Steps items={ITEMS} step={4} />
  </div>
);

/** 부제 없이 — 제목만 있는 짧은 3단계 */
export const TitlesOnly = () => (
  <div style={{ width: 520 }}>
    <Steps items={[{ title: '기간 선택' }, { title: '모델 선택' }, { title: '보고서 생성' }]} step={3} />
  </div>
);
