/**
 * 보고서 목 데이터 (RP-01 ~ RP-07)
 *
 * 원본은 생산관리팀·품질보증팀이 쓰는 실제 엑셀 양식이며, 프로토타입의 reports/*.js 값을 그대로 옮겼습니다.
 */

/* ───────── RP-01 아침회의 자료 (PRESS) ───────── */

/** 신호등 규칙 — 달성률 95% 이상 정상 / 95% 미만 주의 / 85% 미만 위험 */
export function signalOf(rate) {
  if (rate >= 95) return { label: '정상', tone: 'ok' };
  if (rate >= 85) return { label: '주의', tone: 'warn' };
  return { label: '위험', tone: 'bad' };
}

/** 단위 k = 천 EA */
export const PRESS_MORNING_ROWS = [
  { model: 'KRIOS', dayTarget: 442, dayActual: 524, weekTarget: 1326, weekActual: 1533, impactEqptCnt: 6, decision: '-', dri: '제조1', due: '8/23' },
  { model: 'EOS-S', dayTarget: 518, dayActual: 615, weekTarget: 1555, weekActual: 1861, impactEqptCnt: 8, decision: '-', dri: '제조1', due: '8/23' },
  { model: 'EOS-SC', dayTarget: 374, dayActual: 430, weekTarget: 1123, weekActual: 1256, impactEqptCnt: 6, decision: '-', dri: '제조2', due: '8/23' },
  { model: 'BOI', dayTarget: 475, dayActual: 475, weekTarget: 1900, weekActual: 1917, impactEqptCnt: 9, decision: '-', dri: '제조3', due: '8/23' },
  { model: 'MEM-B', dayTarget: 369, dayActual: 411, weekTarget: 1108, weekActual: 1223, impactEqptCnt: 7, decision: '-', dri: '제조2', due: '8/23' },
  { model: 'MEM-S', dayTarget: 384, dayActual: 395, weekTarget: 1152, weekActual: 1267, impactEqptCnt: 8, decision: '-', dri: '제조2', due: '8/23' },
  {
    model: 'EOS-S (2차)', dayTarget: 402, dayActual: 372, weekTarget: 1206, weekActual: 1168, impactEqptCnt: 5,
    decision: '소재 입고 지연 2일 — 8/22 오전 보충 입고 확인 후 잔업 투입', dri: '제조2', due: '8/23',
  },
  {
    model: 'BOI-N', dayTarget: 268, dayActual: 219, weekTarget: 804, weekActual: 701, impactEqptCnt: 4,
    decision: 'PR-03 금형 교체 후 각도 편차 — 오전 중 재셋업', dri: '제조3', due: '8/23',
  },
];

export const PRESS_MORNING_DECISIONS = [
  { team: '제조1', action: 'KRIOS·EOS-S 초과 달성분 재고 이관 — 후공정 대기 물량 사전 배분', model: 'KRIOS / EOS-S', eqpt: 'Press 14대', due: '8/23', state: '정상' },
  { team: '제조2', action: 'EOS-S(2차) 소재 입고 지연 대응 — 8/22 오전 입고 확인 후 잔업 편성', model: 'EOS-S (2차)', eqpt: 'Press 5대', due: '8/23', state: '주의' },
  { team: '제조2', action: 'MEM-B·MEM-S 주간 달성률 110% 유지 — 금형 예방점검 일정 조정', model: 'MEM-B / MEM-S', eqpt: 'Press 15대', due: '8/23', state: '정상' },
  { team: '제조3', action: 'PR-03 금형 교체 후 각도 편차 재셋업 — 오전 중 초물 승인 재실시', model: 'BOI-N', eqpt: 'Press 4대', due: '8/23', state: '위험' },
  { team: '제조3', action: 'BOI 라인 100.1% 달성 — 잔여 오더 대비 야간조 인원 1명 재배치', model: 'BOI', eqpt: 'Press 9대', due: '8/23', state: '검토' },
];

/* ───────── RP-02 아침회의 자료 (Plating·Coating) ───────── */

export const PLATING_MORNING_ROWS = [
  { state: '위험', process: 'B Plating', item: 'BOI', dayTarget: '170k', dayActual: '105k', rate: '62.0%', weekTarget: '680k', weekActual: '481k', weekRate: '70.9%', scope: '-', decision: 'JIG라인 도금조 석출 발생으로 가동중단 / 미달성 수량 주말 작업진행', dri: '', due: '8/23' },
  { state: '정상', process: 'B Plating', item: 'KRIOS', dayTarget: '509k', dayActual: '538k', rate: '105.7%', weekTarget: '2,039k', weekActual: '2,121k', weekRate: '104.0%', scope: '-', decision: '-', dri: '-', due: '8/23' },
  { state: '정상', process: 'B Plating', item: 'EOS-S', dayTarget: '431k', dayActual: '487k', rate: '113.0%', weekTarget: '1,726k', weekActual: '1,821k', weekRate: '105.5%', scope: '-', decision: '-', dri: '-', due: '8/23' },
  { state: '정상', process: 'B Plating', item: 'MEM-B', dayTarget: '50k', dayActual: '49k', rate: '99.6%', weekTarget: '100k', weekActual: '95k', weekRate: '95.9%', scope: '-', decision: '-', dri: '-', due: '8/23' },
  { state: '정상', process: 'B Plating', item: 'MEM-S', dayTarget: '93k', dayActual: '94k', rate: '100.9%', weekTarget: '374k', weekActual: '377k', weekRate: '100.7%', scope: '-', decision: '-', dri: '-', due: '8/23' },
  { state: '정상', process: 'A Plating', item: 'BOI', dayTarget: '320k', dayActual: '391k', rate: '122.2%', weekTarget: '1,281k', weekActual: '1,482k', weekRate: '115.7%', scope: '-', decision: '-', dri: '-', due: '8/23' },
  { state: '정상', process: 'A Plating', item: 'EOS-SC', dayTarget: '383k', dayActual: '381k', rate: '99.5%', weekTarget: '1,150k', weekActual: '1,144k', weekRate: '99.5%', scope: '-', decision: '-', dri: '-', due: '8/23' },
  { state: '정상', process: 'A Plating', item: 'MEM-B', dayTarget: '400k', dayActual: '381k', rate: '95.3%', weekTarget: '1,500k', weekActual: '1,472k', weekRate: '98.2%', scope: '-', decision: '-', dri: '-', due: '8/23' },
  { state: '정상', process: 'A Plating', item: 'MEM-S', dayTarget: '374k', dayActual: '378k', rate: '101.0%', weekTarget: '1,497k', weekActual: '1,503k', weekRate: '100.4%', scope: '-', decision: '-', dri: '-', due: '8/23' },
  { state: '정상', process: 'Coating', item: 'KRIOS', dayTarget: '175k', dayActual: '182k', rate: '104.1%', weekTarget: '702k', weekActual: '690k', weekRate: '98.4%', scope: '-', decision: '-', dri: '-', due: '8/23' },
  { state: '정상', process: 'Coating', item: 'MEM-S', dayTarget: '455k', dayActual: '455k', rate: '100.1%', weekTarget: '1,821k', weekActual: '1,804k', weekRate: '99.1%', scope: '-', decision: '-', dri: '-', due: '8/23' },
];

export const PLATING_MORNING_TOTAL = {
  state: '합계', process: '전 공정', item: '11개 라인',
  dayTarget: '3,360k', dayActual: '3,441k', rate: '102.4%',
  weekTarget: '12,870k', weekActual: '12,990k', weekRate: '100.9%',
  scope: '27 / 28대', decision: '위험 1건', dri: '-', due: '-',
};

export const PLATING_PROCESS_SUMMARY = [
  { process: 'B Plating', lines: 'BOI · KRIOS · EOS-S · MEM-B · MEM-S', dayTarget: '1,253k', dayActual: '1,273k', dayRate: '101.6%', weekRate: '99.5%', eqpt: '11 / 12대', note: '위험 1', noteTone: 'red' },
  { process: 'A Plating', lines: 'BOI · EOS-SC · MEM-B · MEM-S', dayTarget: '1,477k', dayActual: '1,531k', dayRate: '103.7%', weekRate: '103.2%', eqpt: '10 / 10대', note: '주의 1', noteTone: 'amber' },
  { process: 'Coating', lines: 'KRIOS · MEM-S', dayTarget: '630k', dayActual: '637k', dayRate: '101.1%', weekRate: '98.9%', eqpt: '6 / 6대', note: '정상', noteTone: 'green' },
  { process: '합계', lines: '11개 라인', dayTarget: '3,360k', dayActual: '3,441k', dayRate: '102.4%', weekRate: '100.9%', eqpt: '27 / 28대', note: '-', noteTone: '' },
];

/* ───────── RP-03 연간 출하계획 ───────── */

/** 회계연도 2026년 — 8월 시작 12개월 */
export const SHIP_PLAN_MONTHS = ['8월', '9월', '10월', '11월', '12월', '1월', '2월', '3월', '4월', '5월', '6월', '7월'];

export const SHIP_PLAN_DATA = [
  {
    code: 'MD001', alias: 'KRIOS',
    rows: [
      { customer: 'A comp', total: 19735723, monthly: [6701400, 4077900, 3356403, 2729500, 1365000, 2397817, 2845120, 3110470, 1982340, 2674905, 3268410, 2140660] },
      { customer: 'B comp', total: 30949483, monthly: [6904890, 4300733, 8037401, 1814874, 1748925, 3031469, 2760540, 4118300, 3502760, 2935180, 4047620, 3310455] },
    ],
  },
  {
    code: 'MD002', alias: 'EOS-S',
    rows: [
      { customer: 'A comp', total: 19654895, monthly: [6450000, 4737814, 3479057, 2755516, 1740508, 2018044, 3024780, 2441930, 3318650, 2107420, 2890315, 3455900] },
      { customer: 'B comp', total: 30817908, monthly: [4416000, 4151272, 6016993, 3355630, 5207013, 1581389, 4802110, 3265470, 5110880, 4376220, 3948760, 4530145] },
    ],
  },
  {
    code: 'MD003', alias: 'EOS-SC',
    rows: [
      { customer: 'A comp', total: 20379798, monthly: [5598000, 1504189, 3514767, 2516248, 1873593, 2352156, 2715640, 3180290, 2046870, 3392150, 2584730, 1975410] },
      { customer: 'B comp', total: 29479541, monthly: [8376000, 7642442, 4628456, 6826972, 1735671, 4204180, 5140320, 6205780, 4873640, 5516290, 3942105, 6318470] },
    ],
  },
  {
    code: 'MD004', alias: 'BOI',
    rows: [
      { customer: 'A comp', total: 27542266, monthly: [5700000, 5563148, 4536439, 3696286, 2586393, 2098000, 4215880, 3672940, 5108260, 4466510, 3905720, 4730150] },
      { customer: 'B comp', total: 26751829, monthly: [2983200, 5282057, 4443714, 4529400, 4406258, 4327768, 3845610, 4290370, 3517240, 4962180, 4108930, 3674520] },
    ],
  },
];

/* ───────── RP-04 제품별 수율 ───────── */

/** Loss 세부 컬럼 정의 — 원본 엑셀 그대로 */
export const YIELD_LOSS_A = ['품질검사', '재료성(소재불량)', '스크래치', '찍힘', '치수', 'BURR', '변형', 'Try/초품'];
export const YIELD_LOSS_B = ['얼룩', '기타'];
export const YIELD_LOSS_C = ['자주검사'];
export const YIELD_MGMT = ['도면치수NG', '불용재고', '신규 불용폐기'];

export const YIELD_ROWS = [
  { model: 'KRIOS', input: '10,353,745', good: '10,278,770', ng: '74,975', ngRate: '0.7%', yieldRate: '99.3%', lossA: ['101,580', '600', '-', '54,950', '-', '7,275', '1,150', '43,990'], lossB: ['-', '11,000'], lossC: ['-'] },
  { model: 'EOS-S', input: '10,304,680', good: '10,244,905', ng: '59,775', ngRate: '0.6%', yieldRate: '99.4%', lossA: ['99,553', '6,300', '-', '25,650', '25', '7,250', '2,000', '86,450'], lossB: ['-', '18,550'], lossC: ['1,942'] },
  { model: 'EOS-SC', input: '708,884', good: '708,484', ng: '400', ngRate: '0.1%', yieldRate: '99.9%', lossA: ['5,134', '-', '-', '-', '400', '-', '-', '12,650'], lossB: ['-', '-'], lossC: ['-'] },
  { model: 'BOI', input: '1,808,980', good: '1,807,780', ng: '1,200', ngRate: '0.1%', yieldRate: '99.9%', lossA: ['5,780', '-', '-', '-', '-', '-', '-', '2,000'], lossB: ['-', '1,200'], lossC: ['-'] },
  { model: 'MEM-B', input: '12,207,468', good: '11,964,987', ng: '242,481', ngRate: '2.0%', yieldRate: '98.0%', lossA: ['57,237', '-', '-', '181,210', '43,851', '11,500', '-', '7,500'], lossB: ['-', '5,920'], lossC: ['250'] },
  { model: 'MEM-S', input: '6,128,386', good: '5,991,585', ng: '136,801', ngRate: '2.2%', yieldRate: '97.8%', lossA: ['28,785', '-', '-', '123,500', '9,401', '-', '-', '2,800'], lossB: ['-', '3,900'], lossC: ['-'] },
];

export const YIELD_TOTAL = {
  input: '98,090,363', good: '97,202,170', ng: '888,193', ngRate: '0.9%', yieldRate: '99.1%',
  lossA: ['612,789', '18,100', '-', '641,019', '104,895', '32,805', '16,500', '533,739'],
  lossB: ['-', '74,874'], lossC: ['2,492'], mgmt: ['-', '-', '-'],
};

export const YIELD_LOSS_MIX = [
  ['품질검사', 612789], ['찍힘', 641019], ['치수', 104895], ['BURR', 32805],
  ['변형', 16500], ['Try/초품', 533739], ['기타', 74874],
];

/* ───────── RP-05 고객사별 LRR ───────── */

export const LRR_MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
export const LRR_QUARTERS = ['1Q', '2Q', '3Q', '4Q'];

/** 불량 유형별 고객사 통보 건수 (null = 값 없음 → '-' 로 표기) */
export const LRR_BY_DEFECT = [
  { name: '찍힘(Chip)', y25: 4, y26: null, quarters: [null, null, null, null], months: [null, null, null, null, null, null, null, null, null, null, null, null] },
  { name: '얼룩(Stain)', y25: null, y26: null, quarters: [null, null, null, null], months: [null, null, null, null, null, null, null, null, null, null, null, null] },
  { name: '치수 이탈', y25: null, y26: null, quarters: [null, null, null, null], months: [null, null, null, null, null, null, null, null, null, null, null, null] },
  { name: 'BURR', y25: null, y26: null, quarters: [null, null, null, null], months: [null, null, null, null, null, null, null, null, null, null, null, null] },
  { name: '변형', y25: 2, y26: null, quarters: [null, null, null, null], months: [null, null, null, null, null, null, null, null, null, null, null, null] },
  { name: '도금 불량', y25: 1, y26: 1, quarters: [null, 1, null, null], months: [null, null, null, null, null, 1, null, null, null, null, null, null] },
  { name: '미도금', y25: 1, y26: null, quarters: [null, null, null, null], months: [null, null, null, null, null, null, null, null, null, null, null, null] },
];

export const LRR_PERCENT_ROW = {
  y25: '0.36%', y26: '0.12%',
  quarters: ['0.00%', '0.33%', '0.00%', '-'],
  months: ['0.00%', '0.00%', '0.00%', '0.00%', '0.00%', '0.93%', '0.00%', '-', '-', '-', '-', '-'],
};

export const LRR_DEFECT_TOTAL = { y25: 8, y26: 1, quarters: [null, 1, null, null], months: [null, null, null, null, null, 1, null, null, null, null, null, null] };

/** 고객사별 월 출하수량 / LRR 수량 (8~12월 미집계) */
export const LRR_BY_CUSTOMER = [
  { name: 'A comp', ship: [30, 22, 17, 27, 24, 24, 42, null, null, null, null, null], lrr: [null, null, null, null, null, null, null, null, null, null, null, null] },
  { name: 'B comp', ship: [14, 12, 14, 9, 17, 21, 44, null, null, null, null, null], lrr: [null, null, null, null, null, null, null, null, null, null, null, null] },
  { name: 'C comp', ship: [16, 5, 9, 2, 1, null, 8, null, null, null, null, null], lrr: [null, null, null, null, null, null, null, null, null, null, null, null] },
  { name: 'D comp', ship: [11, 16, 30, 5, 4, 3, 3, null, null, null, null, null], lrr: [null, null, null, null, null, null, null, null, null, null, null, null] },
  { name: 'E comp', ship: [18, 13, 23, 12, 15, 20, 21, null, null, null, null, null], lrr: [null, null, null, null, null, null, null, null, null, null, null, null] },
  { name: 'F comp', ship: [32, 12, 19, 7, 15, 19, 20, null, null, null, null, null], lrr: [null, null, null, null, null, 1, null, null, null, null, null, null] },
  { name: 'G comp', ship: [36, 13, 35, 30, 30, 20, 27, null, null, null, null, null], lrr: [null, null, null, null, null, null, null, null, null, null, null, null] },
];

/** 분기 합계 (원본 집계표 기준 — 4Q 미집계) */
export const LRR_QUARTER_TOTAL = [
  { ship: 397, lrr: '-', rate: '0.0%' },
  { ship: 305, lrr: '1', rate: '0.3%' },
  { ship: 165, lrr: '0', rate: '0.0%' },
  { ship: '-', lrr: '-', rate: '-' },
];

/* ───────── RP-06 폐기 보고서 ───────── */

export const SCRAP_SUMMARY = {
  docNo: 'SC-260731-01',
  periodFrom: '2026-07-01',
  periodTo: '2026-07-31',
  totalQty: 13723267,
  ngQty: 12308279,
  deadQty: 0,
  lossQty: 1414988,
  totalAmt: 999999000,
  state: '확정',
};

export const SCRAP_MODELS = [
  { no: 'Model 001', name: 'KRIOS', qty: 4182540 },
  { no: 'Model 002', name: 'EOS-S', qty: 3657118 },
  { no: 'Model 003', name: 'EOS-SC', qty: 502227 },
  { no: 'Model 004', name: 'BOI', qty: 2914806 },
];

export const SCRAP_DETAIL = [
  { model: 'KRIOS (Model 001)', process: 'Press', reason: '치수 Spec Out — 외곽 치수 편차', qty: 2845120, amount: 212480000 },
  { model: 'KRIOS (Model 001)', process: 'Forming', reason: '성형 크랙 · 버(Burr) 발생', qty: 1337420, amount: 96340000 },
  { model: 'EOS-S (Model 002)', process: 'Press', reason: '치수 Spec Out — 홀 피치 편차', qty: 2208660, amount: 168720000 },
  { model: 'EOS-S (Model 002)', process: '후공정', reason: '표면 스크래치 · 이물 부착', qty: 1448458, amount: 104860000 },
  { model: 'EOS-SC (Model 003)', process: 'Press', reason: '치수 Spec Out — 평탄도 NG', qty: 502227, amount: 41150000 },
  { model: 'BOI (Model 004)', process: 'Forming', reason: '각도 편차 Spec Out', qty: 1760332, amount: 139270000 },
  { model: 'BOI (Model 004)', process: '조립', reason: '조립 Loss · 셋업 초물 폐기', qty: 1154474, amount: 88060000 },
  { model: '기타 모델 (MEM-B 외)', process: '전 공정', reason: '불용 재고 · 공정 Loss', qty: 2466576, amount: 149119000 },
];

export const SCRAP_HEADER = {
  docNo: 'SC-260731-01',
  retention: '3 년',
  origin: '■ 제조공정 발생 / ■ 협력업체 발생 / □ IQC 발생',
  description: '각 공정별 제품 치수 Spec Out 불량으로 인한 폐기 (불용재고 포함)',
  models: 'KRIOS / EOS-S / EOS-SC / BOI 외',
  process: '전 공정',
  occurPeriod: '2026년 7월 1일 ~ 31일',
  vendor: '덕우전자(주) 화성사업장',
  mfgPeriod: '2026년 7월 1일 ~ 31일',
  maker: '제조1팀 · 제조2팀 · 제조3팀',
  writer: '품질보증팀',
  writeDate: '2026년 7월 31일',
};

export const SCRAP_REVIEW_OPINIONS = [
  { no: 1, dept: '품질보증팀', placeholder: '치수 Spec Out 판정 기준 및 재발 방지 대책 검토 의견을 입력하세요.' },
  { no: 2, dept: '생산관리팀', placeholder: '폐기 물량의 생산계획 반영 및 불용 재고 처리 방안을 입력하세요.' },
  { no: 3, dept: '제조팀', placeholder: '공정별 발생 원인과 작업 조건 조정 내역을 입력하세요.' },
  { no: 4, dept: '공정기술팀', placeholder: '금형 · 설비 조건 개선 및 표준 반영 계획을 입력하세요.' },
];

export const SCRAP_LIST = [
  { docNo: 'SC-260731-01', periodFrom: '2026-07-01', periodTo: '2026-07-31', totalQty: 13723267, totalAmt: 999999000, state: '확정' },
  { docNo: 'SC-260630-04', periodFrom: '2026-06-01', periodTo: '2026-06-30', totalQty: 11840220, totalAmt: 842310000, state: '확정' },
  { docNo: 'SC-260531-02', periodFrom: '2026-05-01', periodTo: '2026-05-31', totalQty: 10422180, totalAmt: 761480000, state: '확정' },
];

/* ───────── RP-07 폐기 보고서 작성 위저드 ───────── */

/** 원가 기준정보 단가 (2026-07 버전, 원/EA) */
export const SCRAP_UNIT_PRICE = { KRIOS: 74.7, 'EOS-S': 76.4, 'EOS-SC': 81.9, BOI: 79.1, 'MEM-B': 60.5, 'MEM-S': 63.2 };

/** MES 폐기 전표 16건 — 합계 12,308,279 EA (= 폐기 보고서의 공정불량 수량) */
export const SCRAP_MES_VOUCHERS = [
  { voucherId: 'V01', occurDate: '2026-07-02', lotNo: 'L260702-003', model: 'KRIOS', process: 'Press', defectType: '치수 Spec Out', qty: 1284300, originType: '제조공정', docNo: 'MV-2607-0031' },
  { voucherId: 'V02', occurDate: '2026-07-03', lotNo: 'L260703-014', model: 'KRIOS', process: 'Press', defectType: '찍힘', qty: 862140, originType: '제조공정', docNo: 'MV-2607-0142' },
  { voucherId: 'V03', occurDate: '2026-07-05', lotNo: 'L260705-021', model: 'KRIOS', process: 'A Plating', defectType: '도금 불량', qty: 698680, originType: '제조공정', docNo: 'MV-2607-0188' },
  { voucherId: 'V04', occurDate: '2026-07-07', lotNo: 'L260707-008', model: 'EOS-S', process: 'Press', defectType: '치수 Spec Out', qty: 1102450, originType: '제조공정', docNo: 'MV-2607-0224' },
  { voucherId: 'V05', occurDate: '2026-07-09', lotNo: 'L260709-017', model: 'EOS-S', process: 'Coating', defectType: '얼룩', qty: 786220, originType: '제조공정', docNo: 'MV-2607-0261' },
  { voucherId: 'V06', occurDate: '2026-07-10', lotNo: 'L260710-005', model: 'EOS-S', process: 'B Plating', defectType: '도금 불량', qty: 645310, originType: '협력업체', docNo: 'MV-2607-0290' },
  { voucherId: 'V07', occurDate: '2026-07-13', lotNo: 'L260713-011', model: 'EOS-SC', process: 'Press', defectType: 'BURR', qty: 502227, originType: '제조공정', docNo: 'MV-2607-0333' },
  { voucherId: 'V08', occurDate: '2026-07-15', lotNo: 'L260715-002', model: 'BOI', process: 'Press', defectType: '변형', qty: 1004880, originType: '제조공정', docNo: 'MV-2607-0371' },
  { voucherId: 'V09', occurDate: '2026-07-16', lotNo: 'L260716-019', model: 'BOI', process: 'A Plating', defectType: '스크래치', qty: 741560, originType: '제조공정', docNo: 'MV-2607-0402' },
  { voucherId: 'V10', occurDate: '2026-07-18', lotNo: 'L260718-006', model: 'BOI', process: 'Coating', defectType: '얼룩', qty: 612340, originType: '제조공정', docNo: 'MV-2607-0438' },
  { voucherId: 'V11', occurDate: '2026-07-21', lotNo: 'L260721-012', model: 'MEM-B', process: 'Press', defectType: '치수 Spec Out', qty: 928470, originType: '제조공정', docNo: 'MV-2607-0489' },
  { voucherId: 'V12', occurDate: '2026-07-22', lotNo: 'L260722-004', model: 'MEM-B', process: 'B Plating', defectType: '도금 불량', qty: 534910, originType: '협력업체', docNo: 'MV-2607-0512' },
  { voucherId: 'V13', occurDate: '2026-07-24', lotNo: 'L260724-016', model: 'MEM-S', process: 'Press', defectType: '찍힘', qty: 707250, originType: '제조공정', docNo: 'MV-2607-0547' },
  { voucherId: 'V14', occurDate: '2026-07-27', lotNo: 'L260727-009', model: 'MEM-S', process: 'Coating', defectType: '스크래치', qty: 488630, originType: 'IQC', docNo: 'MV-2607-0583' },
  { voucherId: 'V15', occurDate: '2026-07-29', lotNo: 'L260729-013', model: 'KRIOS', process: 'Press', defectType: '치수 Spec Out', qty: 1337420, originType: '제조공정', docNo: 'MV-2607-0618' },
  { voucherId: 'V16', occurDate: '2026-07-30', lotNo: 'L260730-007', model: 'EOS-SC', process: 'A Plating', defectType: 'BURR', qty: 71492, originType: 'IQC', docNo: 'MV-2607-0651' },
];

/** 부서별 검토자 후보 */
export const SCRAP_OWNERS = {
  품질보증팀: ['김선영 팀장', '박도현 책임', '이수민 선임'],
  생산관리팀: ['정우진 팀장', '한지호 책임', '오세라 선임'],
  제조팀: ['강민석 팀장', '유재훈 책임', '신동해 선임'],
  공정기술팀: ['임태경 팀장', '조현우 책임', '배가온 선임'],
};

export const SCRAP_APPROVERS = {
  draft: ['이수민 선임 (품질보증팀)', '박도현 책임 (품질보증팀)', '오세라 선임 (생산관리팀)'],
  review: ['김선영 팀장 (품질보증팀)', '정우진 팀장 (생산관리팀)', '강민석 팀장 (제조팀)'],
  approve: ['최영도 이사 (품질본부)', '서정한 상무 (생산본부)', '대표이사'],
};

/** 위저드 초기 상태 */
export function newScrapDraft() {
  return {
    draftId: `SD-${Date.now()}`,
    docNo: 'SC-260731-01',
    step: 1,
    cond: { from: '2026-07-01', to: '2026-07-31', process: '전체', model: '전체', originType: '전체' },
    pickedVoucherIds: SCRAP_MES_VOUCHERS.map((v) => v.voucherId),
    form: {
      docNo: 'SC-260731-01',
      retention: '3 년',
      origin: { mfg: true, vendor: true, iqc: false },
      description: '각 공정별 제품 치수 Spec Out 불량으로 인한 폐기 (불용재고 포함)',
      process: '전 공정',
      vendor: '덕우전자(주) 화성사업장',
      maker: '제조1팀 · 제조2팀 · 제조3팀',
      writer: '품질보증팀',
      writeDate: '2026-07-31',
    },
    manualRows: [
      { rowId: 'M1', name: '불용 재고', kind: 'Loss', model: '기타 모델 (MEM-B 외)', process: '전 공정', reason: '장기 미사용 자재 · 공정 Loss 집계분', qty: 1414988, unitPrice: 60.5 },
    ],
    priceAdj: {},
    review: {
      depts: [
        { dept: '품질보증팀', manager: '김선영 팀장', on: true, memo: '치수 Spec Out 판정 기준 및 재발 방지 대책' },
        { dept: '생산관리팀', manager: '정우진 팀장', on: true, memo: '폐기 물량의 생산계획 반영 및 불용 재고 처리' },
        { dept: '제조팀', manager: '강민석 팀장', on: true, memo: '공정별 발생 원인과 작업 조건 조정 내역' },
        { dept: '공정기술팀', manager: '임태경 팀장', on: false, memo: '금형 · 설비 조건 개선 및 표준 반영 계획' },
      ],
      appr: { draft: '이수민 선임 (품질보증팀)', review: '김선영 팀장 (품질보증팀)', approve: '최영도 이사 (품질본부)' },
      due: '2026-08-07',
      notifyChannels: ['메일', '시스템 팝업'],
    },
  };
}

/** 위저드 단계 정의 */
export const SCRAP_STEPS = [
  { title: 'MES 폐기 대상 검색', sub: '전표 · LOT 선택' },
  { title: '수기 입력', sub: 'MES 미보유 항목' },
  { title: '폐기 금액 산정', sub: '원가 기준정보 적용' },
  { title: '검토 · 결재선 지정', sub: '부서별 검토 요청' },
  { title: '미리보기 · 생성', sub: '결재 양식 확인' },
];
