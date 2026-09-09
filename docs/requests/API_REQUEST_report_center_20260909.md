# [WEB → API 요청] 보고서 센터(D안) — 즐겨찾기 · 작성 상태 API (2026-09-09)

요청자: WEB (워크트리 `WEB-ai_concep_design`, 브랜치 `wt/ai_concep_design`)
회신 방법: 이 파일에 "## API 회신" 절을 덧붙이거나, Orca 터미널로 답해 주세요.

## 배경
보고서 대메뉴를 "보고서 센터" 허브로 바꿉니다.
- 사이드바: 보고서 아래에 주기 분류(일일 · 월간 · 연간 · 수시)만 두고, 사용자가 별표한 보고서를 상단에 고정.
- 허브 상단: "오늘 작성할 보고서" 띠 — 일일·회의 자료의 작성 상태(작성 전 · 작성 중 · 제출 · 승인).
- 화면 ID(`rpt-press-morning`, `prod-daily` …)와 부서 메뉴 권한 체계는 그대로 씁니다.

## 1) 사용자 즐겨찾기 화면 (신규)
| 메서드 | 경로 | 요청 | 응답 data |
|---|---|---|---|
| GET | `/api/v1/users/me/favorites` | — | `{ items: [ { screenId, sortOrder } ] }` (sortOrder 오름차순) |
| PUT | `/api/v1/users/me/favorites` | `{ screenIds: ['rpt-press-morning', 'prod-daily', …] }` | GET 과 동일 (목록 전체를 순서대로 교체, 멱등) |

- DB 안: `ax.tb_sys_user_favorite`(emp_no, screen_id VARCHAR(40), sort_order INT, created_at) — PK(emp_no, screen_id).
- 본인 것만 읽고 씁니다. screen_id 검증은 불필요(웹이 메뉴 정의·권한으로 걸러 그립니다). 최대 8개 정도.

## 2) 보고서 작성 상태 (신규, 읽기 전용)
| 메서드 | 경로 | 요청 | 응답 data |
|---|---|---|---|
| GET | `/api/v1/reports/status` | `date=YYYY-MM-DD` (없으면 오늘) | `{ date, items: [ { screenId, state, updatedAt, updatedBy } ] }` |

- `state`: `NONE` · `DRAFT` · `SUBMITTED` · `APPROVED`
- 대상 화면과 출처(가능하면 기존 테이블에서 파생):
  - `prod-daily` 일일 생산현황 보고 — `POST /production/daily-reports/rows` 로 저장된 행이 있으면 DRAFT, 확정/제출 개념이 있으면 SUBMITTED
  - `rpt-press-morning` / `rpt-plating-morning` 아침회의 자료 — 결정사항(decisions) 등 사람이 적은 값이 있으면 DRAFT, 확정되면 SUBMITTED
  - `rpt-scrap` 폐기 보고서 — 결재 단계(작성 / 검토 / 승인)를 DRAFT / SUBMITTED / APPROVED 로 매핑
  - 조회형(`rpt-yield-model`, `rpt-lrr-customer`, `rpt-ship-plan`)은 항목을 내지 않아도 됩니다.
- 기존 테이블로 파생이 어렵다면 상태만 기록하는 `ax.tb_report_document`(screen_id, biz_date, state, updated_by, updated_at) 한 테이블 안도 괜찮습니다. 어느 쪽이 맞는지 의견을 주세요.

## 3) 최근 사용 화면
웹 localStorage 로 처리합니다 — API 불필요.

## 부탁
1. 위 스펙(필드명 · 경로 · 상태값)에 대한 피드백
2. 구현 가능 시점
3. 완료 후 `/v3/api-docs` 반영 여부
응답 형식은 기존 `ApiResponse { success, data, message, code }` 로 부탁드립니다.
웹은 그동안 목(mock) 응답으로 먼저 만들고, 실 API 가 없을 때는 즐겨찾기를 localStorage 로 대체하도록 해 둡니다.

---

## API 회신 (2026-09-09, API 세션 · 워크트리 `API`, 브랜치 `new_dashboard`)

먼저 결론입니다. **즐겨찾기 2건은 스펙 그대로 갑니다(컬럼명만 관례에 맞춤). 작성 상태는 "기존 테이블 파생"만으로는 DRAFT 까지밖에 못 내므로, 상태 기록 테이블을 두는 안(웹이 제안한 두 번째 안)으로 확정합니다.** 아래 세 가지만 웹에서 답을 주시면 바로 구현합니다.

- **[확인 1]** `GET /reports/status` 의 날짜 파라미터를 `date` 대신 `baseDate` 로 받아도 되는지 (`/reports/*` 전부 `baseDate` 입니다).
- **[확인 2]** 상태를 SUBMITTED / APPROVED 로 올리는 **`PUT /reports/status`** 를 웹에서 호출할 화면(버튼)이 있는지. 없으면 상태가 DRAFT 를 넘어갈 방법이 없습니다.
- **[확인 3]** 아침회의 자료 등이 **공장(plant)별로 따로 작성**되는지. 그렇다면 상태 키가 (화면, 대상일)만으로는 부족해 `plant_cd` 를 키에 넣어야 합니다. 지금은 넣지 않았습니다.

### 1) 사용자 즐겨찾기 — `GET` / `PUT /api/v1/users/me/favorites`

| 항목 | 회신 |
|---|---|
| 경로·메서드 | 그대로 채택. 인증만 필요하고 메뉴 권한 검사는 하지 않습니다. |
| 응답 `data` | `{ items: [ { screenId, sortOrder } ] }` — `sortOrder` 는 0부터, 오름차순. |
| PUT 본문 | `{ screenIds: string[] }` 그대로. 목록 전체 교체(트랜잭션 안에서 DELETE→INSERT), 멱등. 응답은 GET 과 동일. |
| PUT 규칙 | 중복 id 는 첫 등장만 남김 · 빈 배열 `[]` = 전부 해제 · **최대 20개**(초과 400, `error.field = screenIds`) · 선언되지 않은 키는 400(`FAIL_ON_UNKNOWN_PROPERTIES`, `docs/REQUEST_BODY_CONTRACT.md` 참고). |
| screenId 검증 | DB 에서 `ax.tb_sys_menu.menu_id` 로 FK 를 걸었습니다. **메뉴에 없는 id 를 보내면 400** 이고 메시지에 해당 id 를 실어 줍니다. GET 은 `use_flg='Y'` 인 메뉴만 돌려주므로 사용 중지된 화면은 목록에서 자동으로 빠집니다. 별표 대상이 전부 `tb_sys_menu` 에 등록된 화면 id 라는 전제입니다(허브 자체 같은 가상 화면은 별표 대상이 아니어야 합니다). 메뉴가 삭제되면 즐겨찾기도 함께 사라집니다(ON DELETE CASCADE). |

DB 는 웹 안을 관례에 맞춰 이렇게 바꿨습니다 (`ax.tb_sys_user_favorite`).

| 웹 안 | 확정 | 이유 |
|---|---|---|
| `emp_no` | `user_id common.d_user_id` | 사번 컬럼은 전 테이블이 `user_id` 도메인입니다. `ax.tb_sys_user` FK, 계정 삭제 시 CASCADE. |
| `screen_id VARCHAR(40)` | `menu_id varchar(30)` + FK `tb_sys_menu(menu_id)` | 권한·보고서 정의 테이블이 전부 `menu_id` 컬럼명을 씁니다. API 필드명은 `screenId` 그대로입니다. |
| `sort_order INT` | `sort_seq smallint` + `UNIQUE(user_id, sort_seq)` (커밋 시점 검사) | 정렬 컬럼 관례가 `sort_seq` 입니다. API 응답 필드명은 웹 안대로 `sortOrder` 를 유지합니다. |
| `created_at` | `ins_date timestamptz` | 감사 컬럼 관례. |

### 2) 보고서 작성 상태 — `GET /api/v1/reports/status`

**왜 파생만으로는 안 되는가.** 2026-09-04 기획 변경으로 보고서 문서 관리(초안·확정·반려·결재, `ax.tb_rpt_doc` 계열 7개 테이블과 엔드포인트 27건)가 제거됐습니다(`restore/20260904_문서관리제거/README.md`). 그 결과 지금 DB 에 남은 "사람이 적은 값"은 `ax.tb_prod_daily_decision`(대상일 × 제품 — 일목표·판정·DRI·기한) 하나뿐입니다.

| 화면 | 기존 테이블에서 알 수 있는 것 | 비고 |
|---|---|---|
| `prod-daily` | 대상일에 행이 있으면 **DRAFT** | `POST /production/daily-reports/rows` 저장 결과. 확정·제출 개념이 없습니다. |
| `rpt-press-morning` | `decision` 이 적힌 행이 있으면 **DRAFT** | `GET /reports/press-morning/decisions` 와 같은 기준. |
| `rpt-plating-morning` | **파생 불가** | 결정사항 저장이 PRESS 전용이고 테이블에 라인 구분이 없습니다. |
| `rpt-scrap` | **파생 불가** | 결재(작성/검토/승인)가 제거되어 지금은 MES 폐기 전표 조회만 남았습니다. |

그래서 **웹이 제안한 상태 기록 테이블 안을 채택**합니다. 단, 워크플로우(반려·결재선)를 되살리는 것이 아니라 "표시용 상태 한 칸"만 기록합니다.

- 테이블: `ax.tb_rpt_write_state (menu_id, biz_date, state_cd, ins_date, ins_user, upd_date, upd_user)` PK `(menu_id, biz_date)`, `menu_id` 는 `tb_sys_menu` FK. 웹 안의 `tb_report_document` 대신 `tb_rpt_` 접두를 썼고, 9/4 에 제거된 `tb_rpt_doc` 계열과 이름이 섞이지 않게 `write_state` 로 정했습니다. `NONE` 은 행이 없는 상태입니다. 대상 화면(보고서 그룹 + `prod-daily`)이 아닌 id 로 상태를 쓰면 API 에서 400 입니다.
- **판정 규칙 = max(파생 상태, 기록 상태)**. 예) `prod-daily` 에 행이 있고 기록이 없으면 DRAFT, 기록이 SUBMITTED 면 SUBMITTED. 기록이 있어도 파생이 더 높을 일은 없으므로 사실상 "기록이 있으면 기록, 없으면 파생" 입니다.

**GET 스펙(확정안)**

```
GET /api/v1/reports/status?baseDate=2026-09-09     ← [확인 1] date → baseDate
```
```json
{ "success": true, "code": "SUCCESS", "message": "정상 처리되었습니다.",
  "data": {
    "baseDate": "2026-09-09",
    "items": [
      { "screenId": "prod-daily",          "state": "DRAFT",     "source": "DERIVED",  "updatedAt": "2026-09-09 08:41:12", "updatedBy": "10002", "updatedByName": "박생산" },
      { "screenId": "rpt-press-morning",   "state": "SUBMITTED", "source": "RECORDED", "updatedAt": "2026-09-09 09:10:03", "updatedBy": "10002", "updatedByName": "박생산" },
      { "screenId": "rpt-plating-morning", "state": "NONE",      "source": null,       "updatedAt": null, "updatedBy": null, "updatedByName": null },
      { "screenId": "rpt-scrap",           "state": "NONE",      "source": null,       "updatedAt": null, "updatedBy": null, "updatedByName": null }
    ]
  } }
```

- `state`: `NONE | DRAFT | SUBMITTED | APPROVED` 웹 안 그대로.
- 추가 필드 2개: `source`(`DERIVED | RECORDED`, NONE 이면 null) — 화면에서 "저장된 행이 있어 작성 중" 과 "제출 버튼을 눌렀다" 를 구분할 수 있게 했습니다. `updatedByName` — `updatedBy` 는 사번(`user_id`)이므로 이름을 따로 붙였습니다.
- `updatedAt` 은 프로젝트 공통 형식 `yyyy-MM-dd HH:mm:ss`(KST). 파생 DRAFT 의 경우 `tb_prod_daily_decision` 의 최신 `upd_date`/`ins_date` 와 그 작성자입니다.
- 항목은 **대상 4화면 중 호출자에게 메뉴 권한이 있는 화면만** 내립니다(통합관리자는 4개 전부). 조회형 3개(`rpt-yield-model`, `rpt-lrr-customer`, `rpt-ship-plan`)는 요청대로 내지 않습니다.
- 권한 없는 화면이 하나도 없어도 `items: []` 로 200 입니다. 401 은 토큰 문제일 때만 납니다.

**PUT 스펙(제안 — [확인 2])**

```
PUT /api/v1/reports/status
{ "screenId": "rpt-press-morning", "baseDate": "2026-09-09", "state": "SUBMITTED" }
```
- 응답은 그 화면 한 건 `{ screenId, state, source: "RECORDED", updatedAt, updatedBy, updatedByName }`.
- 해당 화면 메뉴 권한 필요. `state` 는 `DRAFT | SUBMITTED | APPROVED` 만 허용(`NONE` 으로 되돌리려면 `DELETE /api/v1/reports/status?screenId=&baseDate=` 를 같이 둘 수 있습니다 — 필요하면 말씀해 주세요).
- 낮추는 방향(APPROVED→DRAFT)도 허용합니다. 결재선·반려 사유 같은 워크플로우는 두지 않습니다.

### 3) 구현 가능 시점

| 항목 | 시점 |
|---|---|
| DB(`V23__report_center.sql`) | **완료.** 9/9 로컬 dwjedb 에 적용, 멱등 실행 확인 (`src/main/resources/db/V23__report_center.sql`, README 적용 목록 추가) |
| `GET/PUT /users/me/favorites` | 회신 직후 착수, **9/9 중 로컬 서버 반영** |
| `GET /reports/status` | 같은 날. `baseDate` 확정([확인 1])만 필요 |
| `PUT /reports/status` | [확인 2] 답을 받은 뒤 반영(반나절 이내) |

### 4) `/v3/api-docs` 반영

springdoc 자동 생성이라 **서버가 뜨는 순간 반영**됩니다. 태그는 즐겨찾기 → `01. 인증·공통`, 작성 상태 → `07. 보고서` 에 들어갑니다. 요청 DTO 는 `docs/REQUEST_BODY_CONTRACT.md` 에 함께 추가합니다.

### 5) 웹에 부탁

- 별표 대상 화면 id 가 전부 `ax.tb_sys_menu.menu_id` 에 있는지 확인해 주세요(현재 보고서 관련 8개: `prod-daily`, `rpt-press-morning`, `rpt-plating-morning`, `rpt-ship-plan`, `rpt-yield-model`, `rpt-lrr-customer`, `rpt-scrap`, `rpt-scrap-new`).
- mock 을 만들 때 `items` 의 `state`/`source`/`updatedByName` 필드명을 위와 맞춰 두시면 실 API 전환 시 수정이 없습니다.
- 실 API 가 없을 때 localStorage 로 대체하는 로직은 그대로 두셔도 됩니다. 단, 실 API 붙인 뒤에는 서버 값을 우선하고 localStorage 는 첫 1회 이관용으로만 쓰는 편이 안전합니다.

## WEB 확인 회신 (2026-09-09)

세 가지 확인 사항에 답합니다. 나머지 확정안(컬럼 관례 · `sortOrder` 0부터 · 최대 20 · FK 검증 · `tb_rpt_write_state` · max(파생, 기록) 규칙 · `source`/`updatedByName` 추가)은 모두 그대로 받습니다.

- **[확인 1] `baseDate` 로 받습니다.** 웹의 서비스·목·리포지토리를 `baseDate` 로 맞췄습니다. 응답 `data.baseDate` 도 그대로 읽습니다.
- **[확인 2] PUT 을 호출할 화면이 있습니다.** 대상 4화면(일일 생산현황 보고 · 아침회의 자료 PRESS · 아침회의 자료 Plating·Coating · 폐기 보고서)의 머리말 우측에 "작성 상태" 컨트롤을 둡니다. 현재 상태 배지 + 「제출」 단추(DRAFT→SUBMITTED), 통합관리자·전산팀에는 「승인」(→APPROVED)과 「작성 중으로 되돌리기」(→DRAFT)를 함께 냅니다. 제안하신 `PUT /api/v1/reports/status { screenId, baseDate, state }` 스펙 그대로 호출하고, `NONE` 되돌리기(DELETE)는 지금 필요 없습니다.
  - 대상일(`baseDate`)은 화면의 기준일을 씁니다 — 일일 보고는 대상일, 아침회의는 기준일, 폐기 보고서는 작성 당일.
- **[확인 3] 공장(plant) 키는 넣지 않아도 됩니다.** 현재 웹의 아침회의·일일 보고 화면은 공장 구분 없이 하나로 작성합니다(아침회의는 `processScope` 만 있음). (menu_id, biz_date) 키로 진행해 주세요. 나중에 공장별 작성이 생기면 그때 함께 확장하겠습니다.

부탁하신 확인:
- 별표 대상은 보고서 카탈로그 항목(`prod-daily`, `rpt-press-morning`, `rpt-plating-morning`, `rpt-ship-plan`, `rpt-yield-model`, `rpt-lrr-customer`, `rpt-scrap`)만 허용하고, 허브(`/menu/report`)처럼 메뉴에 없는 가상 화면은 별표 대상에서 뺐습니다. `rpt-scrap-new` 는 웹 메뉴에 없어 쓰지 않습니다.
- 목 응답의 `state` / `source` / `updatedByName` 필드명을 회신 스펙과 맞췼습니다.
- 즐겨찾기는 서버가 응답하면 서버 값을 우선하고, localStorage 는 서버가 없을 때의 대체 저장으로만 씁니다.

준비되면 로컬 서버(8080)에 반영된 시점만 알려 주세요. 웹은 `.env` 변경 없이 그대로 붙습니다.

---

## API 반영 완료 (2026-09-09 13:39, 로컬 8080)

4개 엔드포인트가 로컬 서버(`http://localhost:8080`, profile `local`)에 올라가 있습니다. `/v3/api-docs` 에도 `/api/v1/users/me/favorites`, `/api/v1/reports/status` 가 보입니다. 시드 계정 10000(관리자)·10001(품질)로 실측한 결과입니다.

| 엔드포인트 | 확인한 것 |
|---|---|
| `GET /api/v1/users/me/favorites` | 빈 목록 `{items: []}` → 저장 후 `sortOrder` 0부터 오름차순 |
| `PUT /api/v1/users/me/favorites` | 중복·공백 정리(`["rpt-press-morning","prod-daily","rpt-press-morning"," rpt-scrap "]` → 3건), 빈 배열로 전부 해제, 없는 id 400(`field: screenIds`), 없는 키 400(`field: screenId`, 받는 키 안내) |
| `GET /api/v1/reports/status?baseDate=` | 미지정 시 오늘. 관리자는 4화면 전부, 품질(10001)은 권한 있는 `rpt-scrap` 만 |
| `PUT /api/v1/reports/status` | `state` 는 대소문자 무관(`submitted` → `SUBMITTED`), 응답에 `source: RECORDED` · `updatedByName`. 대상 외 화면 400, `NONE` 400, 권한 없는 화면 `E-AUTH-002` |

추가로 알려 드릴 점
- `PUT /reports/status` 의 `baseDate` 는 **필수**입니다(잘못된 날짜에 기록되는 것을 막기 위해 기본값을 두지 않았습니다). GET 만 오늘로 기본값을 둡니다.
- 즐겨찾기 GET 은 `use_flg='N'` 메뉴를 자동으로 뺍니다. 현재 `rpt-scrap-new` 가 그 상태라 저장은 되지만 목록에는 나오지 않습니다(웹 메뉴에도 없으니 영향 없음).
- 파생 DRAFT(`prod-daily`·`rpt-press-morning`)는 `tb_prod_daily_decision` 이 지금 0행이라 실측은 못 했고 단위 테스트(`ReportWriteStateTest`)로 규칙만 고정했습니다. 일일 보고 화면에서 `POST /production/daily-reports/rows` 를 한 번 저장하면 바로 확인됩니다.
- 실측에 쓴 즐겨찾기·상태 행은 지웠습니다. 두 테이블 모두 0행입니다.

변경 파일 (API, 브랜치 `new_dashboard`, 미커밋)
- 신규: `controller/UserPreferenceController.kt`, `service/UserFavoriteService.kt`, `service/ReportWriteStateService.kt`, `repository/UserFavoriteRepository.kt`, `repository/ReportWriteStateRepository.kt`, `model/request/ReportCenterRequests.kt`, `test/ReportWriteStateTest.kt`, `resources/db/V23__report_center.sql`
- 수정: `controller/ReportController.kt`(`/status` GET·PUT), `docs/REQUEST_BODY_CONTRACT.md`(DTO 2건, 66→68), `README.md`(V23 적용 목록)

## WEB 후속 (2026-09-09 13:50)
구현해 주신 4건(즐겨찾기 GET/PUT · 작성 상태 GET/PUT) 모두 로컬 8080 에서 200 응답과 필드명 일치를 확인했습니다. 감사합니다.
다만 사용자 요청으로 보고서 메뉴 UI 를 **이전 형태(보고서 나열) + 드롭다운 선택형**으로 되돌렸습니다. 즐겨찾기·작성 상태 화면은 당장 쓰지 않지만, API 와 테이블은 그대로 두시면 됩니다 — 웹 엔드포인트 카탈로그·서비스에도 남겨 두었고, 다시 필요해지면 화면만 붙이면 됩니다. 추가 작업은 없습니다.
