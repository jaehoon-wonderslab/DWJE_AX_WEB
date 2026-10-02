# `/system/gw-dept-map` — 그룹웨어 부서 매핑

화면 ID: `sys-gw-dept` (기능 ID SY-17). `GwDeptMapView` → `useGwDeptMapController` → `systemRepository`(SY-17 구역).

> 문서 번호는 기획 02 의 8장 Q5(번호 규칙) 결정 전까지 42 로 둡니다. `docs/screens/README.md` 의 화면 표에는 아직 행이 없습니다.

## 구성

- 머리말: [엑셀 다운로드 · {현재 탭} ▾] · [새로고침]
- 경고(있을 때만): 미배정 부서를 찾지 못함(오류 톤) · 그룹웨어 인사정보 없음(정보 톤) · 목록 조회 실패(코드별 문구) · 조회 전용
- 요약 4카드: 그룹웨어 부서 · 매핑 없는 부서 · 미배정 계정(「고정 5개 화면 · 데이터 비공개 · 옮길 수 있음 N명」) · 최근 인사정보 동기화
- 탭: 부서 매핑 / 미배정 계정. 두 표 모두 공통 `TabulatorGrid`, 열 너비 유지, 카드 안 가로 스크롤.

## 2026-10 개선 (기획 02_sys-gw-dept, 결정 R-06·R-07·R-10·R-11·R-16)

### 재배정 대상 (GWD-01)

- 대상 = 고른 계정. 고른 계정이 없으면 **지금 표에 보이는 계정**(상단 검색·열 검색 적용 후) 중 제안 부서가 있는 계정입니다.
- 보이는 행은 표의 `dataFiltered` 이벤트로 받습니다(`view/useTableActive.js`). 공통 `TabulatorGrid` 에 `onFilteredChange` 가 생기면 그것으로 바꿉니다.
- 버튼: 「매핑대로 재배정 — 보이는 N명 중 M명」 / 「… 선택 N명 중 M명」. M=0 이면 비활성이고 요청을 보내지 않습니다.
- 확인 모달: 옮길 사람(최대 20명 + 「외 K명」), 부서별 인원. 결과 모달: 옮김·건너뜀(서버 `byDept`·`skipped`, 없으면 `items` 로 계산).
- 요청 본문은 사번을 항상 명시합니다 — `{ empNos: [...] }`. 1,000명을 넘고 검색·열 필터·선택이 하나도 없을 때만 `{ all: true }` 를 보냅니다. 빈 본문은 보내지 않습니다(서버도 400).

### 선택지·표기 (GWD-02·03·08)

- 매핑 지정·일괄 지정·부서 지정 모달의 부서 선택지에서 통합관리자 부서(`superAdmin` 또는 `systemRole=SUPER_ADMIN`)와 미배정 부서를 뺍니다.
- 요약 `health`: `unassignedDeptFound=false` 면 「미배정 부서('미배정')를 찾지 못했습니다 …」, `sourceExists=false` 또는 `sourceRowCnt=0` 이면 「그룹웨어 인사정보가 아직 들어오지 않았습니다(엔진 미실행) …」. 편집 버튼은 그대로 둡니다.
- 조회 실패 문구: `E-NOTFOUND` → API 미배포(404), `E-AUTH-002` → 조회 권한 없음(403), 그 밖은 서버 메시지.
- 머리말·요약·안내의 미배정 설명은 「대시보드·덕반장 AI·질의 이력만 쓸 수 있고 데이터 값은 비공개」 로 맞췄습니다(R-11).

### 조회 전용 (GWD-14)

요약 `canWrite=false`(값이 없으면 `/auth/me` 의 `writePerms`, 통합관리자는 항상 가능)이면 [지정]·[삭제]·[선택 N개 일괄 지정]·[매핑대로 재배정]·[부서 지정] 을 비활성으로 두고 툴팁 「이 화면의 쓰기 권한이 없습니다. 전산팀에 요청하세요.」 를 붙입니다. 선택 칸은 그리지 않습니다. 검색·엑셀·새로고침은 그대로입니다.

### 엑셀 옵션 패널 (GWD-15)

- 대상은 현재 탭이고, 버튼 문구에 탭 이름을 붙입니다. 파일 이름은 탭 이름(그룹웨어 부서 매핑 / 미배정 계정)입니다.
- 조회 목록: 보이는 행을 그리드 정렬·열 순서대로(선택 칸·관리 열 제외). 매핑의 「수정」 열은 「수정 일시」·「수정자」 두 열로 나눕니다.
- 전체: `GET /gw-dept-maps?size=0`, `GET /gw-dept-maps/unassigned-users?size=0` 를 검색어·상태 없이 다시 부릅니다. 상한 10,000행. 건수는 미배정 탭 = 요약 `unassignedUserCnt`, 매핑 탭 = 조건 없이 받은 목록일 때만 표시합니다.
- `attrs` 는 열 정의(`MAP_EXPORT`·`USER_EXPORT`)에서 만듭니다. 이력은 `scopeCd` VIEW/ALL, `condSummary` 「탭=미배정 계정 · 검색어=IPQC · 정렬 가입 일시↓」 / 「탭=미배정 계정 · 전체(조건 무시)」, `menuId=sys-gw-dept`.

### API 필드

| API | 요청 | 응답 |
| --- | --- | --- |
| GET `/system/gw-dept-maps/summary` | — | 기존 + `health{unassignedDeptFound,sourceExists,sourceRowCnt,engineDeptName}`, `canWrite` |
| POST `/system/gw-dept-maps/reassign` | `empNos[]` 또는 `all:true` (빈 본문 400, 최대 1,000) | `movedCnt, skippedCnt, items[{empNo,deptNm,gwDeptNm}], byDept[{deptNm,cnt}], skipped[{empNo,reason}]` |
| GET `/system/depts` | `size=0` | 행 `superAdmin`·`systemRole` |

이번 범위 밖: 매핑 저장 후 연쇄 이동·일괄 API(GWD-04·05), 조회 분리·디바운스(GWD-06), 결과 모달 [옮긴 목록 엑셀](GWD-07 나머지), GWD-09~13.

## 검증

```
WEB_URL=http://localhost:8081 node tests/system/gw-dept-map-browser.cjs
```

`page.route` 로 API 응답을 흉내 내므로 실 API 를 부르는 개발 서버(`npm run web`)에서 돌립니다. API 를 다른 포트에 띄웠다면 `API_URL=http://localhost:18081` 을 함께 주면 시험이 앱의 8080 호출을 그쪽으로 돌립니다.

## 2026-10 3단계 (P1: GWD-04·05·06·07)

- 조회 분리(GWD-06): 요약+부서 / 매핑 전체 / 미배정 계정 전체를 따로 받습니다(`size=0`, 조건 없음). 검색어·상태는 300ms 뒤 브라우저에서 거르므로 입력 중 요청이 나가지 않습니다. [조회] 단추는 없앴고, 탭 건수는 전체 수, 카드 부제는 「검색 결과 N건」(재조회 중 「갱신 중…」)입니다. 매핑 표 열 검색은 끕니다(상단 검색과 중복). 매핑 표의 미배정 수를 누르면 미배정 탭이 그 그룹웨어 부서 이름으로 검색된 채 열립니다.
- 매핑 지정 모달(GWD-04): 가입 제외면 AX 부서를 고를 수 없습니다. 그 부서에 미배정 계정이 있으면 「저장 후 이 부서 미배정 계정 N명도 {부서}(으)로 옮기기」(기본 체크). 체크하면 저장에 이어 `POST /reassign {gwDeptNms:[이름]}` 를 부르고 결과를 한 문장으로 알립니다. 초기 비밀번호 계정 수가 있으면 정보 안내만 붙이고 이동은 막지 않습니다(R-05).
- 일괄 지정(GWD-05): `PUT /system/gw-dept-maps/bulk {gwDeptNms, deptId?, joinYn}` 한 번(하나라도 오류면 0건 저장). 서버에 이 API 가 없으면(`E-NOTFOUND`) 예전처럼 한 건씩 저장합니다. `endpoints.js` 에 1건 추가했습니다.
- 재배정 결과 모달(GWD-07): [옮긴 목록 엑셀](사번·이름·그룹웨어 부서·옮긴 부서, 이력 `scopeCd=VIEW`·조건 「재배정 결과」). 부서 지정 403(`E-AUTH-002`)은 「미배정 계정만 옮길 수 있습니다」 로 알립니다.
- 엑셀 「전체」 는 이제 이미 받아 둔 전량을 씁니다(추가 요청 없음).
- 검증: `API_URL=http://localhost:18081 WEB_URL=http://localhost:8099 node tests/system/gw-dept-map-p1-browser.cjs` — 조회는 실 API, 쓰기(매핑 저장·일괄·재배정)만 가로챕니다.

## 2026-10 4단계 (P2: GWD-09·10·11·12·13)

- GWD-09 「최근 인사정보 동기화」 카드: `lastSync.stateCd` 배지(완료·실패·중단·진행 중·건너뜀), 실패면 강조와 「직전 성공 {lastJoin}」, 마지막 실행이 26시간보다 오래되면 「하루 1회 동기화가 멈췄을 수 있습니다」, `sys-sync` 권한이 있을 때만 [연동 이력 보기].
- GWD-10: 매핑 표 아래 접힌 「최근 매핑 변경」(최근 90일, `GET /system/perm-logs?actType=GW_DEPT_MAP`, 시각·그룹웨어 부서·변경 내용·수행자·구분). 지정 모달에 그 부서의 최근 이력 3건. 수정 열은 `updUserNm`(없으면 사번).
- GWD-11: 「그룹웨어에 없음」 행의 관리 열에 [이어받기](관리 열 140 → 200). 매핑 행이 없는 그룹웨어 부서 중에서 고르며, 사업장 표시를 뗀 이름이 같은 것이 먼저 옵니다. 저장은 `PUT /gw-dept-maps {gwDeptNm:새 이름, fromGwDeptNm:옛 이름, deptId, joinYn, remark}`.
- GWD-12 미배정 표: 상태 배지(사용 green · 잠김 amber · 정지 red · 퇴사 회색 — `retired` 또는 `stateReason=RETIRED`), 「초기 비밀번호」 열(110), 상태 선택(전체·사용·잠김·정지, 브라우저 거름), 「매핑 없음 →」 을 누르면 그 그룹웨어 부서의 지정 모달. 재배정 결과의 건너뜀 사유를 한글로 보입니다(정지·매핑 없음·미배정 아님 …). 요약 부제에 초기 비밀번호 수(`unassignedPwdInitCnt`, 없으면 목록에서 셈).
- GWD-13: `endpoints.js` 의 SY-17 머리 주석을 「API V45·V46 · 2026-09-30 구현(API b5a062e)」 으로 고쳤습니다. 이 문서와 브라우저 시험은 2단계에서 만들었습니다.
- 검증: `API_URL=http://localhost:18081 WEB_URL=http://localhost:8099 node tests/system/account-gw-p2-browser.cjs`
