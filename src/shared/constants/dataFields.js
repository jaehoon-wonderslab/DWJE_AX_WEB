/**
 * 데이터 접근 권한 항목 7종 — 기능명세서 ver01 「권한 정의」 1절
 *
 * 메뉴 접근이 허용된 화면이라도, 아래 항목 중 허용되지 않은 것은 '비공개'로 마스킹됩니다.
 * 마스킹은 원칙적으로 API 응답 생성 단계에서 수행되고(응답의 masked 배열로 통보),
 * 프론트는 그 결과를 '비공개' 배지로 렌더링합니다.
 */
/**
 * `attrs` 는 그 항목에 해당하는 **API 응답 필드명** 입니다.
 *
 * 실제 운영에서는 서버가 `/auth/me` 의 `dataFields` 로 내려주며, 관리자가 화면에서 늘릴 수
 * 있습니다. 여기 값은 서버가 내려주지 않을 때(목 모드·초기 구동)를 위한 기본값입니다 —
 * **화면 코드가 아니라 이 한 곳에만** 적어 두는 것이 요점입니다.
 */
export const DATA_FIELDS = [
  { key: 'qty', name: '생산·출하 수량', desc: '투입·양품·불량·출하 수량, 실적 집계', category: '수량',
    attrs: ['qty', 'okQty', 'ngQty', 'inQty', 'outQty', 'shipQty'] },
  { key: 'yield', name: '수율·불량률', desc: '제품별 수율, 공정 불량률, 달성률, LRR(%)', category: '품질',
    attrs: ['yield', 'yieldRate', 'defectRate', 'lrr'] },
  { key: 'price', name: '단가·금액', desc: '품목 단가, 가공비, 폐기 금액, 원가', category: '원가',
    attrs: ['price', 'unitPrice', 'amount', 'cost', 'unitCost'] },
  { key: 'customer', name: '고객사·거래처', desc: '고객사명, 거래처, 계약 조건', category: '고객',
    attrs: ['customer', 'customerNm', 'bpNm'] },
  { key: 'plan', name: '출하 계획', desc: '연간·월별 출하 계획 수량', category: '계획',
    attrs: ['planQty', 'monthlyPlan'] },
  { key: 'mold', name: '금형·설비 상세', desc: '금형 이력, 설비 파라미터, 공정 조건', category: '설비',
    attrs: ['moldCd', 'moldNm', 'eqptParam'] },
  { key: 'worker', name: '작업자 정보', desc: '사번, 작업자명, 근태·배치', category: '인사',
    attrs: ['workerNm', 'workerNo'] },
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

/**
 * 부서별 데이터 접근 권한 — **목(mock) 모드 전용 기본값** ('*' 는 전체 허용)
 *
 * 실 서버 모드의 기준은 DB `ax.tb_sys_dept_data_perm` 이고 `/auth/me` 의 dataPerms 로 내려옵니다.
 * 목 화면이 실제와 같은 이야기를 하도록 2026-09-23 DB 값 그대로 옮겨 두었습니다.
 */
export const DATA_SCOPE_DEFAULT = {
  품질보증팀: ['qty', 'yield', 'customer', 'mold'],
  생산관리팀: ['qty', 'yield', 'customer', 'plan', 'mold', 'worker'],
  제조팀: ['qty', 'mold', 'worker'],
  전산팀: ['qty', 'worker'],
  경영진: ['qty', 'yield', 'price', 'customer', 'plan', 'mold', 'worker'],
  통합관리자: '*',
};

/**
 * 부서별 메뉴 접근 권한 — **목(mock) 모드 전용 기본값**
 *
 * 실 서버 모드의 기준은 DB `ax.tb_sys_dept_menu_perm`([시스템관리 > 메뉴 접근 권한] 화면)이고
 * `/auth/me` 의 menuPerms 로 내려옵니다. 2026-09-23 DB 값 그대로 옮겨 두었습니다.
 */
export const MENU_ACCESS_DEFAULT = {
  품질보증팀: [
    'ai-chat', 'prod-result', 'qc-defect', 'qc-aoi', 'rpt-yield-model', 'rpt-lrr-customer',
    'rpt-scrap', 'alert-list', 'sys-gloss', 'chat-history',
  ],
  생산관리팀: [
    'ai-chat', 'dash-ai', 'dash-proc', 'prod-monitor', 'prod-result', 'qc-defect', 'qc-aoi',
    'prod-daily', 'rpt-press-morning', 'rpt-plating-morning', 'rpt-ship-plan', 'rpt-scrap',
    'daily-history', 'alert-list', 'sys-gloss', 'chat-history',
  ],
  제조팀: [
    'ai-chat', 'dash-ai', 'dash-proc', 'prod-monitor', 'qc-defect', 'qc-aoi', 'rpt-press-morning',
    'rpt-plating-morning', 'alert-list', 'sys-gloss', 'chat-history',
  ],
  전산팀: [
    'ai-chat', 'dash-ai', 'dash-proc', 'dash-ai-upload', 'alert-list', 'sys-account', 'sys-menu',
    'sys-data', 'alert-cond', 'sys-recip', 'sys-gloss', 'chat-history', 'sys-audit', 'sys-dl',
    'sys-upload-doc', 'sys-sync',
  ],
  경영진: [
    'ai-chat', 'dash-ai', 'dash-proc', 'prod-result', 'qc-defect', 'rpt-ship-plan',
    'rpt-yield-model', 'rpt-lrr-customer', 'rpt-scrap', 'alert-list', 'sys-gloss', 'chat-history',
  ],
  통합관리자: '*',
};
