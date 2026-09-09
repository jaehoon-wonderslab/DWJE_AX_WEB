import './_rnw';
import React from 'react';
import { KeyValue, StateBadge, Badge } from 'dwje-ax-web';

/** 상세 모달의 "항목 : 값" 표 */
export const Basic = () => (
  <div style={{ width: 380 }}>
    <KeyValue rows={[['설비', 'PR-03'], ['모델', 'Krios_s'], ['담당', '이재훈 (생산1팀)'], ['교체 시각', '2026-09-09 08:12'], ['비고', '금형 교체 후 첫 로트. 치수 편차 모니터링 중.']]} />
  </div>
);

/** 값 자리에 배지 같은 노드도 들어갑니다 */
export const WithNodes = () => (
  <div style={{ width: 380 }}>
    <KeyValue
      rows={[
        ['상태', <StateBadge state="가동" />],
        ['판정', <Badge tone="amber">재검 필요</Badge>],
        ['LOT', 'L260909-0412'],
        ['수량', '2,400 EA'],
      ]}
    />
  </div>
);

/** 키 폭을 좁게 — 짧은 라벨용 */
export const NarrowKeys = () => (
  <div style={{ width: 300 }}>
    <KeyValue keyWidth={72} rows={[['공정', 'Plating'], ['라인', 'PL-01'], ['두께', '12.4 µm'], ['하한', '12.0 µm']]} />
  </div>
);
