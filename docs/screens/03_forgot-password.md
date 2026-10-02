# 03. `/forgot-password` — 비밀번호 찾기

| 항목 | 값 |
| :--- | :--- |
| URL | `/forgot-password` |
| 라우트 파일 | `app/(auth)/forgot-password.jsx` |
| MVC | `domains/auth/view/PasswordResetView.jsx`(+`EmailCodeFields`,`PasswordFields`) · `controller/usePasswordResetController.js`, `useEmailVerification.js` · `model/passwordRepository.js`, `passwordPolicy.js` |
| 기능 ID | CM-03 |
| 접근 권한 | 비로그인 |

**3단계 마법사 + 완료 안내.** 같은 화면이 두 모드를 가집니다.

| 모드 | 진입 | 제목 | 단계 | 1단계 API | 2단계 API | 3단계 API | 완료 문구 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 비밀번호 찾기(기본) | `/forgot-password` | 비밀번호 찾기 | 본인 확인(사번·이메일) → 이메일 인증 → 새 비밀번호 | `POST /auth/password/forgot` | `POST /auth/email/verify-code` (email·purpose·code) | `POST /auth/password/reset` | 비밀번호가 재설정되었습니다 |
| **잠금 해제** (2026-10-01 기획 09 AUD-16) | `/forgot-password?mode=unlock&empNo=…` (로그인 화면 잠금 안내의 단추) | 계정 잠금 해제 | 사번 확인(사번) → 이메일 인증 → 새 비밀번호 | `POST /auth/unlock/request` | `POST /auth/unlock/verify` (empNo·code — 화면은 이메일 원문을 모름) | `POST /auth/unlock/complete` | 잠금이 해제되었습니다. 새 비밀번호로 로그인해 주세요. |

새 라우트는 없습니다(`npm run check:routes` 수치 변동 없음). `usePasswordResetController` 가 `mode` 파라미터로 분기하고, `useEmailVerification` 에 `verifier` 를 주입해 잠금 해제 모드가 `verifyUnlockCode` 를 씁니다.

## 1. 컴포넌트

| 단계 | 컴포넌트 |
| :--- | :--- |
| 공통 | `AuthCard`(width 480) · `Steps` · `FormAlert` · `AuthLinks(로그인으로 돌아가기)` |
| 1 본인 확인 | `TextField`(사번) · `TextField`(등록된 이메일 — 잠금 해제 모드에는 없음) · `Button primary`(인증 코드 받기) · 보안 안내 문구 |
| 2 이메일 인증 | `EmailCodeFields` + `ButtonRow`(이전 / 인증 확인) · 잠금 해제 모드는 「메일이 오지 않으면 전산팀에 잠금 해제를 요청하세요.」 |
| 3 새 비밀번호 | `FormAlert(success)` · `PasswordFields`(새 비밀번호 / 새 비밀번호 확인) · `Button primary`(비밀번호 변경 / 잠금 해제 모드는 「잠금 해제하고 비밀번호 변경」) |
| 4 완료 | `FormAlert(success)` · 안내 · `Button`(로그인 화면으로) |

## 2. 화면에 출력해야 하는 정보

| 항목 | 값·출처 |
| :--- | :--- |
| 이메일 힌트 | "가입할 때 등록한 주소와 같아야 인증 코드가 발송됩니다." |
| **계정 열거 방지 안내** | "보안을 위해 입력한 정보가 실제 계정과 일치하는지 알려 주지 않습니다. 일치하는 계정이 있을 때만 코드가 발송됩니다." |
| 2단계 안내 | 서버 `sentInfo.message` 또는 "입력하신 정보와 일치하는 계정이 있으면 인증 코드를 보냈습니다." |
| 남은 유효 시간 / 재발송 대기 | `expiresIn` / `resendIn` |
| 필드 오류 | `fieldErrors.empNo`, `.email`, `.newPassword`, `.newPasswordConfirm` |
| 완료 안내 | "잠긴 계정이었다면 이번 재설정으로 함께 풀립니다." (예전 「정지된 계정이었다면」 문구는 제거됨 — 5회 실패는 정지가 아니라 잠금입니다) |
| 잠금 해제 1단계 안내 | "잠긴 계정이면 등록된 이메일로 인증 코드를 보냅니다. 보안을 위해 계정이 잠겼는지 여부는 알려 주지 않습니다." |

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

- 재설정 성공 시 **계정 잠금(LOCKED) 해제**가 함께 이루어집니다.
- 잠금 해제 모드도 새 비밀번호가 **필수**입니다 — 5회 실패는 비밀번호 대입일 수 있어 같은 비밀번호로 되돌아가면 잠금의 의미가 없습니다.
- 계정 열거 방지: 잠금 해제 요청은 없는 사번·잠기지 않은 계정·이메일 없음·발송 제한이어도 같은 200 응답이므로 화면은 결과와 무관하게 2단계로 넘어갑니다. 검증 실패 문구도 「유효한 인증 요청이 없습니다…」 하나입니다.
- 2026-10-02 결정 R-17 로 SMTP 가 설정되어 dev·prod 모두 이메일 잠금 해제를 씁니다(`email-enabled=true`). 설정이 꺼진 환경에서만 `/auth/unlock/*` 가 503 `E-AUTH-007` 「지금은 이메일로 잠금을 해제할 수 없습니다. 전산팀에 잠금 해제를 요청해 주세요.」 입니다. 메일 발송 실패 수는 보안 감사 로그 보존 정책 모달에서 봅니다.
- 목(mock) 인증에서는 잠금이 걸리지 않으므로 잠금 응답을 흉내 내지 않습니다. 잠금 해제 3건은 성공 응답만 둡니다.
- 인증 코드 만료 시 3단계 진입 불가 — 재발송 유도.
- 로컬 개발 환경은 SMTP 없이 서버 로그에 코드 출력 (`인증 코드 : 382831  (유효 5분)`).

## 5. 사용 API

총 **5건** (비밀번호 찾기 2 · 잠금 해제 3)

**비밀번호 찾기** — 2건

| # | 서비스 함수 | API 명 | Method | Path | 요청 파라미터 | 응답 주요 필드 | 접근 권한 | blind | 우선순위 |
|---|---|---|---|---|---|---|---|---|---|
| - | `postAuthPasswordForgot` | 비밀번호 찾기 인증 코드 발송 | POST | `/api/v1/auth/password/forgot` | empNo, email | email(마스킹), expireMinutes, message | 비로그인 | — | 1 |
| - | `postAuthPasswordReset` | 비밀번호 재설정 | POST | `/api/v1/auth/password/reset` | verificationToken, newPassword, newPasswordConfirm | success, empNo, message | 비로그인 | — | 1 |

**잠금 해제(2026-10-01 신규, AUD-16)** — 3건

| # | 서비스 함수 | API 명 | Method | Path | 요청 파라미터 | 응답 주요 필드 | 접근 권한 | 오류 |
|---|---|---|---|---|---|---|---|---|
| - | `postAuthUnlockRequest` | 잠금 해제 인증 코드 발송 | POST | `/api/v1/auth/unlock/request` | empNo | message, expireMinutes, resendAvailableInSec | 비로그인 | 400 field empNo, 503 E-AUTH-007 |
| - | `postAuthUnlockVerify` | 잠금 해제 인증 코드 검증 | POST | `/api/v1/auth/unlock/verify` | empNo, code | verificationToken, expireMinutes | 비로그인 | 400 field code, 400 E-RULE-001, 503 E-AUTH-007 |
| - | `postAuthUnlockComplete` | 잠금 해제 완료(새 비밀번호) | POST | `/api/v1/auth/unlock/complete` | verificationToken, newPassword, newPasswordConfirm | empNo, message | 비로그인 | 400 field newPassword·newPasswordConfirm, 409 E-RULE-001(이미 해제됨), 503 E-AUTH-007 |

추가로 비밀번호 찾기 모드는 `postAuthEmailVerifyCode`(코드 검증)를 회원가입과 공용으로 사용합니다. 잠금 해제 모드는 이 공용 경로를 쓰지 않습니다(서버도 `purpose=ACCOUNT_UNLOCK` 을 공용 경로에서 400 으로 막습니다).

## 6. 개발 체크리스트

- [ ] 4단계 마법사 셸
- [ ] 1단계 — 사번 + 이메일, **불일치여도 다음 단계 진행** (열거 방지)
- [ ] 인증 코드 공용 훅 재사용 (purpose=PASSWORD_RESET)
- [ ] 새 비밀번호 정책 검증 + 확인 일치
- [ ] `POST /auth/password/reset` 연동 · 정지 해제 안내
- [ ] 로그인 복귀 링크
- [x] 잠금 해제 모드(`mode=unlock`) — 제목·1단계 사번만·`/auth/unlock/*` 3건·완료 문구 (2026-10-01)
- [x] 브라우저 시험 `tests/auth/account-unlock-browser.cjs` (page.route 로 잠금·해제 응답 고정)
