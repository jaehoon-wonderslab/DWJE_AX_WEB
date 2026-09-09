import './_rnw';
import React from 'react';
import { BackLink, PageHead } from 'dwje-ax-web';

/** 화살표 + 12px 링크색 글자, 왼쪽 정렬 */
export const Basic = () => (
  <div style={{ width: 300 }}>
    <BackLink label="설비 현황으로" onPress={() => {}} />
  </div>
);

/** 하위 화면 관례 — PageHead 바로 위에 둡니다 */
export const AbovePageHead = () => (
  <div style={{ width: 300 }}>
    <BackLink label="설비 현황으로" onPress={() => {}} />
    <PageHead eyebrow="PRESS" title="PR-03 상세" desc="금형 교체 이력 · 치수 편차 추이" />
  </div>
);
