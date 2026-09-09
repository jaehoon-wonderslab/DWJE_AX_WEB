import './_rnw';
import React from 'react';
import { SelectField } from 'dwje-ax-web';

const Box = ({ children, width = 280 }: { children: React.ReactNode; width?: number }) => (
  <div style={{ width }}>{children}</div>
);

const PROCESSES = ['PRESS', 'Plating', 'Coating', 'AOI'];
const MACHINES = [
  { value: 'PR-03', label: 'PR-03 · 200T 프레스' },
  { value: 'PL-01', label: 'PL-01 · 도금 1호기' },
  { value: 'CT-02', label: 'CT-02 · 코팅 2호기' },
];

/** 값이 없는 상태 — placeholder(기본 "선택") · 오른쪽 chevron */
export const Placeholder = () => (
  <Box>
    <SelectField label="공정" options={PROCESSES} full />
  </Box>
);

/** 문자열 배열 options · 선택된 값 */
export const Filled = () => (
  <Box>
    <SelectField label="공정" options={PROCESSES} value="Plating" required full />
  </Box>
);

/** {value,label} 객체 options — 표시는 label, 값은 value */
export const ObjectOptions = () => (
  <Box>
    <SelectField label="설비" options={MACHINES} value="PR-03" hint="선택한 설비의 이벤트만 조회됩니다" full />
  </Box>
);

/** error · 커스텀 placeholder */
export const WithError = () => (
  <Box>
    <SelectField label="불량 유형" options={['치수', '외관', '도금 두께', '기타']} placeholder="유형을 고르세요" error="불량 유형을 선택하세요" required full />
  </Box>
);

/** 조회 조건용 — full 없이 minWidth 130 · 두 개 나열 */
export const Compact = () => (
  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
    <SelectField label="공정" options={PROCESSES} value="PRESS" />
    <SelectField label="교대" options={['주간', '야간']} value="주간" />
  </div>
);
