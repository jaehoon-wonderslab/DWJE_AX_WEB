/**
 * 라우트 — 그룹웨어 부서 매핑 (SY-17)
 * 경로 /system/gw-dept-map · 화면 ID sys-gw-dept
 */
import React from 'react';
import PageContainer from '@shared/components/layout/PageContainer';
import { useGwDeptMapController } from '@domains/system/controller/useGwDeptMapController';
import GwDeptMapView from '@domains/system/view/GwDeptMapView';
import { useDeptManageController } from '@domains/system/controller/useDeptManageController';

export default function GwDeptMapPage() {
  const controller = useGwDeptMapController();
  // 「부서」 탭(2026-10-07, 계정 관리에서 옮김) — 부서 목록 · 등록 · 편집 · 삭제
  const deptAdmin = useDeptManageController({ onChanged: controller.reload });
  return (
    <PageContainer>
      <GwDeptMapView {...controller} deptAdmin={deptAdmin} />
    </PageContainer>
  );
}
