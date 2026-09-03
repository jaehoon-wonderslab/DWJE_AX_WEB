/**
 * 조회에 필요한 실제 값들 — 서버에서 그때그때 받아 옵니다
 *
 * 날짜·공정·제품 코드를 테스트에 박아 두면 데이터가 바뀔 때마다 깨집니다.
 * 실적 보유 기간과 실적이 있는 공정·제품을 서버에 물어보고 씁니다.
 */
const api = require('./api');

let cached = null;

/** 테스트 전반에서 쓰는 기준값 */
async function fixtures() {
  if (cached) return cached;

  const range = await api.data('/common/data-range', { plantCd: 'PL01' });
  const baseDate = range.toDate;

  // 기준일에 실적이 있는 공정 중 가장 큰 것
  const yieldRes = await api.data('/dashboard/ai/process-yield', { date: baseDate });
  const busiest = [...(yieldRes.items || [])].sort((a, b) => (b.qty || 0) - (a.qty || 0))[0];
  const processId = busiest?.processId;

  // 그 공정이 그날 만든 제품
  const prod = processId ? await api.data('/dashboard/process/products', { date: baseDate, processId }) : { items: [] };
  const productCodes = (prod.items || []).slice(0, 5).map((x) => x.product);

  // 실적이 있는 설비 하나 (설비 지정 조회용)
  let eqptCd = null;
  try {
    const lines = await api.data('/dashboard/ai/lines', { date: baseDate });
    eqptCd = (lines.lines || []).find((l) => (l.qty || 0) > 0)?.eqptCd || (lines.lines || [])[0]?.eqptCd || null;
  } catch { /* 조회 실패 시 설비 지정 조회는 건너뜁니다 */ }

  // 월 범위 (불량 유형 등 누계 조회용)
  const monthFrom = `${baseDate.slice(0, 7)}-01`;

  cached = {
    range,
    baseDate,
    monthFrom,
    monthTo: baseDate,
    plantCd: 'PL01',
    processId,
    processName: busiest?.process,
    eqptCd,
    productCodes,
    yearMonth: baseDate.slice(0, 7),
    year: Number(baseDate.slice(0, 4)),
  };
  return cached;
}

/**
 * 경로 변수({id})가 있는 엔드포인트에 넣을 실제 값을 찾아 줍니다.
 * 못 찾으면 null 을 돌려주고, 호출하는 쪽에서 건너뜁니다.
 */
async function sampleId(name) {
  const f = await fixtures();
  const first = (d, key) => (d?.items || d?.[key] || [])[0];
  try {
    switch (name) {
      case 'processId': return f.processId;
      case 'plantCd': return 'PL01';
      case 'date': return f.baseDate;
      case 'empNo': return '10000';
      case 'deptId': return 1;
      case 'eqptCd': return first(await api.data('/common/masters/equipments'), 'equipments')?.eqptCd
        || first(await api.data('/dashboard/ai/lines', { date: f.baseDate }), 'lines')?.eqptCd;
      case 'itemCd': return first(await api.data('/common/masters/products', { size: 1 }), 'products')?.code;
      default: return null;
    }
  } catch {
    return null;
  }
}

module.exports = { fixtures, sampleId };
