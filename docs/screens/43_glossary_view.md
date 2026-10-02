# 43. `/glossary/view` — 용어 사전 조회

| 항목 | 값 |
| :--- | :--- |
| URL | `/glossary/view` (`?term={termId}` 로 상세를 엽니다 — 새로 고침·공유에도 유지) |
| 대그룹 | 용어 사전(허브 `/menu/glossary`, 「보고서」 와 같은 single 방식) — 2026-10-01 결정 R-09·R-15 |
| 화면 ID | `gloss-view` |
| 라우트 파일 | `app/(main)/glossary/view.jsx` · 허브 `app/(main)/menu/glossary.jsx` |
| MVC | `domains/glossary/model/glossaryRepository.js` · `controller/useGlossaryReadController.js` · `view/GlossaryReadView.jsx` |
| 기능 ID | GL-01 (F01~F06) |
| 접근 권한 | `gloss-view` 조회 권한(미배정 제외 전 부서). 이 화면은 항상 읽기 전용 |

공식 용어와 현장 유사어를 찾아보기만 합니다. 등록·수정·삭제·정규화 미리보기·임베딩 재생성은 없습니다(용어 사전 관리 `30_system_glossary.md` 담당).
조회 API 는 관리 화면과 같은 서버 API 이며, 서버가 `sys-gloss` 또는 `gloss-view` 로 통과시킵니다. 이 화면의 호출자에게는 관리 지표·등록자 사번이 `null` 입니다.

## 1. 컴포넌트

`PageHead`(+`용어 사전 관리로 이동`(sys-gloss 쓰기 권한자만) · `ExportMenuButton`) · `StatCard`×3 · 오류 줄 · `Hint`(조회 전용 안내) · 분류 칩 띠(`SelectChip`, 용어 수 상위 8개 + 전체 분류) · `Filters`(검색 / 분류 / 조회) · `Card`+`TabulatorGrid`+`Pagination` · 상세 `Card`(넓은 화면 표 오른쪽 360, 좁은 화면 표 위)

## 2. 화면에 출력해야 하는 정보

- 요약 : 공식 용어(`termCnt`, 보조 `최근 변경 {lastChangedAt 날짜}`) · 유사어(`variantCnt`) · 분류(`domainCnt`). 요약 실패 시 `—` + 오류 줄.
- 검색 : 공식 용어·뜻·유사어(대소문자 무시). Enter · 조회 · 입력 멈춤 400ms 로 확정, 입력 중 포커스 유지. 일치한 글자는 `<mark>` 강조(이스케이프 뒤).
- 분류 : `GET /glossary/domains` 의 `code` + 전체. 칩이나 선택을 바꾸면 1쪽.
- 표(`renderVertical:'basic'`, 머리글 정렬·필터 끔 — 서버 정렬) : 공식 용어 minWidth 130 · 뜻 220(2줄, 툴팁) · 분류 100(tag) · 유사어 200(칩 최대 6 + 「외 n」). 데이터 권한으로 가린 용어(`blinded`)는 「비공개 용어」·「비공개」 회색. 좁은 화면은 카드 안 가로 스크롤로 「유사어」 열까지.
- 상세 : 공식 용어 · 분류 칩(누르면 분류 필터) · 뜻 전문 · 유사어 칩 전부(등록자 이름) · 관련 용어 칩(누르면 그 용어) · 최근 수정 · 「관리 화면에서 편집」(쓰기 권한자만 → `/system/glossary?keyword={term}`). 없는 용어는 「용어를 찾을 수 없습니다(삭제되었을 수 있습니다)」.
- 빈 상태 : 검색 결과 0건 「검색 조건에 맞는 용어가 없습니다. 검색어를 줄이거나 분류를 [전체] 로 바꿔 보세요.」 / 사전 0건 「등록된 용어가 없습니다.」(+ 쓰기 권한자에게 관리 화면 이동).

## 3. 엑셀 다운로드 ▾ (공통 CMN-07, GLV-13)

- 조회 목록 다운로드(n건) : 지금 그리드 행(현재 쪽), 열 공식 용어·뜻·분류·유사어(` · ` 이음), `attrs=['term','definition','domain','variants']`. 가린 용어는 「비공개」, 「비공개 처리 n건」 = 이력 `blindCnt`. 등록자는 넣지 않습니다. 이력 `menuId=gloss-view`, `scopeCd=VIEW`, 조건 요약 `검색=…, 분류=…, 쪽=…`.
- 전체 다운로드(N건, N=termCnt) : `POST /glossary/terms/export {scope:'ALL', menuId:'gloss-view'}` 서버 생성(조건 무시, 상한 5,000, 이력은 서버 기록). 서버 API 가 없으면 `size=0` 전체 조회로 브라우저에서 만듭니다.

## 4. 사용 API

| 서비스 함수 | Method | Path | 요청 | 응답 주요 필드 |
|---|---|---|---|---|
| `getGlossarySummary` | GET | `/api/v1/glossary/summary` | — | termCnt, variantCnt, domainCnt, lastChangedAt, byDomain[] (관리 지표 null) |
| `getGlossaryTerms` | GET | `/api/v1/glossary/terms` | keyword, domainCd, page, size | items[{termId,term,definition,domain,blinded,variants[{variantId,word,byName,at}]}], meta |
| `getGlossaryDomains` | GET | `/api/v1/glossary/domains` | — | domains[{code}] |
| `getGlossaryTermsByTermId` | GET | `/api/v1/glossary/terms/{termId}` | — | termId, term, definition, domain, updatedAt, blinded, variants[], relatedTerms[{termId,term,domain,reasonCd}] |
| `postGlossaryTermsExport` | POST | `/api/v1/glossary/terms/export` | scope, menuId, condSummary, format | file(xlsx) |

## 5. 개발 체크리스트

- [x] 대그룹·허브·라우트(메인)
- [x] 목록·검색·분류 칩·강조(GLV-03·10)
- [x] 상세 패널 · `?term=`(GLV-04, 좁은 화면은 모달 대신 표 위 카드)
- [x] 엑셀 옵션 패널(GLV-05·13) · 가린 용어 비공개(GLV-08 대비)
- [x] 쓰기 권한자 관리 바로가기 → 관리 화면 `?keyword=`(GLV-09)
- [x] 항목 1개 그룹 허브 건너뛰기(GLV-11, 8장 Q3 권장안) — 사이드바 「용어 사전」·「자연어 질의 이력」 은 허용 항목이 하나면 그 화면으로 바로 갑니다(`Sidebar.jsx`). 허브 주소로 직접 들어오면 허브가 보입니다
- [x] 목·문서·시험(GLV-12)
- 시험 : `tests/system/gloss-view-browser.cjs`(응답 고정) · `tests/system/gloss-chat-live-browser.cjs`(실 API 조회)
- 2단계 서버 계약 대조(2026-10-01) : 목록·상세 응답에 `updatedAt`·`domainId` 가 더 오고, 상세 `relatedTerms[].reasonCd` 는 `REF_IN_DEF`·`REF_BY`·`SAME_DOMAIN_NAME`. 화면 변경 없음
- 고객사 용어 가림(GLV-08)은 2026-10-02 결정됨(R-18). 서버가 `blinded:true` 로 주면 표는 「비공개 용어」·「비공개」 회색, 상세는 「데이터 접근 권한이 없어 내용을 표시하지 않습니다.」(유사어·관련 용어 없음), 엑셀은 두 파일 모두 「비공개」 와 「비공개 처리 n건」 입니다
