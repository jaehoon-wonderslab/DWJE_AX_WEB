# 03. `/forgot-password` — 비밀번호 찾기

| 항목 | 값 |
| :--- | :--- |
| URL | `/forgot-password` |
| 라우트 파일 | `app/(auth)/forgot-password.jsx` |
| MVC | `domains/auth/view/PasswordResetView.jsx`(+`EmailCodeFields`,`PasswordFields`) · `controller/usePasswordResetController.js`, `useEmailVerification.js` · `model/passwordRepository.js`, `passwordPolicy.js` |
| 기능 ID | CM-03 |
| 접근 권한 | 비로그인 |

**3단계 마법사 + 완료 안내.**

## 1. 컴포넌트

| 단계 | 컴포넌트 |
| :--- | :--- |
| 공통 | `AuthCard`(width 480) · `Steps` · `FormAlert` · `AuthLinks(로그인으로 돌아가기)` |
| 1 본인 확인 | `TextField`(사번) · `TextField`(등록된 이메일) · `Button primary`(인증 코드 받기) · 보안 안내 문구 |
| 2 이메일 인증 | `EmailCodeFields` + `ButtonRow`(이전 / 인증 확인) |
| 3 새 비밀번호 | `FormAlert(success)` · `PasswordFields`(새 비밀번호 / 새 비밀번호 확인) · `Button primary`(비밀번호 변경) |
| 4 완료 | `FormAlert(success)` · 안내 · `Button`(로그인 화면으로) |

## 2. 화면에 출력해야 하는 정보

| 항목 | 값·출처 |
| :--- | :--- |
| 이메일 힌트 | "가입할 때 등록한 주소와 같아야 인증 코드가 발송됩니다." |
| **계정 열거 방지 안내** | "보안을 위해 입력한 정보가 실제 계정과 일치하는지 알려 주지 않습니다. 일치하는 계정이 있을 때만 코드가 발송됩니다." |
| 2단계 안내 | 서버 `sentInfo.message` 또는 "입력하신 정보와 일치하는 계정이 있으면 인증 코드를 보냈습니다." |
| 남은 유효 시간 / 재발송 대기 | `expiresIn` / `resendIn` |
| 필드 오류 | `fieldErrors.empNo`, `.email`, `.newPassword`, `.newPasswordConfirm` |
| 완료 안내 | "연속 로그인 실패로 정지된 계정이었다면 이번 재설정으로 함께 풀립니다." |

## 3. 버튼 및 페이징

| 버튼 | 동작 |
| :--- | :--- |
| 인증 코드 받기 | `POST /auth/password/forgot` — **불일치여도 성공 응답**(계정 열거 방지) → 항상 2단계로 |
| 재발송 | 대기 시간 후 재호출 |
| 이전 / 인증 확인 | `POST /auth/email/verify-code (purpose=PASSWORD_RESET)` → 토큰 확보 → 3단계 |
| 비밀번호 변경 | `POST /auth/password/reset` → 4단계 |
| 로그인 화면으로 | `/login` |

페이징 없음.

## 4. 그 밖의 기능

- 재설정 성공 시 **계정 정지 해제**가 함께 이루어집니다.
- 인증 코드 만료 시 3단계 진입 불가 — 재발송 유도.
- 로컬 개발 환경은 SMTP 없이 서버 로그에 코드 출력 (`인증 코드 : 382831  (유효 5분)`).

## 5. 사용 API

총 **2건**

**비밀번호 찾기** — 2건

| # | 서비스 함수 | API 명 | Method | Path | 요청 파라미터 | 응답 주요 필드 | 접근 권한 | blind | 우선순위 |
|---|---|---|---|---|---|---|---|---|---|
| - | `postAuthPasswordForgot` | 비밀번호 찾기 인증 코드 발송 | POST | `/api/v1/auth/password/forgot` | empNo, email | email(마스킹), expireMinutes, message | 비로그인 | — | 1 |
| - | `postAuthPasswordReset` | 비밀번호 재설정 | POST | `/api/v1/auth/password/reset` | verificationToken, newPassword, newPasswordConfirm | success, empNo, message | 비로그인 | — | 1 |

추가로 `postAuthEmailVerifyCode`(코드 검증)를 회원가입과 공용으로 사용합니다.

## 6. 개발 체크리스트

- [ ] 4단계 마법사 셸
- [ ] 1단계 — 사번 + 이메일, **불일치여도 다음 단계 진행** (열거 방지)
- [ ] 인증 코드 공용 훅 재사용 (purpose=PASSWORD_RESET)
- [ ] 새 비밀번호 정책 검증 + 확인 일치
- [ ] `POST /auth/password/reset` 연동 · 정지 해제 안내
- [ ] 로그인 복귀 링크
