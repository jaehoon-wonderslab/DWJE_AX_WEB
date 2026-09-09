---
category: inputs
---
# RadioRow

단일 선택 라디오 묶음. 15px 원형 점을 가로로 16px 간격·줄바꿈으로 늘어놓고(`paddingTop 6` 으로 라벨 줄과 맞춤), 선택된 항목은 잉크색 4.5px 굵은 테두리 점, 나머지는 헤어라인 1px 점입니다. `options` 는 문자열 배열이거나 `{ value, label }` 배열이고 값은 부모가 `value`/`onChange` 로 제어합니다. 옵션이 길면 `style={{ flexDirection: 'column' }}` 으로 세로 배치합니다. 일별·주별·월별처럼 2~4개의 짧은 배타 선택에 쓰고, 그보다 많으면 `SelectField` 를 씁니다.

props
- `options: Array<string | { value: string; label: string }>` — 선택지
- `value?: string` — 현재 선택 값
- `onChange?: (value: string) => void` — 선택 시
- `style?: StyleProp<ViewStyle>` — 바깥 줄 스타일(세로 배치 등)

```jsx
<RadioRow options={['일별', '주별', '월별']} value={period} onChange={setPeriod} />
```
