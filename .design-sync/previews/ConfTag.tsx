import './_rnw';
import React from 'react';
import { ConfTag, Pred } from 'dwje-ax-web';

/** 신뢰도 값 — 0~1 을 받아 % 로 반올림 표기 */
export const Values = () => (
  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
    <ConfTag value={0.94} />
    <ConfTag value={0.873} />
    <ConfTag value={0.62} />
    <ConfTag value={0.41} />
  </div>
);

/** 예측 카드 안에서 — 신뢰 구간 아래 한 줄 */
export const InPred = () => (
  <div style={{ width: 220 }}>
    <Pred label="다음 로트 수율 예측" value="97.6" unit="%" ci="95% 구간 97.0 – 98.2%">
      <div style={{ marginTop: 10, display: 'flex' }}>
        <ConfTag value={0.91} />
      </div>
    </Pred>
  </div>
);

/** 문장 옆 — AI 브리핑 문구 뒤에 근거 신뢰도로 */
export const Inline = () => (
  <div style={{ width: 280, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
    <span style={{ fontSize: 12.5, lineHeight: '19px', fontWeight: 500, color: '#3C3C3C' }}>PR-03 금형 마모 징후 감지</span>
    <ConfTag value={0.78} />
  </div>
);
