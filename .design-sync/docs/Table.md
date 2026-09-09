---
category: tables
---
# Table

화면 공용 일반 표(CM-05). 설비·LOT·수량처럼 쪽 단위(≤200행) 목록을 보여 줄 때 쓰며, 그리는 엔진은 Tabulator 지만 화면 코드는 `columns[].key/title/width/flex/align/render` 와 `rows` 만 넘깁니다. 머리글 클릭 정렬·열 폭 조절이 기본으로 되고, `render` 가 있는 열은 React 노드(Badge·StateBadge·BlindValue 등)를 셀 안에 포털로 그립니다. `render` 가 없는 열은 값을 글자로 적고 비어 있으면 `—` 를 놓습니다(숫자 콤마·소수 표기는 호출 쪽에서 문자열로 만들어 넘깁니다).

디자인 규칙: 머리글은 #FAFAFA 배경 · 캡션 회색 600 · 11px, 본문은 잉크색 500 · 12.5px, 행 구분은 #DFE1E7 헤어라인 하나. 숫자 열은 `align: 'right'` + `num`(tabular-nums), ID·LOT 는 `mono`. 표 바깥은 Card 가 감싸고 표 자체는 테두리만 둡니다. 폭은 부모가 정하며 모든 열이 고정 폭이면 마지막 열이 남는 폭을 채웁니다.

props
- `columns: Array<{ key, title, width?, flex?, minWidth?, align?: 'left'|'center'|'right', render?: (row, idx) => ReactNode, wrap?, mono?, num?, sortable? }>` — 열 정의. `width` 없는 열은 `flex`(기본 1) 비율로 남는 폭을 나눕니다.
- `rows: object[]` — 행 데이터(원본 객체 그대로 `render` 에 전달).
- `onRowPress?: (row, idx) => void` — 행 클릭. 셀 안 버튼·링크 클릭은 제외됩니다.
- `emptyText?: string` — 기본 `'조회된 데이터가 없습니다.'`
- `keyExtractor?: (row, idx) => string | number` — 행 키.
- `minWidth?: number` — 주면 가로 스크롤로 감쌉니다(열이 많은 표).
- `filterable?: boolean` — 기본 false. 머리글 아래 검색 입력칸(render 열 제외).
- `height?: number` — 표 높이를 고정해 표 안에서 세로 스크롤.
- `style?` — 바깥 View 스타일.

```jsx
<Table
  columns={[
    { key: 'id', title: '설비', width: 84, mono: true },
    { key: 'lot', title: 'LOT', flex: 1, mono: true },
    { key: 'qty', title: '생산량', width: 96, align: 'right', num: true },
    { key: 'state', title: '상태', width: 96, align: 'center', render: (r) => <StateBadge state={r.state} /> },
  ]}
  rows={rows}
  keyExtractor={(r) => r.id}
  onRowPress={(r) => openEquipment(r.id)}
/>
```
