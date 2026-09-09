/**
 * [Controller] SY-07 제품군 순위 관리
 *
 * 제품의 매출 순위는 '제품군 순위 × 제품군 내 순서'로 계산합니다.
 * 순위를 바꾸면 공정 및 제품 대시보드의 주력 제품 Top N 이 함께 바뀝니다.
 */
import { useCallback, useEffect, useState } from 'react';
import { useAsync } from '@shared/hooks/useAsync';
import { usePaging } from '@shared/hooks/usePaging';
import { useAppStore } from '@shared/stores/useAppStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadXls } from '@shared/utils/exportUtil';
import * as repo from '../model/systemRepository';

export function useProductRankController() {
  const toast = useUiStore((state) => state.toast);
  const setDashModels = useAppStore((state) => state.setDashModels);

  const [topN, setTopN] = useState('10');
  const [openFamily, setOpenFamily] = useState(null);
  const [familyProducts, setFamilyProducts] = useState([]);

  const logsPaging = usePaging();
  const { data, loading, reload } = useAsync(
    () => repo.loadProductRank(topN, logsPaging.params),
    [topN, logsPaging.page, logsPaging.size]
  );
  const families = data?.families?.items || [];

  // 펼친 제품군의 제품 순서를 따로 받아옵니다
  const loadProducts = useCallback(async () => {
    if (!openFamily) {
      setFamilyProducts([]);
      return;
    }
    const res = await repo.loadFamilyProducts(openFamily);
    setFamilyProducts(res?.items || []);
  }, [openFamily]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const run = useCallback(
    async (fn) => {
      const res = await fn();
      toast(res.message);
      if (res.ok) {
        reload();
        loadProducts();
      }
      return res;
    },
    [toast, reload, loadProducts]
  );

  const exportExcel = useCallback(() => {
    downloadXls({
      name: '제품군 순위',
      head: ['순위', '제품군', '제품 수'],
      rows: families.map((f) => [f.rank, f.familyNm ?? f.name, f.productCnt]),
    });
  }, [families]);

  /**
   * 순위 재배열 — 서버는 `orders[{familyCd, rank}]` 전체 목록을 받습니다.
   * 예전엔 `{familyCd, direction}` 만 보내서 200 "변경되었습니다" 가 오고 실제로는 0건이 바뀌었습니다.
   *
   * @param {Array} list 현재 순서대로 정렬된 목록
   * @param {number} fromIdx 옮길 항목의 현재 위치
   * @param {number} toIdx 목표 위치
   * @returns {Array} 새 순서의 목록
   */
  const reorder = (list, fromIdx, toIdx) => {
    const next = [...list];
    const [item] = next.splice(fromIdx, 1);
    next.splice(Math.max(0, Math.min(toIdx, next.length)), 0, item);
    return next;
  };

  const familyOrders = (nextList) => ({ orders: nextList.map((f, i) => ({ familyCd: f.familyCd, rank: i + 1 })) });
  const productOrders = (nextList) => ({ familyCd: openFamily, orders: nextList.map((p, i) => ({ code: p.code, seq: i + 1 })) });

  const sortedFamilies = [...families].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));

  const moveFamily = (familyCd, direction) => {
    const idx = sortedFamilies.findIndex((f) => f.familyCd === familyCd);
    if (idx < 0) return Promise.resolve({ ok: false });
    const toIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (toIdx < 0 || toIdx >= sortedFamilies.length) return Promise.resolve({ ok: false });
    return run(() => repo.moveFamily(familyOrders(reorder(sortedFamilies, idx, toIdx))));
  };

  const setFamilyRank = (familyCd, toRank) => {
    const idx = sortedFamilies.findIndex((f) => f.familyCd === familyCd);
    const toIdx = Number(toRank) - 1;
    if (idx < 0 || Number.isNaN(toIdx) || idx === toIdx) return Promise.resolve({ ok: false });
    return run(() => repo.moveFamily(familyOrders(reorder(sortedFamilies, idx, toIdx))));
  };

  const moveProduct = (code, direction) => {
    const list = [...familyProducts].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
    const idx = list.findIndex((p) => p.code === code);
    const toIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (idx < 0 || toIdx < 0 || toIdx >= list.length) return Promise.resolve({ ok: false });
    return run(() => repo.moveFamilyProduct(productOrders(reorder(list, idx, toIdx))));
  };

  /** 변경 이력 구분 코드 표기 (서버 `type` — RESET · FAMILY · PRODUCT) */
  const LOG_TYPE = { RESET: '기본 복원', FAMILY: '제품군 순위', PRODUCT: '제품 순서' };

  return {
    loading,
    families: sortedFamilies,
    // 기본 순서인지 — 서버가 행마다 기본 순위(defaultRank)를 주므로 전 제품군이 기본 순위와 같으면 '기본' 입니다
    isDefault: sortedFamilies.length ? sortedFamilies.every((f) => f.defaultRank == null || f.rank === f.defaultRank) : true,
    ranking: data?.ranking?.items || [],
    logs: (data?.logs?.items || []).map((l) => ({ ...l, act: l.act || LOG_TYPE[l.type] || l.type || '' })),
    logsTotal: data?.metas?.logs?.total,
    logsPaging,
    logsMeta: data?.metas?.logs,
    topN,
    setTopN,
    openFamily,
    setOpenFamily,
    openFamilyNm: sortedFamilies.find((f) => f.familyCd === openFamily)?.familyNm,
    familyProducts,
    exportExcel,
    moveFamily,
    setFamilyRank,
    moveProduct,
    resetOrder: async () => {
      const res = await run(() => repo.resetFamilyOrder());
      // 대시보드 선택도 초기화해 새 순위가 반영되게 합니다
      if (res.ok) setDashModels([]);
    },
  };
}
