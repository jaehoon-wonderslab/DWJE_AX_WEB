import './_rnw';
import React from 'react';
import { PageHead, Button, ButtonRow } from 'dwje-ax-web';

/** 제목 21px 600 + 설명 12.5px 캡션 */
export const Basic = () => (
  <div style={{ width: 640 }}>
    <PageHead title="설비 현황" desc="라인별 가동 상태와 금일 실적을 한눈에 봅니다. 5분마다 자동 갱신됩니다." />
  </div>
);

/** eyebrow — 제목 위 11px 소제목(대메뉴·화면 그룹) */
export const WithEyebrow = () => (
  <div style={{ width: 640 }}>
    <PageHead eyebrow="생산 관리 · PRESS" title="PR-03 상세" desc="금형 교체 이력 · 치수 편차 추이 · 최근 LOT 판정" />
  </div>
);

/** 우측 액션 — 기간 선택·내보내기 같은 화면 단위 동작 */
export const WithActions = () => (
  <div style={{ width: 640 }}>
    <PageHead
      title="아침회의 자료"
      desc="2026-09-09 (화) · 전일 실적 기준"
      actions={<ButtonRow><Button label="전일" variant="outline" size="sm" /><Button label="인쇄 · PDF" size="sm" /></ButtonRow>}
    />
  </div>
);
