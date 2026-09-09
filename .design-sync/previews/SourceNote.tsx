import './_rnw';
import React from 'react';
import { Card, KeyValue, SourceNote } from 'dwje-ax-web';

/** 카드 본문 끝에 붙는 근거 문구 — 헤어라인 위 10.5px 회색 글씨 */
export const Basic = () => (
  <div style={{ width: 300 }}>
    <Card title="공정별 수율" sub="오늘 · 목표 97.0%">
      <KeyValue keyWidth={80} rows={[['PRESS', '98.1%'], ['Plating', '96.9%'], ['Coating', '97.4%']]} />
      <SourceNote>근거: MES 실적 집계(08:55)</SourceNote>
    </Card>
  </div>
);

/** 긴 문구 — 여러 줄로 감싸며 출처를 나열합니다 */
export const Multiline = () => (
  <div style={{ width: 300 }}>
    <Card title="불량 원인 추정" sub="AOI 오판정 의심">
      <div style={{ fontSize: 12.5, lineHeight: '19px', color: '#3C3C3C' }}>
        조명 편차로 인한 오판정 가능성 72%. 09:40 이후 판정 12건 재검 권장.
      </div>
      <SourceNote>근거: AOI 판정 로그 1,204건(09:00~10:05) · 설비 이벤트 PL-01 램프 교체 · 전일 재검 결과 8건 · 모델 Krios_s 기준 이미지 v3</SourceNote>
    </Card>
  </div>
);

/** 내용이 없으면 구분선까지 그리지 않습니다 — 아래 카드에는 빈 SourceNote 가 있습니다 */
export const EmptyHidden = () => (
  <div style={{ width: 300 }}>
    <Card title="공정별 수율" sub="주석 없는 응답">
      <KeyValue keyWidth={80} rows={[['PRESS', '98.1%'], ['Plating', '96.9%']]} />
      <SourceNote>{null}</SourceNote>
    </Card>
    <div style={{ marginTop: 8, fontSize: 11, lineHeight: '15px', color: '#787878' }}>↑ 빈 SourceNote — 점선도 남지 않음</div>
  </div>
);
