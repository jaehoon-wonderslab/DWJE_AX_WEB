/**
 * 메뉴 정의 — 기능명세서 ver01 「화면정의」 시트 기준
 *
 * 메뉴 항목 하나 = 라우트 하나 = 소스 파일 하나 입니다.
 *  · id     : 권한 판정 키 (API 명세의 화면 ID — 절대 바꾸지 않습니다)
 *  · path   : 실제 URL 경로 (app/ 폴더의 라우트 파일 위치와 일치)
 *  · hidden : 그룹을 사이드바에 그리지 않음 (권한·허브·브레드크럼에는 남습니다)
 *  · single : 사이드바에 그룹 한 줄만 그리고 하위 항목은 허브 화면(드롭다운)에서 고름
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
    items: [{ id: 'ai-chat', name: '덕파트장 AI', path: '/ai/chat', tag: '신규' }],
  },
  {
    group: '대시보드',
    hubPath: '/menu/dashboard',
    items: [
      { id: 'dash-ai', name: 'AI 통합 대시보드', path: '/dashboard/ai', tag: '신규', description: '생산·품질 현황과 AI 분석 결과를 통합해 확인합니다.' },
      { id: 'dash-proc', name: '공정 및 제품 대시보드', path: '/dashboard/process', tag: '신규', description: '공정과 제품별 생산 실적·품질 지표를 비교합니다.' },
      // 생산관리에 있던 화면 — 실시간 현황판 성격이라 대시보드 묶음으로 옮겼습니다 (경로·화면 ID 는 그대로)
      { id: 'prod-monitor', name: '생산 모니터링', path: '/production/monitor', tag: '수정', description: '설비별 생산 진행 상태와 가동 현황을 실시간으로 확인합니다.' },
    ],
  },
  {
    // 생산관리 · 품질관리 두 그룹을 하나로 합쳤습니다 (2026-09-09). 경로·화면 ID 는 그대로입니다.
    group: '생산 및 품질 관리',
    hubPath: '/menu/operation',
    items: [
      { id: 'prod-result', name: '실적 집계·조회', path: '/production/result', tag: '수정', description: 'MES 생산 실적을 기간·제품·공정별로 집계해 조회합니다.' },
      { id: 'qc-defect', name: '불량 현황 조회', path: '/quality/defect', tag: '신규', description: '기간·공정·불량 유형별 발생 현황과 추이를 확인합니다.' },
      { id: 'qc-aoi', name: 'AOI 판정 분석', path: '/quality/aoi', tag: '수정', description: 'AOI 판정 결과와 불량 상세·불량 이미지(NAS)를 확인하고 이상 가능성을 분석합니다.' },
    ],
  },
  {
    group: '보고서',
    hubPath: '/menu/report',
    // 사이드바에는 보고서 이름을 나열하지 않고 "보고서" 한 줄만 둡니다 — 개별 보고서는 /menu/report 의 드롭다운에서 고릅니다
    single: true,
    items: [
      // 생산관리에 있던 화면 — 작성·제출하는 보고서라 보고서 묶음으로 옮겼습니다
      { id: 'prod-daily', name: '일일 생산현황 보고', path: '/production/daily-report', tag: '신규', description: '하루 생산 실적을 집계해 일일 보고서를 작성합니다.' },
      { id: 'rpt-press-morning', name: '아침회의 자료 (PRESS)', path: '/report/press-morning', tag: '신규', description: 'PRESS 공정의 목표 대비 실적과 주간 누적 달성률을 정리합니다.' },
      { id: 'rpt-plating-morning', name: '아침회의 자료 (Plating·Coating)', path: '/report/plating-morning', tag: '신규', description: 'Plating·Coating 라인의 실적과 주요 이슈를 회의 자료로 정리합니다.' },
      { id: 'rpt-ship-plan', name: '연간 출하계획', path: '/report/ship-plan', tag: '신규', description: '모델·고객사·월별 연간 출하계획을 조회하고 관리합니다.' },
      { id: 'rpt-yield-model', name: '제품별 수율', path: '/report/yield-by-model', tag: '신규', description: '제품별 투입·양품 실적과 월간 수율을 확인합니다.' },
      { id: 'rpt-lrr-customer', name: '고객사별 LRR', path: '/report/lrr-by-customer', tag: '신규', description: '고객사별 출하 수량 대비 라인 불량률과 유형을 분석합니다.' },
      { id: 'rpt-scrap', name: '폐기 보고서', path: '/report/scrap', tag: '신규', description: '공정별 폐기 수량과 금액을 집계해 결재 보고서를 작성합니다.' },
    ],
  },
  {
    group: '이상 알림',
    hubPath: '/menu/alert',
    // 사이드바에는 내지 않습니다 — 상단의 종(알림) 버튼으로 들어갑니다. 권한·라우트·브레드크럼은 그대로입니다.
    hidden: true,
    items: [{ id: 'alert-list', name: '알림 목록·상세', path: '/alert/list', tag: '신규', description: '임계값 초과와 패턴 이상 알림을 조회하고 처리 상태를 관리합니다.' }],
  },
  {
    group: '시스템관리',
    hubPath: '/menu/system',
    items: [
      { id: 'sys-account', name: '계정 관리', path: '/system/account', tag: '신규', description: '사용자 계정과 소속 부서·사용 상태를 관리합니다.' },
      { id: 'sys-menu', name: '메뉴 접근 권한', path: '/system/menu-perm', tag: '신규', description: '부서별로 접근할 수 있는 화면 메뉴를 지정합니다.' },
      { id: 'sys-data', name: '데이터 접근 권한', path: '/system/data-perm', tag: '신규', description: '부서별로 열람할 수 있는 데이터 항목을 지정합니다.' },
      { id: 'alert-cond', name: '이상 알림 발송 조건 관리', path: '/system/alert-condition', tag: '신규', description: '이상 알림의 발생 기준·대상·발송 조건을 관리합니다.' },
      { id: 'sys-recip', name: '알림 수신자 관리', path: '/system/recipient', tag: '신규', description: '알림 수신 그룹과 연락처·대리 수신자를 관리합니다.' },
      { id: 'sys-gloss', name: '용어 사전 관리', path: '/system/glossary', tag: '신규', description: '공식 용어와 현장 유사어를 등록하고 관리합니다.' },
      { id: 'sys-rank', name: '제품군 순위 관리', path: '/system/product-rank', tag: '신규', description: '제품군과 제품의 우선순위·정렬 순서를 관리합니다.' },
      { id: 'chat-history', name: '자연어 질의 이력', path: '/system/chat-history', tag: '신규', description: '사용자의 자연어 질의와 AI 응답 이력을 조회합니다.' },
      { id: 'sys-audit', name: '보안 감사 로그', path: '/system/audit-log', tag: '신규', description: '사용자 접속·데이터 접근·보안 처리 이력을 확인합니다.' },
      { id: 'base-model', name: 'AI 모델 설정', path: '/system/model-config', tag: '신규', description: 'AI Agent별 임계치와 분류·보안 필터 기준을 설정합니다.' },
      { id: 'sys-model-ver', name: 'AI 모델 버전 관리', path: '/system/model-version', tag: '신규', description: 'AI 모델과 벡터 인덱스 버전을 등록하고 서비스 버전을 관리합니다.' },
      { id: 'ai-agent', name: 'Agent 실행 현황', path: '/system/agent', tag: '신규', description: 'Master AI와 Worker Agent의 작동 상태를 확인합니다.' },
      { id: 'sys-metric', name: '지표 측정 데이터 관리', path: '/system/metric-standard', tag: '신규', description: '장애·불량 판정에 사용하는 기준 수치와 임계값을 관리합니다.' },
      { id: 'sys-dl', name: '보고서 다운로드 이력', path: '/system/download-log', tag: '신규', description: '사용자별 보고서·화면 파일 다운로드 이력을 조회합니다.' },
      { id: 'sys-upload-doc', name: '업로드 문서 목록', path: '/system/upload-doc', tag: '신규', description: 'AI 통합 대시보드 업로드 리포트에 올라온 엑셀 문서와 버전 이력을 조회합니다(읽기 전용).' },
      { id: 'sys-sync', name: '데이터 연동 이력', path: '/system/sync-history', tag: '필수', description: 'MES에서 AX 계층으로 이관된 데이터 연동 결과와 오류를 확인합니다.' },
    ],
  },
];

/**
 * 메뉴에 노출되지 않지만 권한 관리 대상인 하위 화면
 * (상위 화면의 버튼·링크로 진입합니다)
 */
export const EXTRA_PAGES = [
  // 동작 권한 — 화면이 아니라 '업로드' 동작. 경로에 #upload 를 붙여 실제 라우트와 겹치지 않게 합니다 (check-routes 는 무시)
  { id: 'dash-ai-upload', name: '업로드 리포트 업로드', path: '/dashboard/ai#upload', group: '대시보드', parent: 'dash-ai', action: true },
  { id: 'daily-history', name: '이전 보고서', path: '/production/daily-report/history', group: '보고서', parent: 'prod-daily' },
];

/** 보고서 그룹 항목 — 보고서 화면(/menu/report)의 드롭다운이 씁니다 */
export const reportItems = () => MENU.find((g) => g.group === '보고서')?.items || [];

/** 로그인 직후·권한이 없을 때 이동할 기본 화면 — 자연어 질의 */
export const HOME_SCREEN_ID = 'ai-chat';
export const HOME_PATH = '/ai/chat';

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
