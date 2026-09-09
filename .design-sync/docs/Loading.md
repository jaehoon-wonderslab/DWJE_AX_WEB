---
category: feedback-overlays
---
# Loading

조회 중 표시. 시스템 스피너 대신 브랜드 모티프 — 세 점(잉크·앰버·회색)이 160ms 간격으로 차례로 밝아지고 커지는 `Pulse` — 에 12.5px 캡션 회색 문구를 붙입니다. 기본은 세로 여백 48 · 점 8px(카드 한 장을 채우는 크기), `compact` 는 여백 18 · 점 6px 로 카드 안 작은 영역·표 행 자리용입니다. 데이터가 오면 같은 자리를 표·차트로 바꾸고, 결과가 없으면 `EmptyState` 로 바꿉니다.

- `text?: string` (기본 `'조회 중입니다…'`) — `''` 를 주면 점만 남습니다
- `compact?: boolean` — 작은 영역용
- `style?: any`

```jsx
<Loading />
<Loading compact text="MES 실적을 집계하고 있습니다…" />
```
