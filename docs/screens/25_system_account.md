# `/system/account` — 계정 관리

화면 ID: `sys-account`. `AccountView` → `useAccountController` → `systemRepository`.

## 표와 검색

가입 승인 대기, 계정, 부서, 계정·권한 변경 이력은 공통 `AccountGrid`를 사용한다.

- 표마다 검색어와 페이지 상태가 독립적이다. 검색 버튼 또는 Enter로 서버 전체 목록을 검색하며 1쪽부터 표시한다.
- 계정·부서·변경 이력은 `size=0`으로 조회한 전체 결과에 Tabulator 열 필터와 로컬 페이징을 적용한다. 이름/상태 등 렌더링된 열도 검색하며 관리 버튼 열은 제외한다.
- 기본 10건, 25/50/100건 선택. 이력은 최근 10건으로 제한하지 않고 최근 90일 이력을 페이지별로 조회한다(API 기본 조회 범위).
- 검색 중 입력창과 기존 그리드를 유지한다. Enter 제출에도 입력 포커스를 유지한다.
- 열 사이 테두리와 드래그 손잡이를 제공한다. 긴 텍스트는 줄바꿈하고 최소 열 너비를 유지한다.
- 표 높이 460px. 넘치는 데이터는 그리드 내부에서 가로·세로 스크롤하며 헤더/본문의 가로 위치가 함께 이동한다.
- `Table`의 `contained` 옵션으로 외부/내부 이중 가로 스크롤을 방지한다.
- 카드 내부 패딩 20px, 카드 사이 간격 24px.

## 계정 등록·편집

아이디, 이름, 소속 부서, 직급, 상태와 수동 메뉴 설정을 제공한다. 편집 시 아이디는 읽기 전용이다.
별도의 부서 이동 버튼은 없으며 편집의 소속 부서에서 변경한다.

수동 메뉴 설정은 서버의 사용 중인 메뉴 선택지와 부서별 기본 권한을 가져온다. 메뉴명/그룹을 검색할 수 있으며, 부서 기본 권한은 해제할 수 없다. 수동으로 추가한 권한만 체크 해제로 제거한다. 부서 변경 시 기본 권한 표시도 바뀌며, 이미 추가한 계정 권한은 유지한다.

- 유효 메뉴 접근 = 부서 기본 메뉴 ∪ 계정 `extraMenuIds`.
- 데이터 접근 권한은 계속 부서 기준이다.
- 등록/수정 요청에 `extraMenuIds: string[]`를 전송한다. `[]`는 수동 허용 전체 해제, 필드 생략은 기존 값 유지라는 API 계약이다.
- 부서·계정 정보와 추가 메뉴 저장은 API의 한 트랜잭션으로 처리한다.
- 메뉴 조회 실패 시 편집을 열지 않고 오류를 표시하여 기존 권한을 빈 배열로 덮어쓰지 않는다.
- 본인 계정 편집 후 `/auth/me`를 재조회하여 화면 접근 권한을 갱신한다.
- 메뉴 선택지는 서버 목록을 사용하되 알려진 화면의 이름은 웹 메뉴 정의와 동일하게 표시한다.

## API

| 용도 | 경로 | 파라미터/응답 |
| --- | --- | --- |
| 요약 | GET `/system/accounts/summary` | 가입/상태/부서 수 |
| 계정 | GET `/system/users` | `keyword,page,size` → `items` + `meta`, 각 계정 `extraMenuIds` |
| 승인 대기 | GET `/system/users/pending` | `keyword,page,size` → `items` + `meta` |
| 부서 | GET `/system/depts` | `keyword,page,size`; 선택지는 `size=0`으로 전체 조회 |
| 변경 이력 | GET `/system/perm-logs` | `keyword,page,size` → `items` + `meta` |
| 메뉴 선택지 | GET `/system/menu-perms` | `screens[{id,name,group}],matrix{deptId:[menuId]}` |
| 계정 등록/수정 | POST `/system/users`, PUT `/system/users/{empNo}` | `name,deptId,pos,state,extraMenuIds` (등록 시 `empNo`) |

기존 승인/반려, 정지/사용, 계정/부서 삭제, 부서 권한 화면 이동은 유지한다. 엑셀 다운로드는 2026-10 개선에서 옵션 패널(조회 목록 / 전체)로 바뀌었다(아래 절).

## 검증

`WEB_URL=http://localhost:8092 node tests/system/account-grid-browser.cjs`

브라우저 fixture로 네 표의 서버 검색/페이징, 검색 포커스, 열 드래그, 1000px 화면의 마지막 열/헤더 동기 스크롤, 추가 메뉴 수정 요청을 검증한다. 실제 권한 판정은 API 통합 검증으로 별도 확인한다.

실서버 검증: `node tests/system/account-grants-live.cjs`와 `WEB_URL=http://localhost:8092 node tests/system/account-menu-live-browser.cjs` 통과. 임시 계정·부서는 검증 후 삭제하며 기존 계정 권한은 변경하지 않는다. 추가/해제, 빈 배열 해제 요청, 같은 토큰의 즉시 접근 반영, 부서 기본 메뉴와 데이터 권한 유지, 실패 시 원자 저장을 확인했다.

## 2026-09-14 추가 개선

- 계정·부서·변경 이력의 각 열에 필터 입력 추가. 카드 검색과 함께 사용할 수 있고, 열 필터는 페이지를 나누기 전에 적용한다.
- `Table`은 필터/페이지 전환으로 잠시 DOM에서 빠진 셀의 React 포털을 보존한다. 재등장한 행의 편집 버튼이 사라지지 않는다.
- 웹 폼의 select는 기본 HTML select로 표시하여 모달 ScrollView에 목록이 잘리거나 클릭이 가로채이는 문제를 방지한다. 선택값은 원래 숫자/문자열 타입으로 전달한다.
- 계정 편집의 새 비밀번호/확인은 서버 `summary.canChangePassword`가 true인 관리자에게만 표시한다. 두 값이 일치해야 전송하며 빈 입력이면 기존 비밀번호를 유지한다. 확인값은 서버에 전송하지 않는다.
- 관리자 판정/정책 검증/해시 저장은 API가 담당한다. 전산 부서의 기본 계정 관리 권한자 또는 통합관리자가 변경할 수 있다.

## 2026-10 개선 (기획 01_sys-account, 결정 R-02·R-04·R-06·R-07·R-10·R-11·R-16)

### 읽기 전용 상태

버튼은 숨기지 않고 비활성으로 두며, 마우스를 올리면 이유를 툴팁으로 보입니다(`view/WriteGuard.jsx` 의 `GuardedButton`).

| 조건 | 비활성 대상 | 이유 문구 |
| --- | --- | --- |
| 쓰기 권한 없음(ACC-15) — 요약 `canWrite=false`, 요약에 값이 없으면 `/auth/me` 의 `writePerms`, 통합관리자는 항상 가능 | 머리말 [부서 등록]·[계정 등록], 표의 [편집]·[정지/사용/잠금 해제]·[삭제]·[승인]·[반려], 부서 [편집]·[삭제] | 이 화면의 쓰기 권한이 없습니다. 전산팀에 요청하세요. (머리말 아래에도 같은 안내) |
| 본인 계정 편집(ACC-02, 통합관리자 제외) | 소속 부서(정적 표기), 수동 메뉴 | 본인 계정의 부서와 추가 메뉴는 다른 관리자가 바꿔야 합니다. |
| 시스템 부서(ACC-04, `systemRole`) | 부서 [삭제], 미배정 부서명 | 통합관리자·미배정 부서는 삭제할 수 없습니다 … |
| 미배정 계정·미배정으로 옮기는 편집(ACC-14) | 수동 메뉴 전체. 실부서 → 미배정으로 바꾸면 체크가 풀리고 「저장하면 수동 허용 N개가 회수됩니다」, 저장 시 `extraMenuIds: []` | 미배정 계정은 대시보드 3개·덕반장 AI·자연어 질의 이력만 … |
| 통합관리자가 아님(ACC-16, R-07) | 관리 화면 4종(`sys-account`·`sys-menu`·`sys-data`·`sys-gw-dept`) 줄 — 체크 상태는 유지 | 통합관리자만 변경 |

엑셀·검색·열 필터는 쓰기 권한과 관계없이 쓸 수 있습니다(R-10).

### 표와 폼

- 계정 표 열: 아이디 · 이름 · 소속 부서 · 직급 · 상태(150, 사유 배지) · 초기 비밀번호(110, 「변경 전」) · 로그인 실패 · 최근 접속 · 관리(270). 표 최소 폭 1450px, 카드 안 가로 스크롤.
- 상태 배지(ACC-05): 사용 green · 잠김 amber(자물쇠) · 정지 red + 사유(퇴사·반려·관리자 정지) · 승인 대기 amber. 상태 열 필터는 「정지 · 퇴사」 같은 표기(`stateLabel`)로 찾습니다.
- 행 버튼: 잠김은 [잠금 해제](잠긴 시각·마스킹 이메일·「비밀번호도 초기화」 선택, `mailEnabled=false` 면 「이메일 잠금 해제는 메일 서버 설정 후 열립니다」), 사용은 [정지](사유 선택 입력 200자), 정지는 [사용], 승인 대기는 비활성.
- 편집 모달: 잠긴 계정은 상태 라디오 대신 정적 안내를 둡니다(잠김을 고를 수 없음). 「비고 추가」 는 기존 비고에 `[yyyy-MM-dd] 내용` 으로 덧붙여 `remark` 로 보냅니다.
- 소속 부서 선택지에서 통합관리자 부서는 통합관리자에게만 보입니다(편집 대상이 이미 그 부서면 그 값만 남김).
- 계정 등록: 폼 안내와 성공 토스트에 「초기 비밀번호는 `사번!Dwje1234` 이며 첫 로그인 때 바꿔야 다른 화면을 쓸 수 있습니다」(ACC-03).
- 부서 표 열: 부서(「시스템」·「고정 권한 · 변경 불가」 배지, 툴팁에 허용 화면 5개·데이터 0건) · 약칭 · 설명 · 소속 계정 · 메뉴 권한(110) · 데이터 권한(110) · 관리. 통합관리자 「전체」, 미배정 「5(고정)」·「0(고정)」. 표 최소 폭 1200px.
- 부서 폼: 약칭 「최대 4자」 검증, 미배정 부서명은 정적 표기(요청에 `deptNm` 을 넣지 않음), 초기 권한 복사 선택지에서 시스템 부서 제외.
- 메뉴 선택기 그룹은 서버 `screens[].group` 을 쓰고, 없을 때만 웹 메뉴 정의의 그룹으로 채웁니다. 이력 문장의 `[화면 ID]` 는 화면 이름으로 바꿔 보입니다.

### 엑셀 옵션 패널 (ACC-17)

`[엑셀 다운로드 ▾]` → 「조회 목록 다운로드(n건)」 · 「전체 다운로드(N건)」.

- 조회 목록: 계정 표는 로컬 쪽 나눔이므로 검색어·열 필터를 적용한 **모든 쪽**의 행을, 그리드 정렬·열 순서 그대로 받습니다(관리 열 제외). n = 열 필터 후 행 수.
- 전체: `GET /system/users?size=0` 을 검색어 없이 다시 부릅니다. N = 요약 `userCnt.total`. 상한 10,000행, 넘으면 「상한 10,000건까지 내려받았습니다」.
- `attrs` 는 열 정의(`USER_EXPORT_COLUMNS`)에서 만들고, 상태·초기 비밀번호는 화면과 같은 한글로 씁니다.
- 이력: `scopeCd` VIEW/ALL, `condSummary` 예 「검색어=김 · 열 필터 상태=잠김 · 정렬 로그인 실패↓」 / 「전체(조건 무시)」, `menuId=sys-account`.

### 이번에 쓰는 API 필드

| API | 요청 | 응답 |
| --- | --- | --- |
| GET `/system/accounts/summary` | — | `userCnt{total,active,locked,suspended,pending}`, `pwdChangeRequiredCnt`, `currentUser.superAdmin`, `canChangePassword`, `canWrite`, `mailEnabled` |
| GET `/system/users` | `keyword,size=0` | 행 `state`(LOCKED 포함)·`stateReason`·`pwdChangeRequired`·`lockedAt`·`emailMasked`·`remark`·`extraMenuIds` |
| PATCH `/system/users/{empNo}/state` | `state`(ACTIVE·SUSPENDED), `reason?`, `resetPassword?` | `state, loginFailCnt, pwdChangeRequired, unlocked` |
| GET `/system/depts` | `size=0` | 행 `superAdmin`·`systemRole`·`lockedPerms`·`fixedMenus`·`fixedDataFields`·`menuCnt`·`dataCnt` |
| PUT `/system/users/{empNo}` | `remark`(덧붙인 전체), 미배정이면 `extraMenuIds: []` | 기존 |

서버가 `systemRole` 을 아직 주지 않으면 `superAdmin` 과 부서명 「미배정」 으로 같은 값을 만듭니다. 승인 모달 부서 선택·빠른 필터·가입 경로 열·이력 필터(ACC-06~09)와 ACC-10~13 은 이번 범위 밖입니다.

### 검증

```
WEB_URL=http://localhost:8081 node tests/system/account-grid-browser.cjs
WEB_URL=http://localhost:8081 node tests/system/account-guard-browser.cjs
WEB_URL=http://localhost:8081 node tests/system/account-export-browser.cjs
```

세 시험은 `page.route` 로 API 응답을 흉내 내므로 실 API 를 부르는 개발 서버(`npm run web`)에서 돌립니다. API 를 다른 포트에 띄웠다면 `API_URL=http://localhost:18081` 을 함께 주면 시험이 앱의 8080 호출을 그쪽으로 돌립니다. 목 모드(`npm run web:mock`)는 네트워크를 타지 않아 가로채기가 걸리지 않습니다.

## 2026-10 3단계 (P1: ACC-06·07·08·09)

- 요약 4카드: 가입 계정(부제 「사용 · 잠김 · 정지 · 승인 대기」) · 승인 대기 · **미배정 계정**(서버 `unassignedCnt`, 없으면 미배정 부서 소속 수. 0 이 아니면 강조, `sys-gw-dept` 권한이 있을 때만 [그룹웨어 부서 매핑 →]) · 부서.
- 계정 표 빠른 필터: 전체 / 미배정 / 잠김·정지 / 초기 비밀번호 / 자동 가입. 「미배정」 은 서버 조건 `deptId` 로 부르고, 나머지는 받은 전량에서 거릅니다(2단계 서버의 `state` 는 한 값만 받고 `joinSrc` 조건이 없어서). 서버가 지원하면 서버 조건으로 옮깁니다.
- 계정 표에 「가입 경로」 열(110)을 추가했습니다. 서버 `joinSrc` 가 정본이고, 없으면 비고가 「그룹웨어 자동 가입」 으로 시작하는 계정만 「자동 가입」 으로 표시합니다. 표 최소 폭 1560px. 엑셀 열에도 들어갑니다.
- 편집 모달: 미배정 계정이면 안내와 [그룹웨어 부서 매핑으로 이동], 부서를 바꾸면 「이동 후 메뉴 N개(현재 부서 대비 +a/-b) · 데이터 항목 M개(±)」(메뉴 권한 매트릭스와 부서 `dataCnt` 로 계산, perm-compare 를 부르지 않음), 아래에 [이 계정의 최근 이력](대상 사번 조건으로 이력을 다시 부르고 이력 카드로 이동).
- 승인 대기 표: 이메일(200/160, 서버가 가린 값) · 신청 일시(150) 열, 최소 폭 1110px. [승인] 은 승인 부서 선택 모달(기본 신청 부서, 통합관리자 부서는 통합관리자에게만)이고, 다른 부서를 고르면 본문에 `deptId` 를 넣습니다. 계정 표의 승인 대기 행은 [승인 처리] 로 승인 대기 카드로 옮깁니다.
- 변경 이력: 기간(기본 최근 90일, 최대 365일, 넘으면 안내 후 조회하지 않음) · 구분(SYS_PERM_ACT 공통코드) · 대상 사번 조건 → `from`·`to`·`actType`·`target`. 구분 이름은 서버 `actNm`, 없으면 공통코드 이름(화면의 고정 표기 표는 지웠습니다).
- 2단계 계약 차이: `GET /system/depts` 의 `lockedPerms` 가 통합관리자 부서에서도 true 이므로 「고정 권한 · 변경 불가」 배지와 고정 권한 문구는 `systemRole=UNASSIGNED` 로만 판정합니다.
- 검증: `API_URL=http://localhost:18081 WEB_URL=http://localhost:8099 node tests/system/account-p1-browser.cjs` — 조회는 실 API, 승인·수정만 가로챕니다.

## 2026-10 4단계 (P2: ACC-10·11·12·13) · 3단계 계약 맞춤

- 3단계 서버 계약에 맞췄습니다: 빠른 필터 「잠김·정지」 는 `state=LOCKED,SUSPENDED`, 「자동 가입」 은 `joinSrc=GROUPWARE`, 「미배정」 은 `deptId` 로 부릅니다(「초기 비밀번호」 만 브라우저에서 거름). 이력의 대상 사번 조건은 `targetUserId`(정확 일치)입니다.
- ACC-10: 수동 메뉴 선택기에서 새로 켠 메뉴 옆에 「부여 사유」(200자) 입력칸을 둡니다. 저장 본문에 `extraMenuReasons{menuId: 사유}` 를 넣고(새로 켠 것만), 서버 `extraMenus[{id, reason}]` 가 오면 줄 옆에 사유를 보입니다. 계정 표에 「추가 메뉴」 열(110, 개수 배지, 마우스를 올리면 화면 이름·사유). 부서 표 [메뉴 권한]·[데이터 권한] 은 `deptId` 를 주소로 넘깁니다(받는 화면 강조는 03·04 소관). 계정 표 최소 폭 1670px.
- ACC-11: [삭제] 는 `GET /system/users/{empNo}/delete-check`(신규, endpoints +1)로 먼저 건수를 받아 「알림 수신자 N건이 함께 지워집니다」·「퇴사·휴직이면 삭제 대신 정지를 권합니다」·자동 가입 안내를 보이고, 막는 참조(서빙 프로필·문서 작성자)가 있으면 [삭제] 를 비활성으로 둡니다. [정지로 바꾸기] 도 같은 모달에 있습니다. 서버에 API 가 없으면 기본 안내만 보입니다.
- ACC-12: 동작별로 다시 부르는 범위를 좁혔습니다 — 계정 동작은 요약·계정·이력(정지 1회 = 요청 4건), 부서 동작은 요약·부서·이력, 승인·반려는 승인 대기도. 부서 선택지는 부서 표와 같은 응답(검색어 없이 받은 것)을 씁니다. 전량 조회(`size=0`)에는 `page` 를 붙이지 않습니다 — 부서 목록이 `page=1&size=0` 을 1건으로 돌려주는 것을 18081 에서 확인했습니다.
- ACC-13(회원가입): 사번 중복 확인 응답에 `reason=GROUPWARE_JOINED` 가 오면 안내 아래에 [로그인 화면으로] 를 보입니다.
- 검증: `API_URL=http://localhost:18081 WEB_URL=http://localhost:8099 node tests/system/account-gw-p2-browser.cjs`

## 2026-10-02 R-17 SMTP 메일 발송 반영 (공통 문서 11.1)

- SMTP 가 설정되어 요약 `mailEnabled=true` 입니다. [잠금 해제] 모달 안내는 「사용자가 이메일 인증으로 직접 풀 수 있습니다 · 관리자 해제도 가능합니다.」 이고, `mailEnabled=false` 일 때만 예전 「메일 서버 설정 후 열립니다」 안내를 보입니다.
- 요약 `mailLastFailAt` 이 있으면 화면 위에 오류 톤 경고 「최근 메일 발송 실패 {시각} — 한비로 SMTP 계정이 32일 미로그인으로 꺼졌는지 확인하세요 …」 를 띄웁니다. 조치할 수 있는 이 화면의 쓰기 권한자(통합관리자·전산팀)에게만 보입니다.
- 운영 주의: 전산팀이 한 달에 한 번 이상 웹메일에 로그인해야 SMTP 계정이 꺼지지 않습니다.
- 검증: `API_URL=http://localhost:18081 WEB_URL=http://localhost:8099 node tests/system/account-mail-browser.cjs`(요약·목록은 page.route 로 흉내 냄)
