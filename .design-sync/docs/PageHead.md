---
category: cards-layout
---
# PageHead · BackLink

화면 머리말(CM-03). 제목 21px · 600 · -0.02em · 잉크(#0B1440), 설명 12.5px 캡션 회색, 아래 20px 여백. `eyebrow` 를 주면 제목 위에 11px 600 자간 넓은 소제목(대메뉴·화면 그룹)을 붙입니다. `actions` 는 오른쪽 끝에 하단 정렬로 놓이는 화면 단위 동작(기간 선택 · 인쇄 · 내보내기)이며 보통 `ButtonRow` 에 sm 버튼을 넣습니다. 전체 영역을 쓰는 화면(자연어 질의)에서는 쓰지 않습니다. 하위 화면에서는 `BackLink` 를 PageHead 바로 위에 둡니다.

**PageHead**
- `title: string` — 제목
- `desc?: string` — 설명(최대 폭 720)
- `eyebrow?: string` — 제목 위 소제목
- `actions?: ReactNode` — 우측 동작
- `style?: ViewStyle`

**BackLink** — 상위 화면으로 돌아가는 링크. 13px 왼쪽 화살표 + 12px 링크색 글자, 왼쪽 정렬, 아래 12px 여백, hover 시 70% 불투명.
- `label: string`
- `onPress?: () => void`

```jsx
<BackLink label="설비 현황으로" onPress={goBack} />
<PageHead eyebrow="생산 관리 · PRESS" title="PR-03 상세" desc="금형 교체 이력 · 치수 편차 추이"
  actions={<ButtonRow><Button label="전일" variant="outline" size="sm" /><Button label="인쇄 · PDF" size="sm" /></ButtonRow>} />
```
