---
category: data-display
---
# ConfTag

AI 예측 신뢰도 태그. `Pred` 와 같은 파일의 형제로, 강한 헤어라인(#DFE1E7 계열) 1px 캡슐 안에 "신뢰도 87%" 를 10.5px · 500 으로 그립니다. 값은 0~1 을 받아 `Math.round(value*100)` 으로 표기하며 색은 바뀌지 않습니다(신뢰도가 낮아도 경고색을 쓰지 않음 — 판단은 `Pred` 의 `level` 이 담당). 예측 카드 안 신뢰 구간 아래, 또는 AI 브리핑 문장 옆에 붙입니다.

- `value: number` — 0~1 신뢰도

```jsx
<ConfTag value={0.87} />
```
