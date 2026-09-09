---
category: feedback-overlays
---
# FormAlert

폼 상단 알림. API 실패 응답에 `error.field` 가 없을 때(어느 칸의 문제인지 특정할 수 없을 때) 메시지를 붙이는 자리이고, 칸을 특정할 수 있으면 `<Field error=…>` 로 입력란 아래에 답니다. 톤 색의 8% 틴트 배경 + 24% 테두리 + 반지름 12 · 왼쪽 15px 아이콘(error=alert · success=check · info=info) · 12.5px/19px 500 본문. `children` 이 비어 있으면 아무것도 그리지 않으므로 상태값을 그대로 넘겨도 됩니다. 저장 성공처럼 잠깐 보이면 되는 안내는 `toast()` 가 더 맞고, FormAlert 는 폼이 열려 있는 동안 남아 있어야 하는 메시지에 씁니다.

- `children?: React.ReactNode` — 메시지(없으면 null)
- `tone?: 'error' | 'success' | 'info'` (기본 `'error'`)
- `style?: any`

```jsx
<FormAlert>{serverError}</FormAlert>
<FormAlert tone="success">PR-03 점검 기준을 저장했습니다.</FormAlert>
<FormAlert tone="info">저장하면 수율 집계에서 제외됩니다.</FormAlert>
```
