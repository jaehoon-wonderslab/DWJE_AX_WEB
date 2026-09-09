---
category: inputs
---
# Filters

조회 조건 바. `TextField`·`SelectField`·`DateField`·`Button` 같은 필드를 가로 10px 간격으로 늘어놓고 **아래쪽 정렬**(라벨이 있는 필드와 라벨 없는 버튼의 밑선을 맞춤)하며, 폭이 모자라면 다음 줄로 접힙니다. 아래 16px 여백이 있어 바로 표·카드가 이어집니다. `SelectField`/`DateField` 의 팝오버가 뒤 콘텐츠 위로 뜨도록 `zIndex 100` 을 갖습니다.

관례: 공정·설비 → 기간 → 검색어 순으로 두고, 마지막에 `variant="primary"` 의 "조회" 버튼, 그 옆에 outline "초기화". 필드 최소 폭은 130px(입력 기본값)이고 LOT 번호처럼 긴 값은 `style={{ minWidth: 180 }}` 로 넓힙니다. 체크 옵션(`CheckRow`)을 끼울 때는 아래 여백을 10px 정도 줘서 입력란 중앙에 맞춥니다.

props
- `children: ReactNode` — 필드·버튼들
- `style?: StyleProp<ViewStyle>` — 바깥 줄 스타일(여백 조정 등)

```jsx
<Filters>
  <SelectField label="공정" value={proc} options={['PRESS', 'Plating', 'Coating', 'AOI']} onChange={setProc} />
  <DateField label="시작일" value={from} onChange={setFrom} />
  <DateField label="종료일" value={to} onChange={setTo} />
  <Button label="조회" variant="primary" onPress={search} />
</Filters>
```
