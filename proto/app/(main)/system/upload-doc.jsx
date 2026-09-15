/**
 * 라우트 — 업로드 문서 목록 (SY-16)
 * 경로 /system/upload-doc · 화면 ID sys-upload-doc
 *
 * AI 통합 대시보드 「업로드 리포트」에 올라온 엑셀 문서와 버전 이력을 읽기 전용으로 봅니다.
 */
import React from 'react';
import PageContainer from '@shared/components/layout/PageContainer';
import { useUploadDocController } from '@domains/system/controller/useUploadDocController';
import UploadDocView from '@domains/system/view/UploadDocView';

export default function UploadDocPage() {
  const controller = useUploadDocController();
  return (
    <PageContainer>
      <UploadDocView {...controller} />
    </PageContainer>
  );
}
