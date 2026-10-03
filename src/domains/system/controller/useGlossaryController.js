/**
 * [Controller] SY-06 용어 사전 관리 (화면 ID sys-gloss)
 *
 * [권한] 공식 용어는 통합관리자만 편집합니다(서버도 403 E-AUTH-004 로 막습니다 — 07 GLS-01).
 *        유사어는 이 화면의 쓰기 권한(can_write)이 있으면 등록하고, 본인이 등록한 것만 수정·삭제합니다(07 GLS-16).
 *        쓰기 권한 판정은 서버 요약의 canWriteVariant 를 먼저 보고, 없으면 접근 권한 · 미배정 여부(canWrite)로 대신합니다.
 *
 *  · 검색은 입력값(keywordInput)과 조회값(keyword)을 나눕니다. Enter · 조회 · 입력 멈춤 400ms 로 확정합니다(07 GLS-09).
 *  · 주소의 ?keyword= 를 첫 검색어로 받습니다 — 용어 사전 조회(13 GLV-09)의 「관리 화면에서 편집」 링크가 씁니다.
 *  · 엑셀은 공통 옵션 패널입니다(07 GLS-18). 조회 목록 = 그리드에 보이는 행(정렬·열 순서 그대로),
 *    전체 = 서버 생성 파일(조건 무시). 서버 내려받기가 아직 없으면 전체 조회(size=0)로 대신 만듭니다.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useAsync } from '@shared/hooks/useAsync';
import { usePaging } from '@shared/hooks/usePaging';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadFromServer, downloadXls } from '@shared/utils/exportUtil';
import * as repo from '../model/systemRepository';

const SAMPLE = '어제 캔 라인에서 찍힘 불량 나서 파카 써야 함. 쉴드캔 외관도 확인 필요';
/** 화면 ID — 메뉴·권한·내려받기 이력에 같은 값을 씁니다 */
const SCREEN_ID = 'sys-gloss';
/** 검색 입력이 멈춘 뒤 요청까지 기다리는 시간 */
const SEARCH_DEBOUNCE_MS = 400;
/** 「전체 다운로드」 상한 (07 GLS-18) */
const EXPORT_ALL_LIMIT = 5000;
/** 쓰기 권한이 없을 때 버튼 옆에 띄우는 안내 (공통 R-06) */
export const NO_WRITE_MESSAGE = '미배정 계정은 이 동작을 할 수 없습니다. 전산팀에 부서 배정을 요청하세요.';
/** 고객사 데이터 권한이 없어 가린 용어(blinded)의 버튼 안내 (공통 11.2 결정 R-18 · 13 GLV-08) */
export const BLIND_MESSAGE = '고객사 데이터 권한이 없어 볼 수 없는 용어입니다';
/** 공식 용어 쓰기가 403 일 때 (07 GLS-01) */
const TERM_ADMIN_ONLY = '공식 용어는 통합관리자만 편집할 수 있습니다.';

/** 엑셀 열 — 그리드 열(field) → 머리글. 등록자는 그리드 열이 아니라 맨 뒤에 붙입니다 */
const EXPORT_COLS = { term: '공식 용어', definition: '뜻', domain: '분류', variants: '유사어' };
const EXPORT_ORDER = ['term', 'definition', 'domain', 'variants'];
const AREA_LABEL = { summary: '요약', terms: '용어 목록', domains: '분류' };

export function useGlossaryController() {
  const toast = useUiStore((state) => state.toast);
  const me = useAuthStore((state) => state.userInfo);
  const canWriteScreen = useAuthStore((state) => state.canWrite(SCREEN_ID));
  const params = useLocalSearchParams();
  const paramKeyword = typeof params?.keyword === 'string' ? params.keyword : '';

  // 검색어 — 입력 중 깜빡임을 막으려고 입력값과 조회값을 나눕니다
  const [keywordInput, setKeywordInput] = useState(paramKeyword);
  const [keyword, setKeyword] = useState(paramKeyword.trim());
  const [domain, setDomain] = useState('전체');
  const [mineOnly, setMineOnly] = useState(false);
  const [sample, setSample] = useState(SAMPLE);
  const [normalized, setNormalized] = useState(null);
  const timer = useRef(null);
  /** 그리드 인스턴스 — 「조회 목록 다운로드」 가 정렬·필터 결과를 그대로 읽습니다 */
  const gridRef = useRef(null);

  // 다른 화면에서 ?keyword= 로 다시 들어오면 그 검색어로 바꿉니다
  useEffect(() => {
    if (!paramKeyword) return;
    setKeywordInput(paramKeyword);
    setKeyword(paramKeyword.trim());
  }, [paramKeyword]);
  useEffect(() => () => timer.current && clearTimeout(timer.current), []);

  const changeKeyword = useCallback((v) => {
    setKeywordInput(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setKeyword(String(v).trim()), SEARCH_DEBOUNCE_MS);
  }, []);

  const paging = usePaging({ resetKey: `${keyword}|${domain}|${mineOnly}` });
  const { data, loading, reload } = useAsync(
    // 분류 필터의 서버 키는 domainCd, '내 유사어만' 은 서버 필터 mineOnly 입니다(07 GLS-08)
    () => repo.loadGlossaryByDomain({ keyword, domainCd: domain, mineOnly, ...paging.params }),
    // 쪽을 넘겨도 다시 조회되도록 page · size 를 의존성에 둡니다
    [keyword, domain, mineOnly, paging.page, paging.size]
  );

  /** Enter · 조회 단추 — 입력값을 바로 확정합니다. 같은 검색어면 다시 조회합니다 */
  const search = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    const next = keywordInput.trim();
    if (next === keyword) reload();
    else setKeyword(next);
  }, [keywordInput, keyword, reload]);

  const summary = data?.summary || null;
  // 공식 용어 편집 권한 — 서버 canEditTerm 을 먼저, 없으면 통합관리자(superAdmin) 여부
  const canEditTerm = summary?.canEditTerm ?? !!me?.superAdmin;
  // 유사어 쓰기 권한 — 서버 canWriteVariant 를 먼저, 없으면 /auth/me 의 쓰기 권한(07 GLS-16)
  const canWriteVariant = summary?.canWriteVariant ?? canWriteScreen;

  // 점검 필요 유사어 (07 GLS-03) — 통합관리자에게만 불러옵니다
  const { data: risks, reload: reloadRisks } = useAsync(
    () => (canEditTerm ? repo.loadGlossaryRisks() : Promise.resolve([])),
    [canEditTerm],
    { silent: true, initialData: [] }
  );
  const riskList = Array.isArray(risks) ? risks : [];

  // 유사어 본인 여부 — 사번이 있으면 사번으로, 없으면 서버 editable 로 판정합니다
  // (쓰기 권한이 없으면 서버 editable 이 늘 false 라 「내 등록」 표시까지 사라지지 않게 나눕니다)
  const allTerms = (data?.terms?.items || []).map((t) => ({
    ...t,
    variants: (t.variants || []).map((v) => {
      const mine = v.mine ?? (v.byEmpNo && me?.empNo ? String(v.byEmpNo) === String(me.empNo) : !!v.editable);
      return { ...v, mine, editable: canWriteVariant && (v.editable ?? mine) };
    }),
  }));
  // '내가 등록한 유사어만' 은 서버가 거릅니다. 서버가 아직 거르지 않는 동안에도 같은 결과가 되도록 현재 쪽에서 한 번 더 거릅니다
  // (서버가 거른 뒤라면 빠지는 행이 없습니다)
  const terms = mineOnly ? allTerms.filter((t) => t.variants.some((v) => v.mine)) : allTerms;

  // 영역별 조회 실패 — 카드 위에 한 줄로 알립니다(07 GLS-09)
  const loadErrors = useMemo(
    () => Object.entries(data?.errors || {}).map(([k, e]) => `${AREA_LABEL[k] || k}을(를) 불러오지 못했습니다 — ${e?.message || '알 수 없는 오류'}`),
    [data]
  );

  const run = useCallback(
    async (fn, { term = false } = {}) => {
      const res = await fn();
      const warnings = res?.data?.warnings;
      if (!res.ok && term && (res.code === 'E-AUTH-004' || res.code === 'E-AUTH-002')) toast(TERM_ADMIN_ONLY);
      else toast(warnings?.length ? `${res.message} — ${warnings.join(' ')}` : res.message);
      if (res.ok) {
        reload();
        reloadRisks();
      }
      return res;
    },
    [toast, reload, reloadRisks]
  );

  /** 현장 표현을 공식 용어로 바꿔 봅니다 — 성공하면 결과만 보이고, 실패할 때만 알립니다 */
  const normalize = useCallback(async () => {
    const res = await repo.normalizeText(sample);
    if (res.ok) setNormalized(res.data);
    else toast(res.message);
  }, [sample, toast]);

  // ── 엑셀 (조회 목록 / 전체) ─────────────────────────────
  const condSummary = useMemo(
    () => [`검색=${keyword || '없음'}`, `분류=${domain}`, `내 유사어만=${mineOnly ? '예' : '아니오'}`, `쪽=${paging.page}`].join(', '),
    [keyword, domain, mineOnly, paging.page]
  );

  /** 그리드에 보이는 행과 열 순서 — 정렬·머리글 필터·열 이동 결과를 그대로 읽습니다 */
  const gridView = useCallback(() => {
    const table = gridRef.current;
    let rows = terms;
    let order = EXPORT_ORDER;
    try {
      const active = table?.getRows?.('active');
      if (Array.isArray(active)) rows = active.map((r) => r.getData());
      const fields = (table?.getColumns?.() || []).map((c) => c.getField()).filter((f) => EXPORT_COLS[f]);
      if (fields.length === EXPORT_ORDER.length) order = fields;
    } catch {
      /* 표가 아직 없으면 화면 데이터 그대로 */
    }
    return { rows, order };
  }, [terms]);

  const buildRows = (list, order) => {
    let blind = 0;
    const rows = list.map((t) => {
      // 데이터 접근 권한으로 가려진 용어(13 GLV-08) — 뜻·유사어를 「비공개」 로 채웁니다
      if (t.blinded) blind += 1;
      const cell = {
        term: t.blinded ? '비공개 용어' : t.term,
        definition: t.blinded ? '비공개' : t.definition,
        domain: t.domain,
        variants: t.blinded ? '비공개' : (t.variants || []).map((v) => v.word).join(' · '),
      };
      // 등록자는 이름만 넣습니다(사번 제외 — 07 4.6)
      const by = t.blinded ? '비공개' : (t.variants || []).map((v) => v.byName).filter(Boolean).join(' · ');
      return [...order.map((f) => cell[f]), by];
    });
    return { rows, blind };
  };

  const exportView = useCallback(async () => {
    const { rows: list, order } = gridView();
    const { rows, blind } = buildRows(list, order);
    downloadXls({
      name: '용어 사전',
      head: [...order.map((f) => EXPORT_COLS[f]), '등록자'],
      attrs: [...order, 'byName'],
      rows,
      blindCount: blind,
      scope: 'VIEW',
      condSummary,
      menuId: SCREEN_ID,
    });
  }, [gridView, condSummary]);

  const exportAll = useCallback(async () => {
    // 서버가 만든 파일 — 검색·분류·내 유사어만과 관계없이 사전 전체(상한 5,000). 이력은 서버가 기록합니다
    const ok = await downloadFromServer({
      path: '/glossary/terms/export',
      body: { scope: 'ALL', menuId: SCREEN_ID, condSummary: '전체(조건 무시)', format: 'xlsx' },
      name: '용어 사전',
      limit: EXPORT_ALL_LIMIT,
    });
    if (ok) return;
    // 서버 내려받기가 아직 없으면 전체 조회로 브라우저에서 만듭니다
    try {
      const all = await repo.loadAllGlossaryTerms();
      if (all.length > EXPORT_ALL_LIMIT) toast(`상한 ${EXPORT_ALL_LIMIT.toLocaleString('ko-KR')}건까지 내려받았습니다`);
      const { rows, blind } = buildRows(all.slice(0, EXPORT_ALL_LIMIT), EXPORT_ORDER);
      downloadXls({
        name: '용어 사전',
        head: [...EXPORT_ORDER.map((f) => EXPORT_COLS[f]), '등록자'],
        attrs: [...EXPORT_ORDER, 'byName'],
        rows,
        blindCount: blind,
        scope: 'ALL',
        condSummary: '전체(조건 무시)',
        menuId: SCREEN_ID,
      });
    } catch (e) {
      toast(e?.message || '용어 사전을 내려받지 못했습니다');
    }
  }, [toast]);

  // 기존 즉시 내려받기(현재 쪽 · attrs 없음)는 제거됨 — 2026-10 엑셀 옵션 패널(07 GLS-18)로 바꿨습니다

  return {
    paging,
    itemsMeta: data?.termsMeta,
    loading,
    /** 첫 조회 — 화면 전체 Loading. 재조회는 표를 그대로 두고 카드 안에만 표시합니다 */
    initialLoading: loading && !data,
    refreshing: loading && !!data,
    loadErrors,
    summary,
    summaryFailed: !!data?.errors?.summary,
    // 분류별 현황(07 GLS-13) — 용어 수 내림차순. 유사어 수·유사어 없음은 서버가 주면 씁니다
    byDomain: (summary?.byDomain || []).filter((d) => d?.domain).slice().sort((a, b) => (b.termCnt ?? 0) - (a.termCnt ?? 0)),
    terms,
    gridRef,
    canEditTerm,
    canWriteVariant,
    risks: riskList,
    riskCount: summary?.riskVariantCnt ?? riskList.length,
    // 분류는 기준정보(/glossary/domains)에서 받습니다
    domains: (data?.domains?.domains || []).map((d) => d.code).filter(Boolean),
    filters: { keyword: keywordInput, appliedKeyword: keyword, domain, mineOnly },
    setKeyword: changeKeyword,
    search,
    setDomain,
    setMineOnly,
    sample,
    setSample,
    normalized,
    normalize,
    reload,
    exportView,
    exportAll,
    exportViewCount: terms.length,
    /**
     * 공식 용어 등록·수정
     *
     * 삭제는 소프트 삭제라, 지웠던 이름으로 다시 등록하면 서버가 그 용어를 되살립니다.
     * 새로 만든 것과 되살아난 것은 사용자에게 다른 일이므로 구분해서 알려 줍니다.
     */
    submitTerm: async (termId, v) => {
      if (termId) return run(() => repo.updateTerm(termId, v), { term: true });
      const res = await run(() => repo.createTerm(v), { term: true });
      const { restored, restoredVariants } = res?.data || {};
      if (res?.ok && restored) {
        toast(restoredVariants
          ? `이전에 삭제한 용어를 되살렸습니다. 유사어 ${restoredVariants}개도 함께 돌아왔습니다.`
          : '이전에 삭제한 용어를 되살렸습니다.');
      }
      return res;
    },
    // 유사어 수정 요청 본문은 `word` 하나입니다 — 폼의 termId 를 같이 보내면 400(받지 않는 항목)이 납니다
    submitVariant: (variantId, v) => run(() => (variantId ? repo.updateVariant(variantId, { word: v.word }) : repo.createVariant(v.termId, v.word))),
    removeVariant: (variantId) => run(() => repo.deleteVariant(variantId)),
    removeTerm: (termId) => run(() => repo.deleteTerm(termId), { term: true }),
    /**
     * 사전 변경 이력 (07 GLS-07) — termId 가 있으면 그 용어, 없으면 최근 30일 전체.
     * 모달이 열릴 때 부릅니다. 실패하면 예외를 던져 모달이 안내합니다.
     */
    loadChanges: ({ termId, page = 1, size = 50 } = {}) => {
      const to = new Date();
      const from = new Date(to.getTime() - 30 * 86400000);
      const day = (d) => d.toISOString().slice(0, 10);
      return repo.loadGlossaryChanges(termId ? { termId, page, size } : { from: day(from), to: day(to), page, size });
    },
    /** 유사어 폼의 공식 용어 후보 — 2자 이상일 때만 서버에 묻습니다 (07 GLS-11) */
    searchTerms: async (keyword) => (String(keyword || '').trim().length >= 2 ? repo.searchGlossaryTerms(String(keyword).trim()) : []),
    /** 제거됨(2026-10, 처리기 없음 — 07 GLS-05): 화면 버튼을 걷어냈습니다. API 와 함수는 남겨 둡니다 */
    reindex: async () => toast((await repo.reindexGlossary()).message),
  };
}
