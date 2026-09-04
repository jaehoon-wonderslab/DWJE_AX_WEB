/**
 * 대시보드 목 데이터 (DB-01 · DB-02 · DB-03)
 */
import { LINES } from './masters';

/* ───────── DB-01 AI 통합 대시보드 ───────── */

export const AI_SUMMARY = {
  defectRate: 2.6,
  defectRateSub: '목표 대비 -0.4%p · 어제 3.0%',
  uptimeRate: 83.5,
  uptimeRateSub: '목표 87.2% 까지 3.7%p',
  todayQty: 107680,
  todayQtySub: '계획 대비 96.2%',
  pendingBorderline: { cnt: 12, maxWaitMin: 23 },
};

export const AI_DEFECT_TREND = {
  labels: ['00', '02', '04', '06', '08', '10', '12', '14'],
  series: [
    { name: '전체 불량률 (%)', data: [2.4, 2.1, 2.6, 3.0, 4.1, 3.4, 2.8, 2.6] },
    { name: 'chip 불량률 (%)', data: [0.8, 0.7, 1.0, 1.3, 2.2, 1.6, 1.1, 0.9] },
  ],
  target: 3.0,
};

export const AI_QUALITY_INDEX = [
  { label: '양품률', value: 88, target: 94 },
  { label: '가동률', value: 84, target: 92 },
  { label: '정시 완료', value: 79, target: 90 },
  { label: '검사 정확도', value: 91, target: 90 },
  { label: '이상 대응', value: 72, target: 88 },
  { label: '데이터 정합', value: 86, target: 95 },
];

export const AI_DEFECT_COMPOSITION = {
  segments: [
    { label: 'chip (찍힘)', value: 1428 },
    { label: 'stain (얼룩)', value: 602 },
    { label: 'BURR', value: 341 },
    { label: '치수 이탈', value: 238 },
    { label: '변형', value: 126 },
    { label: '기타', value: 65 },
  ],
  total: 2800,
  excludedBorderline: 12,
  note: 'AOI 판정 로그 자동 집계 · 경계 판정 12건은 미포함',
};

export const AI_PROCESS_YIELD = {
  target: 97.0,
  items: [
    { process: 'Press', yieldRate: 97.4, level: '' },
    { process: 'A Plating', yieldRate: 98.1, level: '' },
    { process: 'B Plating', yieldRate: 95.2, level: 'warn' },
    { process: 'Coating', yieldRate: 98.6, level: '' },
    { process: '검사·포장', yieldRate: 99.2, level: '' },
  ],
  note: 'B Plating — 도금조 석출 영향으로 목표 미달, 오전 중 재셋업 예정',
};

export const AI_PLAN_VS_ACTUAL = {
  items: [
    { slot: '06', plan: 12400, actual: 12120 },
    { slot: '08', plan: 13600, actual: 13650 },
    { slot: '10', plan: 13600, actual: 13500 },
    { slot: '12', plan: 10200, actual: 10120 },
    { slot: '14', plan: 13600, actual: 13460 },
    { slot: '16', plan: 13600, actual: 13250 },
    { slot: '18', plan: 13600, actual: 12770 },
    { slot: '20', plan: 13600, actual: 12250 },
  ],
  cumPlan: 104200,
  cumActual: 101120,
  rate: 97.0,
};

export const AI_UPTIME_HEATMAP = {
  cols: ['06', '08', '10', '12', '14', '16', '18', '20'],
  rows: LINES.map((l) => l.eqptCd),
  lo: 40,
  hi: 100,
  data: [
    [94, 95, 92, 88, 93, 94, 92, 91],
    [90, 92, 89, 85, 88, 90, 89, 87],
    [72, 68, 54, 49, 63, 71, 70, 69],
    [88, 90, 87, 84, 86, 88, 87, 86],
    [86, 84, 45, 42, 78, 82, 84, 83],
    [91, 93, 90, 86, 90, 91, 90, 89],
    [89, 88, 86, 82, 85, 87, 86, 85],
    [92, 94, 91, 87, 91, 92, 91, 90],
    [85, 87, 84, 80, 83, 85, 84, 83],
    [90, 91, 88, 85, 89, 90, 88, 87],
  ],
  note: '진한 칸일수록 가동률이 낮은 구간입니다.',
};

/** 이상 알림 요약 (최근 24시간) */
export const ALERT_SUMMARY = [
  { level: 'red', title: 'PR-03 불량률 임계 초과', desc: '최근 2시간 4.1% (임계 3.0%) · 금형 교체 후 42분 경과', elapsed: '8분 전', agent: '⑨ 이상 알림' },
  { level: 'amber', title: 'AOI-07 경계 판정 누적', desc: '경계 케이스 12건 미검토 · HITL 대기', elapsed: '23분 전', agent: '③ 불량 판정' },
  { level: 'amber', title: 'PR-05 비가동 사유 미등록', desc: '정지 34분 경과, 사유 미입력 (가동률 산출 영향)', elapsed: '41분 전', agent: '⑨ 이상 알림' },
  { level: 'gray', title: '일일 보고서 초안 생성 완료', desc: '2026-08-27 08:00 ~ 08-28 08:00 집계', elapsed: '1시간 전', agent: '⑥ 보고서 생성' },
];

/** Agent 작동 현황 */
export const AGENTS = [
  { no: '①', name: '비전 수집', state: '정상', last: '2초 전', load: '1,204 evt/min' },
  { no: '②', name: '데이터 분류', state: '정상', last: '3초 전', load: '318 건/min' },
  { no: '③', name: '불량 판정', state: '정상', last: '5초 전', load: '경계 12건 대기' },
  { no: '④', name: '원인 분석', state: '실행중', last: '진행 중', load: 'PR-03 분석' },
  { no: '⑤', name: '이력 추적', state: '대기', last: '12분 전', load: '-' },
  { no: '⑥', name: '보고서 생성', state: '대기', last: '1시간 전', load: '-' },
  { no: '⑦', name: '보안 필터링', state: '정상', last: '1시간 전', load: '마스킹 38건' },
  { no: '⑧', name: 'KG 구축', state: '정상', last: '6분 전', load: '노드 +24' },
  { no: '⑨', name: '이상 알림', state: '정상', last: '8분 전', load: '24h 상시' },
];

export const MASTER_AI = { state: '정상', mode: '자동 운영' };

/* ───────── DB-03 성과지표 대시보드 ───────── */

/** 사업 성과지표 3종 */
export const KPI_CARDS = [
  {
    key: 'defect',
    title: 'KPI ① 공정 불량률',
    sub: '가중치 0.4 · 주력 라인 10대',
    progress: 35,
    level: 'warn',
    current: '14.8%',
    before: '16.2%',
    target: '12.2%',
  },
  {
    key: 'manhour',
    title: 'KPI ② 작업공수 지수',
    sub: '가중치 0.3 · 품질관리·보고',
    progress: 56,
    level: 'ok',
    current: '72 지수',
    before: '100 (기준선)',
    target: '50',
  },
  {
    key: 'uptime',
    title: 'KPI ③ 설비 가동률',
    sub: '가중치 0.3 · IoT 부착 10대',
    progress: 58,
    level: 'ok',
    current: '83.5%',
    before: '78.4%',
    target: '87.2%',
  },
];

export const KPI_TREND = {
  labels: ['4월', '5월', '6월', '7월', '8월'],
  series: [
    { name: '공정 불량률 (낮을수록 개선)', data: [103.7, 101.9, 101.2, 100, 91.4] },
    { name: '설비 가동률 (높을수록 개선)', data: [98.3, 99.4, 99.7, 100, 106.5] },
    { name: '작업공수 (낮을수록 개선)', data: [100, 100, 99, 100, 72] },
  ],
  note: '4~7월은 구축 전 실측 기준선, 8월부터 구축 후 측정값입니다.',
};

/** 불량 유형 분포 (월 누계) */
export const DEFECT_DISTRIBUTION = [
  { type: 'chip (찍힘)', cnt: 412, rate: 34.1, trend: '-2.1%p' },
  { type: 'stain (얼룩)', cnt: 268, rate: 22.2, trend: '+0.6%p' },
  { type: 'bend (변형)', cnt: 201, rate: 16.6, trend: '-1.2%p' },
  { type: 'welding (용접)', cnt: 154, rate: 12.7, trend: '-0.4%p' },
  { type: '미도금', cnt: 98, rate: 8.1, trend: '+1.1%p' },
  { type: '도장이물', cnt: 75, rate: 6.2, trend: '-0.3%p' },
];

export const DEFECT_MONTHLY = [
  { l: '4월', v: 498, v2: 302 },
  { l: '5월', v: 471, v2: 288 },
  { l: '6월', v: 465, v2: 279 },
  { l: '7월', v: 452, v2: 274 },
  { l: '8월', v: 412, v2: 268 },
];

export const AI_PERF_AXES = [
  { label: '분류 정확도', value: 91, target: 90 },
  { label: '상관분석', value: 86, target: 85 },
  { label: '이상 감지율', value: 88, target: 90 },
  { label: '보고서 수용도', value: 84, target: 80 },
  { label: '의도 파악', value: 83, target: 85 },
  { label: '응답 속도', value: 90, target: 85 },
];

export const MANHOUR_BY_DEPT = [
  { l: '품질보증팀', v: 64 },
  { l: '생산관리팀', v: 71 },
  { l: '제조팀', v: 88, cls: 'warn' },
  { l: '공정기술팀', v: 76 },
  { l: '전산팀', v: 59 },
];

export const KPI_ACHIEVE_TREND = {
  labels: ['4월', '5월', '6월', '7월', '8월'],
  data: [0, 2, 4, 8, 49],
  note: 'KPI① 0.4 + KPI② 0.3 + KPI③ 0.3 가중 합산. 8월 구축 후 49% 달성했습니다.',
};

export const AI_GOAL_DONUT = [
  { label: '충족', value: 3 },
  { label: '진행 중', value: 2 },
];

export const METRIC_HEATMAP = {
  cols: ['4월', '5월', '6월', '7월', '8월', '9월(예상)', '10월(목표)'],
  rows: ['공정 불량률', '작업공수 지수', '설비 가동률', '수율', 'LRR'],
  data: [
    [0, 8, 12, 20, 35, 48, 62],
    [0, 0, 4, 0, 56, 64, 72],
    [0, 12, 16, 20, 58, 66, 74],
    [0, 10, 14, 22, 40, 52, 64],
    [0, 6, 8, 14, 30, 44, 58],
  ],
  note: '각 지표의 목표 진척도(%)입니다. 4~7월은 구축 전 기준선 구간이라 진척이 없고, 8월부터 반영됩니다. 9·10월은 현재 추세 기준 추정치입니다.',
};

export const AI_PERF_GOALS = [
  { item: '불량 유형 분류 정확도', target: '90% 이상', current: '91.4%', method: '실제 AOI 판정 대비 샘플링 월 300건', state: '충족' },
  { item: '공정조건-불량 상관분석 정확도', target: '85% 이상', current: '86.2%', method: '과거 불량 이력 데이터셋 (학습 80/검증 20)', state: '충족' },
  { item: '이상 알림 감지율', target: '90% 이상', current: '88.0%', method: '파일럿 기간 실제 이벤트 대비 감지 건수', state: '진행' },
  { item: '보고서 초안 수용도', target: '4.0 / 5점', current: '4.2', method: '담당자 5인 · 보고서 각 30건 이상', state: '충족' },
  { item: '자연어 질의 의도 파악 정확도', target: '85% 이상', current: '82.6%', method: '현장 빈출 질의 50개', state: '진행' },
];

/** KPI 측정 기준 (측정 기준 보기 모달) */
export const KPI_BASIS = [
  ['KPI ① 공정 불량률', '(불량 수량 ÷ 투입 수량) × 100 · 주력 라인 10대 · 일 마감 집계'],
  ['KPI ② 작업공수 지수', '(구축 후 작업시간 ÷ 구축 전 작업시간) × 100 · 품질집계·보고서 작성 업무 기준'],
  ['KPI ③ 설비 가동률', '(실가동 시간 ÷ 조업 가능 시간) × 100 · IoT 부착 프레스 10대'],
  ['가중 달성률', 'KPI① 0.4 + KPI② 0.3 + KPI③ 0.3'],
  ['기준선', 'KPI ②③ 은 구축 전 1개월 사전 실측값을 기준선(=100)으로 사용'],
];
