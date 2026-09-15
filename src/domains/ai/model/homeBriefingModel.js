/**
 * [Model] 자연어 질의 홈 브리핑 — 서버 응답을 "읽는 글" 로 바꿉니다
 *
 * 홈 화면은 사용자가 질의하기 전에 세 가지 프리셋(불량률 · 공정 현황 · 현재 이슈)을 문장으로 보여 줍니다.
 * 이 파일은 순수 함수만 둡니다 — 값이 없으면 없다고 적고, 만들어 내지 않습니다.
 *
 * [가리기] 문장을 여기서 조립하므로 권한 없는 값을 가리는 것도 여기 몫입니다. 표는 열이 통째로
 * 가려지는데 브리핑만 새면 가린 의미가 없습니다. 다만 순수 함수를 지키려고 권한 판정은 직접 하지
 * 않고 `can(응답 필드명)` 을 인자로 받습니다 — 부르는 쪽이 넣어 줍니다.
 */

/** 숫자 → '1,234' (null 이면 '—') */
const comma = (v) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? '—' : Number(v).toLocaleString('ko-KR'));
/** 숫자 → '2.14' */
const fixed = (v, d = 2) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? '—' : Number(v).toFixed(d));

/**
 * 시각에 맞는 인사말
 * @param {string} name 사용자 이름
 * @param {Date} [now]
 */
export function greetingFor(name, now = new Date()) {
  const h = now.getHours();
  const word = h < 5 ? '늦은 시간까지 수고가 많으십니다' : h < 12 ? '좋은 아침입니다' : h < 18 ? '좋은 오후입니다' : '좋은 저녁입니다';
  return name ? `${name}님, ${word}.` : `${word}.`;
}

/**
 * 프리셋 문단 3개를 만듭니다.
 *
 * @param {object} data { summary, processYield, alerts, alertTotal, period:{from,to}, errors }
 * @returns {Array<{ key:string, title:string, tone:'ok'|'warn'|'bad'|'muted', lines:string[], query:string }>}
 */
export function buildBriefingSections(data = {}, can = () => true) {
  const { summary, processYield, alerts, alertTotal, period, errors = {} } = data;
  const range = period?.from && period?.to ? `${period.from} ~ ${period.to}` : '최근 기간';

  return [
    defectSection(summary, range, errors.summary, can),
    processSection(processYield, errors.processYield, can),
    issueSection(alerts, alertTotal, errors.alerts),
  ];
}

/** 권한이 없으면 값 자리에 「비공개」를 넣습니다 — 문장 구조는 그대로 둡니다 */
const shown = (can, attr, text) => (can(attr) ? text : '비공개');

/* ── 불량률 ─────────────────────────────────────────── */
function defectSection(summary, range, error, can) {
  if (error) return { key: 'defect', title: '불량률', tone: 'muted', lines: ['생산 요약을 불러오지 못했습니다. 잠시 후 다시 확인하십시오.'], query: '최근 7일 불량률 추이를 알려줘' };
  if (!summary || summary.defectRate === null || summary.defectRate === undefined) {
    return { key: 'defect', title: '불량률', tone: 'muted', lines: [`${range} 집계된 불량률이 없습니다.`], query: '최근 7일 불량률 추이를 알려줘' };
  }
  const rate = Number(summary.defectRate);
  const target = summary.targetDefectRate != null ? Number(summary.targetDefectRate) : 3.0;
  const tone = rate >= target + 1 ? 'bad' : rate >= target ? 'warn' : 'ok';
  const lines = [];
  const rateText = shown(can, 'defectRate', `${fixed(rate)}%`);
  lines.push(
    `${range} 평균 불량률은 ${rateText} 입니다. 관리 목표 ${fixed(target, 1)}% 대비 ` +
      `${rate < target ? `${shown(can, 'defectRate', `${fixed(target - rate)}%p`)} 낮아 양호합니다` : `${shown(can, 'defectRate', `${fixed(rate - target)}%p`)} 높아 점검이 필요합니다`}.`
  );
  if (summary.todayQty != null) {
    lines.push(
      `총 생산 ${shown(can, 'todayQty', `${comma(summary.todayQty)} EA`)} · ` +
        `양품 ${shown(can, 'okQty', `${comma(summary.okQty)} EA`)} · ` +
        `불량 ${shown(can, 'ngQty', `${comma(summary.ngQty)} EA`)} 입니다.`
    );
  }
  if (summary.targetQty) {
    lines.push(
      `일목표 ${shown(can, 'todayQty', `${comma(summary.targetQty)} EA`)} 대비 ` +
        `달성률 ${shown(can, 'yieldRate', `${fixed(summary.progressRate ?? 0, 1)}%`)} 입니다.`
    );
  }
  return { key: 'defect', title: '불량률', tone, lines, query: '최근 7일 불량률 추이를 알려줘' };
}

/* ── 공정 현황 ───────────────────────────────────────── */
function processSection(processYield, error, can) {
  if (error) return { key: 'process', title: '공정 현황', tone: 'muted', lines: ['공정별 수율을 불러오지 못했습니다.'], query: '공정별 수율 현황을 알려줘' };
  const items = (processYield?.items || []).filter((x) => (x.yieldRate ?? x.v) !== null && (x.yieldRate ?? x.v) !== undefined);
  if (!items.length) return { key: 'process', title: '공정 현황', tone: 'muted', lines: ['수율이 집계된 공정이 없습니다.'], query: '공정별 수율 현황을 알려줘' };

  const target = Number(processYield?.target) || 97.0;
  const rateOf = (x) => Number(x.yieldRate ?? x.v);
  const nameOf = (x) => x.process || x.processNm || x.l || x.processId || '공정';
  const below = items.filter((x) => rateOf(x) < target).sort((a, b) => rateOf(a) - rateOf(b));
  const avg = items.reduce((a, x) => a + rateOf(x), 0) / items.length;
  const tone = below.some((x) => rateOf(x) < target - 1.5) ? 'bad' : below.length ? 'warn' : 'ok';

  const yieldOf = (x) => shown(can, 'yieldRate', `${fixed(rateOf(x))}%`);
  const lines = [
    `${items.length}개 공정 평균 수율은 ${shown(can, 'yieldRate', `${fixed(avg)}%`)} 이며, ` +
      `목표 ${fixed(target, 1)}% 를 ${below.length ? `${below.length}개 공정이 밑돌고 있습니다` : '모든 공정이 충족합니다'}.`,
  ];
  if (below.length) {
    lines.push(`주의 공정: ${below.slice(0, 3).map((x) => `${nameOf(x)} ${yieldOf(x)}`).join(' · ')}${below.length > 3 ? ` 외 ${below.length - 3}개` : ''}.`);
  } else {
    const best = [...items].sort((a, b) => rateOf(b) - rateOf(a))[0];
    if (best) lines.push(`가장 높은 공정은 ${nameOf(best)} ${yieldOf(best)} 입니다.`);
  }
  return { key: 'process', title: '공정 현황', tone, lines, query: '공정별 수율 현황을 알려줘' };
}

/* ── 현재 이슈 ───────────────────────────────────────── */
function issueSection(alerts, alertTotal, error) {
  if (error) return { key: 'issue', title: '현재 이슈', tone: 'muted', lines: ['이상 알림을 불러오지 못했습니다.'], query: '미확인 이상 알림을 정리해줘' };
  const list = alerts || [];
  const total = alertTotal ?? list.length;
  if (!list.length) return { key: 'issue', title: '현재 이슈', tone: 'ok', lines: ['미확인 이상 알림이 없습니다.'], query: '최근 발생한 이상 알림을 알려줘' };

  const crit = list.filter((a) => /CRIT|RED|HIGH/i.test(String(a.level ?? ''))).length;
  const tone = crit ? 'bad' : 'warn';
  const lines = [`미확인 이상 알림이 ${comma(total)}건 있습니다${crit ? ` (심각 ${crit}건)` : ''}.`];
  list.slice(0, 3).forEach((a) => {
    const who = a.eqptNm || a.eqptCd;
    lines.push(`· ${a.title || a.type || '알림'}${who ? ` — ${who}` : ''}${a.occurredAt ? ` (${a.occurredAt})` : ''}`);
  });
  if (total > 3) lines.push(`외 ${comma(total - 3)}건은 상단 알림에서 확인하십시오.`);
  return { key: 'issue', title: '현재 이슈', tone, lines, query: '미확인 이상 알림을 정리해줘' };
}
