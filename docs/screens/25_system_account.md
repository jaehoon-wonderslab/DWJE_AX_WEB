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

기존 승인/반려, 정지/사용, 계정/부서 삭제, 부서 권한 화면 이동은 유지한다. 엑셀 다운로드는 현재 조회된 계정 페이지를 내려받는다.

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
