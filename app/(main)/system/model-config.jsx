/**
 * 라우트 — AI 모델 설정 (SY-10)
 * 경로 /system/model-config · 화면 ID base-model
 */
import React from 'react';
import PageContainer from '@shared/components/layout/PageContainer';
import { useModelConfigController } from '@domains/system/controller/useModelConfigController';
import ModelConfigView from '@domains/system/view/ModelConfigView';

export default function ModelConfigPage() {
  const controller = useModelConfigController();
  return (
    <PageContainer>
      <ModelConfigView {...controller} />
    </PageContainer>
  );
}
