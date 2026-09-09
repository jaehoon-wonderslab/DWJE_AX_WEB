/**
 * 앱 화면을 디자인 시스템 컴포넌트로 노출합니다 — node .design-sync/gen-screens.mjs 가 생성 (직접 고치지 마세요)
 *
 * 실제 앱과 같은 파일(app/**, 레이아웃, 컨트롤러, 뷰)을 그대로 번들합니다. 차이는 셋뿐입니다.
 *  1) expo-router → 메모리 라우터 셤(.design-sync/shims/expo-router.jsx)   2) API → 목 데이터(process.env 셤)
 *  3) 인증 → 데모 자동 로그인: 기본 계정(20140901 시스템 · 통합관리자 · 전체 권한)
 */
import React, { useEffect, useLayoutEffect, useState } from 'react';
import { registerRoutes, router } from 'expo-router';
import '@services/setup';
import { DEFAULT_USER } from '@shared/constants/accounts';
import { HOME_PATH } from '@shared/constants/menu';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useAppStore } from '@shared/stores/useAppStore';
import { fetchDataRange } from '@domains/common/model/dataRangeRepository';
import RootLayout from '../../app/_layout.jsx';
import MainLayout from '../../app/(main)/_layout.jsx';
import AuthLayout from '../../app/(auth)/_layout.jsx';
import NotFound from '../../app/+not-found.jsx';
import Page0 from '../../app/(main)/ai/chat.jsx';
import Page1 from '../../app/(main)/dashboard/ai.jsx';
import Page2 from '../../app/(main)/dashboard/process.jsx';
import Page3 from '../../app/(main)/production/monitor.jsx';
import Page4 from '../../app/(main)/production/result.jsx';
import Page5 from '../../app/(main)/quality/defect.jsx';
import Page6 from '../../app/(main)/quality/aoi.jsx';
import Page7 from '../../app/(main)/production/daily-report/index.jsx';
import Page8 from '../../app/(main)/report/press-morning.jsx';
import Page9 from '../../app/(main)/report/plating-morning.jsx';
import Page10 from '../../app/(main)/report/ship-plan.jsx';
import Page11 from '../../app/(main)/report/yield-by-model.jsx';
import Page12 from '../../app/(main)/report/lrr-by-customer.jsx';
import Page13 from '../../app/(main)/report/scrap/index.jsx';
import Page14 from '../../app/(main)/alert/list.jsx';
import Page15 from '../../app/(main)/system/account.jsx';
import Page16 from '../../app/(main)/system/menu-perm.jsx';
import Page17 from '../../app/(main)/system/data-perm.jsx';
import Page18 from '../../app/(main)/system/alert-condition.jsx';
import Page19 from '../../app/(main)/system/recipient.jsx';
import Page20 from '../../app/(main)/system/glossary.jsx';
import Page21 from '../../app/(main)/system/product-rank.jsx';
import Page22 from '../../app/(main)/system/chat-history.jsx';
import Page23 from '../../app/(main)/system/audit-log.jsx';
import Page24 from '../../app/(main)/system/model-config.jsx';
import Page25 from '../../app/(main)/system/model-version.jsx';
import Page26 from '../../app/(main)/system/agent.jsx';
import Page27 from '../../app/(main)/system/metric-standard.jsx';
import Page28 from '../../app/(main)/system/download-log.jsx';
import Page29 from '../../app/(main)/system/sync-history.jsx';
import Page30 from '../../app/(main)/production/daily-report/history.jsx';
import Page31 from '../../app/(main)/menu/dashboard.jsx';
import Page32 from '../../app/(main)/menu/operation.jsx';
import Page33 from '../../app/(main)/menu/report.jsx';
import Page34 from '../../app/(main)/menu/system.jsx';
import Page35 from '../../app/(auth)/login.jsx';
import Page36 from '../../app/(auth)/signup.jsx';
import Page37 from '../../app/(auth)/forgot-password.jsx';
import Page38 from '../../app/index.jsx';
import Page39 from '../../app/(main)/menu/production.jsx';
import Page40 from '../../app/(main)/menu/quality.jsx';
import Page41 from '../../app/(main)/menu/alert.jsx';

/* ── 데모 로그인 — 번들이 로드되는 순간 기본 계정(통합관리자, 전체 권한)으로 들어갑니다 ── */
const demoAuth = useAuthStore.getState();
if (!demoAuth.isLoggedIn) {
  demoAuth.setLogin(DEFAULT_USER, { accessToken: 'demo-access', refreshToken: 'demo-refresh' });
  demoAuth.setMe({ user: DEFAULT_USER, dept: DEFAULT_USER.dept, menuPerms: '*', dataPerms: '*', servingModelVer: 'v2.3.1' });
}
// 화면들의 날짜 기본값 — 목 실적 보유 기간을 한 번 받아 둡니다 (단독 화면도 레이아웃 없이 쓰기 위함)
if (!useAppStore.getState().dataRange) fetchDataRange().then((res) => { if (res?.ok) useAppStore.getState().setDataRange(res.range); }).catch(() => {});

/* ── 라우트 표 ── */
const AUTH_PATHS = new Set(['/login', '/signup', '/forgot-password']);
registerRoutes({
  layouts: [
    { match: (p) => AUTH_PATHS.has(p), component: AuthLayout },
    { match: (p) => p !== '/' && !AUTH_PATHS.has(p), component: MainLayout },
  ],
  pages: {
    '/ai/chat': Page0,
    '/dashboard/ai': Page1,
    '/dashboard/process': Page2,
    '/production/monitor': Page3,
    '/production/result': Page4,
    '/quality/defect': Page5,
    '/quality/aoi': Page6,
    '/production/daily-report': Page7,
    '/report/press-morning': Page8,
    '/report/plating-morning': Page9,
    '/report/ship-plan': Page10,
    '/report/yield-by-model': Page11,
    '/report/lrr-by-customer': Page12,
    '/report/scrap': Page13,
    '/alert/list': Page14,
    '/system/account': Page15,
    '/system/menu-perm': Page16,
    '/system/data-perm': Page17,
    '/system/alert-condition': Page18,
    '/system/recipient': Page19,
    '/system/glossary': Page20,
    '/system/product-rank': Page21,
    '/system/chat-history': Page22,
    '/system/audit-log': Page23,
    '/system/model-config': Page24,
    '/system/model-version': Page25,
    '/system/agent': Page26,
    '/system/metric-standard': Page27,
    '/system/download-log': Page28,
    '/system/sync-history': Page29,
    '/production/daily-report/history': Page30,
    '/menu/dashboard': Page31,
    '/menu/operation': Page32,
    '/menu/report': Page33,
    '/menu/system': Page34,
    '/login': Page35,
    '/signup': Page36,
    '/forgot-password': Page37,
    '/': Page38,
    '/menu/production': Page39,
    '/menu/quality': Page40,
    '/menu/alert': Page41,
  },
  notFound: NotFound,
});

/**
 * 덕우전자 AX 웹 앱 전체 — 사이드바·상단바·AI 질의 레일을 포함한 실제 셸에 화면을 띄웁니다.
 * 메뉴를 누르면 메모리 라우터로 화면이 바뀝니다(주소창은 바뀌지 않음). 부모에 높이를 주지 않으면 100vh 를 씁니다.
 * 데모 계정(통합관리자)으로 자동 로그인되고 모든 데이터는 목(mock)입니다.
 */
export function DwjeApp({ initialPath = HOME_PATH, height = '100vh', width = '100%' }) {
  const [ready, setReady] = useState(false);
  useLayoutEffect(() => { router.replace(initialPath); setReady(true); }, [initialPath]);
  return (
    <div style={{ height, width, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
      {ready ? <RootLayout /> : null}
    </div>
  );
}

/* ── 화면 단위 컴포넌트 — 셸 없이 본문만. 부모(div)에 높이를 주고 넣으세요 ── */
function Frame({ path, children }) {
  useLayoutEffect(() => { router.replace(path); }, [path]);
  // 실적 보유 기간(목 응답)을 받은 뒤 화면을 올립니다 — 컨트롤러의 날짜 기본값이 baseDate(마지막 실적일)를 쓰기 때문
  const dataRange = useAppStore((s) => s.dataRange);
  const [waited, setWaited] = useState(false);
  useEffect(() => { const t = setTimeout(() => setWaited(true), 1500); return () => clearTimeout(t); }, []);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, width: '100%', background: '#fff' }}>
      {dataRange || waited ? children : null}
    </div>
  );
}

/** 자연어 질의 — /ai/chat */
export const ScreenAiChat = () => <Frame path="/ai/chat"><Page0 /></Frame>;

/** AI 통합 대시보드 — /dashboard/ai */
export const ScreenDashAi = () => <Frame path="/dashboard/ai"><Page1 /></Frame>;

/** 공정 및 제품 대시보드 — /dashboard/process */
export const ScreenDashProc = () => <Frame path="/dashboard/process"><Page2 /></Frame>;

/** 생산 모니터링 — /production/monitor */
export const ScreenProdMonitor = () => <Frame path="/production/monitor"><Page3 /></Frame>;

/** 실적 집계·조회 — /production/result */
export const ScreenProdResult = () => <Frame path="/production/result"><Page4 /></Frame>;

/** 불량 현황 조회 — /quality/defect */
export const ScreenQcDefect = () => <Frame path="/quality/defect"><Page5 /></Frame>;

/** AOI 판정 분석·예측 — /quality/aoi */
export const ScreenQcAoi = () => <Frame path="/quality/aoi"><Page6 /></Frame>;

/** 일일 생산현황 보고 — /production/daily-report */
export const ScreenProdDaily = () => <Frame path="/production/daily-report"><Page7 /></Frame>;

/** 아침회의 자료 (PRESS) — /report/press-morning */
export const ScreenRptPressMorning = () => <Frame path="/report/press-morning"><Page8 /></Frame>;

/** 아침회의 자료 (Plating·Coating) — /report/plating-morning */
export const ScreenRptPlatingMorning = () => <Frame path="/report/plating-morning"><Page9 /></Frame>;

/** 연간 출하계획 — /report/ship-plan */
export const ScreenRptShipPlan = () => <Frame path="/report/ship-plan"><Page10 /></Frame>;

/** 제품별 수율 — /report/yield-by-model */
export const ScreenRptYieldModel = () => <Frame path="/report/yield-by-model"><Page11 /></Frame>;

/** 고객사별 LRR — /report/lrr-by-customer */
export const ScreenRptLrrCustomer = () => <Frame path="/report/lrr-by-customer"><Page12 /></Frame>;

/** 폐기 보고서 — /report/scrap */
export const ScreenRptScrap = () => <Frame path="/report/scrap"><Page13 /></Frame>;

/** 알림 목록·상세 — /alert/list */
export const ScreenAlertList = () => <Frame path="/alert/list"><Page14 /></Frame>;

/** 계정 관리 — /system/account */
export const ScreenSysAccount = () => <Frame path="/system/account"><Page15 /></Frame>;

/** 메뉴 접근 권한 — /system/menu-perm */
export const ScreenSysMenu = () => <Frame path="/system/menu-perm"><Page16 /></Frame>;

/** 데이터 접근 권한 — /system/data-perm */
export const ScreenSysData = () => <Frame path="/system/data-perm"><Page17 /></Frame>;

/** 이상 알림 발송 조건 관리 — /system/alert-condition */
export const ScreenAlertCond = () => <Frame path="/system/alert-condition"><Page18 /></Frame>;

/** 알림 수신자 관리 — /system/recipient */
export const ScreenSysRecip = () => <Frame path="/system/recipient"><Page19 /></Frame>;

/** 용어 사전 관리 — /system/glossary */
export const ScreenSysGloss = () => <Frame path="/system/glossary"><Page20 /></Frame>;

/** 제품군 순위 관리 — /system/product-rank */
export const ScreenSysRank = () => <Frame path="/system/product-rank"><Page21 /></Frame>;

/** 자연어 질의 이력 — /system/chat-history */
export const ScreenChatHistory = () => <Frame path="/system/chat-history"><Page22 /></Frame>;

/** 보안 감사 로그 — /system/audit-log */
export const ScreenSysAudit = () => <Frame path="/system/audit-log"><Page23 /></Frame>;

/** AI 모델 설정 — /system/model-config */
export const ScreenBaseModel = () => <Frame path="/system/model-config"><Page24 /></Frame>;

/** AI 모델 버전 관리 — /system/model-version */
export const ScreenSysModelVer = () => <Frame path="/system/model-version"><Page25 /></Frame>;

/** Agent 실행 현황 — /system/agent */
export const ScreenAiAgent = () => <Frame path="/system/agent"><Page26 /></Frame>;

/** 지표 측정 데이터 관리 — /system/metric-standard */
export const ScreenSysMetric = () => <Frame path="/system/metric-standard"><Page27 /></Frame>;

/** 보고서 다운로드 이력 — /system/download-log */
export const ScreenSysDl = () => <Frame path="/system/download-log"><Page28 /></Frame>;

/** 데이터 연동 이력 — /system/sync-history */
export const ScreenSysSync = () => <Frame path="/system/sync-history"><Page29 /></Frame>;

/** 이전 보고서 — /production/daily-report/history */
export const ScreenDailyHistory = () => <Frame path="/production/daily-report/history"><Page30 /></Frame>;

/** 대시보드 허브 — /menu/dashboard · 대시보드 대메뉴의 하위 화면 카드 목록입니다. */
export const ScreenMenuDashboard = () => <Frame path="/menu/dashboard"><Page31 /></Frame>;

/** 생산 및 품질 관리 허브 — /menu/operation · 생산 및 품질 관리 대메뉴의 하위 화면 카드 목록입니다. */
export const ScreenMenuOperation = () => <Frame path="/menu/operation"><Page32 /></Frame>;

/** 보고서 허브 — /menu/report · 보고서 대메뉴의 하위 화면 카드 목록입니다. */
export const ScreenMenuReport = () => <Frame path="/menu/report"><Page33 /></Frame>;

/** 시스템관리 허브 — /menu/system · 시스템관리 대메뉴의 하위 화면 카드 목록입니다. */
export const ScreenMenuSystem = () => <Frame path="/menu/system"><Page34 /></Frame>;

/** 로그인 — /login · 사번·비밀번호 로그인 화면. 데모에서는 어떤 값으로 제출해도 기본 계정으로 로그인됩니다. */
export const LoginScreen = () => <Frame path="/login"><Page35 /></Frame>;

/** 회원가입 — /signup · 계정 신청 화면. */
export const SignupScreen = () => <Frame path="/signup"><Page36 /></Frame>;

/** 비밀번호 찾기 — /forgot-password · 비밀번호 재설정 요청 화면. */
export const ForgotPasswordScreen = () => <Frame path="/forgot-password"><Page37 /></Frame>;
