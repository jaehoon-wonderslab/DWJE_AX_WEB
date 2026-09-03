/**
 * 응답 필드 계약 — 화면이 읽는 필드가 실제로 오는지
 *
 * 필드 이름이 어긋나도 오류는 나지 않습니다. 값이 `undefined` 가 되어
 * 화면이 조용히 빈 채로 그려질 뿐입니다. 그래서 여기서 이름을 직접 확인합니다.
 */
const { suite, test, beforeAll, eq, ok } = require('../lib/runner');
const api = require('../lib/api');
const { fixtures } = require('../lib/fixtures');
const contract = require('../contracts/response.contract');

/**
 * 점 표기 경로가 응답에 있는지 확인합니다.
 * `items[].x` 는 배열이 비어 있으면 통과합니다 (데이터가 없는 것과 필드가 없는 것은 다릅니다).
 * @returns {string|null} 문제가 있으면 사유
 */
function checkField(data, spec) {
  const parts = spec.split('.');
  let cur = data;
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    const isArray = part.endsWith('[]');
    const key = isArray ? part.slice(0, -2) : part;

    if (cur === null || cur === undefined) return `'${parts.slice(0, i).join('.')}' 가 비어 있습니다`;
    if (!(key in cur)) return `'${key}' 필드가 없습니다 (있는 것: ${Object.keys(cur).slice(0, 8).join(', ')})`;
    cur = cur[key];

    if (isArray) {
      if (!Array.isArray(cur)) return `'${key}' 가 배열이 아닙니다 (${typeof cur})`;
      if (!cur.length) return null; // 데이터 없음 — 통과
      cur = cur[0];
    }
  }
  return null;
}

suite('응답 필드 계약', () => {
  const ctx = {};

  beforeAll(async () => {
    await api.ping();
    ctx.f = await fixtures();
    ctx.contract = contract(ctx.f);
  });

  test('화면이 읽는 필드가 모두 응답에 있다', async () => {
    const problems = [];
    for (const [path, def] of Object.entries(ctx.contract)) {
      let data;
      try {
        data = await api.data(path, def.params || {});
      } catch (e) {
        problems.push(`${path} — 조회 실패: ${e.message.split('\n')[0]}`);
        continue;
      }
      for (const field of def.fields || []) {
        const why = checkField(data, field);
        if (why) problems.push(`${path} → ${field} : ${why}`);
      }
    }
    eq(problems, [], '필드 이름이 어긋나면 화면이 조용히 빕니다');
  });

  test('불량 유형 합계가 불량 수량과 거의 맞는다 (수량이지 건수가 아님)', async () => {
    const f = ctx.f;
    const sum = await api.data('/quality/defects/summary', { from: f.monthFrom, to: f.monthTo });
    const byType = await api.data('/quality/defects/by-type', { from: f.monthFrom, to: f.monthTo });
    const total = (byType.items || []).reduce((a, b) => a + (b.cnt || 0), 0);

    // 불량 수량은 라벨이력, 유형 구성은 불량이력에서 안분한 값이라 두 테이블 사이에
    // 약 1~3% 어긋남이 남아 있습니다 (MES_QUERY_GUIDE 2-4 에 기록된 알려진 특성).
    // 여기서 보려는 것은 "cnt 가 건수가 아니라 수량인가" 입니다 — 건수라면 자릿수가 달라집니다.
    const gapPct = sum.ngQty ? Math.abs(sum.ngQty - total) / sum.ngQty * 100 : 0;
    ok(gapPct <= 5,
      `by-type 의 cnt 합(${total})이 ngQty(${sum.ngQty})와 ${gapPct.toFixed(1)}% 차이 납니다.\n` +
      '      5% 를 넘으면 cnt 의 의미가 바뀌었거나(건수로 회귀) 유형 제외 규칙이 달라진 것입니다.');
  });

  test('품질 불량률과 공정 대시보드 불량률이 같다', async () => {
    const f = ctx.f;
    const q = await api.data('/quality/defects/summary', { from: f.baseDate, to: f.baseDate });
    const p = await api.data('/dashboard/process/summary', { date: f.baseDate });
    eq(q.defectRate, p.defectRate, '두 화면이 같은 날짜에 다른 불량률을 보이면 안 됩니다');
    eq(q.ngQty, p.ngQty, '불량 수량도 같아야 합니다');
  });

  test('공정마다 실적 보유 기간을 따로 알려 준다', async () => {
    const all = await api.data('/common/data-range', { plantCd: 'PL01' });
    const one = await api.data('/common/data-range', { plantCd: 'PL01', processId: ctx.f.processId });
    eq(one.processId, ctx.f.processId, 'processId 를 그대로 되돌려 줘야 화면이 어느 공정 기준인지 압니다');
    eq(typeof one.toDate, 'string', '공정별 마지막 실적일이 있어야 기준일을 맞출 수 있습니다');
    eq(all.fromDate <= one.fromDate, true, '공정 구간은 전사 구간 안에 있어야 합니다');
  });
});
