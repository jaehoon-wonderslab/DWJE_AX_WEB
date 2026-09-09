---
category: tables
---
# PermMatrix

권한 매트릭스 표(SY-02 메뉴 권한 · SY-03 데이터 권한 공용). 행(화면 또는 데이터 항목) × 열(부서) 의 체크박스 격자입니다. 행에 `group` 이 있으면 왼쪽에 "메뉴 그룹" 열이 붙고, `onToggleGroup` 을 주면 그룹마다 "전체 허용 / 전체 해제" 일괄 줄이 머리글 아래 생깁니다. `sub` 행은 `↳` 와 회색 글자로 메뉴에 노출되지 않는 하위 화면임을 표시하고, `descOf` 를 주면 260px "포함 데이터" 설명 열이 추가됩니다. `locked` 열(통합관리자 등)은 체크가 회색으로 잠기고 누를 수 없습니다. 마지막 합계 행에 부서별 허용 개수를 적습니다.

디자인 규칙: `XlsTable` 과 같은 11.5px 격자(머리글 #FAFAFA, 0.5px 헤어라인, 합계 행 info 틴트). 체크는 16px · radius 5 · 켜지면 primary 채움 + 흰 체크, 꺼지면 헤어라인 테두리, 잠김은 55% 불투명. 부서 열 폭은 104px 고정, 부서 이름 아래 10px 약어(`sublabel`). 체크 상태는 부모가 들고 `isChecked` 로 알려 줍니다(비제어 상태 없음).

props
- `rows: Array<{ id: string|number; name: string; group?: string; sub?: boolean }>`
- `columns: Array<{ key: string|number; label: string; sublabel?: string; locked?: boolean }>`
- `isChecked: (rowId, colKey) => boolean`
- `onToggle: (rowId, colKey) => void`
- `onToggleGroup?: (group, colKey, allowed: boolean) => void` — 주면 그룹 일괄 줄 표시.
- `rowLabelWidth?: number = 200`, `groupLabelWidth?: number = 120`
- `footerLabel?: string = '허용 항목 수'`, `footerValue: (colKey) => number`
- `descOf?: (row) => string` — 설명 열(데이터 권한 화면).
- `maxHeight?: number` — 본문 세로 스크롤.

```jsx
<PermMatrix
  rows={screens}
  columns={depts.map((d) => ({ key: d.id, label: d.name, sublabel: d.abbr, locked: d.isAdmin }))}
  isChecked={(screenId, deptId) => (matrix[deptId] || []).includes(screenId)}
  onToggle={toggle}
  onToggleGroup={toggleGroup}
  footerLabel="접근 허용 화면 수"
  footerValue={(deptId) => (matrix[deptId] || []).length}
/>
```
