---
category: data-display
---
# SourceChip

AI 답변·브리핑 하단에 "어떤 데이터를 근거로 했는지" 표기하는 칩. 누를 수 없고, #FAFAFA 회색 면에 테두리 없이 11.5px/500 글자입니다. `off` 를 주면 opacity .5 와 취소선으로 이번 답변에 쓰이지 않은 소스를 나타내 전체 소스 목록 대비 사용분을 한눈에 보여 줍니다. 보통 `ChipRow` 안에 3~6개를 둡니다.

props
- `label: string` — 소스 이름(MES 실적 · AOI 판정 로그 · 설비 이벤트 …)
- `off?: boolean` — 미사용 표시(흐림 + 취소선)
- `style?: StyleProp<ViewStyle>`

```jsx
<ChipRow>
  <SourceChip label="MES 실적" />
  <SourceChip label="ERP 재고" off />
</ChipRow>
```
