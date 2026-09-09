import './_rnw';
import React from 'react';
import { DateField } from 'dwje-ax-web';

const Box = ({ children, width = 280 }: { children: React.ReactNode; width?: number }) => (
  <div style={{ width }}>{children}</div>
);

/** 비어 있는 상태 — YYYY-MM-DD placeholder · 오른쪽 달력 단추 */
export const Placeholder = () => (
  <Box>
    <DateField label="기준일" full />
  </Box>
);

/** 값이 있는 상태 (Inter 숫자) · required */
export const Filled = () => (
  <Box>
    <DateField label="기준일" value="2026-09-09" required full />
  </Box>
);

/** 기간 조회 — 두 개를 나란히 (min/max 로 선택 범위 제한) */
export const Range = () => (
  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
    <DateField label="시작일" value="2026-09-01" max="2026-09-09" />
    <DateField label="종료일" value="2026-09-09" min="2026-09-01" />
  </div>
);

/** error · hint */
export const WithError = () => (
  <Box>
    <DateField label="종료일" value="2026-08-30" error="종료일은 시작일(2026-09-01) 이후여야 합니다" hint="보유 기간: 2026-01-02 ~ 2026-09-09" full />
  </Box>
);
