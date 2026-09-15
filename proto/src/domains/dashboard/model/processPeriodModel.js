/** DB-02 전용: 미집계 수량과 생산 실적이 없는 경우를 구분합니다. */
export const numeric = (value) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
export const missingQuantity = (row) => ['qty', 'okQty', 'ngQty'].some((key) => !numeric(row[key]));
export function metricText(row, key, allowed = true) {
  if (!allowed) return '조회 권한 없음';
  if (numeric(row?.[key])) {
    return Number(row[key]).toLocaleString('ko-KR', { maximumFractionDigits: key.endsWith('Rate') ? 2 : 0 });
  }
  if (!key.endsWith('Rate')) return '수량 미집계';
  return row?.qty === 0 ? '생산 실적 없음' : '산출 자료 부족';
}
export function validatePeriod(from, to) {
  const valid = (date) => /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;
  if (!valid(from) || !valid(to)) throw new Error('시작일과 종료일을 올바른 날짜로 입력해 주세요.');
  if (from > to) throw new Error('시작일은 종료일보다 늦을 수 없습니다.');
  if ((Date.parse(to) - Date.parse(from)) / 86400000 > 92) throw new Error('조회 기간은 시작일과 종료일 사이 최대 92일까지 선택할 수 있습니다.');
}
export function processInsights(data) {
  const products = data?.products || [];
  const processes = data?.processes || [];
  const byDefects = products.filter((p) => numeric(p.ngQty) && Number(p.ngQty) > 0).sort((a, b) => b.ngQty - a.ngQty);
  const byRate = processes.filter((p) => numeric(p.defectRate) && p.qty > 0).sort((a, b) => b.defectRate - a.defectRate);
  const incompleteProducts = products.filter(missingQuantity);
  const incompleteProcesses = processes.filter(missingQuantity);
  return { byDefects, byRate, incompleteProducts, incompleteProcesses };
}
