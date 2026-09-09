import './_rnw';
import React from 'react';
import { Pred, ConfTag, Drift } from 'dwje-ax-web';

/** 기본 — 라벨 · 예측값(Inter 600) · 단위 · 신뢰 구간 */
export const Basic = () => (
  <div style={{ width: 220 }}>
    <Pred label="내일 예측 불량률" value="2.9" unit="%" ci="95% 구간 2.4 – 3.4%" />
  </div>
);

/** level 3종 — 기본(#FAFAFA) · watch(앰버 틴트) · risk(적색 틴트) */
export const Levels = () => (
  <div style={{ width: 260, display: 'flex', flexDirection: 'column', gap: 8 }}>
    <Pred label="AOI 오판정 예상" value="0.8" unit="%" ci="정상 범위" />
    <Pred level="watch" label="Plating 두께 하한 근접" value="12.1" unit="µm" ci="하한 12.0 · 관찰 필요" />
    <Pred level="risk" label="PR-03 치수 불량 예측" value="4.6" unit="%" ci="목표 2.0% 초과 · 점검 권장" />
  </div>
);

/** children — 신뢰도 태그와 추세를 카드 안에 함께 둡니다 */
export const WithMeta = () => (
  <div style={{ width: 240 }}>
    <Pred label="주간 수율 예측" value="97.1" unit="%" ci="95% 구간 96.4 – 97.8%">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
        <ConfTag value={0.87} />
        <Drift value={-0.3} invert />
      </div>
    </Pred>
  </div>
);

/** 단위 없이 — 건수·시간 같은 정수 예측 */
export const NoUnit = () => (
  <div style={{ width: 220 }}>
    <Pred level="watch" label="금일 예상 알림" value="7건" ci="전일 4건 · 최근 7일 평균 5.2건" />
  </div>
);
