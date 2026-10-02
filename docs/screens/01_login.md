# 01. `/login` — 로그인

| 항목 | 값 |
| :--- | :--- |
| URL | `/login` |
| 화면 ID | — (비로그인 전용, 권한 대상 아님) |
| 라우트 파일 | `app/(auth)/login.jsx` |
| MVC | `domains/auth/view/LoginView.jsx` · `controller/useLoginController.js` · `model/authRepository.js`, `authError.js` |
| 기능 ID | CM-03 |
| 접근 권한 | 비로그인 |

## 1. 컴포넌트

| 컴포넌트 | 역할 |
| :--- | :--- |
| `AuthCard` | 제목 "로그인" · 설명 "사내 사번과 비밀번호로 접속합니다." · 하단 링크 슬롯 |
| `AuthLinks` | `계정이 없으신가요? 회원가입` / `비밀번호 찾기` |
| `FormAlert(tone=error)` | 서버가 준 실패 문구 그대로 표시 |
| `FormAlert(tone=error)` 잠금 안내 | 로그인 응답이 `E-AUTH-005`(계정 잠금)일 때만. 가린 이메일(`emailMasked`)을 함께 보입니다 (2026-10-01 기획 09 AUD-16) |
| `Button` 이메일 인증으로 잠금 해제 | 잠금 응답의 `mailEnabled=true` 일 때. 2026-10-02 결정 R-17 로 SMTP 가 설정되어 dev·prod 모두 이것이 기본 경로입니다. 등록 이메일이 없는 계정 등으로 `false` 면 단추 없이 「전산팀에 잠금 해제를 요청해 주세요」 문구만 |
| `TextField` × 2 | 사번 / 비밀번호 |
| `IconButton(eye/eyeOff)` | 비밀번호 표시·숨기기 토글 (화면 로컬 state) |
| `Button(primary)` | 로그인 (진행 중 `로그인 중…` · disabled) |

## 2. 화면에 출력해야 하는 정보

| 항목 | 출처 | 비고 |
| :--- | :--- | :--- |
| 사번 입력값 | 로컬 state | placeholder `예) 10004`, `autoComplete=username` |
| 비밀번호 입력값 | 로컬 state | `secureTextEntry`, `autoComplete=current-password` |
| 폼 전체 오류 (`formError`) | 서버 응답 | **사번 없음 / 비밀번호 불일치 문구를 구분하지 않음** (계정 열거 방지) |
| 항목별 오류 (`fieldErrors.loginId`, `.password`) | 클라 검증 + 서버 매핑 | 빈 값은 서버 호출 전 차단 |
| 잠금 안내 (`locked`) | 서버 응답 `data{lockedAt, emailMasked, mailEnabled, unlockPath}` | 잠금 응답일 때만 그립니다. 비밀번호 칸은 비웁니다. 이메일 원문은 받지도 보이지도 않습니다(가린 값만) |
| 안내 문구 | 고정 | "비밀번호를 5회 잘못 입력하면 계정이 잠깁니다. 잠긴 계정은 이메일 인증으로 풀 수 있습니다." (2026-10-01 이전 「정지」 문구는 제거됨) |
| 로그인 성공 토스트 | `<이름>님 환영합니다` | |

## 3. 버튼 및 페이징

| 버튼 | 동작 |
| :--- | :--- |
| **로그인** | ① 빈 값 검증 → ② `POST /auth/login` → ③ 토큰 저장(`setLogin`) → ④ `GET /auth/me` 로 권한 로드(`setMe`) → ⑤ `router.replace(next ?? /dashboard/ai)` |
| 회원가입 | `router.push('/signup')` |
| 비밀번호 찾기 | `router.push('/forgot-password')` |
| 이메일 인증으로 잠금 해제 | `router.push('/forgot-password?mode=unlock&empNo=<입력한 사번>')` — 새 라우트를 만들지 않고 비밀번호 찾기 화면을 「잠금 해제」 모드로 엽니다 |
| 비밀번호 표시/숨기기 | 로컬 토글 |

페이징 없음.

## 4. 그 밖의 기능

- **복귀 경로 유지** — `(main)` 레이아웃이 비로그인 접근을 막을 때 넘긴 `?next=<경로>` 로 로그인 후 되돌아갑니다. `/` 로 시작하는 값만 허용.
- **권한 로딩 실패 시 롤백** — `/auth/me` 가 실패하면 `setLogout()` 으로 로그인 상태를 되돌리고 오류를 표시합니다 (사이드바를 못 그리는 상태 방지).
- **Enter 제출** — 두 입력 모두 `onSubmitEditing = submit`.
- **계정 잠금 정책 (2026-10-01 기획 09 AUD-01 · AUD-16, 결정 R-02)** — 비밀번호 5회 연속 실패 시 계정 상태가 `LOCKED`(잠김)가 됩니다. 관리자 정지(`SUSPENDED`)와 다릅니다.
  - 1~4회 실패와 없는 사번은 같은 401 `E-AUTH-001` 문구입니다(계정 열거 방지). 5회째와 잠긴 계정의 로그인만 401 `E-AUTH-005` 로 구분합니다 — 잠긴 사용자에게 해제 방법을 알려야 해서 감수하는 노출입니다.
  - 잠긴 동안에는 맞는 비밀번호여도 `E-AUTH-005` 입니다.
  - 해제 경로: ① 이메일 인증 + 새 비밀번호(`/forgot-password?mode=unlock`, 03 문서) ② 비밀번호 찾기로 재설정 ③ 계정 관리 화면의 관리자 해제. (2026-10-02 R-17 로 SMTP 가 설정되어 「SMTP 미제공 기간에는 관리자 해제만」 단계는 끝났습니다)
  - 판정: `authError.isAccountLocked(res)`. 401 이지만 로그인 경로는 토큰 갱신 대상이 아니므로 재시도가 일어나지 않습니다.
- **데모 모드** — `EXPO_PUBLIC_LIVE_AUTH=false` 면 이 화면을 거치지 않고 자동 로그인.

## 5. 사용 API

총 **4건** (인증·공통 카탈로그에서 이 화면이 쓰는 것)

| # | 서비스 함수 | API 명 | Method | Path | 요청 파라미터 | 응답 주요 필드 | 접근 권한 |
|---|---|---|---|---|---|---|---|
| 1 | `postAuthLogin` | 로그인 | POST | `/api/v1/auth/login` | loginId, password | accessToken, refreshToken, user(empNo,name,dept,pos) | 비로그인 |
| 4 | `getAuthMe` | 내 정보·권한 조회 | GET | `/api/v1/auth/me` | — | user, dept, menuPerms[], dataPerms[], servingModelVer | 전 부서 |
| 3 | `postAuthRefresh` | 토큰 갱신 | POST | `/api/v1/auth/refresh` | refreshToken | accessToken | 전 부서 (client.js 인터셉터) |
| 2 | `postAuthLogout` | 로그아웃 | POST | `/api/v1/auth/logout` | — | success | 전 부서 (UserMenu) |

> 로그인 성공·실패 모두 `ax.tb_sys_login_hist` 에 접속 이력이 기록됩니다. 2026-10-01(AUD-01)부터 실패 이력·실패 횟수·잠금이 롤백되지 않고 커밋됩니다.

잠금 응답(401 `E-AUTH-005`) 예시:

```json
{ "success": false, "code": "E-AUTH-005",
  "message": "비밀번호를 5회 잘못 입력해 계정이 잠겼습니다. 등록된 이메일로 인증하면 잠금을 해제할 수 있습니다.",
  "data": { "lockedAt": "2026-10-01 09:12:44", "emailMasked": "j***@dwje.co.kr", "mailEnabled": true, "unlockPath": "/forgot-password?mode=unlock" } }
```

## 6. 시험

- `tests/auth/account-unlock-browser.cjs` — `page.route` 로 잠금 응답을 흉내 내어 경고 상자·가린 이메일·해제 단추·비밀번호 비움, `mailEnabled=false` 문구, 폭 390px 에서 잘리지 않음을 확인합니다. `LIVE_UNLOCK=1` 이면 로컬 API 로 전용 시험 계정을 실제로 잠그고 해제합니다(시드 계정은 잠그지 않음).
- `tests/specs/04-auth.spec.js` 「사번 없음과 비밀번호 오류의 문구가 같다」 는 시드 계정 대신 그 시험이 만든 전용 계정으로 1회만 틀립니다.

