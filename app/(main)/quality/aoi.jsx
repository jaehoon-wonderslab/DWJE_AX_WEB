/**
 * 라우트 — AOI 판정 분석·예측 (QC-02)
 * 경로 /quality/aoi · 화면 ID qc-aoi
 */
import React from 'react';
import PageContainer from '@shared/components/layout/PageContainer';
import { useAoiPredictionController } from '@domains/quality/controller/useAoiPredictionController';
import AoiPredictionView from '@domains/quality/view/AoiPredictionView';

export default function AoiPredictionPage() {
  const controller = useAoiPredictionController();
  return (
    <PageContainer>
      <AoiPredictionView {...controller} />
    </PageContainer>
  );
}
