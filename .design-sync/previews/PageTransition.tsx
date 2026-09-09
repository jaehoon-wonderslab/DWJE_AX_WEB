import './_rnw';
import React from 'react';
import { PageTransition, Card, KeyValue, StateBadge } from 'dwje-ax-web';

const Sample = () => (
  <Card title="PR-03 설비 상세" sub="PRESS · Krios_s">
    <KeyValue keyWidth={72} rows={[['상태', <StateBadge state="가동" />], ['LOT', 'L260909-0412'], ['수율', '97.4%']]} />
  </Card>
);

/** 기본 — routeKey 가 바뀌면 본문이 아래에서 10px 떠오르며 나타납니다(280ms). 완료 후 정지 상태 */
export const Basic = () => (
  <div style={{ display: 'flex', width: 300 }}>
    <PageTransition routeKey="/equipment/PR-03">
      <Sample />
    </PageTransition>
  </div>
);

/** 느리고 크게 — distance 24 · duration 900. 캡처 시점에 따라 진행 중 프레임이 잡힐 수 있습니다 */
export const SlowLong = () => (
  <div style={{ display: 'flex', width: 300 }}>
    <PageTransition routeKey="/equipment/PL-01" distance={24} duration={900}>
      <Sample />
    </PageTransition>
  </div>
);
