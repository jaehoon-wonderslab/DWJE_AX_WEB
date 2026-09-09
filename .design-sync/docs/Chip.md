---
category: data-display
---
# Chip · SourceChip · SelectChip · ChipRow

작은 캡슐(반지름 999 · 6/12px 패딩 · 11.5~12px/500 글자). 용도별로 세 가지입니다.

- **Chip** — 눌러서 실행하는 칩. AI 답변 아래 후속 질문, 빠른 동작. 흰 면에 아주 옅은 테두리(rgba 0,0,0,.07), 글자는 본문 2차색. `onPress` 가 있으면 눌리고 없으면 표기용 `View` 가 됩니다. `disabled` 는 눌림만 막고 모양은 바꾸지 않습니다(필요하면 `style` 로 opacity).
- **SourceChip** — 데이터 소스 표기(누를 수 없음). #FAFAFA 회색 면·테두리 없음. `off` 면 opacity .5 + 취소선으로 "이번엔 안 쓴 소스"를 나타냅니다.
- **SelectChip** — 여러 개 중 고르는 필터 칩(공정·제품·상태). 꺼짐은 Chip 과 같은 흰 캡슐, `on` 이면 잉크 채움 + 흰 글자 600. `sub` 로 건수·비율 같은 보조 설명(10.5px 캡션색)을 라벨 옆에 붙이고, `small` 은 4/10px 패딩으로 촘촘하게. 오른쪽·아래 6px 마진이 내장되어 있어 부모에 gap 없이 `flexWrap` 만 주면 됩니다.
- **ChipRow** — 칩들을 6px 간격·줄바꿈으로 감싸는 줄(위 10px 여백). `style={{ marginTop: 0 }}` 로 여백을 지울 수 있습니다.

앰버는 칩에 쓰지 않습니다. 선택 강조는 잉크 채움 하나로만 합니다.

props (Chip)
- `label: string` — 문구
- `onPress?: () => void` — 있으면 눌림
- `disabled?: boolean` — 눌림 차단(모양 유지)
- `style?: StyleProp<ViewStyle>` · `textStyle?: StyleProp<TextStyle>`

```jsx
<ChipRow>
  <Chip label="PR-03 불량 원인은?" onPress={() => ask('PR-03 불량 원인은?')} />
  <Chip label="전일 대비 추이" onPress={() => ask('전일 대비 추이')} />
</ChipRow>
```
