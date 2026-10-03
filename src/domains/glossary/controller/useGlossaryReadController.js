/**
 * [Controller] 용어 사전 조회 (GL-01 · gloss-view)
 *
 * 공식 용어와 현장 유사어를 찾아보기만 하는 화면입니다(결정 R-09). 쓰기 동작은 없습니다.
 *
 *  · 검색은 입력을 멈추고 400ms 뒤 한 번 보냅니다. Enter·조회 단추는 바로 보냅니다.
 *  · 제거됨(2026-10-03, 분류 삭제): 분류 선택·분류 칩·엑셀의 분류 열. 검색어를 바꾸면 1쪽으로 돌아갑니다.
 *  · 고른 용어는 주소(?term=)에 남겨 새로 고침·공유에도 같은 상세가 열립니다.
 *  · 엑셀은 「조회 목록(현재 쪽)」 과 「전체」 두 가지입니다(공통 CMN-07).
 *    전체는 서버가 만든 파일을 받고, 서버 내려받기가 아직 없으면 전체 조회(size=0)로 브라우저에서 만듭니다.
 *  · 「용어 사전 관리로 이동」 은 sys-gloss 쓰기 권한자에게만 보입니다(GLV-09).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAsync } from '@shared/hooks/useAsync';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadFromServer, downloadXls } from '@shared/utils/exportUtil';
import * as repo from '../model/glossaryRepository';

/** 검색 입력이 멈춘 뒤 요청까지 기다리는 시간 */
const SEARCH_DEBOUNCE_MS = 400;
/** 「전체 다운로드」 상한 (기획 GLV-13) */
const EXPORT_ALL_LIMIT = 5000;
/** 엑셀 열 — 응답 필드명(attrs)과 같은 순서입니다. 마스킹 판정에 씁니다 */
const EXPORT_HEAD = ['공식 용어', '뜻', '유사어'];
const EXPORT_ATTRS = ['term', 'definition', 'variants'];

/** 데이터 접근 권한으로 가려진 용어(GLV-08 — blinded)는 뜻·유사어를 「비공개」 로 채웁니다(R-10) */
const toRow = (t) => (t.blinded
  ? ['비공개 용어', '비공개', '비공개']
  : [t.term, t.definition, (t.variants || []).map((v) => v.word).join(' · ')]);
const blindOf = (list) => list.filter((t) => t.blinded).length;
const AREA_LABEL = { summary: '요약', terms: '용어 목록' };

export function useGlossaryReadController() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const toast = useUiStore((state) => state.toast);
  const canWrite = useAuthStore((state) => state.canWrite);
  const can = useAuthStore((state) => state.can);

  // 검색어 — 입력값과 실제 조회에 쓰는 값을 나눕니다(입력 중 깜빡임 방지)
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const timer = useRef(null);

  const changeKeyword = useCallback((v) => {
    setKeywordInput(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setKeyword(v.trim()), SEARCH_DEBOUNCE_MS);
  }, []);
  const search = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setKeyword(keywordInput.trim());
  }, [keywordInput]);
  useEffect(() => () => timer.current && clearTimeout(timer.current), []);

  const { data, loading, reload } = useAsync(
    // 용어는 전부 받고 표가 쪽을 나눕니다(2026-10-04)
    () => repo.loadGlossaryRead({ keyword }),
    [keyword]
  );

  const terms = data?.terms?.items || [];
  const summary = data?.summary || null;

  // ── 상세 ───────────────────────────────────────────────
  const selectedId = typeof params?.term === 'string' && params.term ? params.term : '';
  const [detail, setDetail] = useState(null);
  const [detailError, setDetailError] = useState('');

  useEffect(() => {
    let alive = true;
    if (!selectedId) {
      setDetail(null);
      setDetailError('');
      return undefined;
    }
    // 목록에 있는 값을 먼저 보여 주고, 상세 API 로 관련 용어까지 채웁니다
    const fromList = terms.find((t) => String(t.termId) === String(selectedId));
    if (fromList) setDetail({ ...fromList, relatedTerms: fromList.relatedTerms || [] });
    repo.fetchTermDetail(selectedId)
      .then((d) => {
        if (!alive) return;
        if (d) { setDetail(d); setDetailError(''); }
      })
      .catch((e) => {
        if (!alive) return;
        // 상세 API 가 아직 없으면(404 아닌 오류) 목록 값으로 둡니다. 없는 용어면 안내합니다
        if (e?.code === 'E-NOTFOUND' && !fromList) {
          setDetail(null);
          setDetailError('용어를 찾을 수 없습니다(삭제되었을 수 있습니다). 목록에서 다시 고르세요.');
        }
      });
    return () => { alive = false; };
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const openTerm = useCallback((termId) => router.setParams({ term: termId ? String(termId) : '' }), [router]);
  const closeTerm = useCallback(() => router.setParams({ term: '' }), [router]);

  // ── 엑셀 (조회 목록 / 전체) ─────────────────────────────
  const condSummary = useMemo(
    () => [`검색=${keyword || '없음'}`].join(', '),
    [keyword]
  );

  const exportView = useCallback(async () => {
    downloadXls({
      name: '용어 사전',
      head: EXPORT_HEAD,
      attrs: EXPORT_ATTRS,
      rows: terms.map(toRow),
      blindCount: blindOf(terms),
      scope: 'VIEW',
      condSummary,
      menuId: 'gloss-view',
    });
  }, [terms, condSummary]);

  const exportAll = useCallback(async () => {
    // 서버가 만든 파일(전량, 이력은 서버가 기록) — 2026-10-01 신규 API
    const ok = await downloadFromServer({
      path: '/glossary/terms/export',
      body: { scope: 'ALL', menuId: 'gloss-view', condSummary: '전체(조건 무시)', format: 'xlsx' },
      name: '용어 사전',
    });
    if (ok) return;
    // 서버 내려받기가 아직 없으면 전체 조회로 브라우저에서 만듭니다
    try {
      const all = await repo.loadAllTerms();
      if (all.length > EXPORT_ALL_LIMIT) toast(`상한 ${EXPORT_ALL_LIMIT.toLocaleString('ko-KR')}건까지 내려받았습니다`);
      downloadXls({
        name: '용어 사전',
        head: EXPORT_HEAD,
        attrs: EXPORT_ATTRS,
        rows: all.slice(0, EXPORT_ALL_LIMIT).map(toRow),
        blindCount: blindOf(all.slice(0, EXPORT_ALL_LIMIT)),
        scope: 'ALL',
        condSummary: '전체(조건 무시)',
        menuId: 'gloss-view',
      });
    } catch (e) {
      toast(e?.message || '용어 사전을 내려받지 못했습니다');
    }
  }, [toast]);

  return {
    loading,
    /** 첫 조회만 화면 전체 Loading — 재조회는 표·필터를 그대로 두고 카드에만 표시합니다 */
    initialLoading: loading && !data,
    refreshing: loading && !!data,
    loadError: data?.errors?.terms || null,
    // 영역별 조회 실패 — 카드 위 한 줄 안내(「{영역}을 불러오지 못했습니다 — {message}」)
    loadErrors: Object.entries(data?.errors || {}).map(([k, e]) => `${AREA_LABEL[k] || k}을(를) 불러오지 못했습니다 — ${e?.message || '알 수 없는 오류'}`),
    summaryFailed: !!data?.errors?.summary,
    summary,
    terms,
    itemsMeta: data?.termsMeta,
    filters: { keyword: keywordInput, appliedKeyword: keyword },
    setKeyword: changeKeyword,
    search,
    reload,
    detail,
    detailError,
    selectedId,
    openTerm,
    closeTerm,
    exportView,
    exportAll,
    // 관리 화면 바로가기 — sys-gloss 화면과 쓰기 권한이 모두 있어야 보입니다
    canManage: can('sys-gloss') && canWrite('sys-gloss'),
    goManage: (term) => router.push({ pathname: '/system/glossary', params: term ? { keyword: term } : {} }),
  };
}
