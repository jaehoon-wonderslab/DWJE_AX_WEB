# 16. `/quality/report-forms` — 보고서 양식 관리

| 항목 | 값 |
| :--- | :--- |
| URL | `/quality/report-forms` |
| 화면 ID | `report-forms` (**하위 화면** — 상위 `qc-report` 에서 진입) |
| 라우트 파일 | `app/(main)/quality/report-forms.jsx` |
| MVC | `domains/quality/view/ReportFormsView.jsx` · `controller/useReportFormsController.js` |
| 기능 ID | QC-04 |
| 접근 권한 | 품질보증팀 · 생산관리팀 · 통합관리자 |

보고서 양식과 **고객사별 공개 정책**을 관리합니다. 양식 구조가 바뀌면 **파서 버전**을 함께 올립니다.

## 1. 컴포넌트

`PageHead`(+`Button(품질 보고서로)`, `Button(엑셀 다운로드)`, `Button primary(양식 등록)`) · `Card(tight)` + `Table`(minWidth 960) · `openFormModal`(양식 등록/편집) · `openModal(wide)`(항목 정의 보기)

## 2. 화면에 출력해야 하는 정보

### 2-1. 양식 목록 (`GET /quality/report-forms`)

| 열 | 폭 | 렌더 |
| :--- | :--- | :--- |
| 양식명 `name` | 180 | |
| 유형 `type` | 110 | `Badge` |
| 항목 수 `fieldCnt` | 80 우측 | |
| 고객사 공개 정책 `disclosurePolicy` | flex | |
| 파서 버전 `parserVer` | 92 중앙 mono | |
| 수정일 `updatedAt` | 110 중앙 | |
| 작업 | 82 | `Button(편집)` |

### 2-2. 양식 항목 정의 모달 (`GET /{formId}/fields`)

부제 `{fieldCnt}개 항목 · 파서 {parserVer}`

| 열 | 렌더 |
| :--- | :--- |
| 항목 `label` | |
| 필드 `field` | mono |
| 생성 주체 `origin` | `mes`→초록 `MES 자동` / `ai`→주황 `AI 초안` / `manual`→`수기` |
| 데이터 권한 `dataFieldKey` | 없으면 `—` |
| 필수 `required` | `●` / `—` |

## 3. 버튼 및 페이징

| 버튼 | 동작 |
| :--- | :--- |
| 양식 등록 | 빈 폼 모달 → `POST /quality/report-forms` |
| 편집 (행) | 값 채운 폼 모달 → `PUT /quality/report-forms/{formId}` |
| **행 클릭** | 항목 정의 모달 |
| 엑셀 다운로드 | 양식 목록 xls (양식명·유형·항목 수·공개 정책·파서 버전·수정일) |
| 품질 보고서로 | `/quality/report` |

페이징 없음.

### 3-1. 양식 등록·편집 폼

| 필드 | 타입 | 선택지 |
| :--- | :--- | :--- |
| 양식명 | text (required) | `예) 8D 리포트` |
| 유형 | select (required) | 품질 이슈 / 폐기 / 고객 클레임 / 품질 분석 / 정기 보고 |
| 고객사 공개 정책 | select | 내부용 / 글로벌 고객사 A · 단가/수율 비공개 / 글로벌 고객사 B · 수율 비공개 / 국내 대기업 B · 거래처 비공개 |
| 변경 메모 | textarea (2행) | 파서 버전 추적용 |

안내 : "공개 정책에 따라 보고서 출력 시 단가·수율·거래처 항목이 자동으로 마스킹됩니다."
양식명 미입력 시 토스트로 막음.

## 4. 그 밖의 기능

- 공개 정책과 `dataFieldKey` 가 **[15. 품질 보고서](./15_quality_report.md)** 의 마스킹 적용 목록으로 이어집니다.
- ⚠️ 유형·정책 선택지가 화면 상수(`FORM_TYPES`, `POLICIES`)로 하드코딩되어 있습니다 — **공통코드 연동 검토 필요**.

## 5. 사용 API

총 **4건**

**보고서 양식 관리** — 4건

| # | 서비스 함수 | API 명 | Method | Path | 요청 파라미터 | 응답 주요 필드 | 접근 권한 | blind | 우선순위 |
|---|---|---|---|---|---|---|---|---|---|
| 98 | `getQualityReportForms` | 양식 목록 조회 | GET | `/api/v1/quality/report-forms` | — | items[{formId,name,type,fieldCnt,disclosurePolicy,parserVer,updatedAt}] | 품질보증팀·생산관리팀·통합관리자 | — | 1 |
| 99 | `postQualityReportForms` | 양식 등록 | POST | `/api/v1/quality/report-forms` | name, type, fields[], disclosurePolicy | formId, parserVer | 상동 | — | 1 |
| 100 | `putQualityReportFormsByFormId` | 양식 수정 | PUT | `/api/v1/quality/report-forms/{formId}` | name, type, fields[], disclosurePolicy | parserVer | 상동 | — | 1 |
| 101 | `getQualityReportFormsByFormIdFields` | 양식 항목 정의 조회 | GET | `/api/v1/quality/report-forms/{formId}/fields` | — | fields[{field,label,origin,dataFieldKey,required}] | 상동 | — | 2 |


## 6. 개발 체크리스트

- [ ] 양식 목록 표 7열
- [ ] 등록·편집 폼 모달 (유형 · 공개 정책 · 변경 메모)
- [ ] 항목 정의 모달 (생성 주체 배지 · 데이터 권한 키 · 필수)
- [ ] 파서 버전 표기
- [ ] 엑셀 다운로드 · 품질 보고서 복귀
- [ ] (개선) 유형·정책 선택지 공통코드 연동
