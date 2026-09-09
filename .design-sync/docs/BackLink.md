---
category: cards-layout
---
# BackLink

하위 화면(설비 상세·LOT 상세)에서 상위 목록 화면으로 돌아가는 링크. 13px 왼쪽 화살표 아이콘과 12px 링크색(info) 글자를 6px 간격으로 놓고 왼쪽 정렬, 아래 12px 여백. `PageHead` 바로 위에 둡니다. 자세한 규칙은 PageHead 문서를 참고하세요.

- `label: string` — "설비 현황으로" 처럼 목적지를 씁니다
- `onPress?: () => void`

```jsx
<BackLink label="설비 현황으로" onPress={() => router.back()} />
<PageHead title="PR-03 상세" desc="금형 교체 이력" />
```
