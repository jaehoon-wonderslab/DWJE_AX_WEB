# 04. `/ai/chat` — 자연어 질의 (AI 어시스턴트)

| 항목 | 값 |
| :--- | :--- |
| URL | `/ai/chat` |
| 화면 ID | `ai-chat` |
| 라우트 파일 | `app/(main)/ai/chat.jsx` |
| MVC | `domains/ai/view/ChatView.jsx` · `controller/useChatController.js` · `model/aiRepository.js` |
| 기능 ID | AI-01 |
| 접근 권한 | 전 부서 |
| 컨테이너 | `FullPageContainer` (전폭 채팅 레이아웃) |

생산 실적 · 불량 현황 · 로트 이력 · 설비 가동 상태를 자연어로 조회합니다. 응답은 서버가 준 **`blocks` 배열**(text · table · chart · source · actions)을 종류별 컴포넌트로 그립니다.

## 1. 컴포넌트

| 영역 | 컴포넌트 |
| :--- | :--- |
| 세션 바 | 제목 "자연어 질의" · 상태 문구 · `Button(새 대화, icon=plus)` · `Button(추천 질의, icon=sparkles)` |
| 대화 영역 | `ScrollView`(자동 하단 스크롤) · `Message`(말풍선) · `Loading(compact)` |
| 빈 대화 | `EmptyChat` — "무엇을 확인해 드릴까요?" + 추천 질의 카드 그리드 |
| 응답 블록 | `text`→`Text` / `table`→`Table`+`BlindValue` / `chart(line)`→`LineChart` / `source`→출처 각주 / `actions`→버튼 3종 |
| Agent 배지 | `Badge` — 호출된 Agent 목록 + 응답 소요 시간(`n.n초`) |
| 후속 질문 | `ChipRow` + `Chip` (`followups`) |
| 입력창 | 둥근 카드(radius 16) · `TextInput` · `MiniButton(추천 질의 / 음성)` · 전송 원형 버튼(`arrowUp`) |
| 추천 질의 드로어 | `openDrawer` — 질문 목록 (누르면 즉시 질의) |

## 2. 화면에 출력해야 하는 정보

| 항목 | 값·출처 |
| :--- | :--- |
| 세션 상태 | `질의 N건 · 세션 맥락 유지 중` 또는 `새 대화 · 온프레미스 처리` |
| 서비스 모델 버전 | `useAuthStore.servingModelVer` (`· 모델 v1.4.2`) |
| 사용자 말풍선 | 부서 약칭 아바타(`DEPTS[].av`, 기본 `ME`) + 질문 텍스트 |
| AI 말풍선 | `AI` 아바타 + blocks 렌더 |
| 응답 유형(`intent`) | `denied`(거부) / `unknown`(모름) 은 말풍선 배경 강조, 그 외는 테두리 없이 본문처럼 |
| 표 블록 | `head[]` · `rows[][]` · **`blindColumns[]`** — 열별 데이터 권한 키로 마스킹 |
| 차트 블록 | `labels` · `series` · `min` · `max` |
| 출처 블록 | 원천 화면 · 기간 · LOT 근거 |
| 추천 질의 | `q`(질문) · `desc`(설명) |
| 하단 고정 안내 | "조회 대상 데이터는 질문 의도에 따라 AI 가 자동으로 판단합니다. … 권한 범위를 벗어난 항목은 마스킹됩니다." |

## 3. 버튼 및 페이징

| 버튼 | 동작 |
| :--- | :--- |
| 새 대화 | `DELETE /ai/chat/sessions/{sessionId}` → 화면·세션 초기화 (세션이 없으면 화면만 비움) |
| 추천 질의 (상단·입력창) | 드로어 열기 → 항목 클릭 시 `send(q)` |
| 음성 | `POST /ai/chat/asr` (`speechToText`) — 결과 토스트 |
| 전송(↑) / Enter | `POST /ai/chat/ask` |
| 후속 질문 칩 | `send(q)` |
| 엑셀 다운로드 (actions 블록) | `POST /ai/chat/messages/{messageId}/export (format=xls)` |
| 유용함 / 개선 필요 | `POST /ai/chat/messages/{messageId}/feedback (rating=good\|bad)` |

페이징 없음 — 대화 스크롤 방식.

## 4. 그 밖의 기능

- **세션 유지** — `localStorage['dwje.ax.chatSession']` 에 `sessionId` 저장. 새로고침 시 `GET /ai/chat/sessions/{id}` 로 직전 대화를 복원합니다. 첫 진입(저장값 없음)은 빈 대화.
- **상단 통합 검색 연동** — Topbar 검색 → `/ai/chat?q=<키워드>` 로 이동하면 `useLocalSearchParams` 로 받아 **자동 질의**. `handledQuery` ref 로 중복 전송 방지.
- **낙관적 렌더** — 질문은 즉시 말풍선으로 추가하고, 응답 대기 중 `pending` 로딩 표시.
- **자동 스크롤** — 메시지 수 또는 pending 변화 시 60ms 뒤 `scrollToEnd`.
- **마스킹** — 응답 표는 `blindColumns` 로 열 단위 `BlindValue` 적용.
- 질의 이력·평가는 **[32. `/system/chat-history`](./32_system_chat-history.md)** 에서 조회.

## 5. 사용 API

총 **7건**

**자연어 질의** — 7건

| # | 서비스 함수 | API 명 | Method | Path | 요청 파라미터 | 응답 주요 필드 | 접근 권한 | blind | 우선순위 |
|---|---|---|---|---|---|---|---|---|---|
| 14 | `postAiChatAsk` | 자연어 질의 요청 | POST | `/api/v1/ai/chat/ask` | sessionId, question | messageId, intent(denied|unknown|trend|trace|downtime|metric), answerHtml, blocks[], agents[], sources[], followups[], elapsedMs | 전 부서 | * | 1 |
| 15 | `getAiChatSessionsBySessionId` | 세션 대화 조회 | GET | `/api/v1/ai/chat/sessions/{sessionId}` | — | messages[{who,html,intent,ts}] | 전 부서 | * | 1 |
| 16 | `deleteAiChatSessionsBySessionId` | 새 대화 시작 | DELETE | `/api/v1/ai/chat/sessions/{sessionId}` | — | newSessionId | 전 부서 | — | 2 |
| 17 | `getAiChatSuggestions` | 추천 질의 목록 | GET | `/api/v1/ai/chat/suggestions` | — | suggestions[{q,desc}] | 전 부서 | — | 2 |
| 18 | `postAiChatMessagesByMessageIdExport` | 응답 결과 내려받기 | POST | `/api/v1/ai/chat/messages/{messageId}/export` | format(xls|csv) | file(binary) | 전 부서 | * | 2 |
| 19 | `postAiChatMessagesByMessageIdFeedback` | 응답 평가 | POST | `/api/v1/ai/chat/messages/{messageId}/feedback` | rating(good|bad), comment | success | 전 부서 | — | 2 |
| 20 | `postAiChatAsr` | 음성 입력 변환 | POST | `/api/v1/ai/chat/asr` | audio(multipart) | text | 전 부서 | — | 3 |


## 6. 개발 체크리스트

- [ ] 전폭 채팅 레이아웃 (세션 바 / 대화 / 입력창 3단, 최대 폭 840)
- [ ] `blocks` 렌더러 5종 — text · table · chart(line) · source · actions
- [ ] 표 블록 `blindColumns` 마스킹
- [ ] Agent 배지 + 소요 시간 표시
- [ ] 추천 질의 — 빈 대화 카드 + 드로어 2곳
- [ ] 후속 질문 칩
- [ ] 세션 복원(localStorage) · 새 대화(DELETE)
- [ ] Topbar 통합 검색 `?q=` 자동 질의 (중복 방지)
- [ ] 응답 내려받기 / 평가(good·bad)
- [ ] 음성 입력(ASR) 버튼
- [ ] 자동 하단 스크롤 · pending 로딩
