---
category: brand
---
# PageTransition

화면(경로) 전환 애니메이션 래퍼. `routeKey` 가 바뀔 때마다 자식이 다시 마운트되어 **아래에서 10px 떠오르며 페이드인**(280ms, `cubic-bezier(0.2, 0.7, 0.2, 1)`)합니다. 라우터의 `<Slot />` 을 한 번 감싸 두면 모든 페이지에 같은 전환이 적용되고, 상세 패널·탭 본문처럼 내용이 통째로 바뀌는 영역에도 쓸 수 있습니다. 웹은 CSS 키프레임(컴포지터 실행 — JS 가 바빠도 끊기지 않음), 네이티브는 `Animated.timing` 입니다. 애니메이션이 끝나면 `fill-mode: both` 로 최종 상태(opacity 1 · translateY 0)에 머무릅니다.

디자인 규칙 — 전환은 한 방향(상승+페이드) 하나만, 280ms 를 넘기지 않으며 스케일·회전·바운스는 쓰지 않습니다. 래퍼 자체는 색·여백이 없고 `flex: 1` 로 부모를 채우므로 부모가 flex 컨테이너여야 높이를 이어받습니다. 브랜드 색(CI 블루 #0033a0 · 스카이 #00aeef)은 로고 전용이며 전환 효과에 색을 더하지 않습니다 — 화면은 잉크 #0B1440 글자와 흰 패널 그대로 나타납니다.

## props
- `routeKey?: string | number` — 바뀌면 다시 재생. 보통 `usePathname()` 값.
- `children?: React.ReactNode` — 전환할 본문.
- `distance?: number` — 시작 시 아래로 밀어 둔 거리(px). 기본 10.
- `duration?: number` — 재생 시간(ms). 기본 280.
- `style?` — 래퍼 View 스타일 덧씌우기.

```jsx
<PageTransition routeKey={pathname}>
  <Slot />
</PageTransition>
```
