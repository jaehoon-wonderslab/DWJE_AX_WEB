/**
 * 리포지토리 전용 호출 헬퍼
 *
 * 서비스 함수는 표준 응답(ApiResponse)을 그대로 돌려줍니다.
 * 리포지토리는 이 헬퍼로 "성공하면 data, 실패하면 throw" 형태로 바꿔
 * 도메인 코드가 success 분기를 매번 쓰지 않도록 합니다.
 */

/**
 * 조회용 — 성공 시 data 를 반환하고 실패 시 예외를 던집니다.
 *
 * @param {Promise<object>} promise 서비스 함수 호출 결과
 * @param {*} [fallback] 응답 data 가 비어 있을 때 쓸 기본값
 */
export async function unwrap(promise, fallback = null) {
  const res = await promise;
  if (!res?.success) {
    const error = new Error(res?.message || '조회에 실패했습니다.');
    error.code = res?.code;
    error.response = res;
    throw error;
  }
  return res.data ?? fallback;
}

/**
 * 등록·수정·삭제용 — 성공 여부와 메시지를 함께 돌려줍니다. (예외를 던지지 않음)
 *
 * @param {Promise<object>} promise 서비스 함수 호출 결과
 * @returns {Promise<{ ok: boolean, data: *, message: string, code: string }>}
 */
export async function command(promise) {
  const res = await promise;
  return { ok: !!res?.success, data: res?.data ?? null, message: res?.message || '', code: res?.code };
}

/**
 * 목록 조회 — 항목과 페이지 정보를 함께 돌려줍니다.
 *
 * `unwrap()` 은 `data` 만 꺼내므로 페이지 정보(`meta`)가 사라집니다.
 * 목록 화면은 "전체 몇 건 중 몇 번째 쪽인가" 를 알아야 하므로 이 헬퍼를 씁니다.
 *
 * @param {Promise<object>} promise 서비스 함수 호출 결과
 * @param {string} [listKey] 응답 data 안에서 목록이 담긴 키
 * @returns {Promise<{items:Array, meta:{page,size,total,totalPages}}>}
 */
export async function unwrapPaged(promise, listKey = 'items') {
  const res = await promise;
  if (!res?.success) {
    const error = new Error(res?.message || '조회에 실패했습니다.');
    error.code = res?.code;
    error.response = res;
    throw error;
  }
  const items = res.data?.[listKey] || [];
  const meta = res.meta || null;
  return {
    items,
    // 서버가 페이지 정보를 주지 않으면 "한 쪽에 전부" 로 봅니다
    meta: meta || { page: 1, size: items.length, total: items.length, totalPages: items.length ? 1 : 0 },
    data: res.data,
  };
}

/**
 * 여러 조회를 한 번에 실행합니다. (대시보드처럼 카드마다 API 가 다른 화면용)
 *
 * 한 카드가 실패해도 나머지는 그리도록 실패는 `null` 로 받습니다.
 * 다만 조용히 비면 사용자가 원인을 알 수 없으므로, 실패 내용을 `errors` 에 모아 함께 돌려줍니다.
 * 화면은 `firstError()` 로 대표 오류 하나를 꺼내 안내하면 됩니다.
 *
 * 목록 응답의 페이지 정보(`meta`)도 `metas` 에 함께 모읍니다.
 * 이게 없으면 "1,331건 중 50건" 이라는 사실을 화면이 알 수 없어 조용히 잘린 목록을 보여 줍니다.
 *
 * @param {object} spec { key: Promise }
 * @returns {Promise<object>} { key: data, errors: {key:{code,message}}, metas: {key:meta} }
 */
export async function unwrapAll(spec) {
  const keys = Object.keys(spec);
  const errors = {};
  const metas = {};
  const results = await Promise.all(
    keys.map((k) =>
      spec[k]
        .then((res) => {
          if (!res?.success) {
            const e = new Error(res?.message || '조회에 실패했습니다.');
            e.code = res?.code;
            throw e;
          }
          if (res.meta) metas[k] = res.meta;
          return res.data ?? null;
        })
        .catch((e) => {
          errors[k] = { code: e?.code, message: e?.message };
          return null;
        })
    )
  );
  const out = { errors, metas };
  keys.forEach((k, i) => {
    out[k] = results[i];
  });
  return out;
}

/**
 * `unwrapAll` 결과에서 사용자에게 보여 줄 대표 오류 하나를 고릅니다.
 *
 * 데이터가 없어서 비는 것과 조회가 막혀서 비는 것을 화면이 구분할 수 있게 합니다.
 *
 * @param {object} data unwrapAll 결과
 * @returns {{code?:string, message:string}|null}
 */
export function firstError(data) {
  const entries = Object.values(data?.errors || {});
  if (!entries.length) return null;
  // 권한·대상 없음처럼 원인이 분명한 것을 먼저 보여 줍니다
  const ranked = ['E-AUTH-002', 'E-NOTFOUND', 'E-VALID-001', 'E-TIMEOUT'];
  return entries.slice().sort((a, b) => {
    const ai = ranked.indexOf(a.code); const bi = ranked.indexOf(b.code);
    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
  })[0];
}

/** 쪽마다 받는 최대 행 수 — 서버 PageRequestParam 상한(1,000)과 같습니다 */
export const MAX_PAGE_SIZE = 1000;

/**
 * 쪽 나눔 목록 API 를 끝 쪽까지 불러 한 응답으로 합칩니다(2026-10-04).
 *
 * 표의 머리글 필터는 받은 행 안에서만 거르므로, 서버 쪽 나눔을 쓰면 다른 쪽 행이 검색되지 않습니다.
 * 수백~수천 건인 목록은 전부 받아 표가 쪽을 나눕니다. size=0(전량)을 받지 않는 API 도 있어 상한 크기로 쪽을 돕니다.
 *
 * @param {(params:object) => Promise<object>} fetchPage 서비스 함수 (예: systemService.getGlossaryTerms)
 * @param {object} [params] 쪽 밖의 조건
 * @param {string} [itemsKey] data 안의 목록 키
 * @returns {Promise<object>} 첫 응답과 같은 모양 — data[itemsKey] 전체, meta.total
 */
export async function fetchAllPages(fetchPage, params = {}, itemsKey = 'items') {
  const first = await fetchPage({ ...params, page: 1, size: MAX_PAGE_SIZE });
  if (!first?.success) return first;
  let items = first.data?.[itemsKey] || [];
  const pages = first.meta?.totalPages || 1;
  for (let page = 2; page <= pages; page += 1) {
    // eslint-disable-next-line no-await-in-loop
    const res = await fetchPage({ ...params, page, size: MAX_PAGE_SIZE });
    if (!res?.success) return res;
    items = items.concat(res.data?.[itemsKey] || []);
  }
  return { ...first, data: { ...first.data, [itemsKey]: items }, meta: { ...first.meta, page: 1, size: items.length, totalPages: 1, total: first.meta?.total ?? items.length } };
}
