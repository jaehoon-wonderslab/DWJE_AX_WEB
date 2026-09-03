# 25. `/system/account` — 계정 관리

| 항목 | 값 |
| :--- | :--- |
| URL | `/system/account` |
| 화면 ID | `sys-account` |
| 라우트 파일 | `app/(main)/system/account.jsx` |
| MVC | `domains/system/view/AccountView.jsx` · `controller/useAccountController.js` · `model/systemRepository.js` · `shared/constants/accounts.js` |
| 기능 ID | SY-01 |
| 접근 권한 | 전산팀 · 통합관리자 |

**접근 권한은 계정이 아니라 부서에 부여됩니다.** 계정에 부서를 지정하면 그 부서의 메뉴·데이터 접근 권한이 그대로 적용됩니다.
회원가입(`/signup`) 신청은 `PENDING` 으로 쌓이며 **이 화면에서 승인해야 로그인**할 수 있습니다.

## 1. 컴포넌트

| # | 영역 | 컴포넌트 |
| :-- | :--- | :--- |
| 0 | 페이지 헤드 | `PageHead` + `Button(엑셀 다운로드)` · `Button(메뉴 접근 권한)` · `Button(부서 등록)` · `Button primary(계정 등록)` |
| 1 | 요약 | `StatCard` × 4 |
| 2 | 안내 | `Hint` — 권한은 전부 부서 설정을 따름 |
| 3 | **가입 승인 대기** | `Card(tight)` + `Table`(승인/반려 버튼) + `Hint` — 대기 건이 있을 때만 |
| 4 | 계정 | `Card(tight)` + `Table`(minWidth 1080) |
| 5 | 부서 | `Card(tight)` + `Table`(minWidth 980) |
| 6 | 계정·권한 변경 이력 | `Card(tight)` + `Table`(minWidth 840) |
| 7 | 모달 | `openFormModal`(계정/부서/부서 이동/가입 반려) · `openConfirmModal`(가입 승인/계정 삭제/부서 삭제) |

## 2. 화면에 출력해야 하는 정보

### 2-1. 요약 카드

가입 계정(`active + suspended`, 보조 `사용 N · 정지 M`) · **승인 대기**(`pending.length`, 보조 "승인해야 로그인할 수 있습니다") · 부서(`deptCnt`) · 현재 로그인(`me.name`, 보조 `{dept} · {직급}`)

### 2-2. 가입 승인 대기 표 (`GET /system/users/pending`)

아이디(mono) · 이름 · 신청 부서 · 직급 · 상태(`Badge amber 승인 대기`) · 처리(`Button primary(승인)` · `Button danger(반려)`)
안내 : "승인하면 신청 부서의 메뉴 접근 권한과 데이터 접근 권한이 그대로 적용됩니다. 부서를 바꿔서 승인하려면 먼저 승인한 뒤 계정 표에서 부서를 이동하세요."

### 2-3. 계정 표 (`GET /system/users`)

| 열 | 폭 | 렌더 |
| :--- | :--- | :--- |
| 아이디 `empNo` | 100 mono | |
| 이름 `name` | 130 | + `Badge(blue) 현재`(본인) · `Badge 전환`(`switchable`) |
| 소속 부서 `dept` | 108 | |
| 직급 `posNm` | 76 | |
| 상태 `state` | 84 | `ACTIVE`→green / `PENDING`→amber / 그 외 red |
| 로그인 실패 `loginFailCnt` | 94 우측 | |
| 최근 접속 `lastLoginAt` | 150 mono | |
| 관리 | 250 | `편집` · `부서 이동` · `정지/사용` · `삭제(danger)` |

### 2-4. 부서 표 (`GET /system/depts`)

부서(+`Badge 현재 소속` / `Badge 전 권한`) · 약칭(mono) · 설명 · 소속 계정 수 · 관리(`편집` · `메뉴 권한` · `데이터 권한` · `삭제`)
부제 : "권한 부여 단위 · 소속 계정이 있으면 삭제할 수 없습니다"

### 2-5. 계정·권한 변경 이력 (`GET /system/perm-logs`, 최근 10건)

시각(mono) · 대상 · 구분(`Badge`: 계정 blue / 부서 amber) · 변경 내용(wrap) · 수행자

## 3. 버튼 및 폼

| 버튼 | 동작 |
| :--- | :--- |
| 계정 등록 / 편집 | 폼 → `POST /system/users` · `PUT /system/users/{empNo}` |
| 계정 삭제 | 확인 모달(danger) → `DELETE /system/users/{empNo}` |
| 정지 / 사용 | `PATCH /system/users/{empNo}/state` (현재 상태의 반대) |
| 부서 이동 | 폼 → `PUT /system/users/{empNo}/dept` |
| 부서 등록 / 편집 | 폼 → `POST /system/depts` · `PUT /system/depts/{deptId}` |
| 부서 삭제 | 확인 모달 → `DELETE /system/depts/{deptId}` |
| 가입 승인 | 확인 모달 → `POST /system/users/{empNo}/approve (approve=true)` |
| 가입 반려 | 사유 폼(danger) → `POST /system/users/{empNo}/approve (approve=false, reason)` |
| 메뉴 접근 권한 / 데이터 접근 권한 | `/system/menu-perm` · `/system/data-perm` |
| 엑셀 다운로드 | 계정 목록 xls (아이디·이름·부서·직급·상태·최근 접속) |

### 3-1. 폼 필드

**계정** — 아이디(사번, 필수) · 이름(필수) · 소속 부서(select, 필수) · 직급(select, `POSITIONS`) · 상태(radio `ACTIVE`/`SUSPENDED`)
안내 : "부서를 지정하면 그 부서의 메뉴 접근 권한과 데이터 접근 권한이 즉시 적용됩니다."

**부서** — 부서명(필수) · 약칭 2자(필수) · 설명 · (신규만) 초기 권한 복사 대상 select / (편집은 static 안내)

**부서 이동** — 이동할 부서(select, 필수). 안내 : "부서를 옮기면 … 새 부서 기준으로 즉시 바뀝니다."

**가입 반려** — 반려 사유(textarea, 필수). "반려하면 계정이 정지 상태가 되어 로그인할 수 없습니다. 사유는 감사 로그에 남습니다."

**페이징** — 서버 API 는 `page`/`size` 지원, 현재 화면 미노출. → **개선 항목**

## 4. 그 밖의 기능

- 승인 대기 카드는 계정 목록보다 **위에** 배치 (승인 전에는 로그인 불가하므로).
- 모든 변경은 `run()` 으로 처리 — 토스트 후 `reload()`.
- 계정 삭제 후에도 접속 이력·감사 로그는 남습니다.

## 5. 사용 API

총 **15건**

**계정 관리** — 15건

| # | 서비스 함수 | API 명 | Method | Path | 요청 파라미터 | 응답 주요 필드 | 접근 권한 | blind | 우선순위 |
|---|---|---|---|---|---|---|---|---|---|
| - | `getSystemUsersPending` | 승인 대기 계정 목록 | GET | `/api/v1/system/users/pending` | — | items[{empNo,name,dept,deptId,pos,email,requestedAt}] | 전산팀·통합관리자 | — | 2 |
| - | `postSystemUsersByEmpNoApprove` | 회원가입 승인·반려 | POST | `/api/v1/system/users/{empNo}/approve` | approve, reason | empNo, state | 전산팀·통합관리자 | — | 2 |
| 127 | `getSystemAccountsSummary` | 계정 관리 요약 | GET | `/api/v1/system/accounts/summary` | — | userCnt{active,suspended}, deptCnt, switchableCnt, currentUser{} | 전산팀·통합관리자 | — | 2 |
| 128 | `getSystemUsers` | 계정 목록 조회 | GET | `/api/v1/system/users` | keyword, deptId, state, page, size | items[{empNo,name,dept,pos,state,lastLoginAt,demo}], meta | 전산팀·통합관리자 | worker | 1 |
| 129 | `postSystemUsers` | 계정 등록 | POST | `/api/v1/system/users` | empNo, name, deptId, pos, state, switchable | empNo | 전산팀·통합관리자 | — | 1 |
| 130 | `putSystemUsersByEmpNo` | 계정 수정 | PUT | `/api/v1/system/users/{empNo}` | empNo, name, deptId, pos, state, switchable | success | 전산팀·통합관리자 | — | 1 |
| 131 | `deleteSystemUsersByEmpNo` | 계정 삭제 | DELETE | `/api/v1/system/users/{empNo}` | — | success | 전산팀·통합관리자 | — | 1 |
| 132 | `patchSystemUsersByEmpNoState` | 계정 사용/정지 | PATCH | `/api/v1/system/users/{empNo}/state` | state(사용|정지) | success | 전산팀·통합관리자 | — | 1 |
| 133 | `putSystemUsersByEmpNoDept` | 계정 부서 이동 | PUT | `/api/v1/system/users/{empNo}/dept` | deptId | success, appliedMenuCnt, appliedDataCnt | 전산팀·통합관리자 | — | 1 |
| 134 | `getSystemDeptsPermCompare` | 부서별 권한 비교 | GET | `/api/v1/system/depts/perm-compare` | — | items[{deptId,menuCnt,dataCnt}] | 전산팀·통합관리자 | — | 2 |
| 135 | `getSystemDepts` | 부서 목록 조회 | GET | `/api/v1/system/depts` | — | items[{deptId,abbr,desc,userCnt,menuCnt,dataCnt}] | 전산팀·통합관리자 | — | 1 |
| 136 | `postSystemDepts` | 부서 등록 | POST | `/api/v1/system/depts` | deptId, abbr, desc, initPermFrom | deptId | 전산팀·통합관리자 | — | 1 |
| 137 | `putSystemDeptsByDeptId` | 부서 수정 | PUT | `/api/v1/system/depts/{deptId}` | deptId, abbr, desc | success | 전산팀·통합관리자 | — | 1 |
| 138 | `deleteSystemDeptsByDeptId` | 부서 삭제 | DELETE | `/api/v1/system/depts/{deptId}` | — | success | 전산팀·통합관리자 | — | 1 |
| 139 | `getSystemPermLogs` | 계정·권한 변경 이력 | GET | `/api/v1/system/perm-logs` | from, to, target, actType, page, size | items[{ts,target,actType,detail,by}], meta | 전산팀·통합관리자 | — | 1 |


## 6. 개발 체크리스트

- [ ] 요약 4카드 (승인 대기 강조)
- [ ] 가입 승인 대기 표 + 승인/반려(사유)
- [ ] 계정 표 + 편집·부서 이동·정지/사용·삭제
- [ ] 부서 표 + 편집·삭제·권한 화면 이동
- [ ] 부서 등록 시 초기 권한 복사 옵션
- [ ] 계정·권한 변경 이력 표
- [ ] 엑셀 다운로드
- [ ] (개선) 계정 목록 서버 페이징 · 키워드/부서/상태 필터
