---
category: tables
---
# XlsLegend

`XlsTable` 아래 붙는 색 범례. `items` 의 `tone`(ok → success · warn → warning · bad → destructive) 마다 8px 둥근 사각 점과 11px 캡션 회색 라벨을 가로로 12px 간격으로 늘어놓습니다(위 여백 10px, 줄바꿈 허용). 표 셀 톤의 뜻(예: "정상 (목표 달성)")을 그대로 적어 주세요. 자세한 표 규칙은 `XlsTable` 문서를 보세요.

- `items: Array<{ tone: 'ok'|'warn'|'bad'; label: string }>`

```jsx
<XlsLegend items={[{ tone: 'ok', label: '정상 (목표 달성)' }, { tone: 'warn', label: '주의' }, { tone: 'bad', label: '위험' }]} />
```
