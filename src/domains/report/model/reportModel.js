/**
 * [Model] 보고서 화면 공통 변환 규칙 (RP-01 ~ RP-07)
 *
 * 서버가 주는 코드값(신호등 state · 공정 마스터 · 폐기 구분 · 단가 출처)을 화면 표기로 바꾸고,
 * 화면의 선택값을 서버 파라미터로 되돌리는 규칙을 한 곳에 모았습니다.
 * 선택지 자체는 서버(공정 마스터 · 공통코드)에서 받고, 여기서는 묶는 규칙만 둡니다.
 *
 * 리포지토리(reportRepository)는 API 호출을, 이 파일은 순수 변환만 맡습니다.
 */
import { comma } from '@shared/utils/formatUtil';

/* ───────── 신호등 (아침회의 자료) ───────── */

/**
 * 서버 신호등 코드 → 화면 표기
 * 서버(`/reports/press-morning` · `/plating-morning`)는 `state` 를 NORMAL | WARN | CRIT 로 내려줍니다.
 */
export const SIGNALS = {
  NORMAL: { code: 'NORMAL', label: '정상', tone: 'ok', badge: 'green' },
  WARN: { code: 'WARN', label: '주의', tone: 'warn', badge: 'amber' },
  CRIT: { code: 'CRIT', label: '위험', tone: 'bad', badge: 'red' },
};

/** 상태 조회 조건 선택지 — 화면은 한글, 서버로는 `stateCodeOf()` 로 코드를 보냅니다 */
export const SIGNAL_STATE_OPTIONS = ['전체', ...Object.values(SIGNALS).map((x) => x.label)];

/** 'CRIT' → { label:'위험', tone:'bad' } (모르는 값은 그대로 표시) */
export function signalOf(state) {
  return SIGNALS[String(state || '').toUpperCase()] || { code: state, label: state || '-', tone: '', badge: '' };
}

/** '위험' → 'CRIT' ('전체' 는 undefined — 조건 없음) */
export function stateCodeOf(label) {
  if (!label || label === '전체') return undefined;
  const found = Object.values(SIGNALS).find((x) => x.label === label || x.code === String(label).toUpperCase());
  return found?.code;
}

/** 행 목록의 신호등 건수 */
export function countSignals(rows = []) {
  const out = { ok: 0, warn: 0, bad: 0 };
  rows.forEach((r) => {
    const t = signalOf(r.state).tone;
    if (t === 'ok') out.ok += 1;
    else if (t === 'warn') out.warn += 1;
    else if (t === 'bad') out.bad += 1;
  });
  return out;
}

/** 행 묶음에서 가장 나쁜 신호등 (bad > warn > ok) */
export function worstSignal(rows = []) {
  const c = countSignals(rows);
  if (c.bad) return SIGNALS.CRIT;
  if (c.warn) return SIGNALS.WARN;
  return SIGNALS.NORMAL;
}

/* ───────── 공정 묶음 (공정 마스터 이름 기준) ───────── */

/**
 * 아침회의 자료가 쓰는 공정 묶음.
 * 서버 공정 마스터(`/common/masters/processes`)의 이름으로 판정합니다 — 코드는 화면에 두지 않습니다.
 *   · Press     : 'A-프레스 작업장(M-1공장)' …
 *   · A Plating : 'A1-PLATING(입고-렉온)' · 'A-PLATING(선별-출하)' …
 *   · B Plating : 'B1-PLATING(입고-렉온)' · 'B-PLATING' …
 *   · Coating   : 'A1-COATING' · 'Coating 1 (…)' …
 */
export const PROCESS_GROUPS = [
  { key: 'press', label: 'Press', test: (n) => /프레스|press/i.test(n) },
  { key: 'aPlating', label: 'A Plating', test: (n) => /^A\d?\s*-?\s*PLATING/i.test(n) },
  { key: 'bPlating', label: 'B Plating', test: (n) => /^B\d?\s*-?\s*PLATING/i.test(n) },
  { key: 'coating', label: 'Coating', test: (n) => /coating/i.test(n) },
];

/** 공정 이름 → 묶음 라벨 ('기타' 는 어느 묶음에도 들지 않는 공정) */
export function processGroupLabel(name) {
  const g = PROCESS_GROUPS.find((x) => x.test(String(name || '')));
  return g ? g.label : '기타';
}

/**
 * 공정 마스터를 묶음별로 나눕니다.
 * @param {Array<{id:string,name:string}>} processes
 * @returns {Object<string, Array<{id:string,name:string}>>} { press:[…], aPlating:[…], bPlating:[…], coating:[…] }
 */
export function groupProcesses(processes = []) {
  const out = Object.fromEntries(PROCESS_GROUPS.map((g) => [g.key, []]));
  processes.forEach((p) => {
    const g = PROCESS_GROUPS.find((x) => x.test(String(p.name || '')));
    if (g) out[g.key].push({ id: p.id, name: p.name });
  });
  return out;
}

/** 공정 id 목록 → 서버 `processScope` 파라미터 (쉼표 구분). 비어 있으면 undefined */
export const processScopeOf = (list = []) => (list.length ? list.map((p) => p.id).join(',') : undefined);

/**
 * 아침회의 조회 조건 → 서버 파라미터.
 * 화면 선택값('전체' · 묶음 키 · 공정 id)을 processScope(공정 id 쉼표 목록) 로 바꿉니다.
 * @param {string} scope '전체' | 묶음 key(press…) | 공정 id
 * @param {object} groups groupProcesses() 결과
 * @param {string[]} allKeys 이 화면이 다루는 묶음 key 목록 ('전체' 일 때 합칩니다)
 */
export function morningScopeParam(scope, groups = {}, allKeys = []) {
  if (!scope || scope === '전체') return processScopeOf(allKeys.flatMap((k) => groups[k] || []));
  if (groups[scope]) return processScopeOf(groups[scope]);
  return scope;
}

/* ───────── 표기 ───────── */

/** 수량(EA) → 천 단위 'k' 표기. 1,220,050 → '1,220k' (값이 없으면 '—') */
export function kk(n) {
  if (n === null || n === undefined || n === '') return '—';
  const num = Number(n);
  if (Number.isNaN(num)) return String(n);
  return `${comma(Math.round(num / 1000))}k`;
}

/** '2026-09-02' → '26.09.02' (보고서 상단 날짜 박스) */
export function dateBoxOf(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1].slice(2)}.${m[2]}.${m[3]}` : String(iso || '');
}

/** 날짜·시각 문자열의 날짜 부분만 ('2026-09-02T10:00:00' → '2026-09-02') */
export const dateOnly = (v) => (v ? String(v).slice(0, 10) : '-');

/** 분모가 0 이거나 값이 없으면 '—', 아니면 소수 1자리 백분율 */
export function pctOf(part, total, digits = 1) {
  const p = Number(part);
  const t = Number(total);
  if (!t || Number.isNaN(p) || Number.isNaN(t)) return '—';
  return `${((p / t) * 100).toFixed(digits)}%`;
}

/* ───────── 폐기 보고서 ───────── */

/** 폐기 단가 출처 코드 → 표기 (서버 `priceSource` — MASTER | MANUAL) */
export const PRICE_SOURCES = {
  MASTER: { label: '기준정보', tone: 'green' },
  MANUAL: { label: '수기 조정', tone: 'amber' },
};
export const priceSourceOf = (code) => PRICE_SOURCES[String(code || '').toUpperCase()] || { label: code || '-', tone: '' };

/** 단가가 비어 있는 행 = 미산정 (금액 합계에서 제외) */
export const isPendingPrice = (row) => row?.unitPrice === null || row?.unitPrice === undefined;

/** 폐기 발생 구분 — 서버 MES 전표 조회의 `originType` 판정값 (ScrapReportRepository CASE 식과 같음) */
export const VOUCHER_ORIGIN_TYPES = ['제조공정 발생', '협력업체 발생', 'IQC 발생'];

/**
 * 위저드 1단계 조회 조건 → 서버 파라미터.
 * 서버는 processId · modelCd · originType · from · to · defectTypeCd 만 받고, '전체' 는 조건 없음입니다.
 * ('전체' 문자열을 그대로 보내면 일치하는 코드가 없어 0건이 됩니다)
 */
export function scrapCondParams(cond = {}) {
  const pick = (v) => (v === undefined || v === null || v === '' || v === '전체' ? undefined : v);
  return {
    from: cond.from,
    to: cond.to,
    processId: pick(cond.processId ?? cond.process),
    modelCd: pick(cond.modelCd ?? cond.model),
    originType: pick(cond.originType),
    defectTypeCd: pick(cond.defectTypeCd),
  };
}

/** 위저드 2단계 문서 기본 정보 초기값 (서버 초안 생성 응답에는 양식 값이 없어 화면에서 시작값을 둡니다) */
export function defaultScrapForm({ docNo, writer, writeDate } = {}) {
  return {
    docNo: docNo || '',
    retention: '3 년',
    process: '',
    vendor: '',
    maker: '',
    writer: writer || '',
    writeDate: writeDate || '',
    origin: ['제조공정 발생'],
    description: '',
  };
}

/** 문서 기본 정보 → 서버 `form` (서버는 평평한 값만 받습니다 — 체크 3종은 쉼표 문자열로) */
export function scrapFormPayload(form = {}) {
  const out = {};
  Object.entries(form).forEach(([k, v]) => {
    if (Array.isArray(v)) out[k] = v.join(', ');
    else if (v !== undefined && v !== null && typeof v !== 'object') out[k] = v;
  });
  return out;
}

/** 위저드 4단계 검토·결재선 초기값 */
export function defaultScrapReview(depts = []) {
  return {
    depts: depts.map((dept) => ({ dept, manager: '', memo: '', on: true })),
    appr: { draft: '', review: '', approve: '' },
    due: '',
    notifyChannels: ['메일', '시스템 팝업'],
  };
}

/** 검토·결재선 → 서버 `approval-line` 바디 (appr · due · depts[{dept,manager}] · notifyChannels 만 받습니다) */
export function approvalLinePayload(review = {}) {
  return {
    depts: (review.depts || []).filter((d) => d.on !== false).map((d) => ({ dept: d.dept, manager: d.manager || '' })),
    appr: { draft: review.appr?.draft || '', review: review.appr?.review || '', approve: review.appr?.approve || '' },
    due: review.due || undefined,
    notifyChannels: review.notifyChannels || [],
  };
}

/** 수기 폐기 행 입력 → 서버 바디 (reason · qty · model · occurDate · process · kind · itemCd 만 받습니다) */
export function manualRowPayload(values = {}) {
  const out = {
    kind: values.kind,
    model: values.model,
    process: values.process,
    qty: Number(values.qty),
    reason: values.reason || values.name || '',
  };
  if (values.occurDate) out.occurDate = values.occurDate;
  if (values.itemCd) out.itemCd = values.itemCd;
  return out;
}
