---
category: data-display
---
# ChipRow

칩들을 감싸는 줄. 가로 6px 간격·줄바꿈이며 위 10px 여백이 있어 AI 답변 본문이나 카드 머리말 아래에 바로 붙습니다. `Chip`(후속 질문)·`SourceChip`(데이터 소스) 어느 쪽이든 담을 수 있고, `SelectChip` 은 자체 마진이 있어 보통 ChipRow 없이 `flexWrap` 컨테이너에 둡니다. 여백을 없애려면 `style={{ marginTop: 0 }}`.

props
- `children: ReactNode` — 칩들
- `style?: StyleProp<ViewStyle>`

```jsx
<ChipRow>
  <SourceChip label="MES 실적" />
  <SourceChip label="AOI 판정 로그" />
</ChipRow>
```
