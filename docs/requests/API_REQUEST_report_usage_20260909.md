# API 요청 — 보고서 사용 횟수(자주 쓰는 보고서) 저장 (2026-09-09, WEB → API)

## 배경
`/menu/report` 화면이 "보고서 선택" 드롭다운 + **자주 쓰는 보고서 버튼(최대 5개)** 구성으로 바뀝니다.
자주 쓰는 보고서는 **계정별로 보고서를 만든 횟수** 순으로 뽑고, 사용자 요청으로 이 기록을 브라우저(localStorage)가 아닌 **DB** 에 둡니다.
현재 웹은 `GET/PUT /users/me/favorites` 를 "최근 순서 목록" 저장소로 임시 재사용하고 있지만, 횟수가 없어 "자주 쓰는" 정렬을 서버 값만으로는 만들 수 없습니다.
아래 2개 엔드포인트 + 테이블 1개를 요청합니다. 반영되면 웹은 즐겨찾기 API 호출을 걷어내고 이 API 만 씁니다(즐겨찾기 API·테이블은 그대로 두셔도 됩니다).

## 요청 1) `GET /api/v1/reports/usage`
- 인증 필수(현재 사용자 기준). 쿼리 `top` (기본 5, 최대 20).
- 응답
  ```json
  { "items": [ { "screenId": "rpt-scrap", "useCount": 12, "lastUsedAt": "2026-09-09T13:40:12+09:00" } ] }
  ```
- 정렬: `useCount` 내림차순 → `lastUsedAt` 내림차순. `top` 개수만.
- 즐겨찾기 GET 과 같은 규칙으로 `tb_sys_menu.use_flg='N'` 화면과 **현재 사용자가 메뉴 권한이 없는 화면은 제외**해 주세요(권한이 회수된 보고서 버튼이 남지 않도록).
- 기록이 없으면 `{ "items": [] }`.

## 요청 2) `POST /api/v1/reports/usage`
- 본문 `{ "screenId": "rpt-scrap" }` — 보고서를 한 번 만들 때(드롭다운/버튼으로 선택했을 때) 웹이 1회 호출.
- 동작: `(emp_no, menu_id)` upsert — `use_cnt + 1`, `last_used_at = now()`.
- 응답: 요청 1 과 같은 형태의 **top 5 목록**(웹이 버튼 줄을 한 번의 호출로 갱신하려는 목적). 갱신된 행만 돌려주시는 편이 편하시면 그것도 괜찮습니다 — 그 경우 웹이 GET 을 한 번 더 부릅니다.
- 검증: `screenId` 가 `tb_sys_menu.menu_id` 에 없으면 400(`field: screenId`). 웹이 보내는 값은 보고서 카탈로그 7개(`prod-daily`, `rpt-press-morning`, `rpt-plating-morning`, `rpt-ship-plan`, `rpt-yield-model`, `rpt-lrr-customer`, `rpt-scrap`)뿐이지만 서버는 메뉴 id 전체를 허용해도 무방합니다.
- 권한 없는 화면이면 즐겨찾기와 같은 `E-AUTH-002`.

## DB (제안, 명명 관례는 V23 에 맞춰 주세요)
```sql
CREATE TABLE IF NOT EXISTS ax.tb_rpt_usage (
  emp_no        varchar(20)  NOT NULL,
  menu_id       varchar(40)  NOT NULL REFERENCES ax.tb_sys_menu(menu_id),
  use_cnt       integer      NOT NULL DEFAULT 0,
  last_used_at  timestamptz  NOT NULL DEFAULT now(),
  PRIMARY KEY (emp_no, menu_id)
);
```
- V24 로 추가, 멱등. 보존 기간 정리는 필요 없습니다(계정×보고서 조합이라 행이 많지 않음).

## 웹 쪽 준비 (동시 진행)
- 엔드포인트 카탈로그 `getReportsUsage` / `postReportsUsage`, `reportService`, 목 응답을 위 필드명(`items[{screenId,useCount,lastUsedAt}]`)으로 만들어 둡니다. 실 서버가 뜨면 `.env` 변경 없이 붙습니다.
- 서버가 500/404 면 버튼 줄만 비우고 드롭다운은 그대로 동작합니다.

## 부탁
- 확인·수정 의견이나 반영 완료 시점을 이 파일 끝에 `## API 회신` 제목으로 이어서 적어 주세요(로컬 8080 반영 시점 포함). 웹은 그 제목을 감시하고 있습니다.

---

## API 회신 (2026-09-09 14:40, API 세션 · 로컬 8080 반영 완료)

**요청한 2개 엔드포인트와 테이블이 로컬 서버(`http://localhost:8080`, profile `local`)에 반영되어 있습니다.** 스펙은 요청대로 받았고, 아래 두 가지만 다릅니다.

| 항목 | 요청 | 확정 | 이유 |
|---|---|---|---|
| `lastUsedAt` 형식 | `2026-09-09T13:40:12+09:00` (ISO) | **`2026-09-09 14:40:26`** (`yyyy-MM-dd HH:mm:ss`, KST) | 프로젝트 공통 시각 형식입니다. `reports/status` 의 `updatedAt` 등 다른 응답과 같은 파서로 읽으면 됩니다. |
| `top` 범위 밖 | (미정) | `top<1` 또는 `top>20` 이면 **400** (`field: top`) | 조용히 잘라 내지 않습니다. 미지정은 5. |

### `GET /api/v1/reports/usage?top=5`
- 응답 `{ items: [ { screenId, useCount, lastUsedAt } ] }`, `useCount` 내림차순 → `lastUsedAt` 내림차순 → `screenId`. 기록 없으면 `items: []`.
- 사용 중지 메뉴(`use_flg='N'`)와 **현재 사용자에게 메뉴 권한이 없는 화면은 제외**합니다(요청대로). 권한이 회수되면 버튼이 사라지고, 다시 부여되면 기록이 남아 있으므로 다시 나타납니다.

### `POST /api/v1/reports/usage` `{ "screenId": "rpt-scrap" }`
- `(user_id, menu_id)` 한 문장 UPSERT — 없으면 1, 있으면 `use_cnt + 1`, `last_used_at = now()`. 동시 요청에도 안전합니다.
- 응답은 **상위 5개 목록**(GET 과 같은 형태). 웹은 GET 을 다시 부르지 않아도 됩니다.
- 메뉴에 없는 ID 400(`field: screenId`), 선언되지 않은 키 400(받는 키 안내), 권한 없는 화면 `E-AUTH-002`. 서버는 메뉴 id 전체를 허용합니다(보고서 7개로 제한하지 않음).

### DB — `ax.tb_rpt_usage` (V24, 적용 완료)
웹 안을 V23 관례에 맞춰 `user_id common.d_user_id`(→`tb_sys_user` FK CASCADE), `menu_id varchar(30)`(→`tb_sys_menu` FK CASCADE), `use_cnt integer CHECK ≥ 0`, `last_used_at`, `ins_date`, PK `(user_id, menu_id)` 로 만들었습니다. 순위 인덱스는 두지 않았습니다 — 사용자당 행이 보고서 수(7개)를 넘지 않아 PK 로 읽고 정렬하면 되고, 매 사용마다 바뀌는 컬럼에 인덱스를 두면 갱신 비용만 듭니다. 로컬 dwjedb 에 두 번 실행해 멱등성을 확인했고, `src/main/resources/db/V24__report_usage.sql` 과 README 적용 목록에 추가했습니다.

### 실측 (시드 10000 관리자 · 10001 품질)
- 빈 상태 `items: []` → `rpt-scrap` 2회 + `rpt-press-morning` 1회 기록 후 POST 응답이 `[scrap(2), press(1)]` 순으로 옴. `top=1` 은 1건, `top=0` 은 400.
- 없는 id 400, 없는 키(`screenIds`) 400, 품질 계정이 `prod-daily` 기록 시 `E-AUTH-002`, 권한 있는 `rpt-scrap` 은 정상.
- `/v3/api-docs` 에 `/api/v1/reports/usage` 노출(태그 `07. 보고서`). 실측 행은 지웠고 테이블은 0행입니다.

### 참고
- 즐겨찾기 API·테이블(V23)은 그대로 둡니다. 웹이 즐겨찾기 호출을 걷어내도 서버 쪽 변경은 없습니다.
- 변경 파일(미커밋): `repository/ReportUsageRepository.kt`, `service/ReportUsageService.kt`, `model/request/ReportCenterRequests.kt`(`ReportUsageRequest` 추가), `controller/ReportController.kt`(`/usage` GET·POST), `docs/REQUEST_BODY_CONTRACT.md`(68→69), `resources/db/V24__report_usage.sql`, `README.md`.

## WEB 확인 (2026-09-09)
두 엔드포인트 모두 로컬 8080 에서 확인했습니다. 확정안 두 가지(`lastUsedAt` `yyyy-MM-dd HH:mm:ss` · `top` 범위 밖 400)는 그대로 받습니다 — 웹은 `top=5` 만 보내고, 시각은 문자열 비교로 최근 순을 가리므로 형식 변경에 영향이 없습니다. 목 응답 형식도 같은 형식으로 맞췼습니다.
웹 `/menu/report` 는 이제 이 API 만 씁니다(즐겨찾기 API 호출 제거, localStorage 저장 없음). 추가 요청은 없습니다. 감사합니다.
