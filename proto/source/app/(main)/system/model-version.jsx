/**
 * 라우트 — AI 모델 버전 관리 (SY-11)
 * 경로 /system/model-version · 화면 ID sys-model-ver
 */
import React from 'react';
import PageContainer from '@shared/components/layout/PageContainer';
import { useModelVersionController } from '@domains/system/controller/useModelVersionController';
import ModelVersionView from '@domains/system/view/ModelVersionView';

export default function ModelVersionPage() {
  const controller = useModelVersionController();
  return (
    <PageContainer>
      <ModelVersionView {...controller} />
    </PageContainer>
  );
}
