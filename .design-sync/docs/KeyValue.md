---
category: data-display
---
# KeyValue

"항목 : 값" 정의 목록. 상세 모달·카드 본문에서 설비·모델·담당·시각 같은 속성을 줄마다 보여 줍니다. `rows` 는 `[키, 값]` 배열의 배열이고 값은 문자열·숫자 또는 React 노드(배지 등)입니다. `keyWidth`(기본 130) 로 키 열 폭을 맞춥니다. 키는 캡션 회색 500, 값은 본문색 500 입니다.

```jsx
<KeyValue rows={[['설비', 'PR-03'], ['상태', <StateBadge state="가동" />]]} keyWidth={96} />
```
