/**
 * [Model] SY-15 데이터 연동 이력 — 표시·판정 규칙 (화면·엑셀이 함께 씁니다)
 *
 *  · 내부 주소 가림(SYN-05) — 서버가 응답 전에 가리는 것이 정본입니다. 화면은 같은 규칙을 한 번 더
 *    적용해, 서버 배포 전이거나 가림이 빠진 응답이 와도 사내 주소가 화면·엑셀에 나가지 않게 합니다.
 *  · 재실행 대상 판정(SYN-02) — 서버 `retryable` 이 정본입니다. 그 필드가 없는 이전 서버에서는
 *    상태(FAIL·ABORTED)로만 판정합니다. 예전 기준(`ngRows > 0`)은 행 실패 없이 검증만 어긋난
 *    FAIL 을 놓치고, 이미 성공한 작업도 재실행을 열어 두어 바꿨습니다.
 *  · 연동 상태 줄(SYN-03) — `healthState` 표시명·색·경과 시간 문구.
 */

/** IPv4 — 사설·공인 구분 없이 모두 가립니다 */
const IPV4 = /\b\d{1,3}(?:\.\d{1,3}){3}\b/g;
/** jdbc 접속 문자열 전체 */
const JDBC = /jdbc:[^\s,;'")\]]+/gi;
/** 「호스트 X, 포트 N」 · 「host X, port N」 의 호스트 (포트는 원인 판단에 필요해 남깁니다) */
const HOST_KO = /(호스트\s*)([^\s,]+)(\s*,\s*포트)/g;
const HOST_EN = /(\bhost\s+)([^\s,]+)(\s*,\s*port)/gi;

/**
 * 서버 문자열 속 내부 주소를 가립니다 (SYN-05 와 같은 규칙).
 * @param {*} text
 * @returns {*} 문자열이 아니면 그대로
 */
export function maskInternalAddress(text) {
  if (typeof text !== 'string' || !text) return text;
  return text
    .replace(JDBC, '(접속 문자열 가림)')
    .replace(HOST_KO, '$1(가림)$3')
    .replace(HOST_EN, '$1(가림)$3')
    .replace(IPV4, '***.***.***.***');
}

/** 객체의 지정한 문자열 필드만 가립니다 */
function maskFields(obj, fields) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = { ...obj };
  fields.forEach((f) => { if (typeof out[f] === 'string') out[f] = maskInternalAddress(out[f]); });
  return out;
}

const RUN_FIELDS = ['message', 'host'];
const JOB_FIELDS = ['remark', 'message', 'failReason'];

/**
 * loadSyncHistory 결과의 서버 문자열을 가립니다 — 실행 메시지·작업 비고·요약의 최근 실행 메시지
 * @param {object} data unwrapAll 결과
 */
export function maskSyncHistory(data) {
  if (!data) return data;
  const out = { ...data };
  if (data.runs?.items) out.runs = { ...data.runs, items: data.runs.items.map((r) => maskFields(r, RUN_FIELDS)) };
  if (data.list?.items) out.list = { ...data.list, items: data.list.items.map((j) => maskFields(j, JOB_FIELDS)) };
  if (data.summary) {
    out.summary = { ...data.summary, healthReason: maskInternalAddress(data.summary.healthReason) };
    if (data.summary.lastRun) out.summary.lastRun = maskFields(data.summary.lastRun, RUN_FIELDS);
  }
  return out;
}

/** 작업 상세 { job, params, errors } 의 서버 문자열을 가립니다 */
export function maskSyncJobDetail(detail) {
  if (!detail || typeof detail !== 'object') return detail;
  const job = detail.job ? maskFields(detail.job, JOB_FIELDS) : null;
  const errors = Array.isArray(detail.errors)
    ? detail.errors.map((e) => maskFields(e, ['message', 'rawData', 'payload', 'srcKey']))
    : detail.errors;
  return job ? { ...detail, job, errors } : { ...maskFields(detail, JOB_FIELDS), errors };
}

/* ───────── 숨긴 카드 (2026-09-08 요청) ───────── */

/**
 * 스키마 드리프트 · 연동 매핑 카드 표시 여부 — 지우지 않고 끈 것입니다. true 로 바꾸면 카드가 돌아옵니다.
 * 뷰(카드)와 컨트롤러(조회 여부, SYN-10)가 같은 값을 봅니다 — 숨긴 카드의 자료는 조회하지 않습니다.
 */
export const SHOW_DRIFT_CARD = false;
export const SHOW_MAP_CARD = false;

/* ───────── 재실행 대상 (SYN-02) ───────── */

/** 재실행할 수 있는 상태 — 서버 코드와 예전 표시명 둘 다 */
const RETRY_STATES = new Set(['FAIL', 'ABORTED', '실패', '중단']);

/**
 * 재실행 대상인지 — 서버 `retryable` 이 있으면 그것, 없으면 상태(FAIL·ABORTED)로.
 * @param {object} job 목록 행 또는 상세 job
 */
export function isRetryTarget(job) {
  if (!job) return false;
  if (typeof job.retryable === 'boolean') return job.retryable;
  return RETRY_STATES.has(job.state);
}

/** 이관 방식이 전체(FULL)인지 — 코드·표시명 둘 다 */
const isFull = (kind) => kind === 'FULL' || kind === '전체' || kind === 'full';

/**
 * 재실행 확인창 문구 (SYN-07) — 엔진은 테이블 단위로만 다시 돌리므로 「실패 건만」 이라고 쓰지 않습니다.
 * @param {object} cfg { jobId, srcTable, dstTable, kind, supersededBy }
 * @returns {{ sub:string, message:string }}
 */
export function retryConfirmText({ jobId, srcTable, dstTable, kind, supersededBy }) {
  const target = srcTable || dstTable ? `${srcTable || '—'} → ${dstTable || '—'}` : '대상 테이블';
  const body = isFull(kind)
    ? `${target} 을(를) 원본 전체로 다시 이관합니다. 대상 테이블 내용이 원본 기준으로 교체됩니다.`
    : `${target} 을(를) 마지막 정상 이관 시점(워터마크) 이후 구간으로 다시 이관합니다.`;
  const after = supersededBy?.jobId
    ? ` 이후 ${supersededBy.endedAt || supersededBy.startedAt || ''} 작업 ${supersededBy.jobId} 가 정상 완료되었습니다. 재실행이 필요한지 확인하십시오.`
    : '';
  return {
    sub: [jobId, srcTable || dstTable ? target : null].filter(Boolean).join(' · '),
    message: `${body} 원인이 남아 있으면 같은 오류가 반복됩니다.${after}`,
  };
}

/* ───────── 연동 상태 줄 (SYN-03) ───────── */

/** healthState → 표시명·색. 색 키는 Badge·StatCard 와 같은 이름입니다 */
export const HEALTH = {
  OK: { label: '정상', tone: '' },
  WARN: { label: '주의', tone: 'amber' },
  DOWN: { label: '중단', tone: 'red' },
};

/**
 * 경과 분 → 「3분 전」 · 「2시간 5분 전」
 * @param {number} min
 */
export function agoText(min) {
  const v = Number(min);
  if (!Number.isFinite(v) || v < 0) return '';
  if (v < 1) return '방금';
  if (v < 60) return `${Math.round(v)}분 전`;
  const h = Math.floor(v / 60);
  if (h < 48) return `${h}시간 ${Math.round(v % 60)}분 전`;
  return `${Math.floor(h / 24)}일 전`;
}

/**
 * 연동 상태 줄 한 줄 문구 — "정상 · 마지막 정상 이관 09-30 12:25 (3분 전) · 최근 실행 완료"
 * @param {object} summary 컨트롤러가 맞춘 요약
 */
export function healthLine(summary) {
  if (!summary) return '';
  const h = HEALTH[summary.healthState];
  const parts = [];
  // 상태 표시명은 줄 앞 배지가 보여 주므로 정상일 때만 글로 씁니다
  if (h && summary.healthState === 'OK') parts.push(h.label);
  if (summary.healthReason && summary.healthState !== 'OK') parts.push(summary.healthReason);
  if (summary.lastSuccessAt) {
    const ago = agoText(summary.staleMin);
    parts.push(`마지막 정상 이관 ${String(summary.lastSuccessAt).slice(5, 16)}${ago ? ` (${ago})` : ''}`);
  } else if (summary.lastBatchAt) {
    parts.push(`마지막 배치 ${String(summary.lastBatchAt).slice(5, 16)}`);
  }
  if (summary.lastRun?.stateNm || summary.lastRun?.state) parts.push(`최근 실행 ${summary.lastRun.stateNm || summary.lastRun.state}`);
  return parts.join(' · ');
}
