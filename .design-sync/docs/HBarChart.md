---
category: charts
---
# HBarChart

가로 막대 순위(d3). 설비별 불량 건수·불량 유형별 수량처럼 **라벨이 길고 항목이 3~8개** 인 순위표에 씁니다. 행마다 왼쪽 라벨(12px 캡션색) · 회색 트랙(잉크 8%) · 채움 막대(16px 높이, 라운드 4) · 오른쪽 값(12px 600) 을 놓고 행 간격은 9px 로 고정되어 높이는 항목 수에서 계산됩니다(`height` prop 없음). 채움색은 `cls` 로 정합니다 — 기본 잉크, `'warn'` 앰버, `'bad'` 빨강. `target` 을 주면 각 행에 앰버 세로 눈금과 하단 "▏목표 …" 캡션이 붙습니다. 값이 null 인 항목은 걸러지고 남는 항목이 없으면 `ChartEmpty`.

폭은 부모를 측정합니다. 라벨·값 열 폭은 `labelWidth`·`valueWidth` 로 조절(라벨이 잘리면 늘리세요).

- `data: { l: string; v: number|null; cls?: 'bad' | 'warn' | string }[]`
- `unit?: string` ('') — 값 접미사(`'건'`, `' EA'`, `'%'`).
- `target?: number` — 목표 눈금 + 캡션.
- `format?: (v: number) => string` (`comma` = ko-KR 천 단위 콤마) — 값·목표 포맷터.
- `labelWidth?: number` (96) · `valueWidth?: number` (66) — 라벨·값 열 폭(px).

```jsx
<div style={{ width: 480 }}>
  <HBarChart
    data={[{ l: 'PR-03', v: 3.1, cls: 'bad' }, { l: 'PL-02', v: 2.2, cls: 'warn' }, { l: 'PL-01', v: 1.8 }]}
    unit="%"
    target={2.0}
    format={(v) => Number(v).toFixed(1)}
  />
</div>
```
