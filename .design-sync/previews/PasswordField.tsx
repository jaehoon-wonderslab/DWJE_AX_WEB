import './_rnw';
import React from 'react';
import { PasswordField } from 'dwje-ax-web';

const Box = ({ children, width = 280 }: { children: React.ReactNode; width?: number }) => (
  <div style={{ width }}>{children}</div>
);

/** 비어 있는 상태 — 오른쪽 안에 눈 아이콘 */
export const Placeholder = () => (
  <Box>
    <PasswordField label="비밀번호" placeholder="8자 이상, 영문·숫자 조합" full />
  </Box>
);

/** 숨김 상태(기본) — 점으로 표시 */
export const Hidden = () => (
  <Box>
    <PasswordField label="비밀번호" value="dwje-ax-2026!" required full />
  </Box>
);

/** visible 을 바깥에서 제어 — 표시 상태 · eyeOff 아이콘 */
export const Shown = () => (
  <Box>
    <PasswordField label="비밀번호" value="dwje-ax-2026!" visible onToggleVisible={() => {}} required full />
  </Box>
);

/** 확인 칸 — hint 로 규칙 안내 */
export const WithHint = () => (
  <Box>
    <PasswordField label="비밀번호 확인" value="dwje-ax-2026!" hint="위와 같은 값을 다시 입력합니다" full />
  </Box>
);

/** error — 불일치 */
export const WithError = () => (
  <Box>
    <PasswordField label="비밀번호 확인" value="dwje-ax-2025" error="비밀번호가 일치하지 않습니다" required full />
  </Box>
);
