import './_rnw';
import React from 'react';
import { TextAreaField } from 'dwje-ax-web';

const Box = ({ children, width = 280 }: { children: React.ReactNode; width?: number }) => (
  <div style={{ width }}>{children}</div>
);

/** 비어 있는 상태 — rows 기본 3 */
export const Placeholder = () => (
  <Box>
    <TextAreaField label="조치 내용" placeholder="점검 결과와 조치 사항을 적어 주세요" />
  </Box>
);

/** 값이 있는 상태 · required */
export const Filled = () => (
  <Box>
    <TextAreaField
      label="이상 원인"
      required
      value={'PR-03 금형 교체(08:10) 이후 치수 불량 집중.\n하형 클램프 토크 부족으로 추정, 재체결 후 30분 모니터링.'}
    />
  </Box>
);

/** rows 로 높이를 늘립니다 (rows=5) · hint */
export const TallWithHint = () => (
  <Box>
    <TextAreaField
      label="비고"
      rows={5}
      value="AOI 오판정 의심 12건은 재검사 대기열로 이동."
      hint="500자 이내 · 일보에 그대로 인쇄됩니다"
    />
  </Box>
);

/** error */
export const WithError = () => (
  <Box>
    <TextAreaField label="조치 내용" required value="" error="조치 내용은 필수 입력입니다" />
  </Box>
);
