import './_rnw';
import React from 'react';
import { NoteText, KeyValue } from 'dwje-ax-web';

/** 기본 — 왼쪽 2px 세로선 + 10.5px 캡션 회색 */
export const Basic = () => (
  <div style={{ width: 300 }}>
    <NoteText>수율 = 양품 수량 ÷ 투입 수량. 재검 판정 대기 LOT 는 집계에서 제외합니다.</NoteText>
  </div>
);

/** 표 아래 — 정의 목록 뒤에 근거·주석을 붙이는 자리 */
export const UnderTable = () => (
  <div style={{ width: 300 }}>
    <KeyValue keyWidth={84} rows={[['공정', 'Plating'], ['설비', 'PL-01'], ['도금 두께', '12.4 µm'], ['하한', '12.0 µm']]} />
    <NoteText>두께는 5포인트 평균값. 측정기 XRF-2 · 교정일 2026-08-30.</NoteText>
  </div>
);

/** 여러 줄 — 문장이 길어도 세로선이 본문 높이만큼 따라옵니다 */
export const Multiline = () => (
  <div style={{ width: 300 }}>
    <NoteText>
      예측값은 최근 30일 실적으로 학습한 모델(v2.3)의 출력입니다. 금형 교체·자재 LOT 변경 직후에는 신뢰도가 낮아질 수 있으니 ConfTag 를 함께 확인하세요.
    </NoteText>
  </div>
);
