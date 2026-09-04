# 10. `/production/daily-report` — 일일 생산현황 보고

| 항목 | 값 |
| :--- | :--- |
| URL | `/production/daily-report` |
| 화면 ID | `prod-daily` |
| 라우트 파일 | `app/(main)/production/daily-report/index.jsx` |
| MVC | `domains/production/view/DailyReportView.jsx` · `controller/useDailyReportController.js` · `model/productionRepository.js` |
| 기능 ID | PR-03 |
| 접근 권한 | 생산관리팀 · 통합관리자 |

**집계 구간은 전날 20:00 ~ 당일 08:00 (야간 근무분).**
「생산관리팀 (PRESS) 아침회의자료」 양식 그대로 보여 줍니다 — **한 행 = 한 제품**이고, 양식의
「이슈 항목」 자리에 **제품명**이 들어갑니다. **대상일은 화면에서 고릅니다**(전역 기준일은 처음 한 번만).
⑥ 보고서 생성 Agent 가 초안을 만들고 담당자가 보정 후 확정합니다.

> **구간은 서버가 정합니다** — 대상일만 보내면 `periodFrom` 20:00 / `periodTo` 08:00 로 옵니다.
>
> **2026-09-04 — 보고서 문서·결재 모형이 서버에서 걷혔습니다.**
> 초안 조회·재생성·임시 저장·항목 보정·확정·반려·생성 이력·이력 목록 API 가 전부 404 라,
> 화면에서도 결재선·특이사항·노란 띠·「이전 보고서」·「초안 재생성」을 덜어냈습니다.
> **회의 결과는 사라지지 않았습니다** — 일목표·결정항목·DRI·기한은 `ax.tb_prod_daily_decision` 에
> **(대상일, 제품)** 으로 남습니다. 확정 상태가 없어 언제든 고칠 수 있습니다.
> 결재 흐름을 되살릴지는 **사용자 판단 대기**입니다.

## 1. 컴포넌트

| # | 영역 | 컴포넌트 |
| :-- | :--- | :--- |
| 0 | 페이지 헤드 | `PageHead` + `Button(이전 보고서)` · `Button(엑셀 다운로드)` · `Button primary(초안 재생성)` |
| 1 | 조회 조건 | `DateField(대상일)` · `SelectField(공정)` · `SelectField(표시 개수)` |
| 2 | 안내 | `Hint` — 집계 구간 표기 |
| 3 | 양식 머리 | 날짜 배지 `26.09.02` · 가운데 `생산관리팀 (PRESS)` · 오른쪽 범례 3색 + `26.09.01(화)실적` |
| 4 | 양식 본문 | `XlsTable` 11열 — 아래 2-1 |
| 5 | 각주 | `SourceNote` + 기준선·수기 칸 안내 |
| 6 | 행 저장 | `Badge(미저장)` + `Button(행 저장)` — 손댄 제품만 전송 |
| 7 | 표 합계 | `Card` + `KeyValue` |

## 2. 화면에 출력해야 하는 정보

### 2-1. 양식 본문 — 한 행 = 한 제품

열 순서는 스크린샷(`보고서 스크린샷/생산관리팀 (PRESS)_아침회의자료.png`) 그대로입니다.

| # | 열 | 값 | 출처 |
| :-- | :--- | :--- | :--- |
| 1 | 상태 | `정상` / `주의` / `지연` — 달성률 구간에 따라 칸 배경색 | 달성률 계산 |
| 2 | 공정/Process | 공정을 고르면 그 작업장명, '프레스 전체' 면 `Press` | 공정 마스터 |
| 3 | **이슈 항목** | **제품명**(`productNm`) | 제품별 실적 |
| 4 | 일목표 | **작성자 입력.** 채우기 전에는 빈칸 + 회색 밑값 | 화면 state |
| 5 | 실적 | 대상일 생산량 `qty` | 제품별 실적 |
| 6 | 달성률 | `실적 ÷ 일목표 × 100` — **일목표가 비면 `—`** | 계산 |
| 7 | 주간누적 | 3줄 — `주간목표` / `주간실적` / **달성률(굵게)**. 그 주 월요일부터 대상일까지의 **야간 근무** 합. **일목표가 비면 `—`** | 계산 |
| 8 | 영향범위 | `Press {대수}대` — 그 제품을 돌린 설비 수 | 시트 `eqptCnt` |
| 9 | 결정항목 / 기타 | **작성자 입력** (화면 상태) | — |
| 10 | DRI | **작성자 입력** (화면 상태) | — |
| 11 | 기한 | **작성자 입력** (화면 상태) | — |

수량 칸(일목표·실적·주간누적)은 `qty` 마스킹 대상이라 권한이 없으면 비공개 배지만 그립니다.

범례 — 🟢 95% 이상 `정상` · 🟡 95% 미만 `주의` · 🔴 85% 미만 `지연`

**일목표가 비면 달성률·주간목표·주간달성률·상태를 모두 `—` 로 둡니다.** 제품별 일목표가 어디에도
없어서(`PROD_DAY_TARGET` 은 공정 단위이고 값도 0행) 평균 실적을 목표처럼 쓰면
**주간달성률이 산술적으로 늘 100.0%** 가 됩니다(주간목표 = 평균 × 일수 = 주간실적).
평균은 입력칸의 **회색 밑값**으로만 남깁니다. 작성자가 숫자를 넣으면 그 행만 살아납니다.

### 2-2. 표 합계

대상일 · 실적 일자(전날) · 표시 제품 수 · 실적 합계 · 불량 합계 · 일목표 미기입 종수

### 2-4. 생성 이력 (`GET /production/daily-reports/{reportId}/events`)

`type`(제목) · `{detail} · {by}`(설명) · `ts`(MM-DD HH:mm) — 최근 6건

## 3. 버튼 및 페이징

| 버튼 | 위치 | 동작 |
| :--- | :--- | :--- |
| 엑셀 다운로드 | 헤드 | 양식 11열 그대로 xls (주간누적은 3열로 폅니다) |
| 행 저장 | 표 아래 | `POST /production/daily-reports/rows` — 손댄 제품만, 키는 (대상일, 제품) |

페이징 없음.

## 4. 그 밖의 기능

- 대상 일자는 화면 state. `useAppStore.baseDate` 는 **첫 진입 값**으로만 씁니다.
- 날짜 칸은 직접 타이핑할 수 있어 `2026-0` 같은 중간 상태를 거칩니다 —
  `YYYY-MM-DD` 형식이 갖춰진 값만 조회에 씁니다(`dateInput` ↔ `targetDate` 분리).
- '프레스 전체' 는 `processId` 를 빼고 부릅니다 — 서버가 프레스 작업장 전부(`processCds`)로 받습니다.
  어느 작업장을 셌는지 각주에 찍습니다. 프레스 범위가 서버 설정(`app.press-workcenters`)의
  작업장 **이름 매칭**이라, 현장에서 이름을 바꾸면 조용히 달라집니다 — 각주가 그 감시 장치입니다.
- **주간실적은 서버 `weekQty`** 를 그대로 씁니다. 그 주 **보고 구간들의 합**이라 주간목표
  (`일목표 × weekDays`)와 기준이 같습니다. 낮 근무까지 포함한 연속 구간은 `weekQtyAllShift` 로 따로
  옵니다 (D64S/W110 09-02 기준 606,225 대 915,009). **두 값을 섞어 쓰면 주간달성률이 부풀어요.**
- `eqptCnt` 는 제품 단위 `count(DISTINCT eqpt_cd)` 라 **행끼리 더하면 안 됩니다**
  (D63A 의 S136 은 1대인데 품목별로 세어 더하면 2대).
- 일목표 · 결정항목 · DRI · 기한은 「행 저장」으로 남깁니다
  (`POST /daily-reports/{reportId}/rows`, 손댄 제품만). 저장 키는 (보고서, 제품)이라 **공정이 없습니다** —
  같은 제품이 여러 작업장에 있으면 값을 함께 씁니다. DRI·기한은 제품 담당이라 지금은 맞습니다.
- **확정 상태가 없습니다.** 언제든 고쳐 다시 저장할 수 있습니다.

## 5. 사용 API

총 **2건** (+ 공정 선택지용 공정 마스터 1건)

| # | 서비스 함수 | API 명 | Method | Path | 요청 | 응답 |
|---|---|---|---|---|---|---|
| 59.5 | `getProductionDailyReportsSheet` | 조간회의 자료 본문 | GET | `/api/v1/production/daily-reports/sheet` | targetDate, processId | periodFrom, periodTo, weekFrom, weekDays, processCds[], rows[] |
| 59.6 | `postProductionDailyReportsRows` | 조간회의 결과 저장 | POST | `/api/v1/production/daily-reports/rows` | targetDate, rows[{product,targetQty,decision,dri,due}] | targetDate, savedCnt |

**걷어낸 API 7건** — 초안 조회·재생성·항목 보정·임시 저장·확정·반려·생성 이력.
이력 목록·복제(PR-04)까지 더해 9건이 서버에서 사라졌습니다.


양식 본문은 **조간회의 자료 조회 1건**(`GET /production/daily-reports/sheet`)으로 채웁니다.
공정 선택지만 공정 마스터(`GET /common/masters/processes`)에서 받습니다.
**시트 조회는 1회**입니다.

| # | 서비스 함수 | API 명 | Method | Path | 요청 | 응답 |
|---|---|---|---|---|---|---|
| 59.5 | `getProductionDailyReportsSheet` | 조간회의 자료 본문 | GET | `/api/v1/production/daily-reports/sheet` | targetDate, processId | periodFrom, periodTo, weekFrom, weekDays, reportId, processCds[], rows[] |
| 59.6 | `postProductionDailyReportsByReportIdRows` | 조간회의 자료 행 저장 | POST | `/api/v1/production/daily-reports/{reportId}/rows` | rows[{product,targetQty,decision,dri,due}] | success |

## 6. 개발 체크리스트

- [x] 대상일 선택 (형식이 갖춰진 값만 조회)
- [x] 집계 구간 20:00~08:00 표기
- [x] 아침회의 자료 양식 11열 (`XlsTable`)
- [x] 일목표 미기입 시 파생값 비우기
- [x] 이슈 항목 = 제품명
- [x] 달성률 구간별 상태색 (95% / 85%)
- [x] 주간누적 3줄 (달성률 굵게)
- [x] 프레스 작업장만 집계 ('전체' = 프레스 전부 합산)
- [x] 결정항목 · DRI · 기한 입력칸
- [x] 특이사항 (초안 `note`)
- [x] 미저장 변경 표시
- [x] 구간 합계 `KeyValue`
- [x] 생성 이력 목록
- [x] 엑셀 다운로드 (양식 열 그대로)
- [x] **서버 집계 구간 20:00~08:00** — 2026-09-04 반영
- [x] **보고서 전용 조회** (`/daily-reports/sheet`) — 2026-09-04 반영
- [x] **제품별 설비 대수** — 2026-09-04 반영 (시트 `eqptCnt`)
- [x] **`weekQty` 를 보고 구간 합으로** — 2026-09-04 반영 (`weekQtyAllShift` 로 열 분리)
- [x] **일목표 · 결정항목 · DRI · 기한 저장** — 2026-09-04 반영 (키 (대상일, 제품))
- [ ] **제품·공정별 일목표 마스터** — 사용자가 「새로 만든다」 선택, API 개발 요청함
- [ ] **보고서 결재 흐름을 되살릴지** — 사용자 판단 대기
- [ ] **주간 일수 세는 규칙** — 원본 양식과 안 맞음, 사용자 확인 대기
