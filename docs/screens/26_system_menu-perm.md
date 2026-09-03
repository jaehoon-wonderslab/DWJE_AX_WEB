# 26. `/system/menu-perm` — 메뉴 접근 권한

| 항목 | 값 |
| :--- | :--- |
| URL | `/system/menu-perm` |
| 화면 ID | `sys-menu` |
| 라우트 파일 | `app/(main)/system/menu-perm.jsx` |
| MVC | `domains/system/view/MenuPermView.jsx` · `controller/useMenuPermController.js` |
| 기능 ID | SY-02 |
| 접근 권한 | 전산팀 · 통합관리자 |

체크를 바꾸면 그 부서 **모든 계정의 좌측 메뉴가 즉시** 바뀌고, 권한 없는 화면은 **주소로 직접 접근해도 차단**됩니다.

## 1. 컴포넌트

`PageHead`(+엑셀 다운로드 · 계정 관리 · 데이터 접근 권한 · **부서 권한 복사**(primary)) · `StatCard`×4 · `Hint` · `Card(tight)`+`PermMatrix`(maxHeight 620) · `Card(tight)`+`Table`(부서별 적용 현황) · `openFormModal`(권한 복사)

## 2. 화면에 출력해야 하는 정보

### 2-1. 요약 카드

관리 대상 화면(`screens.length`, 보조 `메뉴 N · 하위 M`) · 부서(`depts.length`) · 내 부서 접근(`myCount`, 보조 부서명) · 전체 평균(`avgCount`, 보조 "부서당 접근 화면")

### 2-2. 권한 매트릭스 (`GET /system/menu-perms`)

- 행 : `screens[{id, name, group, sub}]` — `sub=1` 인 **하위 화면은 회색 행**
- 열 : `depts[{id, name, abbr}]` — `adminDepts` 에 포함된 부서는 **열 잠금**(`locked`)
- 셀 : `matrix[deptId].includes(screenId)` 체크박스
- 그룹 헤더에서 **그룹 일괄 토글** 지원
- 푸터 : `접근 허용 화면 수` = `matrix[deptId].length`

`Hint` : "회색 행은 메뉴에 노출되지 않지만 버튼·링크로 진입하는 하위 화면입니다. 상위 화면만 열고 하위 화면을 닫으면 해당 버튼을 눌렀을 때 접근이 차단되므로 함께 열어 두는 것을 권장합니다."

### 2-3. 부서별 적용 현황 (`GET /system/menu-perms/dept-status`)

부서 · 접근 허용 · 전체 화면 · 영향 계정 · 비율(`ProgressBar`)
부제 : "권한 변경이 실제로 몇 개 계정에 영향을 주는지"

## 3. 버튼 및 페이징

| 버튼 | 동작 |
| :--- | :--- |
| 셀 체크 | `PUT /system/menu-perms` (deptId · screenId · allowed) |
| 그룹 일괄 토글 | `PUT /system/menu-perms/group` (deptId · groupNm · allowed) |
| 부서 권한 복사 | 폼(원본 부서 / 대상 부서) → `POST /system/menu-perms/copy` |
| 엑셀 다운로드 | `메뉴 그룹 · 화면 · 부서별 O/-` xls |
| 계정 관리 / 데이터 접근 권한 | 화면 이동 |

페이징 없음 (매트릭스 내부 스크롤).

복사 폼 안내 : "대상 부서의 기존 메뉴 권한은 덮어쓰기 됩니다. 데이터 접근 권한은 함께 복사되지 않으며, 데이터 접근 권한 화면에서 별도로 설정합니다."

## 4. 그 밖의 기능

- **변경 즉시 반영** — 성공하면 목록 재조회 + `GET /auth/me` 재호출 → `setMe()` 로 **사이드바가 그 자리에서 갱신**됩니다.
- 통합관리자(전 권한) 부서 열은 잠겨 있어 해제할 수 없습니다.

## 5. 사용 API

총 **5건**

**메뉴 접근 권한** — 5건

| # | 서비스 함수 | API 명 | Method | Path | 요청 파라미터 | 응답 주요 필드 | 접근 권한 | blind | 우선순위 |
|---|---|---|---|---|---|---|---|---|---|
| 140 | `getSystemMenuPerms` | 메뉴 권한 매트릭스 조회 | GET | `/api/v1/system/menu-perms` | — | screens[{id,name,group,sub}], depts[], matrix{deptId:[screenId]} | 전산팀·통합관리자 | — | 1 |
| 141 | `putSystemMenuPerms` | 메뉴 권한 단건 변경 | PUT | `/api/v1/system/menu-perms` | deptId, screenId, allowed | success | 전산팀·통합관리자 | — | 1 |
| 142 | `putSystemMenuPermsGroup` | 메뉴 권한 그룹 일괄 변경 | PUT | `/api/v1/system/menu-perms/group` | deptId, groupNm, allowed | changedCnt | 전산팀·통합관리자 | — | 1 |
| 143 | `postSystemMenuPermsCopy` | 부서 메뉴 권한 복사 | POST | `/api/v1/system/menu-perms/copy` | fromDeptId, toDeptId | copiedCnt | 전산팀·통합관리자 | — | 1 |
| 144 | `getSystemMenuPermsDeptStatus` | 부서별 적용 현황 | GET | `/api/v1/system/menu-perms/dept-status` | — | items[{deptId,menuCnt,dataCnt,userCnt}] | 전산팀·통합관리자 | — | 2 |


## 6. 개발 체크리스트

- [ ] 요약 4카드
- [ ] `PermMatrix` — 하위 화면 회색 행 · 관리자 열 잠금 · 그룹 일괄 토글 · 푸터 합계
- [ ] 단건/그룹 변경 API 연동
- [ ] 변경 후 `/auth/me` 재조회 → 사이드바 즉시 반영
- [ ] 부서 권한 복사 폼
- [ ] 부서별 적용 현황 표(영향 계정 수)
- [ ] 엑셀 다운로드
