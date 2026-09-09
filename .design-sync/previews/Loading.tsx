import './_rnw';
import React from 'react';
import { Loading, Card } from 'dwje-ax-web';

// 미리보기 전용 보정 2가지 (컴포넌트 소스가 아니라 실행 환경 문제):
// 1) ds 번들에는 Metro 와 달리 `global` 이 없어 RN Animated 가 stop() 에서 ReferenceError 를 냅니다.
// 2) 캡처 하네스가 Date.now 를 고정하면 Animated(Date.now 기반)가 첫 프레임에 멈춥니다 — 고정된 동안만 호출마다 16ms 전진.
(globalThis as any).global ??= globalThis;
const __realNow = Date.now.bind(Date);
let __prev = 0;
let __last = 0;
Date.now = () => {
  const t = __realNow();
  __last = t > __last ? t : t === __prev ? __last + 16 : __last;
  __prev = t;
  return __last;
};

/** 기본 — 세 점(잉크·앰버·회색)이 차례로 숨 쉬는 브랜드 모티프 + 안내 문구 · 세로 여백 48 */
export const Default = () => (
  <div style={{ width: 300 }}>
    <Loading />
  </div>
);

/** compact — 세로 여백 18 · 점 6px. 카드 안 작은 영역용 */
export const Compact = () => (
  <div style={{ width: 300 }}>
    <Card title="공정별 수율" sub="오늘 · 목표 97.0%">
      <Loading compact text="MES 실적을 집계하고 있습니다…" />
    </Card>
  </div>
);

/** 문구 없이 — text="" 로 점만 남깁니다 */
export const DotsOnly = () => (
  <div style={{ width: 300 }}>
    <Loading compact text="" />
  </div>
);
