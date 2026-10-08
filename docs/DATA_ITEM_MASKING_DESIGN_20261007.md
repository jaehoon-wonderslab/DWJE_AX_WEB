# 데이터 접근 권한 — 표시 항목 기준 마스킹 설계 (DB · API · WEB)

| 항목 | 값 |
| :--- | :--- |
| 작성일 | 2026-10-07 |
| 대상 화면 | `/system/data-perm` (`sys-data`, SY-03) 과 데이터 값을 보여 주는 모든 화면 · 엑셀 · AI 답변 |
| 관련 문서 | `docs/screens/27_system_data-perm.md` · `API/docs/data-field-runtime-api.md` · `API/src/main/resources/db/V33__data_field_runtime.sql` |
| 상태 | 7.1(WEB 누출 차단) 완료 · **항목 단위 권한(사용자 결정 2026-10-07) 적용** — 아래 「10. 진행 결과 — 항목 단위 권한」 |

## 1. 배경

요청: 「데이터 접근 권한」 을 web · excel 등에 **표시되는 항목의 이름**을 기준으로 가리도록 바꿀 수 있는지 검토합니다.
현재 「종류 > 화면별 세부 항목 선택」 방식에서는 같은 항목이 어떤 화면에서는 가려지고 어떤 화면에서는 보입니다.

결론: 표시 이름만으로 가릴 수는 없습니다. 서버는 화면 제목을 모르고, 같은 이름이 서로 다른 뜻으로 쓰이는 경우도 있습니다(「모델」 = 제품 모델 / LLM 모델, 「상태」).
그래서 **표준 항목**(예: 「불량 수량」)을 판정 단위로 두고, 그 항목이 각 API · 화면 · 엑셀에서 쓰는 키 이름을 모두 표준 항목에 묶는 구조로 바꿉니다.
관리자는 항목 이름으로 고르고, 시스템은 그 항목에 묶인 모든 키를 같은 기준으로 가립니다.

## 2. 현재 구조와 문제

### 2.1 판정 열쇠가 네 군데로 나뉘어 있습니다

| 계층 | 판정 기준 | 위치 |
| :--- | :--- | :--- |
| DB | `tb_sys_data_field_attr.attr_name` — 응답 JSON 키. **전역 UNIQUE**, 화면 · 표시 이름은 저장하지 않음 | `V33__data_field_runtime.sql:70-83` |
| API 공통 | 응답 `data` 트리에서 키 이름이 정확히 같으면 null(깊이 무관, 대소문자 구분) | `common/response/DataFieldMaskingAdvice.kt` |
| API 개별 | 기본 7종 key 를 코드에 직접 써서 가림. attr 표를 보지 않음(31개 파일 · 약 200곳) | `common/util/MaskingSupport.kt` 호출부 |
| API 파일 | 서버 엑셀은 attr 표 + 파일마다 손으로 넣은 `extra` 대응 | `service/ExportService.kt:41-47` |
| WEB 표 | 열 `field` 가 막힌 키이면 「비공개」 배지 | `TabulatorGrid.jsx:176-181, 232-249` |
| WEB 보고서 표 · 카드 | `canData('qty')` 같은 기본 7종 key 를 코드에 직접 씀 | `XlsTable` 사용 화면 · `StatCard` · `BlindValue` (10개 파일) |
| WEB 엑셀 | 호출부가 넘긴 `attrs` 로만 가림. 안 넘기면 아무것도 가리지 않음 | `maskUtil.js:102-119` |

「화면별 가리기」 가 저장하는 값은 **WEB 열의 field 이름**입니다. 서버는 **API 응답 키**로 가리고, WEB 은 다시 **열 field** 로 배지를 그립니다.
화면 모델 계층이 키 이름을 바꾸는 곳(`cnt` → `value`, `qty` → `inputQty`)에서는 세 기준이 서로 어긋납니다.

### 2.2 확인된 증상

**같은 이름인데 키가 달라 한쪽만 가려짐** (로컬 설정 기준, 2026-10-07)

| 표시 이름 | 가려지는 쪽 | 보이는 쪽 |
| :--- | :--- | :--- |
| 불량 수량 | `ngQty` — dash-ai · qc-defect 상세 · rpt-yield-model | `value` — qc-defect 유형표 (서버 키 `cnt` 를 화면이 이름만 바꿈) |
| 불량률 | `defectRate` — prod-result · rpt-yield-model | `failRate` — qc-aoi · `rate` — qc-defect 상세 |
| 제품 · 제품명 | (미등록) | `product` · `productNm` · `itemNm` · `code` |
| 공정 | (미등록) | `process` · `processNm` · `wcNm` · `proc` |
| 일목표 | `dayTarget` (서버 키) | `target` — prod-daily(예약어라 고를 수도 없음) · `tgt` — 아침회의 2종 |

**같은 키인데 뜻이 달라 엉뚱한 곳까지 가려질 수 있음**

| 키 | 쓰임 |
| :--- | :--- |
| `value` | dash-ai 「확인된 값」 · qc-defect 「불량 수량」 · 수율 「Loss 수량」 · 대부분의 차트 · 코드 응답 |
| `rate` | 보고서 수율 · AI 대시보드 계획 달성률 · qc-defect 불량률/비중(화면 계산) |
| `ratio` · `total` · `cnt` | 비중 · 합계 · 건수가 화면마다 다른 대상 |
| `product` · `eqpt` | 제품 / 이슈 항목, 설비 / 영향범위(장비 대수). `product` 는 실적 트리의 묶음 키라 가리면 트리가 깨짐 |
| `spec` | 금형 규격 / AOI 규격 상하한 |

**가리기 경로 밖에서 값이 나가는 곳**

| 위치 | 내용 |
| :--- | :--- |
| 실적 집계 · 조회 트리 엑셀 | `downloadXlsxTree({ rows: items })` 에 `attrs` 가 없음 — 화면에서 가린 값이 원본 그대로 나감 (`useProductionResultController.js:52`) |
| 제품별 수율 · 고객사별 LRR CSV/엑셀 | 마스킹 없음 또는 화면 마스킹이 엑셀에 적용되지 않음 |
| 보고서 표 5종(아침회의 2종 · 일일 생산현황 · 출하계획 · 제품별 수율) | `XlsTable` 에 판정이 없어 「화면별 가리기」 로 고른 열이 그 화면에서도 가려지지 않음 |
| KPI 카드 · 차트 | null 을 0 이나 빈칸으로 그림. 설비명 · 제품명이 가려지면 코드값으로 대체 표시(`eqptNm‖eqptCd`) |
| 화면 재계산 | `defectTypeTree.js:29-30` · `dashboardRepository.js:286-293` 가 가린 값을 다른 값으로 다시 계산 |
| AI 채팅 SSE 최종 답변 | `maskText` 를 거치지 않음 (`LlmChatProxyController.kt:95-160`, 구현 시 재확인) |
| 화면 열 목록 | 제목을 배열 `.map` 으로 만드는 열 · 월별 동적 열은 `screenColumns.generated.js` 에 나오지 않음 |

## 3. 목표와 범위

**목표**
1. 관리자는 **표준 항목 이름**(불량 수량 · 불량률 · 단가 …)으로 가릴 대상을 고릅니다. 화면을 하나씩 돌며 열을 고르지 않습니다.
2. 한 항목의 가림 여부가 모든 화면 · 서버 응답 · 서버 엑셀 · WEB 엑셀 · AI 답변에서 같습니다.
3. 판정 근거는 DB 한 곳(항목 사전)이고, API · WEB 은 같은 사전을 읽습니다. 코드에 항목 key 를 박지 않습니다.
4. 사전에 없는 키, 범용 키 남용을 시험과 점검 도구로 찾아낼 수 있습니다.

**범위 밖**
- 부서 × 종류 권한 매트릭스(`tb_sys_dept_data_perm`)의 구조는 유지합니다. 권한은 지금처럼 **종류** 단위로 줍니다(6장 결정 1).
- 행 단위 권한(특정 고객사 행만 숨김)은 다루지 않습니다.

## 4. 목표 구조

### 4.1 개념

```
종류 (tb_sys_data_field)          ← 부서 권한을 주는 단위 (지금과 같음)
 └ 표준 항목 (tb_sys_data_item)    ← 관리자가 이름으로 고르는 단위 (신규)
    └ 키 별칭 (tb_sys_data_item_alias) ← API 응답 키 · WEB 열 field · 엑셀 열 키 (신규)
         범위: 전역 / 특정 API 경로 / 특정 화면
```

- 판정식: `가림 = 종류.적용 AND NOT 부서가 종류를 열람 가능 AND NOT 통합관리자` (지금과 같음).
- 바뀌는 것: 「어떤 값이 어느 종류인가」 를 키 하나로 정하지 않고, **표준 항목을 거쳐** 정합니다.
- 범용 키(`value` · `rate` · `ratio` · `total` · `cnt` · `product` · `eqpt` · `spec` …)는 전역 별칭으로 등록할 수 없고, API 경로나 화면 범위를 붙여야만 등록됩니다.

### 4.2 판정 순서 (API · WEB 공통)

```
키 k 의 항목 찾기(요청 경로 p, 화면 s)
  1) (k, 화면 s) 범위 별칭      — WEB 만
  2) (k, API 경로 p) 범위 별칭  — 가장 긴 경로 접두어가 이김
  3) (k, 전역) 별칭
  4) 없음 → 통제 대상 아님(보임)
```

## 5. 상세 설계

### 5.1 DB

**마이그레이션 `V82__data_item_catalog.sql`** (번호는 적용 시점 최신 다음 번호)

```sql
-- 표준 항목 — 관리자가 이름으로 고르는 단위
CREATE TABLE ax.tb_sys_data_item (
    item_cd    varchar(40)  NOT NULL,          -- 표준 키 (ngQty · defectRate · unitPrice). 응답 표준 키와 같게 둠
    item_nm    varchar(50)  NOT NULL,          -- 표시 이름 (불량 수량). 화면 · 엑셀 · AI 문장 마스킹의 라벨
    field_key  varchar(30),                    -- 종류. NULL = 아직 어느 종류에도 넣지 않음(가리지 않음)
    item_desc  varchar(300),
    syn_nm     varchar(200),                   -- 같은 뜻의 다른 표시 이름 (불량, 불량수, NG 수량) — 쉼표 구분
    sort_seq   integer      NOT NULL DEFAULT 0,
    use_flg    char(1)      NOT NULL DEFAULT 'Y',
    ins_date timestamptz NOT NULL DEFAULT now(), ins_user common.d_user_id,
    upd_date timestamptz NOT NULL DEFAULT now(), upd_user common.d_user_id,
    CONSTRAINT pk_sys_data_item PRIMARY KEY (item_cd),
    CONSTRAINT uq_sys_data_item_nm UNIQUE (item_nm),
    CONSTRAINT fk_sys_data_item_field FOREIGN KEY (field_key)
        REFERENCES ax.tb_sys_data_field(field_key) ON DELETE SET NULL
);

-- 키 별칭 — 항목이 각 API · 화면 · 엑셀에서 쓰는 키 이름
CREATE TABLE ax.tb_sys_data_item_alias (
    alias_id   bigint GENERATED ALWAYS AS IDENTITY,
    item_cd    varchar(40)  NOT NULL,
    attr_name  varchar(60)  NOT NULL,          -- JSON 키 · 열 field. 대소문자 구분
    scope_cd   varchar(10)  NOT NULL DEFAULT 'ALL',  -- ALL | API | SCREEN
    scope_val  varchar(200) NOT NULL DEFAULT '',     -- API: '/api/v1/quality/defects' 같은 경로 접두어, SCREEN: 메뉴 ID(qc-defect)
    remark     varchar(200),
    ins_date timestamptz NOT NULL DEFAULT now(), ins_user common.d_user_id,
    CONSTRAINT pk_sys_data_item_alias PRIMARY KEY (alias_id),
    CONSTRAINT uq_sys_data_item_alias UNIQUE (attr_name, scope_cd, scope_val),
    CONSTRAINT ck_sys_data_item_alias_scope CHECK (
        (scope_cd = 'ALL' AND scope_val = '') OR (scope_cd IN ('API','SCREEN') AND scope_val <> '')),
    CONSTRAINT fk_sys_data_item_alias_item FOREIGN KEY (item_cd)
        REFERENCES ax.tb_sys_data_item(item_cd) ON DELETE CASCADE
);
CREATE INDEX ix_sys_data_item_alias_item ON ax.tb_sys_data_item_alias (item_cd);
CREATE INDEX ix_sys_data_item_field ON ax.tb_sys_data_item (field_key);
```

**범용 키 · 예약어**
- 예약어(`RESERVED_ATTRS`, 등록 불가)는 지금처럼 서버 상수로 둡니다.
- 범용 키(전역 등록 불가, 범위 지정 시만 등록)는 공통코드 그룹 `DATA_ATTR_GENERIC` 으로 둡니다. 운영 중에 늘릴 수 있어야 하기 때문입니다.
  초깃값: `value` `rate` `ratio` `total` `cnt` `count` `amount` `product` `eqpt` `spec` `plan` `actual` `memo` `remark` `name` `type` `result`.

**기존 데이터 옮기기 (같은 마이그레이션)**
1. `tb_sys_data_field_attr` 의 행마다 표준 항목 1건 + 전역 별칭 1건을 만듭니다. `item_cd = attr_name`, `field_key` 는 그대로.
   `item_nm` 은 부록 A 의 초기 사전 이름을 쓰고, 사전에 없으면 `remark` → `attr_name` 순으로 임시 이름을 넣은 뒤 화면에서 고칩니다.
2. 부록 A 의 별칭(같은 항목의 다른 키)을 추가합니다. 이 단계에서 2.2 의 「한쪽만 가려짐」 이 해소됩니다.
3. `tb_sys_data_field_attr` 는 지우지 않고 **읽기 전용 호환 뷰**로 대체합니다.

```sql
ALTER TABLE ax.tb_sys_data_field_attr RENAME TO tb_sys_data_field_attr_v33;  -- 백업, 이후 회차에 삭제
CREATE VIEW ax.tb_sys_data_field_attr AS
SELECT i.field_key, a.attr_name, a.remark, a.ins_date, a.ins_user
  FROM ax.tb_sys_data_item_alias a JOIN ax.tb_sys_data_item i ON i.item_cd = a.item_cd
 WHERE a.scope_cd = 'ALL' AND i.field_key IS NOT NULL AND i.use_flg = 'Y';
```
뷰로 두는 이유: `findDataFields()` · `/auth/me.dataFields` · AI 표 블록 등 attr 표를 읽는 기존 코드가 7.2 단계 전까지 그대로 동작해야 합니다.

**롤백** `rollback/V82__down.sql`: 뷰 삭제 → `_v33` 이름 복구 → 신규 표 2개 삭제. 기존 권한(`tb_sys_dept_data_perm`)은 건드리지 않으므로 롤백해도 권한이 바뀌지 않습니다.

**감사**: 항목 · 별칭 변경은 기존과 같이 `tb_sys_perm_log` (`act_cd='DATA_PERM'`, `target_kind_cd='ITEM'`) 와 `tb_log_audit` `PERM_CHANGE` 에 남깁니다.

**운영 반영**: 서버 DB 마이그레이션은 수동 적용입니다. 운영 패치 SQL 과 설치본(`ext_api_migrations.sql`)을 함께 만듭니다.

### 5.2 API

#### (1) 항목 사전 서비스 `DataItemCatalog` (신규, `DataFieldService` 의 attr 맵을 대체)

- 적용 중 항목 · 별칭을 읽어 다음 색인을 만듭니다. 캐시는 지금과 같이 60초, 화면에서 바꾸면 즉시 무효화합니다.
  - `global: Map<attrName, itemCd>`
  - `byApi: List<(pathPrefix, attrName, itemCd)>` — 경로 길이 내림차순
  - `items: Map<itemCd, (itemNm, synonyms, fieldKey)>`
- `blindAttrsFor(principal, requestPath): Map<attrName, fieldKey>` — 4.2 의 2)·3) 순서로 이 요청에서 가릴 키를 돌려줍니다.
- `labelsFor(fieldKey)` — AI 문장 마스킹용 라벨(항목 이름 + 같은 뜻 이름 + 키).

#### (2) 공통 마스킹 `DataFieldMaskingAdvice`

- `dataFieldService.attrFieldMap()` 대신 `catalog.blindAttrsFor(principal, path)` 를 씁니다. 트리 순회 방식은 그대로입니다.
- 응답 `masked`(종류 key)는 유지하고, `maskedItems`(항목 코드)를 더합니다. WEB 이 「무엇이 가려졌는지」 를 항목 이름으로 안내할 수 있습니다.

#### (3) 코드 마스킹 `MaskingSupport` 정리 — 두 겹을 한 겹으로

- 지금은 코드가 기본 7종 key 로 직접 가리고, advice 는 attr 표로 가립니다. 둘이 보는 목록이 달라 어긋납니다.
- 단계 A(7.2): 코드가 가리는 응답 키를 모두 별칭으로 등록합니다(부록 A 의 `targetQty` · `weekQty` · `rawQty` · `ngCnt` · `failCnt` · `ngRate` · `yieldRate` …). advice 만으로 같은 결과가 나오는지 시험으로 확인합니다.
- 단계 B(7.4): `mask.on(DataField.QTY) { … }` 를 `mask.item("ngQty") { … }` 로 바꿉니다. 항목 → 종류는 사전이 정합니다. 값 계산을 건너뛰는 이점(권한 없으면 원본을 읽지 않음)은 유지합니다.
- 단계 C: `DataField` 상수 · 기본 7종 삭제 금지 규칙은 「사전에 항목이 남아 있는 종류는 삭제 불가」 로 바꿉니다.
- `AiBriefingInput.of` 의 프롬프트 입력 마스킹은 화면이 가릴 수 없는 자리라 유지합니다.

#### (4) 서버 엑셀 · CSV

- `ExportService.blindCells(rows, extra)` 의 `extra` 를 없애고, 다운로드 경로를 요청 경로로 넘겨 `blindAttrsFor` 로 판정합니다.
  파일에만 쓰는 키는 그 다운로드 경로 범위 별칭으로 등록합니다(예: `cnt` @ `/api/v1/quality/defects/export` → 불량 수량).
- 열 정의에 항목 코드를 직접 줄 수 있게 합니다: `ExportColumn(header = "불량 수량", key = "cnt", item = "ngQty")`. 키보다 항목 지정이 우선합니다.
- `tb_rpt_download_blind` · 다운로드 이력 `blind_cnt` 는 그대로 씁니다.

#### (5) AI 답변

| 지점 | 변경 |
| :--- | :--- |
| 표 블록 | 열 이름을 `blindAttrsFor(principal, "/api/v1/ai")` 로 판정 |
| 문장 `maskText` | 라벨 후보에 **항목 이름 · 같은 뜻 이름**을 더함(「불량률 3.2%」 의 「불량률」 이 라벨로 걸림) |
| LLM SSE 최종 답변 | 스트림 종료 시 본문과 블록에 `maskText` · 표 판정을 적용(현재 미적용 여부 구현 시 재확인) |

#### (6) 엔드포인트

편집 권한은 지금과 같이 `requireWrite(sys-data)` 입니다. 거부는 403 `E-AUTH-004`, 규칙 위반은 409 `E-RULE-001`, 형식 오류는 400 `E-VALID-001` 입니다.

| 메서드 | 경로 | 요청 | 응답 `data` |
| :--- | :--- | :--- | :--- |
| GET | `/system/data-items` | `q?` · `fieldKey?` · `unassigned?` | `items[{itemCd,itemNm,synNm,fieldKey,fieldNm,desc,aliases[{aliasId,attrName,scopeCd,scopeVal,remark}]}]` · `reservedAttrs[]` · `genericAttrs[]` |
| POST | `/system/data-items` | `{itemCd,itemNm,synNm?,fieldKey?,desc?,aliases?[]}` | 등록 항목 |
| PUT | `/system/data-items/{itemCd}` | `{itemNm,synNm?,desc?}` | 수정 항목. `itemCd` 는 바꿀 수 없음 |
| DELETE | `/system/data-items/{itemCd}` | — | `{itemCd,deletedAliases}`. 알림 조건 · 지표 기준 · 보고서 양식이 참조하면 409 |
| PUT | `/system/data-items/{itemCd}/aliases` | `{aliases:[{attrName,scopeCd,scopeVal,remark?}]}` (전체 교체) | `{itemCd,aliases[],added[],removed[]}` |
| PUT | `/system/data-items/assign` | `{moves:[{itemCd,fieldKey|null}], newFields?[]}` | `{moved[],created[],notApplied[]}` — 한 트랜잭션. 지금의 `/data-fields/mapping` 을 대체 |
| GET | `/system/data-items/observed` | `path?` | 최근 응답에서 본 키 중 사전에 없는 키 목록 `[{path,attrName,lastSeen}]` (5.2 (7)) |

검증 규칙
- `itemCd` — 응답 키 꼴(`^[a-z][A-Za-z0-9]{1,39}$`), `itemNm` 필수 50자, 같은 이름 409.
- 별칭: 예약어 400(`field: attrName`), 범용 키를 `ALL` 로 등록하면 409 「범용 키는 화면이나 API 범위를 지정해야 합니다. [value]」, 같은 (키, 범위)가 다른 항목에 있으면 409 「이미 불량 수량에 등록된 키입니다. [cnt @ /api/v1/quality/defects]」.
- `SCREEN` 범위의 `scopeVal` 은 `tb_sys_menu.menu_id` 에 있어야 합니다. `API` 범위는 `/api/v1/` 로 시작해야 합니다.

호환
- `/system/data-fields/*` (종류 CRUD · 부서 권한 · 적용 전환)는 그대로 둡니다. 종류 응답의 `attrs[]` 는 그 종류에 든 항목의 전역 별칭으로 채웁니다.
- `/system/data-fields/mapping` · `/{key}/attrs` 는 7.3 까지 유지하고, 내부에서 「키 → 항목(없으면 자동 생성)」 으로 바꿔 처리합니다. 7.4 에서 제거됨으로 표시합니다.

`GET /auth/me` 추가 필드

```json
"dataItems": [
  {"itemCd":"ngQty","itemNm":"불량 수량","fieldKey":"qty",
   "aliases":[{"attrName":"ngQty","scopeCd":"ALL","scopeVal":""},
              {"attrName":"value","scopeCd":"SCREEN","scopeVal":"qc-defect"}]}
]
```
- 적용 중 종류에 든 항목만 내려 줍니다. `dataFields`(종류 · 전역 attrs)는 하위 호환으로 유지합니다.

#### (7) 누락 탐지 — `observed`

- advice 가 응답을 훑을 때(이미 트리를 순회하므로 추가 비용 작음) 사전에 없는 키를 경로별로 메모리에 표본 수집합니다(경로당 상한 200키, 재기동 시 초기화).
- 관리 화면이 이 목록과 항목 이름을 대조해 「`failRate` (qc-aoi 응답)는 사전에 없습니다 — 「불량률」 에 연결할까요?」 를 제안합니다.
- 값은 저장하지 않고 키 이름만 모읍니다.

### 5.3 WEB

#### (1) 판정 함수 하나로 통일 — `useAuthStore`

```js
// 새 판정. 화면 범위 별칭 → 전역 별칭 순서
canAttr(attrName, { screen } = {})   // 지금 함수에 screen 인자 추가
itemOfAttr(attrName, { screen })     // → { itemCd, itemNm, fieldKey } | null
canItem(itemCd)                      // 항목 코드로 직접 판정
```
- `dataItems` 로 `{ "screen:qc-defect": {value:"ngQty"}, "*": {ngQty:"ngQty", …} }` 색인을 만듭니다.
- `canData('qty')` 같은 종류 key 직접 판정은 화면 코드에서 없앱니다(지금 10개 파일). 남는 곳은 권한 관리 화면뿐입니다.

#### (2) 그리는 곳 모두 같은 판정

| 대상 | 변경 |
| :--- | :--- |
| `TabulatorGrid` · `Table` | 열에 `dataItem` 속성을 주면 그것으로, 없으면 `field` + 현재 화면 ID 로 판정 |
| `XlsTable` | 셀 정의에 `attr` 또는 `dataItem` 을 받아 「비공개」 처리. 아침회의 2종 · 일일 생산현황 · 출하계획 · 제품별 수율 적용 |
| `StatCard` · `BlindValue` | `field="qty"`(종류) 대신 `item="ngQty"` 또는 `attr="okQty"` |
| 차트 | 값 키가 가려지면 계열을 그리지 않고 「비공개」 자리 표시. null 을 0 으로 바꾸는 `?? 0` · `|| 0` 제거 |
| 이름 대체 | `eqptNm ‖ eqptCd` · `productNm ‖ product` 는 이름이 **가려져서** null 이면 코드로 대체하지 않음 |
| 화면 재계산 | 재료 값 중 하나라도 가려졌으면 계산하지 않음(`defectTypeTree.js` · `dashboardRepository.js` · `ShipPlanView.jsx`) |

#### (3) 엑셀은 열 정의에서 자동으로

- `downloadXls` · `downloadXlsxTree` 가 `columns`(field · dataItem)를 받으면 `attrs` 를 스스로 만듭니다. 호출부가 `attrs` 를 빠뜨려 원본이 나가는 길을 없앱니다.
- `columns` 도 `attrs` 도 없으면 개발 모드에서는 오류, 운영에서는 「가릴 수 없는 내보내기」 로 막고 토스트를 띄웁니다. 경고만 하던 지금 동작을 바꿉니다.
- 우선 수정: 실적 집계 트리 엑셀 · 제품별 수율 · 고객사별 LRR.

#### (4) 화면 모델이 키 이름을 바꾸지 않게

모델 계층에서 이름을 바꾸면 서버 판정과 화면 판정이 갈라집니다. 원칙: **통제 대상 값은 서버 키 이름 그대로 표에 넘깁니다.** 표시용 이름이 필요하면 열의 `title` 로 해결합니다.

| 화면 | 지금 | 바꿈 |
| :--- | :--- | :--- |
| qc-defect 유형표 | `label` / `value` (서버 `defectType` / `cnt`) | `defectType` / `ngQty` (`compositionOf` 의 출력 키 변경) |
| qc-defect 상세 | `rate` = `ratio` 또는 `defectRate` | `defectRate` · `ratio` 두 열로 나눔 |
| prod-result | `inputQty`(서버 `qty`) · `equipNm`(서버 `eqptNm`) | 서버 키 사용, 또는 서버가 표준 키로 응답 |
| 아침회의 2종 | `tgt` · `act` · `proc` · `eqpt` · `memo` | `dayTarget` · `dayActual` · `process` · `impactEqptCnt` · `decision` |
| prod-daily | `target` · `product` · `scope` | `dayTarget` · `issueItem` · `impactEqptCnt` (서버와 맞춤) |

바꾸기 어려운 곳은 당분간 `SCREEN` 범위 별칭으로 메우고, 별칭 목록을 줄여 가는 것을 완료 기준으로 둡니다.

#### (5) 화면 열 목록 `screenColumns.generated.js`

- 열마다 `dataItem`(명시값 또는 사전 매칭 결과)을 함께 생성합니다.
- 제목 배열 `.map` 으로 만드는 열 · 월별 동적 열을 읽도록 열 정의에 `dataItem` 을 직접 적습니다(정규식 추정보다 명시값 우선).
- `npm run check:columns` 실패 상태(시스템관리 화면 차이)를 먼저 맞추고, 같은 검사에 다음을 더합니다.
  - 열 제목이 사전의 항목 이름 · 같은 뜻 이름과 같은데 그 열의 키가 항목에 연결되지 않았으면 실패 — 2.2 의 증상을 빌드 단계에서 잡습니다.
  - 범용 키 열에 `dataItem` 이 없으면 경고.

#### (6) 항목 관리 화면 개편

모달 탭 구성을 바꿉니다.

| 탭 | 내용 |
| :--- | :--- |
| **항목** (기본) | 표준 항목 표: 항목 이름 · 종류(선택) · 보이는 화면 수 · 연결된 키 수 · 관리. 위쪽 검색과 「종류 없음만」 필터. 종류를 고르고 [저장] 하면 `PUT /data-items/assign` 1회 |
| 항목 상세 (행 펼침 또는 모달) | 이 항목이 보이는 화면 목록(화면 · 열 제목 · 키), 키 별칭 표(키 · 범위 · 메모 · [빼기]), [키 넣기] — 사전 미연결 키 후보(`observed` · 화면 열 목록)에서 고름 |
| **화면별 확인** | 지금의 「화면별 가리기」 를 확인용으로 바꿈. 화면을 고르면 열마다 연결된 항목 · 종류 · 가림 여부를 보이고, 항목에 연결되지 않은 열은 「미연결」 로 표시해 바로 연결할 수 있게 함 |
| **미연결 점검** | 이름이 사전과 같지만 연결되지 않은 열, 서버 응답에서 본 미등록 키 목록. 「연결」 단추로 처리 |
| 가리기 종류 | 지금과 같음(종류 이름 · 설명 · 든 항목 수). 종류 편집의 「가리는 값」 표는 키 대신 **항목 이름**으로 보임 |

바깥 「부서별 데이터 접근 권한 관리」 표는 그대로이고, 「포함 데이터」 칸을 항목 이름 목록으로 바꿉니다.

## 6. 결정이 필요한 사항

| # | 질문 | 권장 | 이유 |
| :--- | :--- | :--- | :--- |
| 1 | 부서 권한 단위를 종류로 유지할지, 항목마다 줄지 | **종류 유지** | 부서 × 항목(수십 개) 표는 관리가 어렵습니다. 항목은 종류로 묶고 권한은 종류에 줍니다. 필요하면 「항목 하나짜리 종류」 로 같은 효과를 냅니다 |
| 2 | 범용 키를 어떻게 처리할지 | **응답 키 표준화 + 그 전까지 범위 별칭** | 범위 별칭만으로도 동작하지만, 근본 해결은 서버 · 화면이 같은 표준 키를 쓰는 것입니다 |
| 3 | 기본 7종 종류의 삭제 금지를 유지할지 | 「항목이 든 종류는 삭제 불가」 로 일반화 | 코드에서 종류 key 를 없애면 기본 7종만 특별할 이유가 없습니다 |
| 4 | 1단계(WEB 누출 차단)를 설계 승인 전에 먼저 할지 | **먼저 진행** | 엑셀 원본 유출은 설계와 무관하게 막아야 하고, 바꾼 내용이 이 설계와 충돌하지 않습니다 |

## 7. 진행 순서

| 단계 | 내용 | 담당 | 완료 확인 |
| :--- | :--- | :--- | :--- |
| 7.1 누출 차단 (WEB) | 실적 집계 트리 · 제품별 수율 · LRR 엑셀에 가리기 적용, `XlsTable` 판정 추가, 차트 `?? 0` · 이름 대체 · 재계산 차단 | WEB | 부서별 계정으로 엑셀 · 화면 대조 시험 |
| 7.2 사전 도입 (DB · API) | V82 · `DataItemCatalog` · advice 범위 판정 · `/system/data-items` · `/auth/me.dataItems` · 부록 A 초기 사전 · 코드 마스킹 키 별칭 등록 | DB · API | `./gradlew test`, advice 와 코드 마스킹 결과 일치 시험 |
| 7.3 WEB 판정 통일 | `canAttr(screen)` · `TabulatorGrid`/`XlsTable`/`StatCard` 의 `dataItem` · 엑셀 자동 attrs · 모델 키 이름 정리 · `check:columns` 확장 | WEB | `npm run check`, 일관성 시험(8장) |
| 7.4 관리 화면 · 정리 | 항목 관리 화면 개편 · `observed` · `MaskingSupport` 항목 기준 전환 · `/data-fields/mapping` 「제거됨」 · `_v33` 표 삭제 | WEB · API · DB | 화면 문서 `27_system_data-perm.md` 갱신 |

### 7.1 진행 결과 (2026-10-07, WEB)

| 대상 | 변경 | 파일 |
| :--- | :--- | :--- |
| 실적 집계 · 조회 트리 엑셀 | 함수가 직접 가림 — 행 필드(투입 · 양품 · 불량 · 불량률 · 가동률 · 비가동 · 공장 · 공정 · 설비)로 판정, 막힌 칸은 값이 없어도 「비공개」 | `exportUtil.js` `downloadXlsxTree` · `maskUtil.js` `maskObjectRows`(신규) |
| 보고서 표 `XlsTable` | 열 · 칸에 `attr`(문자열 또는 배열) — 하나라도 막히면 그 열의 모든 칸(합계 · 묶음 행 포함)을 「비공개」 | `XlsTable.jsx` |
| 엑셀 `attrs` 배열 판정 | 열마다 [화면 열 key, 서버 키 …] 를 받음 | `maskUtil.js` `maskRows` |
| 아침회의 2종 | 열 attr = [화면 key, 서버 키], 엑셀 `MORNING_EXPORT_ATTRS`. 상태는 달성률에서 나오므로 달성률이 막히면 함께 가림 | `MorningSheet.jsx` · `PressMorningView.jsx` · `PlatingMorningView.jsx` |
| 일일 생산현황 | 열 attr(`DAILY_ATTRS`) · 엑셀 attrs. 달성률 · 상태를 아침회의와 같이 수율 종류로 가림(예전에는 이 화면만 안 가렸음) | `productionRepository.js` · `DailyReportView.jsx` · `useDailyReportController.js` |
| 출하계획 | 고객사 · 총합계 · 월 열 attr, 엑셀 attrs. TOTAL 라벨 칸은 가리지 않음 | `ShipPlanView.jsx` |
| 제품별 수율 | 표 열 attr(Loss · 관리 항목은 `ngQty`), CSV · 엑셀 attrs | `YieldByModelView.jsx` |
| 고객사별 LRR | 피벗 표 attr(`lrrQty` · 고객사), CSV · 엑셀 attrs | `LrrByCustomerView.jsx` |
| 설비별 불량률 표(dash-ai) | 설비명 · 제품명이 가려지면 코드로 대체하지 않음, 가린 수량 · 불량률을 0 으로 바꾸지 않음, 공정 묶음 불량률을 다시 계산하지 않음 | `dashboardRepository.js` · `EquipmentMatrix.jsx` |
| KPI 카드 | `StatCard` · `BlindValue` 가 `attr` 도 받음. 값이 가려지면 단위 · 부가 문구(sub)를 그리지 않음. AI 대시보드 「양품 · 불량」 문구는 가린 값을 0 대신 「비공개」 | `StatCard.jsx` · `BlindValue.jsx` · `AiDashboardView.jsx` |
| 불량 유형 트리 | 불량률을 볼 수 없으면 다시 계산하지 않음(`defectTypeTree(rows, { rateOk })`) | `defectTypeTree.js` · `DefectStatusView.jsx` |

시험: `tests/system/data-mask-reports-live-browser.cjs` (신규, DB 변경 없음 — `/auth/me` 에 시험 종류를 끼워 화면별 가리기 상태를 흉내).
화면 표 · 엑셀 4건 통과. `data-perm-browser` · `perm-screens-live-browser`(API_URL=8080) · 모델 단위 시험(`defect-type-tree` · `process-model` · `ai-range-model` · `compact-defect-tree`) 통과.

**항목 관리 「항목」 탭 선행(2026-10-07, WEB)** — 5.3 (6) 의 항목 탭을 DB 변경 없이 먼저 넣었습니다. 항목은 화면 열 제목 · 값 이름으로 WEB 이 묶고(`model/dataItemModel.js`),
저장은 지금의 `PUT /data-fields/mapping` 입니다. 공용 키는 고를 수 없게 두었습니다(7.2 의 범위 별칭 뒤에 풀림). 자세한 내용은 `docs/screens/27_system_data-perm.md` 「항목(이름) 기준 가리기」.

남은 것(7.3 에서 처리): 화면 코드의 `canData('qty')` 같은 종류 key 직접 판정, 차트 계열의 null → 0, 모델 계층의 키 이름 바꾸기(`cnt` → `value` 등).

## 8. 시험

**항목 일관성 시험** `tests/system/data-item-consistency-live.cjs` (신규, 로컬 API)
1. `GET /system/data-items` 로 사전을 읽고, `screenColumns.generated.js` 에서 항목마다 보이는 화면 · 열을 모읍니다.
2. 시험용 종류에 항목 하나를 넣고 시험 부서만 비공개로 둡니다. 시험이 끝나면 되돌립니다.
3. 그 부서 계정으로 화면마다 확인합니다.
   - API 응답에서 해당 키가 null 이고 `maskedItems` 에 항목이 있는가
   - 표 칸이 「비공개」 인가(빈칸 · 0 · 코드값이 아닌가)
   - 엑셀에서 같은 열이 「비공개」 인가
4. 통합관리자 계정으로 같은 화면에 원본이 보이는지 확인합니다.

**API 단위 시험**
- 범위 판정 우선순위(화면 > 긴 경로 > 짧은 경로 > 전역), 범용 키 전역 등록 409, 예약어 400, 같은 (키, 범위) 중복 409.
- `MaskingSupport` 가 가리는 키가 모두 사전에 있는지 — 응답 표본을 advice 로 다시 돌려 결과가 같은지 비교.

**정적 검사**
- `npm run check:columns` 확장 규칙(5.3 (5)).
- `npm run check:api` 에 `/system/data-items` 6건 추가. README 의 API 건수 갱신.

## 부록 A. 초기 사전 (초안)

화면 열 목록 · 서버 코드 조사로 뽑은 초안입니다. 구현 단계에서 실제 응답으로 키를 다시 확인한 뒤 V82 시드에 넣습니다. `@` 뒤는 범위입니다.

| 항목 코드 | 항목 이름 | 종류 | 별칭 |
| :--- | :--- | :--- | :--- |
| `ngQty` | 불량 수량 | qty | `ngQty` · `ngCnt` · `failCnt` · `prodNgCnt` · `defectQuantity` · `cnt`@`/api/v1/quality` · `value`@qc-defect |
| `okQty` | 양품 수량 | qty | `okQty` |
| `inputQty` | 투입 수량 | qty | `inputQty` · `qty`@`/api/v1/production/result` |
| `targetQty` | 목표 수량 | qty | `dayTarget` · `weekTarget` · `targetQty` · `weekTargetQty` · `tgt`@rpt-press-morning · `tgt`@rpt-plating-morning · `target`@prod-daily |
| `actualQty` | 실적 수량 | qty | `dayActual` · `weekActual` · `ratedActual` · `weekQty` · `act`@rpt-press-morning · `act`@rpt-plating-morning |
| `shipQty` | 출하 수량 | qty | `shipQty` |
| `defectRate` | 불량률 | yield | `defectRate` · `ngRate` · `failRate` · `eqptDefectRate` |
| `yield` | 수율 | yield | `yield` · `yieldRate` · `currentYield` · `rate`@`/api/v1/reports` |
| `lrrRate` | LRR | yield | `lrrRate` · `lrrQty`(→ 수량 종류로 분리 검토) |
| `unitPrice` | 단가 | price | `unitPrice` |
| `planAmount` | 계획 금액 | price | `planAmount` |
| `customer` | 고객사 | customer | `customer` · `customerCd` |
| `planQty` | 출하 계획 수량 | plan | `planQty` |
| `moldNm` | 금형 | mold | `moldCd` · `moldNm` · `cavity` · `strokeSpeed` · `spec`@`/api/v1/production/monitor` |
| `insUsers` | 검사자 | worker | `insUsers` |

표시 이름이 같지만 뜻이 달라 **별도 항목**으로 두는 것: 「모델」(제품 모델 `model` / LLM 모델 `llmModel`), 「상태」(아침회의 `st` / 알림 `ackState`).
제품 · 공정 · 설비 · 공장(`product` · `productNm` · `itemNm` · `process` · `wcNm` · `eqptNm` …)은 지금 가리는 대상이 아니므로 사전에는 항목만 만들고 종류는 비워 둡니다(필요할 때 종류만 고르면 모든 화면에 적용).

## 부록 B. 조사 근거 파일

| 구분 | 파일 |
| :--- | :--- |
| DB | `API/src/main/resources/db/V33__data_field_runtime.sql` · `V34__data_field_attr_seed.sql` |
| API | `common/response/DataFieldMaskingAdvice.kt` · `common/util/MaskingSupport.kt` · `service/DataFieldService.kt:66-75`(예약어) · `service/ExportService.kt` · `service/AiChatService.kt:600-611` · `controller/LlmChatProxyController.kt` |
| WEB | `src/shared/stores/useAuthStore.js:170-215` · `src/shared/utils/maskUtil.js` · `src/shared/components/ui/TabulatorGrid.jsx` · `XlsTable.jsx` · `src/domains/system/model/screenColumns.generated.js` · `scripts/build-screen-columns.cjs` · `src/domains/quality/controller/useDefectStatusController.js:79-112` · `src/domains/production/controller/useProductionResultController.js:52` |

## 10. 진행 결과 — 항목 단위 권한 (2026-10-07)

사용자 결정: 「묶음 없이 항목을 쭉 나열하고, 출력 화면 열과 부서별 열람 체크를 한 표에」 · 「API · DB 까지 함께」. 이 결정으로 6장 1번(권한 단위)은 **항목 단위**로 정해졌습니다.
5장의 별도 사전 표(tb_sys_data_item · alias) 대신 기존 표를 그대로 씁니다 — 항목 = `tb_sys_data_field` 한 행, 키 = `tb_sys_data_field_attr`.

| 계층 | 내용 |
| :--- | :--- |
| DB V82 | 기본 7종 필드명 35개를 항목마다 나눔(`i_*`, 부서 권한 복사) · 코드만 가리던 같은 뜻 이름 54개 등록(새 항목 24) · 원래 묶음 기록표 `tb_sys_data_attr_origin`. 로컬 적용, 운영 미적용 |
| API | 기본 7종 key 판정을 항목 권한에서 계산(느슨한 · 엄격한 — `AuthRepository.findDataPermSets`), 문장 · 프롬프트 출력은 엄격한 판정, `PUT /system/data-fields/item-perms`, 뜻이 다른 이름 자리 판정(`canReadAttr`, 불량 현황 유형표). `./gradlew test` 556건 통과 |
| WEB | `/system/data-perm` = 항목 × 부서 표(`ItemPermGrid`), [항목 관리] 모달 「제거됨」 |

남은 것: 뜻이 다른 이름으로 나가는 값(rate · total · value · segments 값 등)의 자리별 판정, 운영 DB 적용 · 설치본 갱신, 아침회의 `issue` 문장 등 전수 조사에서 나온 기존 누출(API 문서 9절).

## 11. 새로 발견된 응답 데이터 (2026-10-08)

5.2 (7) 누락 탐지 + 화면 처리 단추를 만들었습니다(사용자 결정: 처리 전 「모두 열람」, 알림은 이 화면에서만, 기록은 DB, 배포 점검 절차 문서화).
서버가 업무 응답에서 등록되지 않은 값 이름을 표본으로 찾아 `tb_sys_data_attr_seen`(V83, 값 미저장)에 남기고, 화면 탭에서 항목에 넣기 · 새 항목 · 가리지 않음으로 처리합니다.
자세한 규칙 · 배포 점검 절차: `API/docs/data-field-runtime-api.md` 10절, 화면: `docs/screens/27_system_data-perm.md` 2026-10-08.

