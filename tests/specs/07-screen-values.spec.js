/**
 * 화면 값 ↔ API 값 — 화면에 찍힌 숫자가 API 응답과 같은가
 *
 * 렌더가 되는 것과 맞는 값이 보이는 것은 다릅니다.
 * 필드 이름이 어긋나면 화면은 0 이나 '—' 를 아무 오류 없이 보여 줍니다.
 * 그래서 API 를 직접 부른 값과 화면에서 읽은 값을 하나씩 맞춰 봅니다.
 */
const { suite, test, beforeAll, afterAll, eq, ok } = require('../lib/runner');
const api = require('../lib/api');
const { fixtures } = require('../lib/fixtures');
const { open, visit, numberAfter } = require('../lib/browser');

/** 화면 글자에서 라벨 뒤 숫자를 읽고, 없으면 사유와 함께 실패시킵니다 */
function shown(text, label) {
  const v = numberAfter(text, label);
  if (v === null) throw new Error(`화면에서 '${label}' 값을 찾지 못했습니다`);
  return v;
}

suite('화면 값 ↔ API 값', () => {
  const ctx = {};

  beforeAll(async () => {
    await api.ping();
    ctx.f = await fixtures();
    const b = await open('admin');
    ctx.browser = b.browser;
    ctx.page = b.page;
  });

  afterAll(async () => {
    if (ctx.browser) await ctx.browser.close();
  });

  test('AI 통합 대시보드 — 생산량·불량률이 API 와 같다', async () => {
    const r = await visit(ctx.page, '/dashboard/ai');

    /**
     * 화면이 고른 **구간 전체**로 부릅니다
     *
     * 2026-09-06 이전에는 서버가 from·to 를 무시하고 종료일 하루만 돌려줬습니다.
     * 그래서 집계 단위를 월로 바꿔도 총 생산 수량이 하루치(15,899,217 EA)에 머물렀고,
     * 같은 화면의 AI 브리핑은 석 달치(1,219,124,241 EA)를 읽어 한 화면에 두 기간이
     * 섞여 나왔습니다. 종료일 하나로 검사하면 그 되돌림을 못 잡습니다.
     */
    const from = await ctx.page.locator('input[placeholder="YYYY-MM-DD"]').first().inputValue();
    const to = await ctx.page.locator('input[placeholder="YYYY-MM-DD"]').last().inputValue();
    ok(from < to, `기간이 하루뿐이라 구간 반영을 확인할 수 없습니다 (${from} ~ ${to})`);

    const want = await api.data('/dashboard/ai/summary', { from, to, date: to });
    const oneDay = await api.data('/dashboard/ai/summary', { date: to });
    ok(want.todayQty !== oneDay.todayQty, '구간으로 불러도 종료일 하루치와 같습니다 — 서버가 from·to 를 무시합니다');

    eq(shown(r.text, '총 생산 수량'), want.todayQty, '생산량');
    eq(shown(r.text, '평균 불량률'), want.defectRate, '불량률');
  });

  /**
   * 시간대별 불량률 — 화면이 지어낸 값을 그리지 않는가
   *
   * 2026-09-06 이전에는 서버가 준 2시간 단위 실측을 버리고, 일 단위 불량률에
   * 시간대 가감치(14시 +1.4 · 10시 +0.8 …)를 얹어 만든 값을 매트릭스에 그렸습니다.
   * 그러면 화면은 아무 오류 없이 그럴듯한 숫자를 보여 주므로 눈으로는 알 수 없습니다.
   * 84칸 전부를 서버 값과 맞춰 봅니다 — 서버가 안 준 시간대는 '—' 여야 합니다.
   */
  test('AI 통합 대시보드 — 시간대별 불량률 매트릭스가 API 실측과 같다', async () => {
    const r = await visit(ctx.page, '/dashboard/ai');
    const from = await ctx.page.locator('input[placeholder="YYYY-MM-DD"]').first().inputValue();
    const to = await ctx.page.locator('input[placeholder="YYYY-MM-DD"]').last().inputValue();
    const want = await api.data('/dashboard/ai/defect-trend', { from, to, interval: '2h' });

    const slots = want.slots || [];
    ok(slots.length > 0, '서버가 시간대별 실측(slots)을 주지 않습니다');

    const byKey = new Map(slots.map((x) => [x.slot, x]));
    const SLOT_LABELS = ['00시', '02시', '04시', '06시', '08시', '10시', '12시', '14시', '16시', '18시', '20시', '22시'];

    // 매트릭스 영역의 글자를 일자 행 단위로 끊어 12칸씩 읽습니다
    const area = r.text.slice(r.text.indexOf('일자 × 시간대별 불량률 매트릭스'));
    const lines = area.split('\n').map((x) => x.trim()).filter(Boolean);
    const rows = [];
    lines.forEach((line, i) => {
      if (/^\d{2}-\d{2}$/.test(line)) rows.push({ date: line, cells: lines.slice(i + 1, i + 13) });
    });
    ok(rows.length > 0, '매트릭스에서 일자 행을 찾지 못했습니다');

    const bad = [];
    rows.forEach((row) => {
      row.cells.forEach((text, i) => {
        const key = `${row.date} ${SLOT_LABELS[i]}`;
        const w = byKey.get(key);
        if (!w) {
          if (text !== '—') bad.push(`${key}: 서버가 주지 않은 시간대인데 화면은 ${text} 입니다`);
          return;
        }
        const want1 = `${Number(w.defectRate).toFixed(2)}%`;
        if (text !== want1) bad.push(`${key}: 화면 ${text} · 서버 ${want1}`);
      });
    });
    eq(bad, [], '매트릭스 칸이 서버 실측과 다르면 화면이 값을 만들어 낸 것입니다');
  });

  test('공정 대시보드 — 선택 조합의 수치가 API 와 같다', async () => {
    const r = await visit(ctx.page, '/dashboard/process');

    // 화면이 스스로 고른 공정·제품을 그대로 읽어 같은 조건으로 API 를 부릅니다
    const picked = await ctx.page.evaluate(() => {
      const t = document.body.innerText;
      const chips = [...t.matchAll(/([A-Z0-9()]+)\n#\d+/g)].map((m) => m[1]);
      const proc = (t.match(/시간대별 불량률 추이\n([^·\n]+)/) || [])[1];
      return { chips, proc: proc && proc.trim() };
    });
    ok(picked.chips.length, '화면이 제품을 하나도 고르지 않았습니다');

    const processes = await api.data('/common/masters/processes');
    const proc = (processes.processes || []).find((p) => p.name === picked.proc);
    ok(proc, `화면의 공정 '${picked.proc}' 을 공정 목록에서 찾지 못했습니다`);

    // 화면이 쓰는 기준일은 그 공정의 마지막 실적일입니다
    const range = await api.data('/common/data-range', { plantCd: 'PL01', processId: proc.id });
    const want = await api.data('/dashboard/process/summary', {
      date: range.toDate, processId: proc.id, productCodes: picked.chips,
    });

    eq(shown(r.text, '생산량'), want.qty, '생산량');
    eq(shown(r.text, '공정 불량률'), want.defectRate, '불량률');
  });

  /**
   * 공정별 수율 — 서버가 준 공정만 나오는가
   *
   * 2026-09-06 이전에는 서버 행이 3개 미만이면 지어낸 공정 다섯 개(프레스 97.8% ·
   * 열처리 98.5% · 표면처리 98.2% · AOI 96.9% · 조립 99.4%)로 갈아 끼웠습니다.
   * 공정 수는 날마다 다릅니다 — 2026-09-03 은 22개인데 2026-08-30(비가동일)은 2개뿐이라,
   * 조용히 넘어가는 예외가 아니라 비가동일마다 가짜 다섯 줄이 뜨던 자리였습니다.
   */
  test('공정 대시보드 — 공정별 수율이 서버가 준 공정만 보여 준다', async () => {
    const r = await visit(ctx.page, '/dashboard/process');
    const m = r.text.match(/총 (\d+)개 공정/);
    ok(m, '공정별 수율에 공정 수 표시가 없습니다');

    const want = await api.data('/dashboard/ai/process-yield', { date: ctx.f.baseDate });
    eq(Number(m[1]), (want.items || []).length, '화면 공정 수');

    const FAKE = ['프레스 (Press)', '열처리 (Heat', '표면처리 (Surface)', '자동검사 (AOI', '최종 조립'];
    const found = FAKE.filter((x) => r.text.includes(x));
    eq(found, [], '기준정보에 없는 공정이 화면에 있습니다 — 화면이 만들어 낸 행입니다');
  });

  test('불량 현황 조회 — 유형 표가 API 와 같다', async () => {
    const f = ctx.f;
    const [sum, byType] = await Promise.all([
      api.data('/quality/defects/summary', { from: f.monthFrom, to: f.monthTo }),
      api.data('/quality/defects/by-type', { from: f.monthFrom, to: f.monthTo }),
    ]);
    const r = await visit(ctx.page, '/quality/defect');

    const top = byType.items[0];
    ok(r.text.includes(top.defectType), `1위 유형 '${top.defectType}' 이 화면에 있어야 합니다`);
    eq(numberAfter(r.text, top.defectType), top.cnt, `'${top.defectType}' 행의 불량 수량`);
    ok(r.text.includes(sum.totalCnt.toLocaleString()), `불량 발생 건수 ${sum.totalCnt} 가 화면에 있어야 합니다`);

    // 비중은 불량 수량(원장)을 분모로 그립니다 — 화면이 API 의 ratio 를 그대로 쓰면 안 됩니다
    const expected = Math.round((byType.items[0].cnt / sum.ngQty) * 10000) / 100;
    ok(r.text.includes(`${expected}%`) || r.text.includes(`${expected.toFixed(1)}%`),
      `1위 유형 비중이 ${expected}% 로 그려져야 합니다 (불량 수량 ${sum.ngQty} 기준)`);
  });

  test('성과지표 대시보드 — 불량 유형 분포가 API 와 같다', async () => {
    const want = await api.data('/dashboard/kpi/defect-distribution');
    const r = await visit(ctx.page, '/dashboard/kpi');
    const top = (want.segments || [])[0];
    ok(top, '분포 데이터가 없습니다');
    ok(r.text.includes(top.label), `1위 유형 '${top.label}' 이 화면에 있어야 합니다`);
    ok(r.text.includes(top.value.toLocaleString()), `1위 유형 수량 ${top.value} 이 화면에 있어야 합니다`);
  });

  test('제품별 수율 — 요약이 API 와 같다', async () => {
    const f = ctx.f;
    const want = await api.data('/reports/yield-by-model', { yearMonth: f.yearMonth });
    const r = await visit(ctx.page, '/report/yield-by-model');
    const s = want.summary || {};
    eq(shown(r.text, '총 투입수량'), s.inputQty, '투입수량');
    eq(shown(r.text, '총 양품수량'), s.okQty, '양품수량');
    eq(shown(r.text, '전체 수율'), s.yield, '수율');
  });

  test('계정 관리 — 계정·부서 수가 API 와 같다', async () => {
    const [users, depts, pending] = await Promise.all([
      api.data('/system/users', { size: 200 }),
      api.data('/system/depts'),
      api.data('/system/users/pending'),
    ]);
    const r = await visit(ctx.page, '/system/account');

    eq(shown(r.text, '가입 계정'), (users.items || []).length, '가입 계정 수');
    eq(shown(r.text, '부서'), (depts.items || []).length, '부서 수');
    eq(shown(r.text, '승인 대기'), (pending.items || []).length, '승인 대기 건수');
  });

  test('메뉴 접근 권한 — 부서·화면 수가 API 와 같다', async () => {
    const want = await api.data('/system/menu-perms');
    const r = await visit(ctx.page, '/system/menu-perm');
    eq(shown(r.text, '관리 대상 화면'), (want.screens || []).length, '화면 수');
    eq(shown(r.text, '부서'), (want.depts || []).length, '부서 수');
  });

  test('데이터 접근 권한 — 부서 이름이 코드가 아닌 이름으로 나온다', async () => {
    const want = await api.data('/system/data-perms');
    const r = await visit(ctx.page, '/system/data-perm');
    const first = (want.depts || [])[0];
    ok(first, '부서가 없습니다');
    ok(r.text.includes(first.deptNm), `부서명 '${first.deptNm}' 이 보여야 합니다 (deptId 가 아니라)`);
  });

  test('생산 실적 — 첫 행이 API 와 같다', async () => {
    const f = ctx.f;
    const want = await api.data('/production/results', { from: f.monthFrom, to: f.monthTo, unit: 'day' });
    const first = (want.items || [])[0];
    if (!first) return; // 실적이 없으면 검사 대상 아님
    const r = await visit(ctx.page, '/production/result');
    ok(r.text.includes(first.period), `첫 행 기간 ${first.period} 이 화면에 있어야 합니다`);
    ok(r.text.includes(first.inputQty.toLocaleString()), `첫 행 투입수량 ${first.inputQty} 가 화면에 있어야 합니다`);
  });

  /**
   * 실적 집계 3단계 — 설비가 실제로 만든 것인가
   *
   * 2026-09-06 이전에는 이 자리가 통째로 지어낸 값이었습니다. 제품명 해시로 설비 코드를
   * 만들고(MT-0{hash%15+1}), 수량을 55/35/10, 불량을 60/28/12 로 쪼개고, 공장은 프레스
   * 번호가 10 이하면 제1공장이라 적었습니다. 균등 분배라 세 줄이 비슷한 불량률로 나오는데
   * 실제는 한 대가 65% 로 터지고 나머지가 0.0~0.9% 인 그림이라, 설비별로 보는 이유였던
   * 편차를 정확히 지우고 있었습니다. 엑셀에도 그대로 나갔습니다.
   */
  test('실적 집계 조회 — 3단계 설비가 서버 실적에 있는 설비다', async () => {
    await visit(ctx.page, '/production/result', { settle: 12000 });

    // 첫 일자 행과 그 아래 첫 제품 행을 펼칩니다
    const expand = async (n) => ctx.page.evaluate((k) => {
      const els = [...document.querySelectorAll('.tabulator-data-tree-control')];
      if (els[k]) els[k].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }, n);
    await expand(0);
    await ctx.page.waitForTimeout(5000);
    await expand(1);
    await ctx.page.waitForTimeout(3000);

    const shown = await ctx.page.evaluate(() =>
      [...document.querySelectorAll('[data-depth="3"]')].map((e) => e.innerText.trim()));
    ok(shown.length > 0, '3단계 행이 없습니다 (펼치기 실패)');

    // 지어낼 때 쓰던 이름 규칙이 남아 있으면 되돌아간 것입니다
    const fake = shown.filter((t) => /MT-0\d|AOI-0\d/.test(t));
    eq(fake, [], '설비 마스터에 없는 이름 규칙이 보입니다 — 화면이 설비를 만들어 낸 것입니다');

    // 화면에 뜬 설비 코드가 **그 일자** 서버 실적에 실제로 있는가
    // 필터의 시작일이 아니라 펼친 행의 일자를 읽어야 합니다 — 다른 날로 맞추면 헛돕니다
    const first = await ctx.page.evaluate(() => {
      const row = document.querySelector('.tabulator-row');
      const m = row && row.innerText.match(/\d{4}-\d{2}-\d{2}/);
      return m ? m[0] : null;
    });
    ok(first, '펼친 행의 일자를 읽지 못했습니다');
    const want = await api.data('/dashboard/ai/line-products', { date: first, size: 0 });
    const codes = new Set((want.lines || want.items || []).map((x) => x.eqptCd));
    ok(codes.size > 0, `서버가 ${first} 설비별 실적을 주지 않습니다`);

    const bad = shown
      .map((t) => (t.match(/\b([A-Z]{2}-\d{3})\b/) || [])[1])
      .filter((c) => c && !codes.has(c));
    eq([...new Set(bad)], [], '화면에 있는 설비가 서버 실적에는 없습니다');
  });

  test('제품군 순위 관리 — 순위 이동 셀렉트와 제품 순서 버튼이 겹치지 않는다', async () => {
    await visit(ctx.page, '/system/product-rank');
    const select = await ctx.page.locator('div[tabindex="0"], [role="button"]').filter({ hasText: /^1$/ }).first().boundingBox();
    const detail = await ctx.page.locator('text=제품 순서').first().boundingBox();
    ok(select, '순위 셀렉트가 있어야 합니다');
    ok(detail, '제품 순서 버튼이 있어야 합니다');
    const gap = detail.x - (select.x + select.width);
    ok(gap >= 8, `순위 셀렉트 우측(${select.x + select.width})과 제품 순서 버튼(${detail.x}) 사이에 여백이 있어야 합니다 (현재: ${gap}px)`);
  });
});
