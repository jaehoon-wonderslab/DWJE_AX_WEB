/**
 * [Controller] SY-06 용어 사전 관리
 *
 * [권한] 공식 용어는 통합관리자만 편집합니다.
 *        유사어는 누구나 등록하되, 본인이 등록한 것만 수정·삭제할 수 있습니다.
 */
import { useCallback, useState } from 'react';
import { useAsync } from '@shared/hooks/useAsync';
import { usePaging } from '@shared/hooks/usePaging';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadXls } from '@shared/utils/exportUtil';
import * as repo from '../model/systemRepository';

const SAMPLE = '어제 캔 라인에서 찍힘 불량 나서 파카 써야 함. 쉴드캔 외관도 확인 필요';

export function useGlossaryController() {
  const toast = useUiStore((state) => state.toast);
  const me = useAuthStore((state) => state.userInfo);

  const [keyword, setKeyword] = useState('');
  const [domain, setDomain] = useState('전체');
  const [mineOnly, setMineOnly] = useState(false);
  const [sample, setSample] = useState(SAMPLE);
  const [normalized, setNormalized] = useState(null);

  const paging = usePaging({ resetKey: `${keyword}|${domain}|${mineOnly}` });
  const { data, loading, reload } = useAsync(
    // 분류 필터의 서버 키는 domainCd 입니다 (domain 으로 보내면 무시되어 필터가 걸리지 않았습니다)
    () => repo.loadGlossaryByDomain({ keyword, domainCd: domain, ...paging.params }),
    // 쪽을 넘겨도 다시 조회되도록 page · size 를 의존성에 둡니다 (예전엔 빠져 있어 2쪽이 열리지 않았습니다)
    [keyword, domain, mineOnly, paging.page, paging.size]
  );

  // 유사어의 본인 여부는 서버 `editable` 입니다 (화면은 `mine` 으로 읽고 있었습니다)
  const allTerms = (data?.terms?.items || []).map((t) => ({
    ...t,
    variants: (t.variants || []).map((v) => ({ ...v, mine: v.mine ?? !!v.editable })),
  }));
  // '내가 등록한 유사어만' — 서버 파라미터가 없어 현재 쪽 안에서 걸러 냅니다 (API 요청 사항)
  const terms = mineOnly ? allTerms.filter((t) => t.variants.some((v) => v.mine)) : allTerms;

  const run = useCallback(
    async (fn) => {
      const res = await fn();
      toast(res.message);
      if (res.ok) reload();
      return res;
    },
    [toast, reload]
  );

  /** 현장 표현을 공식 용어로 바꿔 봅니다 */
  const normalize = useCallback(async () => {
    const res = await repo.normalizeText(sample);
    if (res.ok) setNormalized(res.data);
    toast(res.message);
  }, [sample, toast]);

  const exportExcel = useCallback(() => {
    downloadXls({
      name: '용어 사전',
      head: ['공식 용어', '뜻', '분류', '유사어', '등록자'],
      rows: terms.map((t) => [t.term, t.definition, t.domain, t.variants.map((v) => v.word).join(' · '), t.variants.map((v) => v.byName).join(' · ')]),
    });
  }, [terms]);

  return {
    paging,
    itemsMeta: data?.termsMeta,
    loading,
    summary: data?.summary,
    terms,
    // 공식 용어 편집 권한 — 서버 요약에 canEditTerm 이 없으면 통합관리자(superAdmin) 여부로 판정합니다
    canEditTerm: data?.summary?.canEditTerm ?? !!me?.superAdmin,
    // 분류는 기준정보(/glossary/domains)에서 받습니다.
    // 예전엔 summary.domains 를 읽었는데 서버 필드는 byDomain 이라 늘 비어 있었고,
    // 등록된 용어에서 뽑는 방식이면 첫 용어를 만들 수 없습니다
    domains: (data?.domains?.domains || []).map((d) => d.code).filter(Boolean),
    filters: { keyword, domain, mineOnly },
    setKeyword,
    setDomain,
    setMineOnly,
    sample,
    setSample,
    normalized,
    normalize,
    reload,
    exportExcel,
    /**
     * 공식 용어 등록·수정
     *
     * 삭제는 소프트 삭제라, 지웠던 이름으로 다시 등록하면 서버가 그 용어를 되살립니다.
     * 새로 만든 것과 되살아난 것은 사용자에게 다른 일이므로 구분해서 알려 줍니다 —
     * 예전에 달려 있던 유사어가 함께 돌아오기 때문입니다.
     */
    submitTerm: async (termId, v) => {
      if (termId) return run(() => repo.updateTerm(termId, v));
      const res = await run(() => repo.createTerm(v));
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
    removeTerm: (termId) => run(() => repo.deleteTerm(termId)),
    reindex: async () => toast((await repo.reindexGlossary()).message),
  };
}
