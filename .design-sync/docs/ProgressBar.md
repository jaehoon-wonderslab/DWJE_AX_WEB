---
category: data-display
---
# ProgressBar

달성률·진행률 가로 막대. 높이 9px 알약 트랙(#F2F2F2 계열 surfaceHover) 위에 채움을 그리고, `percent` 는 0~100 으로 잘라(clamp) 씁니다. 라벨이나 수치는 그리지 않으므로 위에 "라벨 … 96.2%" 줄을 두고 그 아래 붙입니다(트랙에 `marginTop: 10` 이 내장). 톤은 `''` 기본 ink500 · `ok` 잉크(목표 달성) · `warn` 앰버(근접·주의) · `bad` 적색(미달)이며, 상태 판단은 호출하는 쪽에서 임계값과 비교해 정합니다. 같은 카드에서는 트랙 폭을 맞추고 여러 개를 12~14px 간격으로 세로 나열합니다.

- `percent?: number` — 0~100, 기본 0. 범위 밖은 잘림
- `tone?: '' | 'ok' | 'warn' | 'bad'` — 기본 `''`
- `style?: ViewStyle` — 트랙 스타일(폭·marginTop 조정)

```jsx
<ProgressBar percent={83.5} tone="warn" />
```
