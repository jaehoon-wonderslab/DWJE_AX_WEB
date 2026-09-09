---
category: screens
---
# ScreenRptShipPlan — 연간 출하계획

경로 `/report/ship-plan` · 메뉴 그룹 **보고서**. 

실제 앱의 라우트 파일(`app/(main)/report/ship-plan.jsx`)을 그대로 렌더한 **화면 본문**입니다(사이드바·상단바 없음). 컨트롤러가 목(mock) API 를 호출해 데이터를 채우고, 데모 계정(통합관리자)으로 로그인된 상태입니다. 부모 컨테이너에 높이를 주세요(내부 PageContainer 가 그 높이 안에서 스크롤). 셸까지 포함한 화면은 `<DwjeApp initialPath="/report/ship-plan" />` 를 쓰세요.

```jsx
<div style={{ height: 800 }}><ScreenRptShipPlan /></div>
```
