/**
 * [Model] 이상 알림 발송 조건(SY-04)·알림 수신자(SY-05) 폼 값 변환
 *
 * 화면 폼 값 ↔ API 요청 본문을 바꾸는 계산만 둡니다(JSX 없음).
 *  · 편집 초기값은 **상세 응답**에서 만듭니다 — 목록 행에는 없는 값이 있어 그것으로 채우면 저장 때 덮입니다.
 *  · 수정 본문은 **바뀐 키만** 담습니다 — 서버는 보내지 않은 키를 그대로 둡니다(기획 05 ALC-04 · 06 RCP-02).
 */

/** 엔진이 해석하는 대상 구분 (ConditionEvaluator) — 나머지는 8장 Q-01 결정 전까지 고를 수 없습니다 */
export const ENGINE_TARGETS = ['ALL_EQPT', 'PICK'];
/** 지금 연동된 채널 — SMS·메신저는 연동 전 (기획 05 4.1 비목표) */
export const LIVE_CHANNELS = ['MAIL', 'POPUP'];

/** 개별 설비 항목 → 코드 (서버가 문자열 또는 객체로 줄 수 있습니다) */
const pickCode = (p) => (p && typeof p === 'object' ? p.targetCd ?? p.eqptCd ?? p.code ?? '' : String(p ?? ''));

/*
 * 「고급 설정」(평가 단위 · 평가 주기 · 지정 시각 · 시간대 무시 · 자동 해제 · 메시지 틀 · 승격 적용)은 2026-10-03 에
 * 엔진 · API · DB 와 함께 없앴습니다. 모든 조건이 고정값으로 동작합니다(평가 단위 = 지표 수집 단위, 60초 주기,
 * 시간대 지킴, 해제 기록 없음, 엔진 기본 메시지, 조건별 승격 없음, 일 마감 · 일 1회 = 08:00 기준).
 */
/** 더 이상 고를 수 없는 유효 시간대 — 지정 시각 1회(ONCE)는 지정 시각이 없어져 뜻이 없습니다 */
export const RETIRED_WINDOWS = ['ONCE'];

/** 편집 초기값 — 상세 응답을 폼 키로 */
export function condInitial(detail) {
  if (!detail) {
    return {
      severity: 'WARN', channels: ['MAIL'], groupIds: [], validWindow: 'ALWAYS', dedupMin: 'M30', op: 'GE',
      duration: 'IMMEDIATE', targetScope: 'ALL_EQPT', target: '', pickTargets: [], thresholdVal: '',
    };
  }
  const groupIds = Array.isArray(detail.groupIds) && detail.groupIds.length
    ? detail.groupIds
    : (detail.groups || []).map((g) => (g && typeof g === 'object' ? g.groupId : null)).filter((x) => x !== null && x !== undefined);
  return {
    name: detail.name ?? '',
    metricStdId: detail.metricStdId ?? detail.metricId ?? '',
    op: detail.op ?? '',
    thresholdVal: detail.thresholdVal ?? detail.threshold ?? '',
    duration: detail.duration ?? '',
    targetScope: detail.targetScope ?? 'ALL_EQPT',
    target: detail.target ?? '',
    pickTargets: (detail.pickTargets || []).map(pickCode).filter(Boolean),
    severity: detail.severity ?? '',
    channels: Array.isArray(detail.channels) ? detail.channels : [],
    groupIds,
    validWindow: detail.validWindow ?? '',
    dedupMin: detail.dedupMin ?? '',
  };
}

const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * 제출 본문 — 등록은 전체, 수정은 바뀐 키만(+updatedAt)
 *
 * @param {object} v 폼 값
 * @param {object} initial condInitial 결과
 * @param {object|null} detail 상세 응답 (수정일 때)
 */
export function condBody(v, initial, detail) {
  const thresholdVal = v.thresholdVal === '' || v.thresholdVal === null || v.thresholdVal === undefined ? null : Number(v.thresholdVal);
  const full = {
    name: String(v.name || '').trim(),
    metricStdId: v.metricStdId === '' ? null : Number(v.metricStdId),
    op: v.op,
    thresholdVal,
    // 예전 서버는 threshold(문자열)를 읽습니다 — 한 릴리스 동안 함께 보냅니다
    threshold: thresholdVal === null ? null : String(v.thresholdVal).trim(),
    duration: v.duration,
    targetScope: v.targetScope,
    target: String(v.target || '').trim(),
    pickTargets: v.targetScope === 'PICK' ? (v.pickTargets || []) : [],
    severity: v.severity,
    channels: v.channels || [],
    groupIds: v.groupIds || [],
    validWindow: v.validWindow,
    dedupMin: v.dedupMin,
  };
  if (!detail) {
    const body = { ...full };
    if (!body.target) delete body.target;
    if (body.targetScope !== 'PICK') delete body.pickTargets;
    return body;
  }
  const before = {
    ...initial,
    metricStdId: initial.metricStdId === '' ? null : Number(initial.metricStdId),
    thresholdVal: initial.thresholdVal === '' ? null : Number(initial.thresholdVal),
    target: String(initial.target || '').trim(),
    pickTargets: initial.targetScope === 'PICK' ? initial.pickTargets : [],
  };
  const body = {};
  Object.keys(full).forEach((k) => {
    if (k === 'threshold') return;
    if (!same(full[k], before[k])) body[k] = full[k];
  });
  if ('thresholdVal' in body) body.threshold = full.threshold;
  // 개별 설비에서 다른 범위로 바꾸면 남은 설비 선택을 지웁니다 (preserveEmpty 로 [] 가 실립니다)
  if ('targetScope' in body && body.targetScope !== 'PICK' && initial.pickTargets?.length) body.pickTargets = [];
  if (detail.updatedAt) body.updatedAt = detail.updatedAt;
  return body;
}

/** 입력 검증 — 필수 외의 규칙 (서버도 같은 규칙으로 400, ALC-12) */
export function validateCond(v) {
  const e = {};
  if (v.name && String(v.name).trim().length > 100) e.name = '조건명은 100자까지 입력할 수 있습니다.';
  const t = String(v.thresholdVal ?? '').trim();
  if (!t) e.thresholdVal = '임계값을 입력해 주세요.';
  else if (!/^-?\d+(\.\d{1,4})?$/.test(t)) e.thresholdVal = '임계값을 숫자로 입력해 주십시오. (소수 4자리까지, 단위 없이)';
  if (v.target && String(v.target).trim().length > 200) e.target = '대상 설명은 200자까지 입력할 수 있습니다.';
  if (v.targetScope === 'PICK' && !(v.pickTargets || []).length) e.pickTargets = '개별 설비 선택은 설비를 1대 이상 골라야 합니다.';
  if (v.targetScope === 'PICK' && (v.pickTargets || []).length > 500) e.pickTargets = '개별 설비는 500대까지 고를 수 있습니다.';
  if (!(v.channels || []).length) e.channels = '발송 채널을 1개 이상 선택해 주십시오.';
  if (!(v.groupIds || []).length) e.groupIds = '수신 그룹을 1개 이상 선택해 주십시오.';
  if (RETIRED_WINDOWS.includes(v.validWindow)) e.validWindow = '지정 시각 1회는 더 이상 쓰지 않습니다. 다른 유효 시간대를 고르십시오.';
  return e;
}

/**
 * 도달 미리보기 (ALC-06) — 고른 그룹마다 「수신 N명 / 전체 M명」 과 조건 채널 ∩ 그룹 채널
 *
 * 그룹 목록에 멤버가 오면(수신자 관리 권한) 사람 단위로 중복을 빼고, 없으면(발송 조건 권한만) 그룹 수신 인원을 더합니다.
 *
 * @param {Array} groupIds 고른 그룹
 * @param {string[]} channels 조건 채널
 * @param {Array} groups 수신 그룹 목록
 * @param {string[]} [receivableStates] 알림을 받는 계정 상태 (설정 app.alert.receivable-user-states)
 */
export function reachOf(groupIds, channels, groups, receivableStates = ['ACTIVE', 'LOCKED']) {
  const chosen = (groupIds || []).map((id) => (groups || []).find((g) => String(g.groupId) === String(id))).filter(Boolean);
  const byGroup = chosen.map((g) => {
    const match = (channels || []).filter((c) => (g.channels || ['MAIL']).includes(c));
    const memberCnt = g.memberCnt ?? (g.memberEmpNos || g.members || []).length;
    const receiving = g.receivingCnt ?? g.receivableCnt ?? memberCnt;
    return { groupId: g.groupId, name: g.name, useFlg: g.useFlg, memberCnt, receivingCnt: receiving, channelMatch: match, reach: match.length ? receiving : 0 };
  });
  const withMembers = chosen.length && chosen.every((g) => Array.isArray(g.members) && g.members.every((m) => m && typeof m === 'object'));
  let total;
  if (withMembers) {
    const set = new Set();
    chosen.forEach((g, i) => {
      if (!byGroup[i].channelMatch.length) return;
      g.members.forEach((m) => {
        if ((m.state ?? 'RECV') === 'RECV' && receivableStates.includes(m.userState ?? 'ACTIVE')) set.add(m.empNo);
      });
    });
    total = set.size;
  } else {
    total = byGroup.reduce((n, g) => n + g.reach, 0);
  }
  return { byGroup, total, deduped: !!withMembers };
}

/**
 * 엔진 상태 판정 (ALC-07) — 조용한 틱은 이력을 남기지 않으므로(1시간 하트비트) 65분이 넘으면 「중지 의심」
 * @param {object} engine summary.engine
 * @returns {{judge:'OK'|'DELAY'|'STOPPED'|'UNKNOWN', label:string, lagMin:number|null}}
 */
export function engineState(engine) {
  if (!engine) return { judge: 'UNKNOWN', label: '확인 불가', lagMin: null };
  const lag = Number(engine.lagSec);
  const lagMin = Number.isFinite(lag) ? Math.round(lag / 60) : null;
  let judge = engine.judge || (Number.isFinite(lag) ? (lag > 3900 ? 'STOPPED' : lag > 180 ? 'DELAY' : 'OK') : 'UNKNOWN');
  if (judge === 'STOP' || judge === 'STOP_SUSPECT') judge = 'STOPPED';
  const label = judge === 'OK' ? '정상' : judge === 'DELAY' ? `지연 ${lagMin ?? '?'}분` : judge === 'STOPPED' ? '중지 의심' : '확인 불가';
  return { judge, label, lagMin };
}

/* ───────── SY-05 수신 그룹 ───────── */

/** 그룹 멤버 항목 → 사번 (서버가 문자열 또는 {empNo,name} 으로 줄 수 있습니다) */
export const memberEmpNo = (m) => (m && typeof m === 'object' ? m.empNo ?? '' : String(m ?? ''));

/** 수신 그룹 편집 초기값 — 상세 응답에서 (기획 06 RCP-02) */
export function groupInitial(detail, defaults = {}) {
  if (!detail) return { name: '', deptId: '', validWindow: defaults.validWindow ?? 'ALWAYS', night: false, memberEmpNos: [] };
  const members = Array.isArray(detail.members) && detail.members.length && typeof detail.members[0] === 'object'
    ? detail.members.map(memberEmpNo)
    : (detail.memberEmpNos || detail.members || []).map(memberEmpNo);
  return {
    name: detail.name ?? '',
    deptId: detail.deptId ?? '',
    validWindow: detail.validWindow ?? '',
    night: !!detail.night,
    memberEmpNos: members.filter(Boolean),
  };
}

/**
 * 수신 그룹 본문 — 등록은 메일 채널 고정, 수정은 바뀐 키만(+updatedAt)
 *
 * 수정할 때 발송 채널은 **보내지 않습니다** — 화면에서 고르지 않으므로 보내면 시스템 팝업 같은 기존 채널이 지워집니다.
 * 대응 부서를 비우면 null, 멤버를 모두 빼면 [] 를 보냅니다(엔드포인트 preserveEmpty).
 */
export function groupBody(v, initial, detail) {
  const deptId = v.deptId === '' || v.deptId === undefined || v.deptId === null ? null : Number(v.deptId);
  const full = {
    name: String(v.name || '').trim(),
    deptId,
    validWindow: v.validWindow,
    night: v.night === true || v.night === 'true',
    memberEmpNos: (v.memberEmpNos || []).map(String),
  };
  if (!detail) {
    const body = { ...full, channels: ['MAIL'] };
    if (body.deptId === null) delete body.deptId;
    return body;
  }
  const before = { ...initial, deptId: initial.deptId === '' ? null : Number(initial.deptId), memberEmpNos: (initial.memberEmpNos || []).map(String) };
  const body = {};
  Object.keys(full).forEach((k) => {
    const a = k === 'memberEmpNos' ? [...full[k]].sort() : full[k];
    const b = k === 'memberEmpNos' ? [...before[k]].sort() : before[k];
    if (!same(a, b)) body[k] = full[k];
  });
  if (detail.updatedAt) body.updatedAt = detail.updatedAt;
  return body;
}

/** 그룹 입력 검증 (서버도 같은 규칙으로 400) */
export function validateGroup(v) {
  const e = {};
  if (v.name && String(v.name).trim().length > 50) e.name = '그룹명은 50자까지 입력할 수 있습니다.';
  return e;
}

/** 수신자 입력 검증 — 메일 형식·길이 (기획 06 RCP-12 의 화면 쪽 규칙) */
export function validateRecipient(v) {
  const e = {};
  const mail = String(v.mail ?? v.account?.mail ?? '').trim();
  const key = v.account ? 'account' : 'mail';
  if (!mail) e[key] = '메일을 입력해 주세요.';
  else if (mail.length > 200 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) e[key] = '메일 주소 형식이 올바르지 않습니다.';
  if (v.account && !String(v.account.empNo || '').trim()) e.account = '수신자로 등록할 계정을 골라 주세요.';
  if (v.hp && !/^[0-9-]{9,20}$/.test(String(v.hp).trim())) e.hp = '휴대전화는 숫자와 하이픈 9~20자입니다.';
  if (v.messenger && String(v.messenger).length > 50) e.messenger = '메신저는 50자까지 입력할 수 있습니다.';
  return e;
}
