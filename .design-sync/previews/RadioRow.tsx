import './_rnw';
import React from 'react';
import { RadioRow } from 'dwje-ax-web';

/** 문자열 옵션 — 선택된 항목은 굵은 잉크 테두리 점 */
export const Basic = () => (
  <div style={{ width: 300 }}>
    <RadioRow options={['일별', '주별', '월별']} value="주별" />
  </div>
);

/** { value, label } 옵션 — 코드 값과 표시 이름을 분리 */
export const WithObjects = () => (
  <div style={{ width: 300 }}>
    <RadioRow
      options={[
        { value: 'all', label: '전체 설비' },
        { value: 'run', label: '가동 중' },
        { value: 'down', label: '비가동' },
      ]}
      value="down"
    />
  </div>
);

/** style 로 세로 배치 — 설명이 긴 옵션용 */
export const Vertical = () => (
  <div style={{ width: 280 }}>
    <RadioRow
      style={{ flexDirection: 'column', gap: 9 }}
      options={[
        { value: 'lot', label: 'LOT 단위 (L260909-0412)' },
        { value: 'shift', label: '교대조 단위 (주간·야간)' },
        { value: 'day', label: '일 단위 집계' },
      ]}
      value="lot"
    />
  </div>
);
