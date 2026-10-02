# 현재 컴포넌트·화면 목록

작성 기준: 2026-10-01 현재 `app/`와 `src/`. `proto/` 및 보관 HTML은 운영 코드 목록에서 제외했다. 실행 중인 사이트의 DOM을 관찰한 목록이 아니라 소스 정적 조사다.

`npm run check:routes`: 메뉴 28건 ↔ 라우트 28건 일치. 이 수는 로그인·가입·비밀번호 찾기·허브·오류 화면을 포함한 전체 페이지 수와 다르다. `endpoints.js`의 최상위 ENDPOINTS 항목은 215건으로, README의 기존 메뉴 27건·API 209건 기준과 차이가 있다.

## 공통 컴포넌트

각 JSX 파일의 최상위 컴포넌트 선언을 나열한다. 참조 표기는 전체 app/src의 JSX 태그에서 같은 이름이 발견되는지에 대한 정적 근거이며, 권한·플랫폼·조건부 렌더링에 따라 실제 노출은 달라진다. 배럴 export에만 연결되는 파일도 있으므로 “연결”을 “렌더됨”으로 해석하지 않는다.

| 파일 | 컴포넌트 선언 | 정적 참조 근거 |
|---|---|---|
| `src/shared/components/brand/AiGatherField.jsx` | `AiGatherField` | JSX: AiGatherField; 라우트 import 연결 |
| `src/shared/components/brand/AiLiveDot.jsx` | `AiLiveDot` | JSX: AiLiveDot; 라우트 import 연결 |
| `src/shared/components/brand/AiThinking.jsx` | `AiThinking` | JSX: AiThinking; 라우트 import 연결 미발견 |
| `src/shared/components/brand/ConstellationField.jsx` | `ConstellationField` | JSX: ConstellationField; 라우트 import 연결 |
| `src/shared/components/brand/EntryTransition.jsx` | `EntryTransition` | JSX: EntryTransition; 라우트 import 연결 |
| `src/shared/components/brand/Logo.jsx` | `LogoMark`, `LogoLockup` | JSX: LogoMark, LogoLockup; 라우트 import 연결 |
| `src/shared/components/brand/PageTransition.jsx` | `PageTransition`, `WebTransition`, `NativeTransition` | JSX: PageTransition; 라우트 import 연결 |
| `src/shared/components/brand/ParticleSwarm.jsx` | `ParticleSwarm` | JSX: ParticleSwarm; 라우트 import 연결 |
| `src/shared/components/charts/BarChart.jsx` | `BarChart` | JSX: BarChart; 라우트 import 연결 |
| `src/shared/components/charts/DonutChart.jsx` | `DonutChart` | JSX: DonutChart; 라우트 import 연결 |
| `src/shared/components/charts/DotPlot.jsx` | `DotPlot` | JSX: 이름 기준 태그 미발견; 라우트 import 연결 |
| `src/shared/components/charts/Gauge.jsx` | `Gauge` | JSX: Gauge; 라우트 import 연결 |
| `src/shared/components/charts/HBarChart.jsx` | `HBarChart` | JSX: HBarChart; 라우트 import 연결 |
| `src/shared/components/charts/HeatMap.jsx` | `HeatMap` | JSX: HeatMap; 라우트 import 연결 |
| `src/shared/components/charts/LineChart.jsx` | `LineChart` | JSX: LineChart; 라우트 import 연결 |
| `src/shared/components/charts/RadarChart.jsx` | `RadarChart` | JSX: RadarChart; 라우트 import 연결 |
| `src/shared/components/charts/chartData.jsx` | `ChartEmpty` | JSX: ChartEmpty; 라우트 import 연결 |
| `src/shared/components/charts-d3/BandChart.jsx` | `BandChart`, `LegendItem` | JSX: BandChart, LegendItem; 라우트 import 연결 |
| `src/shared/components/charts-d3/BarChart.jsx` | `BarChart` | JSX: BarChart; 라우트 import 연결 |
| `src/shared/components/charts-d3/DonutChart.jsx` | `DonutChart` | JSX: DonutChart; 라우트 import 연결 |
| `src/shared/components/charts-d3/DotPlot.jsx` | `DotPlot` | JSX: 이름 기준 태그 미발견; 라우트 import 연결 |
| `src/shared/components/charts-d3/Gauge.jsx` | `Gauge` | JSX: Gauge; 라우트 import 연결 |
| `src/shared/components/charts-d3/GroupedBarChart.jsx` | `GroupedBarChart` | JSX: GroupedBarChart; 라우트 import 연결 |
| `src/shared/components/charts-d3/HBarChart.jsx` | `HBarChart` | JSX: HBarChart; 라우트 import 연결 |
| `src/shared/components/charts-d3/HeatMap.jsx` | `HeatMap` | JSX: HeatMap; 라우트 import 연결 |
| `src/shared/components/charts-d3/LineChart.jsx` | `LineChart` | JSX: LineChart; 라우트 import 연결 |
| `src/shared/components/charts-d3/ParetoChart.jsx` | `ParetoChart` | JSX: ParetoChart; 라우트 import 연결 |
| `src/shared/components/charts-d3/RadarChart.jsx` | `RadarChart` | JSX: RadarChart; 라우트 import 연결 |
| `src/shared/components/charts-d3/Tooltip.jsx` | `Tooltip` | JSX: Tooltip; 라우트 import 연결 |
| `src/shared/components/charts-d3/ZoomableSunburst.jsx` | `HoverTooltip`, `ZoomableSunburst` | JSX: HoverTooltip, ZoomableSunburst; 라우트 import 연결 |
| `src/shared/components/layout/AiChatPanelHost.jsx` | `AiChatPanelHost` | JSX: AiChatPanelHost; 라우트 import 연결 |
| `src/shared/components/layout/AlertBell.jsx` | `AlertBell` | JSX: AlertBell; 라우트 import 연결 |
| `src/shared/components/layout/AuthCard.jsx` | `AuthCard`, `AuthLinks` | JSX: AuthCard, AuthLinks; 라우트 import 연결 |
| `src/shared/components/layout/Grid.jsx` | `Grid`, `Gap` | JSX: Grid, Gap; 라우트 import 연결 |
| `src/shared/components/layout/MenuHub.jsx` | `MenuHub` | JSX: MenuHub; 라우트 import 연결 |
| `src/shared/components/layout/PageContainer.jsx` | `PageContainer`, `FullPageContainer` | JSX: PageContainer, FullPageContainer; 라우트 import 연결 |
| `src/shared/components/layout/PageHead.jsx` | `PageHead`, `BackLink` | JSX: PageHead; 라우트 import 연결 |
| `src/shared/components/layout/ReportDoc.jsx` | `ReportDoc`, `ReportTitle`, `SignalLegend` | JSX: ReportDoc, ReportTitle; 라우트 import 연결 |
| `src/shared/components/layout/Sidebar.jsx` | `Sidebar` | JSX: Sidebar; 라우트 import 연결 |
| `src/shared/components/layout/Topbar.jsx` | `Topbar` | JSX: Topbar; 라우트 import 연결 |
| `src/shared/components/layout/UserMenu.jsx` | `UserMenu` | JSX: UserMenu; 라우트 import 연결 |
| `src/shared/components/ui/Badge.jsx` | `Badge`, `StateBadge`, `Dot` | JSX: Badge, StateBadge, Dot; 라우트 import 연결 |
| `src/shared/components/ui/BlindValue.jsx` | `BlindValue`, `BlindNote` | JSX: BlindValue, BlindNote; 라우트 import 연결 |
| `src/shared/components/ui/Button.jsx` | `Button`, `IconButton`, `ButtonRow` | JSX: Button, IconButton, ButtonRow; 라우트 import 연결 |
| `src/shared/components/ui/Card.jsx` | `Card`, `CardBody`, `SourceNote` | JSX: Card, CardBody, SourceNote; 라우트 import 연결 |
| `src/shared/components/ui/Chip.jsx` | `Chip`, `SourceChip`, `SelectChip`, `ChipRow` | JSX: Chip, ChipRow; 라우트 import 연결 |
| `src/shared/components/ui/DatePickerModal.jsx` | `DatePickerModal` | JSX: 이름 기준 태그 미발견; 라우트 import 연결 미발견 |
| `src/shared/components/ui/DatePickerPopover.jsx` | `DatePickerPopover` | JSX: DatePickerPopover; 라우트 import 연결 |
| `src/shared/components/ui/Feedback.jsx` | `Hint`, `HelpTip`, `FormAlert`, `NoteText`, `EmptyState`, `Loading`, `Pulse`, `NoAccess` | JSX: Hint, HelpTip, FormAlert, NoteText, EmptyState, Loading, Pulse, NoAccess; 라우트 import 연결 |
| `src/shared/components/ui/Field.jsx` | `Field`, `TextField`, `TextAreaField`, `SelectField`, `DateField`, `PasswordField`, `CheckRow`, `RadioRow`, `Filters` | JSX: Field, TextField, TextAreaField, SelectField, DateField, PasswordField, CheckRow, RadioRow, Filters; 라우트 import 연결 |
| `src/shared/components/ui/FormModal.jsx` | `FormBody`, `ConfirmBody` | JSX: FormBody, ConfirmBody; 라우트 import 연결 |
| `src/shared/components/ui/GlobalApiSpinner.jsx` | `GlobalApiSpinner` | JSX: GlobalApiSpinner; 라우트 import 연결 |
| `src/shared/components/ui/Hoverable.jsx` | `Hoverable` | JSX: Hoverable; 라우트 import 연결 |
| `src/shared/components/ui/Icon.jsx` | `Icon` | JSX: Icon; 라우트 import 연결 |
| `src/shared/components/ui/KeyValue.jsx` | `KeyValue` | JSX: KeyValue; 라우트 import 연결 |
| `src/shared/components/ui/ListRow.jsx` | `ListRow` | JSX: 이름 기준 태그 미발견; 라우트 import 연결 |
| `src/shared/components/ui/Markdown.jsx` | `Markdown`, `MdTable`, `Inline` | JSX: Markdown, MdTable, Inline; 라우트 import 연결 |
| `src/shared/components/ui/Overlays.jsx` | `ToastHost`, `Rise`, `ModalHost`, `DrawerHost` | JSX: ToastHost, Rise, ModalHost, DrawerHost; 라우트 import 연결 |
| `src/shared/components/ui/Pagination.jsx` | `Pagination` | JSX: Pagination; 라우트 import 연결 |
| `src/shared/components/ui/PermMatrix.jsx` | `PermMatrix` | JSX: 이름 기준 태그 미발견; 라우트 import 연결 |
| `src/shared/components/ui/Pred.jsx` | `Pred`, `ConfTag`, `Drift` | JSX: 이름 기준 태그 미발견; 라우트 import 연결 |
| `src/shared/components/ui/ProgressBar.jsx` | `ProgressBar` | JSX: ProgressBar; 라우트 import 연결 |
| `src/shared/components/ui/SparkleSpinner.jsx` | `SparkleSpinner` | JSX: SparkleSpinner; 라우트 import 연결 |
| `src/shared/components/ui/StatCard.jsx` | `StatCard` | JSX: StatCard; 라우트 import 연결 |
| `src/shared/components/ui/Steps.jsx` | `Steps` | JSX: Steps; 라우트 import 연결 |
| `src/shared/components/ui/Table.jsx` | `Table` | JSX: Table; 라우트 import 연결 |
| `src/shared/components/ui/Tabs.jsx` | `Tabs` | JSX: Tabs; 라우트 import 연결 |
| `src/shared/components/ui/TabulatorGrid.jsx` | `TabulatorGrid` | JSX: TabulatorGrid; 라우트 import 연결 |
| `src/shared/components/ui/TabulatorTable.jsx` | `TabulatorTable` | JSX: TabulatorTable; 라우트 import 연결 |
| `src/shared/components/ui/XlsTable.jsx` | `XlsTable`, `XlsLegend` | JSX: XlsTable; 라우트 import 연결 |

`FormModal.jsx`의 `openFormModal`, `openConfirmModal`은 모달을 여는 함수다. `GRID_INSET`, `ARROW_W`, 차트 테마·훅·숫자 포맷 함수·logoCloud 데이터는 UI 컴포넌트가 아니다. React Native의 View/Text/Pressable/TextInput/ScrollView 등과 DOM/SVG 요소는 아래 원시 요소 목록에 별도 기록한다.

## 도메인 화면·부분 컴포넌트

화면 View와 같은 파일 내부의 부분 컴포넌트까지 포함한다. JSX 태그 참조 및 파일 연결 여부는 위와 같은 기준이다.

| 파일 | 컴포넌트 선언 | 라우트 연결 |
|---|---|---|
| `src/domains/ai/view/ChatHome.jsx` | `ChatHome` | 연결 |
| `src/domains/ai/view/ChatView.jsx` | `ChatView`, `EmptyChat`, `Message`, `LlmMessage`, `SourceAccordion`, `Block` | 연결 |
| `src/domains/alert/view/AlertListView.jsx` | `AlertListView`, `AlertDetail` | 연결 |
| `src/domains/auth/view/EmailCodeFields.jsx` | `EmailCodeFields` | 연결 |
| `src/domains/auth/view/LoginView.jsx` | `LoginView` | 연결 |
| `src/domains/auth/view/PasswordFields.jsx` | `PasswordFields` | 연결 |
| `src/domains/auth/view/PasswordResetView.jsx` | `PasswordResetView` | 연결 |
| `src/domains/auth/view/SignupView.jsx` | `SignupView` | 연결 |
| `src/domains/dashboard/view/AiDashboardView.jsx` | `AiDashboardView` | 연결 |
| `src/domains/dashboard/view/KpiDashboardView.jsx` | `KpiDashboardView` | 연결 미발견 — 보존·상태 확인 대상 |
| `src/domains/dashboard/view/ProcessDashboardView.jsx` | `ProcessDashboardView`, `Metric`, `Issue`, `ChartMessage`, `SelectionComparison` | 연결 |
| `src/domains/dashboard/view/ProductPicker.jsx` | `PickerBody` | 연결 미발견 — 보존·상태 확인 대상 |
| `src/domains/dashboard/view/UploadReportView.jsx` | `UploadReportView`, `BlockGrid`, `BlockCard`, `TableBlock` | 연결 |
| `src/domains/dashboard/view/components/AiBriefingCard.jsx` | `AiBriefingCard`, `VerifiedLines`, `Evidence`, `NotReady` | 연결 |
| `src/domains/dashboard/view/components/AiCausePrescriptionCard.jsx` | `AiCausePrescriptionCard` | 연결 |
| `src/domains/dashboard/view/components/AiEvidenceModal.jsx` | `EvidenceBody`, `EvidenceButton` | 연결 |
| `src/domains/dashboard/view/components/EquipmentDetail.jsx` | `EquipmentDetail` | 연결 미발견 — 보존·상태 확인 대상 |
| `src/domains/dashboard/view/components/EquipmentMatrix.jsx` | `EquipmentMatrix` | 연결 미발견 — 보존·상태 확인 대상 |
| `src/domains/dashboard/view/components/HourlyDefectPivotMatrix.jsx` | `HourlyDefectPivotMatrix` | 연결 |
| `src/domains/dashboard/view/components/HourlyDetailModalContent.jsx` | `HourlyDetailModalContent` | 연결 |
| `src/domains/dashboard/view/components/ProcessYieldView.jsx` | `ProcessYieldView` | 연결 미발견 — 보존·상태 확인 대상 |
| `src/domains/production/view/DailyHistoryView.jsx` | `DailyHistoryView` | 연결 |
| `src/domains/production/view/DailyReportView.jsx` | `DailyReportView`, `TargetCell`, `WeekCell` | 연결 |
| `src/domains/production/view/ProductionMonitorView.jsx` | `ProductionMonitorView` | 연결 |
| `src/domains/production/view/ProductionResultView.jsx` | `ProductionResultView` | 연결 |
| `src/domains/production/view/components/PressTopView.jsx` | `PressTopView`, `PressMachine`, `Detail` | 연결 |
| `src/domains/production/view/components/ProductionTrendD3Chart.jsx` | `ProductionTrendD3Chart` | 연결 |
| `src/domains/quality/view/AoiPredictionView.jsx` | `AoiPredictionView` | 연결 |
| `src/domains/quality/view/DefectStatusView.jsx` | `TreeLegend`, `DefectStatusView` | 연결 |
| `src/domains/quality/view/components/AoiAgentAnalysisCard.jsx` | `AoiAgentAnalysisCard` | 연결 |
| `src/domains/quality/view/components/AoiBriefingCard.jsx` | `AoiBriefingCard` | 연결 미발견 — 보존·상태 확인 대상 |
| `src/domains/quality/view/components/AoiDefectModal.jsx` | `AoiDefectModal`, `Photo` | 연결 |
| `src/domains/quality/view/components/AoiDefectSection.jsx` | `AoiDateFilter`, `AoiDefectSection` | 연결 |
| `src/domains/report/view/LrrByCustomerView.jsx` | `LrrByCustomerView` | 연결 |
| `src/domains/report/view/PlatingMorningView.jsx` | `PlatingMorningView` | 연결 |
| `src/domains/report/view/PressMorningView.jsx` | `PressMorningView` | 연결 |
| `src/domains/report/view/ReportPicker.jsx` | `ReportPicker` | 연결 |
| `src/domains/report/view/ScrapReportView.jsx` | `ScrapReportView`, `Section`, `Row` | 연결 |
| `src/domains/report/view/ShipPlanView.jsx` | `ShipPlanView` | 연결 |
| `src/domains/report/view/YieldByModelView.jsx` | `YieldByModelView` | 연결 |
| `src/domains/report/view/components/MorningSheet.jsx` | `MorningSheet`, `Qty`, `WeekCell` | 연결 |
| `src/domains/system/view/AccountGrid.jsx` | `AccountGrid` | 연결 |
| `src/domains/system/view/AccountMenuPicker.jsx` | `AccountMenuPicker` | 연결 |
| `src/domains/system/view/AccountView.jsx` | `AccountView` | 연결 |
| `src/domains/system/view/AlertCondView.jsx` | `AlertCondView` | 연결 |
| `src/domains/system/view/AuditLogView.jsx` | `AuditLogView` | 연결 |
| `src/domains/system/view/ChatHistoryView.jsx` | `ChatHistoryView` | 연결 |
| `src/domains/system/view/DataFieldManager.jsx` | `DataFieldManager`, `KindList` | 연결 |
| `src/domains/system/view/DataPermGrid.jsx` | `DataPermGrid` | 연결 |
| `src/domains/system/view/DataPermView.jsx` | `DataPermView` | 연결 |
| `src/domains/system/view/DownloadLogView.jsx` | `DownloadLogView` | 연결 |
| `src/domains/system/view/GlossaryView.jsx` | `GlossaryView` | 연결 |
| `src/domains/system/view/GwDeptMapView.jsx` | `GwDeptMapView` | 연결 |
| `src/domains/system/view/MenuPermGrid.jsx` | `MenuPermGrid` | 연결 |
| `src/domains/system/view/MenuPermView.jsx` | `MenuPermView` | 연결 |
| `src/domains/system/view/RecipientView.jsx` | `RecipientView` | 연결 |
| `src/domains/system/view/SyncHistoryView.jsx` | `SyncHistoryView` | 연결 |
| `src/domains/system/view/UploadDocView.jsx` | `UploadDocView`, `VersionHistory` | 연결 |

## 화면 ID와 메뉴

| ID | 이름 | 경로 |
|---|---|---|
| `ai-chat` | 덕반장 AI | `/ai/chat` |
| `dash-ai` | AI 통합 대시보드 | `/dashboard/ai` |
| `dash-proc` | 공정 및 제품 대시보드 | `/dashboard/process` |
| `prod-monitor` | 생산 모니터링 | `/production/monitor` |
| `prod-result` | 실적 집계·조회 | `/production/result` |
| `qc-defect` | 불량 현황 조회 | `/quality/defect` |
| `qc-aoi` | AOI 판정 분석 | `/quality/aoi` |
| `prod-daily` | 일일 생산현황 보고 | `/production/daily-report` |
| `rpt-press-morning` | 아침회의 자료 (PRESS) | `/report/press-morning` |
| `rpt-plating-morning` | 아침회의 자료 (Plating·Coating) | `/report/plating-morning` |
| `rpt-ship-plan` | 연간 출하계획 | `/report/ship-plan` |
| `rpt-yield-model` | 제품별 수율 | `/report/yield-by-model` |
| `rpt-lrr-customer` | 고객사별 LRR | `/report/lrr-by-customer` |
| `rpt-scrap` | 폐기 보고서 | `/report/scrap` |
| `alert-list` | 알림 목록·상세 | `/alert/list` |
| `sys-account` | 계정 관리 | `/system/account` |
| `sys-gw-dept` | 그룹웨어 부서 매핑 | `/system/gw-dept-map` |
| `sys-menu` | 메뉴 접근 권한 | `/system/menu-perm` |
| `sys-data` | 데이터 접근 권한 | `/system/data-perm` |
| `alert-cond` | 이상 알림 발송 조건 관리 | `/system/alert-condition` |
| `sys-recip` | 알림 수신자 관리 | `/system/recipient` |
| `sys-gloss` | 용어 사전 관리 | `/system/glossary` |
| `chat-history` | 자연어 질의 이력 | `/system/chat-history` |
| `sys-audit` | 보안 감사 로그 | `/system/audit-log` |
| `sys-dl` | 보고서 다운로드 이력 | `/system/download-log` |
| `sys-upload-doc` | 업로드 문서 목록 | `/system/upload-doc` |
| `sys-sync` | 데이터 연동 이력 | `/system/sync-history` |
| `dash-ai-upload` | 업로드 리포트 업로드 | `/dashboard/ai#upload` |
| `daily-history` | 이전 보고서 | `/production/daily-report/history` |

`dash-ai-upload`는 업로드 동작 권한이며 독립 화면이 아니다. 로그인·회원가입·비밀번호 찾기에는 여기서 임의의 메뉴 ID를 부여하지 않는다.

## 전체 app 라우트

`_layout`과 `+html`은 페이지가 아닌 결선/문서 루트다. `menu/production`, `menu/quality`처럼 이전 경로를 유지하는 라우트는 삭제하지 않고 리다이렉트·호환 상태를 확인한다.

| 라우트 파일 | 소스가 연결하는 View/결선 |
|---|---|
| `app/(auth)/_layout.jsx` | `@shared/components/brand/PageTransition` |
| `app/(auth)/forgot-password.jsx` | `@domains/auth/controller/usePasswordResetController`, `@domains/auth/view/PasswordResetView` |
| `app/(auth)/login.jsx` | `@domains/auth/controller/useLoginController`, `@domains/auth/view/LoginView` |
| `app/(auth)/signup.jsx` | `@domains/auth/controller/useSignupController`, `@domains/auth/view/SignupView` |
| `app/(main)/_layout.jsx` | `@domains/common/controller/useDataRangeBootstrap`, `@shared/components/brand/PageTransition`, `@shared/components/layout/Sidebar`, `@shared/components/layout/Topbar`, `@shared/components/layout/AiChatPanelHost`, `@shared/components/ui` |
| `app/(main)/ai/chat.jsx` | `@shared/components/layout/PageContainer`, `@domains/ai/controller/useChatController`, `@domains/ai/controller/useHomeBriefing`, `@domains/ai/view/ChatView` |
| `app/(main)/alert/list.jsx` | `@shared/components/layout/PageContainer`, `@domains/alert/controller/useAlertListController`, `@domains/alert/view/AlertListView` |
| `app/(main)/dashboard/ai.jsx` | `@shared/components/layout/PageContainer`, `@shared/components/ui`, `@domains/dashboard/controller/useAiDashboardController`, `@domains/dashboard/controller/useUploadReportController`, `@domains/dashboard/view/AiDashboardView`, `@domains/dashboard/view/UploadReportView` |
| `app/(main)/dashboard/process.jsx` | `@shared/components/layout/PageContainer`, `@domains/dashboard/controller/useProcessDashboardController`, `@domains/dashboard/view/ProcessDashboardView` |
| `app/(main)/menu/alert.jsx` | `@shared/components/layout/MenuHub` |
| `app/(main)/menu/dashboard.jsx` | `@shared/components/layout/MenuHub` |
| `app/(main)/menu/operation.jsx` | `@shared/components/layout/MenuHub` |
| `app/(main)/menu/production.jsx` |  |
| `app/(main)/menu/quality.jsx` |  |
| `app/(main)/menu/report.jsx` | `@shared/components/layout/PageContainer`, `@domains/report/view/ReportPicker` |
| `app/(main)/menu/system.jsx` | `@shared/components/layout/MenuHub` |
| `app/(main)/production/daily-report/history.jsx` | `@shared/components/layout/PageContainer`, `@domains/production/view/DailyHistoryView` |
| `app/(main)/production/daily-report/index.jsx` | `@shared/components/layout/PageContainer`, `@domains/production/controller/useDailyReportController`, `@domains/production/view/DailyReportView` |
| `app/(main)/production/monitor.jsx` | `@shared/components/layout/PageContainer`, `@domains/production/controller/useProductionMonitorController`, `@domains/production/view/ProductionMonitorView` |
| `app/(main)/production/result.jsx` | `@shared/components/layout/PageContainer`, `@domains/production/controller/useProductionResultController`, `@domains/production/view/ProductionResultView` |
| `app/(main)/quality/aoi.jsx` | `@shared/components/layout/PageContainer`, `@domains/quality/controller/useAoiDefectsController`, `@domains/quality/controller/useAoiPredictionController`, `@domains/quality/view/AoiPredictionView` |
| `app/(main)/quality/defect.jsx` | `@shared/components/layout/PageContainer`, `@domains/quality/controller/useDefectStatusController`, `@domains/quality/view/DefectStatusView` |
| `app/(main)/report/lrr-by-customer.jsx` | `@shared/components/layout/PageContainer`, `@domains/report/controller/useLrrByCustomerController`, `@domains/report/view/LrrByCustomerView` |
| `app/(main)/report/plating-morning.jsx` | `@shared/components/layout/PageContainer`, `@domains/report/controller/usePlatingMorningController`, `@domains/report/view/PlatingMorningView` |
| `app/(main)/report/press-morning.jsx` | `@shared/components/layout/PageContainer`, `@domains/report/controller/usePressMorningController`, `@domains/report/view/PressMorningView` |
| `app/(main)/report/scrap/index.jsx` | `@shared/components/layout/PageContainer`, `@domains/report/controller/useScrapReportController`, `@domains/report/view/ScrapReportView` |
| `app/(main)/report/ship-plan.jsx` | `@shared/components/layout/PageContainer`, `@domains/report/controller/useShipPlanController`, `@domains/report/view/ShipPlanView` |
| `app/(main)/report/yield-by-model.jsx` | `@shared/components/layout/PageContainer`, `@domains/report/controller/useYieldByModelController`, `@domains/report/view/YieldByModelView` |
| `app/(main)/system/account.jsx` | `@shared/components/layout/PageContainer`, `@domains/system/controller/useAccountController`, `@domains/system/view/AccountView` |
| `app/(main)/system/alert-condition.jsx` | `@shared/components/layout/PageContainer`, `@domains/system/controller/useAlertCondController`, `@domains/system/view/AlertCondView` |
| `app/(main)/system/audit-log.jsx` | `@shared/components/layout/PageContainer`, `@domains/system/controller/useAuditLogController`, `@domains/system/view/AuditLogView` |
| `app/(main)/system/chat-history.jsx` | `@shared/components/layout/PageContainer`, `@domains/system/controller/useChatHistoryController`, `@domains/system/view/ChatHistoryView` |
| `app/(main)/system/data-perm.jsx` | `@shared/components/layout/PageContainer`, `@domains/system/controller/useDataPermController`, `@domains/system/view/DataPermView` |
| `app/(main)/system/download-log.jsx` | `@shared/components/layout/PageContainer`, `@domains/system/controller/useDownloadLogController`, `@domains/system/view/DownloadLogView` |
| `app/(main)/system/glossary.jsx` | `@shared/components/layout/PageContainer`, `@domains/system/controller/useGlossaryController`, `@domains/system/view/GlossaryView` |
| `app/(main)/system/gw-dept-map.jsx` | `@shared/components/layout/PageContainer`, `@domains/system/controller/useGwDeptMapController`, `@domains/system/view/GwDeptMapView` |
| `app/(main)/system/menu-perm.jsx` | `@shared/components/layout/PageContainer`, `@domains/system/controller/useMenuPermController`, `@domains/system/view/MenuPermView` |
| `app/(main)/system/recipient.jsx` | `@shared/components/layout/PageContainer`, `@domains/system/controller/useRecipientController`, `@domains/system/view/RecipientView` |
| `app/(main)/system/sync-history.jsx` | `@shared/components/layout/PageContainer`, `@domains/system/controller/useSyncHistoryController`, `@domains/system/view/SyncHistoryView` |
| `app/(main)/system/upload-doc.jsx` | `@shared/components/layout/PageContainer`, `@domains/system/controller/useUploadDocController`, `@domains/system/view/UploadDocView` |
| `app/+html.jsx` |  |
| `app/+not-found.jsx` |  |
| `app/_layout.jsx` | `@shared/components/ui`, `@shared/components/brand/Logo`, `@domains/auth/controller/useAuthBootstrap`, `@shared/components/brand/EntryTransition` |
| `app/index.jsx` |  |

## 원시 요소 및 아이콘

사용 파일에 등장하는 JSX 태그(React Native·DOM·SVG·라이브러리 태그 포함):

`AccountGrid`, `AccountMenuPicker`, `AccountView`, `AiBriefingCard`, `AiCausePrescriptionCard`, `AiChatPanelHost`, `AiDashboardView`, `AiGatherField`, `AiLiveDot`, `AiThinking`, `AlertBell`, `AlertCondView`, `AlertDetail`, `AlertListView`, `Animated.View`, `AoiAgentAnalysisCard`, `AoiDateFilter`, `AoiDefectModal`, `AoiDefectSection`, `AoiPredictionView`, `Array`, `Arrow`, `AuditLogView`, `AuthCard`, `AuthLinks`, `Badge`, `BandChart`, `BarChart`, `BlindNote`, `BlindValue`, `Block`, `BlockCard`, `BlockGrid`, `BootScreen`, `Button`, `ButtonRow`, `Card`, `CardBody`, `Cell`, `ChartEmpty`, `ChartMessage`, `ChatHistoryView`, `ChatHome`, `ChatView`, `CheckRow`, `Chip`, `ChipRow`, `Circle`, `ConfirmBody`, `ConstellationField`, `DailyHistoryView`, `DailyReportView`, `DataFieldManager`, `DataPermGrid`, `DataPermView`, `DateField`, `DatePickerPopover`, `DefectStatusView`, `Detail`, `DonutChart`, `Dot`, `DownloadLogView`, `Drawer`, `DrawerHost`, `EmailCodeFields`, `EmptyChat`, `EmptyState`, `EntryTransition`, `Evidence`, `EvidenceBody`, `EvidenceButton`, `Field`, `Filters`, `FormAlert`, `FormBody`, `FullPageContainer`, `Gap`, `Gauge`, `GlobalApiSpinner`, `GlossaryView`, `Grid`, `GroupedBarChart`, `GwDeptMapView`, `HBarChart`, `HeatMap`, `HelpTip`, `Hint`, `HourlyDefectPivotMatrix`, `HourlyDetailModalContent`, `HoverTooltip`, `Hoverable`, `Icon`, `IconButton`, `Image`, `Impl`, `Inline`, `Issue`, `KeyValue`, `KindList`, `LegendItem`, `Line`, `LineChart`, `Link`, `LlmMessage`, `Loading`, `LoginView`, `LogoLockup`, `LogoMark`, `LrrByCustomerView`, `Markdown`, `MdTable`, `MenuHub`, `MenuPermGrid`, `MenuPermView`, `Message`, `Metric`, `Modal`, `ModalHost`, `MorningSheet`, `NoAccess`, `NotReady`, `NoteText`, `Object`, `PageContainer`, `PageHead`, `PageTransition`, `Pagination`, `ParetoChart`, `ParticleSwarm`, `PasswordField`, `PasswordFields`, `PasswordResetView`, `Path`, `Photo`, `PickerBody`, `PivotCard`, `PlatingMorningView`, `Polygon`, `Polyline`, `PressMachine`, `PressMorningView`, `PressTopView`, `Pressable`, `ProcessDashboardView`, `ProductionMonitorView`, `ProductionResultView`, `ProductionTrendD3Chart`, `ProgressBar`, `Pulse`, `Qty`, `RNModal`, `RadarChart`, `RadioRow`, `React.Fragment`, `RecipientView`, `Rect`, `Redirect`, `Report`, `ReportDoc`, `ReportPicker`, `ReportTitle`, `Rise`, `Row`, `SafeAreaProvider`, `ScrapReportView`, `ScrollView`, `ScrollViewStyleReset`, `Section`, `SelectField`, `SelectionComparison`, `ShipPlanView`, `Sidebar`, `SignupView`, `SizePicker`, `Slot`, `SourceAccordion`, `SourceNote`, `SparkleSpinner`, `StatCard`, `StateBadge`, `StatusBar`, `Steps`, `Svg`, `SvgText`, `SyncHistoryView`, `TSpan`, `Table`, `TableBlock`, `Tabs`, `TabulatorGrid`, `TabulatorTable`, `TargetCell`, `Text`, `TextAreaField`, `TextField`, `TextInput`, `Toast`, `ToastHost`, `Tooltip`, `Topbar`, `TouchableOpacity`, `TreeLegend`, `UploadDocView`, `UploadReportView`, `UserMenu`, `VerifiedLines`, `VersionHistory`, `View`, `WeekCell`, `Wrapper`, `XlsTable`, `YieldByModelView`, `ZoomableSunburst`, `b`, `body`, `boolean`, `br`, `button`, `canvas`, `circle`, `defs`, `div`, `g`, `head`, `html`, `img`, `input`, `label`, `line`, `linearGradient`, `link`, `meta`, `nav`, `number`, `object`, `option`, `p`, `path`, `rect`, `script`, `section`, `select`, `small`, `span`, `stop`, `string`, `strong`, `style`, `svg`, `table`, `tbody`, `td`, `text`, `th`, `title`, `tr`

현재 `Icon.jsx`의 PATHS 아이콘 키:

`menu`, `search`, `bell`, `moon`, `chevronDown`, `chevronRight`, `chevronLeft`, `chevronUp`, `close`, `check`, `download`, `upload`, `printer`, `info`, `help`, `message`, `plus`, `edit`, `trash`, `refresh`, `alert`, `filter`, `arrowUp`, `arrowDown`, `arrowRight`, `arrowLeft`, `play`, `copy`, `external`, `clock`, `file`, `user`, `users`, `settings`, `mic`, `send`, `sparkles`, `thumbsUp`, `thumbsDown`, `eye`, `eyeOff`, `lock`, `database`, `activity`, `layers`, `grid`, `chart`, `save`, `calendar`, `shield`, `link`, `history`, `book`, `image`, `minus`, `sun`, `logout`, `triangle`, `star`, `starFilled`

## 개선 시 함께 확인할 스타일 구현

- `src/shared/theme/colors.js`, `theme.js`, `styles.js`, `useTheme.js`
- `app/+html.jsx`의 폰트 로딩·전역 CSS
- `src/shared/components/ui/tabulatorHeaders.css`와 TabulatorGrid의 DOM 스타일
- D3 차트의 축·범례·툴팁 및 HTML/SVG 폰트
- 각 View의 인라인 fontSize·색상·간격 및 모달 내부 스타일

목록은 컴포넌트 이름·파일 단위로 조사했다. 같은 이름의 차트가 SVG/D3 구현에 각각 존재하므로 별도 파일로 유지했다. 정적 연결 미발견 파일을 현재 사용 중이라고 단정하지 않으며 삭제하지 않는다.
