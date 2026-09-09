---
category: inputs
---
# SelectChip

공정·제품·상태처럼 몇 개 중 고르는 필터 칩(다중 선택 가능). 꺼짐은 흰 캡슐에 옅은 테두리, `on` 이면 잉크(#0B1440) 채움 + 흰 글자 600 으로 선택을 표시합니다. `sub` 는 라벨 옆 10.5px 보조 설명(건수·비율)이고 선택 시 흰색 70%. `small` 은 4/10px 패딩으로 표 머리말·카드 안에 촘촘히 넣을 때 씁니다. 오른쪽·아래 6px(small 5px) 마진이 내장되어 있으니 부모에는 `flexDirection: row · flexWrap` 만 주면 됩니다. 선택 상태는 부모가 들고 `onPress` 로 토글합니다.

props
- `label: string` — 본문
- `sub?: string` — 보조 설명
- `on?: boolean` — 선택 여부
- `onPress?: () => void` — 눌렀을 때(토글)
- `small?: boolean` — 촘촘한 크기
- `style?: StyleProp<ViewStyle>`

```jsx
<SelectChip label="PRESS" sub="12" on={procs.has('PRESS')} onPress={() => toggle('PRESS')} />
```
