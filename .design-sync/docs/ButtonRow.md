---
category: actions
---
# ButtonRow

버튼을 가로로 늘어놓는 묶음 — `flexDirection: row · gap 8 · flexWrap · alignItems center`. 조회 조건 아래 동작 줄, 카드 머리말 오른쪽 동작, 폼 하단에 씁니다. 좁으면 자동 줄바꿈되고 `style={{ justifyContent: 'flex-end' }}` 로 오른쪽 정렬합니다. 한 줄에 primary 는 하나만 두고 Button 과 IconButton 을 섞어도 됩니다. 자세한 체계는 Button 문서 참고.

```jsx
<ButtonRow style={{ justifyContent: 'flex-end' }}>
  <Button label="취소" variant="ghost" />
  <Button label="점검 요청" variant="primary" icon="send" />
</ButtonRow>
```
