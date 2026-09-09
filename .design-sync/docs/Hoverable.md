---
category: actions
---
# Hoverable

호버·프레스 상태를 스스로 관리하는 `Pressable` 래퍼. Expo Router 의 `<Link asChild>`(Radix Slot) 는 자식의 함수형 `style` 을 빈 객체로 만들어 버리므로, 함수는 `hoverStyle` 이라는 별도 prop 으로 받아 `hovered · pressed` 를 계산한 정적 객체를 `style` 뒤에 합칩니다. 내비 행, 설비 카드 링크, 목록 행처럼 **링크로 감싸이면서 호버 배경이 필요한 곳**에 씁니다. 호버 채움은 #F4F5F6(행) 또는 #FAFAFA(카드) 이고 테두리는 rgba(0,0,0,.06)→.12 로만 진해집니다. pressed 는 opacity .85 정도. `children` 을 함수로 넘기면 `{ hovered, pressed }` 를 받아 내용을 바꿀 수 있습니다. 자체 모양은 없으므로 `style` 로 레이아웃(flexDirection·gap·padding·radius)을 직접 잡습니다.

- `style?: ViewStyle` — 기본(정적) 스타일. 레이아웃 여기서.
- `hoverStyle?: ViewStyle | (({ hovered, pressed }) => ViewStyle)` — 상태별 스타일. 객체를 주면 항상 적용.
- `children: ReactNode | (({ hovered, pressed }) => ReactNode)`
- `onHoverIn?`, `onHoverOut?`, `onPressIn?`, `onPressOut?` — 내부 상태를 갱신한 뒤 그대로 호출.
- 나머지 Pressable props(`onPress`, `href` 등)와 `ref` 는 그대로 전달.

```jsx
<Link href="/analysis/yield" asChild>
  <Hoverable
    style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 38, paddingHorizontal: 12, borderRadius: 12 }}
    hoverStyle={({ hovered }) => ({ backgroundColor: hovered ? '#F4F5F6' : 'transparent' })}
  >
    <Icon name="chart" size={15} />
    <Text>수율 분석</Text>
  </Hoverable>
</Link>
```
