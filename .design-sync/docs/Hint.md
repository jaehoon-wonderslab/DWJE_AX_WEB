---
category: feedback-overlays
---
# Hint · NoteText · EmptyState · Loading · NoAccess · FormAlert

`Feedback.jsx` 의 안내·상태 표시 여섯 가지. 모두 흰 패널 안에서 "데이터 대신 설명이 나오는 자리" 를 채웁니다 — 화면 상단 안내(`Hint`), 표·수치 아래 주석(`NoteText`), 빈 결과(`EmptyState`), 조회 중(`Loading`), 권한 없음(`NoAccess`), 폼 상단 알림(`FormAlert`). 글자는 500 만 쓰고 색은 캡션 회색 #787878 · 본문 #3C3C3C 이며, 틴트 배경은 `FormAlert` 에만 있습니다(`Hint` 는 #FAFAFA 카드).

**Hint** — 화면·카드 상단의 안내 박스. #FAFAFA 배경 · #DFE1E7 헤어라인 · 반지름 16 · 좌측 15px 아이콘(잉크색) + 12px/19px 문구. 조회 조건·집계 주기·기능 제한처럼 "알고 있어야 할 것" 을 한두 문장으로. 경고는 `FormAlert tone="error"` 나 배지로 — Hint 는 항상 중립 톤입니다.

- `children: React.ReactNode` — 안내 문구
- `icon?: string` (기본 `'info'`) — 왼쪽 Icon 이름(`alert`·`clock`·`lock` 등)
- `style?: any` — 컨테이너 스타일 덧씌우기

```jsx
<Hint>조회 기간은 최근 90일까지 지정할 수 있습니다.</Hint>
<Hint icon="alert">PR-03 은 금형 교체 이후 첫 로트입니다. 치수 편차를 함께 확인하세요.</Hint>
```
