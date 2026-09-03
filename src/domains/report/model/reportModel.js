/**
 * [Model] 보고서 화면 공통 변환 규칙 (RP-01 ~ RP-07)
 *
 * 서버가 주는 코드값(신호등 state · 공정 마스터 · 폐기 구분)을 화면 표기로 바꾸고,
 * 화면의 선택값을 서버 파라미터로 되돌리는 규칙을 한 곳에 모았습니다.
 * 선택지 자체는 서버(공정 마스터 · 공통코드)에서 받고, 여기서는 묶는 규칙만 둡니다.
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

/* ───────── 폐기 보고서 ───────── */

/** 폐기 단가 출처 코드 → 표기 (서버 `priceSource` — MASTER | MANUAL) */
export const PRICE_SOURCES = {
  MASTER: { label: '기준정보', tone: 'green' },
  MANUAL: { label: '수기 조정', tone: 'amber' },
};

/** 폐기 발생 구분 — 서버 MES 전표 조회의 `originType` 판정값 (ScrapReportRepository CASE 식과 같음) */
export const VOUCHER_ORIGIN_TYPES = ['제조공정 발생', '협력업체 발생', 'IQC 발생'];
