# 15. `/quality/report` — 품질 보고서

| 항목 | 값 |
| :--- | :--- |
| URL | `/quality/report` |
| 화면 ID | `qc-report` (**하위 화면** — 상위 `qc-defect` 에서 진입) |
| 라우트 파일 | `app/(main)/quality/report.jsx` |
| MVC | `domains/quality/view/QualityReportView.jsx` · `controller/useQualityReportController.js` · `model/qualityRepository.js` |
| 기능 ID | QC-03 |
| 접근 권한 | 품질보증팀 · 생산관리팀 · 통합관리자 |

원인 분석·이력 추적 결과를 양식에 자동 기입하고, 증빙 이미지를 붙이며, 영업비밀을 마스킹합니다.
**초록 배지 = 자동 기입 / 주황 배지 = AI 초안(담당자 확정 필요).**

## 1. 컴포넌트

| # | 영역 | 컴포넌트 |
| :-- | :--- | :--- |
| 0 | 페이지 헤드 | `PageHead` + `Button(양식 관리)` · `Button(PPT용 이미지)` · `Button primary(초안 재생성)` |
| 1 | 조회 조건 | `Filters` + `SelectField`(보고서 양식) + `TextField`(대상 LOT) + `SelectField`(고객사 공개 정책) + `Button primary(생성)` |
| 2 | 보고서 미리보기 | `Card`(bodyStyle=muted) + `s.doc` 문서 영역 + `StateBadge` — `Grid cols=[2,1]` 좌 |
| 2-1 | 머리 정보 | 2열 격자 (`header[[k,v]]`) |
| 2-2 | 1. 불량 발생 현황 | `DocSection(who=auto)` + `DocTable` |
| 2-3 | 2. 공정 조건 | `DocSection(who=auto)` + `DocTable` + note |
| 2-4 | 3~4. 서술 섹션 | `DocSection(who=ai)` + `TextInput(multiline, 점선)` — **인라인 편집** |
| 2-5 | 5. 증빙 이미지 | `DocSection` + 썸네일 그리드 + `Button(이미지 선택)` |
| 2-6 | 결재란 | 작성(품질보증팀) / 검토 / 승인 3칸 |
| 2-7 | 문서 하단 액션 | `Button danger(반려)` · `Button(마스킹 해제 요청)` · `Button(임시 저장)` · `Button primary(검토 완료 · 확정)` |
| 3 | 자동 기입 현황 | `Card(tight)` + 항목별 `Badge` — 우측 |
| 4 | 마스킹 적용 | `Card(tight)` + 항목별 `Badge` — 우측 |
| 5 | 출력 | `Card` + `Button` × 3 (xls / ppt-img / pdf) — 우측 |
| 6 | 보고서 이력 | `Card(tight)` + `ListRow` — 우측 |
| 7 | 증빙 이미지 모달 | `openModal(wide)` + `ImagePicker` |
| 8 | 마스킹 해제 요청 폼 | `openFormModal` |
| 9 | 반려 폼 | `openFormModal` |
| 10 | 빈 상태 | `EmptyState` — "작성된 품질 보고서가 없습니다. 불량 현황 조회에서 초안을 생성해 주세요." |

## 2. 화면에 출력해야 하는 정보

### 2-1. 조회 조건

| 항목 | 기본값 | 선택지 |
| :--- | :--- | :--- |
| 보고서 양식 | `불량 폐기 보고서` | `GET /quality/report-forms` 의 `name[]` |
| 대상 LOT | `L260824-031` | 자유 입력 |
| 고객사 공개 정책 | `글로벌 고객사 A` | 글로벌 고객사 A / 국내 대기업 B / 내부용 |

### 2-2. 보고서 본문 (`GET /quality/reports/{reportId}`)

`formName` · `baseDate` · `header[[label,value]]` · `resultTable{head,rows}` · `processCondition{head,rows,note}` · `sections[{key,title,body,who}]` · `images[{id,name,defectType,attached}]` · `state`
문서 부제 : `덕우전자 제1공장 · 품질보증팀 · {날짜}`
증빙 각주 : `NAS 경로 참조 · N장 첨부 (해당 LOT 불량 판정 M건 중 선택)`

### 2-3. 자동 기입 현황 (`autofill-status`)

`fields[{field, origin}]` — `mes`→초록 `자동`, `ai`→주황 `AI 초안`, `manual`→기본 `수기`
각주 : "수치·표·이력은 자동 확정, 서술 항목은 담당자 확정 후 반영됩니다."

### 2-4. 마스킹 적용 (`masking`)

`rules[{field, policy, action}]` — `공개`→초록 배지, `마스킹`→기본 배지
각주 : "⑦ 보안 필터링 Agent 처리 · 감사 로그 기록됨"

### 2-5. 보고서 이력 (`GET /quality/reports`)

`{formName} · {lotNo}` · `{state} · v{version}` · `updatedAt`(MM-DD HH:mm)

## 3. 버튼 및 페이징

| 버튼 | 동작 |
| :--- | :--- |
| 생성 | `POST /quality/reports/draft` (formId · lotNo · disclosurePolicy) |
| 초안 재생성 | `POST /{reportId}/regenerate` |
| 임시 저장 | `PUT /{reportId}` (sections) |
| 검토 완료 · 확정 | `POST /{reportId}/confirm` |
| 반려 | 사유 모달 → `POST /{reportId}/reject` |
| 마스킹 해제 요청 | 항목 체크 + 사유 모달 → `POST /{reportId}/unmask-request` |
| 이미지 선택 | 모달 → `POST /{reportId}/evidence-images` |
| 엑셀 (.xls) / PPT용 이미지 / PDF 미리보기 | `POST /{reportId}/export (format=xls\|ppt-img\|pdf)` |
| 양식 관리 | `/quality/report-forms` |

페이징 없음.

### 3-1. 증빙 이미지 선택 모달 (`ImagePicker`)

| 요소 | 내용 |
| :--- | :--- |
| 기준 `criteria` | `ng`(불량 판정 건만, 기본) / `lot`(해당 LOT 전체) / `borderline`(경계 판정 포함) — 변경 시 `GET /{reportId}/evidence-images` 재조회 |
| 첨부 매수 `limit` | 4 / 6 / 10 |
| 목록 | 썸네일 카드(파일명 + 불량 유형), 클릭 토글 |
| 각주 | "이미지는 NAS 경로를 참조하며 서버로 복사하지 않습니다." |
| 첨부 버튼 | `첨부 (N장)` — 매수 초과 시 토스트로 막음 |

### 3-2. 마스킹 해제 요청 폼

`해제할 항목`(check — `action === '마스킹'` 인 필드) + `해제 사유`(textarea, 필수)
부제 : "권한자 승인 후 적용되며, 요청 내역은 감사 로그에 기록됩니다"

## 4. 그 밖의 기능

- **보고서 ID 하드코딩 금지** — 목록의 첫 건을 펼칩니다(`data.reportId`).
- 로딩 종료 후 보고서가 0건이면 로딩에 머무르지 않고 `EmptyState`.
- 서술 섹션은 확정 전까지 화면 state 로만 보관.
- PPT 는 표·그래프 이미지를 제공하고 최종 편집은 담당자 몫.
- 출력은 전부 다운로드 이력(SY-14)에 기록.

## 5. 사용 API

총 **13건**

**품질 보고서** — 13건

| # | 서비스 함수 | API 명 | Method | Path | 요청 파라미터 | 응답 주요 필드 | 접근 권한 | blind | 우선순위 |
|---|---|---|---|---|---|---|---|---|---|
| 85 | `postQualityReportsDraft` | 품질 보고서 초안 생성 | POST | `/api/v1/quality/reports/draft` | formId, lotNo, occurDate, disclosurePolicy | reportId, version, sections[] | 품질보증팀·생산관리팀·통합관리자 | — | 1 |
| 86 | `getQualityReportsByReportId` | 품질 보고서 조회 | GET | `/api/v1/quality/reports/{reportId}` | — | header{}, resultTable{}, processCondition{}, causeAnalysis{}, traceHistory{}, images[], actions{}, state | 품질보증팀·생산관리팀·통합관리자 | qty, yield, price, customer, mold | 1 |
| 87 | `getQualityReportsByReportIdAutofillStatus` | 자동 기입 현황 조회 | GET | `/api/v1/quality/reports/{reportId}/autofill-status` | — | fields[{field,origin(mes|ai|manual)}] | 상동 | — | 2 |
| 88 | `getQualityReportsByReportIdMasking` | 마스킹 적용 내역 | GET | `/api/v1/quality/reports/{reportId}/masking` | — | rules[{field,policy,action}] | 상동 | — | 1 |
| 89 | `postQualityReportsByReportIdUnmaskRequest` | 마스킹 해제 요청 | POST | `/api/v1/quality/reports/{reportId}/unmask-request` | fields[], reason | requestId | 상동 | — | 2 |
| 90 | `getQualityReportsByReportIdEvidenceImages` | 증빙 이미지 후보 조회 | GET | `/api/v1/quality/reports/{reportId}/evidence-images` | criteria(ng|lot|borderline), limit(4|6|10) | images[{id,name,defectType,nasPath}] | 상동 | — | 1 |
| 91 | `postQualityReportsByReportIdEvidenceImages` | 증빙 이미지 첨부 | POST | `/api/v1/quality/reports/{reportId}/evidence-images` | imageIds[] | attachedCnt | 상동 | — | 1 |
| 92 | `putQualityReportsByReportId` | 보고서 임시 저장 | PUT | `/api/v1/quality/reports/{reportId}` | sections[] | success | 상동 | — | 1 |
| 93 | `postQualityReportsByReportIdConfirm` | 보고서 확정 | POST | `/api/v1/quality/reports/{reportId}/confirm` | — | state, confirmedAt, confirmedBy | 상동 | — | 1 |
| 94 | `postQualityReportsByReportIdReject` | 보고서 반려 | POST | `/api/v1/quality/reports/{reportId}/reject` | reason | state | 상동 | — | 1 |
| 95 | `postQualityReportsByReportIdRegenerate` | 보고서 초안 재생성 | POST | `/api/v1/quality/reports/{reportId}/regenerate` | — | version | 상동 | — | 2 |
| 96 | `postQualityReportsByReportIdExport` | 보고서 출력 | POST | `/api/v1/quality/reports/{reportId}/export` | format(xls|ppt-img|pdf) | file(binary) | 상동 | * | 1 |
| 97 | `getQualityReports` | 품질 보고서 이력 | GET | `/api/v1/quality/reports` | from, to, formId, state, page, size | items[], meta | 상동 | — | 2 |


## 6. 개발 체크리스트

- [ ] 조회 조건 3종 + 초안 생성
- [ ] 문서형 미리보기 (머리 정보 격자 · 표 2종 · 서술 섹션 · 증빙 · 결재란)
- [ ] 서술 섹션 인라인 편집
- [ ] 자동 기입 현황 배지 (mes / ai / manual)
- [ ] 마스킹 적용 목록 + 해제 요청 폼(사유 필수)
- [ ] 증빙 이미지 선택 모달 (기준 3종 · 매수 제한 · NAS 참조)
- [ ] 임시 저장 / 확정 / 반려 / 재생성
- [ ] 출력 3종 (xls · ppt-img · pdf)
- [ ] 보고서 이력 목록
- [ ] 보고서 0건 빈 상태 처리
