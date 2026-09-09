---
category: cards-layout
---
# StatCard

화면 상단의 KPI 숫자 카드. #FAFAFA 중첩 카드 안에 라벨(캡션 회색) · 값(Inter 600, 크게) · 단위 · 보조 문구를 세로로 놓습니다. `tone="up"` 은 보조 문구를 성공색, `"down"` 은 오류색으로 바꿉니다. `right` 슬롯에 배지·작은 버튼을 둘 수 있고, `field` 를 주면 데이터 접근 권한이 없는 계정에서 값이 "비공개" 배지로 바뀝니다.

보통 3~4장을 같은 폭 그리드로 나열합니다(`Grid cols={4}` 또는 CSS grid). 값은 문자열로 미리 포맷해 넘깁니다(천 단위 콤마 · 소수 자리).

```jsx
<StatCard label="공정 불량률" value="2.6" unit="%" sub="목표 대비 -0.4%p" tone="up" />
```
