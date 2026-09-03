/**
 * [Model] 파생 지표 계산 (도메인 계산 규칙 · React 의존 없음)
 *
 * 불량률 · 수율 · 가동률은 테이블에 그대로 저장된 값이 아니라 수량·시간에서 계산한 값입니다.
 * 서버가 계산해 주면 그 값을 그대로 쓰고, 비어 있으면(`null`) 같은 응답에 함께 온
 * 원천 수량으로 여기서 채웁니다. 화면마다 제각각 계산하지 않도록 한 곳에 모았습니다.
 *
 *  · 불량률 = 불량수량 ÷ 투입수량 × 100
 *  · 수율   = 양품수량 ÷ 투입수량 × 100
 *  · 가동률 = (조업시간 − 비가동시간) ÷ 조업시간 × 100
 *
 * 원천 수량조차 없으면 `null` 을 그대로 둡니다. 0 으로 채우면 "가동률 0%" 처럼
 * 실제로 측정된 값과 구분되지 않기 때문입니다.
 */

/** 하루 조업시간 기본값 (분) — 24시간 3교대 기준 */
export const DAILY_OPERATING_MIN = 1440;

/** 소수 n자리로 반올림 */
const round = (v, digits = 2) => Math.round(v * 10 ** digits) / 10 ** digits;

/** 숫자면 숫자로, 아니면 null */
function num(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * 불량률(%) — 불량수량 ÷ 투입수량 × 100
 *
 * @param {number} qty 투입수량
 * @param {number} ngQty 불량수량
 * @returns {number|null}
 */
export function defectRate(qty, ngQty) {
  const q = num(qty);
  const ng = num(ngQty);
  if (q === null || ng === null || q <= 0) return null;
  return round((ng / q) * 100);
}

/**
 * 수율(%) — 양품수량 ÷ 투입수량 × 100
 *
 * 양품수량이 없으면 투입 − 불량으로 대신 계산합니다.
 *
 * @param {number} qty 투입수량
 * @param {number} okQty 양품수량
 * @param {number} [ngQty] 불량수량 (okQty 가 없을 때 사용)
 * @returns {number|null}
 */
export function yieldRate(qty, okQty, ngQty) {
  const q = num(qty);
  if (q === null || q <= 0) return null;
  const ok = num(okQty) ?? (num(ngQty) === null ? null : q - num(ngQty));
  if (ok === null) return null;
  return round((ok / q) * 100);
}

/**
 * 가동률(%) — (조업시간 − 비가동시간) ÷ 조업시간 × 100
 *
 * @param {number} downtimeMin 비가동 시간(분)
 * @param {number} [operatingMin] 조업시간(분). 기본 1440분(24시간)
 * @returns {number|null}
 */
export function uptimeRate(downtimeMin, operatingMin = DAILY_OPERATING_MIN) {
  const down = num(downtimeMin);
  const op = num(operatingMin);
  if (down === null || op === null || op <= 0) return null;
  return round(Math.max(0, Math.min(100, ((op - down) / op) * 100)));
}

/**
 * 행 하나에서 비어 있는 파생 지표를 채웁니다. (서버 값이 있으면 그대로 둡니다)
 *
 * 응답마다 필드 이름이 조금씩 달라 매핑을 넘길 수 있게 했습니다.
 *
 * @param {object} row 원본 행
 * @param {object} [keys] 필드 이름 매핑
 * @returns {object} 파생 지표가 채워진 새 행
 */
export function fillRates(row, keys = {}) {
  if (!row) return row;
  const {
    qty = 'qty',
    okQty = 'okQty',
    ngQty = 'ngQty',
    defect = 'defectRate',
    yieldKey = 'yield',
    uptime = 'uptimeRate',
    downtime = 'downtimeMin',
    operatingMin = 'operatingMin',
  } = keys;

  // 투입수량 후보 — 응답에 따라 qty · inputQty 로 옵니다
  const q = num(row[qty]) ?? num(row.inputQty) ?? num(row.totalQty);
  const out = { ...row };

  if (num(out[defect]) === null) out[defect] = defectRate(q, out[ngQty]);
  if (num(out[yieldKey]) === null) out[yieldKey] = yieldRate(q, out[okQty], out[ngQty]);
  if (num(out[uptime]) === null) out[uptime] = uptimeRate(out[downtime], out[operatingMin] ?? DAILY_OPERATING_MIN);

  return out;
}

/**
 * 행 목록에 `fillRates` 를 적용합니다.
 *
 * @param {Array} rows 원본 행 배열
 * @param {object} [keys] 필드 이름 매핑
 */
export function fillRatesAll(rows, keys) {
  return Array.isArray(rows) ? rows.map((r) => fillRates(r, keys)) : rows;
}

/**
 * 구성비(%)를 원장 총량 기준으로 계산합니다.
 *
 * 유형별 구성은 표시된 항목들의 합을 분모로 쓰기 쉽지만, 그러면 **유형이 붙지 않은 몫**이
 * 통째로 빠져 각 항목의 비중이 실제보다 부풀려집니다.
 * (예: 불량 총량 10,203,189 중 유형이 없는 103,741 이 빠지면 1위 유형이 31.64% → 31.92% 로 커집니다)
 *
 * 그래서 분모는 언제나 **원장 총량**(불량 수량 등 DB 원장에서 나온 값)을 씁니다.
 * 남는 몫은 '유형 미상' 으로 드러내 합이 원장과 맞도록 합니다.
 *
 * @param {Array} items 항목 배열
 * @param {number} ledgerTotal 원장 총량 (예: summary.ngQty)
 * @param {object} [opts] { labelKey, valueKey, remainderLabel, minRemainder }
 * @returns {{ rows: Array, total: number, remainder: number }}
 *          rows — [{ label, value, ratio, unclassified }]
 */
export function compositionOf(items = [], ledgerTotal, opts = {}) {
  const {
    labelKey = 'label',
    valueKey = 'value',
    remainderLabel = '유형 미상',
    minRemainder = 1,
  } = opts;

  const list = (items || []).map((x) => ({
    label: x[labelKey],
    value: Number(x[valueKey]) || 0,
    raw: x,
  }));

  const total = Number(ledgerTotal);
  // 원장 총량을 모르면 표시된 항목 합으로 물러섭니다 (그때는 구성비가 상대값입니다)
  const denominator = Number.isFinite(total) && total > 0 ? total : list.reduce((a, b) => a + b.value, 0);
  const shown = list.reduce((a, b) => a + b.value, 0);
  const remainder = Math.max(0, Math.round(denominator - shown));

  const pct = (v) => (denominator > 0 ? Math.round((v / denominator) * 10000) / 100 : 0);

  /** 서버가 유형 미상 몫을 이미 한 행으로 내려보냈는지 */
  const isResidual = (x) => x.label === remainderLabel || x.raw?.unclassified === true
    || x.raw?.defectCd === null || x.raw?.code === null;

  const rows = list.map((x) => ({ ...x, ratio: pct(x.value), unclassified: isResidual(x) || undefined }));

  // 서버가 이미 내려보냈으면 덧붙이지 않습니다 (합이 두 번 잡힙니다).
  // 서버가 안 주면 남는 몫을 직접 드러내 합이 원장과 맞게 합니다.
  if (remainder >= minRemainder && !rows.some((r) => r.unclassified)) {
    rows.push({ label: remainderLabel, value: remainder, ratio: pct(remainder), unclassified: true });
  }
  return { rows, total: denominator, remainder };
}
