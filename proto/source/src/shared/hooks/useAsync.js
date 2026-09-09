/**
 * 비동기 데이터 조회 훅 (Controller ↔ Model 연결)
 *
 * 컨트롤러는 이 훅으로 리포지토리(Model)를 호출합니다.
 * 반복되는 "로딩 켜기 → 호출 → 성공/실패 → 로딩 끄기" 흐름을 한 곳에 모았습니다.
 *
 * 사용 예)
 *   const { data, loading, reload } = useAsync(
 *     () => dashboardRepository.loadAiDashboard(date),
 *     [date],
 *   );
 *
 * @param {Function} loader 리포지토리 호출 함수 (Promise 를 반환)
 * @param {Array} deps 값이 바뀌면 다시 조회할 의존성 배열
 * @param {object} options { skip, initialData, silent }
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useUiStore } from '@shared/stores/useUiStore';

export function useAsync(loader, deps = [], options = {}) {
  const { skip = false, initialData = null, silent = false } = options;

  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(!skip);
  const [error, setError] = useState(null);

  const mounted = useRef(true);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  /**
   * 몇 번째 조회인지 — **뒤늦게 온 앞 요청이 새 결과를 덮지 않도록** 셉니다
   *
   * AI 통합 대시보드에서 집계 단위를 바꿨을 때 드러났습니다. 첫 화면이 7일치 브리핑을
   * 부르는 중에 월별로 바꾸면 3개월치를 새로 부르는데, 모델이 한 번에 하나씩 처리하므로
   * 7일치가 먼저(50초) 도착합니다. 그때 `setData(7일치)` 가 실행되고 `loading` 까지
   * 꺼져서, 화면은 "8월 29일 ~ 9월 4일 분석" 을 다 된 결과인 양 보여 줬습니다.
   * 필터는 7월~9월인데 카드는 7일치라, 단위를 바꿔도 안 바뀌는 것처럼 보였습니다.
   */
  const seq = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async () => {
    if (skip) {
      setLoading(false);
      return;
    }
    seq.current += 1;
    const mine = seq.current;
    const latest = () => mounted.current && mine === seq.current;

    setLoading(true);
    setError(null);
    try {
      const result = await loaderRef.current();
      if (!latest()) return;
      setData(result);
    } catch (e) {
      if (!latest()) return;
      setError(e);
      if (!silent) useUiStore.getState().toast(e?.message || '조회 중 오류가 발생했습니다');
    } finally {
      // 지나간 조회가 끝났다고 로딩을 끄면, 아직 오지 않은 새 결과를 다 된 것처럼 보입니다
      if (latest()) setLoading(false);
    }
    // deps 는 호출하는 쪽이 관리합니다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip, silent, ...deps]);

  useEffect(() => {
    run();
  }, [run]);

  return { data, loading, error, reload: run, setData };
}

/**
 * 등록·수정·삭제처럼 사용자가 실행하는 동작을 감쌉니다.
 * 성공 메시지 토스트와 후처리(reload)를 한 줄로 묶습니다.
 *
 * 사용 예)
 *   const submit = useAsyncAction(
 *     (values) => productionRepository.registerDowntime(values),
 *     { onSuccess: reload },
 *   );
 */
export function useAsyncAction(action, options = {}) {
  const { onSuccess, silent = false } = options;
  const [pending, setPending] = useState(false);

  const run = useCallback(
    async (...args) => {
      setPending(true);
      try {
        const result = await action(...args);
        if (!silent && result?.message) useUiStore.getState().toast(result.message);
        if (result?.ok !== false) await onSuccess?.(result);
        return result;
      } catch (e) {
        useUiStore.getState().toast(e?.message || '처리 중 오류가 발생했습니다');
        return { ok: false, message: e?.message };
      } finally {
        setPending(false);
      }
    },
    [action, onSuccess, silent]
  );

  return Object.assign(run, { pending });
}
