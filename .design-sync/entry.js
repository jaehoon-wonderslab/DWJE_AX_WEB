/**
 * design-sync 번들 진입점 — claude.ai/design 에 올라가는 공용 부품 목록
 *
 * 앱 화면(domains)·라우터·API 계층은 넣지 않습니다. 여기 export 된 것만 window.DwjeAX.* 로 노출됩니다.
 * 컴포넌트 이름 목록은 .design-sync/config.json 의 componentSrcMap 과 맞춰 둡니다.
 */
// 호스트 폴리필 — 반드시 첫 import (RNW Animated 가 `global` 을 참조)
import './global-shim.js';

// 공용 UI (CM-05)
export * from '../src/shared/components/ui/index.js';

// 브랜드
export { LogoMark, LogoLockup } from '../src/shared/components/brand/Logo.jsx';
export { default as ConstellationField, LIGHT_PALETTE } from '../src/shared/components/brand/ConstellationField.jsx';
export { default as PageTransition } from '../src/shared/components/brand/PageTransition.jsx';

// 레이아웃 (라우터·인증에 묶이지 않은 것만)
export { default as PageHead, BackLink } from '../src/shared/components/layout/PageHead.jsx';
export { default as PageContainer, FullPageContainer } from '../src/shared/components/layout/PageContainer.jsx';
export { default as Grid, Gap } from '../src/shared/components/layout/Grid.jsx';
export { default as ReportDoc, ReportTitle, SignalLegend } from '../src/shared/components/layout/ReportDoc.jsx';

// d3 차트 (웹 구현을 직접 — Platform 분기 없이)
export { default as LineChart } from '../src/shared/components/charts-d3/LineChart.jsx';
export { default as BarChart } from '../src/shared/components/charts-d3/BarChart.jsx';
export { default as GroupedBarChart } from '../src/shared/components/charts-d3/GroupedBarChart.jsx';
export { default as HBarChart } from '../src/shared/components/charts-d3/HBarChart.jsx';
export { default as DonutChart } from '../src/shared/components/charts-d3/DonutChart.jsx';
export { default as Gauge } from '../src/shared/components/charts-d3/Gauge.jsx';
export { default as HeatMap } from '../src/shared/components/charts-d3/HeatMap.jsx';
export { default as RadarChart } from '../src/shared/components/charts-d3/RadarChart.jsx';
export { default as DotPlot } from '../src/shared/components/charts-d3/DotPlot.jsx';
export { default as ParetoChart } from '../src/shared/components/charts-d3/ParetoChart.jsx';

// 테마 — 컴포넌트가 읽는 토큰과 공통 스타일 (Provider 없음)
export { useTheme, makeStyles } from '../src/shared/theme/useTheme.js';
export { useCommonStyles, FONT_FAMILY, NUM_FAMILY } from '../src/shared/theme/styles.js';
export { createTheme, METRICS } from '../src/shared/theme/theme.js';
export { BRAND } from '../src/shared/theme/colors.js';
export { useUiStore } from '../src/shared/stores/useUiStore.js';
export { useAuthStore } from '../src/shared/stores/useAuthStore.js'; // BlindValue 미리보기·권한 상태 재현용

// 앱 화면 — 전체 셸(DwjeApp)과 화면 단위 컴포넌트 (node .design-sync/gen-screens.mjs 가 생성)
export * from './screens/index.jsx';
