# 02. `/signup` — 회원가입

| 항목 | 값 |
| :--- | :--- |
| URL | `/signup` |
| 라우트 파일 | `app/(auth)/signup.jsx` |
| MVC | `domains/auth/view/SignupView.jsx`(+`EmailCodeFields`,`PasswordFields`) · `controller/useSignupController.js`, `useEmailVerification.js` · `model/signupRepository.js`, `emailVerifyRepository.js`, `passwordPolicy.js`, `authError.js` |
| 기능 ID | CM-03 |
| 접근 권한 | 비로그인 |

**3단계 마법사 + 완료 안내**. 가입해도 바로 로그인되지 않고 **전산팀 승인 대기(PENDING)** 상태가 됩니다.

## 1. 컴포넌트

| 단계 | 컴포넌트 |
| :--- | :--- |
| 공통 | `AuthCard`(width 520) · `Steps`(3단계) · `FormAlert` · `AuthLinks(이미 계정이 있으신가요? 로그인)` |
| 1 기본 정보 | `TextField`(사번) + `Button`(중복 확인) · `TextField`(이름) · `SelectField`(소속 부서) · `SelectField`(직위) · `TextField`(이메일) · `Button primary`(인증 코드 받기) |
| 2 이메일 인증 | `EmailCodeFields` — `FormAlert` · `TextField`(6자리 숫자, `oneTimeCode`) · 남은 유효시간/재발송 카운트다운 · `ButtonRow`(이전 / 인증 확인) |
| 3 비밀번호 | `FormAlert(success)` · `PasswordFields`(비밀번호 + 확인, 정책 안내) · `Button primary`(가입 신청) |
| 4 완료 | `FormAlert(success)` · `KeyValue`(사번 / 이메일 / 상태) · 안내 문구 · `Button`(로그인 화면으로) |

## 2. 화면에 출력해야 하는 정보

| 항목 | 값·출처 |
| :--- | :--- |
| 단계 표시 | `기본 정보(사번·부서)` → `이메일 인증(인증 코드)` → `비밀번호(가입 신청)` |
| 사번 중복 확인 결과 | `{checked, available, message}` — 사용 가능하면 초록 문구 |
| 부서 선택지 | `GET /auth/signup/depts` (통합관리자 부서는 서버에서 제외) |
| 부서 힌트 | "접근 권한은 계정이 아니라 소속 부서 단위로 부여됩니다." |
| 이메일 힌트 | "이 주소로 인증 코드를 보냅니다. 한 주소로 여러 계정을 만들 수 없습니다." |
| 코드 발송 대상 | **서버가 마스킹한 주소** (`ho**@dwje.co.kr`) — 원본 재표시 금지 |
| 남은 유효 시간 | `expiresIn` 카운트다운 (`formatCountdown`) |
| 재발송 대기 | `resendIn` (60초) — 0 이 될 때까지 버튼 비활성 |
| 만료 상태 | `expired` 면 "인증 코드가 만료되었습니다. 코드를 다시 받아 주세요." |
| 비밀번호 정책 위반 | `checkPassword(password, {empNo})` 결과 |
| 완료 정보 | `empNo` · 마스킹 `email` · 상태 `승인 대기 (PENDING)` · 서버 메시지 |

## 3. 버튼 및 페이징

| 버튼 | 동작 |
| :--- | :--- |
| 중복 확인 | 형식 검증(`checkEmpNoFormat`) 후 `GET /auth/signup/check-emp-no` |
| 인증 코드 받기 | 1단계 전체 검증 → `POST /auth/email/send-code (purpose=SIGNUP)` → 2단계 이동 |
| 재발송 | 동일 API, 대기 시간 경과 후에만 활성 |
| 이전 | 이전 단계로 (`goBackStep`) |
| 인증 확인 | `POST /auth/email/verify-code` → **1회용 `verificationToken`** 확보 → 3단계 |
| 가입 신청 | 비밀번호 정책·일치 검증 → `POST /auth/signup` → 4단계 |
| 로그인 화면으로 | `router.replace('/login')` |

페이징 없음.

## 4. 그 밖의 기능

- **1회용 토큰 재사용 규칙** — 입력값 오류로 가입이 실패하면 서버가 토큰 소모를 롤백하므로 **같은 토큰으로 재요청**. `needsReverify(res)` 인 경우(만료·재사용)에만 2단계로 되돌리고 `verification.invalidate()`.
- **오류 단계 되돌리기** — 서버가 `empNo`/`deptId`/`email` 오류를 주면 1단계로 자동 복귀.
- **입력 시 오류 지움** — `setField` 가 해당 칸의 오류만 지우고, 사번을 바꾸면 중복 확인 결과도 초기화.
- **승인 대기 안내** — "승인 전에 로그인하면 「가입 승인 대기 중인 계정입니다」 안내가 표시됩니다."
- 승인 처리 화면은 **[25. `/system/account`](./25_system_account.md)** 의 「가입 승인 대기」 카드.

## 5. 사용 API

총 **5건**

**회원가입** — 5건

| # | 서비스 함수 | API 명 | Method | Path | 요청 파라미터 | 응답 주요 필드 | 접근 권한 | blind | 우선순위 |
|---|---|---|---|---|---|---|---|---|---|
| - | `getAuthSignupCheckEmpNo` | 사번 중복 확인 | GET | `/api/v1/auth/signup/check-emp-no` | empNo | empNo, available, message | 비로그인 | — | 1 |
| - | `getAuthSignupDepts` | 가입 가능 부서 목록 | GET | `/api/v1/auth/signup/depts` | — | depts[{deptId,deptNm,abbr,desc}] | 비로그인 | — | 1 |
| - | `postAuthEmailSendCode` | 이메일 인증 코드 발송 | POST | `/api/v1/auth/email/send-code` | email, purpose(SIGNUP|PASSWORD_RESET) | email(마스킹), purpose, expiresAt, expireMinutes, resendAvailableInSec | 비로그인 | — | 1 |
| - | `postAuthEmailVerifyCode` | 이메일 인증 코드 검증 | POST | `/api/v1/auth/email/verify-code` | email, purpose, code | verificationToken, purpose, expireMinutes | 비로그인 | — | 1 |
| - | `postAuthSignup` | 가입 신청 | POST | `/api/v1/auth/signup` | empNo, name, deptId, pos, email, verificationToken, password, passwordConfirm | empNo, email(마스킹), state(PENDING), message | 비로그인 | — | 1 |


## 6. 개발 체크리스트

- [ ] 4단계 마법사 셸(`Steps`) + 단계별 렌더 분기
- [ ] 사번 형식 검증 + 중복 확인 API 연동 · 결과 배지
- [ ] 부서 선택지 서버 연동
- [ ] 이메일 인증 공용 훅(`useEmailVerification`) — 발송 · 카운트다운 · 재발송 잠금 · 만료
- [ ] 마스킹된 주소만 표시 (원본 노출 금지)
- [ ] 비밀번호 정책 클라 선검증 + 확인 일치 검증
- [ ] `verificationToken` 1회용 처리 규칙 (`needsReverify` 분기)
- [ ] 서버 필드 오류 → 해당 단계로 자동 복귀
- [ ] 완료 화면 — PENDING 안내 + 로그인 이동
