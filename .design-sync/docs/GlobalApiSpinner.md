---
category: feedback-overlays
---
# GlobalApiSpinner

전역 API 통신 표시. `useUiStore.apiLoadingCount > 0` 인 동안 (1) 화면 최상단에 2px 잉크색 진행 띠가 왼쪽→오른쪽으로 1.4초 주기로 흐르고, (2) 우상단(top 92 · right 36 — 셸 여백 + 헤더 아래, 계정 메뉴와 겹치지 않는 자리)에 흰 알약(헤어라인 테두리 · 반지름 999)이 떠서 5px `Pulse` 세 점 + "데이터 처리 중"(11px 500 대문자 자간 0.35, 캡션 회색)을 보입니다. `position: fixed` 전체 화면 레이어이고 `pointerEvents: none` 이라 클릭을 막지 않습니다. App 최상위에 한 번만 두며 props 가 없고, 화면별 로딩은 `Loading` 으로 그립니다.

스토어 API (`useUiStore.getState()`): `startApiLoading()` / `endApiLoading()` — API 클라이언트 인터셉터가 요청 시작·종료마다 호출(카운터). 상태: `apiLoadingCount: number`.

```jsx
<GlobalApiSpinner /> {/* App 최상위 */}
// API 계층
useUiStore.getState().startApiLoading(); try { await fetch(...) } finally { useUiStore.getState().endApiLoading(); }
```
