---
category: inputs
---
# TextAreaField

여러 줄 텍스트 입력(조치 내용·이상 원인·비고). `Field` 공통 props 에 `value` · `onChangeText` · `placeholder` · `rows = 3` 을 더합니다. 높이는 `22 × rows + 18` px, 글자는 위 정렬, `full` 기본값이 true 라 부모 폭을 채웁니다. 일보에 인쇄되는 문구처럼 글자 수 제한이 있으면 `hint` 로 알려 줍니다.

```jsx
<TextAreaField label="조치 내용" rows={5} value={note} onChangeText={setNote} hint="500자 이내" required />
```
