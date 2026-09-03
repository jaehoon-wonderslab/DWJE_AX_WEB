/**
 * 메뉴 정의 — 기능명세서 ver01 「화면정의」 시트 기준
 *
 * 메뉴 항목 하나 = 라우트 하나 = 소스 파일 하나 입니다.
 *  · id   : 권한 판정 키 (API 명세의 화면 ID — 절대 바꾸지 않습니다)
 *  · path : 실제 URL 경로 (app/ 폴더의 라우트 파일 위치와 일치)
 *
 * 새 메뉴를 추가할 때는
 *   1) 여기에 { id, name, path } 를 추가하고
 *   2) app/(main)/<path>.jsx 라우트 파일을 만들고
 *   3) 부서 권한(MENU_ACCESS_DEFAULT)에 id 를 넣습니다.
 */
export const MENU = [
  {
    group: 'AI 어시스턴트',
    solo: true,
    items: [{ id: 'ai-chat', name: '자연어 질의', path: '/ai/chat', tag: '신규' }],
  },
  {
    group: '대시보드',
    items: [
      { id: 'dash-ai', name: 'AI 통합 대시보드', path: '/dashboard/ai', tag: '신규' },
      { id: 'dash-proc', name: '공정 및 제품 대시보드', path: '/dashboard/process', tag: '신규' },
      { id: 'dash-kpi', name: '성과지표 대시보드', path: '/dashboard/kpi', tag: '신규' },
    ],
  },
  {
    group: '생산관리',
    items: [
      { id: 'prod-monitor', name: '생산 모니터링', path: '/production/monitor', tag: '수정' },
      { id: 'prod-result', name: '실적 집계·조회', path: '/production/result', tag: '수정' },
      { id: 'prod-daily', name: '일일 생산현황 보고', path: '/production/daily-report', tag: '신규' },
    ],
  },
  {
    group: '품질관리',
    items: [
      { id: 'qc-defect', name: '불량 현황 조회', path: '/quality/defect', tag: '신규' },
      { id: 'qc-aoi', name: 'AOI 판정 분석·예측', path: '/quality/aoi', tag: '신규' },
    ],
  },
  {
    group: '보고서',
    items: [
      { id: 'rpt-press-morning', name: '아침회의 자료 (PRESS)', path: '/report/press-morning', tag: '신규' },
      { id: 'rpt-plating-morning', name: '아침회의 자료 (Plating·Coating)', path: '/report/plating-morning', tag: '신규' },
      { id: 'rpt-ship-plan', name: '연간 출하계획', path: '/report/ship-plan', tag: '신규' },
      { id: 'rpt-yield-model', name: '제품별 수율', path: '/report/yield-by-model', tag: '신규' },
      { id: 'rpt-lrr-customer', name: '고객사별 LRR', path: '/report/lrr-by-customer', tag: '신규' },
      { id: 'rpt-scrap', name: '폐기 보고서', path: '/report/scrap', tag: '신규' },
    ],
  },
  {
    group: '이상 알림',
    items: [{ id: 'alert-list', name: '알림 목록·상세', path: '/alert/list', tag: '신규' }],
  },
  {
    group: '시스템관리',
    items: [
      { id: 'sys-account', name: '계정 관리', path: '/system/account', tag: '신규' },
      { id: 'sys-menu', name: '메뉴 접근 권한', path: '/system/menu-perm', tag: '신규' },
      { id: 'sys-data', name: '데이터 접근 권한', path: '/system/data-perm', tag: '신규' },
      { id: 'alert-cond', name: '이상 알림 발송 조건 관리', path: '/system/alert-condition', tag: '신규' },
      { id: 'sys-recip', name: '알림 수신자 관리', path: '/system/recipient', tag: '신규' },
      { id: 'sys-gloss', name: '용어 사전 관리', path: '/system/glossary', tag: '신규' },
      { id: 'sys-rank', name: '제품군 순위 관리', path: '/system/product-rank', tag: '신규' },
      { id: 'chat-history', name: '자연어 질의 이력', path: '/system/chat-history', tag: '신규' },
      { id: 'sys-audit', name: '보안 감사 로그', path: '/system/audit-log', tag: '신규' },
      { id: 'base-model', name: 'AI 모델 설정', path: '/system/model-config', tag: '신규' },
      { id: 'sys-model-ver', name: 'AI 모델 버전 관리', path: '/system/model-version', tag: '신규' },
      { id: 'ai-agent', name: 'Agent 실행 현황', path: '/system/agent', tag: '신규' },
      { id: 'sys-metric', name: '지표 측정 데이터 관리', path: '/system/metric-standard', tag: '신규' },
      { id: 'sys-dl', name: '보고서 다운로드 이력', path: '/system/download-log', tag: '신규' },
      { id: 'sys-sync', name: '데이터 연동 이력', path: '/system/sync-history', tag: '필수' },
    ],
  },
];

/**
 * 메뉴에 노출되지 않지만 권한 관리 대상인 하위 화면
 * (상위 화면의 버튼·링크로 진입합니다)
 */
export const EXTRA_PAGES = [
  { id: 'daily-history', name: '이전 보고서', path: '/production/daily-report/history', group: '생산관리', parent: 'prod-daily' },
  { id: 'qc-report', name: '품질 보고서', path: '/quality/report', group: '품질관리', parent: 'qc-defect' },
  { id: 'report-forms', name: '보고서 양식 관리', path: '/quality/report-forms', group: '품질관리', parent: 'qc-report' },
  { id: 'rpt-scrap-new', name: '폐기 보고서 작성', path: '/report/scrap/new', group: '보고서', parent: 'rpt-scrap' },
];

/** 접근 권한이 없을 때 이동할 기본 화면 */
export const HOME_SCREEN_ID = 'dash-ai';
export const HOME_PATH = '/dashboard/ai';

/** 권한 관리 대상 화면 목록 (메뉴 + 하위 화면) */
export function permRows() {
  const out = [];
  MENU.forEach((g) => g.items.forEach((it) => out.push({ id: it.id, name: it.name, path: it.path, group: g.group, sub: 0 })));
  EXTRA_PAGES.forEach((e) => out.push({ id: e.id, name: e.name, path: e.path, group: e.group, sub: 1 }));
  return out;
}

/** 화면 ID 로 화면 이름을 찾습니다 */
export function pageName(id) {
  const row = permRows().find((r) => r.id === id);
  return row ? row.name : id;
}

/** 화면 ID 가 속한 메뉴 그룹명 (브레드크럼용) */
export function pageGroup(id) {
  const row = permRows().find((r) => r.id === id);
  return row ? row.group : '—';
}
