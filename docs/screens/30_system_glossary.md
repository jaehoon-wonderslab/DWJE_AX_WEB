# 30. `/system/glossary` — 용어 사전 관리

| 항목 | 값 |
| :--- | :--- |
| URL | `/system/glossary` |
| 화면 ID | `sys-gloss` |
| 라우트 파일 | `app/(main)/system/glossary.jsx` |
| MVC | `domains/system/view/GlossaryView.jsx` · `controller/useGlossaryController.js` |
| 기능 ID | SY-06 |
| 접근 권한 | 전 부서 (공식 용어 등록·수정·삭제는 **통합관리자 전용**) |

**권한 규칙 — 공식 용어는 통합관리자만 편집. 유사어는 누구나 등록하되 본인이 등록한 것만 수정·삭제.**

## 1. 컴포넌트

`PageHead`(+엑셀 다운로드 · 용어 임베딩 재생성 · 공식 용어 등록(권한자만) · `Button primary(유사어 등록)`) · `StatCard`×4 · `Hint` · `Card`(용어 정규화 미리보기) · `Filters`(검색 / 분류 / `CheckRow(내가 등록한 유사어만)`) · `Card(tight)`+`Table`+`Pagination` · `openFormModal`(용어/유사어) · `openConfirmModal`(삭제)

## 2. 화면에 출력해야 하는 정보

### 2-1. 요약 카드 (`GET /glossary/summary`)

공식 용어(`termCnt`, 보조 "보고서 표기 기준") · 등록 유사어(`variantCnt`, 보조 `분류 N종`) · 내가 등록(`mineCnt`, 보조 "수정·삭제 가능") · 유사어 없음(`emptyCnt`, tone down)

### 2-2. 용어 정규화 미리보기 (`POST /glossary/normalize`)

- 입력 : `TextField(현장 표현)` — 기본 샘플 `"어제 캔 라인에서 찍힘 불량 나서 파카 써야 함. 쉴드캔 외관도 확인 필요"`
- 출력 : 정규화된 문장 + 치환 칩 목록 (`{from}` 취소선 → `{to}` 초록 굵게). 치환 없으면 "바꿀 유사어를 찾지 못했습니다."
- 각주 : "보고서 생성·자연어 질의 처리 시 같은 규칙으로 용어를 맞춥니다."

### 2-3. 조회 조건

검색(용어 · 뜻 · 유사어) · 분류(`전체` + `GET /glossary/domains` 의 `code[]`) · `내가 등록한 유사어만` 체크

### 2-4. 용어 · 유사어 표 (`GET /glossary/terms`)

| 열 | 폭 | 렌더 |
| :--- | :--- | :--- |
| 공식 용어 `term` | 130 | bold |
| 뜻 `definition` | 280 | wrap |
| 분류 `domain` | 110 | `Badge` |
| **유사어 (등록자)** | flex | 칩 목록 — `word` + `byName`. **본인 것(`mine`)은 강조색 + × 삭제 아이콘, 클릭 시 수정 가능**. 남의 것은 회색·비활성. 없으면 "등록된 유사어 없음" |
| 관리 | 150 | `유사어 추가` · (권한자) `편집` · `삭제` |

빈 상태 : "검색 조건에 맞는 용어가 없습니다."

## 3. 버튼 및 페이징

| 버튼 | 동작 |
| :--- | :--- |
| 공식 용어 등록 / 편집 | 폼 → `POST /glossary/terms` · `PUT /glossary/terms/{termId}` (통합관리자) |
| 공식 용어 삭제 | 확인 모달(danger) — **딸린 유사어 N개도 함께 빠진다고 안내** → `DELETE /glossary/terms/{termId}` |
| 유사어 등록 / 수정 | 폼 → `POST /glossary/terms/{termId}/variants` · `PUT /glossary/variants/{variantId}` |
| 유사어 삭제 (× 또는 버튼) | 확인 모달 → `DELETE /glossary/variants/{variantId}` |
| 정규화 | `POST /glossary/normalize` |
| 용어 임베딩 재생성 | `POST /glossary/reindex` → 토스트 |
| 엑셀 다운로드 | 용어 사전 xls (공식 용어·뜻·분류·유사어·등록자) |
| 조회 | `reload()` |

**페이징** — `usePaging({resetKey: keyword\|domain\|mineOnly})` + `Pagination`.

### 3-1. 폼 필드

**공식 용어** — 공식 용어(필수, `예) Stiffener`) · 분류(select, 필수) · 뜻(textarea, 필수, `예) 스티프너 / FPCB 보강판 (Stiffener)`)
안내 : "공식 용어는 보고서 표기와 AI 응답의 기준입니다. 현장 표현은 유사어로 등록하세요."

**유사어** — 공식 용어(select 전폭, 필수 — `{term} — {definition}`) · 유사어(필수, `예) 보강판 · 스티프너 · 찍힘`)
안내 : "등록한 유사어는 자연어 질의와 보고서 생성 시 공식 용어로 자동 정규화됩니다."

## 4. 그 밖의 기능

- **소프트 삭제 복원** — 지웠던 이름으로 다시 등록하면 서버가 그 용어를 되살립니다. 새로 만든 것과 되살아난 것을 구분해 알립니다 : "이전에 삭제한 용어를 되살렸습니다. 유사어 N개도 함께 돌아왔습니다."
- 분류 선택지는 **기준정보 `/glossary/domains`** 에서 받습니다(등록된 용어에서 뽑으면 첫 용어를 만들 수 없음).
- `canEditTerm` 은 `summary.canEditTerm` 서버 값.

## 5. 사용 API

총 **11건**

**용어 사전 관리** — 11건

| # | 서비스 함수 | API 명 | Method | Path | 요청 파라미터 | 응답 주요 필드 | 접근 권한 | blind | 우선순위 |
|---|---|---|---|---|---|---|---|---|---|
| 170 | `getGlossarySummary` | 용어 사전 요약 | GET | `/api/v1/glossary/summary` | — | termCnt, variantCnt, domainCnt, myVariantCnt, noVariantTermCnt, byDomain[] | 전 부서 | — | 2 |
| 171 | `getGlossaryTerms` | 용어 목록 조회 | GET | `/api/v1/glossary/terms` | keyword, domainCd, page, size | items[{termId,term,definition,domain,variants[{variantId,word,byEmpNo,byName,at,editable}]}], meta | 전 부서 | — | 1 |
| 171.5 | `getGlossaryDomains` | 용어 분류 목록 | GET | `/api/v1/glossary/domains` | — | domains[{domainId,code,name}] | 통합관리자 | — | 1 |
| 172 | `postGlossaryTerms` | 공식 용어 등록 | POST | `/api/v1/glossary/terms` | term, definition, domainCd | termId | 통합관리자 | — | 1 |
| 173 | `putGlossaryTermsByTermId` | 공식 용어 수정 | PUT | `/api/v1/glossary/terms/{termId}` | term, definition, domainCd | success | 통합관리자 | — | 1 |
| 174 | `postGlossaryTermsByTermIdVariants` | 유사어 등록 | POST | `/api/v1/glossary/terms/{termId}/variants` | word | variantId | 전 부서 | — | 1 |
| 175 | `putGlossaryVariantsByVariantId` | 유사어 수정 | PUT | `/api/v1/glossary/variants/{variantId}` | word | success | 전 부서 | — | 1 |
| 176 | `deleteGlossaryVariantsByVariantId` | 유사어 삭제 | DELETE | `/api/v1/glossary/variants/{variantId}` | — | success | 전 부서 | — | 1 |
| 176.5 | `deleteGlossaryTermsByTermId` | 공식 용어 삭제 | DELETE | `/api/v1/glossary/terms/{termId}` | — | success | 통합관리자 | — | 1 |
| 177 | `postGlossaryNormalize` | 용어 정규화 미리보기 | POST | `/api/v1/glossary/normalize` | text | normalizedText, replacements[{from,to,termId}] | 전 부서 | — | 1 |
| 178 | `postGlossaryReindex` | 용어 임베딩 재생성 | POST | `/api/v1/glossary/reindex` | — | jobId | 전산팀·통합관리자 | — | 2 |


## 6. 개발 체크리스트

- [ ] 요약 4카드
- [ ] 정규화 미리보기 (치환 칩)
- [ ] 검색·분류·내 것만 필터 + 페이징
- [ ] 용어 표 + 유사어 칩(본인/타인 구분, 인라인 수정·삭제)
- [ ] 공식 용어 CRUD (통합관리자 권한 분기)
- [ ] 유사어 CRUD (본인 것만)
- [ ] 용어 삭제 시 딸린 유사어 수 안내
- [ ] 소프트 삭제 복원 안내
- [ ] 임베딩 재생성 · 엑셀 다운로드
