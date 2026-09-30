# API 요청 — 그룹웨어 부서 매핑 관리 화면 (SY-17) (2026-09-30, WEB → API)

## 배경

MES 이관 엔진이 그룹웨어 인사정보(`groupware_user.tb_user_list`)를 받을 때 AX 에 없는 사번을 자동으로 가입시킵니다
(`GroupwareAxJoinWriter`). 가입 부서는 API `V45__groupware_auto_join.sql` 이 만든 매핑표 `ax.tb_sys_dept_gw_map` 으로 정하고,
매핑이 없는 사람은 화면 권한이 없는 '미배정' 부서로 들어갑니다.

지금은 매핑표를 SQL 로만 고칠 수 있고, 미배정으로 들어간 계정을 한눈에 볼 방법이 없습니다. 그래서 관리자 메뉴에
**[시스템관리 > 그룹웨어 부서 매핑]** 화면을 추가했습니다(웹 반영 완료, 목 모드에서 동작 확인). 이 화면이 쓰는 API 6건,
화면 행 1건, 권한 조정 2건을 요청합니다.

- 화면 ID `sys-gw-dept` · 경로 `/system/gw-dept-map` · 기능 ID `SY-17-F01~F06`
- 웹 카탈로그 키: `getSystemGwDeptMapsSummary` · `getSystemGwDeptMaps` · `putSystemGwDeptMaps` · `deleteSystemGwDeptMaps` ·
  `getSystemGwDeptMapsUnassignedUsers` · `postSystemGwDeptMapsReassign` (`src/services/api/endpoints.js`)
- 응답은 기존 `ApiResponse` 형식, 시각은 프로젝트 공통 `yyyy-MM-dd HH:mm` (KST) 입니다.

## 전제 — 매핑은 가입 순간에만 쓴다

V45 주석 그대로입니다. 매핑을 바꿔도 이미 가입된 계정의 부서는 바뀌지 않습니다. 그래서 화면에는 두 가지 동작이 있습니다.

1. 매핑표 편집 — 다음 동기화부터 새로 가입하는 사람에게만 적용됩니다.
2. 미배정 계정 옮기기 — 지금 매핑대로 한꺼번에 옮기거나(요청 6), 한 명씩 직접 부서를 고릅니다(기존 계정 부서 이동 API).

'미배정' 부서는 엔진 설정 `migration.groupware.ax-join.default-dept-name` 과 같은 이름으로 찾아 주십시오.
기본값은 `미배정` 입니다. 웹은 이름을 직접 쓰지 않고 요약 응답의 `unassignedDept` 를 씁니다.

## 요청 1) `GET /api/v1/system/gw-dept-maps/summary`

```json
{
  "gwDeptCnt": 77, "mappedCnt": 14, "unmappedCnt": 60, "excludedCnt": 3,
  "unmappedUserCnt": 212, "unassignedUserCnt": 185,
  "unassignedDept": { "deptId": 7, "deptNm": "미배정" },
  "lastSyncAt": "2026-09-30 02:10",
  "lastJoinMessage": "AX 가입 19(미배정 7) / 이미 가입 13 / 제외 부서 23"
}
```

| 필드 | 정의 |
|---|---|
| `gwDeptCnt` | `tb_user_list` 에서 재직자(`NOT is_retired`)가 있는 부서명 수 |
| `mappedCnt` | 그중 매핑 행이 있고 `join_yn='Y'` · `dept_id` 가 있는 부서 수 |
| `unmappedCnt` | 그중 매핑 행이 없거나 `dept_id` 가 비어 있고 `join_yn='Y'` 인 부서 수(가입하면 미배정) |
| `excludedCnt` | 그중 `join_yn='N'` 인 부서 수 |
| `unmappedUserCnt` | `unmappedCnt` 부서의 재직자 수 |
| `unassignedUserCnt` | 지금 미배정 부서에 속한 `ax.tb_sys_user` 계정 수 |
| `lastSyncAt` · `lastJoinMessage` | 가장 최근 그룹웨어 동기화 실행의 시작 시각과 `AxJoinResult.summary()` 문자열. 엔진이 `tb_sync_run.message` 에 남기는 값을 그대로 주시면 됩니다. 없으면 `null` |

## 요청 2) `GET /api/v1/system/gw-dept-maps`

쿼리: `keyword`(그룹웨어 부서명·AX 부서명·메모 부분 일치), `state`(`MAPPED`|`UNMAPPED`|`EXCLUDED`), `page`, `size`. 웹은 `size=0`(전체)으로 부릅니다.

행은 **그룹웨어 부서명(재직자 기준) ∪ 매핑표 행** 입니다. 매핑 행이 없는 그룹웨어 부서도 한 줄로 나와야 합니다.

```json
{ "items": [ {
  "gwDeptNm": "IPQC파트(M)", "activeCnt": 6, "joinedCnt": 2, "unassignedCnt": 2,
  "deptId": null, "deptNm": null, "joinYn": "Y", "state": "UNMAPPED", "remark": null,
  "hasRow": false, "inSource": true, "updDate": null, "updUser": null
} ] }
```

- `activeCnt`: 이 부서명의 재직자 수 / `joinedCnt`: 그중 `ax.tb_sys_user` 에 같은 사번이 있는 수 / `unassignedCnt`: 그중 미배정 부서 계정 수
- `state`: `join_yn='N'` → `EXCLUDED`, `dept_id` 있음 → `MAPPED`, 그 외(행 없음 포함) → `UNMAPPED`
- `hasRow`: 매핑 행 존재 여부(웹은 이 값으로 [삭제] 버튼을 보입니다)
- `inSource`: 재직자가 있는 부서명인지. `false` 는 그룹웨어에서 사라진 부서의 매핑 행입니다(시드의 '퇴사자 로그인 불가 x' 등)
- `updUser` 는 사번 그대로 두셔도 됩니다.

## 요청 3) `PUT /api/v1/system/gw-dept-maps` — 저장(upsert)

본문 `{ "gwDeptNm": "IPQC파트(M)", "deptId": 1, "joinYn": "Y", "remark": "발주자 확인 2026-09-30" }`

- 부서명에 괄호·공백이 있어 경로 변수 대신 본문으로 받습니다.
- **웹 클라이언트는 빈 값(`null`·`''`)을 요청에서 뺍니다.** `deptId`·`remark` 가 없으면 `null` 로 저장하는 전체 덮어쓰기로 처리해 주십시오
  (`deptId` 없음 = 미배정, `remark` 없음 = 비움).
- `joinYn='N'` 이면 웹은 `deptId` 를 보내지 않습니다.
- 검증: `gwDeptNm` 필수(최대 100자, 그룹웨어 부서명과 글자 그대로 비교하므로 trim 하지 말아 주십시오) · `deptId` 가 `ax.tb_sys_dept` 에 없으면 400 ·
  `deptId` 가 미배정 부서면 400(비워 두는 것이 미배정입니다) · 통합관리자 부서(`is_super_admin`)는 400 을 권합니다(자동 가입 계정이 전체 권한을 받지 않도록).
- `upd_user`·`upd_date` 갱신, `ax.tb_sys_perm_log` 에 한 줄(대상 = 그룹웨어 부서명, 유형 = 부서 매핑).
- 응답 `{ "gwDeptNm": "...", "state": "MAPPED" }`, 메시지에 "이미 가입된 계정의 부서는 바뀌지 않습니다" 취지를 넣어 주시면 웹이 그대로 토스트로 띄웁니다.

## 요청 4) `DELETE /api/v1/system/gw-dept-maps?gwDeptNm=...`

- 행 삭제. 없으면 404(`E-NOTFOUND`). 권한 변경 이력 한 줄.
- 삭제 후 그 부서 사람은 다음 가입부터 미배정입니다(엔진 `COALESCE(m.join_yn,'Y')` 동작 그대로).

## 요청 5) `GET /api/v1/system/gw-dept-maps/unassigned-users`

쿼리: `keyword`(사번·이름·그룹웨어 부서명), `page`, `size`(웹은 0).

```json
{ "items": [ {
  "empNo": "20250311", "name": "문하늘", "gwDeptNm": "IPQC파트(M)",
  "pos": "STAFF", "posNm": "사원", "state": "ACTIVE", "stateNm": "사용",
  "joinedAt": "2026-09-30 02:10", "lastLoginAt": null,
  "suggestDeptId": 1, "suggestDeptNm": "품질보증팀"
} ] }
```

- 대상: 미배정 부서에 속한 `ax.tb_sys_user` 전체(자동 가입이 아닌 계정이 옮겨져 있어도 포함).
- `gwDeptNm`: `tb_user_list.empno = user_id` 로 붙인 부서명(없으면 `null`).
- `suggestDept*`: 지금 매핑표에서 그 부서가 `join_yn='Y'` 이고 `dept_id` 가 있으면 그 부서, 아니면 `null`.
- `joinedAt`: `tb_sys_user.ins_date`.

## 요청 6) `POST /api/v1/system/gw-dept-maps/reassign` — 매핑대로 재배정

본문 `{ "empNos": ["20250311", "20240902"] }`. **빈 배열은 요청에서 빠집니다** → `empNos` 가 없으면 "제안 부서가 있는 미배정 계정 전체" 로 처리해 주십시오.

- 미배정 부서 계정만 옮깁니다. 다른 부서 사번이 섞여 오면 건너뜁니다(`skippedCnt`).
- 옮기는 방식은 기존 `PUT /system/users/{empNo}/dept` 와 같게 해 주십시오. 새 부서 권한 즉시 적용, `tb_sys_perm_log`·`tb_log_audit` 기록.
- 한 트랜잭션. 응답 `{ "movedCnt": 2, "skippedCnt": 0, "items": [ { "empNo": "20250311", "deptNm": "품질보증팀" } ] }`
- 옮길 계정이 0명이어도 200 과 `movedCnt: 0` 을 주십시오(웹이 메시지만 보여 줍니다).

## 화면 행 · 권한

1. **`ax.tb_sys_menu` 화면 행** (새 마이그레이션, V42 의 메뉴 목록과 같은 모양)
   ```sql
   ('sys-gw-dept', '그룹웨어 부서 매핑', 'system', NULL, false, '/system/gw-dept-map', 'NEW', 12)
   ```
   웹 사이드바 순서는 `menu.js` 기준(계정 관리 바로 아래)이라 `sort_seq` 는 권한 매트릭스 순서만 정합니다. 편하신 값으로 바꾸셔도 됩니다.
   부서 권한은 **전산팀에 `sys-gw-dept` 부여**를 요청합니다(웹 목 모드 기본값도 전산팀에 넣었습니다). 통합관리자는 전체 허용이라 따로 넣지 않습니다.
   `MenuId` 에 `SYS_GW_DEPT = "sys-gw-dept"` 를 추가하고, 요청 1~6 은 `requireMenu(MenuId.SYS_GW_DEPT)` 로 막아 주십시오.
2. **기존 API 2건의 허용 화면 추가.** 이 화면은 부서 선택지와 한 명씩 옮기기에 기존 API 를 씁니다. 지금은 `sys-account` 만 허용이라,
   `sys-gw-dept` 만 가진 사람은 선택지가 비고 [부서 지정] 이 403 이 납니다.
   - `GET /api/v1/system/depts` — 지금 `requireAnyMenu(SYS_ACCOUNT, SYS_MENU, SYS_DATA)` 에 `SYS_GW_DEPT` 추가
   - `PUT /api/v1/system/users/{empNo}/dept` — `SystemUserService.changeUserDept` 의 `requireMenu(SYS_ACCOUNT)` 를 `requireAnyMenu(SYS_ACCOUNT, SYS_GW_DEPT)` 로. 범위를 좁히시려면 `sys-gw-dept` 로 들어온 요청은 **미배정 부서 계정만** 옮길 수 있게 해 주셔도 됩니다.

## 참고 — 엔진 쪽과 맞춰야 할 것

- 미배정 부서 이름은 엔진 설정값과 API 가 같은 값을 봐야 합니다. API 에도 같은 설정 키를 두시거나, 이름 `미배정` 을 상수로 두고 엔진 기본값과 맞춰 주십시오.
- 요약의 `lastJoinMessage` 를 주려면 엔진이 그룹웨어 동기화 실행 결과를 `tb_sync_run` 에 남겨야 합니다
  (MES_migration_engine 작업 중인 `sql/05_sync_run_mode_groupware.sql` 확인 부탁드립니다). 없으면 `null` 로 두셔도 화면은 동작합니다.

## 웹 쪽 준비 (완료)

- 화면 `app/(main)/system/gw-dept-map.jsx`, MVC `useGwDeptMapController` · `GwDeptMapView` · `systemRepository.loadGwDeptMap` 등
- 카탈로그·서비스·목 응답을 위 필드명으로 만들어 두었습니다. 실 서버에 API 가 올라오면 설정 변경 없이 붙습니다.
- API 가 없을 때(404) 화면은 상단에 "일부 목록을 받지 못했습니다" 안내를 띄우고 빈 표로 열립니다.

## 부탁

확인·수정 의견이나 반영 완료 시점을 이 파일 끝에 `## API 회신` 제목으로 이어서 적어 주십시오(로컬 8080 반영 시점 포함).

## API 회신

2026-09-30 API 반영 완료 — 커밋 `b5a062e`(API, 푸시 전). 요청 1~6, 화면 행·전산팀 권한, 기존 API 2건 허용 화면 추가를 모두 명세대로 넣었습니다.
필드명·응답 모양은 명세와 같습니다. 다른 점과 정한 점만 적습니다.

### 반영 상태

| 대상 | 상태 |
|---|---|
| 로컬 DB (`dwje-pg`) | V45·V46 적용 완료 |
| 로컬 API | **8080 은 띄워져 있지 않았습니다.** 같은 jar 를 18080 으로 띄워 6건 + 기존 2건을 실제 호출로 확인했고, 시험 데이터는 되돌렸습니다. 8080 을 다시 띄우면 그대로 붙습니다 |
| 운영 (192.168.2.8) | **V46 미적용** — V45 와 빈 `groupware_user.tb_user_list` 는 들어갔지만(09-30) 화면 행이 없어 이 API 는 운영에서 통합관리자만 닿습니다. 운영 API 도 아직 이전 빌드입니다 |
| 테스트 | API 전체 327건 통과(새 `GwDeptMapServiceTest` 9건 포함) |

### 화면 행 · 권한 (V46__sys_gw_dept_menu.sql)

- `('sys-gw-dept', '그룹웨어 부서 매핑', 'system', NULL, false, '/system/gw-dept-map', 'NEW', 12)` — 제안하신 값 그대로
- 전산팀(`dept_nm = '전산팀'`)에 `sys-gw-dept` 열람 권한 1행. 통합관리자는 넣지 않았습니다
- 권한 변경 이력 구분 코드 `SYS_PERM_ACT / GW_DEPT_MAP`(이름 "그룹웨어 부서 매핑") 추가. 이력의 `target_kind_cd` 는 `GW_DEPT`
- `MenuId.SYS_GW_DEPT = "sys-gw-dept"`, 요청 1~6 은 `requireMenu(SYS_GW_DEPT)`

### 미배정 부서 이름

API 설정 `app.unassigned-dept-name: 미배정` 을 두었습니다(엔진 `migration.groupware.ax-join.default-dept-name` 과 같은 값). 이 이름으로 `ax.tb_sys_dept` 를 찾고,
없으면(V45 미적용) 요약 `unassignedDept = null` · 미배정 목록 빈 배열 · 재배정 `movedCnt 0` 으로 응답합니다.

### 요청별 메모

1. **summary** — 명세 정의대로. 로컬 실측: `gwDeptCnt 72 / mapped 7 / unmapped 62 / excluded 3 / unmappedUserCnt 349 / unassignedUserCnt 349`.
   `lastJoinMessage` 는 엔진이 `ax.tb_sync_run.message` 에 남긴 "인사정보 요약 · AX 가입 요약" 에서 **`AX 가입` 부터 끝까지**를 잘라 줍니다
   (예: `AX 가입 0(미배정 0) / 이미 가입 1 / 제외 부서 7 / 복직 정지 유지 1`). 엔진 세션이 항목을 늘려도 그대로 따라옵니다. 가장 최근 실행이 실패라 AX 요약이 없으면 `null`.
2. **목록** — 정렬은 재직자 수 내림차순 → 부서명. `keyword` 는 대소문자를 구분하는 부분 일치(한글 기준 문제없음). `state` 가 셋 중 하나가 아니면 400(`field=state`).
   `size=0` 이면 `meta = {page:1, size:전체, total, totalPages:1}` — 다른 목록의 전량 응답과 같습니다.
3. **저장** — 전체 덮어쓰기. `joinYn` 이 없으면 `Y`, `N` 이면 `deptId` 를 보내도 비웁니다. `gwDeptNm` 은 다듬지 않습니다(앞뒤 공백까지 그대로 저장).
   400: 없는 부서 · 미배정 부서 · 통합관리자 부서(모두 `field=deptId`), `joinYn` 이 Y/N 이 아님(`field=joinYn`), 모르는 키(`field=<키>`).
   성공 메시지: "매핑을 저장했습니다. 다음 동기화부터 새로 가입하는 사람에게 적용되며, 이미 가입된 계정의 부서는 바뀌지 않습니다."
   이력 예: `매핑 저장 — 없음 → 품질보증팀 (메모: …)` (`없음` = 행이 없던 상태)
4. **삭제** — `?gwDeptNm=` 필수(비면 400), 없으면 404 `E-NOTFOUND`. 응답 `{ gwDeptNm, state: "UNMAPPED" }`, 메시지에 "이미 가입된 계정의 부서는 바뀌지 않습니다" 포함.
5. **미배정 계정** — 명세 필드 그대로. 정렬은 가입 일시 최근순. 운영처럼 `groupware_user.tb_user_list` 가 없는 DB 에서는 `gwDeptNm`·`suggestDept*` 가 모두 `null` 입니다.
6. **재배정** — 본문이 없거나 `{}` 이면 제안 부서가 있는 미배정 계정 전체. `skippedCnt` = 보낸 사번(중복 제거) − 옮긴 수 —
   미배정이 아닌 사번 · 없는 사번 · 제안 부서가 없는 사번 · 제안이 통합관리자 부서인 사번이 여기에 들어갑니다. 전체 모드에서는 0.
   이력은 계정 부서 이동과 같은 형식(`tb_sys_perm_log` ACCOUNT "부서 이동 → …", `tb_log_audit` PERM_CHANGE)이고, 감사 로그의 화면은 `sys-gw-dept` 로 남습니다.
   메시지: 옮긴 수가 있으면 "미배정 계정 N명을 옮겼습니다.", 0 이면 "옮길 미배정 계정이 없습니다."

### 기존 API 2건

- `GET /system/depts` — `SYS_GW_DEPT` 추가. 부서 목록에 **'미배정' 도 나옵니다** — 선택지에서 빼 주십시오(요약의 `unassignedDept.deptId` 로 거르면 됩니다). 매핑 저장에 넣으면 400 입니다.
- `PUT /system/users/{empNo}/dept` — `requireAnyMenu(SYS_ACCOUNT, SYS_GW_DEPT)`. 제안하신 범위 제한을 넣었습니다:
  **`sys-account` 없이 `sys-gw-dept` 로만 들어오면** 미배정 부서 계정만 옮길 수 있고(아니면 403 `E-AUTH-002 [sys-account]`), 통합관리자 부서로는 400 입니다.
  `sys-account` 가 있으면 예전과 똑같습니다. 전산팀은 두 권한을 다 가지므로 전산팀 사용자는 제한 없이 옮깁니다.

### 참고

- 매핑표는 엔진이 가입하는 순간에만 읽습니다. 화면에서 매핑을 넣은 뒤 이미 가입된 미배정 계정은 [매핑대로 재배정] 으로 옮겨야 합니다(지금 로컬 349명).
- 운영에 올리려면 V45 → V46 순서로 적용하고, API 와 엔진을 함께 배포해야 합니다.
- 2026-09-30 추가: `ax.tb_sys_user.avata` 는 보안상 쓰지 않기로 해 V47 로 지웠습니다. 이 화면·API 는 avata 를 쓰지 않아 영향이 없습니다.
