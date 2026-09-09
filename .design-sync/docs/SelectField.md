---
category: inputs
---
# SelectField

HTML `<select>` 에 대응하는 선택 목록. 닫힌 상태는 다른 입력과 같은 36px 상자에 현재 label 과 오른쪽 chevron 을 보이고, 누르면 바로 아래 팝오버(흰 배경 · 헤어라인 · 그림자, 최대 280px 스크롤)가 열려 선택된 항목은 옅은 파란 배경 + check 아이콘으로 표시됩니다. `Field` 공통 props 에 `options`(문자열 배열 또는 `{value,label}` 배열) · `value` · `onChange(value, option)` · `placeholder = '선택'` · `inputStyle` 을 더합니다. 값이 없으면 placeholder 가 캡션 회색으로 보입니다.

```jsx
<SelectField label="공정" options={['PRESS', 'Plating', 'Coating', 'AOI']} value={proc} onChange={setProc} required />
<SelectField label="설비" options={[{ value: 'PR-03', label: 'PR-03 · 200T 프레스' }]} value="PR-03" full />
```
