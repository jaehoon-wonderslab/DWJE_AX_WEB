/**
 * 라우트 — 보고서 다운로드 이력 (SY-14)
 * 경로 /system/download-log · 화면 ID sys-dl
 */
import React from 'react';
import PageContainer from '@shared/components/layout/PageContainer';
import { useDownloadLogController } from '@domains/system/controller/useDownloadLogController';
import DownloadLogView from '@domains/system/view/DownloadLogView';

export default function DownloadLogPage() {
  const controller = useDownloadLogController();
  return (
    <PageContainer>
      <DownloadLogView {...controller} />
    </PageContainer>
  );
}
