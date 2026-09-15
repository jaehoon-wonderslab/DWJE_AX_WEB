/**
 * 라우트 — AOI 판정 분석 (QC-02 · QC-03)
 * 경로 /quality/aoi · 화면 ID qc-aoi
 *
 * 컨트롤러 둘을 한 화면에 잇습니다.
 *  · useAoiDefectsController    — 「불량 상세」: MES 불량 판정 목록 + NAS 사진 (REQ_20260910 A-9)
 *  · useAoiPredictionController — 이상 가능성 분석(추정) 블록
 */
import React from 'react';
import PageContainer from '@shared/components/layout/PageContainer';
import { useAoiDefectsController } from '@domains/quality/controller/useAoiDefectsController';
import { useAoiPredictionController } from '@domains/quality/controller/useAoiPredictionController';
import AoiPredictionView from '@domains/quality/view/AoiPredictionView';

export default function AoiPredictionPage() {
  const prediction = useAoiPredictionController();
  const defects = useAoiDefectsController();
  return (
    <PageContainer>
      <AoiPredictionView {...prediction} defects={defects} />
    </PageContainer>
  );
}
