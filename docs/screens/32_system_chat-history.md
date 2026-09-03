# 32. `/system/chat-history` — 자연어 질의 이력

| 항목 | 값 |
| :--- | :--- |
| URL | `/system/chat-history` |
| 화면 ID | `chat-history` |
| 라우트 파일 | `app/(main)/system/chat-history.jsx` |
| MVC | `domains/system/view/ChatHistoryView.jsx` · `controller/useChatHistoryController.js` |
| 기능 ID | SY-08 |
| 접근 권한 | 전 부서 (질의 상세·학습데이터 내보내기는 전산팀·통합관리자) |

의도 해석 결과 · 호출 Agent · 응답 시간을 함께 봅니다. **담당자 평가가 붙은 건은 파인튜닝 학습데이터 후보**가 됩니다.

## 1. 컴포넌트

`PageHead`(+엑셀 다운로드 · 학습데이터 내보내기 · `Button primary(자연어 질의 열기)`) · `StatCard`×4 · `Filters`(시작일 / 종료일 / 사용자 그룹) · `Card(tight)`+`Table`(minWidth 1000)+`Pagination` · `openModal`(질의 상세 · 평가)

## 2. 화면에 출력해야 하는 정보

### 2-1. 요약 카드 (`GET /ai/chat/history/summary`)

질의 건수(`totalCnt`, 보조 "최근 7일") · 의도 파악 정확도(`intentAccuracy` %, 보조 "목표 85%") · 평균 응답(`avgElapsedSec` 초) · 재질의율(`reAskRate` %, 보조 "의도 오해석 추정", tone down)

### 2-2. 조회 조건

시작일 / 종료일(기본 `recentDays(8)` — **실적 기준일과 무관하게 오늘 기준**) · 사용자 그룹(`repo.loadDeptOptions()` 서버 부서 목록)

### 2-3. 질의 이력 표 (`GET /ai/chat/history`)

| 열 | 폭 | 렌더 |
| :--- | :--- | :--- |
| 시각 `ts` | 130 mono | |
| 질의 `question` | flex 1.6 | wrap |
| 해석된 의도 `intentNm` | 140 | |
| 호출 Agent `agents` | 110 | |
| 응답 시간 `responseSec` | 96 우측 | `n.ns` / 없으면 `—` |
| 사용자 | 130 | `{name} ({dept})` |
| 평가 `rating` | 90 | `유용`→green / 그 외 amber / 없으면 `—` |

부제 : "N건 · 행을 누르면 상세와 평가를 볼 수 있습니다"

### 2-4. 질의 상세 모달 (`GET /ai/chat/history/{messageId}`)

부제 `{ts} · {user} ({dept})`
`KeyValue` : 질의 · 해석된 의도 · 호출 Agent · 응답 시간(`n.n초`) · 평가(없으면 `미평가`)
`응답 요약` : `blocks` 중 `text`/`source` 만 나열
푸터 : `닫기` / `유용함` / `개선 필요`(danger)

## 3. 버튼 및 페이징

| 버튼 | 동작 |
| :--- | :--- |
| **행 클릭** | 질의 상세 모달 |
| 유용함 / 개선 필요 | `POST /ai/chat/messages/{messageId}/feedback` → 목록 갱신 |
| 학습데이터 내보내기 | `POST /ai/chat/history/export-trainset` (`ratingFilter='유용'`, format=jsonl) |
| 엑셀 다운로드 | 이력 xls (시각·질의·의도·Agent·응답 시간·평가·사용자) |
| 자연어 질의 열기 | `/ai/chat` |
| 조회 | `reload()` |

**페이징** — `usePaging({resetKey: from\|to\|group})` + `Pagination`.

## 4. 그 밖의 기능

- 상세 조회 실패 시 토스트로 알리고 모달을 열지 않습니다.
- 사용자 그룹 선택지는 서버 부서 목록 — 하드코딩 금지.

## 5. 사용 API

총 **4건**

**자연어 질의 이력** — 4건

| # | 서비스 함수 | API 명 | Method | Path | 요청 파라미터 | 응답 주요 필드 | 접근 권한 | blind | 우선순위 |
|---|---|---|---|---|---|---|---|---|---|
| 186 | `getAiChatHistorySummary` | 질의 이력 요약 | GET | `/api/v1/ai/chat/history/summary` | from, to, userGroup | questionCnt, intentAccuracy, avgResponseSec, requeryRate, targetAccuracy | 전 부서 | — | 1 |
| 187 | `getAiChatHistory` | 질의 이력 조회 | GET | `/api/v1/ai/chat/history` | from, to, userGroup, intent, page, size | items[{ts,empNo,question,intent,agents[],responseSec,rating}], meta | 전 부서 | — | 1 |
| 188 | `getAiChatHistoryByMessageId` | 질의 상세 조회 | GET | `/api/v1/ai/chat/history/{messageId}` | — | question, intent, prompt, answer, hits[{docId,chunkId,score}], agents[], elapsedMs | 전산팀·통합관리자 | — | 2 |
| 189 | `postAiChatHistoryExportTrainset` | 학습데이터 내보내기 | POST | `/api/v1/ai/chat/history/export-trainset` | from, to, ratingFilter, format(jsonl) | file(binary), sampleCnt | 전산팀·통합관리자 | — | 3 |

평가는 자연어 질의 화면과 공용 API `postAiChatMessagesByMessageIdFeedback` 을 사용합니다.

## 6. 개발 체크리스트

- [ ] 요약 4카드 (정확도 · 응답 · 재질의율)
- [ ] 기간·사용자 그룹 조회 (오늘 기준 기본값)
- [ ] 이력 표 7열 + 평가 배지
- [ ] 상세 모달 + 응답 요약(blocks) + 평가 2종
- [ ] 학습데이터 내보내기(jsonl)
- [ ] 페이징 · 엑셀 다운로드 · 질의 화면 이동
