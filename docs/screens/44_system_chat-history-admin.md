# 44. `/system/chat-history` — 전사 자연어 질의 이력

| 항목 | 값 |
| :--- | :--- |
| URL | `/system/chat-history` (2026-10-03 신규. 예전에는 `/history/chat` 으로 넘기던 옛 주소였습니다) |
| 대그룹 | 시스템관리(끝) |
| 화면 ID | `sys-chat-history` |
| 라우트 파일 | `app/(main)/system/chat-history.jsx` |
| MVC | `domains/system/view/ChatHistoryAdminView.jsx` · `controller/useChatHistoryAdminController.js` · `model/systemRepository.js`(SY-08 · SY-18 구역, `scope:'all'`) |
| 기능 ID | SY-18 |
| 접근 권한 | `sys-chat-history` 접근. 기본은 예전에 `chat-history` 쓰기가 있던 부서(로컬: 전산팀), 통합관리자는 행 없이 통과(V70) |

모든 사용자의 질의를 한 건씩 평평한 표로 봅니다. 조회는 모두 `scope=all` 입니다. 이름 · 사번은 가리지 않고, 열람자의 데이터 접근 권한이 질의자보다 좁으면 서버가 응답 · 판단 근거를 가립니다(`answerHidden`, 「권한 밖 응답」 배지).
관리 기능(답변 추가 · 검토 · 학습데이터 · 디버그)은 요약 `canManage`(= `canWrite('sys-chat-history')`, 접근 && 미배정 아님)로 엽니다. 요약이 없으면 `useAuthStore.canWrite` 로 판정합니다. 막히면 단추를 숨기지 않고 비활성 + 「미배정 계정은 이 동작을 할 수 없습니다. 전산팀에 부서 배정을 요청하세요.」 입니다.
본인 이력만 보는 화면은 [32. 자연어 질의 이력](./32_system_chat-history.md) 입니다.

## 1. 컴포넌트

`PageHead`(+ [학습데이터 내보내기] · `ExportMenuButton`(엑셀 다운로드 ▾)) · `StatCard`×4 · 오류 줄 · `Filters`(시작일 / 종료일 / 조회) · 안내 `Hint` · `Card(tight)` + `Table`(filterable, minWidth 2200) + `Pagination` · `openFormModal`(학습 데이터 답변) · `openModal`(질의 상세 · 학습데이터 확인)

## 2. 화면에 출력해야 하는 정보

### 2-1. 요약 카드 (`GET /ai/chat/history/summary?scope=all`)

질의 건수(`questionCnt`, 보조 「유용 n · 오답 n」) · 답변율(`answerRate`) · 평균 응답(`avgResponseSec`) · 학습 데이터 답변(지금 쪽에서 `trainAnswer` 가 있는 행 수). 요약 실패 시 값 `—` 와 카드 위 오류 줄.

### 2-2. 조회 조건 · 안내

기간만 둡니다 — 기본 최근 7일(오늘-7 ~ 오늘, 오늘 종료). 나머지는 표 머리글 필터로 좁힙니다(지금 쪽 안에서 거릅니다, 한 쪽 100행).
안내: 「전 사용자의 질의 이력입니다 · 데이터 접근 권한 밖 응답은 가려집니다 · 머리글 검색은 지금 쪽 안에서 거릅니다 · 응답 가림 n건」.

### 2-3. 질의 표 (`GET /ai/chat/history?scope=all`)

| 열 | 필드 | 폭 | 렌더 · 머리글 필터 |
| :--- | :--- | :--- | :--- |
| 사용자 | `userLabel`(= `name (dept)`) | 170/170 | 글자 검색 |
| 질문 | `question` | 300/300 | wrap · 글자 검색 |
| 답변 | `answer` | 360/360 | 3줄 · 가림이면 「권한 밖 응답」 · 글자 검색 |
| 판단 근거 | `judgmentBasis` | 280/280 | 3줄 · 가림 배지 · 글자 검색 |
| 미응답 사유 | `unansweredReason` | 200/200 | wrap · 글자 검색 |
| 사용자 평가 | `ratingText`(평가 표시명, 없으면 「미평가」) | 120 | 배지 · 목록 필터 |
| 질문 시간 | `ts` | 160 mono | 글자 검색 |
| 답변 시간 | `answeredAt`(= 질문 시간 + 응답 시간, 서버 계산) | 160 mono | 없으면 `—` |
| 응답 시간 | `responseSec` | 110 오른쪽 | `9.8s` · 필터 없음 |
| 답변 추가(학습 데이터) | `trainAnswer` | 260/260 | 저장된 답변이 있으면 앞부분 40자 + [수정], 없으면 [추가] · 글자 검색 |

행을 누르면 질의 상세를 엽니다. 행 안의 [추가] · [수정] 은 상세를 열지 않습니다.

### 2-4. 학습 데이터 답변 모달 (`openFormModal`)

제목 「학습 데이터 답변 추가 / 수정」, 부제 `사용자 · 질문 시간`. 원 질문 · 원 답변(가림이면 「권한 밖 응답」, 답이 없으면 미응답 사유)을 보이고, 여러 줄 입력(8줄)에 학습시킬 답변을 적습니다. 비우고 저장하면 지웁니다. 최대 4,000자(화면에서 먼저 막고 서버도 400). 마지막 저장 시각 · 저장한 사람을 안내 줄에 적습니다.
저장 = `PUT /ai/chat/history/{messageId}/train-answer {answer}`. 빈 문자열도 본문에 실어 보냅니다(엔드포인트 `preserveEmpty`). 성공하면 목록을 다시 읽습니다.

### 2-5. 질의 상세 모달 (`GET /ai/chat/history/{messageId}?scope=all`)

부제 `사용자 · 질문 시각 · 답변 시각`. 질문 / 답변 / 판단 근거 / 근거 문서 / 미응답 사유 / 응답 시간 / 사용자 평가 / 검토(관리자) / 학습 데이터 답변. `canManage` 이면 디버그 키·값 표.
아래 단추: 닫기 · 검토 의견 + [검토: 유용 · 재질의 · 오답](`PUT …/{id}/review`) · [학습 답변 추가/수정]. `canManage` 가 거짓이면 비활성 + 이유.

## 3. 버튼 및 페이징

| 버튼 | 동작 |
| :--- | :--- |
| 학습데이터 내보내기 | `canManage`. 확인 모달(평가: 유용만/오답만/전체) → `POST /ai/chat/history/export-trainset {from,to,ratingFilter,source:'REVIEW_OR_USER',format:'jsonl'}` 파일. 학습 데이터 답변이 있는 질의는 그 답변을 assistant 로 넣습니다(서버, meta.source `TRAIN_ANSWER`) |
| 엑셀 다운로드 ▾ | **조회 목록** = 지금 표 행(정렬 · 머리글 필터 그대로). `attrs=name·dept·question·answer·judgmentBasis·unansweredReason·rating·ts·answeredAt·responseSec·trainAnswer`, 가린 행은 「비공개」, `blindCnt` 기록. **전체** = `POST /ai/chat/history/export?scope=all {view:'MESSAGE', scope:'ALL', menuId:'sys-chat-history'}` 서버 생성(조건 무시, 최근 5,000건). 엑셀은 쓰기 판정 대상이 아닙니다(R-10) |
| 추가 / 수정 | `canManage` — 2-4 모달 |
| 조회 | 기간으로 다시 읽음 |

**페이징** — `usePaging({ size: 100, resetKey: from|to })` + `Pagination`. 서버 정렬(시각 내림차순).

## 4. 사용 API

| 서비스 함수 | Method | Path | 요청 | 권한 |
|---|---|---|---|---|
| `getAiChatHistorySummary` | GET | `/api/v1/ai/chat/history/summary` | scope=all, from, to | sys-chat-history 접근 |
| `getAiChatHistory` | GET | `/api/v1/ai/chat/history` | scope=all, from, to, page, size | sys-chat-history 접근 |
| `getAiChatHistoryByMessageId` | GET | `/api/v1/ai/chat/history/{messageId}` | scope=all | sys-chat-history 접근(debug 는 쓰기) |
| `putAiChatHistoryByMessageIdTrainAnswer` (신규) | PUT | `/api/v1/ai/chat/history/{messageId}/train-answer` | answer | sys-chat-history 쓰기 |
| `putAiChatHistoryByMessageIdReview` | PUT | `/api/v1/ai/chat/history/{messageId}/review` | reviewCd, comment | sys-chat-history 쓰기 |
| `postAiChatHistoryExportTrainset` | POST | `/api/v1/ai/chat/history/export-trainset` | from, to, ratingFilter, source, format | sys-chat-history 쓰기 |
| `postAiChatHistoryExport` | POST | `/api/v1/ai/chat/history/export?scope=all` | view, scope(ALL), menuId, condSummary, format | sys-chat-history 접근 |
| `postDownloadLogs` | POST | `/api/v1/download-logs` | 조회 목록 내려받기 이력 | 공통 |

목록 · 상세 행에는 `answeredAt` · `trainAnswer` · `trainAnswerAt` · `trainAnswerBy` · `trainAnswerByNm` 이 더 옵니다(2026-10-03 계약).

## 5. 검증

- 화면 시험(API 흉내): `WEB_URL=http://localhost:8081 node tests/system/chat-history-admin-browser.cjs` — 열 순서, 모든 조회 `scope=all`, 기본 기간 오늘-7 ~ 오늘, 머리글 필터, [추가]/[수정] 표시, 추가 모달(원 질문 · 원 답변) → PUT 본문 `{answer}`, 비우고 저장 → `{answer:''}`, 학습데이터 내보내기, 엑셀 전체 `?scope=all`, 상세 `scope=all` · 검토, 미배정(canManage=false) 단추 비활성을 확인합니다.
- 소스 계약: `tests/specs/14-system-chat-history-view.spec.js`

## 2026-10-03 (2차) 관리자 전용 · 옛 관리 기능 이관 · LLM 메타

사용자 결정으로 이 화면은 **관리자(통합관리자) 전용** 입니다. 옛 /history/chat 이 하던 관리 기능을 모두 이 화면에 둡니다.

- 권한: `sys-chat-history` 를 관리 화면 목록(`AccountMenuPicker.ADMIN_SCREENS`, 목 `MOCK_ADMIN_SCREENS`, 서버 `MenuId.ADMIN_SCREENS`)에 넣었습니다. 메뉴 접근 권한 화면은 서버 `screens[].admin` 으로 이 행을 통합관리자 외에는 잠그고, 계정 관리의 수동 메뉴도 「통합관리자만 변경」 으로 잠급니다. 기본 부서 권한 행은 없습니다(목 `MENU_ACCESS_DEFAULT` 전산팀에서 뺐습니다 — 통합관리자는 `'*'` 로 통과). 접근이 없는 계정은 차단 안내만 보이고 `scope=all` 요청을 보내지 않습니다.
- 보기: [질의 보기](기본) · [세션 보기]. 세션 보기는 세션 목록(세션 시작 · 부서·사용자 · 질의 수 · 첫 질문 · 마지막 질의 · 응답 · 평가 요약 · 검토) → 오른쪽 대화 패널(≥1100px, 좁으면 전체 폭)이고, 패널의 「질의 상세 ›」 로 상세 모달을 엽니다. 질의 표의 질문 시간 칸 「세션 보기 ›」 는 그 질의가 든 세션을 강조해 엽니다. 주소 `?view=session&session=…&focus=…`.
- 조건: 시작일 · 종료일 · 사용자 그룹(`GET …/groups?scope=all`, 없으면 부서 목록) · 사용자(사번, `empNo`) · 검색(질문) · 평가 · 검토 · 응답. 사번 · 검색은 Enter 또는 [조회] 로 확정합니다. 질의 표의 열 머리글 필터(현재 쪽 기준)는 그대로 둡니다.
- 질의 열: 사용자 · 질문 · 답변 · 판단 근거 · 미응답 사유 · 사용자 평가 · 검토 · 질문 시간 · 답변 시간 · 응답 시간 · 모델 · 토큰 · 답변 상태 · 의도 · 답변 추가(학습 데이터)(표 너비 3100). LLM 메타 표기는 [32](./32_system_chat-history.md) 2차 절과 같고, 값이 없으면 「—」 입니다. 답변 상태 · 사용자 평가 · 검토는 목록 머리글 필터입니다.
- 상세 모달: 근거 문서(조각을 제목으로 묶고 「근거 n건」), 응답 시간(LLM 호출 시간 `llmMs` 를 괄호로), 모델, 토큰(합계 포함), 답변 상태, 의도, **요청 ID**(`llmRequestId` — scope=all 에서만 옵니다), 사용자 평가, 검토(관리자), 학습 데이터 답변, 답변 평가 기준, 디버그(관리 기능 보유자). 아래 단추는 검토(의견 + 유용 · 재질의 · 오답)와 학습 답변 추가/수정입니다.
- 엑셀 조회 목록: 질의 보기는 사용자 · 부서 · 질문 · 답변 · 판단 근거 · 미응답 사유 · 사용자 평가 · 검토 · 질문 시간 · 답변 시간 · 응답 시간(초) · 모델 · 토큰 · 답변 상태 · 의도 · 답변 추가(학습 데이터), 세션 보기는 세션 열. 전체는 `?scope=all` 에 `view` 를 보기에 맞춰 보냅니다. 세션 패널의 [이 대화 내려받기] 는 질의 열과 같습니다.
- API(V71): 목록 · 상세 · 세션 행에 `intentNm` · `llmModel` · `finishReason` · `promptTokens` · `completionTokens` · `totalTokens` · `llmMs` · `llmRequestId`(all 만), 목록 행에 `docs` · `docCnt`, 상세에 `docCnt` 가 옵니다. 목록 · 세션 요청에 `empNo` 를 보냅니다(scope=all 만).
- 시험: `WEB_URL=http://localhost:8081 node tests/system/chat-history-admin-browser.cjs` — 통합관리자로 열 순서 · LLM 메타 · 조건 8종과 요청 파라미터(userGroup · empNo · keyword), 상세 요청 ID · 근거 묶음, 세션 보기 · 패널 · 질의 상세, 엑셀 열, 답변 추가 · 검토 · 학습데이터, canManage=false 비활성, 접근 없는 전산팀은 `scope=all` 요청 없음을 확인합니다. 관리 화면 잠금은 `tests/system/account-guard-browser.cjs`(수동 메뉴 「전사 자연어 질의 이력」 잠금)와 `tests/specs/14-system-chat-history-view.spec.js` 가 봅니다.
