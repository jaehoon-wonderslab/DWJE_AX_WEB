/**
 * 생산관리 목 데이터 (PR-01 ~ PR-05)
 */
import { LINES } from './masters';

/* ───────── PR-01 생산 모니터링 ───────── */
export const MONITOR_SUMMARY = {
  running: LINES.filter((l) => l.state === '가동').length,
  warning: LINES.filter((l) => l.state === '경고').length,
  stopped: LINES.filter((l) => l.state === '비가동').length,
  total: LINES.length,
  hourlyThroughput: 4486,
  warningDetail: 'PR-03 불량률 초과',
  stoppedDetail: 'PR-05 · 34분 경과',
};

/* ───────── PR-02 실적 집계·조회 ───────── */
export const RESULT_TREND = {
  labels: ['08/18', '08/19', '08/20', '08/21', '08/22', '08/23', '08/24'],
  series: [
    { name: '생산량 (EA)', data: [93110, 102450, 109870, 86320, 104910, 113240, 107680] },
    { name: '불량 수량 (EA)', data: [3170, 3270, 2930, 4310, 3150, 3060, 2800] },
  ],
};

export const RESULT_ROWS = [
  { period: '2026-08-24', inputQty: 107680, okQty: 104880, ngQty: 2800, defectRate: 2.6, uptimeRate: 83.5, downtimeMin: 84 },
  { period: '2026-08-23', inputQty: 113240, okQty: 110180, ngQty: 3060, defectRate: 2.7, uptimeRate: 86.1, downtimeMin: 62 },
  { period: '2026-08-22', inputQty: 104910, okQty: 101760, ngQty: 3150, defectRate: 3.0, uptimeRate: 81.7, downtimeMin: 131 },
  { period: '2026-08-21', inputQty: 86320, okQty: 82010, ngQty: 4310, defectRate: 5.0, uptimeRate: 69.4, downtimeMin: 278 },
  { period: '2026-08-20', inputQty: 109870, okQty: 106940, ngQty: 2930, defectRate: 2.7, uptimeRate: 85.2, downtimeMin: 78 },
  { period: '2026-08-19', inputQty: 102450, okQty: 99180, ngQty: 3270, defectRate: 3.2, uptimeRate: 82.0, downtimeMin: 112 },
  { period: '2026-08-18', inputQty: 93110, okQty: 89940, ngQty: 3170, defectRate: 3.4, uptimeRate: 78.3, downtimeMin: 160 },
];

/* ───────── PR-03 일일 생산현황 보고 ───────── */

/**
 * 보고서 초안 — 섹션 단위로 관리해 담당자가 항목별로 보정할 수 있게 합니다.
 * who: 'auto' 는 Agent 자동 기입, 'draft' 는 담당자 확인 필요 구간입니다.
 */
export const DAILY_DRAFT = {
  reportId: 'DR-20260828',
  targetDate: '2026-08-28',
  version: 1,
  state: '검토 대기',
  periodFrom: '2026-08-27 08:00',
  periodTo: '2026-08-28 08:00',
  generatedAt: '2026-08-28 07:10',
  sections: [
    {
      key: 'result',
      title: '1. 생산 실적',
      who: 'auto',
      body:
        '주력 라인 10대 투입 107,680EA, 양품 104,880EA, 불량 2,800EA로 불량률은 2.6%입니다. ' +
        '전일(2.7%) 대비 0.1%p 낮아졌습니다.',
    },
    {
      key: 'quality',
      title: '2. 품질 이슈',
      who: 'auto',
      body:
        'PR-03에서 금형 교체 직후 42분 구간 불량률이 4.1%까지 상승했습니다. 주 불량 유형은 chip(찍힘)이며, ' +
        '공정조건 상관분석 결과 각도 편차가 주요 기여 변수로 산출되었습니다.',
    },
    {
      key: 'equipment',
      title: '3. 설비 가동',
      who: 'auto',
      body: '가동률 83.5%. PR-05가 금형수리로 34분 정지했고 사유는 미등록 상태입니다.',
    },
    {
      key: 'action',
      title: '4. 조치 필요',
      who: 'draft',
      body:
        '· PR-03 금형 교체 후 초기 조건 재설정 검토\n' +
        '· AOI 경계 케이스 12건 검토 필요\n' +
        '· PR-05 비가동 사유 등록 (가동률 산출 영향)',
    },
  ],
  summary: {
    period: '08-27 08:00 ~ 08-28 08:00',
    lines: 'PR-01 ~ PR-10',
    inputQty: 107680,
    okQty: 104880,
    ngQty: 2800,
    defectRate: 2.6,
    uptimeRate: 83.5,
    alertCnt: 3,
  },
  source: '근거 — MES 생산 이력 · AOI 판정 로그 · 프레스 IoT (2026-08-27 08:00 ~ 08-28 08:00)',
};

export const DAILY_EVENTS = [
  { ts: '2026-08-28 07:10', type: '초안 생성', detail: '⑥ 보고서 생성 Agent · 자동', by: '시스템 (배치)' },
  { ts: '2026-08-27 09:24', type: '확정', detail: '2026-08-27 확정본 v2 · 수치 보정 1건', by: '정우진 (생산관리팀)' },
  { ts: '2026-08-27 07:10', type: '초안 생성', detail: '⑥ 보고서 생성 Agent · 자동', by: '시스템 (배치)' },
  { ts: '2026-08-26 09:02', type: '확정', detail: '2026-08-26 확정본 v1', by: '정우진 (생산관리팀)' },
];

/* ───────── PR-04 이전 보고서 ───────── */
export const DAILY_HISTORY = [
  { reportId: 'DR-20260828', targetDate: '2026-08-28', version: 1, state: '검토 대기', generatedAt: '2026-08-28 07:10', confirmedAt: '', correctionCnt: 0 },
  { reportId: 'DR-20260827', targetDate: '2026-08-27', version: 2, state: '확정', generatedAt: '2026-08-27 07:10', confirmedAt: '2026-08-27 09:24', correctionCnt: 1 },
  { reportId: 'DR-20260826', targetDate: '2026-08-26', version: 1, state: '확정', generatedAt: '2026-08-26 07:10', confirmedAt: '2026-08-26 09:02', correctionCnt: 0 },
  { reportId: 'DR-20260825', targetDate: '2026-08-25', version: 1, state: '확정', generatedAt: '2026-08-25 07:10', confirmedAt: '2026-08-25 08:51', correctionCnt: 0 },
  { reportId: 'DR-20260824', targetDate: '2026-08-24', version: 3, state: '확정', generatedAt: '2026-08-24 07:10', confirmedAt: '2026-08-24 10:12', correctionCnt: 2 },
  { reportId: 'DR-20260823', targetDate: '2026-08-23', version: 1, state: '반려', generatedAt: '2026-08-23 07:10', confirmedAt: '', correctionCnt: 0 },
  { reportId: 'DR-20260822', targetDate: '2026-08-22', version: 1, state: '확정', generatedAt: '2026-08-22 07:10', confirmedAt: '2026-08-22 08:44', correctionCnt: 0 },
];

/* ───────── PR-05 비가동 관리 ───────── */
export const DOWNTIMES = [
  { downtimeId: 'DT-2608280512', eqptCd: 'PR-05', stopAt: '08:12', resumeAt: '', elapsedMin: 34, registered: false, reasonCd: '', reasonNm: '', suggestion: '금형수리 & 금형교체', remark: '' },
  { downtimeId: 'DT-2608280728', eqptCd: 'PR-03', stopAt: '07:28', resumeAt: '07:41', elapsedMin: 13, registered: false, reasonCd: '', reasonNm: '', suggestion: '치수측정 대기', remark: '' },
  { downtimeId: 'DT-2608280602', eqptCd: 'PR-08', stopAt: '06:02', resumeAt: '06:35', elapsedMin: 33, registered: true, reasonCd: 'DT-01', reasonNm: '금형수리 & 금형교체', suggestion: '', remark: '금형 M-2211 교체' },
  { downtimeId: 'DT-2608280419', eqptCd: 'PR-01', stopAt: '04:19', resumeAt: '04:31', elapsedMin: 12, registered: true, reasonCd: 'DT-04', reasonNm: '원재료 교체', suggestion: '', remark: 'Cu 코일 교체' },
  { downtimeId: 'DT-2608280244', eqptCd: 'PR-06', stopAt: '02:44', resumeAt: '03:20', elapsedMin: 36, registered: true, reasonCd: 'DT-03', reasonNm: '설비이상', suggestion: '', remark: '유압 압력 저하' },
];

/** Agent 가 제안하는 비가동 사유 후보 (⑨ 이상 알림 Agent) */
export const DOWNTIME_SUGGESTIONS = {
  'PR-05': [
    { reasonCd: 'DT-01', reasonNm: '금형수리 & 금형교체', confidence: 0.82, basis: '정지 직전 타발수 급감 · 금형 카운터 리셋 신호 수신' },
    { reasonCd: 'DT-03', reasonNm: '설비이상', confidence: 0.11, basis: '유압 센서 이상값 없음' },
    { reasonCd: 'DT-99', reasonNm: '기타', confidence: 0.07, basis: '—' },
  ],
  'PR-03': [
    { reasonCd: 'DT-05', reasonNm: '치수측정 대기', confidence: 0.74, basis: '정지 직전 AOI 경계 판정 급증 · 검사 대기 큐 증가' },
    { reasonCd: 'DT-01', reasonNm: '금형수리 & 금형교체', confidence: 0.18, basis: '금형 교체 이력 42분 전' },
    { reasonCd: 'DT-99', reasonNm: '기타', confidence: 0.08, basis: '—' },
  ],
};
