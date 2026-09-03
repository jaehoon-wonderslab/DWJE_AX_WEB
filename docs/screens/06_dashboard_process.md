# 06. `/dashboard/process` — 공정 및 제품 대시보드

| 항목 | 값 |
| :--- | :--- |
| URL | `/dashboard/process` |
| 화면 ID | `dash-proc` |
| 라우트 파일 | `app/(main)/dashboard/process.jsx` |
| MVC | `domains/dashboard/view/ProcessDashboardView.jsx`(+`ProductPicker.jsx`) · `controller/useProcessDashboardController.js` · `model/dashboardRepository.js`, `dashboardModel.js` |
| 기능 ID | DB-02 |
| 접근 권한 | 전 부서 |

공정 1개 + 제품 1개 이상을 골라 그 조합의 실적·품질·설비 상태를 봅니다. **선택을 바꾸면 모든 카드가 다시 계산됩니다.**

> **차트는 d3.js 로 그립니다 (웹 전용).** `@shared/components/charts-d3` 사용 — props 계약은 기존 `charts/` 와 동일합니다. 상세 규격은 **[40. 대시보드 차트 d3.js 전환 명세](./40_charts_d3.md)**.

## 1. 컴포넌트

| # | 영역 | 컴포넌트 |
| :-- | :--- | :--- |
| 0 | 페이지 헤드 | `PageHead` + `Button(엑셀 다운로드)` · `Button(기본값 복원)` |
| 0-1 | 오류 안내 | `FormAlert(error)` — 조회 실패(`E-NOTFOUND` 등) |
| 0-2 | 실적 없음 안내 | `FormAlert(info)` — 그 공정이 기준일에 생산 실적이 없을 때 |
| 1 | **조회 대상 선택** | `Card` — 공정 `SelectChip` 행 / 주력 제품 Top N `SelectChip` 행 / 제품 검색 버튼 + 선택 칩 / 최근 조회 칩 / `SourceNote` |
| 2 | 요약 지표 | `StatCard` × 4 (`Grid cols=4`) |
| 3~5 | 추이·구성 | `Card`+`LineChart` / `Card`+`BarChart`+`LineChart` / `Card`+`DonutChart` (`Grid cols=3`) |
| 6~8 | 수율·가동률·공정비교 | `Card`+`DotPlot` / `Card`+`HBarChart` / `Card`+`HBarChart` (`Grid cols=3`) |
| 9 | 설비별 시간대 가동률 | `Card` + `HeatMap`(lo 40 / hi 100 / invert) |
| 10 | 제품별 상세 | `Card(tight)` + `XlsTable`(maxHeight 520, 합계행 포함) + 위험/주의 `Badge` |
| 11 | 제품 선택 팝업 | `openProductPicker` — 검색·필터·정렬·다중 선택 모달(wide) |

## 2. 화면에 출력해야 하는 정보

### 2-1. 조회 대상 선택

| 항목 | 내용 |
| :--- | :--- |
| 공정 칩 | `GET /common/masters/processes` — `name` + `capacity`(부제). 기본값은 **기준일에 실적이 가장 많은 공정** |
| 주력 제품 Top N | `TOP_N_OPTIONS`(5/10/20/50) + `전체 {N}종` — 매출 순위 기준 |
| 선택 현황 문구 | `매출 순위 기준 · 전체 {N}종 중 {M}종 선택` |
| 제품 칩 | 선택 코드 최대 10개 + `#순위` 부제. 11개 이상이면 `+N종 더` 칩 |
| 최근 조회 | `useAppStore.recentModels` — 누르면 선택에 추가 |
| 각주 | 「제품군 순위 관리」 안내(`sys-rank` 권한자만) + "선택된 칩을 누르면 바로 제외됩니다." |

### 2-2. 요약 지표 4종 (`GET /dashboard/process/summary`)

생산량(`qty`, 보조 `양품 N EA`) · 공정 불량률(`yield`, 보조 `불량 N EA`, 3% 초과 시 down) · 수율(`yield`, 보조 `목표 N% 달성/미달`) · 평균 가동률(보조 `대상 제품 N종 평균`)

### 2-3. 차트

| 차트 | 데이터 · 비고 |
| :--- | :--- |
| 시간대별 불량률 추이 | `labels`·`series`·`target` (목표 수율을 불량률로 환산한 선) |
| 제품별 생산량·불량률 | `items[{product,qty,defectRate}]` — 막대 + 보조 라인(target `targetDefectRate(target)`) |
| 불량 유형 구성 | `segments[{label,value}]` — 각주 "AOI 판정 로그 자동 집계" |
| 제품별 수율 | `items[{product,yieldRate,level}]` — DotPlot min 92 / max 100 / target |
| 제품별 가동률 | `items[{product,uptimeRate}]` — `uptimeLevel()` 로 색 |
| 공정 비교 | `items[{process,defectRate}]` — 같은 제품 구성으로 네 공정 비교, 현재 공정은 기본색 |
| 설비 가동률 히트맵 | `rows`×`cols`×`data[][]` |

### 2-4. 제품별 상세 표 (`XlsTable`)

`순위(#N)` · `제품`(bold) · `고객사`(**customer** 마스킹) · `프로젝트` · `투입`/`양품`/`불량`(**qty**) · `불량률`/`수율`(**yield**) · `가동률` · `판정`(`LEVEL_LABEL[yieldLevel]`)
마지막 행은 `tone='total'` 합계행 — `합계 · {공정명}`(span 4) + 요약값.
카드 우측 배지 : `위험 N` / `주의 N` (수율 판정 기준).

## 3. 버튼 및 페이징

| 버튼 | 동작 |
| :--- | :--- |
| 공정 칩 | `changeProcess(id)` — 제품 선택 초기화 + **그 공정의 실적 보유 구간을 다시 받아 기준일을 마지막 실적일로 이동** 후 토스트 |
| Top N 칩 | `pickTopN(n)` — 순위 n 이하 제품 자동 선택, `all` 이면 전체 |
| 제품 검색·선택 | 제품 선택 팝업 열기 |
| 선택 칩 클릭 | 해당 제품 제외 (**최소 1개는 남김** — 아니면 토스트) |
| 최근 조회 칩 | 선택에 추가 |
| 엑셀 다운로드 | 제품별 상세 xls (순위·제품·고객사·프로젝트·투입·양품·불량·불량률·수율·가동률) |
| 기본값 복원 | 실적이 가장 많은 공정으로 되돌리고 제품 선택 비움, Top N=5 |

**페이징 없음** — 선택한 제품 수만큼만 표시(`XlsTable maxHeight` 내부 스크롤).

### 3-1. 제품 선택 팝업 (`ProductPicker`)

| 요소 | 내용 |
| :--- | :--- |
| 검색 | 제품 코드 · 제품군 · 고객사 · 프로젝트 통합 검색 |
| 필터 | 제품군 / 고객사 / 프로젝트 `SelectField` (목록에서 자동 생성) |
| 정렬 | 매출 순위 / 제품 코드 / 제품군 |
| 빠른 선택 | `Top 5` · `Top 10` · `Top 20` · `검색 결과 N종 모두 선택` · `검색 결과 해제` · `선택한 것만 / 전체 보기` |
| 선택 현황 | `선택 N종 / 전체 M종` + 선택 칩 영역(칩 클릭 시 해제) |
| 목록 | 순위 · 제품 · 제품군 · 고객사 · 프로젝트 (maxHeight 320 스크롤, 행 클릭 토글) |
| 푸터 | `취소` / `적용` — 0개면 토스트로 막고, 적용 시 `pushRecentModels(상위 6)` |

## 4. 그 밖의 기능

- **공정 코드 하드코딩 금지** — 서버 공정 코드는 사업장마다 다릅니다(W110·W120·W150). 기본값은 항상 "기준일 실적 최다 공정"으로 계산.
- **첫 진입 기본 선택** — 그날 그 공정이 실제로 만든 제품 상위 5종(`madeProducts`).
- **실적 없음 처리** — 무관한 제품으로 채우지 않고 카드를 비운 뒤 이유를 안내(`noProduction`).
- **선택 상태 전역 보관** — `useAppStore`(`dashProcess`,`dashModels`,`dashTopN`,`recentModels`) — 화면 간 공유.
- **마스킹** — 표 셀은 문자열만 받으므로 `canData()` 로 직접 `비공개` 치환.

## 5. 사용 API

총 **11건**

**공정 및 제품 대시보드** — 11건

| # | 서비스 함수 | API 명 | Method | Path | 요청 파라미터 | 응답 주요 필드 | 접근 권한 | blind | 우선순위 |
|---|---|---|---|---|---|---|---|---|---|
| 33 | `getDashboardProcessSummary` | 공정·제품 요약 지표 | GET | `/api/v1/dashboard/process/summary` | date, processId, productCodes[] | qty, okQty, ngQty, defectRate, yield, avgUptime, productCnt | 전 부서 | qty, yield | 1 |
| 34 | `getDashboardProcessDefectTrend` | 시간대별 불량률 추이 | GET | `/api/v1/dashboard/process/defect-trend` | date, processId, productCodes[], interval | labels[], series[], target | 전 부서 | yield | 1 |
| 35 | `getDashboardProcessProductProduction` | 제품별 생산량·불량률 | GET | `/api/v1/dashboard/process/product-production` | date, processId, productCodes[] | items[{product,qty,defectRate}] | 전 부서 | qty, yield | 1 |
| 36 | `getDashboardProcessDefectComposition` | 불량 유형 구성 | GET | `/api/v1/dashboard/process/defect-composition` | date, processId, productCodes[] | segments[{label,value}] | 전 부서 | yield | 1 |
| 37 | `getDashboardProcessProductYield` | 제품별 수율 | GET | `/api/v1/dashboard/process/product-yield` | date, processId, productCodes[] | items[{product,yield,level}], target | 전 부서 | yield | 1 |
| 38 | `getDashboardProcessProductUptime` | 제품별 가동률 | GET | `/api/v1/dashboard/process/product-uptime` | date, processId, productCodes[] | items[{product,uptimeRate}] | 전 부서 | — | 1 |
| 39 | `getDashboardProcessProcessCompare` | 공정 비교 | GET | `/api/v1/dashboard/process/process-compare` | date, productCodes[] | items[{process,defectRate}] | 전 부서 | yield | 1 |
| 40 | `getDashboardProcessEquipmentUptimeHeatmap` | 설비별 시간대 가동률 | GET | `/api/v1/dashboard/process/equipment-uptime-heatmap` | date, processId, interval | cols[], rows[], data[][] | 전 부서 | — | 1 |
| 41 | `getDashboardProcessProducts` | 제품별 상세 목록 | GET | `/api/v1/dashboard/process/products` | date, processId, productCodes[], sort | items[{product,family,customer,project,rank,qty,okQty,ngQty,defectRate,yield,uptimeRate}] | 전 부서 | qty, yield, customer | 1 |
| 42 | `getDashboardProcessTopProducts` | Top N 제품 조회 | GET | `/api/v1/dashboard/process/top-products` | topN(5|10|20|50|all) | productCodes[] | 전 부서 | — | 1 |
| 43 | `getDashboardProcessSelectionSummary` | 선택 요약 | GET | `/api/v1/dashboard/process/selection-summary` | processId, productCodes[] | process{name,capacity,targetYield}, productCnt, currentYield, gap | 전 부서 | yield | 2 |

추가로 기준정보 `getCommonMastersProcesses` · `getCommonMastersProducts` · `getCommonDataRange` 를 사용합니다.

## 6. 개발 체크리스트

- [ ] 조회 대상 선택 카드 (공정 칩 · Top N 칩 · 제품 칩 · 최근 조회)
- [ ] 제품 선택 팝업 — 검색/필터/정렬/빠른 선택/선택 칩/목록
- [ ] 공정 변경 시 기준일 자동 보정 + 제품 재선택
- [ ] 실적 최다 공정 기본값 계산 (하드코딩 금지)
- [ ] 실적 없는 공정 안내 + 카드 비우기
- [ ] 조회 실패(`E-NOTFOUND`) 상단 배너
- [ ] 요약 4 + 차트 7 + 히트맵 배치
- [ ] 제품별 상세 `XlsTable` + 합계행 + 판정 색 + 마스킹
- [ ] 위험/주의 배지 집계
- [ ] 엑셀 다운로드 · 기본값 복원
- [ ] 선택 상태 전역 스토어 연동
- [ ] **차트를 `charts-d3` (d3.js) 로 연결** — import 교체 + [40번 문서](./40_charts_d3.md) 규격 준수
