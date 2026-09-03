# 08. `/production/monitor` — 생산 모니터링

| 항목 | 값 |
| :--- | :--- |
| URL | `/production/monitor` |
| 화면 ID | `prod-monitor` |
| 라우트 파일 | `app/(main)/production/monitor.jsx` |
| MVC | `domains/production/view/ProductionMonitorView.jsx` · `controller/useProductionMonitorController.js` · `model/productionRepository.js` |
| 기능 ID | PR-01 |
| 접근 권한 | 품질보증팀 · 생산관리팀 · 제조팀 · 통합관리자 |

IoT 복합 센서가 부착된 프레스 10대와 AOI 검사기 10대의 진행 현황을 **10초 폴링**으로 조회합니다.

## 1. 컴포넌트

| # | 영역 | 컴포넌트 |
| :-- | :--- | :--- |
| 0 | 페이지 헤드 | `PageHead` + `Button(자동 새로고침 토글)` · `Button(엑셀 다운로드)` |
| 1 | 조회 조건 | `Filters` + `SelectField`(공정 / 모델 / 상태) + `Button primary(조회)` |
| 2 | 요약 | `StatCard` × 4 (`Grid cols=4`) |
| 3 | 설비별 실시간 현황 | `Card(tight)` + `Table`(minWidth 880) + `Pagination` |

## 2. 화면에 출력해야 하는 정보

### 2-1. 요약 카드 (`GET /production/monitor/summary`)

| 카드 | 값 | 단위 | 보조 |
| :--- | :--- | :--- | :--- |
| 가동 | `running` | 대 | `전체 {total ?? 10}대 중` |
| 경고 | `warning` | 대 | `warningDetail` (tone down) |
| 비가동 | `stopped` | 대 | `stoppedDetail` (tone down) |
| 시간당 처리 | `hourlyThroughput` (**qty**) | EA | 전 라인 합계 |

### 2-2. 설비별 실시간 현황 표 (`GET /production/monitor/equipments`)

| 열 | 폭 | 마스킹 |
| :--- | :--- | :--- |
| 설비 `eqptCd` | 90 (mono) | — |
| 설비명 `eqptNm`(없으면 `model`) | 170 | — |
| 생산량 `qty` | 100 우측 | `qty` |
| 불량률 `defectRate` | 88 우측 | `yield` |
| 가동률 `uptimeRate` | 84 우측 | — |
| 타발 속도 `strokeSpeed` | 96 우측 `n spm` | — |
| 최근 수집 `lastCollectedAt` | 90 | — |
| 상태 `state` | 82 `StateBadge` | — |

카드 부제 : "프레스 IoT 1초 단위 수집 · AOI 제품 단위"

## 3. 버튼 및 페이징

| 버튼 | 동작 |
| :--- | :--- |
| 자동 새로고침 | 토글. 라벨 `자동 새로고침 · 10초` ↔ `자동 새로고침 꺼짐`, 토스트 안내 |
| 엑셀 다운로드 | 현재 목록 xls (설비·모델·생산량·불량률·가동률·타발 속도·최근 수집·상태) |
| 조회 | `reload()` + `조회 조건으로 N건을 조회했습니다` 토스트 |

**페이징** — `usePaging({resetKey: 공정|모델|상태})` + `Pagination`. 설비 1,000대 초과라 서버 페이징 필수.

## 4. 그 밖의 기능

- **폴링 10초** (`POLL_MS = 10000`) — 조회 조건 유지한 채 `reload`. 언마운트 시 `clearInterval`.
- 조회는 `silent: true` — 폴링·쪽 이동 때 전체 로딩 화면이 뜨지 않습니다. 첫 진입에만 `Loading`.
- **모델 선택지**는 설비 목록 실제 값에서 생성(`loadMonitor({size:500})` 의 `model` 유니크). **공정 선택지**는 `loadProcessOptions()` 서버 기준정보.
- 상태 선택지는 `전체 / 가동 / 경고 / 비가동`.
- `lineRange` 파라미터는 설비 코드 전방 일치 검색을 지원합니다.

## 5. 사용 API

총 **2건**

**생산 모니터링** — 2건

| # | 서비스 함수 | API 명 | Method | Path | 요청 파라미터 | 응답 주요 필드 | 접근 권한 | blind | 우선순위 |
|---|---|---|---|---|---|---|---|---|---|
| 55 | `getProductionMonitorSummary` | 모니터링 요약 | GET | `/api/v1/production/monitor/summary` | processId | running, warning, stopped, hourlyThroughput, stoppedDetail | 품질보증팀·생산관리팀·제조팀·통합관리자 | qty | 1 |
| 56 | `getProductionMonitorEquipments` | 설비별 실시간 현황 | GET | `/api/v1/production/monitor/equipments` | processId, lineRange(설비코드 전방 일치), model, state, page, size | items[{eqptCd,model,qty,defectRate,uptimeRate,strokeSpeed,lastCollectedAt,state}], meta | 상동 | qty, yield, mold | 1 |


## 6. 개발 체크리스트

- [ ] 요약 4카드 (마스킹 `qty`)
- [ ] 설비 표 8열 + `StateBadge` + 마스킹
- [ ] 서버 페이징 + `Pagination`
- [ ] 10초 폴링 토글 (조건 유지 · 언마운트 정리)
- [ ] `silent` 조회로 깜빡임 방지
- [ ] 공정·모델 선택지 서버 연동
- [ ] 엑셀 다운로드
