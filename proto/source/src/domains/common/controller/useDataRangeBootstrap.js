/**
 * [Controller] 실적 보유 기간 초기화
 *
 * 업무 화면 레이아웃에서 한 번만 호출합니다. 로그인 후 1회 호출로 끝나고(약 20ms),
 * 받은 기간을 전역 스토어에 넣어 모든 화면의 날짜 선택기 기본값·선택 범위로 씁니다.
 *
 * 조회에 실패해도 화면을 막지 않습니다. 오늘 날짜로 물러서고 안내만 띄웁니다.
 */
import { useEffect, useState } from 'react';
import { useAppStore } from '@shared/stores/useAppStore';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { fetchDataRange } from '../model/dataRangeRepository';

export function useDataRangeBootstrap() {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const dataRange = useAppStore((state) => state.dataRange);
  const setDataRange = useAppStore((state) => state.setDataRange);
  const [ready, setReady] = useState(!!dataRange);

  useEffect(() => {
    if (!isLoggedIn || dataRange) {
      if (isLoggedIn && dataRange) setReady(true);
      return undefined;
    }

    let alive = true;
    (async () => {
      const res = await fetchDataRange();
      if (!alive) return;
      if (res.ok) {
        setDataRange(res.range);
      } else {
        // 기간을 모르면 오늘로 물러섭니다 — 실적이 없어 0 으로 보일 수 있음을 알립니다
        setDataRange(null);
        useUiStore.getState().toast(`${res.message} 오늘 날짜를 기준으로 표시합니다.`);
      }
      setReady(true);
    })();

    return () => {
      alive = false;
    };
  }, [isLoggedIn, dataRange, setDataRange]);

  return { ready };
}
