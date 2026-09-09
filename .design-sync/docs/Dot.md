---
category: data-display
---
# Dot

7px 원형 상태 점. 설비 목록 줄 앞, 범례, 알림 목록(`ListRow` 의 `tone`)에서 글자 없이 상태만 표시할 때 씁니다. `Badge` 와 같은 파일의 형제로, 톤은 `''`(기본 잉크) · `amber`(주의) · `red`(정지·오류) · `gray`(비활성·점검) 네 가지입니다. 글자와 나란히 둘 때는 6~8px 간격, 여러 줄 텍스트 옆에서는 `style={{ marginTop: 5 }}` 로 첫 줄 중앙에 맞춥니다.

- `tone?: '' | 'amber' | 'red' | 'gray'` — 기본 `''`
- `size?: number` — 지름 px, 기본 7
- `style?: ViewStyle`

```jsx
<Dot tone="amber" />
<Dot tone="red" size={10} />
```
