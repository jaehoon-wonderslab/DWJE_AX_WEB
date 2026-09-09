import './_rnw';
import React from 'react';
import { StatCard, Badge } from 'dwje-ax-web';

/** 기본 KPI 카드 — 라벨 · 값(Inter 600) · 단위 · 보조 문구 */
export const Basic = () => (
  <div style={{ width: 240 }}>
    <StatCard label="공정 불량률" value="2.6" unit="%" sub="목표 2.0% · 전일 대비 +0.3%p" />
  </div>
);

/** 상단 KPI 줄 — tone up/down 으로 보조 문구 색을 바꿉니다 */
export const KpiRow = () => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, width: 880 }}>
    <StatCard label="금일 생산량" value="128,400" unit="EA" sub="계획 대비 96.2%" tone="up" />
    <StatCard label="종합 수율" value="97.4" unit="%" sub="목표 97.0% 달성" tone="up" />
    <StatCard label="PRESS 불량률" value="1.8" unit="%" sub="전일 대비 +0.4%p" tone="down" />
    <StatCard label="가동 설비" value="42" unit="/ 48" sub="점검 중 3 · 비가동 3" />
  </div>
);

/** 오른쪽 슬롯 — 배지나 작은 버튼을 라벨 줄에 둡니다 */
export const WithRight = () => (
  <div style={{ width: 260 }}>
    <StatCard label="현재 이슈" value="3" unit="건" sub="AOI 오판정 1 · 도금 두께 2" right={<Badge tone="red">긴급 1</Badge>} />
  </div>
);
