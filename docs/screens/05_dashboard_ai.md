# 05. `/dashboard/ai` — AI 통합 대시보드 (기본 화면)

> 2026-09-07: 기간 조회와 AI 수동 요청의 최신 동작은 [사용성 검토 및 수정 기록](./05_ai_period_usability.md)을 참고하세요. 아래의 이전 자동 분석 설명보다 최신 기록을 우선합니다.

| 항목 | 값 |
| :--- | :--- |
| URL | `/dashboard/ai` — **`HOME_PATH`** (`/` 및 권한 없는 화면의 리다이렉트 대상) |
| 화면 ID | `dash-ai` (`HOME_SCREEN_ID`) |
| 라우트 파일 | `app/(main)/dashboard/ai.jsx` |
| MVC | `domains/dashboard/view/AiDashboardView.jsx`(+`components/EquipmentDetail.jsx`) · `controller/useAiDashboardController.js` · `model/dashboardRepository.js`, `dashboardModel.js` |
| 기능 ID | DB-01 |
| 접근 권한 | 전 부서 |

제1공장 주력 라인(프레스 10대 · AOI 10대)의 성과지표와 Agent 작동 현황을 한 화면에서 확인합니다.

> **차트는 d3.js 로 그립니다 (웹 전용).** `@shared/components/charts-d3` 사용 — props 계약은 기존 `charts/` 와 동일합니다. 상세 규격은 **[40. 대시보드 차트 d3.js 전환 명세](./40_charts_d3.md)**.

## AI 브리핑 · XAI 처방 (2026-09-05 신설)

사용자 지시로 두 항목을 **파인튜닝 sLLM 결과**로 받습니다.
모델·파인튜닝·벡터는 별도 세션, 검증·API 는 API 세션, 화면은 여기입니다.

| 컴포넌트 | 내용 |
| :--- | :--- |
| `components/AiBriefingCard.jsx` | AI 일일 품질·생산 종합 브리핑 |
| `components/AiCausePrescriptionCard.jsx` | AI 공정 원인 분석 및 처방 권고 (XAI & Prescription) |

### 걷어낸 것 — 지어낸 값이 세 겹으로 있었습니다

착수 전 확인에서 나온 것입니다. **되살리지 마세요.**

| 있던 것 | 실제 |
| :--- | :--- |
| 일일 계획 대비 달성률 **14,642.2%** | `planQty` 가 150,000 상수 |
| `criticalLine` "0호기 불량률 100%" | 1건 생산·1건 불량인 행 |
| "타발 압력 ±14% · 금형 온도 48.5℃가 원인의 58%" | **압력·온도 수집값이 없습니다** (설비 3값 전량 null) |
| "SPM 5% 감속 · 하사점 +2μm 보정 권고" | 근거 없는 처방 |
| 대상 설비 `PR-01`~`PR-10`, 가짜 히트맵 | 설비 마스터 1,511대 중 `PR-` 로 시작하는 코드 **0대** |
| 히트맵 각주 "PR-03·PR-05가 금일 최저" | 상수 문구 |
| KPI 카드 목표 `200,000` · 가동 `18대`/정지 `2대` | 응답에 없는 필드의 기본값 |

리포지토리 폴백(`getFallbackBriefing`·`getFallbackCausePrescription`) 160줄과 함께 지웠습니다.
**서버가 주지 않으면 "모델 준비 중" 을 그립니다.**

### 근거 검증 계약

근거가 붙어 있는지만 보면 부족합니다 — **모델은 그럴듯한 근거를 지어냅니다.**
`ref` 를 서버가 조회하는 방식도 안 됩니다(`ref` 도 모델이 쓴 문자열이라 200 나오는 아무 경로나 통과).
그래서 **서버가 값을 DB 에서 다시 계산해 대조**합니다.

```
evidence: { kind, key, label, value, unit, ref }   // kind='doc' 이면 quote 추가
```

| `kind` | `key` | 검증 |
| :--- | :--- | :--- |
| `qty` · `defect_rate` | — | 서버가 값을 다시 구해 대조 |
| `yield` (별칭 `metric`) | 공정코드 | 〃 |
| `defect` | 불량코드 | 〃 |
| `anomaly` | 설비코드 | 〃 |
| `doc` | `chunk_id` | 실재·`is_current`·열람 권한·보존기한·`chunk_text` 에 `quote` 포함 |

**`key` 가 없으면 대조 대상을 못 찾아 `NOT_FOUND` 로 문장이 통째로 빠집니다.**

탈락 사유 — `VALUE_MISMATCH` · `NOT_FOUND` · `UNKNOWN_KIND` · `NO_EVIDENCE` · `MASKED` · `EXPIRED`.
**근거 하나라도 실패하면 문장 전체를 버립니다** — 맞는 근거와 지어낸 근거가 섞인 문장이 제일 위험합니다.

### 화면 규칙

- `verified !== false` 인 문장·기여도·처방만 그립니다.
- `droppedCnt` 를 **"모델이 낸 문장 중 N건은 근거가 확인되지 않아 뺐습니다"** 로 적습니다. 조용히 버리지 않습니다.
- `label`·`value` 는 **서버가 마스터·DB 값으로 덮어써** 내려 줍니다. 모델이 쓴 값이 아닙니다.
- `value` 는 숫자, 단위는 `unit`('%'·'EA'). **표기는 화면이 만들고 율은 소수 2자리** —
  98.36 을 98.4 로 줄여 적으면 서버가 대조한 값과 화면 값이 달라집니다.
- 문서 근거는 `quote` 를 인용부호로 그대로 그립니다 — 문서명만 띄우면 사람이 확인할 수 없습니다.
- 대상 설비 선택기는 **분석 결과가 있을 때만** 냅니다. 없는 설비를 고르게 두면 안 됩니다.

**결과적으로 모델이 화면에 직접 기여하는 것은 `text` 문장 하나뿐입니다.**

### 남은 것

- [ ] sLLM 착수 — 사용자 승인 대기 (9/3 「벡터·LLM 개발 중지」 지시 유효)
- [ ] 베이스 모델 확정 — 이 PC 에 Qwen3-8B 없음 (로컬 Ollama: `bge-m3`·`gemma4`)
- [ ] 마스킹 규칙 — `ax.tb_ai_mask_rule` 0건, 7항목을 삭제/범위화/등급화 중 무엇으로
- [ ] 이상 후보 최소 생산량 하한 — 1건 생산·1건 불량이 불량률 100% 로 최대 이슈가 됩니다

모델 호출은 **HTTP** 입니다(Ollama `localhost:11434`, `POST /api/chat` 의 `format` 에 JSON Schema).
서버는 JDK 21 표준 `java.net.http.HttpClient` 를 씁니다 — 의존성 추가 없습니다.

## 1. 컴포넌트 (배치 순서)

| # | 영역 | 컴포넌트 | 레이아웃 |
| :-- | :--- | :--- | :--- |
| 0 | 페이지 헤드 | `PageHead` + 액션 3종 | — |
| 1 | KPI 카드 | `StatCard` × 4 | `Grid cols=4` |
| 2 | 시간대별 불량률 추이 | `Card` + `LineChart`(불량률) + `LineChart`(유형별 수량, 보조) | `Grid cols=3` |
| 3 | 라인별 생산량·불량률 | `Card` + `BarChart`(생산량) + `LineChart`(불량률, target 3.0%) | 〃 |
| 4 | 공정 품질 지수 | `Card` + `RadarChart`(6축, 목표 대비) | 〃 |
| 5 | 불량 유형 구성 | `Card` + `DonutChart` + `SourceNote` | `Grid cols=3` |
| 6 | 공정별 수율 | `Card` + `DotPlot`(min 94 / max 100 / target) + `SourceNote` | 〃 |
| 7 | 생산 계획 대비 실적 | `Card` + `BarChart`(계획 v / 실적 v2) + 범례 + `SourceNote` | 〃 |
| 8 | 설비별 시간대 가동률 | `Card` + `HeatMap`(invert) + `SourceNote` | 전폭 |
| 9 | 라인별 현황 | `Card(tight)` + `Table` + `Pagination` | `Grid cols=[2,1]` 좌 |
| 10 | 이상 알림 | `Card(tight)` + `ListRow` × N + `Button(전체)` | 〃 우 |
| 11 | Agent 작동 현황 | `Card(tight)` + `Table`(상위 5) + `Button(전체)` | 〃 우 |
| 12 | 설비 상세 | `openModal` + `EquipmentDetail`(`KeyValue` 형식) | 행 클릭 |

## 2. 화면에 출력해야 하는 정보

### 2-1. KPI 카드 4종 (`GET /dashboard/ai/summary`)

| 카드 | 값 | 단위 | 보조 | 마스킹 |
| :--- | :--- | :--- | :--- | :--- |
| 공정 불량률 | `defectRate` | % | `defectRateSub` | `yield` |
| 설비 가동률 | `uptimeRate` | % | `uptimeRateSub` | — |
| 금일 생산량 | `todayQty` | EA | `todayQtySub` | `qty` |
| 미검토 경계 케이스 | `pendingBorderline.cnt` | 건 | `HITL 대기 · 최장 {maxWaitMin}분` | — |

### 2-2. 차트 데이터

| 차트 | 필드 |
| :--- | :--- |
| 불량률 추이 | `labels[]` · `rateSeries`(또는 `series`) · `countSeries`(유형별 수량) · `target` |
| 라인별 생산량 | `lines[{eqptCd, qty, defectRate}]` — 라벨은 `PR-` 접두 제거 |
| 품질 지수 | `axes[{label, value, target}]` (6축) |
| 불량 유형 구성 | `segments[{label,value}]` · `total` · `note` · `excludedBorderline` |
| 공정별 수율 | `items[{process, yieldRate, level}]` · `target`(기본 97) · `note` |
| 계획 대비 실적 | `items[{slot, plan, actual}]` · `cumPlan` · `cumActual` · `rate` |
| 가동률 히트맵 | `rows[]`(설비) × `cols[]`(2시간 구간) · `data[][]` · `lo` · `hi` · `note` |

### 2-3. 라인별 현황 표

| 열 | 폭 | 마스킹 | 렌더 |
| :--- | :--- | :--- | :--- |
| 설비 (`eqptCd`) | 90 | — | mono |
| 모델 (`model`) | 140 | — | |
| 생산량 (`qty`) | 100 | `qty` | 우측 정렬 · 천단위 |
| 불량률 (`defectRate`) | 84 | `yield` | `n.n%` |
| 가동률 (`uptimeRate`) | 120 | — | `ProgressBar` + 수치 (85 초과 ok / 75 초과 warn / 그 외 bad) |
| 상태 (`state`) | 82 | — | `StateBadge` |

### 2-4. 이상 알림 / Agent

- 알림 : `level`(red/amber/gray) · `title` · `desc` · `elapsed` · `agent` — 최근 24시간
- Agent : `no` · `name` · `state` — Master AI + Worker 9종 중 **상위 5건**

### 2-5. 설비 상세 모달 (`GET /production/equipments/{eqptCd}`)

설비 · 모델 · 작업장 · 금일 생산량(`qty`) · 불량률(`yield`) · 가동률 · IoT 상태 · 정지 경과(분) · **장착 금형(`mold`)**
각주: "설비 파라미터·금형 이력은 데이터 접근 권한(mold)이 있는 계정에만 표시됩니다."

## 3. 버튼 및 페이징

| 버튼 | 동작 |
| :--- | :--- |
| `기간 · {baseDate}` | 현재는 안내 토스트 (기준일은 `useAppStore.baseDate`) |
| 엑셀 다운로드 | **전량 재조회**(`size:0`) 후 라인별 현황 xls — 실패 시 현재 쪽만 + 안내 토스트 |
| 새로고침 | 대시보드 묶음 + 라인 목록 동시 reload + 토스트 |
| 이상 알림 「전체」 / 알림 행 | `/alert/list` 이동 |
| Agent 「전체」 | `/system/agent` 이동 |
| 라인 행 클릭 | 설비 상세 모달 |

**페이징** — 라인별 현황만 `usePaging({resetKey: baseDate})` + `Pagination`. 설비가 1,300대를 넘어 **대시보드 묶음과 분리 조회**합니다(쪽 이동 시 차트 11개를 다시 부르지 않기 위함).

## 4. 그 밖의 기능

- **조회 분리 구조** — `loadAiDashboard(baseDate)` (차트 11종 병렬) + `fetchAiLines(baseDate, paging)` (목록) 2계통.
- 라인 목록은 `silent: true` 로 조회해 쪽 이동 시 전체 로딩 화면이 뜨지 않습니다.
- `baseDate` 는 `(main)` 레이아웃이 먼저 받은 실적 보유 기간의 마지막 날짜.

## 5. 사용 API

총 **12건**

**AI 통합 대시보드** — 12건

| # | 서비스 함수 | API 명 | Method | Path | 요청 파라미터 | 응답 주요 필드 | 접근 권한 | blind | 우선순위 |
|---|---|---|---|---|---|---|---|---|---|
| 21 | `getDashboardAiSummary` | 통합 요약 지표 | GET | `/api/v1/dashboard/ai/summary` | date | defectRate, uptimeRate, todayQty, pendingBorderline{cnt,maxWaitMin} | 전 부서 | qty, yield | 1 |
| 22 | `getDashboardAiDefectTrend` | 시간대별 불량률 추이 | GET | `/api/v1/dashboard/ai/defect-trend` | date, interval(2h) | labels[], series[{name,data[]}], target | 전 부서 | yield | 1 |
| 23 | `getDashboardAiLineProduction` | 라인별 생산량·불량률 | GET | `/api/v1/dashboard/ai/line-production` | date, processId | lines[{eqptCd,qty,defectRate}] | 전 부서 | qty, yield | 1 |
| 24 | `getDashboardAiQualityIndex` | 공정 품질 지수(6축) | GET | `/api/v1/dashboard/ai/quality-index` | date | axes[{label,value,target}] | 전 부서 | yield | 1 |
| 25 | `getDashboardAiDefectComposition` | 불량 유형 구성 | GET | `/api/v1/dashboard/ai/defect-composition` | date, processId | segments[{label,value}], total, excludedBorderline | 전 부서 | yield | 1 |
| 26 | `getDashboardAiProcessYield` | 공정별 수율 | GET | `/api/v1/dashboard/ai/process-yield` | date | items[{process,yield,level}], target, note | 전 부서 | yield | 1 |
| 27 | `getDashboardAiPlanVsActual` | 생산 계획 대비 실적 | GET | `/api/v1/dashboard/ai/plan-vs-actual` | date, interval(2h) | items[{slot,plan,actual}], cumPlan, cumActual, rate | 전 부서 | qty, plan | 1 |
| 28 | `getDashboardAiEquipmentUptimeHeatmap` | 설비별 시간대 가동률 | GET | `/api/v1/dashboard/ai/equipment-uptime-heatmap` | date, processId, interval(2h) | cols[], rows[], data[][], lo, hi | 전 부서 | — | 1 |
| 29 | `getDashboardAiLines` | 라인별 현황 목록 | GET | `/api/v1/dashboard/ai/lines` | date, processId | lines[{eqptCd,model,qty,defectRate,uptimeRate,state}] | 전 부서 | qty, yield | 1 |
| 30 | `getProductionEquipmentsByEqptCd` | 설비 상세 조회 | GET | `/api/v1/production/equipments/{eqptCd}` | date | eqptCd, model, qty, defectRate, uptimeRate, workcenter, iotState, stopElapsedMin | 전 부서 | qty, yield, mold | 1 |
| 31 | `getDashboardAiAlerts` | 이상 알림 요약 | GET | `/api/v1/dashboard/ai/alerts` | hours(24) | alerts[{level,title,desc,elapsed,agent}] | 전 부서 | — | 1 |
| 32 | `getDashboardAiAgents` | Agent 작동 현황 요약 | GET | `/api/v1/dashboard/ai/agents` | — | master{state,mode}, agents[{no,name,state,last,load}] | 전 부서 | — | 1 |


## 6. 개발 체크리스트

- [ ] KPI 카드 4종 (마스킹 `qty`/`yield` 적용)
- [ ] 차트 7종 배치 — Line×2 / Bar×2 / Radar / Donut / DotPlot / HeatMap
- [ ] 라인별 현황 표 + `ProgressBar` 가동률 + `StateBadge`
- [ ] 라인 목록 **분리 페이징** (차트 재조회 금지)
- [ ] 설비 상세 모달 (`mold` 권한 분기)
- [ ] 엑셀 전량 재조회 다운로드 + 실패 시 폴백
- [ ] 새로고침 (묶음 + 목록 동시)
- [ ] 알림/Agent 카드 → 관련 화면 이동
- [ ] `/` 및 권한 없는 화면의 리다이렉트 대상으로 동작 확인
- [ ] **차트를 `charts-d3` (d3.js) 로 연결** — import 교체 + [40번 문서](./40_charts_d3.md) 규격 준수

### KPI 카드 필드 (2026-09-05 고침)

`/dashboard/ai/summary` 응답 필드는 **`todayQty` · `okQty` · `ngQty` · `defectRate` · `uptimeRate`** 입니다.
카드 세 장이 없는 필드(`totalQty` · `goodQty`/`defectQty` · `runningEquipment`)를 읽고 있어
양품·불량이 0 으로 뜨고 가동 대수는 상수 `18대`/`2대` 가 나오고 있었습니다.

`StatCard` 는 **`label`·`value`·`unit`·`sub`·`tone`·`field`·`right`** 를 받습니다.
`title`·`color`·`badge`·자식 요소는 받지 않습니다 — 그렇게 넘겨서 **카드 제목이 하나도 안 그려지고**
있었습니다.
