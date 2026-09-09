/**
 * 라우트 — 메뉴 접근 권한 (SY-02)
 * 경로 /system/menu-perm · 화면 ID sys-menu
 */
import React from 'react';
import PageContainer from '@shared/components/layout/PageContainer';
import { useMenuPermController } from '@domains/system/controller/useMenuPermController';
import MenuPermView from '@domains/system/view/MenuPermView';

export default function MenuPermPage() {
  const controller = useMenuPermController();
  return (
    <PageContainer>
      <MenuPermView {...controller} />
    </PageContainer>
  );
}
