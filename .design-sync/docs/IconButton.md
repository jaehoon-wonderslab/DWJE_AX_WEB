---
category: actions
---
# IconButton

34×34 정사각 아이콘 버튼 — 흰 배경 · rgba(0,0,0,.06) 테두리 · 12px 반지름. 헤더(알림·설정), 카드 머리말(새로고침·내려받기·인쇄), 보기 토글에 씁니다. `active` 이면 #F4F5F6 채움에 잉크(#0B1440) 아이콘, 아니면 #3C3C3C 아이콘. `size`/`iconSize` 로 28·14 / 34·16(기본) / 40·18 처럼 함께 조절하고, `color` 는 파괴적 동작(삭제) 같은 예외에만 씁니다. 접근성을 위해 `title` 을 항상 넘깁니다. 자세한 체계는 Button 문서 참고.

```jsx
<IconButton name="refresh" title="새로고침" onPress={reload} />
<IconButton name="grid" title="카드 보기" active />
```
