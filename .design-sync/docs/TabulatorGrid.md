---
category: tables
---
# TabulatorGrid

테마가 적용된 범용 Tabulator 표. Tabulator 열 정의(`title/field/width/widthGrow/hozAlign/formatter …`)를 그대로 받아 그리며, 정렬(머리글 클릭, shift 로 조건 누적)·열 폭 조절·머리글 검색칸·행 묶음(`groupBy`)·행 선택(`selectable`)이 필요한 실적 집계·제품 선택·설비 비교 표에 씁니다. 단순 나열이면 `Table` 이나 `XlsTable` 이 더 가볍습니다. 자료가 바뀌면 표를 새로 만들지 않고 `replaceData` 로 갈아 끼워 사용자가 잡은 정렬·선택이 유지됩니다.

디자인 규칙: 머리글 #FAFAFA · 캡션 회색 600 · 11px, 본문 12.5px 500, 헤어라인 #DFE1E7, 묶음 머리글은 본 표 열 폭에 맞춰 정렬됩니다. formatter 가 HTML 문자열을 돌려주는 자리라 RN 컴포넌트를 못 쓰므로 같은 모양의 클래스를 제공합니다 — 숫자 `.num`(tabular-nums), 고정폭 `.mono`, 배지 `.tag .tag-green|amber|red|blue`, 작은 버튼 `.tbtn .tbtn-primary`(동작은 열 `cellClick`), 보조 `.muted` `.strong` `.li`. 선택 행은 info 8% 틴트, 체크박스는 15px accent-color info.

props
- `columns: ColumnDefinition[]` — Tabulator 열 정의. `headerFilter: false` 를 준 열은 검색칸에서 제외.
- `rows: object[]` — 행 데이터.
- `height?: number` — 고정 높이(표 안 세로 스크롤). 없으면 내용만큼 자랍니다.
- `groupBy?: string`, `groupHeader?: (value, count, data, group) => string`, `groupStartOpen?: boolean = true` — 행 묶음. 기본 머리글은 `값 · n건`.
- `emptyText?: string = '표시할 내용이 없습니다.'`
- `selectable?: boolean = false`, `rowKey?: string`, `selected?: any[]`, `onSelectedChange?: (keys: any[]) => void`, `maxSelectable?: number = 0` — 왼쪽 42px 선택 칸. 머리글 칸은 보이는 행 전체 선택.
- `initialSort?: Array<{ column: string; dir: 'asc'|'desc' }>` — 첫 정렬.
- `onRowClick?: (rowData, event) => void` — 행 클릭(셀 안 button/a/input 제외).
- `headerFilter?: boolean = true` — 데이터 열마다 머리글 검색 입력칸.
- `headerFilters?: Record<string, string>` — 외부에서 넣는 필터 값.
- `instanceRef?: React.MutableRefObject<Tabulator | null>` — 인스턴스 접근.
- `tableOptions?: object` — Tabulator 옵션 덧붙이기(예: `{ renderVertical: 'basic' }`), 생성 시 한 번만 읽음.
- `style?` — 바깥 View 스타일.

```jsx
<TabulatorGrid
  columns={[
    { title: '설비', field: 'equip', width: 84, formatter: (c) => `<span class="mono">${c.getValue()}</span>` },
    { title: '투입', field: 'inputQty', width: 96, hozAlign: 'right', headerHozAlign: 'right', formatter: (c) => `<span class="num">${c.getValue().toLocaleString()}</span>` },
    { title: '상태', field: 'status', width: 92, hozAlign: 'center', headerFilter: false, formatter: (c) => `<span class="tag tag-green">${c.getValue()}</span>` },
  ]}
  rows={rows}
  groupBy="process"
  selectable rowKey="equip" selected={picked} onSelectedChange={setPicked}
  initialSort={[{ column: 'defectRate', dir: 'desc' }]}
/>
```
