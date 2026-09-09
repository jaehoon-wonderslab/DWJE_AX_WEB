---
category: screens
---
# DwjeApp — 앱 전체 셸

덕우전자 AX 웹 앱을 그대로 띄우는 컴포넌트입니다. 좌측 사이드바(메뉴), 상단바(브레드크럼 · AI 질의 버튼 · 알림 종 · 계정), 본문 패널, 필요 시 AI 질의 레일까지 실제 레이아웃(app/(main)/_layout.jsx)입니다. 메뉴를 누르면 화면이 바뀌고, 각 화면은 실제 컨트롤러·뷰가 목(mock) 데이터로 동작합니다.

- `initialPath`: 처음 보여 줄 경로. 예 `/ai/chat`(기본) · `/dashboard/ai` · `/production/result` · `/menu/report` · `/system/account`.
- `height`(기본 `100vh`) · `width`(기본 `100%`): 셸이 채울 크기. 셸은 스크롤하지 않고 패널마다 스크롤합니다.
- 로그인: 데모 계정 **20140901 시스템(통합관리자, 전체 메뉴·데이터 권한)** 으로 자동 로그인됩니다. 로그인 화면은 `LoginScreen` 을 따로 쓰세요.
- 페이지에 `DwjeApp` 은 **하나만** 두세요(라우터 상태를 공유합니다).

```jsx
<DwjeApp initialPath="/dashboard/ai" height="100vh" />
```

경로 목록: `/ai/chat`(자연어 질의) · `/dashboard/ai`(AI 통합 대시보드) · `/dashboard/process`(공정 및 제품 대시보드) · `/production/monitor`(생산 모니터링) · `/production/result`(실적 집계·조회) · `/quality/defect`(불량 현황 조회) · `/quality/aoi`(AOI 판정 분석·예측) · `/production/daily-report`(일일 생산현황 보고) · `/report/press-morning`(아침회의 자료 (PRESS)) · `/report/plating-morning`(아침회의 자료 (Plating·Coating)) · `/report/ship-plan`(연간 출하계획) · `/report/yield-by-model`(제품별 수율) · `/report/lrr-by-customer`(고객사별 LRR) · `/report/scrap`(폐기 보고서) · `/alert/list`(알림 목록·상세) · `/system/account`(계정 관리) · `/system/menu-perm`(메뉴 접근 권한) · `/system/data-perm`(데이터 접근 권한) · `/system/alert-condition`(이상 알림 발송 조건 관리) · `/system/recipient`(알림 수신자 관리) · `/system/glossary`(용어 사전 관리) · `/system/product-rank`(제품군 순위 관리) · `/system/chat-history`(자연어 질의 이력) · `/system/audit-log`(보안 감사 로그) · `/system/model-config`(AI 모델 설정) · `/system/model-version`(AI 모델 버전 관리) · `/system/agent`(Agent 실행 현황) · `/system/metric-standard`(지표 측정 데이터 관리) · `/system/download-log`(보고서 다운로드 이력) · `/system/sync-history`(데이터 연동 이력) · `/production/daily-report/history`(이전 보고서) · `/menu/dashboard`(대시보드 허브) · `/menu/operation`(생산 및 품질 관리 허브) · `/menu/report`(보고서 허브) · `/menu/system`(시스템관리 허브)
