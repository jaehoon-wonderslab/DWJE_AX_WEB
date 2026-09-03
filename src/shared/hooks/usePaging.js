/**
 * 목록 페이지 상태
 *
 * 목록 화면이 공통으로 쓰는 "몇 쪽 · 한 쪽에 몇 건" 상태입니다.
 * 조회 조건이 바뀌면 1쪽으로 돌아가야 합니다 — 3쪽을 보다가 조건을 바꾸면
 * 결과가 3쪽보다 짧아 빈 화면이 나오기 때문입니다. `resetKey` 가 그 일을 합니다.
 *
 * 사용 예)
 *   const paging = usePaging({ resetKey: `${from}|${to}` });
 *   const { data } = useAsync(() => repo.loadLogs({ from, to, ...paging.params }), [from, to, paging.page, paging.size]);
 *   ...
 *   <Pagination meta={data?.meta} {...paging.bind} />
 */
import { useCallback, useEffect, useState } from 'react';

/** 한 쪽에 보여 줄 건수 선택지 */
export const PAGE_SIZES = [25, 50, 100, 200];

/**
 * @param {object} [opts]
 * @param {number} [opts.size] 처음 한 쪽 건수 (기본 50 — 서버 기본값과 같게 둡니다)
 * @param {string} [opts.resetKey] 이 값이 바뀌면 1쪽으로 돌아갑니다 (조회 조건을 이어 붙이세요)
 */
export function usePaging({ size: initialSize = 50, resetKey = '' } = {}) {
  const [page, setPage] = useState(1);
  const [size, setSizeState] = useState(initialSize);

  // 조회 조건이 바뀌면 1쪽으로
  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  const setSize = useCallback((next) => {
    setSizeState(next);
    setPage(1); // 쪽 크기가 바뀌면 쪽 번호의 의미도 달라집니다
  }, []);

  const reset = useCallback(() => {
    setPage(1);
  }, []);

  return {
    page,
    size,
    setPage,
    setSize,
    reset,
    /** 리포지토리에 그대로 넘기는 요청 파라미터 */
    params: { page, size },
    /** <Pagination> 에 그대로 펼쳐 넣는 값 */
    bind: { page, size, onPage: setPage, onSize: setSize },
  };
}
