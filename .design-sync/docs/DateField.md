---
category: inputs
---
# DateField

날짜 입력. 왼쪽은 `YYYY-MM-DD` 를 직접 타이핑하는 칸(Inter 숫자 글꼴), 오른쪽은 헤어라인으로 나뉜 달력 단추이며 누르면 바로 아래 달력 팝오버가 열립니다. `Field` 공통 props 에 `value`(문자열) · `onChange(dateStr)` · `min` · `max` 를 더합니다. `min`/`max` 를 주지 않으면 앱 스토어의 데이터 보유 기간(`dataRange.fromDate ~ toDate`)이 달력 선택 범위가 됩니다. 기간 조회는 시작일·종료일 두 개를 나란히 두고 서로를 `max`/`min` 으로 묶습니다.

```jsx
<DateField label="시작일" value={from} onChange={setFrom} max={to} />
<DateField label="종료일" value={to} onChange={setTo} min={from} required />
```
