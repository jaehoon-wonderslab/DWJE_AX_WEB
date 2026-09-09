---
category: data-display
---
# Badge · StateBadge · Dot

작은 캡슐형 상태 표시. `Badge` 는 `tone` 으로 색을 고르고(`''` 기본 회색 · `green` · `blue` · `amber` · `red`), `StateBadge` 는 한국어 상태 문자열(`가동`·`비가동`·`점검 중`·`경고`·`불량`·`완료`·`진행 중` 등)에 맞는 톤을 자동으로 고릅니다. `Dot` 은 7px 상태 점(`tone`: `''`·`amber`·`red`·`gray`, `size`).

앰버는 주의·데이터 마커에만 쓰고, 정상은 green, 오류·정지는 red 입니다. 배지 글자는 10.5~11px · weight 600 이며 배지 안에 아이콘은 넣지 않습니다.

```jsx
<Badge tone="green">가동</Badge>
<StateBadge state="비가동" />
<Dot tone="amber" />
```
