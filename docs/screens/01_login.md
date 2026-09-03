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
| 안내 문구 | 고정 | "비밀번호를 5회 잘못 입력하면 계정이 정지됩니다. 정지된 계정은 비밀번호 찾기로 다시 사용할 수 있습니다." |
| 로그인 성공 토스트 | `<이름>님 환영합니다` | |

## 3. 버튼 및 페이징

| 버튼 | 동작 |
| :--- | :--- |
| **로그인** | ① 빈 값 검증 → ② `POST /auth/login` → ③ 토큰 저장(`setLogin`) → ④ `GET /auth/me` 로 권한 로드(`setMe`) → ⑤ `router.replace(next ?? /dashboard/ai)` |
| 회원가입 | `router.push('/signup')` |
| 비밀번호 찾기 | `router.push('/forgot-password')` |
| 비밀번호 표시/숨기기 | 로컬 토글 |

페이징 없음.

## 4. 그 밖의 기능

- **복귀 경로 유지** — `(main)` 레이아웃이 비로그인 접근을 막을 때 넘긴 `?next=<경로>` 로 로그인 후 되돌아갑니다. `/` 로 시작하는 값만 허용.
- **권한 로딩 실패 시 롤백** — `/auth/me` 가 실패하면 `setLogout()` 으로 로그인 상태를 되돌리고 오류를 표시합니다 (사이드바를 못 그리는 상태 방지).
- **Enter 제출** — 두 입력 모두 `onSubmitEditing = submit`.
- **계정 잠금 정책** — 로그인 5회 실패 시 정지. 해제는 비밀번호 찾기 흐름.
- **데모 모드** — `EXPO_PUBLIC_LIVE_AUTH=false` 면 이 화면을 거치지 않고 자동 로그인.

## 5. 사용 API

총 **4건** (인증·공통 카탈로그에서 이 화면이 쓰는 것)

| # | 서비스 함수 | API 명 | Method | Path | 요청 파라미터 | 응답 주요 필드 | 접근 권한 |
|---|---|---|---|---|---|---|---|
| 1 | `postAuthLogin` | 로그인 | POST | `/api/v1/auth/login` | loginId, password | accessToken, refreshToken, user(empNo,name,dept,pos) | 비로그인 |
| 4 | `getAuthMe` | 내 정보·권한 조회 | GET | `/api/v1/auth/me` | — | user, dept, menuPerms[], dataPerms[], servingModelVer | 전 부서 |
| 3 | `postAuthRefresh` | 토큰 갱신 | POST | `/api/v1/auth/refresh` | refreshToken | accessToken | 전 부서 (client.js 인터셉터) |
| 2 | `postAuthLogout` | 로그아웃 | POST | `/api/v1/auth/logout` | — | success | 전 부서 (UserMenu) |

> 로그인 성공·실패 모두 `ax.tb_sys_login_hist` 에 접속 이력이 기록됩니다.

