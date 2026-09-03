/**
 * 기준정보 목 데이터 — 공정 · 설비 · 제품 · 고객사 · 불량유형 · 금형
 *
 * 실 서버 연동 시 `GET /api/v1/common/masters/*` 응답으로 대체됩니다.
 */

/** 공정 마스터 — 공정별 설비 구성과 목표 수율이 다릅니다 */
export const PROCESSES = [
  { id: 'Press', name: '프레스 공정', pre: 'PR', eqptCnt: 10, targetYield: 97.0, capacity: '프레스 10대 · AOI 10대' },
  { id: 'B Plating', name: 'B 도금 공정', pre: 'BP', eqptCnt: 12, targetYield: 96.5, capacity: '도금조 12기 · JIG 라인' },
  { id: 'A Plating', name: 'A 도금 공정', pre: 'AP', eqptCnt: 10, targetYield: 96.5, capacity: '도금조 10기' },
  { id: 'Coating', name: '코팅 공정', pre: 'CT', eqptCnt: 6, targetYield: 98.0, capacity: '코팅 라인 6기' },
];

/** 프레스 라인 실시간 현황 (제1공장 주력 라인 10대) */
export const LINES = [
  { eqptCd: 'PR-01', model: 'EOS-Stiffener', qty: 12480, defectRate: 1.9, uptimeRate: 92, state: '가동' },
  { eqptCd: 'PR-02', model: 'EOS-Stiffener', qty: 11930, defectRate: 2.4, uptimeRate: 89, state: '가동' },
  { eqptCd: 'PR-03', model: 'Krios_s', qty: 9840, defectRate: 4.1, uptimeRate: 71, state: '경고' },
  { eqptCd: 'PR-04', model: 'Krios_s', qty: 10250, defectRate: 2.0, uptimeRate: 88, state: '가동' },
  { eqptCd: 'PR-05', model: 'EOS-Stiffener', qty: 8120, defectRate: 1.5, uptimeRate: 64, state: '비가동' },
  { eqptCd: 'PR-06', model: 'Krios_s', qty: 11040, defectRate: 2.8, uptimeRate: 85, state: '가동' },
  { eqptCd: 'PR-07', model: 'EOS-Stiffener', qty: 12010, defectRate: 2.2, uptimeRate: 90, state: '가동' },
  { eqptCd: 'PR-08', model: 'Krios_s', qty: 9760, defectRate: 3.3, uptimeRate: 79, state: '가동' },
  { eqptCd: 'PR-09', model: 'EOS-Stiffener', qty: 11380, defectRate: 1.8, uptimeRate: 91, state: '가동' },
  { eqptCd: 'PR-10', model: 'Krios_s', qty: 10870, defectRate: 2.6, uptimeRate: 86, state: '가동' },
];

export const PROD_FAMILIES = [
  ['SHD', 'Shield · 차폐 커버'],
  ['CAN', 'Can · 케이스'],
  ['STF', 'Stiffener · 보강판'],
  ['BFL', 'Baffle · 차광판'],
  ['CM', 'Camera Module'],
  ['RNG', 'Ring · 링'],
  ['PLT', 'Plate · 플레이트'],
];

export const CUSTOMERS = [
  { code: 'CU-A', name: '글로벌 고객사 A' },
  { code: 'CU-B', name: '글로벌 고객사 B' },
  { code: 'CU-C', name: '국내 대기업 B' },
  { code: 'CU-D', name: 'LGIT' },
  { code: 'CU-E', name: '코웰' },
  { code: 'CU-F', name: '국내 협력사 C' },
];

export const PROJECTS = ['MEM', 'VR', 'Sphinx', 'Centaur', 'PDX', 'CM'];

const CUST_NAMES = CUSTOMERS.map((c) => c.name);

/**
 * 제품 마스터 — 113종
 *
 * 상위 8종은 고정 실적을 갖는 주력 모델이고,
 * 나머지 105종은 제품군별로 코드를 생성해 실제 규모(100종 이상)를 재현합니다.
 * rank 는 매출 기준 순위이며 '제품군 순위 × 제품군 내 순서'로 계산됩니다.
 */
export const PRODUCTS = (() => {
  const base = [
    { code: 'KRIOS', customer: '글로벌 고객사 A', project: 'MEM', family: '주력 모델' },
    { code: 'EOS-S', customer: '글로벌 고객사 A', project: 'MEM', family: '주력 모델' },
    { code: 'BOI', customer: '글로벌 고객사 B', project: 'VR', family: '주력 모델' },
    { code: 'EOS-SC', customer: '글로벌 고객사 A', project: 'MEM', family: '주력 모델' },
    { code: 'MEM-B', customer: '국내 대기업 B', project: 'Sphinx', family: '주력 모델' },
    { code: 'MEM-S', customer: '국내 대기업 B', project: 'Sphinx', family: '주력 모델' },
    { code: 'CM-01', customer: '코웰', project: 'Centaur', family: 'Camera Module' },
    { code: 'BFL-02', customer: 'LGIT', project: 'PDX', family: 'Baffle · 차광판' },
  ];
  const out = base.map((b, i) => ({ ...b, rank: i + 1, seq: i + 1 }));
  let k = 0;
  PROD_FAMILIES.forEach((f, fi) => {
    for (let i = 1; i <= 15; i += 1) {
      k += 1;
      out.push({
        code: `${f[0]}-${100 * (fi + 1) + i}`,
        family: f[1],
        seq: i,
        customer: CUST_NAMES[(fi * 3 + i) % CUST_NAMES.length],
        project: PROJECTS[(fi * 2 + i) % PROJECTS.length],
        rank: 8 + k,
      });
    }
  });
  return out; // 8 + 105 = 113종
})();

/** 화면에서 쓰는 제품군 순서 (SY-07 제품군 순위 관리에서 변경) */
export const FAMILY_ORDER_DEFAULT = PRODUCTS.map((p) => p.family).filter((v, i, a) => a.indexOf(v) === i);

/** 공정 × 주력 제품 실적 — [투입, 불량률(%), 가동률(%)] */
export const PROC_FACT = {
  Press: {
    KRIOS: [24180, 2.8, 88], 'EOS-S': [26410, 2.1, 91], BOI: [19840, 3.4, 82], 'EOS-SC': [14260, 2.4, 87],
    'MEM-B': [11920, 1.9, 90], 'MEM-S': [10480, 2.2, 89], 'CM-01': [6240, 3.1, 84], 'BFL-02': [4180, 2.7, 86],
  },
  'B Plating': {
    KRIOS: [21440, 3.1, 86], 'EOS-S': [23180, 2.6, 88], BOI: [17260, 5.8, 71], 'EOS-SC': [12840, 2.9, 85],
    'MEM-B': [10620, 3.6, 80], 'MEM-S': [9340, 2.8, 87], 'CM-01': [5480, 4.2, 78], 'BFL-02': [3620, 3.3, 83],
  },
  'A Plating': {
    KRIOS: [20180, 2.4, 89], 'EOS-S': [21960, 2.0, 92], BOI: [16480, 2.9, 86], 'EOS-SC': [12240, 4.1, 79],
    'MEM-B': [10080, 2.3, 90], 'MEM-S': [8920, 2.1, 91], 'CM-01': [5120, 2.8, 87], 'BFL-02': [3410, 2.5, 88],
  },
  Coating: {
    KRIOS: [18620, 1.4, 93], 'EOS-S': [20140, 1.2, 94], BOI: [15080, 1.8, 90], 'EOS-SC': [11260, 1.6, 91],
    'MEM-B': [9240, 1.3, 93], 'MEM-S': [8180, 1.5, 92], 'CM-01': [4680, 2.1, 88], 'BFL-02': [3140, 1.7, 90],
  },
};

/** 공정별 불량 유형 구성 */
export const PROC_DEFECT = {
  Press: [['chip (찍힘)', 1428], ['치수 이탈', 612], ['BURR', 428], ['변형', 196], ['스크래치', 124], ['기타', 82]],
  'B Plating': [['도금 불량', 1642], ['얼룩', 884], ['미도금', 412], ['치수 이탈', 238], ['변형', 146], ['기타', 94]],
  'A Plating': [['도금 불량', 1184], ['얼룩', 702], ['스크래치', 386], ['미도금', 214], ['변형', 132], ['기타', 78]],
  Coating: [['얼룩', 684], ['도장이물', 392], ['기포', 218], ['두께 편차', 164], ['스크래치', 96], ['기타', 54]],
};

/** 공정별 시간대 불량률 추이 (2시간 간격) */
export const PROC_TREND = {
  Press: [2.1, 2.4, 2.6, 2.9, 3.1, 2.8, 2.6, 2.5],
  'B Plating': [3.2, 3.6, 4.8, 5.4, 4.1, 3.4, 3.1, 3.0],
  'A Plating': [2.6, 2.5, 2.8, 3.0, 2.7, 2.5, 2.4, 2.4],
  Coating: [1.5, 1.4, 1.6, 1.8, 1.6, 1.4, 1.3, 1.4],
};

/** 시간대 라벨 (2시간 간격) */
export const HOUR_SLOTS = ['00', '02', '04', '06', '08', '10', '12', '14'];

/** 불량 유형 마스터 */
export const DEFECT_TYPES = [
  { code: 'D-CHIP', name: 'chip (찍힘)', category: '외관' },
  { code: 'D-STAIN', name: 'stain (얼룩)', category: '외관' },
  { code: 'D-BEND', name: 'bend (변형)', category: '형상' },
  { code: 'D-WELD', name: 'welding (용접)', category: '접합' },
  { code: 'D-NOPL', name: '미도금', category: '도금' },
  { code: 'D-PAINT', name: '도장이물', category: '코팅' },
  { code: 'D-BURR', name: 'BURR', category: '외관' },
  { code: 'D-DIM', name: '치수 이탈', category: '치수' },
];

/** 금형 마스터 (설비별) */
export const MOLDS = [
  { moldCd: 'M-2207', moldNm: 'EOS-Stiffener 3호기 금형', eqptCd: 'PR-03', shotCnt: 33800, remainShot: 6200 },
  { moldCd: 'M-2211', moldNm: 'Krios_s 8호기 금형', eqptCd: 'PR-08', shotCnt: 38400, remainShot: 1600 },
  { moldCd: 'M-2118', moldNm: 'EOS-Stiffener 1호기 금형', eqptCd: 'PR-01', shotCnt: 18240, remainShot: 21760 },
  { moldCd: 'M-2140', moldNm: 'Krios_s 4호기 금형', eqptCd: 'PR-04', shotCnt: 24100, remainShot: 15900 },
];

/** 공통코드 — 비가동 표준분류 · 불량유형 · 상태값 */
export const COMMON_CODES = {
  DOWNTIME_REASON: [
    { cd: 'DT-01', nm: '금형 교체', sort: 1, useYn: 'Y' },
    { cd: 'DT-02', nm: '금형 이상', sort: 2, useYn: 'Y' },
    { cd: 'DT-03', nm: '설비 고장', sort: 3, useYn: 'Y' },
    { cd: 'DT-04', nm: '자재 대기', sort: 4, useYn: 'Y' },
    { cd: 'DT-05', nm: '품질 이상 대응', sort: 5, useYn: 'Y' },
    { cd: 'DT-06', nm: '계획 정지 (점검·청소)', sort: 6, useYn: 'Y' },
    { cd: 'DT-07', nm: '작업자 부재', sort: 7, useYn: 'Y' },
    { cd: 'DT-99', nm: '기타', sort: 99, useYn: 'Y' },
  ],
  ALERT_LEVEL: [
    { cd: 'red', nm: '위험', sort: 1, useYn: 'Y' },
    { cd: 'amber', nm: '주의', sort: 2, useYn: 'Y' },
    { cd: 'gray', nm: '정보', sort: 3, useYn: 'Y' },
  ],
};

/**
 * 공정 × 제품 실적을 구합니다. 주력 8종 밖의 제품은 코드 해시로 안정적인 값을 만듭니다.
 *
 * @param {string} process 공정 ID
 * @param {string} code 제품 코드
 * @returns {{qty:number, defectRate:number, uptimeRate:number}}
 */
export function factOf(process, code) {
  const table = PROC_FACT[process] || PROC_FACT.Press;
  if (table[code]) {
    const [qty, defectRate, uptimeRate] = table[code];
    return { qty, defectRate, uptimeRate };
  }
  // 생성 제품 — 코드 문자열 해시로 일관된 더미 실적을 만듭니다
  let h = 0;
  for (let i = 0; i < code.length; i += 1) h = (h * 31 + code.charCodeAt(i)) >>> 0;
  const rank = PRODUCTS.find((p) => p.code === code)?.rank || 50;
  const scale = Math.max(0.12, 1 - rank / 130);
  return {
    qty: Math.round((2000 + (h % 4200)) * scale * 2.4),
    defectRate: Number((1.1 + ((h >> 3) % 42) / 10).toFixed(1)),
    uptimeRate: 74 + ((h >> 7) % 22),
  };
}
