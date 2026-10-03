/**
 * [Controller] SY-04 이상 알림 발송 조건 관리 (화면 ID alert-cond)
 *
 * '언제 · 무엇을 기준으로' 보낼지를 정의합니다.
 * '누구에게' 는 알림 수신자 관리(SY-05)가 담당하며, 여기서는 수신 그룹을 골라 연결합니다.
 *
 * 2026-10-01 기획 05 반영
 *  · ALC-01 활성/중지 — 바꿀 상태(on)를 본문에 담습니다. 중지는 확인 후, 활성은 바로 실행
 *  · ALC-02 선택지 조회가 막히면 그 사유를 폼 위에 띄우고 「조건 등록」 을 막습니다
 *  · ALC-04 편집은 상세 응답으로 폼을 채우고, 수정은 바뀐 키만 보냅니다
 *  · ALC-16 쓰기 버튼은 쓰기 권한(canWrite) 으로, 삭제는 통합관리자만(R-13)
 *  · ALC-17 엑셀은 「조회 목록 / 전체」 두 범위 — 조회 권한이면 받습니다(R-10)
 */
import { useCallback, useMemo } from 'react';
import { labelOf, loadCodeGroups } from '@domains/common/model/codeRepository';
import { useAsync } from '@shared/hooks/useAsync';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadXls } from '@shared/utils/exportUtil';
import { canData } from '@shared/utils/maskUtil';
import { engineState } from '../model/alertFormModel';
import * as repo from '../model/systemRepository';

/** 화면 ID — API 명세·DB tb_sys_menu 와 같은 값 */
export const ALERT_COND_SCREEN = 'alert-cond';

/** 상태 필터 표기 → 서버 파라미터 */

/** 쓰기 권한이 없을 때 서버가 메시지를 비워 보낸 경우의 안내 */
const WRITE_DENIED = '미배정 계정은 이 동작을 할 수 없습니다. 전산팀에 부서 배정을 요청하세요.';
const DELETE_DENIED = '삭제는 통합관리자만 할 수 있습니다. 사용하지 않는 조건은 중지하세요.';

/** 수신 그룹 표기 — 목록 행에는 이름 또는 {groupId,name} 으로 옵니다 */
export const groupNameOf = (g) => (g && typeof g === 'object' ? g.name ?? g.groupNm ?? '' : g);

/** 통합관리자 판정 — /auth/me 의 user.superAdmin (목 계정에는 플래그가 없어 부서명으로 보완) */
export function isSuperAdminUser(user) {
  if (!user) return false;
  if (user.superAdmin !== undefined && user.superAdmin !== null) return !!user.superAdmin;
  return user.dept === '통합관리자';
}

/**
 * 대상 범위 표기 — 코드가 아니라 표기명. 개별 설비는 「개별 설비 N대」 (ALC-05)
 * @param {object} r 목록 행
 * @param {Array} targetCodes ALM_TARGET 선택지
 */
export function targetLabel(r, targetCodes) {
  const scope = r.targetScope || r.target;
  if (scope === 'PICK') {
    const n = (r.pickTargets || []).length || r.pickCnt || 0;
    return n ? `개별 설비 ${n}대` : labelOf(targetCodes, 'PICK');
  }
  return labelOf(targetCodes, scope) || r.target || '—';
}

/** 수신 인원 — 행의 receivingCnt, 없으면 그룹별 수신 인원의 합 (모르면 null) */
export function receivingOf(r) {
  if (r.receivingCnt !== undefined && r.receivingCnt !== null) return Number(r.receivingCnt);
  const gs = (r.groups || []).filter((g) => g && typeof g === 'object' && g.receivingCnt !== undefined);
  return gs.length ? gs.reduce((n, g) => n + (g.useFlg === 'N' ? 0 : Number(g.receivingCnt) || 0), 0) : null;
}

/** 유효 시간대 표기 — 1회(ONCE)는 「09:00 1회」 */
export function windowLabel(r, windowCodes) {
  if (r.validWindow === 'ONCE' && r.windowTime) return `${r.windowTime} 1회`;
  return labelOf(windowCodes, r.validWindow);
}

/**
 * 판정 배지 (ALC-08) — 발생 red / 감시중 amber / 정상 / 수집 중단 amber
 * @returns {{label:string, tone:''|'red'|'amber'|'green'}}
 */
export function evalBadge(r) {
  if (r.metricStale) return { label: '수집 중단', tone: 'amber' };
  if (r.collecting === false) return { label: '수집 없음', tone: 'amber' };
  const e = r.evalState;
  if (!e) return { label: '—', tone: '' };
  if (Number(e.breach) > 0) return { label: `발생 ${e.breach}${Number(e.normal) > 0 ? ` · 정상 ${e.normal}` : ''}`, tone: 'red' };
  if (Number(e.pending) > 0) return { label: `감시중 ${e.pending}`, tone: 'amber' };
  return { label: '정상', tone: 'green' };
}

/** 상대 시각 — 「7일 전」 · 「3분 전」 (툴팁에는 절대 시각) */
export function relativeTime(ts, now = Date.now()) {
  if (!ts) return '';
  const t = new Date(String(ts).replace(' ', 'T')).getTime();
  if (!Number.isFinite(t)) return String(ts);
  const sec = Math.max(0, Math.round((now - t) / 1000));
  if (sec < 60) return '방금';
  if (sec < 3600) return `${Math.floor(sec / 60)}분 전`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}시간 전`;
  return `${Math.floor(sec / 86400)}일 전`;
}

export function useAlertCondController() {
  const toast = useUiStore((state) => state.toast);
  const can = useAuthStore((state) => state.can);
  // menuPerms · unassigned 를 구독해야 /auth/me 가 늦게 와도 버튼 상태가 다시 그려집니다
  const menuPermsSub = useAuthStore((state) => state.menuPerms);
  const unassignedSub = useAuthStore((state) => state.unassigned);
  const canWriteOf = useAuthStore((state) => state.canWrite);
  const userInfo = useAuthStore((state) => state.userInfo);
  const canWrite = useMemo(() => canWriteOf(ALERT_COND_SCREEN), [canWriteOf, menuPermsSub, unassignedSub]); // eslint-disable-line react-hooks/exhaustive-deps
  const superAdmin = isSuperAdminUser(userInfo);

  // 위쪽 조회 조건 줄(심각도·상태·채널·수신 그룹·검색)은 뺐습니다(2026-10-02) — 전 조건을 한 번에 받아 표 머리글 필터로 거릅니다

  // 심각도·채널·연산자 등은 서버 공통코드가 정본입니다.
  const { data: codes } = useAsync(
    () => loadCodeGroups('ALM_SEVERITY', 'ALM_CHANNEL', 'ALM_TARGET', 'ALM_OP', 'ALM_WINDOW', 'ALM_DEDUP', 'ALM_DURATION', 'ALM_SCOPE_DIM'),
    [],
    { silent: true, initialData: {} }
  );

  // 감지 지표는 지표 기준을 고르는 것입니다 (서버는 metricStdId 를 받습니다)
  const { data: stds } = useAsync(() => repo.loadMetricStandards({ size: 200 }), [], { silent: true });

  // 전 조건(size=0, 서버 상한 1,000)을 받습니다 — 쪽 나눔과 거르기는 표가 합니다
  const { data, loading, reload } = useAsync(() => repo.loadAlertConditionsByState({ size: 0 }), []);

  const items = data?.list?.items || [];
  const groups = data?.groups?.items || [];

  /**
   * 선택지 조회 오류 (ALC-02) — 지표·수신 그룹 중 하나라도 막히면 등록이 나갈 수 없습니다.
   * 권한 때문이면 어느 권한이 필요한지 함께 적습니다.
   */
  const loadError = useMemo(() => {
    const metricErr = stds?.errors?.list;
    const groupErr = data?.errors?.groups;
    const why = (e, need) => (e.code === 'E-AUTH-002' ? `권한: ${need}` : e.message || e.code || '오류');
    const parts = [];
    if (metricErr) parts.push(`감지 지표 목록을 불러오지 못했습니다(${why(metricErr, '이상 알림 발송 조건 관리 또는 지표 관리 조회 권한')})`);
    if (groupErr) parts.push(`수신 그룹 목록을 불러오지 못했습니다(${why(groupErr, '이상 알림 발송 조건 관리 또는 알림 수신자 관리 조회 권한')})`);
    return parts.join(' · ');
  }, [stds, data]);

  /** 목록 조회 자체의 오류 — 카드 안에 띄우고 다시 시도를 둡니다 */
  const listError = data?.errors?.list ? data.errors.list.message || '발송 조건을 불러오지 못했습니다' : '';

  /**
   * 요약 카드 4종 (ALC-07) — ① 등록 조건 ② 오늘 발송(SENT, 억제·제외·실패) ③ 판정 이상(발생·수집 중단) ④ 엔진 상태
   * 서버가 아직 새 필드를 주지 않으면 그 칸은 '—' 로 둡니다(예전 값으로 꾸며 내지 않습니다).
   */
  const summaryRaw = data?.summary || {};
  const evalIssue = summaryRaw.evalIssueCnt;
  const breachRows = items.filter((r) => Number(r.evalState?.breach) > 0).length;
  const staleRows = items.filter((r) => r.metricStale).length;
  const summary = {
    total: summaryRaw.totalCnt ?? 0,
    enabled: summaryRaw.activeCnt ?? 0,
    disabled: Math.max(0, (summaryRaw.totalCnt ?? 0) - (summaryRaw.activeCnt ?? 0)),
    todaySent: summaryRaw.todaySentCnt ?? 0,
    suppressed: summaryRaw.todaySuppressedCnt ?? summaryRaw.dedupCnt,
    skipped: summaryRaw.todaySkippedCnt,
    failed: summaryRaw.todayFailCnt,
    breach: evalIssue ? evalIssue.breach ?? 0 : breachRows,
    stale: evalIssue ? evalIssue.stale ?? 0 : staleRows,
    evalKnown: !!evalIssue || items.some((r) => r.evalState || r.metricStale !== undefined),
    engine: engineState(summaryRaw.engine),
    engineRaw: summaryRaw.engine || null,
    groupCnt: groups.length,
  };

  /** 등록·수정·삭제 공통 — 결과 메시지를 띄우고 성공하면 다시 조회합니다 */
  const run = useCallback(
    async (fn, { denied = WRITE_DENIED } = {}) => {
      const res = await fn();
      if (res.code === 'E-AUTH-004') toast(res.message || denied);
      else toast(res.message);
      if (res.ok || res.code === 'E-NOTFOUND') reload();
      return res;
    },
    [toast, reload]
  );

  /* ───────── 엑셀 (조회 목록 / 전체) ───────── */

  /** 엑셀 열 — 표와 같은 순서·표기. `attr` 는 응답 필드명(마스킹 판정용) */
  const exportCols = useMemo(() => {
    const L = (grp, cd) => labelOf(codes?.[grp], cd);
    return [
      { field: 'on', head: '상태', attr: 'on', value: (c) => (c.on ? '활성' : '중지') },
      { field: 'name', head: '조건명', attr: 'name', value: (c) => c.name },
      { field: 'metric', head: '감지 지표', attr: 'metric', value: (c) => c.metric ?? c.metricNm },
      { field: 'threshold', head: '비교 · 임계값', attr: 'threshold', value: (c) => `${L('ALM_OP', c.op)} ${c.threshold ?? c.thresholdVal ?? ''}`.trim() },
      { field: 'duration', head: '지속 조건', attr: 'duration', value: (c) => L('ALM_DURATION', c.duration) },
      { field: 'target', head: '대상 범위', attr: 'targetScope', value: (c) => targetLabel(c, codes?.ALM_TARGET) },
      { field: 'severity', head: '심각도', attr: 'severity', value: (c) => L('ALM_SEVERITY', c.severity) },
      { field: 'channels', head: '발송 채널', attr: 'channels', value: (c) => (c.channels || []).map((x) => L('ALM_CHANNEL', x)).join(' · ') },
      { field: 'groups', head: '수신 그룹', attr: 'groups', value: (c) => (c.groups || []).map(groupNameOf).join(' · ') },
      { field: 'receivingCnt', head: '수신 인원', attr: 'receivingCnt', value: (c) => { const n = receivingOf(c); return n === null ? '' : `${n}명`; } },
      { field: 'validWindow', head: '유효 시간대', attr: 'validWindow', value: (c) => windowLabel(c, codes?.ALM_WINDOW) },
      { field: 'dedupMin', head: '중복 억제', attr: 'dedupMin', value: (c) => L('ALM_DEDUP', c.dedupMin) },
      { field: 'evalState', head: '판정', attr: 'evalState', value: (c) => evalBadge(c).label },
      { field: 'lastEvalAt', head: '마지막 평가', attr: 'lastEvalAt', value: (c) => c.evalState?.lastEvalAt || '' },
      { field: 'alert7dCnt', head: '최근 7일', attr: 'alert7dCnt', value: (c) => (c.alert7dCnt ?? '') },
    ];
  }, [codes]);

  /**
   * 행 → 엑셀 줄. 임계값에 데이터 권한(blindFieldKey)이 걸린 조건은 권한이 없으면 '비공개' 로 채웁니다(R-10).
   * @param {object[]} rows 행
   * @param {string[]} [order] 표의 열 순서(field) — 사람이 옮긴 순서를 따릅니다
   */
  const buildSheet = useCallback((rows, order) => {
    const cols = order?.length
      ? [...order.map((f) => exportCols.find((c) => c.field === f)).filter(Boolean), ...exportCols.filter((c) => !order.includes(c.field))]
      : exportCols;
    let blind = 0;
    const out = rows.map((r) => cols.map((c) => {
      if (c.field === 'threshold' && r.blindFieldKey && (!canData(r.blindFieldKey) || (r.threshold == null && r.thresholdVal == null))) {
        blind += 1;
        return '비공개';
      }
      return c.value(r) ?? '';
    }));
    return { head: cols.map((c) => c.head), attrs: cols.map((c) => c.attr), rows: out, blindCount: blind };
  }, [exportCols]);

  /** 조회 목록 엑셀 조건 요약 — 표 머리글 필터({field, value}[])를 「열 필터 칸=값」 으로 적습니다 */
  const condSummaryOf = useCallback((filters = []) => {
    const used = (filters || []).filter((f) => f && f.value !== '' && f.value != null);
    return used.length ? used.map((f) => `열 필터 ${f.title || f.field}=${f.value}`).join(' · ') : '조건 없음(전체)';
  }, []);

  /**
   * 조회 목록 다운로드 — 그리드 기준(현재 쪽, 표의 정렬·열 순서 그대로)
   * @param {{rows?:object[], order?:string[]}} [grid] 표가 지금 보이는 행과 열 순서
   */
  const exportView = useCallback(async (grid = {}) => {
    const sheet = buildSheet(grid.rows || items, grid.order);
    downloadXls({ name: '이상 알림 발송 조건', ...sheet, scope: 'VIEW', condSummary: condSummaryOf(grid.filters), menuId: ALERT_COND_SCREEN });
  }, [buildSheet, items, condSummaryOf]);

  /** 전체 다운로드 — 조회 조건·쪽과 관계없이 전 조건 (size=0, 상한 1,000) */
  const exportAll = useCallback(async () => {
    try {
      const all = await repo.loadAllAlertConditions();
      const sheet = buildSheet(all.items);
      downloadXls({ name: '이상 알림 발송 조건', ...sheet, scope: 'ALL', condSummary: '전체 조건', menuId: ALERT_COND_SCREEN });
      if (all.truncated) toast(`상한 ${repo.ALERT_COND_EXPORT_LIMIT.toLocaleString('ko-KR')}건까지 내려받았습니다`);
    } catch (e) {
      toast(e?.message || '발송 조건 전체를 내려받지 못했습니다');
    }
  }, [buildSheet, toast]);

  /* ───────── 동작 ───────── */

  /** 편집 전 상세 조회 — 실패하면 폼을 열지 않습니다(목록 행으로 채우면 값이 덮입니다) */
  const loadCondDetail = useCallback(async (condId) => {
    try {
      return { ok: true, data: await repo.loadAlertCondition(condId) };
    } catch (e) {
      if (e?.code === 'E-NOTFOUND') reload();
      return { ok: false, message: e?.message ? `조건 상세를 불러오지 못했습니다 — ${e.message}` : '조건 상세를 불러오지 못했습니다' };
    }
  }, [reload]);

  return {
    loading,
    firstLoad: loading && !data,
    items,
    summary,
    codes,
    groupOptions: groups.map((g) => ({ value: g.groupId, label: g.name })),
    // 감지 지표 선택지 (ALC-10) — 「공정 불량률 · DEFECT (%) — 수집 중」, 수집 정의가 없으면 「수집 없음(판정 안 됨)」
    metricOptions: (stds?.list?.items || []).map((m) => ({
      value: m.stdId,
      label: [m.name, m.category].filter(Boolean).join(' · ') + ((m.unitNm || m.unit) ? ` (${m.unitNm || m.unit})` : '')
        + (m.collecting === true ? ' — 수집 중' : m.collecting === false ? ' — 수집 없음(판정 안 됨)' : ''),
    })),
    metrics: stds?.list?.items || [],
    groups,
    canRecipient: can('sys-recip'),
    loadError,
    listError,
    itemsMeta: data?.listMeta,
    reload,
    // 권한 (R-06 · R-13)
    canWrite,
    canDelete: superAdmin,
    canAlertList: can('alert-list'),
    // 엑셀 (R-16)
    exportView,
    exportAll,
    exportTotal: summary.total || data?.listMeta?.total,
    // 동작
    loadCondDetail,
    searchEquipments: repo.searchEquipments,
    /** 등록·수정 — 서버가 저장은 했지만 짚어 줄 것(warnings[], 3단계 계약)이 있으면 함께 알립니다 */
    submitCond: async (condId, body) => {
      const res = await run(() => (condId ? repo.updateAlertCondition(condId, body) : repo.createAlertCondition(body)));
      const warnings = Array.isArray(res.data?.warnings) ? res.data.warnings : [];
      if (res.ok && warnings.length) toast(`확인 필요: ${warnings.map((w) => (typeof w === 'string' ? w : w?.message || '')).filter(Boolean).join(' · ')}`);
      return res;
    },
    toggleCond: (condId, nextOn) => run(() => repo.toggleAlertCondition(condId, nextOn)),
    testCond: async (condId) => {
      const res = await repo.testAlertCondition(condId);
      if (!res.ok) toast(res.code === 'E-AUTH-004' ? res.message || WRITE_DENIED : res.message);
      return res;
    },
    removeCond: (condId) => run(async () => {
      const res = await repo.deleteAlertCondition(condId);
      // 통합관리자 전용(R-13) — 서버 403 E-AUTH-002 도 화면과 같은 문구로 알립니다
      return res.code === 'E-AUTH-002' ? { ...res, message: DELETE_DENIED } : res;
    }),
  };
}
