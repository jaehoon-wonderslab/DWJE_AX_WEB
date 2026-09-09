---
category: data-display
---
# Steps

단계형 작성 마법사의 머리 줄(RP-07 폐기 보고서 작성 등). 각 단계를 흰 알약(`flex:1`, 최소 150px) 안에 20px 번호 원 + 제목(12px) + 부제(10.5px 캡션)로 가로 나열하고, `step`(1부터) 기준으로 **현재** 단계는 #FAFAFA 바탕에 잉크색 번호 원, **완료** 단계는 성공색 틴트 원에 ✓, 이후 단계는 회색 번호로 그립니다. 좁으면 줄바꿈되므로 4단계면 640px 이상을 확보하고, 카드 본문 위에 두고 아래 16px 여백이 내장돼 있습니다. 항목을 누르면 `onPick(no)` 가 호출되므로 이미 지난 단계로 돌아가는 용도로만 허용하고 앞질러 가기는 호출 측에서 막습니다.

- `items?: { title: string; sub?: string }[]` — 단계 목록(`title` 이 key)
- `step?: number` — 현재 단계, 1부터. 기본 1
- `onPick?: (no: number) => void` — 단계 클릭
- `style?: ViewStyle`

```jsx
<Steps step={2} items={[{ title: '전표 조회', sub: 'MES' }, { title: '항목 확인' }, { title: '결재 요청' }]} onPick={setStep} />
```
