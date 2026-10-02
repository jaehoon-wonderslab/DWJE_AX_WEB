/**
 * 라우트 — 용어 사전 조회 (GL-01)
 * 경로 /glossary/view · 화면 ID gloss-view · 대그룹 「용어 사전」 (2026-10-01 결정 R-09·R-15)
 */
import React from 'react';
import PageContainer from '@shared/components/layout/PageContainer';
import { useGlossaryReadController } from '@domains/glossary/controller/useGlossaryReadController';
import GlossaryReadView from '@domains/glossary/view/GlossaryReadView';

export default function GlossaryReadPage() {
  const controller = useGlossaryReadController();
  return (
    <PageContainer>
      <GlossaryReadView {...controller} />
    </PageContainer>
  );
}
