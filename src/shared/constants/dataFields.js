/**
 * 데이터 접근 권한 항목 7종 — 기능명세서 ver01 「권한 정의」 1절
 *
 * 메뉴 접근이 허용된 화면이라도, 아래 항목 중 허용되지 않은 것은 '비공개'로 마스킹됩니다.
 * 마스킹은 원칙적으로 API 응답 생성 단계에서 수행되고(응답의 masked 배열로 통보),
 * 프론트는 그 결과를 '비공개' 배지로 렌더링합니다.
 */
export const DATA_FIELDS = [
  { key: 'qty', name: '생산·출하 수량', desc: '투입·양품·불량·출하 수량, 실적 집계' },
  { key: 'yield', name: '수율·불량률', desc: '제품별 수율, 공정 불량률, 달성률, LRR(%)' },
  { key: 'price', name: '단가·금액', desc: '품목 단가, 가공비, 폐기 금액, 원가' },
  { key: 'customer', name: '고객사·거래처', desc: '고객사명, 거래처, 계약 조건' },
  { key: 'plan', name: '출하 계획', desc: '연간·월별 출하 계획 수량' },
  { key: 'mold', name: '금형·설비 상세', desc: '금형 이력, 설비 파라미터, 공정 조건' },
  { key: 'worker', name: '작업자 정보', desc: '사번, 작업자명, 근태·배치' },
];

/** 부서 정의 및 데이터 권한 기본값 — 「권한 정의」 2절 */
export const DEPTS = [
  { id: '품질보증팀', av: 'QA', desc: '품질 입력 · 생산 조회' },
  { id: '생산관리팀', av: 'PC', desc: '생산 전체 · 품질 조회' },
  { id: '제조팀', av: 'MF', desc: '현장 실적 · 비가동 입력' },
  { id: '전산팀', av: 'IT', desc: '기준정보 · 시스템 관리' },
  { id: '경영진', av: 'EX', desc: '지표 · 보고서 열람' },
  { id: '통합관리자', av: 'MA', desc: '전체 메뉴 접근' },
];

/** 부서별 데이터 접근 권한 기본값 ('*' 는 전체 허용) */
export const DATA_SCOPE_DEFAULT = {
  품질보증팀: ['qty', 'yield', 'customer', 'mold'],
  생산관리팀: ['qty', 'yield', 'plan', 'customer', 'mold', 'worker'],
  제조팀: ['qty', 'mold', 'worker'],
  전산팀: ['qty', 'worker'],
  경영진: ['qty', 'yield', 'price', 'customer', 'plan'],
  통합관리자: '*',
};

/** 부서별 메뉴 접근 권한 기본값 — 「권한 정의」 4절 */
export const MENU_ACCESS_DEFAULT = {
  품질보증팀: [
    'dash-ai', 'dash-proc', 'dash-kpi', 'ai-chat', 'chat-history',
    'prod-monitor', 'prod-result',
    'qc-defect', 'qc-aoi',
    'alert-list', 'sys-gloss',
    'rpt-yield-model', 'rpt-lrr-customer', 'rpt-scrap', 'rpt-scrap-new',
  ],
  생산관리팀: [
    'dash-ai', 'dash-proc', 'dash-kpi', 'ai-chat', 'chat-history',
    'prod-monitor', 'prod-result', 'prod-daily', 'daily-history',
    'qc-defect', 'qc-aoi',
    'alert-list', 'sys-gloss',
    'rpt-press-morning', 'rpt-plating-morning', 'rpt-ship-plan', 'rpt-scrap', 'rpt-scrap-new',
  ],
  제조팀: [
    'dash-ai', 'dash-proc', 'ai-chat', 'chat-history',
    'prod-monitor',
    'qc-defect', 'qc-aoi',
    'alert-list', 'sys-gloss',
    'rpt-press-morning', 'rpt-plating-morning',
  ],
  전산팀: [
    'dash-ai', 'dash-proc', 'dash-kpi', 'ai-chat', 'chat-history',
    'alert-list', 'sys-gloss', 'sys-rank',
    'base-model', 'sys-model-ver',
    'sys-account', 'sys-menu', 'sys-data', 'sys-audit', 'ai-agent', 'sys-metric', 'sys-dl', 'sys-sync',
    'alert-cond', 'sys-recip',
  ],
  경영진: [
    'dash-ai', 'dash-proc', 'dash-kpi', 'ai-chat', 'chat-history',
    'prod-result', 'qc-defect',
    'alert-list', 'sys-gloss', 'sys-rank',
    'rpt-ship-plan', 'rpt-yield-model', 'rpt-lrr-customer', 'rpt-scrap', 'rpt-scrap-new',
  ],
  통합관리자: '*',
};

/** Worker Agent 9종 — 「권한 정의」 3절 */
export const AGENT_DEFS = [
  { no: '①', name: '비전 수집', role: 'AOI/비전 이벤트 수집', screens: 'dash-ai, ai-agent' },
  { no: '②', name: '데이터 분류', role: '수집 데이터 정규화·분류', screens: 'qc-defect, ai-chat' },
  { no: '③', name: '불량 판정', role: '양품/불량/경계 판정, HITL 대기 큐', screens: 'qc-aoi, alert-list' },
  { no: '④', name: '원인 분석', role: '공정조건·금형 기여도 분석', screens: 'qc-aoi' },
  { no: '⑤', name: '이력 추적', role: 'LOT 단계별 이력 추적', screens: 'ai-chat' },
  { no: '⑥', name: '보고서 생성', role: '보고서 초안 자동 생성', screens: 'prod-daily' },
  { no: '⑦', name: '보안 필터링', role: '고객사 정책별 마스킹', screens: 'base-model' },
  { no: '⑧', name: 'KG 구축', role: 'Knowledge Graph 노드/엣지 구축', screens: 'ai-chat' },
  { no: '⑨', name: '이상 알림', role: '임계 초과·패턴 이상 감지 및 발송', screens: 'alert-list, alert-cond' },
];
