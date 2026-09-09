import './_rnw';
import React from 'react';
import { TextField } from 'dwje-ax-web';

const Box = ({ children, width = 280 }: { children: React.ReactNode; width?: number }) => (
  <div style={{ width }}>{children}</div>
);

/** 비어 있는 상태 — placeholder 는 캡션 회색 */
export const Placeholder = () => (
  <Box>
    <TextField label="LOT 번호" placeholder="L260909-0412" full />
  </Box>
);

/** 값이 있는 상태 · required */
export const Filled = () => (
  <Box>
    <TextField label="설비 코드" value="PR-03" required full />
  </Box>
);

/** hint — 입력란 아래 얇은 안내 */
export const WithHint = () => (
  <Box>
    <TextField label="모델명" value="Krios_s" hint="MES 품목 마스터의 모델 코드와 같아야 합니다" full />
  </Box>
);

/** error — 테두리·배경이 옅은 빨강, 아래에 오류 문구 */
export const WithError = () => (
  <Box>
    <TextField label="수율 목표 (%)" value="104.2" error="0 ~ 100 사이 값을 입력하세요" required full />
  </Box>
);

/** 읽기 전용 — editable={false} 를 그대로 넘기고 inputStyle 로 배경만 낮춥니다 */
export const ReadOnly = () => (
  <Box>
    <TextField label="등록자" value="이재훈 (품질팀)" editable={false} inputStyle={{ backgroundColor: '#FAFAFA', color: '#787878' }} full />
  </Box>
);

/** 조회 조건용 — full 없이 기본 minWidth 130 으로 놓인 짧은 입력 */
export const Compact = () => (
  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
    <TextField label="작업자" placeholder="이름" />
    <TextField label="라인" value="A-2" />
  </div>
);
