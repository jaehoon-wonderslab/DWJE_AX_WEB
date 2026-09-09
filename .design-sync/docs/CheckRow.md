---
category: inputs
---
# CheckRow · RadioRow · Filters

조회 조건·등록 폼에서 쓰는 선택 요소와 그 줄 묶음(`Field.jsx` 형제). `CheckRow` 는 체크박스 한 줄, `RadioRow` 는 단일 선택 점 묶음, `Filters` 는 필드들을 가로로 늘어놓는 조회 조건 바입니다.

**CheckRow** — 16px 둥근 사각(반지름 5) 체크박스 + 12px/500 라벨을 한 줄에 놓고, 줄 전체가 눌립니다. 꺼짐은 #DFE1E7 헤어라인 테두리만, 켜짐은 잉크(primary) 채움에 흰 체크(굵기 2.6). 상태는 부모가 들고 `onToggle` 로 뒤집습니다. 세로 목록은 8~10px 간격, 필터 줄 끝의 가로 옵션은 16px 간격이 관례입니다.

props
- `label: string` — 라벨 문구
- `checked?: boolean` — 켜짐 여부(제어 컴포넌트)
- `onToggle?: () => void` — 줄을 눌렀을 때
- `style?: StyleProp<ViewStyle>` — 바깥 줄 스타일

```jsx
<CheckRow label="불량 로트만 보기" checked={onlyDefect} onToggle={() => setOnlyDefect(v => !v)} />
```
