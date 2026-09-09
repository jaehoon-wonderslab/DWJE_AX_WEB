import './_rnw';
import React, { useEffect } from 'react';
import { ToastHost, useUiStore } from 'dwje-ax-web';

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
 * 토스트는 호스트가 있는 영역의 우하단(right 24 · bottom 24)에 뜹니다.
 * 앱에서는 최상위에 한 번 두고 `useUiStore.getState().toast('문구')` 로 띄웁니다(2.2초 후 사라짐).
 * 미리보기는 자동 닫힘 없이 보이도록 스토어 상태를 직접 세팅합니다.
 */
const Stage = ({ message, children }: { message: string; children?: React.ReactNode }) => {
  useEffect(() => {
    useUiStore.setState({ toastMessage: message, toastVisible: true });
    return () => useUiStore.setState({ toastMessage: '', toastVisible: false });
  }, [message]);
  return (
    <div style={{ position: 'relative', width: 560, height: 220, background: '#F4F5F6', borderRadius: 24, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 20, left: 20, right: 20, height: 12, background: '#fff', borderRadius: 999, opacity: 0.9 }} />
      <div style={{ position: 'absolute', top: 48, left: 20, width: 220, height: 96, background: '#fff', borderRadius: 16, opacity: 0.9 }} />
      <div style={{ position: 'absolute', top: 48, left: 256, right: 20, height: 96, background: '#fff', borderRadius: 16, opacity: 0.9 }} />
      {children}
      <ToastHost />
    </div>
  );
};

/** 저장 완료 — 잉크 네이비 알약 · 흰 글자 12.5px 500 */
export const Saved = () => <Stage message="PR-03 점검 기준을 저장했습니다." />;

/** 긴 문구 — maxWidth 460 안에서 줄바꿈 */
export const LongMessage = () => (
  <Stage message="LOT L260909-0412 재검 요청을 품질보증팀에 전달했습니다. 결과는 이상 알림에서 확인할 수 있습니다." />
);
