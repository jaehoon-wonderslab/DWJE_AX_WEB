import './_rnw';
import React from 'react';
import { Field, Badge } from 'dwje-ax-web';

const Box = ({ children, width = 280 }: { children: React.ReactNode; width?: number }) => (
  <div style={{ width }}>{children}</div>
);

/** 라벨 + 임의의 컨트롤 — 입력 대신 배지·읽기 전용 값을 라벨 밑에 둘 때 */
export const Basic = () => (
  <Box>
    <Field label="설비 상태">
      <div style={{ display: 'flex', gap: 6 }}>
        <Badge tone="green">가동</Badge>
        <Badge>PR-03</Badge>
      </div>
    </Field>
  </Box>
);

/** required — 라벨 뒤에 앰버 * 표시 */
export const Required = () => (
  <Box>
    <Field label="담당 공정" required>
      <div style={{ fontSize: 12.5, fontWeight: 500, color: '#0B1440', lineHeight: '19px' }}>PRESS · Plating</div>
    </Field>
  </Box>
);

/** hint — 입력란 아래 얇은 회색 안내 */
export const WithHint = () => (
  <Box>
    <Field label="LOT 번호" hint="형식: L + 연월일 6자리 + 순번 4자리 (예 L260909-0412)">
      <div style={{ fontSize: 12.5, fontWeight: 500, color: '#0B1440', lineHeight: '19px' }}>L260909-0412</div>
    </Field>
  </Box>
);

/** error — hint 를 대신해 빨간 안내가 붙습니다 (API 의 error.field 연결 자리) */
export const WithError = () => (
  <Box>
    <Field label="수율 목표" required error="0 ~ 100 사이 값을 입력하세요" hint="이 hint 는 error 가 있을 때 숨겨집니다">
      <div style={{ fontSize: 12.5, fontWeight: 500, color: '#0B1440', lineHeight: '19px' }}>104.2 %</div>
    </Field>
  </Box>
);
