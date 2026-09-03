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
    setLoading(true);
    setError(null);
    try {
      const result = await loaderRef.current();
      if (!mounted.current) return;
      setData(result);
    } catch (e) {
      if (!mounted.current) return;
      setError(e);
      if (!silent) useUiStore.getState().toast(e?.message || '조회 중 오류가 발생했습니다');
    } finally {
      if (mounted.current) setLoading(false);
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
