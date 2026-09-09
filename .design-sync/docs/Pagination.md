---
category: data-display
---
# Pagination

목록 하단의 쪽 이동 줄. 서버가 준 `meta`(`page`·`size`·`total`·`totalPages`)를 그대로 받아 그리고, 목록이 잘려 있음을 사용자가 알도록 **전체 건수를 항상** 왼쪽에 보여 줍니다("전체 1,331건 중 1–50"). 오른쪽에는 첫/이전 화살표 · 쪽 번호(현재 ±2 와 양끝, 사이는 …) · 다음/마지막 화살표 · 세로 헤어라인 · "페이지당 25 50 100 200" 선택이 30px 원형 단추로 늘어섭니다. 현재 쪽은 잉크색 채움 + 흰 글자, 나머지는 투명 바탕 12px 캡션이며 끝에 닿은 화살표는 30% 로 흐려집니다. 한 쪽에 다 들어가거나 `size=0`(전체)이면 화살표 없이 건수와 페이지당 선택만 그리고, `total` 이 0 이면 아무것도 그리지 않습니다. 위 헤어라인이 내장돼 있으니 표 바로 아래에 붙이고 폭은 640px 이상을 권장합니다. 보통 `usePaging()` 의 `bind` 를 펼쳐 넘깁니다.

- `meta: { page: number; size: number; total: number; totalPages: number }`
- `page?: number` — 현재 쪽(없으면 meta.page)
- `size?: number` — 한 쪽 건수(없으면 meta.size, 기본 50). `0` 은 전체
- `onPage?: (page: number) => void`
- `onSize?: (size: number) => void` — 없으면 페이지당 선택을 그리지 않음
- `showSize?: boolean` — 기본 true
- `sizes?: number[]` — 기본 `PAGE_SIZES` = [25, 50, 100, 200]. 0 을 넣으면 '전체'
- `style?: ViewStyle`

```jsx
const paging = usePaging({ resetKey: `${from}|${to}` });
<Pagination meta={data?.meta} {...paging.bind} />
```
