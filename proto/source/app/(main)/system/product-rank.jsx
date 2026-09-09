/**
 * 라우트 — 제품군 순위 관리 (SY-07)
 * 경로 /system/product-rank · 화면 ID sys-rank
 */
import React from 'react';
import PageContainer from '@shared/components/layout/PageContainer';
import { useProductRankController } from '@domains/system/controller/useProductRankController';
import ProductRankView from '@domains/system/view/ProductRankView';

export default function ProductRankPage() {
  const controller = useProductRankController();
  return (
    <PageContainer>
      <ProductRankView {...controller} />
    </PageContainer>
  );
}
