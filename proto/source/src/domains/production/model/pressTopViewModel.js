/** 프레스 Top View 전용 화면 모델 — API 행을 화면 좌표·표시값으로만 변환합니다. */
const STATUS = { RUNNING: 'RUNNING', 가동: 'RUNNING', WARNING: 'WARNING', 경고: 'WARNING', STOPPED: 'STOPPED', 비가동: 'STOPPED', MAINTENANCE: 'MAINTENANCE' };

export const PRESS_STATUS = {
  RUNNING: { label: '가동 중', color: '#1fb59a', condition: '양호' },
  WARNING: { label: '주의', color: '#ffb829', condition: '주의' },
  STOPPED: { label: '정지', color: '#f0565a', condition: '점검필요' },
  MAINTENANCE: { label: '점검 중', color: '#9a9a9a', condition: '점검필요' },
  DUMMY: { label: '레이아웃 더미', color: '#6b6b6b', condition: '—' },
};

const pressId = (index) => `PR-${String(index + 1).padStart(2, '0')}`;
// 실제 공장 도면 좌표로 교체할 수 있는 상대 좌표(%)입니다.
const TOP_DUMMY_POSITIONS = [
  { x: 2, y: 7 }, { x: 21, y: 7 }, { x: 40, y: 7 }, { x: 59, y: 7 }, { x: 78, y: 7 },
  { x: 2, y: 28 }, { x: 21, y: 28 }, { x: 40, y: 28 }, { x: 59, y: 28 }, { x: 78, y: 28 },
];
const REAL_POSITIONS = [
  { x: 2, y: 57 }, { x: 11, y: 57 }, { x: 20, y: 57 }, { x: 29, y: 57 }, { x: 38, y: 57 },
  { x: 52, y: 57 }, { x: 61, y: 57 }, { x: 70, y: 57 }, { x: 79, y: 57 }, { x: 88, y: 57 },
];

export function makePressTopView(items = []) {
  const byCode = new Map(items.map((item) => [item.eqptCd, item]));
  // 기준일 모니터 API는 C-프레스 MT-001~010을 우선 반환합니다.
  // 화면 식별자(PR-01~10)는 레이아웃용이므로 실제 API 설비 코드와 순서로도 연결합니다.
  const pressItems = items
    .filter((item) => item?.processId === 'W120' || /^MT-/i.test(item?.eqptCd || ''))
    .slice(0, 10);
  const dummy = TOP_DUMMY_POSITIONS.map((position, index) => ({
    id: `DUMMY-${String(index + 1).padStart(2, '0')}`,
    name: `레이아웃 더미-${String(index + 1).padStart(2, '0')}`,
    status: 'DUMMY', isDummy: true, position,
    qty: null, defectQty: null, strokeCount: null, yieldRate: null, lastUpdated: '—', condition: '—',
  }));
  const real = Array.from({ length: 10 }, (_, index) => {
    const raw = byCode.get(pressId(index)) || pressItems[index];
    const status = STATUS[raw?.state] || (raw ? 'MAINTENANCE' : 'MAINTENANCE');
    const qty = Number(raw?.qty);
    const defectRate = Number(raw?.defectRate);
    const defectQty = Number.isFinite(qty) && Number.isFinite(defectRate) ? Math.round(qty * defectRate / 100) : null;
    return {
      id: pressId(index),
      name: `Press-${String(index + 1).padStart(2, '0')}`,
      status,
      qty: Number.isFinite(qty) ? qty : null,
      defectQty,
      strokeCount: raw?.strokeCount ?? raw?.shotCnt ?? raw?.strokeSpeed ?? null,
      yieldRate: Number.isFinite(defectRate) ? 100 - defectRate : null,
      lastUpdated: raw?.lastCollectedAt || (raw ? '기준일 실적' : '수집 대기'),
      condition: PRESS_STATUS[status].condition,
      position: REAL_POSITIONS[index],
      layoutWidth: 9,
      isDummy: false,
    };
  });
  return [...dummy, ...real];
}

export function pressSummary(presses) {
  return presses.filter((press) => !press.isDummy).reduce((acc, press) => ({ ...acc, [press.status]: acc[press.status] + 1 }), { RUNNING: 0, WARNING: 0, STOPPED: 0, MAINTENANCE: 0 });
}
