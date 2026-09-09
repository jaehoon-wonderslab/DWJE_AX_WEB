---
category: inputs
---
# Field · TextField · TextAreaField · SelectField · DateField · PasswordField

조회 조건·등록 폼의 입력 묶음(CM-05). `Field` 는 라벨 + 임의의 컨트롤을 세로로(간격 5px) 묶는 껍데기이고, 나머지는 `Field` 안에 각자의 컨트롤을 넣은 형제입니다. 라벨은 11px · 500 · 캡션 회색(#787878)이며 `required` 면 뒤에 앰버 `*` 가 붙습니다. 컨트롤은 높이 36px · #DFE1E7(hairlineStrong) 1px 테두리 · radiusSm · 흰 배경 · 12.5px 500 글자, 포커스 시 파란 ring, `error` 가 있으면 테두리·배경이 옅은 빨강으로 바뀌고 아래에 11px 빨간 문구가 붙습니다. `hint` 는 같은 자리에 얇은 회색(300 · 11.5px) 안내로 들어가며 `error` 가 있으면 숨겨집니다. 기본 `minWidth` 130 이라 조회 조건 줄(`Filters`)에서는 그대로, 폼에서는 `full` 로 폭을 채웁니다. 비활성(disabled) 전용 스타일은 없습니다 — 읽기 전용은 `editable={false}` 와 `inputStyle` 로 표현합니다.

공통 props (모든 형제가 그대로 받습니다)
- `label?: string` — 라벨. 없으면 라벨 줄을 그리지 않음
- `required?: boolean` — 라벨 뒤 앰버 `*`
- `full?: boolean` — 폭 100% (TextAreaField 만 기본 true)
- `error?: string` — 빨간 오류 문구 + 입력란 오류 틴트. API 응답의 `error.field` 를 연결하는 자리
- `hint?: string` — 얇은 회색 안내(error 가 있으면 숨김)
- `style?: ViewStyle` — 바깥 Field 스타일
- `children` (Field 만) — 라벨 아래 들어갈 컨트롤

형제별 추가 props
- `TextField`: `value`, `onChangeText(text)`, `placeholder`, `inputStyle`; 나머지 props 는 TextInput 으로 전달(`editable`, `keyboardType`, `maxLength` …)
- `TextAreaField`: `value`, `onChangeText`, `placeholder`, `rows = 3`(높이 22×rows+18)
- `SelectField`: `options` (문자열 배열 또는 `{value,label}` 배열), `value`, `onChange(value, option)`, `placeholder = '선택'`, `inputStyle`. 누르면 바로 아래 팝오버 목록이 열립니다
- `DateField`: `value`(YYYY-MM-DD 문자열), `onChange(dateStr)`, `min`/`max`(달력 선택 범위 · 기본은 스토어의 데이터 보유 기간). 직접 타이핑 + 오른쪽 달력 단추
- `PasswordField`: `value`, `onChangeText`, `placeholder`, `visible`/`onToggleVisible`(바깥 제어, 없으면 자체 토글), `inputStyle`. 눈 아이콘은 입력칸 안 오른쪽, 탭 순서 제외

```jsx
<Field label="설비 상태" required hint="MES 최신 상태">
  <Badge tone="green">가동</Badge>
</Field>
```
