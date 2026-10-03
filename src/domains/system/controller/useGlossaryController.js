/**
 * [Controller] SY-06 용어 사전 관리 (화면 ID sys-gloss)
 *
 * [권한] 공식 용어는 통합관리자만 편집합니다(서버도 403 E-AUTH-004 로 막습니다 — 07 GLS-01).
 *        유사어는 이 화면의 쓰기 권한(can_write)이 있으면 등록하고, 본인이 등록한 것만 수정·삭제합니다(07 GLS-16).
 *        쓰기 권한 판정은 서버 요약의 canWriteVariant 를 먼저 보고, 없으면 접근 권한 · 미배정 여부(canWrite)로 대신합니다.
 *
 *  · 조회 줄(검색 · 내 유사어만 · 조회)은 2026-10-04 에 뺐습니다 — 용어를 전부 받아 표 머리글 필터로 거릅니다.
 *  · 주소의 ?keyword= 는 「공식 용어」 머리글 필터 첫 값이 됩니다 — 용어 사전 조회(13 GLV-09)의 「관리 화면에서 편집」 링크가 씁니다.
 *  · 엑셀은 공통 옵션 패널입니다(07 GLS-18). 조회 목록 = 그리드에 보이는 행(정렬·열 순서 그대로),
 *    전체 = 서버 생성 파일(조건 무시). 서버 내려받기가 아직 없으면 전체 조회(size=0)로 대신 만듭니다.
 *  · 엑셀 업로드(2026-10-03) — 템플릿 내려받기(GET, 이력은 서버 기록) · 파일 고르기 → 미리보기(dryRun=true) →
 *    등록(dryRun=false, 같은 파일). 새 용어는 통합관리자만이고 그 밖은 서버가 행을 ERROR 로 돌려줍니다.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAsync } from '@shared/hooks/useAsync';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadFromServer, downloadXls } from '@shared/utils/exportUtil';
import * as repo from '../model/systemRepository';

const SAMPLE = '어제 캔 라인에서 찍힘 불량 나서 파카 써야 함. 쉴드캔 외관도 확인 필요';
/** 화면 ID — 메뉴·권한·내려받기 이력에 같은 값을 씁니다 */
const SCREEN_ID = 'sys-gloss';
/** 검색 입력이 멈춘 뒤 요청까지 기다리는 시간 */
/** 「전체 다운로드」 상한 (07 GLS-18) */
const EXPORT_ALL_LIMIT = 5000;
/** 쓰기 권한이 없을 때 버튼 옆에 띄우는 안내 (공통 R-06) */
export const NO_WRITE_MESSAGE = '미배정 계정은 이 동작을 할 수 없습니다. 전산팀에 부서 배정을 요청하세요.';
/** 고객사 데이터 권한이 없어 가린 용어(blinded)의 버튼 안내 (공통 11.2 결정 R-18 · 13 GLV-08) */
export const BLIND_MESSAGE = '고객사 데이터 권한이 없어 볼 수 없는 용어입니다';
/** 공식 용어 쓰기가 403 일 때 (07 GLS-01) */
const TERM_ADMIN_ONLY = '공식 용어는 통합관리자만 편집할 수 있습니다.';

/** 엑셀 열 — 그리드 열(field) → 머리글 (등록자 열은 2026-10-04 에 뺌) */
/** 제거됨(2026-10-03, 분류 삭제): 「분류」 열 */
const EXPORT_COLS = { term: '공식 용어', definition: '뜻', variants: '유사어' };
const EXPORT_ORDER = ['term', 'definition', 'variants'];
const AREA_LABEL = { summary: '요약', terms: '용어 목록' };

/**
 * 브라우저 파일 선택 창을 열고 고른 xlsx 를 돌려줍니다. 취소하면 null.
 * (취소는 change 가 오지 않으므로 창이 다시 포커스를 받은 뒤 잠깐 기다려 판정합니다)
 */
function pickXlsxFile() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    input.style.display = 'none';
    input.setAttribute('data-testid', 'glossary-import-file');
    let done = false;
    const finish = (file) => {
      if (done) return;
      done = true;
      window.removeEventListener('focus', onFocus);
      input.remove();
      resolve(file || null);
    };
    const onFocus = () => setTimeout(() => finish(input.files?.[0] || null), 400);
    input.addEventListener('change', () => finish(input.files?.[0] || null));
    window.addEventListener('focus', onFocus);
    document.body.appendChild(input);
    input.click();
  });
}

export function useGlossaryController() {
  const toast = useUiStore((state) => state.toast);
  const me = useAuthStore((state) => state.userInfo);
  const canWriteScreen = useAuthStore((state) => state.canWrite(SCREEN_ID));
  const params = useLocalSearchParams();
  const paramKeyword = typeof params?.keyword === 'string' ? params.keyword : '';

  // 조회 줄(검색 · 「내가 등록한 유사어만」 · 조회)은 뺐습니다(2026-10-04) — 용어를 전부 받아 표 머리글 필터로 거릅니다.
  // 다른 화면에서 ?keyword= 로 들어오면 그 값을 「공식 용어」 머리글 필터에 넣습니다
  const initialFilter = paramKeyword.trim();
  const [sample, setSample] = useState(SAMPLE);
  const [normalized, setNormalized] = useState(null);
  /** 그리드 인스턴스 — 「조회 목록 다운로드」 가 정렬·필터 결과를 그대로 읽습니다 */
  const gridRef = useRef(null);

  const { data, loading, reload } = useAsync(
    // 서버 필터(keyword · mineOnly)는 쓰지 않습니다(2026-10-04). 분류 필터는 제거됨(2026-10-03, 분류 삭제)
    // 용어는 전부 받고 표가 쪽을 나눕니다(2026-10-04) — 머리글 필터가 다른 쪽 용어까지 찾도록
    () => repo.loadGlossary({}),
    []
  );

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
  const terms = allTerms;

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
    () => '머리글 필터 반영',
    []
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
        variants: t.blinded ? '비공개' : (t.variants || []).map((v) => v.word).join(' · '),
      };
      // 등록자 열은 뺐습니다(2026-10-04) — 유사어 등록은 관리자만 합니다
      return order.map((f) => cell[f]);
    });
    return { rows, blind };
  };

  const exportView = useCallback(async () => {
    const { rows: list, order } = gridView();
    const { rows, blind } = buildRows(list, order);
    downloadXls({
      name: '용어 사전',
      head: order.map((f) => EXPORT_COLS[f]),
      attrs: order,
      rows,
      blindCount: blind,
      scope: 'VIEW',
      condSummary,
      menuId: SCREEN_ID,
    });
  }, [gridView, condSummary]);

  const exportAll = useCallback(async () => {
    // 서버가 만든 파일 — 검색·내 유사어만과 관계없이 사전 전체(상한 5,000). 이력은 서버가 기록합니다
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
        head: EXPORT_ORDER.map((f) => EXPORT_COLS[f]),
        attrs: EXPORT_ORDER,
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

  // ── 엑셀 업로드 (2026-10-03) ─────────────────────────────
  /** 업로드용 템플릿 — 서버가 만든 파일(공식 용어* · 뜻* · 고객사 정보 · 유사어)을 그대로 받습니다. 이력은 서버가 남깁니다 */
  const downloadImportTemplate = useCallback(
    () => downloadFromServer({ path: '/glossary/import/template', method: 'GET', name: '용어 사전 업로드 템플릿' }),
    []
  );

  /**
   * 파일을 고르고 미리보기를 받습니다. 취소·파일 오류·서버 400 이면 null (오류는 토스트로 알립니다)
   * @returns {Promise<{file: File, preview: object}|null>}
   */
  const pickAndPreviewImport = useCallback(async () => {
    if (!canWriteVariant) { toast(NO_WRITE_MESSAGE); return null; }
    const file = await pickXlsxFile();
    if (!file) return null;
    const bad = repo.glossaryImportFileError(file);
    if (bad) { toast(bad); return null; }
    const res = await repo.importGlossary(file, true);
    if (!res.ok) { toast(res.message || '파일을 읽지 못했습니다.'); return null; }
    return { file, preview: res.data };
  }, [canWriteVariant, toast]);

  /** 미리보기만 다시 (파일을 이미 고른 경우 — 시험·재시도용) */
  const previewImport = useCallback(async (file) => {
    const res = await repo.importGlossary(file, true);
    if (!res.ok) toast(res.message || '파일을 읽지 못했습니다.');
    return res;
  }, [toast]);

  /** 등록 — 미리보기와 같은 파일을 dryRun=false 로 보냅니다. 성공하면 목록·요약을 다시 받습니다 */
  const applyImport = useCallback(async (file) => {
    const res = await repo.importGlossary(file, false);
    if (res.ok) {
      const d = res.data;
      const detail = d ? ` (새 용어 ${d.termNew}건 · 유사어 ${d.variantNew}건${d.errorCnt ? ` · 오류로 뺀 행 ${d.errorCnt}건` : ''})` : '';
      toast(`${res.message || '용어 사전을 등록했습니다.'}${detail}`);
      reload();
      reloadRisks();
    } else {
      toast(res.message || '용어 사전을 등록하지 못했습니다.');
    }
    return res;
  }, [toast, reload, reloadRisks]);

  // 기존 즉시 내려받기(현재 쪽 · attrs 없음)는 제거됨 — 2026-10 엑셀 옵션 패널(07 GLS-18)로 바꿨습니다

  return {
    itemsMeta: data?.termsMeta,
    loading,
    /** 첫 조회 — 화면 전체 Loading. 재조회는 표를 그대로 두고 카드 안에만 표시합니다 */
    initialLoading: loading && !data,
    refreshing: loading && !!data,
    loadErrors,
    summary,
    summaryFailed: !!data?.errors?.summary,
    // 제거됨(2026-10-03, 분류 삭제): 분류별 현황(byDomain · 07 GLS-13)과 분류 목록(domains · /glossary/domains)
    terms,
    gridRef,
    canEditTerm,
    canWriteVariant,
    risks: riskList,
    riskCount: summary?.riskVariantCnt ?? riskList.length,
    /** 주소의 ?keyword= — 「공식 용어」 머리글 필터 첫 값 */
    initialFilter,
    sample,
    setSample,
    normalized,
    normalize,
    reload,
    exportView,
    exportAll,
    exportViewCount: terms.length,
    downloadImportTemplate,
    pickAndPreviewImport,
    previewImport,
    applyImport,
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
