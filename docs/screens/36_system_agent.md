# 36. `/system/agent` — Agent 실행 현황

| 항목 | 값 |
| :--- | :--- |
| URL | `/system/agent` |
| 화면 ID | `ai-agent` |
| 라우트 파일 | `app/(main)/system/agent.jsx` |
| MVC | `domains/system/view/AgentStatusView.jsx` · `controller/useAgentStatusController.js` |
| 기능 ID | SY-12 |
| 접근 권한 | 전산팀 · 통합관리자 |

Master AI 오케스트레이션과 **Worker Agent 9종**의 작동 상태. **30초 자동 갱신.**

## 1. 컴포넌트

`PageHead`(+엑셀 다운로드 · `Button primary(Agent 재시작)`) · `StatCard`×4 · `Card`(Master AI 파이프라인 — 단계 박스 + `arrowRight` 아이콘) · `Card(tight)`+`Table`(Worker Agent 9종) · `Card(tight)`+`Table`(Agent 실행 이력) · `openFormModal`(재시작)

## 2. 화면에 출력해야 하는 정보

### 2-1. 요약 카드 (`GET /ai/agents/summary`)

Master AI(`master.state`, 보조 `master.mode`) · 작동 Agent(`agentCnt` 종, 보조 `전체 정상` / `이상 감지`) · 처리 이벤트(`eventsPerMin` evt/min, 보조 "최근 1분") · 평균 응답(`avgResponseSec` 초, 보조 "자연어 질의 기준")

### 2-2. Master AI 파이프라인 (`GET /ai/agents/pipeline`)

`stages[{name, desc, highlight}]` — 가로 배치 박스 + 화살표. `highlight` 면 info 색 강조.
부제 : "자연어 질의가 처리되는 순서"

### 2-3. Worker Agent 9종 (`GET /ai/agents`)

`#`(no, 중앙) · Agent `name` · 역할 `role` · 상태 `StateBadge` · 최근 실행 `last` · 처리량 `load` · 관련 화면 `screens`(mono)
행 클릭 → 해당 Agent 로 실행 이력 필터(다시 누르면 해제)
부제 : "행을 누르면 해당 Agent 의 실행 이력만 보여 줍니다"

### 2-4. Agent 실행 이력 (`GET /ai/agents/{agentCd}/runs`)

실행 시각(mono) · Agent(중앙) · 내용(wrap) · 소요(`n.ns`) · 결과(`성공`→green / 그 외 red)
카드 부제 : `{selectedAgent} Agent 만 보기` 또는 `전체 Agent`, 선택 시 우측에 `Button(전체 보기)`

## 3. 버튼 및 페이징

| 버튼 | 동작 |
| :--- | :--- |
| Agent 재시작 | 폼(대상 Agent select + 재시작 사유 textarea) → `POST /ai/agents/{agentCd}/restart` |
| 엑셀 다운로드 | Agent 목록 xls (#·Agent·역할·상태·최근 실행·처리량·관련 화면) |
| Agent 행 클릭 | 실행 이력 필터 토글 |
| 전체 보기 | 필터 해제 |

재시작 폼 안내 : "재시작 중에는 해당 Agent 의 작업이 잠시 대기 큐에 쌓입니다. 재시작 이력은 감사 로그에 기록됩니다."

**페이징** — 실행 이력 API `page`/`size` 지원, 화면 미노출. → **개선 항목**

## 4. 그 밖의 기능

- **폴링 30초**(`POLL_MS = 30000`), `silent: true` 조회 — 갱신 시 깜빡임 없음. 첫 로드에만 `Loading`.
- 대시보드(`/dashboard/ai`)의 「Agent 작동 현황」 카드 「전체」 버튼으로 진입합니다.

## 5. 사용 API

총 **5건**

**Agent 실행 현황** — 5건

| # | 서비스 함수 | API 명 | Method | Path | 요청 파라미터 | 응답 주요 필드 | 접근 권한 | blind | 우선순위 |
|---|---|---|---|---|---|---|---|---|---|
| 210 | `getAiAgentsSummary` | Agent 요약 | GET | `/api/v1/ai/agents/summary` | — | master{state,mode}, activeAgentCnt, eventsPerMin, avgResponseSec | 전산팀·통합관리자 | — | 1 |
| 211 | `getAiAgents` | Agent 목록 조회 | GET | `/api/v1/ai/agents` | — | items[{no,agentCd,name,state,lastRunAt,load}] | 전산팀·통합관리자 | — | 1 |
| 212 | `getAiAgentsPipeline` | Master AI 파이프라인 조회 | GET | `/api/v1/ai/agents/pipeline` | — | stages[{stage,name,state,elapsedMs}] | 전산팀·통합관리자 | — | 1 |
| 213 | `postAiAgentsByAgentCdRestart` | Agent 재시작 | POST | `/api/v1/ai/agents/{agentCd}/restart` | — | success, restartedAt | 전산팀·통합관리자 | — | 1 |
| 214 | `getAiAgentsByAgentCdRuns` | Agent 실행 이력 | GET | `/api/v1/ai/agents/{agentCd}/runs` | from, to, state, page, size | items[{runId,startedAt,endedAt,state,inputCnt,outputCnt,errorMsg}], meta | 전산팀·통합관리자 | — | 2 |


## 6. 개발 체크리스트

- [ ] 요약 4카드
- [ ] Master AI 파이프라인 가로 흐름도
- [ ] Worker Agent 9종 표 + 행 선택 필터
- [ ] Agent 실행 이력 표 + 필터 해제
- [ ] 재시작 폼(사유 → 감사 로그)
- [ ] 30초 폴링(silent)
- [ ] 엑셀 다운로드
- [ ] (개선) 실행 이력 페이징
