/**
 * 라우트 — 용어 사전 관리 (SY-06)
 * 경로 /system/glossary · 화면 ID sys-gloss
 */
import React from 'react';
import PageContainer from '@shared/components/layout/PageContainer';
import { useGlossaryController } from '@domains/system/controller/useGlossaryController';
import GlossaryView from '@domains/system/view/GlossaryView';

export default function GlossaryPage() {
  const controller = useGlossaryController();
  return (
    <PageContainer>
      <GlossaryView {...controller} />
    </PageContainer>
  );
}
