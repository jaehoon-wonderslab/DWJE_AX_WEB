# 13. `/quality/defect` — 불량 현황 조회

| 항목 | 값 |
| :--- | :--- |
| URL | `/quality/defect` |
| 화면 ID | `qc-defect` |
| 라우트 파일 | `app/(main)/quality/defect.jsx` |
| MVC | `domains/quality/view/DefectStatusView.jsx` · `controller/useDefectStatusController.js` · `model/qualityRepository.js` + `domains/common/model/metricModel.js` |
| 기능 ID | QC-01 |
| 접근 권한 | 품질보증팀 · 생산관리팀 · 제조팀 · 경영진 · 통합관리자 |

## 1. 컴포넌트

`PageHead`(+`Button(엑셀 다운로드)`, `Button(품질 보고서 작성)`) · `Filters`(`DateField`×2 + `SelectField`(공정/불량 유형) + `Button primary(조회)`) · `Grid cols=2` → `Card(tight)`+`Table` × 2

## 2. 화면에 출력해야 하는 정보

### 2-1. 조회 조건

| 항목 | 기본값 | 선택지 출처 |
| :--- | :--- | :--- |
| 시작일 / 종료일 | `currentMonthRange()` | — |
| 공정 | `전체` | `loadProcessOptions()` (서버) |
| 불량 유형 | `전체` | **조회 결과에서 생성** — 그 기간에 실제로 나온 유형만 (`byType.items[].defectCd`) |

### 2-2. 불량 유형별 분포 카드

부제 : `불량 수량 {ngQty} EA · 불량 발생 {totalCnt}건 · 비중은 불량 수량 기준`

| 열 | 폭 | 마스킹 | 비고 |
| :--- | :--- | :--- | :--- |
| 불량 유형 `label` | flex 1.3 | — | `유형 미상` 행은 흐린 색 |
| 불량 수량 `value` | 96 우측 | `qty` | |
| 비중 `ratio` | 140 | — | `ProgressBar`(1위가 가득 차도록 **상대 배율**) + `n.n%` |
| 전월 대비 `momChange` | 92 우측 | — | 음수 초록 / 양수 빨강, 숫자 아니면 `—` |

> **비중 계산 규칙** — 서버 `ratio` 는 표시된 유형 합을 분모로 써서 부풀려집니다. `compositionOf(typeItems, summary.ngQty)` 로 **불량 수량 원장(`ngQty`)을 분모**로 재계산하고, 남는 몫은 `유형 미상` 행으로 드러내 합계를 원장과 맞춥니다.

### 2-3. 라인별 불량률 카드 (상위 5개)

| 열 | 폭 | 마스킹 |
| :--- | :--- | :--- |
| 설비 `eqptCd` | 82 mono | — |
| 설비명 `eqptNm`(없으면 `model`) | flex 1.2 | — |
| 불량 `ngQty` | 82 우측 | `qty` |
| 불량률 `defectRate` | 88 우측 | `yield` |
| 주 유형 `mainType` | 100 | `Badge` 또는 `—` |

## 3. 버튼 및 페이징

| 버튼 | 동작 |
| :--- | :--- |
| 엑셀 다운로드 | 유형별 분포 xls (불량 유형·불량 수량·비중·전월 대비) |
| 품질 보고서 작성 | `/quality/report` 이동 |
| 조회 | `reload()` + 건수 토스트 |

페이징 없음 (요약 성격).

## 4. 그 밖의 기능

- 요약(`GET /quality/defects/summary`)의 `momChange` 는 전월 대비 증감률(%) — **줄어든 쪽이 좋은 지표**.
- 불량 유형 선택지를 결과에서 만들기 때문에, 기간을 바꾸면 선택지도 함께 바뀝니다.

## 5. 사용 API

총 **3건**

**불량 현황 조회** — 3건

| # | 서비스 함수 | API 명 | Method | Path | 요청 파라미터 | 응답 주요 필드 | 접근 권한 | blind | 우선순위 |
|---|---|---|---|---|---|---|---|---|---|
| 73 | `getQualityDefectsSummary` | 불량 현황 요약 | GET | `/api/v1/quality/defects/summary` | from, to, processId, defectTypeCd | totalCnt, defectRate, momChange | 품질보증팀·생산관리팀·제조팀·경영진·통합관리자 | yield | 1 |
| 74 | `getQualityDefectsByType` | 불량 유형별 분포 | GET | `/api/v1/quality/defects/by-type` | from, to, processId | items[{defectType,cnt,ratio,momChange}] | 상동 | yield | 1 |
| 75 | `getQualityDefectsByLine` | 라인별 불량률 | GET | `/api/v1/quality/defects/by-line` | from, to, processId, topN(5) | items[{eqptCd,model,ngQty,defectRate,mainType}] | 상동 | qty, yield | 1 |


## 6. 개발 체크리스트

- [ ] 조회 조건 4종 (불량 유형 선택지 = 결과 기반)
- [ ] 유형별 분포 표 + **원장 기준 비중 재계산 + 유형 미상 행**
- [ ] 상대 배율 `ProgressBar`
- [ ] 전월 대비 증감 색 규칙
- [ ] 라인별 불량률 상위 5 표
- [ ] 마스킹 `qty` / `yield`
- [ ] 엑셀 다운로드 · 품질 보고서 이동
