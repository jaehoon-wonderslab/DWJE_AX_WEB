import './_rnw';
import React from 'react';
import { Card, CardBody, SourceNote, Button, KeyValue } from 'dwje-ax-web';

/** 제목 · 부제 · 본문 */
export const Basic = () => (
  <div style={{ width: 420 }}>
    <Card title="공정별 수율" sub="오늘 · 목표 97.0%">
      <KeyValue rows={[['PRESS', '98.1%'], ['Plating', '96.9%'], ['Coating', '97.4%'], ['AOI', '99.2%']]} />
    </Card>
  </div>
);

/** 머리말 오른쪽에 동작 버튼 */
export const WithAction = () => (
  <div style={{ width: 420 }}>
    <Card title="금일 이상 알림" sub="미확인 4건" right={<Button label="전체 보기" size="sm" />}>
      <KeyValue keyWidth={96} rows={[['08:12', 'PR-03 하중 편차 초과'], ['09:40', 'PL-01 도금 두께 하한'], ['10:05', 'AOI 오판정 의심 12건']]} />
    </Card>
  </div>
);

/** 여러 구역 — CardBody 로 나누고 SourceNote 로 근거를 붙입니다 */
export const Sections = () => (
  <div style={{ width: 420 }}>
    <Card title="AI 브리핑" sub="09:00 기준">
      <CardBody>
        <div style={{ fontSize: 12.5, lineHeight: '19px', color: '#3C3C3C' }}>
          PRESS 라인 불량률이 전일 대비 0.4%p 올랐습니다. PR-03 금형 교체 이후 치수 불량이 집중되어 점검을 권장합니다.
        </div>
      </CardBody>
      <CardBody tight>
        <SourceNote>근거: MES 실적 집계(08:55) · AOI 판정 로그 · 설비 이벤트 3건</SourceNote>
      </CardBody>
    </Card>
  </div>
);
