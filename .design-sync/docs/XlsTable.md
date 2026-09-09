---
category: tables
---
# XlsTable · XlsLegend

엑셀형 조밀 보고서 표. 조간회의 자료·출하계획·모델 버전 비교처럼 열이 많고 셀 값이 짧은 표에 씁니다. 순수 RN View 로 그려 가볍고, 셀마다 `tone`(ok/warn/bad) 배경, 그룹 행·합계 행, 가로 병합(`span`), `bold`/`faint`, React 노드(`node`) 를 지원합니다. 정렬·열 폭 조절이 필요하면 `Table`/`TabulatorGrid` 를 쓰세요. `XlsLegend` 는 표 아래 색 범례(8px 사각 점 + 11px 캡션)로 셀 색의 뜻을 설명합니다.

디자인 규칙: 셀 11.5px 500 · 0.5px 헤어라인 격자 · 머리글 #FAFAFA 캡션 회색 600 · 기본 가운데 정렬(글자 열은 `align: 'left'`, 숫자는 `num` 으로 오른쪽 tabular-nums). ok = success 틴트, warn = warning 20%, bad = destructive 12%(글자는 각 색 600). 그룹 행은 #FAFAFA 600 왼쪽 정렬, 합계 행은 info 6% 틴트 + 잉크 600. 열 폭은 `width` 의 합이 표 최소 폭이 되고 넘치면 가로 스크롤.

XlsTable props
- `columns: Array<{ key: string; title: string; width?: number; align?: 'left'|'center'|'right'; num?: boolean }>`
- `rows: Array<{ key?: string; tone?: 'group'|'total'; cells: Array<{ v?: string|number; node?: ReactNode; tone?: 'ok'|'warn'|'bad'|'group'|'head'; align?: 'left'|'right'; num?: boolean; span?: number; bold?: boolean; faint?: boolean; wrap?: boolean }> }>` — `span` 은 오른쪽 칸을 흡수, `node` 는 v 대신 View 를 넣을 때(마스킹 배지·입력칸).
- `maxHeight?: number` — 주면 본문만 세로 스크롤.
- `footer?: ReactNode` — 본문 아래 붙는 노드.
- `nativeID?: string`, `style?`

XlsLegend props
- `items: Array<{ tone: 'ok'|'warn'|'bad'; label: string }>`

```jsx
<XlsTable
  columns={[{ key: 'item', title: '구분', width: 140, align: 'left' }, { key: 'rate', title: '달성률', width: 84 }, { key: 'note', title: '비고', width: 190, align: 'left' }]}
  rows={[
    { tone: 'group', cells: [{ v: 'PRESS (제1공장)', span: 3 }] },
    { cells: [{ v: 'PR-03', align: 'left' }, { v: '98.3%', tone: 'warn' }, { v: '금형 교체', align: 'left' }] },
    { tone: 'total', cells: [{ v: '합계', align: 'left' }, { v: '85.6%' }, { v: '계획 미달', align: 'left' }] },
  ]}
/>
<XlsLegend items={[{ tone: 'ok', label: '정상' }, { tone: 'warn', label: '주의' }, { tone: 'bad', label: '위험' }]} />
```
