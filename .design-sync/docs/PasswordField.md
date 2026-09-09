---
category: inputs
---
# PasswordField

비밀번호 입력. 표시/숨김 눈 아이콘(eye / eyeOff)이 입력칸 **안 오른쪽** 36px 자리에 있고 탭 순서에서는 빠져 있습니다. `Field` 공통 props 에 `value` · `onChangeText` · `placeholder` · `inputStyle` 과, 바깥에서 상태를 맞출 때 쓰는 `visible` · `onToggleVisible` 을 더합니다(둘을 주지 않으면 스스로 토글). 비밀번호·확인 두 칸은 같은 `visible` 을 공유해 한 번에 표시/숨김이 바뀌게 합니다.

```jsx
<PasswordField label="비밀번호" value={pw} onChangeText={setPw} visible={show} onToggleVisible={() => setShow(!show)} required full />
<PasswordField label="비밀번호 확인" value={pw2} onChangeText={setPw2} visible={show} onToggleVisible={() => setShow(!show)} error={pw2 && pw !== pw2 ? '비밀번호가 일치하지 않습니다' : undefined} full />
```
