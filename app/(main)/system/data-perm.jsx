/**
 * 라우트 — 데이터 접근 권한 (SY-03)
 * 경로 /system/data-perm · 화면 ID sys-data
 */
import React from 'react';
import PageContainer from '@shared/components/layout/PageContainer';
import { useDataPermController } from '@domains/system/controller/useDataPermController';
import DataPermView from '@domains/system/view/DataPermView';

export default function DataPermPage() {
  const controller = useDataPermController();
  return (
    <PageContainer>
      <DataPermView {...controller} />
    </PageContainer>
  );
}
