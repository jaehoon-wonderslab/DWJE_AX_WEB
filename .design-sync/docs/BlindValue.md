---
category: data-display
---
# BlindValue · BlindNote

데이터 접근 권한(CM-04) 마스킹 표시. 단가·고객사·작업자처럼 부서별로 열람이 제한되는 항목은 값 대신 점선 캡슐의 `●●●● 비공개` 배지를 그리고, 원칙상 **값 자체를 DOM 에 남기지 않습니다**. 권한 판정은 `useAuthStore.canData(field)`(로그인 계정의 `dataPerms` 배열 또는 `'*'`)로 하며, `field` 를 주지 않으면 마스킹 대상이 아니므로 값을 그대로 `Text` 로 그립니다. 표 셀·KeyValue 값·StatCard 값 자리에 그대로 끼워 쓰고, 비공개 셀이 있는 표 아래에는 `BlindNote` 로 어떤 항목이 왜 가려졌는지 한 줄 안내를 붙입니다.

배지는 10.5px · 600 · 캡션 회색, #FAFAFA 바탕에 점선 헤어라인이며 값처럼 굵거나 진하게 강조하지 않습니다. 웹에서는 `data-blind="1"` 속성이 붙어 인쇄·CSV 에서 비공개 건수를 셀 수 있습니다.

**BlindValue**
- `field?: 'qty' | 'yield' | 'price' | 'customer' | 'plan' | 'mold' | 'worker'` — 데이터 항목 key. 없으면 항상 값 표시
- `value?: React.ReactNode` — 권한이 있을 때 보여 줄 값
- `textStyle?: TextStyle` — 값 텍스트 스타일(권한 있을 때만 적용)
- `style?: ViewStyle` — 비공개 배지 스타일 덧씌움
- `numberOfLines?: number` — 값 텍스트 줄 수 제한

**BlindNote**
- `fields?: string[]` — 표에 포함된 데이터 항목 key 목록. 이 중 권한 없는 항목만 골라 "단가·금액 · 고객사·거래처 항목은 소속 부서 데이터 접근 권한이 없어 비공개로 표시됩니다." 를 그리고, 모두 허용이면 아무것도 그리지 않습니다

```jsx
<KeyValue rows={[['품목 단가', <BlindValue field="price" value="12,400원" />]]} />
<BlindNote fields={['price', 'customer']} />
```
