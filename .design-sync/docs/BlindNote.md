---
category: data-display
---
# BlindNote

비공개 항목 안내 한 줄. `BlindValue` 와 같은 파일의 형제로, 표·카드 하단에 `SourceNote` 와 같은 10.5px 캡션 회색 글씨로 "○○ · ○○ 항목은 소속 부서 데이터 접근 권한이 없어 비공개로 표시됩니다." 를 그립니다. `fields` 중 현재 계정이 볼 수 없는 항목만 골라 항목명(`DATA_FIELDS` 의 name)으로 바꿔 나열하고, 전부 허용이면 `null` 을 반환하므로 조건 없이 항상 붙여 두어도 됩니다.

- `fields?: string[]` — 표에 들어간 데이터 항목 key 목록(`qty`·`yield`·`price`·`customer`·`plan`·`mold`·`worker`)

```jsx
<BlindNote fields={['price', 'customer']} />
```
