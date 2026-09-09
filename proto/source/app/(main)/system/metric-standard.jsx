/**
 * 라우트 — 지표 측정 데이터 관리 (SY-13)
 * 경로 /system/metric-standard · 화면 ID sys-metric
 */
import React from 'react';
import PageContainer from '@shared/components/layout/PageContainer';
import { useMetricStdController } from '@domains/system/controller/useMetricStdController';
import MetricStdView from '@domains/system/view/MetricStdView';

export default function MetricStdPage() {
  const controller = useMetricStdController();
  return (
    <PageContainer>
      <MetricStdView {...controller} />
    </PageContainer>
  );
}
