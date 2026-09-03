# 23. `/report/scrap/new` — 폐기 보고서 작성 (5단계 위저드)

| 항목 | 값 |
| :--- | :--- |
| URL | `/report/scrap/new` |
| 화면 ID | `rpt-scrap-new` (**하위 화면** — 상위 `rpt-scrap` 에서 진입) |
| 라우트 파일 | `app/(main)/report/scrap/new.jsx` |
| MVC | `domains/report/view/ScrapWizardView.jsx` · `controller/useScrapWizardController.js` · `shared/constants/reportColumns.js`(`SCRAP_WIZARD_STEPS`), `shared/constants/organization.js`(`APPROVERS`,`REVIEW_OWNERS`) |
| 기능 ID | RP-07 |
| 접근 권한 | 품질보증팀 · 생산관리팀 · 경영진 · 통합관리자 |

**MES 폐기 전표 선택 → 수기 입력 → 금액 산정 → 검토·결재선 → 생성**

> **핵심 규칙 — 금액 입력은 필수가 아닙니다.** 단가를 비운 채 저장하면 `미산정` 으로 표기되고 금액 합계에서 제외된 상태로 보고서를 진행할 수 있습니다.

## 1. 컴포넌트 (공통)

`PageHead`(+`Button(폐기 보고서 목록)`, `Button(초기화)`) · `Steps`(5단계, `onPick` 으로 직접 이동) · 단계별 본문 · 하단 이동 바(`이전` / `{n} / 5 단계 — {제목}` / `다음`)

## 2. 단계별 컴포넌트 · 출력 정보 · 버튼

### 1단계 — MES 폐기 대상 검색

| 요소 | 내용 |
| :--- | :--- |
| 조회 조건 | `DateField`(발생 시작/종료일) · `SelectField` 공정(전체/Press/A Plating/B Plating/Coating) · 모델(전체/KRIOS/EOS-S/EOS-SC/BOI/MEM-B/MEM-S) · 발생 구분(전체/제조공정/협력업체/IQC) ⚠️ 하드코딩 — 서버 연동 필요 |
| 표 (`GET /reports/scrap/mes-vouchers`) | 선택(`CheckRow`) · 발생일 · LOT(mono) · 모델 · 공정 · 불량 유형 · 수량(EA, **qty**) · 발생 구분 · MES 전표(mono) — 행 클릭으로도 토글 |
| 카드 우측 | `Button(전체 선택)` · `Button(선택 해제)` |
| 하단 선택 바 | `선택 전표 N건` · `선택 수량 N EA` · "선택한 전표만 폐기 보고서에 포함됩니다." |

### 2단계 — 수기 입력

| 요소 | 내용 |
| :--- | :--- |
| 문서 기본 정보 `Card` | 문서번호 · 보존기간(1/3/5/10 년) · 발생 공정 · 업체명 · 제조자 · 작성자 · 작성일자(`DateField`) · **발생 구분 체크 3종**(제조공정/협력업체/IQC) · 불량내용(textarea) — 변경 즉시 `PUT /drafts/{draftId}` 임시 저장 |
| 수기 폐기 행 `Card` | `Table` — 항목명 · 구분(`Badge amber`) · 모델 · 공정 · 폐기 사유(wrap) · 수량(**qty**) · `Button danger(삭제)` |
| 행 추가 폼 | 항목명(필수) · 구분(Loss/공정불량/불용 재고) · 모델 · 공정 · 수량(필수) · 단가(비우면 3단계 미산정) · 폐기 사유(textarea) |
| 빈 상태 | "수기 폐기 행이 없습니다. MES 전표만으로 보고서를 작성합니다." |

### 3단계 — 폐기 금액 산정 (`POST /drafts/{draftId}/calculate`)

| 요소 | 내용 |
| :--- | :--- |
| 요약 `StatCard`×4 | 총 폐기수량(**qty**) · 공정불량(보조 `MES 전표 N건 집계`) · Loss(`lossQty+deadQty`, 보조 `수기 입력 N건 포함`) · 총 폐기 금액(**price**, 보조 `미산정 N건 · M EA 제외`) |
| 산정 결과 표 | 모델(+`수기` 배지) · 공정 · 수량(**qty**) · 적용 단가(**price**, 미산정이면 `미산정`) · 산정 금액(**price**, 미산정이면 `—`) · **단가 출처** 배지(`단가 미산정` / `수기 조정`(amber) / `수기`(amber) / `기준정보`(green) + 사유·버전) · `Button(단가 입력/조정)` |
| 카드 우측 배지 | `폐기 N EA`(red) · `금액 N 원`(amber) · `미산정 N` |
| 단가 조정 폼 | 적용 단가(비우면 미산정) + 조정 사유(textarea) → `PUT /drafts/{draftId}/unit-price` — **사유는 감사 로그 기록** |
| `Hint` · 각주 | 미산정 진행 허용 안내 / "단가는 원가 기준정보 2026-07 버전 기준" |

### 4단계 — 검토 · 결재선 지정

| 요소 | 내용 |
| :--- | :--- |
| 부서별 검토 요청 `Card` | 부서별 행 — `SelectField({부서} 검토자, REVIEW_OWNERS[dept])` · `TextField(검토 요청 내용)` · `CheckRow(검토 요청)` |
| 결재선 `Card` | `SelectField` 기안 / 검토 / 승인 (`APPROVERS.draft/review/approve`) |
| 요청 설정 `Card` | `DateField(검토 기한)` · 알림 채널 체크(메일 / 시스템 팝업 / SMS) · `Button primary(검토 요청 발송)` |
| 각주 | "검토 요청은 알림 수신자 관리(SY-05)에 등록된 연락처로 발송됩니다." |

변경 즉시 `PUT /drafts/{draftId}/approval-line` 저장, 발송은 `POST /drafts/{draftId}/review-request`.

### 5단계 — 미리보기 · 생성

| 요소 | 내용 |
| :--- | :--- |
| 결재 양식 미리보기 `KeyValue` | 문서번호 · 보존기간 · 불량내용 · 발생 공정 · 업체명 · 제조자 · 작성자 · 작성일자 · MES 전표 N건 · 수기 행 N건 · 총 폐기수량(**qty**) · 총 폐기 금액(**price**, 미산정 제외 표기) |
| 결재선 `KeyValue` | 기안 / 검토 / 승인 / 기한 |
| 검토 요청 부서 `Card` | 부서 · 검토자 + `Badge(요청/제외)` |
| 생성 `Card` | `Button primary(폐기 보고서 생성)` → `POST /drafts/{draftId}/publish` → 성공 시 `/report/scrap` 이동 |
| 각주 | "생성하면 문서번호가 확정되고, 지정한 검토 부서에 요청이 발송됩니다." |

## 3. 버튼 및 페이징 정리

| 버튼 | 동작 |
| :--- | :--- |
| 폐기 보고서 목록 | `/report/scrap` |
| 초기화 | 새 초안 생성 + 1단계 복귀 |
| 이전 / 다음 | 단계 이동. **전표 0건이면 다음 불가**(토스트) |
| `Steps` 클릭 | 해당 단계로 직접 이동 (동일 검증) |

페이징 — MES 전표 목록 API 는 `page`/`size` 를 지원하나 현재 화면 미노출. → **개선 항목**

## 4. 그 밖의 기능

- **초안은 2단계로 넘어갈 때 생성** — 예전에는 진입만 해도 만들어져 빈 초안이 쌓였습니다. 1단계는 초안 없이 동작.
- 단계 이동 시 `PUT /drafts/{draftId}` 로 `step`·`cond`·`pickedVoucherIds` 저장, **3단계 이상이면 금액 재산정**.
- 2·4단계 폼은 입력 즉시 서버 저장(낙관적 로컬 state 동기화).
- 단가 수기 조정은 사유와 함께 감사 로그 기록.

## 5. 사용 API

총 **10건**

**폐기 보고서 작성 위저드** — 10건

| # | 서비스 함수 | API 명 | Method | Path | 요청 파라미터 | 응답 주요 필드 | 접근 권한 | blind | 우선순위 |
|---|---|---|---|---|---|---|---|---|---|
| 115 | `getReportsScrapMesVouchers` | MES 폐기 전표 조회 (1단계) | GET | `/api/v1/reports/scrap/mes-vouchers` | from, to, processId, modelCd, defectTypeCd, originType, page, size | items[{voucherId,occurDate,lotNo,model,process,defectType,qty,originType,docNo}], meta | 상동 | qty | 1 |
| 116 | `postReportsScrapDrafts` | 초안 생성·임시저장 | POST | `/api/v1/reports/scrap/drafts` | cond{}, pickedVoucherIds[], form{} | draftId, docNo | 상동 | — | 1 |
| 117 | `putReportsScrapDraftsByDraftId` | 초안 수정 | PUT | `/api/v1/reports/scrap/drafts/{draftId}` | step, cond{}, pickedVoucherIds[], form{}, review{} | success | 상동 | — | 1 |
| 118 | `postReportsScrapDraftsByDraftIdManualRows` | 수기 폐기 행 추가 (2단계) | POST | `/api/v1/reports/scrap/drafts/{draftId}/manual-rows` | model, process, reason, kind(Loss|불용재고), qty | rowId | 상동 | qty | 1 |
| 119 | `deleteReportsScrapDraftsByDraftIdManualRowsByRowId` | 수기 폐기 행 삭제 | DELETE | `/api/v1/reports/scrap/drafts/{draftId}/manual-rows/{rowId}` | — | success | 상동 | — | 2 |
| 120 | `postReportsScrapDraftsByDraftIdCalculate` | 폐기 금액 산정 (3단계) | POST | `/api/v1/reports/scrap/drafts/{draftId}/calculate` | — | rows[{model,process,qty,unitPrice,priceSource,amount}], summary{totalQty,ngQty,lossQty,totalAmt} | 상동 | qty, price | 1 |
| 121 | `putReportsScrapDraftsByDraftIdUnitPrice` | 단가 수기 조정 | PUT | `/api/v1/reports/scrap/drafts/{draftId}/unit-price` | key(model|process), unitPrice, reason | success | 상동 | price | 2 |
| 122 | `putReportsScrapDraftsByDraftIdApprovalLine` | 검토 부서·결재선 지정 (4단계) | PUT | `/api/v1/reports/scrap/drafts/{draftId}/approval-line` | depts[{dept,manager}], appr{draft,review,approve}, due, notifyChannels[] | success | 상동 | — | 1 |
| 123 | `postReportsScrapDraftsByDraftIdReviewRequest` | 검토 요청 발송 | POST | `/api/v1/reports/scrap/drafts/{draftId}/review-request` | — | sentCnt | 상동 | — | 1 |
| 124 | `postReportsScrapDraftsByDraftIdPublish` | 보고서 생성 (5단계) | POST | `/api/v1/reports/scrap/drafts/{draftId}/publish` | — | docNo, reportId | 상동 | — | 1 |


## 6. 개발 체크리스트

- [ ] 5단계 `Steps` 셸 + 이동 검증(전표 1건 이상)
- [ ] 1단계 — 전표 조회·다중 선택·선택 바 (**조회 조건 서버 연동으로 교체**)
- [ ] 초안 지연 생성(2단계 진입 시)
- [ ] 2단계 — 문서 기본 정보 즉시 저장 · 수기 행 추가/삭제
- [ ] 3단계 — 금액 산정 · **미산정 허용** · 단가 조정(사유 → 감사 로그)
- [ ] 4단계 — 부서별 검토자 · 결재선 · 기한 · 알림 채널 · 검토 요청 발송
- [ ] 5단계 — 미리보기 · 생성 → 목록 이동
- [ ] 초기화
- [ ] 마스킹 `qty` / `price`
- [ ] (개선) 전표 목록 페이징
