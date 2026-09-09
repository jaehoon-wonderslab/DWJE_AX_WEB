import './_rnw';
import React from 'react';
import { ReportTitle, SignalLegend, Badge } from 'dwje-ax-web';

/** 날짜 박스(#FAFAFA 캡슐, Inter 숫자) + 제목 18px + 우측 범례 */
export const Full = () => (
  <div style={{ width: 640 }}>
    <ReportTitle dateBox="09.09 (화)" title="아침회의 자료 — 전일 생산 실적" right={<SignalLegend />} />
  </div>
);

/** 제목만 — 날짜·우측 없이 문서 소제목처럼 */
export const TitleOnly = () => (
  <div style={{ width: 640 }}>
    <ReportTitle title="주간 품질 보고 (9/1~9/7)" />
  </div>
);

/** 우측에 다른 노드 — 확정·초안 같은 문서 상태 배지 */
export const WithBadge = () => (
  <div style={{ width: 640 }}>
    <ReportTitle dateBox="2026-09" title="월간 설비 종합 효율(OEE)" right={<Badge tone="amber">초안</Badge>} />
  </div>
);
