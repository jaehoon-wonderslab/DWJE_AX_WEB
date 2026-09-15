/**
 * 라우트 — AI 통합 대시보드 (DB-01)
 *
 * 경로   : /dashboard/ai
 * 화면 ID: dash-ai
 *
 * 탭 두 장 — 「MES 현황」(기존 대시보드) | 「업로드 리포트」(엑셀 업로드 → 차트·표).
 * MES 컨트롤러는 탭을 오가도 조회 조건·결과가 남도록 여기서 한 번만 만들고, 뷰만 바꿔 끼웁니다.
 * 마지막에 본 탭은 useAppStore 가 세션 안에서 기억합니다.
 *
 * MVC 결선만 담당합니다. 상태·데이터는 Controller, 렌더링은 View 가 맡습니다.
 */
import React from 'react';
import PageContainer from '@shared/components/layout/PageContainer';
import { Tabs } from '@shared/components/ui';
import { useAppStore } from '@shared/stores/useAppStore';
import { useAiDashboardController } from '@domains/dashboard/controller/useAiDashboardController';
import { useUploadReportController } from '@domains/dashboard/controller/useUploadReportController';
import AiDashboardView from '@domains/dashboard/view/AiDashboardView';
import UploadReportView from '@domains/dashboard/view/UploadReportView';

const TABS = [
  { value: 'mes', label: 'MES 현황' },
  { value: 'upload', label: '업로드 리포트' },
];

export default function AiDashboardPage() {
  const tab = useAppStore((state) => state.aiDashTab) || 'mes';
  const setTab = useAppStore((state) => state.setAiDashTab);
  const mes = useAiDashboardController();
  const upload = useUploadReportController();

  const tabs = <Tabs items={TABS} value={tab} onChange={setTab} style={{ alignSelf: 'flex-start', marginBottom: 16 }} />;

  return (
    // 차트·매트릭스가 많아 폭이 넓을수록 잘 보입니다.
    // 기본 1,400px 상한을 두면 넓은 화면에서 오른쪽이 크게 비어 정보 밀도가 떨어집니다.
    <PageContainer fluid>
      {tab === 'upload' ? <UploadReportView {...upload} headExtra={tabs} /> : <AiDashboardView {...mes} headExtra={tabs} />}
    </PageContainer>
  );
}
