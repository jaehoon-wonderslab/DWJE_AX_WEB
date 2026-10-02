# 32. `/history/chat` — 자연어 질의 이력

| 항목 | 값 |
| :--- | :--- |
| URL | `/history/chat` (`?view=session\|message` · `?session={sessionKey}` · `?focus={messageId}`). 옛 주소 `/system/chat-history` 는 이리로 넘깁니다(북마크 호환) |
| 대그룹 | 자연어 질의 이력(허브 `/menu/history`) — 2026-10-01 결정 R-08 로 시스템관리에서 옮김 |
| 화면 ID | `chat-history` (그대로) |
| 라우트 파일 | `app/(main)/history/chat.jsx` · 옛 주소 리다이렉트 `app/(main)/system/chat-history.jsx` |
| MVC | `domains/system/view/ChatHistoryView.jsx` · `controller/useChatHistoryController.js` · `model/systemRepository.js`(SY-08 구역) |
| 기능 ID | SY-08 |
| 접근 권한 | `chat-history` 조회 권한(미배정 포함 전 부서 — R-08·R-11). 관리 기능(관리자 검토 · 학습데이터 내보내기 · 디버그)은 **`chat-history` 쓰기 권한**(기본 전산팀, 통합관리자는 항상 — R-06) |

전 사용자의 질의 이력을 모두가 봅니다. 질의자보다 데이터 접근 권한이 좁으면 서버가 응답·판단 근거를 가리고(`answerHidden`) 화면은 「권한 밖 응답」 배지와 사유를 보입니다. 쓰기 권한이 없으면 남의 이름은 서버가 가립니다(`박**`).
관리 기능 판정은 요약 `canManage` 를 먼저 보고, 없으면 `/auth/me` 의 `writePerms` 로 합니다. 쓰기 권한이 없으면 관리 버튼은 숨기지 않고 비활성 + 「이 화면의 쓰기 권한이 없습니다. 전산팀에 요청하세요.」, 디버그 영역은 그리지 않습니다.
엑셀 내려받기는 조회 권한으로 받습니다(R-10). 학습데이터 내보내기는 엑셀 패널 밖 별도 버튼입니다.

## 1. 컴포넌트

`PageHead`(+`ExportMenuButton`(엑셀 다운로드 ▾) · 학습데이터 내보내기(쓰기 권한) · `Button primary(자연어 질의 열기)`) · `StatCard`×4 · 오류 줄 · `Tabs`([세션 보기 | 질의 보기]) · `Filters`(시작일 / 종료일 / 사용자 그룹 / 검색) · 안내 `Hint` · 세션 보기: `Card`+`Table`(minWidth 1200)+`Pagination` + 세션 상세 `Card` · 질의 보기: `Card(tight)`+`Table`(minWidth 1850)+`Pagination` · `openModal`(질의 상세 · 평가 · 검토 / 학습데이터 확인)

## 2. 화면에 출력해야 하는 정보

### 2-1. 요약 카드 (`GET /ai/chat/history/summary`)

질의 건수(`questionCnt`, 보조 `세션 {sessionCnt}개 · 유용 n · 오답 n`) · 답변율(`answerRate`, 목표 `targetAnswerRate` 가 있으면 보조) · 평균 응답(`avgResponseSec`, "질의부터 답 완료까지") · 재질의율(`requeryRate`, "같은 대화에서 이어 물은 비율", 중립 tone). 요약 실패 시 값 `—` 와 카드 위 오류 줄.

### 2-2. 조회 조건 · 안내

시작일 · 종료일 · 사용자 그룹(`GET /ai/chat/history/groups` — 없으면 `/system/depts`. 부서 없는 질의 `"-"` 는 「부서 없음」) · 검색(질문, Enter·조회로 확정) · 평가(질의자)·검토(관리자) 「전체/유용/재질의/오답/없음」 · 응답 「전체/응답함/미응답」(서버 `rating`·`review`·`answered` — 08 CHH-10). 날짜를 바꿔 재조회해도 필터·표는 그대로이고 카드 부제에 「조회 중…」.
안내 : 「전 사용자의 질의 이력입니다 · 권한 밖 응답은 가려집니다 · {보존 안내} · 응답 가림 n건」. 미배정 계정은 서버가 **본인 질의만** 돌려줍니다(D-22 결정됨 — 2026-10-02 R-21, 공통 11.5). 그 밖의 부서는 전 사용자 이력을 봅니다. 안내도 「본인 질의 이력입니다」 와 「소속 부서 배정 전에는 본인의 질의 이력만 볼 수 있습니다…」 로 바꿉니다.

### 2-3. 세션 보기 (기본, `GET /ai/chat/history/sessions`)

| 열 | 필드 | 폭 | 렌더 |
| :--- | :--- | :--- | :--- |
| 세션 시작 | `startedAt` | 150 mono | `MM-dd HH:mm` |
| 부서·사용자 | `dept`, `name` | 170/170 | 서버 이름 가림 |
| 질의 수 | `questionCnt` | 80 오른쪽 | |
| 첫 질문 | `firstQuestion` | 360/360 | 2줄 |
| 마지막 질의 | `lastAskedAt` | 150 mono | `MM-dd HH:mm` |
| 응답 | `answeredCnt`/`questionCnt` | 90 오른쪽 | `2/3` |
| 평가 요약 | `usefulCnt`, `badCnt` | 120 | `유용 1 · 오답 0` |
| 검토 | `reviewedCnt` | 80 오른쪽 | 0 이면 `—` |

행을 누르면 `?session=` 을 쌓아(뒤로 가기로 목록 복귀) 세션 상세를 엽니다. 넓은 화면(≥1100px)은 오른쪽 패널(너비 480), 좁은 화면은 같은 주소의 전체 폭 상세(「목록으로」).
세션 상세(`GET /ai/chat/history/sessions/{sessionKey}`) : 질문(오른쪽 말풍선) · 응답(왼쪽 말풍선, 가림 배지) · 응답 시간 · 평가 · 검토를 시간순으로, 각 응답 아래 「질의 상세 ›」. `?focus=` 질의는 테두리로 강조. 「이 세션 내려받기」(한 행 = 한 질의). 없는 세션은 「세션을 찾을 수 없습니다」 후 목록 재조회.

### 2-4. 질의 보기 (`GET /ai/chat/history`)

| 열 | 폭 | 렌더 |
| :--- | :--- | :--- |
| 시각 `ts` | 150 mono | `MM-dd HH:mm:ss` + 「세션 보기 ›」(그 질의가 든 세션을 강조해 엶) |
| 부서·사용자 `dept`·`name` | 170/170 | 서버 이름 가림 |
| 질문 `question` | 330/330 | wrap |
| 응답 `answer` | 390/390 | 3줄 · 가림이면 「권한 밖 응답」 배지 + 사유 |
| 판단 근거 `judgmentBasis` | 300/300 | 3줄 · 가림 배지 |
| 미응답 사유 `unansweredReason` | 220/220 | 3줄 |
| 응답 시간 `responseSec` | 110 오른쪽 | `9.8s` |
| 평가 `rating` | 90 | 질의자 평가 배지 |
| 검토 `review` | 90 | 관리자 검토 배지(모든 열람자에게 보임) |

「답변 평가 기준」 은 모든 행이 같은 상수라 표에서 뺐고 상세에만 둡니다(제거됨 — 표 열). 좁은 화면에서는 카드 안 가로 스크롤로 마지막 「검토」 열까지 봅니다.

### 2-5. 질의 상세 모달 (`GET /ai/chat/history/{messageId}`)

모든 열람자에게 열립니다. 부제 `ts · name (dept)`(기획서 이름 `askedAt`·`userName` 도 받습니다).
질의 / 응답(또는 가림 사유) / 판단 근거 / 근거 문서(`hits` 제목·쪽·점수) / 미응답 사유 / 응답 시간 / 평가(질의자)·의견 / 검토(관리자)·의견·시각 / 답변 평가 기준.
디버그(`debug`, 쓰기 권한 보유자만) : 키·값 표(경로·파싱·도구·실행 결과·오류 코드·기간·행 수·문서 수·도구 ms·전체 ms).
아래 단추 : 닫기 · (본인 질의) 유용함 · 오답 · 검토 의견 + 검토: 유용 · 재질의 · 오답(쓰기 권한 없으면 비활성 + 이유).

## 3. 버튼 및 페이징

| 버튼 | 동작 |
| :--- | :--- |
| 엑셀 다운로드 ▾ | 버튼 바로 아래 패널(바깥 클릭·Esc 닫힘). **조회 목록 다운로드(n건)** = 지금 그리드 행(정렬 그대로). 세션 보기는 한 행 = 한 세션(`attrs=startedAt·dept·name·questionCnt·firstQuestion·lastAskedAt·answeredCnt·usefulCnt·badCnt·reviewedCnt`), 질의 보기는 `attrs=ts·dept·name·question·answer·judgmentBasis·unansweredReason·responseSec·rating·review`, `answerHidden` 행은 응답·근거를 「비공개」 로 채우고 「비공개 처리 n건」 = 이력 `blindCnt`. **전체 다운로드** = `POST /ai/chat/history/export {view:'SESSION'\|'MESSAGE', scope:'ALL', menuId:'chat-history'}` 서버 생성(조건 무시, 최근 5,000건, 이력은 서버 기록) |
| 학습데이터 내보내기 | 쓰기 권한. 확인 모달(평가: 유용만/오답만/전체, 반출 안내) → `POST /ai/chat/history/export-trainset {from,to,ratingFilter,source:'REVIEW_OR_USER',format:'jsonl'}` 파일. 옛 JSON 응답 경로(`exportTrainsetByRange`)는 제거됨 |
| 자연어 질의 열기 | `goToScreen('ai-chat')` |
| 유용함 / 오답 | 본인 질의만 — `POST /ai/chat/messages/{id}/feedback` |
| 검토: 유용 / 재질의 / 오답 | 쓰기 권한 — `PUT /ai/chat/history/{id}/review {reviewCd, comment}` |
| 조회 | 검색어 확정(같으면 다시 조회) |

**페이징** — `usePaging({resetKey: view\|from\|to\|group\|keyword})` + `Pagination`. 서버 정렬(시각 내림차순)을 그대로 씁니다(현재 쪽 재정렬은 없앰).

## 4. 사용 API

| 서비스 함수 | Method | Path | 요청 | 응답 주요 필드 | 권한 |
|---|---|---|---|---|---|
| `getAiChatHistorySummary` | GET | `/api/v1/ai/chat/history/summary` | from, to, userGroup, keyword | questionCnt, sessionCnt, answerRate, avgResponseSec, requeryRate, targetAnswerRate, usefulCnt, badCnt, reviewedCnt, retentionDays, canManage | 조회 |
| `getAiChatHistory` | GET | `/api/v1/ai/chat/history` | from, to, userGroup, keyword, page, size | maskedRowCnt, items[{messageId,sessionKey,ts,empNo,name,dept,question,answer,judgmentBasis,answerHidden,answerHiddenReason,unansweredReason,responseSec,rating,review}], meta | 조회 |
| `getAiChatHistorySessions` (신규) | GET | `/api/v1/ai/chat/history/sessions` | from, to, userGroup, empNo, keyword, page, size | items[{sessionKey,sessionId,startedAt,lastAskedAt,empNo,name,dept,questionCnt,firstQuestion,answeredCnt,usefulCnt,badCnt,reviewedCnt,hiddenCnt}], meta | 조회 |
| `getAiChatHistorySessionsBySessionKey` (신규) | GET | `/api/v1/ai/chat/history/sessions/{sessionKey}` | — | sessionKey, sessionId, empNo, name, dept, startedAt, lastAskedAt, turns[{messageId,askedAt,question,answer,answerHidden,answerHiddenReason,judgmentBasis,unansweredReason,responseSec,rating,review,reask}] | 조회 |
| `getAiChatHistoryByMessageId` | GET | `/api/v1/ai/chat/history/{messageId}` | — | askedAt, userName, dept, question, answer, answerHidden, judgmentBasis, hits[], rating, ratingComment, review, reviewComment, reviewedAt, debug(쓰기 권한만) | 조회 |
| `putAiChatHistoryByMessageIdReview` (신규) | PUT | `/api/v1/ai/chat/history/{messageId}/review` | reviewCd, comment | messageId, review, reviewedBy, reviewedAt | 쓰기 |
| `postAiChatHistoryExport` (신규) | POST | `/api/v1/ai/chat/history/export` | view, scope, menuId, condSummary, format | file(xlsx) | 조회 |
| `postAiChatHistoryExportTrainset` | POST | `/api/v1/ai/chat/history/export-trainset` | from, to, ratingFilter, source, format | file(jsonl), X-Sample-Count | 쓰기 |
| `getAiChatHistoryDebugByRequestId` (카탈로그 등재) | GET | `/api/v1/ai/chat/history/debug/{requestId}` | — | 진단 키·값 (화면은 상세 `debug` 사용) | 쓰기 |
| `getAiChatHistoryGroups` (신규) | GET | `/api/v1/ai/chat/history/groups` | from, to | items[{dept,cnt}] | 조회 |
| `postAiChatMessagesByMessageIdFeedback` | POST | `/api/v1/ai/chat/messages/{messageId}/feedback` | rating | — | 질의자 본인 |

## 5. 개발 체크리스트

- [x] 대그룹 이동 · 옛 주소 리다이렉트(메인)
- [x] 전체 열람 · 상세 전 열람자 개방 · 가림 배지(CHH-01·02)
- [x] 관리 기능 쓰기 권한 분리(CHH-16) · 디버그 키·값 표
- [x] 관리자 검토(CHH-04) · 「검토」 열
- [x] 학습데이터 서버 파일 · 확인 모달(CHH-03)
- [x] 세션 보기 · 세션 상세 · 질의→세션 이동(CHH-18)
- [x] 엑셀 옵션 패널(CHH-19)
- [x] 사용자 그룹 선택지·검색어(CHH-10 일부)
- [x] 평가·검토·응답 여부 필터(CHH-10)
- [x] 보존 기간 안내 — 서버 `retentionDays`·`expiredCnt` 로 「보존 3년 · 기간 지난 n건은 매일 03:10 정리」(결정 R-20, 0 이면 「보존 기간이 정해지지 않았습니다」, CHH-08) · 목표 답변율 `targetAnswerRate`(null 이면 부제 없음, CHH-11)
- 서버 3단계 대조(2026-10-01) : 상세 `askedAt`·`userName`·`hits[≤8]{docId,title,page,score,cited,heading}`, 전체 내려받기 `scope=ALL` 만(그 밖 400), `view` 는 MESSAGE·SESSION(QUERY 도 받음), 조회 기간 92일 초과는 400 이 카드 위 오류 줄로 보입니다
- 시험 : `tests/system/chat-history-browser.cjs` · `tests/specs/14-system-chat-history-view.spec.js`
