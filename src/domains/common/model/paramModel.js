/**
 * [Model] 화면 표시값 → API 코드값 변환
 *
 * 선택 목록에는 사람이 읽는 말('일별', '2026년 7월', '수량 (EA)')이 들어 있고,
 * API 는 코드값('day', '2026-07', 'qty')을 받습니다.
 * 화면은 읽기 좋은 말을 그대로 쓰고, 리포지토리가 여기서 코드로 바꿔 보냅니다.
 *
 * ('전체' 처럼 조건 없음을 뜻하는 값은 client.js 가 요청에서 통째로 걸러 냅니다)
 */

/** 집계 단위 — 서버 `unit` (day | week | month | quarter | year) */
const PERIOD_UNIT = {
  일별: 'day',
  주별: 'week',
  월별: 'month',
  분기별: 'quarter',
  연간: 'year',
  연별: 'year',
};

/** 표시 단위 — 서버 `unit` (qty | amount) */
const AMOUNT_UNIT = {
  '수량 (EA)': 'qty',
  '금액 (원)': 'amount',
  수량: 'qty',
  금액: 'amount',
};

/** 드리프트 발견 위치 — 서버 `side` (SOURCE | TARGET) */
const DRIFT_SIDE = {
  원본: 'SOURCE',
  대상: 'TARGET',
  'MSSQL(원본)': 'SOURCE',
  'PostgreSQL(대상)': 'TARGET',
};

/** 알림 확인 상태 — 서버 `ackState` (OPEN | ACKED | CLOSED) */
const ALERT_ACK_STATE = {
  미확인: 'OPEN',
  확인됨: 'ACKED',
  종료: 'CLOSED',
};

/** 알림 심각도 — 서버 `type` (CRIT | WARN | LOW) */
const ALERT_SEVERITY = {
  심각: 'CRIT',
  경고: 'WARN',
  주의: 'LOW',
  정보: 'LOW',
};

/** 조회 기간 — 서버 `period` (today | 7d | 30d) */
const ALERT_PERIOD = {
  오늘: 'today',
  '최근 7일': '7d',
  '최근 30일': '30d',
};

/** 드리프트 구분 — 서버 `kind` (NEW | MISSING) */
const DRIFT_KIND = {
  신규: 'NEW',
  유실: 'MISSING',
};

/** 표에서 코드를 찾고, 없으면 원래 값을 그대로 돌려줍니다 (이미 코드인 경우) */
function lookup(table, label) {
  if (label === null || label === undefined || label === '') return undefined;
  return table[String(label).trim()] ?? label;
}

/** '일별' → 'day' */
export const periodUnit = (label) => lookup(PERIOD_UNIT, label);

/** '수량 (EA)' → 'qty' */
export const amountUnit = (label) => lookup(AMOUNT_UNIT, label);

/** '원본' → 'SOURCE' */
export const driftSide = (label) => lookup(DRIFT_SIDE, label);

/** '신규' → 'NEW' */
export const driftKind = (label) => lookup(DRIFT_KIND, label);

/** '미확인' → 'OPEN' */
export const alertAckState = (label) => lookup(ALERT_ACK_STATE, label);

/** '경고' → 'WARN' */
export const alertSeverity = (label) => lookup(ALERT_SEVERITY, label);

/** '최근 7일' → '7d' */
export const alertPeriod = (label) => lookup(ALERT_PERIOD, label);

/**
 * '2026년' → 2026 (서버가 정수로 받습니다)
 * @param {string|number} label
 * @returns {number|undefined}
 */
export function yearOf(label) {
  const m = String(label ?? '').match(/(\d{4})/);
  return m ? Number(m[1]) : undefined;
}

/**
 * '2026년 7월' → '2026-07'
 * @param {string} label
 * @returns {string|undefined}
 */
export function yearMonthOf(label) {
  const v = String(label ?? '').trim();
  if (/^\d{4}-\d{2}$/.test(v)) return v;
  const m = v.match(/(\d{4})\D+(\d{1,2})/);
  return m ? `${m[1]}-${String(m[2]).padStart(2, '0')}` : undefined;
}
