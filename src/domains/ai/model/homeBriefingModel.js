/**
 * [Model] 자연어 질의 홈 브리핑 — 서버 응답을 "읽는 글" 로 바꿉니다
 *
 * 홈 화면은 사용자가 질의하기 전에 「AI 브리핑」(사내 LLM 이 쓴 문장)과 「현재 이슈」(미확인 알림)를 보여 줍니다.
 * 이 파일은 순수 함수만 둡니다 — AI 문장은 서버가 준 그대로 쓰고, 값이 없으면 없다고 적습니다.
 * 권한은 서버가 모델 입력에서부터 가립니다(브리핑 입력의 maskedFields).
 */

/** 숫자 → '1,234' (null 이면 '—') */
const comma = (v) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? '—' : Number(v).toLocaleString('ko-KR'));

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
 * 브리핑 문단을 만듭니다 — 「AI 브리핑」(사내 LLM 문장) · 「현재 이슈」(알림 목록)
 *
 * AI 문단은 서버가 준 `lines[].text` 를 그대로 씁니다. 서버가 근거 값을 다시 계산해 대조했고
 * 권한 없는 항목은 모델 입력에서부터 빠져 있습니다. 여기서 문장을 만들거나 고치지 않습니다.
 *
 * @param {object} data { briefing, alerts, alertTotal, errors }
 * @returns {Array<{ key:string, title:string, tone:'ok'|'warn'|'bad'|'muted', lines:string[], query:string }>}
 */
export function buildBriefingSections(data = {}) {
  const { briefing, alerts, alertTotal, errors = {} } = data;
  return [aiSection(briefing, errors.briefing), issueSection(alerts, alertTotal, errors.alerts)];
}

/** 근거 한 조각 → '전체 불량률 2.40%' · '총 생산 수량 107,339,543 EA' (값이 없으면 빈 글) */
function evidenceText(e) {
  if (!e || e.kind === 'doc' || e.value === null || e.value === undefined || !e.label) return '';
  const n = Number(e.value);
  if (Number.isNaN(n)) return '';
  if (e.unit === '%') return `${e.label} ${n.toFixed(2)}%`;
  return `${e.label} ${comma(n)}${e.unit ? ` ${e.unit}` : ''}`;
}

/** 서버 사유 → 안내 (AI 문장이 없을 때만) */
const AI_REASON = {
  MODEL_BUSY: 'AI 서버가 다른 분석을 처리하고 있습니다. 잠시 뒤 다시 확인하십시오.',
  MODEL_NOT_READY: 'AI 서버에 연결할 수 없어 브리핑을 만들지 못했습니다.',
};

/* ── AI 브리핑 (사내 LLM) ────────────────────────────── */
function aiSection(briefing, error) {
  const query = '최근 7일 생산·품질 현황을 알려줘';
  if (error) return { key: 'ai', title: 'AI 브리핑', tone: 'muted', lines: ['AI 브리핑을 불러오지 못했습니다.'], query };
  // 문장 뒤에 그 문장의 근거 값을 붙입니다 — 모델은 숫자를 문장이 아니라 evidence 에만 담고,
  // label·value·unit 은 서버가 다시 계산한 값으로 덮어써 내려 줍니다(AI 대시보드 카드와 같은 값).
  const lines = (briefing?.lines || [])
    .map((l) => {
      const text = String(l?.text || '').trim();
      const ev = (l?.evidence || []).map(evidenceText).filter(Boolean);
      return text ? (ev.length ? `${text} (${ev.join(' · ')})` : text) : '';
    })
    .filter(Boolean);
  if (!lines.length) {
    return { key: 'ai', title: 'AI 브리핑', tone: 'muted', lines: [AI_REASON[briefing?.reason] || '근거를 확인한 AI 문장이 없습니다.'], query };
  }
  return { key: 'ai', title: 'AI 브리핑', tone: 'ok', lines, query, modelVer: briefing?.modelVer || null };
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
