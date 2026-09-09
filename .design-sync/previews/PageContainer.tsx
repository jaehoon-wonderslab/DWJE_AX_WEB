import './_rnw';
import React from 'react';
import { PageContainer, PageHead, StatCard, Card, KeyValue } from 'dwje-ax-web';

const Frame = ({ children, height = 360 }: { children: React.ReactNode; height?: number }) => (
  <div style={{ width: 720, height, border: '1px dashed #C9CCD3', borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#F5F6F8' }}>
    {children}
  </div>
);

const Kpis = () => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
    <StatCard label="금일 생산량" value="128,400" unit="EA" sub="계획 대비 96.2%" tone="up" />
    <StatCard label="종합 수율" value="97.4" unit="%" sub="목표 97.0% 달성" tone="up" />
  </div>
);

/** 일반 화면 — 24px 여백(위 22px) 안에서 세로 스크롤. 점선은 본문 패널 경계 */
export const Basic = () => (
  <Frame>
    <PageContainer>
      <PageHead title="설비 현황" desc="라인별 가동 상태와 금일 실적" />
      <Kpis />
      <div style={{ height: 12 }} />
      <Card title="공정별 수율" sub="오늘 · 목표 97.0%">
        <KeyValue keyWidth={96} rows={[['PRESS', '98.1%'], ['Plating', '96.9%'], ['Coating', '97.4%'], ['AOI', '99.2%']]} />
      </Card>
    </PageContainer>
  </Frame>
);

/** maxWidth — 넓은 패널에서도 본문 폭을 잡습니다(기본 1400, 여기서는 480) */
export const MaxWidth = () => (
  <Frame height={260}>
    <PageContainer maxWidth={480}>
      <PageHead title="계정 설정" desc="본문은 480px 에서 멈추고 오른쪽은 비웁니다" />
      <Kpis />
    </PageContainer>
  </Frame>
);
