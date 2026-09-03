# 07. `/dashboard/kpi` — 성과지표 대시보드

| 항목 | 값 |
| :--- | :--- |
| URL | `/dashboard/kpi` |
| 화면 ID | `dash-kpi` |
| 라우트 파일 | `app/(main)/dashboard/kpi.jsx` |
| MVC | `domains/dashboard/view/KpiDashboardView.jsx` · `controller/useKpiDashboardController.js` · `model/dashboardRepository.js` |
| 기능 ID | DB-03 |
| 접근 권한 | 품질보증팀 · 생산관리팀 · 전산팀 · 경영진 · 통합관리자 |

사업 성과지표 3종의 실시간 산출값과 목표 대비 달성률. 산출 근거는 **[37. 지표 측정 데이터 관리](./37_system_metric-standard.md)**.

> **차트는 d3.js 로 그립니다 (웹 전용).** `@shared/components/charts-d3` 사용 — props 계약은 기존 `charts/` 와 동일합니다. 상세 규격은 **[40. 대시보드 차트 d3.js 전환 명세](./40_charts_d3.md)**.

## 1. 컴포넌트

| # | 영역 | 컴포넌트 |
| :-- | :--- | :--- |
| 0 | 페이지 헤드 | `PageHead` + `Button(측정 기준 보기)` · `Button primary(증빙 내려받기)` · `Button(엑셀 다운로드)` |
| 1 | KPI 3종 | `Card` × 3 + `Gauge`(목표 진척도) + `KeyValue`(현재/목표) — `Grid cols=3` |
| 2 | KPI 추이 | `Card` + `LineChart`(min 60 / max 115) + `SourceNote` — `Grid cols=[2,1]` 좌 |
| 3 | 불량 유형 분포 | `Card` + `DonutChart` — 〃 우 |
| 4 | 월별 불량 유형 추이 | `Card` + `BarChart(stacked)` + 커스텀 범례 — `Grid cols=2` |
| 5 | AI 성능 6축 | `Card` + `RadarChart` — 〃 |
| 6 | 부서별 작업공수 절감 | `Card` + `HBarChart`(target 50) + `SourceNote` — `Grid cols=3` |
| 7 | 월별 목표 달성률 | `Card` + `LineChart`(target 100, 0~110) | 〃 |
| 8 | AI 성능 목표 충족 | `Card` + `DonutChart` | 〃 |
| 9 | 월별 지표 실측값 | `Card` + `HeatMap`(cellWidth 72) |
| 10 | AI 성능 목표 표 | `Card(tight)` + `Table` + `Badge` |
| 11 | 하단 주석 | `NoteText` |
| 12 | 측정 기준 모달 | `openModal` + `KeyValue`(지표명 → 산출식) |

## 2. 화면에 출력해야 하는 정보

### 2-1. KPI 카드 3종 (`GET /dashboard/kpi/summary`)

| 항목 | 값 |
| :--- | :--- |
| 제목 | `kpis[].name` |
| 부제 | `가중치 {weight×100}%` |
| 게이지 | `rate`(목표 진척도 %) + `level` |
| 현재 / 목표 | `value` / `target` — `unit === 'PCT'` 면 `%` 부착, 미측정이면 `—` |

### 2-2. 나머지 데이터

| 카드 | 필드 |
| :--- | :--- |
| KPI 추이 | `labels`·`series`·`baseline`(기본 100 = 구축 전 실측값)·`note` |
| 불량 유형 분포 | `segments[{label,value}]` — 부제는 `lastDataDate()` 의 `YYYY-MM` 누계 |
| 월별 불량 유형 추이 | `labels`(YY-MM 로 절삭) · `series[0]`→`v`, `series[1]`→`v2` 누적 막대 + 이름 범례 |
| AI 성능 6축 | `axes[{label,value,target}]` |
| 작업공수 절감 | `items[{dept,index}]` — 기준선 100, **낮을수록 공수 절감** |
| 월별 목표 달성률 | `labels`·`series`·`note` — KPI 3종 가중 합산 |
| AI 성능 목표 충족 | `segments[{label,value}]`(도넛) |
| 월별 지표 실측값 | `year`·`rows`·`cols`·`data[][]`·`note` |
| AI 성능 목표 표 | `item` · `key`(지표 key, mono) · `target` · `current`(=`actual`) · `state` — `측정 전` / `충족`(green) / `미충족`(amber) |
| 하단 주석 | "KPI ②③은 구축 전 1개월 사전 실측값을 기준선으로 사용합니다." |

## 3. 버튼 및 페이징

| 버튼 | 동작 |
| :--- | :--- |
| 측정 기준 보기 | 모달 — `GET /dashboard/kpi/basis` 의 `name` → `formula` |
| 증빙 내려받기 | `POST /dashboard/kpi/evidence-export (format=xls)` → 토스트 |
| 엑셀 다운로드 | AI 성능 목표 표(항목·목표·현재·상태) xls |

페이징 없음.

## 4. 그 밖의 기능

- 도넛(요약 `segments`)과 표(상세 `items`)가 **같은 API 응답**(`ai-target-status`)을 나눠 씁니다.
- 측정값이 없으면(`value=null`) 게이지는 「데이터 없음」으로 그립니다.
- 서버 응답 `{labels, series}` 를 누적 막대용 `[{l,v,v2}]` 로 변환하는 책임은 **Controller**.

## 5. 사용 API

총 **11건**

**성과지표 대시보드** — 11건

| # | 서비스 함수 | API 명 | Method | Path | 요청 파라미터 | 응답 주요 필드 | 접근 권한 | blind | 우선순위 |
|---|---|---|---|---|---|---|---|---|---|
| 44 | `getDashboardKpiSummary` | KPI 요약(3종) | GET | `/api/v1/dashboard/kpi/summary` | yearMonth | kpis[{no,name,weight,value,target,rate,level}], totalRate | 품질보증팀·생산관리팀·전산팀·경영진·통합관리자 | qty, yield | 1 |
| 45 | `getDashboardKpiTrend` | KPI 추이 | GET | `/api/v1/dashboard/kpi/trend` | from, to | labels[], series[{name,data[]}], baseline(100) | 상동 | yield | 1 |
| 46 | `getDashboardKpiDefectDistribution` | 불량 유형 분포 | GET | `/api/v1/dashboard/kpi/defect-distribution` | yearMonth | segments[{label,value}] | 상동 | yield | 1 |
| 47 | `getDashboardKpiDefectTypeTrend` | 월별 불량 유형 추이 | GET | `/api/v1/dashboard/kpi/defect-type-trend` | from, to, topN(2) | labels[], series[] | 상동 | yield | 1 |
| 48 | `getDashboardKpiAiPerformance` | AI 성능 6축 | GET | `/api/v1/dashboard/kpi/ai-performance` | yearMonth | axes[{label,value,target}] | 상동 | — | 1 |
| 49 | `getDashboardKpiManhourSaving` | 부서별 작업공수 절감 | GET | `/api/v1/dashboard/kpi/manhour-saving` | from, to | items[{dept,index}], baseline(100) | 상동 | — | 1 |
| 50 | `getDashboardKpiAchievementTrend` | 월별 목표 달성률 | GET | `/api/v1/dashboard/kpi/achievement-trend` | from, to | labels[], series[] | 상동 | yield | 1 |
| 51 | `getDashboardKpiAiTargetStatus` | AI 성능 목표 충족 | GET | `/api/v1/dashboard/kpi/ai-target-status` | yearMonth | segments[{label,value}], items[{item,target,actual,pass}] | 상동 | — | 1 |
| 52 | `getDashboardKpiMonthlyMatrix` | 월별 지표 실측값 | GET | `/api/v1/dashboard/kpi/monthly-matrix` | year | cols[], rows[], data[][] | 상동 | qty, yield | 1 |
| 53 | `getDashboardKpiBasis` | KPI 측정 기준 조회 | GET | `/api/v1/dashboard/kpi/basis` | — | kpis[{no,name,formula,source,cycle,exclusion}] | 상동 | — | 1 |
| 54 | `postDashboardKpiEvidenceExport` | KPI 증빙 내려받기 | POST | `/api/v1/dashboard/kpi/evidence-export` | yearMonth, format(xls) | file(binary) | 상동 | qty, yield | 2 |


## 6. 개발 체크리스트

- [ ] KPI 3종 게이지 카드 (가중치 · 현재 · 목표 · 미측정 처리)
- [ ] 차트 7종 (Line×2 · Donut×2 · Bar stacked · Radar · HBar · HeatMap)
- [ ] 월별 불량 유형 추이 — series → 누적 막대 변환 + 범례
- [ ] AI 성능 목표 표 (충족 / 미충족 / 측정 전)
- [ ] 측정 기준 모달
- [ ] 증빙 내려받기 · 엑셀 다운로드
- [ ] 접근 권한(5개 부서) 검증
- [ ] **차트를 `charts-d3` (d3.js) 로 연결** — import 교체 + [40번 문서](./40_charts_d3.md) 규격 준수
