/**
 * 라우트 — 그룹웨어 부서 매핑 (SY-17)
 * 경로 /system/gw-dept-map · 화면 ID sys-gw-dept
 */
import React from 'react';
import PageContainer from '@shared/components/layout/PageContainer';
import { useGwDeptMapController } from '@domains/system/controller/useGwDeptMapController';
import GwDeptMapView from '@domains/system/view/GwDeptMapView';

export default function GwDeptMapPage() {
  const controller = useGwDeptMapController();
  return (
    <PageContainer>
      <GwDeptMapView {...controller} />
    </PageContainer>
  );
}
