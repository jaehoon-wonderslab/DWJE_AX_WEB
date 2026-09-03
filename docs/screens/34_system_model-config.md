# 34. `/system/model-config` — AI 모델 설정

| 항목 | 값 |
| :--- | :--- |
| URL | `/system/model-config` |
| 화면 ID | `base-model` |
| 라우트 파일 | `app/(main)/system/model-config.jsx` |
| MVC | `domains/system/view/ModelConfigView.jsx` · `controller/useModelConfigController.js` |
| 기능 ID | SY-10 |
| 접근 권한 | 전산팀 · 통합관리자 |

Agent 별 **이상 탐지 임계치** · **분류 기준** · **보안 필터링 패턴**을 설정합니다.

## 1. 컴포넌트

`PageHead`(+`Button primary(저장)`) · `Grid cols=2` → `Card`(이상 탐지 임계치) / `Card`(분류 기준) · `Card(tight)`+`Table`(보안 필터링 패턴) · `openFormModal`(패턴 등록·편집)

## 2. 화면에 출력해야 하는 정보

### 2-1. 이상 탐지 임계치 (⑨ 이상 알림 Agent)

`GET /ai/model-config` 의 `thresholds[]` 를 **서버가 준 목록 그대로** 그립니다 (화면에 항목 고정 금지).

| 항목 필드 | 사용처 |
| :--- | :--- |
| `key` | 식별자 |
| `metric` / `key` | 라벨 |
| `unit` | 라벨 괄호 `({unit})` |
| `valueType` | `SELECT` → `SelectField`(options 쉼표 구분) / `NUMBER` → 숫자 키보드 `TextField` / 그 외 텍스트 |
| `value` | 입력값 |
| `description` | `hint` |

빈 경우 : `EmptyState` "등록된 임계치 항목이 없습니다. 지표 기준을 먼저 등록해 주세요."

### 2-2. 분류 기준 (③ 불량 판정 Agent)

`classification.raw` 의 키-값을 `TextField` 로. 표시명 보완 맵
`judge_boundary` → 판정 경계값 / `borderline_range` → 경계 구간 / `hitl_criteria` → 사람 확인(HITL) 기준
없으면 `EmptyState` "등록된 분류 기준이 없습니다."

### 2-3. 보안 필터링 패턴 (⑦ 보안 필터링 Agent, `GET /ai/mask-rules`)

| 열 | 폭 | 렌더 |
| :--- | :--- | :--- |
| 패턴명 `name` | 130 | |
| 대상 필드 `targetFields` | flex mono | 배열이면 `, ` 연결 |
| 처리 `action` | 110 | `FULL`→red / 그 외 amber |
| 고객사 정책 `customerPolicy` | 170 | |
| 사용 `enabled` | 78 | `Y`(green) / `N` |
| 관리 | 82 | `Button(편집)` |

## 3. 버튼 및 폼

| 버튼 | 동작 |
| :--- | :--- |
| 저장 | `PUT /ai/model-config` — `thresholds[{key,value}]` + `classification{}` |
| 패턴 등록 / 편집 | 폼 → `POST /ai/mask-rules` · `PUT /ai/mask-rules/{ruleId}` |

### 3-1. 보안 필터링 패턴 폼

패턴명(필수, `예) 단가`) · 데이터 항목 key(`예) price`) · 대상 컬럼(필수, `schema.table.column` 쉼표 구분, 전폭) · 처리(select: `FULL` 전체 마스킹 / `PARTIAL` 부분 마스킹 / `HASH` 해시 / `DROP` 제외) · 고객사 정책(전폭)
안내 : "패턴은 보고서·AI 응답·다운로드 전 구간에 함께 적용되며, 처리 내역은 감사 로그에 기록됩니다."

페이징 없음.

## 4. 그 밖의 기능

- 임계치·분류 기준은 **저장 전까지 화면 state** 로만 보관 → 저장 버튼 한 번에 반영.
- 서버 응답이 바뀌면(`data` 변경) state 를 다시 초기화.

## 5. 사용 API

총 **6건**

**AI 모델 설정** — 6건

| # | 서비스 함수 | API 명 | Method | Path | 요청 파라미터 | 응답 주요 필드 | 접근 권한 | blind | 우선순위 |
|---|---|---|---|---|---|---|---|---|---|
| 191 | `getAiModelConfig` | AI 모델 설정 조회 | GET | `/api/v1/ai/model-config` | — | thresholds[{agentCd,metric,value}], classification{judgeBoundary,borderlineRange,hitlCriteria} | 전산팀·통합관리자 | — | 1 |
| 192 | `putAiModelConfig` | AI 모델 설정 저장 | PUT | `/api/v1/ai/model-config` | thresholds[], classification{} | success | 전산팀·통합관리자 | — | 1 |
| 193 | `getAiMaskRules` | 보안 필터링 패턴 목록 | GET | `/api/v1/ai/mask-rules` | — | items[{ruleId,name,targetFields[],action,customerPolicy,useYn}] | 전산팀·통합관리자 | — | 1 |
| 194 | `postAiMaskRules` | 보안 필터링 패턴 등록 | POST | `/api/v1/ai/mask-rules` | name, targetFields[], action, customerPolicy, useYn | ruleId | 전산팀·통합관리자 | — | 1 |
| 194 | `postAiMaskRulesByRuleId` | 보안 필터링 패턴 등록 (ID 지정) | POST | `/api/v1/ai/mask-rules/{ruleId}` | name, fieldKey, targetFields, action, customerId, customerPolicy | ruleId | 전산팀·통합관리자 | — | 2 |
| 194 | `putAiMaskRulesByRuleId` | 보안 필터링 패턴 수정 | PUT | `/api/v1/ai/mask-rules/{ruleId}` | name, targetFields[], action, customerPolicy, useYn | ruleId | 전산팀·통합관리자 | — | 1 |


## 6. 개발 체크리스트

- [ ] 임계치 목록 **동적 렌더**(valueType 별 입력 위젯) + 빈 상태
- [ ] 분류 기준 동적 렌더 + 표시명 보완 맵
- [ ] 저장(한 번에 반영)
- [ ] 보안 필터링 패턴 표 + 등록·편집 폼(처리 4종)
- [ ] 감사 로그 기록 확인
