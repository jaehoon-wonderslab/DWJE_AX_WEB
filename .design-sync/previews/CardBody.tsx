import './_rnw';
import React from 'react';
import { Card, CardBody, KeyValue, SourceNote } from 'dwje-ax-web';

const P = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 12.5, lineHeight: '19px', color: '#3C3C3C' }}>{children}</div>
);

/** 기본 본문 — 18px 여백. 구역을 여러 개 두면 각각 여백이 붙습니다 */
export const Basic = () => (
  <div style={{ width: 300 }}>
    <Card title="PR-03 점검 메모" sub="09:12 · 생산1팀">
      <CardBody>
        <P>금형 교체 후 첫 로트(L260909-0412)에서 치수 편차 +0.03mm. 하한 여유는 있으나 추이 관찰 필요.</P>
      </CardBody>
      <CardBody>
        <P>조치: 2차 로트 100EA 전수 측정 후 판정.</P>
      </CardBody>
    </Card>
  </div>
);

/** tight — 여백 0. 표·정의목록처럼 자체 여백이 있는 내용을 꽉 채울 때 */
export const Tight = () => (
  <div style={{ width: 300 }}>
    <Card title="설비 정보" sub="PR-03">
      <CardBody tight>
        <KeyValue keyWidth={72} rows={[['공정', 'PRESS'], ['모델', 'Krios_s'], ['상태', '가동'], ['담당', '이재훈']]} />
      </CardBody>
    </Card>
  </div>
);

/** 혼합 — 본문 구역 + tight 구역(SourceNote) 을 섞어 근거를 붙입니다 */
export const Mixed = () => (
  <div style={{ width: 300 }}>
    <Card title="AI 브리핑" sub="09:00 기준">
      <CardBody>
        <P>Plating 라인 도금 두께가 하한(12.0µm)에 근접했습니다. PL-01 전류 밀도 점검을 권장합니다.</P>
      </CardBody>
      <CardBody tight style={{ paddingHorizontal: 18, paddingBottom: 14 } as any}>
        <SourceNote>근거: 두께 측정 로그 32건 · 설비 이벤트 1건</SourceNote>
      </CardBody>
    </Card>
  </div>
);
