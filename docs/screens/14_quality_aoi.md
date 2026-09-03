# 14. `/quality/aoi` — AOI 판정 분석·예측

| 항목 | 값 |
| :--- | :--- |
| URL | `/quality/aoi` |
| 화면 ID | `qc-aoi` |
| 라우트 파일 | `app/(main)/quality/aoi.jsx` |
| MVC | `domains/quality/view/AoiPredictionView.jsx` · `controller/useAoiPredictionController.js` · `model/qualityRepository.js` |
| 기능 ID | QC-02 |
| 접근 권한 | 품질보증팀 · 생산관리팀 · 제조팀 · 통합관리자 |

> **원칙 — 예측은 확정 결과가 아니라 추정입니다.** 모든 추정치에 근거 구간과 신뢰도를 함께 표시하고, 조치 여부는 담당자가 결정합니다.

화면은 두 덩어리로 나뉩니다. **「앞으로 일어날 일 — 추정」** / **「지금 상태 — 예측의 근거」**

## 1. 컴포넌트

| # | 영역 | 컴포넌트 |
| :-- | :--- | :--- |
| 0 | 페이지 헤드 | `PageHead` + `Button(엑셀 다운로드)` · `Button(추정 근거·모델)` · `Button primary(예측 재산출)` |
| 1 | 조회 조건 | `Filters` + `SelectField`(대상 / 예측 구간 / 학습 기간) + `Button primary(조회)` |
| 2 | 예측 요약 | `Pred` × 4 (`Grid cols=4`) |
| 3 | 주의 문구 | `Hint` |
| 4 | 섹션 제목 | "앞으로 일어날 일 — 추정" |
| 5 | 불량률 추이·예측 밴드 | `Card` + `LineChart`(min 1 / max 7, target=threshold) + 분기점 안내 + `SourceNote` |
| 6 | 설비별 위험 예측·권고 | `Card(tight)` + `XlsTable`(8열) |
| 7 | 출하 전 위험 LOT | `Card(tight)` + `Table` — `Grid cols=[2,1]` 좌 |
| 8 | 잔여 시간 추가 발생 추정 | `Card` + `KeyValue` + `Badge` — 〃 우 |
| 9 | 섹션 제목 | "지금 상태 — 예측의 근거" |
| 10 | AOI 판정 드리프트 | `Card(tight)` + `XlsTable`(8열) + 우측 배지 |
| 11 | 불량 유형 구성 변화 | `Card(tight)` + `Table` |
| 12 | 추정 근거 모달 | `openModal` — 모델 / 학습 기간 / 입력 변수 / 검증 결과 / 한계 |

## 2. 화면에 출력해야 하는 정보

### 2-1. 조회 조건

| 항목 | 기본값 | 선택지 |
| :--- | :--- | :--- |
| 대상 | `프레스 전 라인 (10대)` | 전 라인 / `PR-03 · AOI-03` / `PR-07 · AOI-07` / `PR-08 · AOI-08` |
| 예측 구간 | `향후 8시간` | 향후 8시간 / 향후 2시간 / 금일 잔여 / 다음 교대까지 |
| 학습 기간 | `최근 12주` | 최근 12주 / 4주 / 26주 |

### 2-2. 예측 요약 4종 (`Pred`, `GET /quality/aoi/prediction/summary`)

| 카드 | level | 값 | 근거 구간(`ci`) | 마스킹 |
| :--- | :--- | :--- | :--- | :--- |
| 2시간 후 예상 불량률 | risk | `predictedDefectRate` | `{predictedBand} · 현재 {currentRate}% · 임계 {threshold}%` | `yield` |
| 임계 3.0% 도달 예상 | risk | `thresholdEta` | `thresholdEtaSub` | — |
| 금형 M-2207 잔여 타발수 | watch | `moldRemainShot` | `moldRemainSub` | `mold` |
| 출하 위험 LOT | watch | `riskLotCnt` 건 | `riskLotSub` | — |

### 2-3. 불량률 추이·예측 밴드 (`trend-band`)

`labels` · `series`(actual / estimated / bandLow / bandHigh) · `threshold` · `splitIndex`
부제 "08~10시는 MES 실측 · 10시 이후는 추정 · 임계 3.0%" + "▼ 10시 기준 — 왼쪽은 실측, 오른쪽은 추정 구간입니다"

### 2-4. 설비별 위험 예측 표 (`equipment-risk`)

설비/검사기(`eqptCd / aoiCd`, level 색) · 현재 불량률(`yield`) · +2h 예측(`yield`, level 색) · +8h 예측(`yield`) · 임계 도달 예상 `thresholdEta` · 주 요인(추정) `mainFactor` · 권고 조치 `recommendation` · 신뢰도 `confidence`(소수 2자리)

### 2-5. 출하 전 위험 LOT (`lot-risk`)

LOT(mono) · 모델 · 고객사(**customer**) · 출하 예정 · **LRR 발생 확률** `Badge`(risk=red/watch=amber/그 외 green, `yield` 마스킹) · 근거(추정) · 권고

### 2-6. 잔여 시간 추가 발생 추정 (`remaining-estimate`)

`remaining.rows[[label, value, field]]` + `목표 달성 가능성`(`Badge`) + `즉시 조치 시`(`Badge` + 부연) + `note`

### 2-7. AOI 판정 드리프트 (`inspector-drift`)

검사기 `aoiCd` · 판정 건수(`qty`) · 기준 대비 드리프트(`+` 로 시작하면 bad) · 과검 추정(`yield`) · 미검 추정(`yield`) · 재검 일치율 · 경계 판정 비중 · 상태
우측 배지 : 이탈 있으면 `Badge(red) 기준 이탈 N`, 없으면 `Badge(green) 전체 정상`

### 2-8. 불량 유형 구성 변화 (`defect-type-shift`)

불량 유형 · 오늘(`yield`) · 4주 평균(`yield`) · 변화(상승 빨강 / 하락 초록 / `—` 회색) · 해석

## 3. 버튼 및 페이징

| 버튼 | 동작 |
| :--- | :--- |
| 엑셀 다운로드 | 설비별 위험 예측 xls (8열) |
| 추정 근거·모델 | 모달 — `GET /quality/aoi/prediction/basis` (`model`,`trainPeriod`,`features[]`,`validation`,`limitations[]`) |
| 예측 재산출 | `POST /quality/aoi/prediction/recalculate` → 토스트 → `reload()` |
| 조회 | `reload()` |

페이징 없음.

## 4. 그 밖의 기능

- 판정 결과 자체는 MES 에 이미 적재. 이 화면은 **판정 이력 + 공정 조건 학습 → 추정** 과 **판정 신뢰도 진단**을 제공합니다.
- 드리프트가 커지면 예측 신뢰도도 함께 떨어진다는 점을 카드 부제로 명시.
- 마스킹은 `canData()` 직접 호출(표 셀 문자열)과 `BlindValue`(컴포넌트) 두 방식 혼용.

## 5. 사용 API

총 **9건**

**AOI 판정 분석·예측** — 9건

| # | 서비스 함수 | API 명 | Method | Path | 요청 파라미터 | 응답 주요 필드 | 접근 권한 | blind | 우선순위 |
|---|---|---|---|---|---|---|---|---|---|
| 76 | `getQualityAoiPredictionSummary` | 예측 요약 | GET | `/api/v1/quality/aoi/prediction/summary` | target, horizon, trainPeriod | predictedDefectRate, thresholdReachCnt, riskLotCnt, modelConfidence | 품질보증팀·생산관리팀·제조팀·통합관리자 | yield | 1 |
| 77 | `getQualityAoiPredictionTrendBand` | 불량률 추이·예측 밴드 | GET | `/api/v1/quality/aoi/prediction/trend-band` | target, horizon | labels[], actual[], estimated[], bandLow[], bandHigh[], threshold, splitIndex | 상동 | yield | 1 |
| 78 | `getQualityAoiPredictionEquipmentRisk` | 설비별 위험 예측·권고 | GET | `/api/v1/quality/aoi/prediction/equipment-risk` | target, horizon | items[{eqptCd,aoiCd,currentRate,plus2h,plus8h,thresholdEta,mainFactor,recommendation,confidence}] | 상동 | yield, mold | 1 |
| 79 | `getQualityAoiPredictionLotRisk` | 출하 전 위험 LOT | GET | `/api/v1/quality/aoi/prediction/lot-risk` | target | items[{lotNo,model,customer,shipDue,lrrProbability,basis,recommendation}] | 상동 | customer, yield | 1 |
| 80 | `getQualityAoiPredictionRemainingEstimate` | 잔여 시간 추가 발생 추정 | GET | `/api/v1/quality/aoi/prediction/remaining-estimate` | target, horizon | estimatedNgQty, estimatedRate, confidence | 상동 | qty, yield | 2 |
| 81 | `getQualityAoiInspectorDrift` | AOI 판정 드리프트 | GET | `/api/v1/quality/aoi/inspector-drift` | from, to | items[{aoiCd,judgeCnt,drift,overRejectEst,underRejectEst,recheckMatchRate,borderlineRatio,state}] | 상동 | — | 1 |
| 82 | `getQualityAoiDefectTypeShift` | 불량 유형 구성 변화 | GET | `/api/v1/quality/aoi/defect-type-shift` | date, baseWeeks(4) | items[{defectType,today,baseAvg,change,interpretation}] | 상동 | yield | 2 |
| 83 | `postQualityAoiPredictionRecalculate` | 예측 재산출 | POST | `/api/v1/quality/aoi/prediction/recalculate` | target, horizon, trainPeriod | jobId, predictedAt | 상동 | — | 1 |
| 84 | `getQualityAoiPredictionBasis` | 추정 근거·모델 조회 | GET | `/api/v1/quality/aoi/prediction/basis` | — | model, trainPeriod, features[], validation{}, limitations[] | 상동 | — | 2 |


## 6. 개발 체크리스트

- [ ] 조회 조건 3종 (대상 · 예측 구간 · 학습 기간)
- [ ] 예측 요약 `Pred` 4종 (근거 구간 · 신뢰도 동반)
- [ ] 예측 밴드 차트 (실측/추정 분기 표시)
- [ ] 설비별 위험 예측 `XlsTable` (level 색 · 권고 · 신뢰도)
- [ ] 출하 전 위험 LOT 표 (LRR 확률 배지)
- [ ] 잔여 시간 추정 카드
- [ ] AOI 드리프트 표 + 이탈 배지
- [ ] 불량 유형 구성 변화 표
- [ ] 추정 근거·모델 모달 (입력 변수 · 검증 · 한계)
- [ ] 예측 재산출
- [ ] 마스킹 `yield` / `qty` / `mold` / `customer`
- [ ] "추정이지 확정이 아니다" 문구 노출
