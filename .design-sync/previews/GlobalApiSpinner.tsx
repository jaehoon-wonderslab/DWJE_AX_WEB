import './_rnw';
import React, { useEffect } from 'react';
import { GlobalApiSpinner, useUiStore } from 'dwje-ax-web';

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

/**
 * 전역 API 로딩 표시 — useUiStore.apiLoadingCount > 0 인 동안 화면 최상단 2px 진행선과
 * 우상단(top 92 · right 36) "데이터 처리 중" 알약이 뜹니다. App 최상위에 한 번만 둡니다.
 * 미리보기는 마운트 때 startApiLoading() 을 불러 표시 상태를 만듭니다.
 */
export const Active = () => {
  useEffect(() => {
    useUiStore.getState().startApiLoading();
    return () => useUiStore.getState().endApiLoading();
  }, []);
  return (
    <div style={{ position: 'relative', width: 860, height: 300, background: '#F4F5F6', borderRadius: 24, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 24, left: 24, fontSize: 21, fontWeight: 600, letterSpacing: -0.42, color: '#0B1440' }}>공정 모니터링</div>
      <div style={{ position: 'absolute', top: 58, left: 24, fontSize: 12.5, fontWeight: 500, color: '#787878' }}>PRESS · Plating · Coating · AOI</div>
      <div style={{ position: 'absolute', top: 120, left: 24, right: 24, height: 150, background: '#fff', borderRadius: 16, opacity: 0.9 }} />
      <GlobalApiSpinner />
    </div>
  );
};
