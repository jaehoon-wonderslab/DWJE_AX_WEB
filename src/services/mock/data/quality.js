/**
 * 품질관리 목 데이터 (QC-01 ~ QC-04)
 */

/* ───────── QC-01 불량 현황 조회 ───────── */
export const DEFECTS_BY_TYPE = [
  { defectType: 'chip (찍힘)', cnt: 412, ratio: 34.1, momChange: '-2.1%p' },
  { defectType: 'stain (얼룩)', cnt: 268, ratio: 22.2, momChange: '+0.6%p' },
  { defectType: 'bend (변형)', cnt: 201, ratio: 16.6, momChange: '-1.2%p' },
  { defectType: 'welding (용접)', cnt: 154, ratio: 12.7, momChange: '-0.4%p' },
  { defectType: '미도금', cnt: 98, ratio: 8.1, momChange: '+1.1%p' },
  { defectType: '도장이물', cnt: 75, ratio: 6.2, momChange: '-0.3%p' },
];

export const DEFECT_MAIN_TYPES = ['chip', 'stain', 'chip', 'bend', 'welding'];

/* ───────── QC-02 AOI 판정 분석·예측 ───────── */

export const AOI_PREDICTION_SUMMARY = {
  predictedDefectRate: 3.9,
  predictedBand: '80% 구간 3.4 ~ 4.5%',
  currentRate: 2.6,
  threshold: 3.0,
  thresholdEta: '11:20',
  thresholdEtaSub: '약 2시간 16분 후 · PR-08 기준 · 신뢰도 0.86',
  moldRemainShot: 6200,
  moldRemainSub: '교체 예상 08-29 14:00 · 과거 5회 교체 이력 학습',
  riskLotCnt: 2,
  riskLotSub: '고객사 LRR 발생 확률 15% 이상',
};

/** 08~10시는 MES 실측, 10시 이후는 추정 (splitIndex 기준으로 나뉩니다) */
export const AOI_TREND_BAND = {
  labels: ['08', '09', '10 ▼', '11', '12', '13', '14', '15', '16', '17', '18'],
  splitIndex: 2,
  threshold: 3.0,
  series: [
    { name: '실측 → 예측 중앙값 (%)', data: [2.1, 2.4, 2.6, 3.2, 3.9, 4.3, 4.6, 4.8, 4.9, 5.0, 5.1] },
    { name: '예측 상한 80% (%)', data: [2.1, 2.4, 2.6, 3.6, 4.5, 5.1, 5.6, 5.9, 6.1, 6.2, 6.3], dashed: true },
    { name: '예측 하한 80% (%)', data: [2.1, 2.4, 2.6, 2.9, 3.4, 3.6, 3.8, 3.9, 4.0, 4.0, 4.1], dashed: true },
  ],
  note:
    '금형 교체 후 경과시간 · 각도 편차 · 타발수 누적 · 과거 동일 금형 5회 교체 이력을 입력으로 사용했습니다. ' +
    '조치를 취하면 예측은 다시 산출됩니다.',
};

export const AOI_EQUIPMENT_RISK = [
  {
    eqptCd: 'PR-03', aoiCd: 'AOI-03', currentRate: 4.1, plus2h: 5.2, plus8h: 6.4,
    thresholdEta: '09:40 임계 초과 (이미 초과)', confidence: 0.91, level: 'risk',
    mainFactor: '금형 M-2207 교체 후 42분 · 각도 편차 +0.8° 확대 중', recommendation: '금형 재셋업 — 즉시',
  },
  {
    eqptCd: 'PR-08', aoiCd: 'AOI-08', currentRate: 2.4, plus2h: 3.1, plus8h: 3.6,
    thresholdEta: '11:20 (약 2시간 16분 후)', confidence: 0.86, level: 'watch',
    mainFactor: '타발수 38,400 누적 · 과거 40,000 구간에서 chip 급증 3회', recommendation: '금형 점검 예약 — 오전 중',
  },
  {
    eqptCd: 'PR-05', aoiCd: 'AOI-05', currentRate: 2.0, plus2h: 2.2, plus8h: 2.4,
    thresholdEta: '금일 내 미도달', confidence: 0.88, level: '',
    mainFactor: '비가동 34분 후 재가동 · 초기 구간 안정화됨', recommendation: '추가 조치 불필요',
  },
  {
    eqptCd: 'PR-01', aoiCd: 'AOI-01', currentRate: 1.9, plus2h: 1.9, plus8h: 2.0,
    thresholdEta: '금일 내 미도달', confidence: 0.93, level: '',
    mainFactor: '전 구간 안정 · 판정 분포 기준선과 일치', recommendation: '추가 조치 불필요',
  },
  {
    eqptCd: 'PR-07', aoiCd: 'AOI-07', currentRate: 2.7, plus2h: 3.4, plus8h: 4.1,
    thresholdEta: '12:05 (약 3시간 후)', confidence: 0.74, level: 'watch',
    mainFactor: 'AOI-07 경계 판정 비중 급증 — 판정 드리프트 동반', recommendation: 'AOI-07 기준 캘리브레이션 확인',
  },
];

export const AOI_LOT_RISK = [
  {
    lotNo: 'L260824-031', model: 'EOS-Stiffener', customer: '글로벌 고객사 A', shipDue: '08-30',
    lrrProbability: 0.34, level: 'risk',
    basis: 'chip 412EA · 경계 판정 12건 미확정 · 동일 금형 과거 LRR 2건', recommendation: '출하 보류 · 전수 재검',
  },
  {
    lotNo: 'L260823-019', model: 'Krios_s', customer: '글로벌 고객사 B', shipDue: '08-29',
    lrrProbability: 0.18, level: 'watch',
    basis: 'stain 188EA · 세정 공정 유래 추정 · 과거 동일 패턴 LRR 1건', recommendation: '샘플 재검 20EA',
  },
  {
    lotNo: 'L260822-044', model: 'EOS-Stiffener', customer: '글로벌 고객사 A', shipDue: '08-29',
    lrrProbability: 0.06, level: '',
    basis: '판정 분포 기준선 내 · 특이 이력 없음', recommendation: '정상 출하',
  },
];

export const AOI_REMAINING_ESTIMATE = {
  rows: [
    ['추가 불량 수량', '+3,100 ~ 4,800 EA', 'qty'],
    ['주 발생 유형', 'chip (찍힘) — 전체의 68% 추정', ''],
    ['집중 예상 구간', '10:00 ~ 12:00 · PR-03 / PR-08', ''],
    ['금일 마감 예상 수율', '95.1% (목표 97.0%)', 'yield'],
  ],
  goalProbability: { label: '낮음 · 18%', tone: 'red' },
  ifActed: { label: '96.8% 회복 가능', sub: 'PR-03 재셋업 기준', tone: 'green' },
  note: '추정 근거 — 최근 12주 동일 조건 구간 274건의 실측 분포',
};

export const AOI_DRIFT = [
  { aoiCd: 'AOI-01', judgeCnt: 12480, drift: '-0.1%p', overRejectEst: '0.4%', underRejectEst: '0.2%', recheckMatchRate: '97.8%', borderlineRatio: '2.1%', state: '정상' },
  { aoiCd: 'AOI-03', judgeCnt: 11930, drift: '+0.6%p', overRejectEst: '0.9%', underRejectEst: '0.3%', recheckMatchRate: '95.2%', borderlineRatio: '4.8%', state: '정상' },
  { aoiCd: 'AOI-05', judgeCnt: 9840, drift: '+0.2%p', overRejectEst: '0.5%', underRejectEst: '0.2%', recheckMatchRate: '96.9%', borderlineRatio: '2.6%', state: '정상' },
  { aoiCd: 'AOI-07', judgeCnt: 10250, drift: '+1.9%p', overRejectEst: '2.7%', underRejectEst: '0.9%', recheckMatchRate: '88.4%', borderlineRatio: '11.3%', state: '기준 이탈' },
  { aoiCd: 'AOI-08', judgeCnt: 11240, drift: '+0.4%p', overRejectEst: '0.7%', underRejectEst: '0.3%', recheckMatchRate: '96.1%', borderlineRatio: '3.4%', state: '정상' },
];

export const AOI_TYPE_SHIFT = [
  { defectType: 'chip (찍힘)', today: '2.5%', baseAvg: '1.6%', change: '+0.9%p', up: true, interpretation: '금형 교체 직후 구간에 집중' },
  { defectType: 'stain (얼룩)', today: '0.8%', baseAvg: '0.9%', change: '-0.1%p', up: false, interpretation: '기준선 내' },
  { defectType: 'BURR', today: '0.3%', baseAvg: '0.4%', change: '-0.1%p', up: false, interpretation: '기준선 내' },
  { defectType: '치수 이탈', today: '0.2%', baseAvg: '0.2%', change: '—', up: false, interpretation: '변화 없음' },
  { defectType: '변형', today: '0.1%', baseAvg: '0.3%', change: '-0.2%p', up: false, interpretation: '개선 추세' },
];

/** 추정 근거·모델 (모달) */
export const AOI_PREDICTION_BASIS = {
  model: 'Gradient Boosting 회귀 + 잔차 분위수 밴드 (80% 구간)',
  trainPeriod: '최근 12주 · 동일 공정 조건 구간 274건',
  features: [
    '금형 교체 후 경과 시간 (분)',
    '각도 편차 (°) — 10분 이동 평균',
    '누적 타발수 (천타)',
    '타발 속도 (spm)',
    'AOI 경계 판정 비중 (%)',
    '동일 금형 과거 교체 후 불량 패턴',
  ],
  validation: [
    ['검증 방식', '시계열 분할 (학습 80 / 검증 20)'],
    ['평균 절대 오차', '0.42 %p'],
    ['80% 구간 포함률', '78.6 % (목표 80%)'],
    ['임계 도달 시각 오차', '평균 ±34분'],
  ],
  limitations: [
    '금형 교체·재셋업 등 사람이 개입하면 예측은 즉시 다시 산출해야 합니다.',
    'AOI 판정 기준이 흔들리는 검사기(드리프트 이탈)는 예측 신뢰도가 함께 떨어집니다.',
    '신규 모델·신규 금형은 학습 이력이 없어 추정 구간이 넓게 나옵니다.',
  ],
};

/* ───────── QC-03 품질 보고서 ───────── */

export const QUALITY_REPORT = {
  reportId: 'QR-260828-02',
  formId: 'F-SCRAP',
  formName: '불량 폐기 보고서',
  lotNo: 'L260824-031',
  state: '검토 대기',
  disclosurePolicy: '글로벌 고객사 A',
  header: [
    ['보고서 번호', 'QR-260828-02'],
    ['작성 부서', '품질보증팀'],
    ['대상 LOT', 'L260824-031'],
    ['품목', 'EOS-Stiffener'],
    ['발생 설비', 'PR-03 / AOI-03'],
    ['금형', 'M-2207'],
    ['발생 일자', '2026-08-24'],
    ['고객사 공개', '글로벌 고객사 A'],
  ],
  resultTable: {
    head: ['구분', '투입', '양품', '불량', '불량률', '폐기'],
    rows: [
      ['합계', '12,480', '12,068', '412', '3.3%', '412'],
      ['chip (찍힘)', '—', '—', '318', '2.5%', '318'],
      ['stain (얼룩)', '—', '—', '94', '0.8%', '94'],
    ],
  },
  processCondition: {
    head: ['각도 편차', '타발 속도', '금형 경과 타발수', '수율'],
    rows: [['+0.8°', '78 spm', '42,180', '96.7%']],
    note: '수율·단가는 고객사 공개 정책과 열람 계정의 데이터 접근 권한에 따라 마스킹됩니다.',
  },
  sections: [
    {
      key: 'cause',
      title: '3. 원인 분석',
      who: 'draft',
      body:
        '금형 M-2207 교체 직후 42분 구간에 chip 불량이 집중되었습니다. 같은 구간에서 각도 편차가 평소 대비 확대되었고, ' +
        '공정조건 상관분석 결과 각도 편차의 불량 기여도가 72로 가장 높게 산출되었습니다. ' +
        '동일 금형의 과거 교체 이력에서도 같은 패턴이 3회 관찰됩니다.',
    },
    {
      key: 'action',
      title: '4. 조치 및 재발 방지',
      who: 'draft',
      body:
        '· 금형 교체 후 초기 20분간 각도 조건 재설정\n' +
        '· 교체 직후 구간 표본 검사 주기 단축\n' +
        '· 금형 M-2207 마모 점검 이력 확인 후 보수 여부 판단',
    },
  ],
  images: [
    { id: 'IMG-0417', name: 'chip #0417', defectType: 'chip', nasPath: '/nas/aoi/20260824/0417.jpg', attached: true },
    { id: 'IMG-0418', name: 'chip #0418', defectType: 'chip', nasPath: '/nas/aoi/20260824/0418.jpg', attached: true },
    { id: 'IMG-0421', name: 'stain #0421', defectType: 'stain', nasPath: '/nas/aoi/20260824/0421.jpg', attached: true },
    { id: 'IMG-0433', name: 'chip #0433', defectType: 'chip', nasPath: '/nas/aoi/20260824/0433.jpg', attached: true },
    { id: 'IMG-0440', name: 'chip #0440', defectType: 'chip', nasPath: '/nas/aoi/20260824/0440.jpg', attached: false },
    { id: 'IMG-0447', name: 'stain #0447', defectType: 'stain', nasPath: '/nas/aoi/20260824/0447.jpg', attached: false },
    { id: 'IMG-0452', name: 'chip #0452', defectType: 'chip', nasPath: '/nas/aoi/20260824/0452.jpg', attached: false },
    { id: 'IMG-0455', name: 'chip #0455', defectType: 'chip', nasPath: '/nas/aoi/20260824/0455.jpg', attached: false },
    { id: 'IMG-0461', name: 'stain #0461', defectType: 'stain', nasPath: '/nas/aoi/20260824/0461.jpg', attached: false },
    { id: 'IMG-0468', name: 'chip #0468', defectType: 'chip', nasPath: '/nas/aoi/20260824/0468.jpg', attached: false },
  ],
};

export const QUALITY_AUTOFILL = [
  { field: '1. 불량 발생 현황', origin: 'mes' },
  { field: '2. 공정 조건', origin: 'mes' },
  { field: '3. 원인 분석', origin: 'ai' },
  { field: '4. 조치·재발 방지', origin: 'ai' },
  { field: '5. 증빙 이미지', origin: 'mes' },
];

export const QUALITY_MASKING = [
  { field: '단가', policy: '글로벌 고객사 A', action: '마스킹' },
  { field: '수율', policy: '글로벌 고객사 A', action: '마스킹' },
  { field: '거래처', policy: '글로벌 고객사 A', action: '마스킹' },
  { field: 'LOT 식별자', policy: '글로벌 고객사 A', action: '공개' },
];

export const QUALITY_REPORT_HISTORY = [
  { reportId: 'QR-260828-02', formName: '불량 폐기 보고서', lotNo: 'L260824-031', state: '검토 대기', version: 1, updatedAt: '2026-08-28 09:12' },
  { reportId: 'QR-260814-01', formName: '출하 후 불량 보고서', lotNo: 'L260812-007', state: '확정', version: 3, updatedAt: '2026-08-14 16:40' },
  { reportId: 'QR-260820-03', formName: '수율 갭 분석', lotNo: '—', state: '확정', version: 1, updatedAt: '2026-08-20 11:02' },
];

/* ───────── QC-04 보고서 양식 관리 ───────── */
export const REPORT_FORMS = [
  { formId: 'F-8D', name: '8D 리포트', type: '품질 이슈', fieldCnt: 8, disclosurePolicy: '글로벌 고객사 A · 단가/수율 비공개', parserVer: 'v1.2', updatedAt: '2026-08-12' },
  { formId: 'F-SCRAP', name: '불량 폐기 보고서', type: '폐기', fieldCnt: 12, disclosurePolicy: '내부용', parserVer: 'v1.0', updatedAt: '2026-07-30' },
  { formId: 'F-CLAIM', name: '출하 후 불량 보고서', type: '고객 클레임', fieldCnt: 15, disclosurePolicy: '국내 대기업 B · 거래처 비공개', parserVer: 'v1.1', updatedAt: '2026-08-04' },
  { formId: 'F-YIELD', name: '수율 갭 분석', type: '품질 분석', fieldCnt: 9, disclosurePolicy: '내부용', parserVer: 'v1.0', updatedAt: '2026-06-18' },
  { formId: 'F-DAILY', name: '일일 생산현황 보고서', type: '정기 보고', fieldCnt: 7, disclosurePolicy: '내부용', parserVer: 'v2.0', updatedAt: '2026-08-20' },
];

export const REPORT_FORM_FIELDS = {
  'F-SCRAP': [
    { field: 'reportNo', label: '보고서 번호', origin: 'mes', dataFieldKey: '', required: true },
    { field: 'lotNo', label: '대상 LOT', origin: 'mes', dataFieldKey: '', required: true },
    { field: 'item', label: '품목', origin: 'mes', dataFieldKey: '', required: true },
    { field: 'eqpt', label: '발생 설비', origin: 'mes', dataFieldKey: 'mold', required: true },
    { field: 'inputQty', label: '투입 수량', origin: 'mes', dataFieldKey: 'qty', required: true },
    { field: 'ngQty', label: '불량 수량', origin: 'mes', dataFieldKey: 'qty', required: true },
    { field: 'defectRate', label: '불량률', origin: 'mes', dataFieldKey: 'yield', required: true },
    { field: 'scrapAmount', label: '폐기 금액', origin: 'mes', dataFieldKey: 'price', required: false },
    { field: 'cause', label: '원인 분석', origin: 'ai', dataFieldKey: '', required: true },
    { field: 'action', label: '조치·재발 방지', origin: 'ai', dataFieldKey: '', required: true },
    { field: 'images', label: '증빙 이미지', origin: 'mes', dataFieldKey: '', required: false },
    { field: 'sign', label: '결재란', origin: 'manual', dataFieldKey: '', required: true },
  ],
};
