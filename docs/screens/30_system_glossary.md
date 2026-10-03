# 30. `/system/glossary` — 용어 사전 관리

> **2026-10-04 변경** — 조회 줄(검색 · 「내가 등록한 유사어만」 · 조회)을 뺐습니다. 용어는 전부 받아 표 머리글 필터로 거르고, 주소의 `?keyword=` 는 「공식 용어」 머리글 필터 첫 값이 됩니다.
> 유사어 등록은 관리자만 하므로 등록자 표시를 뺐습니다 — 「유사어 (등록자)」 → 「유사어」(칩의 등록자 이름 · 「내 등록」 표시 없음), 권한 안내(`Hint`) · 「내가 등록」 요약 카드 · 엑셀 「등록자」 열(조회 목록 · 브라우저 전체) 제거됨.
> 서버가 만드는 「전체」 엑셀 파일에는 아직 등록자 열이 있습니다(API 몫).

| 항목 | 값 |
| :--- | :--- |
| URL | `/system/glossary` (`?keyword=` 로 첫 검색어를 받습니다 — 용어 사전 조회의 「관리 화면에서 편집」) |
| 화면 ID | `sys-gloss` |
| 라우트 파일 | `app/(main)/system/glossary.jsx` |
| MVC | `domains/system/view/GlossaryView.jsx` · `controller/useGlossaryController.js` · `model/systemRepository.js`(SY-06 구역) |
| 기능 ID | SY-06 |
| 접근 권한 | `sys-gloss` 조회 권한. 공식 용어 등록·수정·삭제는 **통합관리자 전용**, 유사어 쓰기는 **`sys-gloss` 쓰기 권한**(2026-10-01 결정 R-06) |

**권한 규칙 — 공식 용어는 통합관리자만 편집(서버 403 `E-AUTH-004`). 유사어는 쓰기 권한이 있으면 등록하고, 본인이 등록한 것만 수정·삭제(통합관리자는 모두).**
쓰기 권한 판정은 요약의 `canWriteVariant` 를 먼저 보고, 없으면 `/auth/me` 의 `writePerms` 로 합니다. 쓰기 권한이 없으면 유사어 버튼을 숨기지 않고 비활성으로 두고 「이 화면의 쓰기 권한이 없습니다. 전산팀에 요청하세요.」 를 알립니다.
엑셀 내려받기는 조회 권한으로 받습니다(결정 R-10).

조회 API(요약·목록·상세·내려받기 — 분류 목록은 「제거됨 2026-10-03, 분류 삭제」)는 용어 사전 조회 화면(`gloss-view`, `43_glossary_view.md`)과 같은 서버 API 를 씁니다. 이 화면의 쓰기 API 는 그 화면에 열지 않습니다.

**고객사 용어 가림(2026-10-02 결정 R-18, 공통 11.2)** — `customer` 데이터 권한이 없으면 서버가 고객사 정보 용어(`customerInfo:true`, 2026-10-03 전에는 고객사 계열 분류)를 `term`=「비공개 용어」, `definition`·`variants`=null, `blinded:true` 로 줍니다(통합관리자는 항상 봄). 화면은 그 행을 회색 「비공개 용어」·「비공개」 로 그리고, 유사어 추가·편집·삭제를 비활성 + 「고객사 데이터 권한이 없어 볼 수 없는 용어입니다」 로 둡니다(이력은 열림). 서버가 막으면 409 문구를 토스트로 보입니다. 변경 이력·유사어 폼의 공식 용어 후보·엑셀에서도 「비공개」 입니다.

## 1. 컴포넌트

`PageHead`(+`ExportMenuButton`(엑셀 다운로드 ▾) · 공식 용어 등록(통합관리자만) · `Button primary(유사어 등록)`(쓰기 권한 없으면 비활성 + `HelpTip`)) · `StatCard`×4 · 오류 줄(`FormAlert`) · 점검 필요 유사어 줄(통합관리자만) · `Hint` · `Card`(용어 정규화 미리보기) · `Filters`(검색 / ~~분류~~ 「제거됨 2026-10-03, 분류 삭제」 / `CheckRow(내가 등록한 유사어만)`) · `Card(tight)`+`TabulatorGrid`+`Pagination` · `openFormModal`(용어/유사어) · `openConfirmModal`(삭제) · 점검 필요 유사어 모달(`Table`)

## 2. 화면에 출력해야 하는 정보

### 2-1. 요약 카드 (`GET /glossary/summary`)

공식 용어(`termCnt`, 보조 `최근 변경 {lastChangedAt}` — 없으면 "보고서 표기 기준") · 등록 유사어(`variantCnt`, 보조 `분류 N종`) · 내가 등록(`myVariantCnt`, 보조 "수정·삭제 가능") · 유사어 없음(`noVariantTermCnt`, tone down)
요약을 불러오지 못하면 카드 값은 `—`, 카드 위에 「요약을(를) 불러오지 못했습니다 — {message}」.

### 2-2. 점검 필요 유사어 (통합관리자 · `GET /glossary/variants/risks`)

「점검 필요 유사어 N건 — 날짜·숫자·한 글자·공식 용어와 같은 낱말 [목록 보기]」. N 은 요약 `riskVariantCnt`(없으면 목록 건수).
모달 표 : 유사어 120 · 공식 용어 160 · 등록자 120 · 사유 minWidth 200 · 관리 90(삭제 — 한 번 더 눌러 확인). 표 칩에도 점검 대상이면 `!` 와 사유 툴팁(통합관리자에게만).

### 2-3. 용어 정규화 미리보기 (`POST /glossary/normalize`)

- 입력 : `TextField(현장 표현)` — 기본 샘플 `"어제 캔 라인에서 찍힘 불량 나서 파카 써야 함. 쉴드캔 외관도 확인 필요"`
- 출력 : 정규화된 문장 + 치환 칩(`{from}` 취소선 → `{to}` 초록 굵게) + **치환하지 않은 칩**(`skipped[]`, 회색 「치환하지 않음: {word} — {reason}」). 치환 없으면 "바꿀 유사어를 찾지 못했습니다."
- 성공하면 토스트 없이 결과만, 실패할 때만 토스트.
- 각주 : "저장하면 다음 AI 질의부터 의도 판단·문서 검색에 반영됩니다. 사내 LLM 모델의 용어 지식은 다음 학습 때 반영됩니다."

### 2-4. 조회 조건

검색(용어 · 뜻 · 유사어 — Enter · 조회 · 입력 멈춤 400ms 로 확정, 입력 중 포커스 유지) · ~~분류(`전체` + `GET /glossary/domains` 의 `code[]`)~~ 「제거됨 2026-10-03, 분류 삭제」 · `내가 등록한 유사어만`(서버 `mineOnly`)

### 2-5. 용어 · 유사어 표 (`GET /glossary/terms`, `TabulatorGrid`, `renderVertical:'basic'`)

| 열 | 폭 | 렌더 |
| :--- | :--- | :--- |
| 공식 용어 `term` | minWidth 110 | bold |
| 뜻 `definition` | minWidth 170 | wrap |
| ~~분류 `domain`~~ 「제거됨 2026-10-03, 분류 삭제」 | ~~minWidth 84~~ | ~~tag~~ |
| **유사어 (등록자)** `variants` | minWidth 200 | 칩 — `word` + `byName`. 본인 것은 강조색 「내 등록」. **수정·삭제 가능(`editable` = 쓰기 권한 && 본인)이면 × 와 클릭 수정**. 없으면 "등록된 유사어 없음" |
| 관리 `termId` | 260(통합관리자) / 170 | `유사어 추가`(쓰기 권한 없으면 비활성 + title 안내) · `이력` · (통합관리자) `편집` · `삭제` |

재조회 중에는 표를 그대로 두고 카드 부제에 「조회 중…」. 빈 상태 : "검색 조건에 맞는 용어가 없습니다." / 내 것만이면 "내가 등록한 유사어가 없습니다."
좁은 화면에서는 카드 안 가로 스크롤로 마지막 「관리」 열까지 봅니다(열을 숨기지 않음).

## 3. 버튼 및 페이징

| 버튼 | 동작 |
| :--- | :--- |
| 공식 용어 등록 / 편집 | 폼 → `POST /glossary/terms` · `PUT /glossary/terms/{termId}` (통합관리자). 403 이면 「공식 용어는 통합관리자만 편집할 수 있습니다.」 |
| 공식 용어 삭제 | 확인 모달(danger) — **딸린 유사어 N개도 함께 빠진다고 안내** → `DELETE /glossary/terms/{termId}` |
| 유사어 등록 / 수정 | 폼 → `POST /glossary/terms/{termId}/variants` · `PUT /glossary/variants/{variantId}`. 400(2자 미만·숫자·날짜형·공식 용어와 같은 낱말)은 서버 문구, 저장 후 `warnings[]` 는 토스트에 덧붙임 |
| 유사어 삭제 (× ) | 확인 모달 → `DELETE /glossary/variants/{variantId}` |
| 정규화 | `POST /glossary/normalize` |
| 용어 임베딩 재생성 | **제거됨**(2026-10, 처리기 없음 — 07 GLS-05). 컨트롤러 `reindex` 와 API 는 남김 |
| 엑셀 다운로드 ▾ | 버튼 바로 아래 패널(바깥 클릭·Esc 로 닫힘). **조회 목록 다운로드(n건)** = 그리드에 보이는 행(정렬·열 순서 그대로, `attrs=['term','definition','variants','byName']`(분류 `domain` 열은 「제거됨 2026-10-03, 분류 삭제」), 등록자는 이름만), 이력 `scopeCd=VIEW`·조건 요약. **전체 다운로드(N건, N=termCnt)** = `POST /glossary/terms/export {scope:'ALL', menuId:'sys-gloss'}` 서버 생성(조건 무시, 상한 5,000, 이력은 서버가 기록). 서버 API 가 없으면 `size=0` 전체 조회로 브라우저에서 만듭니다 |
| 변경 이력 (머리) · 이력 (행) | `GET /glossary/changes` — 머리는 최근 30일, 행은 그 용어(`termId`). 모달 표 : 시각 150 mono · 수행자 140 · 대상 90 · 구분 80 · 변경 전 minWidth 200 · 변경 후 minWidth 200, 표 minWidth 860, 좁은 화면 가로 스크롤. 실패하면 모달 안 안내 |
| 조회 | 검색어 확정(같으면 다시 조회) |

**페이징** — `usePaging({resetKey: keyword\|mineOnly})`(분류는 「제거됨 2026-10-03, 분류 삭제」) + `Pagination`.

### 3-1. 폼 필드

**공식 용어** — 공식 용어(필수, 50자, `n/50자`, 한 줄 전체) · ~~분류(select, 필수)~~ 「제거됨 2026-10-03, 분류 삭제」 · 뜻(여러 줄, 필수, 500자, `n/500자`) · 고객사 정보(체크, 기본 해제) — 07 GLS-10, 4-2 참고.

**유사어** — 머리 「유사어 등록」: 공식 용어 검색형 선택(2자 이상 입력 → `GET /glossary/terms?keyword=&size=20`, 2쪽 이후 용어도 고름 — GLS-11) · 유사어(필수, 50자). 행 「유사어 추가」: 그 용어로 고정. 수정: 공식 용어는 읽기 전용(바꾸려면 삭제 후 재등록), 유사어만.
안내 : "2자 이상으로 적습니다. 숫자·날짜 표현과 다른 공식 용어와 같은 낱말은 등록할 수 없습니다."

## 4. 그 밖의 기능

- **소프트 삭제 복원** — 지웠던 이름으로 다시 등록하면 서버가 그 용어를 되살립니다. "이전에 삭제한 용어를 되살렸습니다. 유사어 N개도 함께 돌아왔습니다."
- ~~분류 선택지는 기준정보 `/glossary/domains` 에서 받습니다.~~ 「제거됨 2026-10-03, 분류 삭제」
- `canEditTerm` 은 `summary.canEditTerm`(없으면 `superAdmin`), `canWriteVariant` 는 `summary.canWriteVariant`(없으면 `writePerms`).
- 「변경이 AI 에 반영되는 시점」 접이식 카드(GLS-06) : 즉시(미리보기·AI 질의 전처리·LLM 용어 대응표) / 다음 학습 때(사내 LLM 모델) / 반영 안 됨(저장된 질의 이력의 정규화 문장). 요약 부제에 `lastChangedBy` 가 오면 함께 적습니다.
- 「제거됨 2026-10-03, 분류 삭제」 분류별 현황(GLS-13) 접이식 카드(카드는 2026-10-03 디자인 피드백으로 먼저 뺐습니다) : `Table` 분류 minWidth 140 · 용어 수 96 · 유사어 수 96 · 유사어 없음 110(오른쪽 정렬, 용어 수 내림차순). 행을 누르면 분류 필터가 그 분류로 바뀝니다. 서버가 분류별 `variantCnt`·`noVariantTermCnt` 를 아직 주지 않으면 `—`.
- 변경 이력의 변경 전·후는 서버 JSON 키(`term`·`termDef`·`customerInfo`·`domainNm`·`word`·`restoredVariants`·`byAdmin`)를 「공식 용어·뜻·고객사 정보·분류·유사어·되살린 유사어·관리자 대리 처리」(분류 `domainNm` 은 분류 삭제 전에 쌓인 이력을 읽으려고 남겨 둡니다) 로 읽어 보입니다.
- 재생성 API 응답의 상태는 `PENDING`(기획서 `QUEUED` 는 코드에 없어 서버가 바꿈). 화면 버튼은 제거됨이라 영향 없음.

### 4-1. 2026-10-03 (엑셀 업로드)

머리에 **[템플릿 내려받기]**(아이콘 download)와 **[엑셀 업로드]**(아이콘 upload)를 더했습니다. 용어와 유사어를 엑셀 파일로 한꺼번에 등록합니다.

| 항목 | 내용 |
| :--- | :--- |
| 템플릿 내려받기 | `GET /glossary/import/template` 를 `downloadFromServer({ method: 'GET' })` 로 받습니다. 파일명은 서버가 정합니다(`glossary_import_template.xlsx`). 시트 「용어」(머리글 `공식 용어*`·`뜻*`·`고객사 정보`·`유사어`, `(예시)` 2행)와 「안내」(규칙)로 되어 있습니다. 2026-10-03 분류 삭제 전에는 3열이 `분류`, 안내 시트에 분류 목록이 있었습니다(「제거됨 2026-10-03, 분류 삭제」). 조회 권한으로 받고, 내려받기 이력은 서버가 남깁니다. |
| 엑셀 업로드 | `sys-gloss` 쓰기 권한(`canWriteVariant`)이 있어야 합니다. 없으면 단추를 숨기지 않고 비활성으로 두고 옆 `HelpTip` 에 「미배정 계정은 이 동작을 할 수 없습니다. 전산팀에 부서 배정을 요청하세요.」 를 보입니다. |
| 흐름 | ① `.xlsx` 파일 고르기(웹 전용, 화면에서 xlsx·xlsm·5MB 를 먼저 거름) → ② `POST /glossary/import` multipart `file` + `dryRun=true` (미리보기, 저장 안 함) → ③ 「엑셀 업로드 미리보기」 모달 → ④ **[n건 등록]** 이 같은 파일을 `dryRun=false` 로 다시 보냅니다. 성공하면 모달을 닫고 서버 문구(「용어 사전을 등록했습니다.」)와 건수를 토스트로 보이고 목록·요약을 다시 받습니다. |
| 미리보기 모달 | 머리 부제에 파일명·데이터 행 수, 위에 건수 배지 「새 용어 n · 기존 용어 n · 새 유사어 n · 건너뜀 n · 오류 n」. 안내 「아직 등록하지 않았습니다. 오류 행은 빼고 등록합니다. 기존 용어는 유사어만 더하고 뜻·고객사 정보는 바꾸지 않습니다.」. 오류가 있으면 붉은 `FormAlert`. 표(`Table`, minWidth 1040, 좁으면 가로 스크롤, 9행부터 높이 440 고정) : 행 60 · 공식 용어 minWidth 170(새 용어는 「고객사 정보」(해당할 때)·뜻을 작은 글자로 — 분류는 「제거됨 2026-10-03, 분류 삭제」) · 처리 120(새 용어·기존 용어·오류 배지, `restored` 면 「되살림」 배지) · 추가할 유사어 minWidth 180 · 건너뛸 유사어 minWidth 230(낱말 — 사유) · 오류·안내 minWidth 280(`errors` 붉은 글자 「고객사 정보: …」 처럼 칸 이름을 앞에, `warnings` 주황, `notes` 회색). |
| 등록 단추 | `n` = `ERROR` 가 아닌 행 수. 0 이면 비활성입니다. 등록 중에는 「등록 중…」 으로 두 번 누르지 못하게 합니다. 실패(409 동시 등록 충돌 등)하면 서버 문구를 토스트로 보이고 모달은 남겨 둡니다. |
| 오류 | 서버 400(`field=file` — 머리글이 템플릿과 다름·xlsx 아님·매크로 포함·1,000행 초과·등록할 행 없음)은 서버 문구를 토스트로 보이고 모달을 열지 않습니다. |

**규칙(서버 판정)** — 새 용어는 통합관리자만 만들 수 있고, 그 밖의 계정이 올린 새 용어 행은 `ERROR`(「공식 용어 등록은 통합관리자만 할 수 있습니다.」)입니다. 새 용어는 뜻이 필수이고(분류 필수는 「제거됨 2026-10-03, 분류 삭제」), 고객사 정보는 Y/N 또는 빈칸(=N)입니다. 기존 용어 행은 유사어만 더하고 뜻·고객사 정보는 바꾸지 않습니다. 예전 분류 열 템플릿은 400 「템플릿의 머리글과 다릅니다」 입니다. 유사어 규칙(2자 미만·숫자/날짜·공식 용어와 같은 낱말·이미 있음·같은 파일 중복)에 걸리면 그 낱말만 건너뜁니다. 지운 용어와 같은 이름이면 되살립니다(`restored`). 등록은 한 트랜잭션이며 `ERROR` 행만 빼고 씁니다.

목 모드에서는 고른 파일을 exceljs 로 읽어 같은 모양의 판정을 흉내 내고(`systemMock.postGlossaryImport`), 템플릿은 안내 파일로 대신합니다.

### 4-2. 2026-10-03 (분류 삭제)

용어 사전에서 「분류」(domain)를 없앴습니다. DB(V75 — `ax.tb_gls_domain` 표와 `tb_gls_term.domain_id` 삭제) · API · 화면을 함께 바꿉니다. 바뀌기 전 내용은 위 각 절에 「제거됨」 으로 남겨 두었습니다.

| 위치 | 바뀐 점 |
|---|---|
| 용어 · 유사어 표 | 「분류」 열을 뺐습니다. 통합관리자에게는 고객사 정보 용어(`customerInfo:true`)의 공식 용어 옆에 작은 「고객사」 표시를 붙입니다(마우스를 올리면 안내). 다른 계정에게는 보이지 않습니다. |
| 조회 조건 | 「분류」 선택을 뺐습니다. 목록 요청에 `domainCd` 를 보내지 않고, `GET /glossary/domains` 도 부르지 않습니다. 엑셀 이력의 조건 요약에서도 `분류=` 가 빠집니다. |
| 공식 용어 등록 · 편집 폼 | 「분류」 선택 대신 체크 「고객사 정보」 와 안내 「고객사 데이터 권한이 없는 사람에게는 「비공개 용어」 로 보입니다」 를 둡니다. 본문은 `{ term, definition, customerInfo }` 입니다(통합관리자만). |
| 엑셀 업로드 | 템플릿 머리글이 `공식 용어* · 뜻* · 고객사 정보 · 유사어` 입니다. 미리보기 행에는 `domain` 이 없고 새 용어는 `customerInfo` 가 올 수 있습니다. 오류 칸 이름 `customerInfo` 는 「고객사 정보」 로 보입니다. |
| 엑셀 다운로드 | 조회 목록 · 전체(브라우저 대체 경로) 모두 「분류」 열을 뺐습니다. 열은 공식 용어 · 뜻 · 유사어 · 등록자입니다. 서버 생성 파일도 분류 열을 뺍니다(API). |
| 요약 | `domainCnt` · `byDomain` 을 쓰지 않습니다(화면에서는 이미 쓰지 않았습니다). |
| 고객사 가림(R-18) | 판정 기준이 분류에서 용어의 고객사 정보로 옮겨졌습니다. 서버가 주는 `blinded:true` 행을 그리는 방식은 그대로입니다. 기존 고객사 계열 분류 4종(고객사 · 고객협력사 · 협력업체 · 회사/고객사)의 용어는 이관으로 고객사 정보가 켜져 그대로 가려집니다. |
| 변경 이력 | 새 이력의 `customerInfo` 는 「고객사 정보: 예/아니오」 로 보입니다. 분류 삭제 전 이력의 `domainNm` 은 「분류」 로 그대로 읽습니다. |
| 목 | `GLOSSARY_DOMAINS` · `getGlossaryDomains` 를 뺐고, 목 용어는 `customerInfo` 를 가집니다. 가림 흉내도 `customerInfo` 기준입니다. |

## 5. 사용 API

총 **15건** (화면에서 부르는 것 14건 + 버튼 제거된 재생성 1건). 분류 목록 1건은 「제거됨 2026-10-03, 분류 삭제」.

| # | 서비스 함수 | API 명 | Method | Path | 요청 파라미터 | 응답 주요 필드 | 접근 권한 |
|---|---|---|---|---|---|---|---|
| 170 | `getGlossarySummary` | 용어 사전 요약 | GET | `/api/v1/glossary/summary` | — | termCnt, variantCnt, myVariantCnt, noVariantTermCnt, riskVariantCnt, canEditTerm, canWriteVariant, lastChangedAt (domainCnt · byDomain[] 「제거됨 2026-10-03, 분류 삭제」) | sys-gloss 또는 gloss-view |
| 171 | `getGlossaryTerms` | 용어 목록 조회 | GET | `/api/v1/glossary/terms` | keyword, mineOnly, page, size | items[{termId,term,definition,customerInfo,blinded,variants[{variantId,word,byEmpNo,byName,at,editable}]}], meta | sys-gloss 또는 gloss-view |
| 171.5 | ~~`getGlossaryDomains`~~ 「제거됨 2026-10-03, 분류 삭제」 | 용어 분류 목록 | GET | `/api/v1/glossary/domains` | — | domains[{domainId,code,name}] | sys-gloss 또는 gloss-view |
| 172 | `postGlossaryTerms` | 공식 용어 등록 | POST | `/api/v1/glossary/terms` | term, definition, customerInfo | termId | 통합관리자 |
| 173 | `putGlossaryTermsByTermId` | 공식 용어 수정 | PUT | `/api/v1/glossary/terms/{termId}` | term, definition, customerInfo | success | 통합관리자 |
| 174 | `postGlossaryTermsByTermIdVariants` | 유사어 등록 | POST | `/api/v1/glossary/terms/{termId}/variants` | word | variantId, word, warnings[] | sys-gloss 쓰기 권한 |
| 175 | `putGlossaryVariantsByVariantId` | 유사어 수정 | PUT | `/api/v1/glossary/variants/{variantId}` | word | success, warnings[] | 쓰기 권한 + 본인 |
| 176 | `deleteGlossaryVariantsByVariantId` | 유사어 삭제 | DELETE | `/api/v1/glossary/variants/{variantId}` | — | success | 쓰기 권한 + 본인 |
| 176.5 | `deleteGlossaryTermsByTermId` | 공식 용어 삭제 | DELETE | `/api/v1/glossary/terms/{termId}` | — | success | 통합관리자 |
| 177 | `postGlossaryNormalize` | 용어 정규화 미리보기 | POST | `/api/v1/glossary/normalize` | text | normalizedText, replacements[{from,to,termId,variantId,start,end}], skipped[{word,termId,reasonCd,reason}] | sys-gloss 조회 |
| 178 | `postGlossaryReindex` | 용어 임베딩 재생성(버튼 제거됨) | POST | `/api/v1/glossary/reindex` | — | jobId | 통합관리자 |
| 신규 | `getGlossaryVariantsRisks` | 점검 필요 유사어 | GET | `/api/v1/glossary/variants/risks` | — | items[{variantId,word,termId,term,ownerName,riskCd,riskNm}] | 통합관리자 |
| 신규 | `getGlossaryChanges` | 용어 사전 변경 이력 | GET | `/api/v1/glossary/changes` | termId, from, to, page, size | items[{changeId,at,actorId,actorNm,targetCd,actionCd,termId,term,variantId,before,after}], meta | sys-gloss 조회 |
| 신규 | `postGlossaryTermsExport` | 용어 사전 내려받기 | POST | `/api/v1/glossary/terms/export` | scope, menuId, condSummary, keyword, mineOnly, format | file(xlsx) | sys-gloss 또는 gloss-view |
| 신규 2026-10-03 | `getGlossaryImportTemplate` | 용어 사전 업로드 템플릿 | GET | `/api/v1/glossary/import/template` | — | file(xlsx) | sys-gloss 조회 |
| 신규 2026-10-03 | `postGlossaryImport` | 용어 사전 엑셀 업로드 | POST | `/api/v1/glossary/import` | file(multipart), dryRun(true 기본) | dryRun, fileName, totalRows, termNew, termExisting, variantNew, variantSkipped, errorCnt, rows[] | sys-gloss 쓰기 권한 |

## 6. 개발 체크리스트

- [x] 요약 4카드(최근 변경, 실패 시 —)
- [x] 정규화 미리보기 (치환 칩 + 치환하지 않음 칩)
- [x] 검색 확정(400ms·Enter)·내 것만(서버) 필터(분류 필터는 「제거됨 2026-10-03, 분류 삭제」) + 페이징, `?keyword=` 첫 검색어
- [x] 용어 표 + 유사어 칩(본인/타인, 쓰기 권한 있을 때만 수정·삭제)
- [x] 공식 용어 CRUD (통합관리자, 403 안내)
- [x] 유사어 쓰기 권한 UI(비활성 + 이유)
- [x] 점검 필요 유사어 카드·모달(통합관리자)
- [x] 엑셀 옵션 패널(조회 목록 / 전체)
- [x] 임베딩 재생성 — 제거됨
- [x] 변경 이력 모달(GLS-07) · 반영 시점 카드(GLS-06) · 입력 길이(GLS-10) · 공식 용어 검색 선택(GLS-11)
- [x] 분류별 현황 (GLS-13) — 「제거됨 2026-10-03, 분류 삭제」 · 목 정합(GLS-15: 요약 필드명·`domainCd`·`mineOnly`·분류별 건수·`PENDING`)
- [x] 엑셀 업로드(템플릿 내려받기 · 미리보기 모달 · [n건 등록]) — 2026-10-03
- [x] 분류 삭제 · 고객사 정보 체크 — 2026-10-03 (4-2)
- 시험 : `tests/system/glossary-browser.cjs`(응답 고정) · `tests/system/glossary-import-browser.cjs`(엑셀 업로드, 응답 고정) · `tests/system/gloss-chat-live-browser.cjs`(실 API 조회)

### 2026-10-04 머리글 필터가 모든 용어에서 찾음

- 문제: 용어 목록을 서버가 50행씩 나눠 보내고 표의 머리글 필터는 받은 쪽 안에서만 걸러, 다른 쪽에 있는 용어(예: 「lot」)는 찾지 못했습니다.
- 바꾼 것: 용어를 전부 받고(`fetchAllPages` — `GET /glossary/terms` 를 상한 1,000행으로 끝 쪽까지 불러 합침) 표가 50행씩 쪽을 나눕니다(`TabulatorGrid pageSize`). 머리글 필터 · 정렬은 모든 쪽에 적용됩니다. 화면 아래 쪽 이동은 표 바닥의 쪽 표시를 씁니다.
- 「조회 목록 다운로드」 는 머리글 필터를 적용한 모든 쪽의 행입니다. 이력 조건 요약의 「쪽=」 은 빠졌습니다.
- 「전체 다운로드」 의 대체 경로(서버 생성 파일이 없을 때)도 같은 방식으로 바꿨습니다. 예전에는 `size=0` 을 보냈는데 이 API 는 전량을 받지 않아 1건만 왔습니다.
- 용어 사전 조회(gloss-view)도 같은 방식입니다(머리글 검색칸은 지금처럼 끔).
