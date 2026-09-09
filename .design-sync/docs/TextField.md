---
category: inputs
---
# TextField

한 줄 텍스트 입력. `Field` 의 공통 props(`label`·`required`·`full`·`error`·`hint`·`style`, 자세한 규칙은 Field 문서)에 `value` · `onChangeText(text)` · `placeholder` · `inputStyle` 을 더하고, 그 밖의 props(`editable`·`maxLength`·`keyboardType` 등)는 TextInput 으로 그대로 넘깁니다. 조회 조건 줄에서는 `full` 없이(minWidth 130), 폼에서는 `full` 로 씁니다. 읽기 전용은 `editable={false}` + `inputStyle={{ backgroundColor: '#FAFAFA', color: '#787878' }}`.

```jsx
<TextField label="설비 코드" value={code} onChangeText={setCode} placeholder="PR-03" required full error={errors.code} />
```
