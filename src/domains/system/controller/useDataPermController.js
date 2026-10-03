/**
 * [Controller] SY-03 데이터 접근 권한 (화면 ID sys-data)
 *
 * 허용되지 않은 항목은 서버 응답에서 가려지고(값 null) 화면·엑셀에는 「비공개」 로 보입니다.
 * 서버 응답에는 다음 조회부터 적용됩니다. 다른 사용자의 화면에 「비공개」 표시가 나오기까지는
 * 그 사용자가 화면을 다시 열어야 합니다(그 전에는 빈칸으로 보입니다).
 *
 * 2026-10-01 개편 (기획 04)
 *  · 잠금 — 통합관리자 열(전 권한)·미배정 열(0건 고정, R-11). 판정은 서버 응답(`depts[].locked`)만 씁니다 (DTP-16)
 *  · 읽기 전용 — sys-data 쓰기 권한이 없으면 체크·적용 전환·항목 관리 저장/삭제를 끕니다(엑셀은 그대로, R-10 · DTP-17)
 *  · 저장 중 잠금 — 응답 전 두 번째 클릭은 요청을 만들지 않고, 재조회 중에도 표를 유지합니다 (DTP-06)
 *  · 적용 전환 — 켜기 전에 열람·가려지는 부서와 가리는 값을 확인받고, 기본 7종은 끌 수 없습니다 (DTP-04·05)
 *  · 최근 변경 이력 20건 · 계정 기준 미리보기 (DTP-10)
 *  · 엑셀 — 조회 목록(그리드 그대로) / 전체(미적용 포함 전 종류 + 가리는 값 목록) 두 범위 (DTP-12·18)
 *
 * 확인 창(JSX)은 화면(view)이 띄웁니다. 이 파일은 「확인이 필요한지와 문구」 만 정합니다.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { fetchMe } from '@domains/auth/model/authRepository';
import { useAsync } from '@shared/hooks/useAsync';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadXls } from '@shared/utils/exportUtil';
import * as repo from '../model/systemRepository';
import { attrNamesOf, attrTitleOf, includedSummary, remarkOf } from '../model/dataFieldModel';

const SCREEN_ID = 'sys-data';

/** 쓰기 권한이 없을 때 안내 (기획 공통 R-06 문구) */
export const NO_WRITE_TEXT = '미배정 계정은 이 동작을 할 수 없습니다. 전산팀에 부서 배정을 요청하세요.';

/** 반영 시점 안내 — 화면·토스트·카탈로그가 같은 문장을 씁니다(DTP-08) */
export const APPLY_TIMING = '서버 응답에는 다음 조회부터 적용됩니다. 다른 사용자의 화면에 「비공개」 표시가 나오기까지는 그 사용자가 화면을 다시 열어야 합니다(그 전에는 빈칸으로 보입니다).';

const LOCK_TEXT = {
  SUPER_ADMIN: '통합관리자 부서는 전 권한으로 고정됩니다.',
  UNASSIGNED: '미배정 부서는 데이터 접근 권한이 없습니다(모든 종류 비공개).',
  BUSY: '저장 중입니다.',
  BUILT_IN: '기본 항목은 서버 판정 코드가 직접 쓰므로 적용을 끌 수 없습니다. 부서 권한으로 조정하세요.',
  NO_ATTRS: '가리는 값이 없어 적용할 수 없습니다 — 항목 관리에서 먼저 값을 넣으세요.',
};

export function useDataPermController() {
  const toast = useUiStore((state) => state.toast);
  const setMe = useAuthStore((state) => state.setMe);
  const menuPermsSub = useAuthStore((state) => state.menuPerms);
  const unassignedSub = useAuthStore((state) => state.unassigned);
  const menuPerms = useAuthStore((state) => state.menuPerms);
  const canWriteData = useMemo(() => useAuthStore.getState().canWrite(SCREEN_ID), [menuPermsSub, unassignedSub]); // eslint-disable-line react-hooks/exhaustive-deps
  const canSeeAudit = useMemo(() => useAuthStore.getState().can('sys-audit'), [menuPerms]);
  const readOnly = !canWriteData;
  const [busy, setBusy] = useState(false);
  const running = useRef(false);

  const { data, loading, reload, error } = useAsync(() => repo.loadDataPerms(), []);
  const logs = useAsync(() => repo.loadPermChangeLogs('DATA_PERM', 20), [], { silent: true });

  const fields = useMemo(() => (data?.fields || []).map((f) => ({ ...f, included: includedSummary(f) })), [data]);

  /**
   * 변경 이력의 「대상」 칸 — 데이터 항목 키(f_mue2hipc 같은 내부 이름)를 사람이 읽는 이름으로 바꿉니다(2026-10-02).
   * 서버 대상은 「부서 / 항목키」 또는 「항목키」 입니다. 이름은 지금 있는 종류에서 찾고, 이미 지운 종류는
   * 이력의 「데이터 항목 삭제 [키 / 이름]」 문장에서 찾아 「이름 (삭제됨)」 으로 보입니다. 끝내 못 찾으면 「삭제된 항목」.
   */
  const logRows = useMemo(() => {
    const list = logs.data || [];
    const live = new Map(fields.map((f) => [f.key, f.name]));
    const gone = new Map();
    list.forEach((l) => {
      for (const m of String(l.detail || '').matchAll(/\[([A-Za-z][\w-]*) \/ ([^\]]+)\]/g)) gone.set(m[1], m[2].trim());
    });
    const nameOf = (key) => {
      if (live.has(key)) return live.get(key);
      if (gone.has(key)) return `${gone.get(key)} (삭제됨)`;
      return /^f_[a-z0-9]+$/i.test(key) ? '삭제된 항목' : key;
    };
    // 「변경 내용」 의 [키 / 이름] · [키] 도 같은 이름으로 바꿉니다(대상 칸과 같은 표기)
    const detailOf = (text) => String(text || '')
      .replace(/\[([A-Za-z][\w-]*) \/ ([^\]]+)\]/g, (whole, key) => `[${nameOf(key)}]`)
      .replace(/\[([A-Za-z][\w-]*)\]/g, (whole, key) => (live.has(key) || gone.has(key) || /^f_[a-z0-9]+$/i.test(key) ? `[${nameOf(key)}]` : whole));
    return list.map((l) => {
      const label = String(l.targetLabel ?? l.target ?? '');
      const m = label.match(/^(.*\s\/\s)?([A-Za-z][\w-]*)$/);
      return {
        ...l,
        ...(m ? { targetLabel: `${m[1] || ''}${nameOf(m[2])}` } : null),
        detailLabel: detailOf(l.detailLabel ?? l.detail),
      };
    });
  }, [logs.data, fields]);
  const depts = useMemo(() => data?.depts || [], [data]);
  const matrix = useMemo(() => data?.matrix || {}, [data]);

  const deptOf = useCallback((deptId) => depts.find((d) => String(d.id) === String(deptId)), [depts]);

  /** 칸 값 — 통합관리자는 전체, 미배정은 0건 고정 */
  const cellValue = useCallback((fieldKey, deptId) => {
    const dept = deptOf(deptId);
    if (dept?.locked === 'SUPER_ADMIN') return true;
    if (dept?.locked === 'UNASSIGNED') return false;
    return (matrix[String(deptId)] || []).includes(fieldKey);
  }, [deptOf, matrix]);

  /** 칸을 바꿀 수 없는 이유 (없으면 '') */
  const lockReason = useCallback((dept) => {
    if (dept?.locked === 'SUPER_ADMIN') return LOCK_TEXT.SUPER_ADMIN;
    if (dept?.locked === 'UNASSIGNED') return LOCK_TEXT.UNASSIGNED;
    if (readOnly) return NO_WRITE_TEXT;
    if (busy) return LOCK_TEXT.BUSY;
    return '';
  }, [readOnly, busy]);

  /** 적용 전환을 할 수 없는 이유 (없으면 '') — 기본 7종은 끌 수 없습니다(DTP-05 선택지 A) */
  const applyLockReason = useCallback((field) => {
    if (readOnly) return NO_WRITE_TEXT;
    const on = field.applyFlg !== 'N';
    if (on && field.builtIn) return LOCK_TEXT.BUILT_IN;
    if (!on && !attrNamesOf(field).length) return LOCK_TEXT.NO_ATTRS;
    if (busy) return LOCK_TEXT.BUSY;
    return '';
  }, [readOnly, busy]);

  /** 저장 공통 — 중복 요청을 막고, 끝나면 표·이력·내 권한을 다시 읽습니다. 네트워크 예외는 토스트로 */
  const run = useCallback(async (fn) => {
    if (running.current) return { ok: false, message: LOCK_TEXT.BUSY };
    running.current = true;
    setBusy(true);
    try {
      let res;
      try {
        res = await fn();
      } catch {
        res = { ok: false, refresh: true, message: '저장하지 못했습니다. 권한을 다시 확인해 주세요.' };
      }
      if (res?.message) toast(res.message);
      if (res?.ok || res?.refresh) {
        await reload();
        logs.reload();
        const me = await fetchMe().catch(() => null);
        if (me?.ok) setMe(me.me);
      }
      return res;
    } finally {
      running.current = false;
      setBusy(false);
    }
  }, [toast, reload, setMe, logs.reload]);

  const toggle = useCallback(async (fieldKey, deptId) => {
    const reason = lockReason(deptOf(deptId));
    if (reason) { toast(reason); return { ok: false, message: reason }; }
    // 서버 요청은 `allowed` 를 함께 받습니다(없으면 true 로 간주해 해제가 되지 않습니다)
    const allowed = !cellValue(fieldKey, deptId);
    return run(() => repo.setDataPerm(deptId, fieldKey, allowed));
  }, [lockReason, deptOf, cellValue, toast, run]);

  /**
   * 적용 전환 계획 — 확인 창 문구를 돌려줍니다. 바꿀 수 없으면 null (DTP-04)
   * 켜기: 가리는 값 · 열람 허용 부서 · 가려지는 부서(계정 수, 미배정은 항상 포함)를 보여 줍니다.
   */
  const planApply = useCallback((fieldKey) => {
    const field = fields.find((f) => f.key === fieldKey);
    if (!field) return null;
    const reason = applyLockReason(field);
    if (reason) { toast(reason); return null; }
    const on = field.applyFlg === 'N';
    const attrs = attrNamesOf(field);
    const titles = [...new Set(attrs.map((a) => attrTitleOf(field, a)))];
    const allowedDepts = depts.filter((d) => cellValue(field.key, d.id));
    const hiddenDepts = depts.filter((d) => !cellValue(field.key, d.id));
    const people = (d) => `${d.name} ${Number(d.userCnt || 0).toLocaleString('ko-KR')}명${d.locked === 'UNASSIGNED' ? ' — 미배정은 고정' : ''}`;
    const message = on
      ? [
        `가리는 값 ${attrs.length}개: ${titles.slice(0, 8).join(' · ')}${titles.length > 8 ? ` 외 ${titles.length - 8}개` : ''}`,
        `열람 허용 부서 ${allowedDepts.length}개 · 가려지는 부서 ${hiddenDepts.length}개`,
        hiddenDepts.length ? `(${hiddenDepts.map(people).join(' · ')})` : '',
        APPLY_TIMING,
      ].filter(Boolean).join('\n')
      : `「${field.name}」 적용을 끄면 이 종류로 가리던 값이 모든 부서에 다시 보입니다. ${APPLY_TIMING}`;
    return {
      fieldKey, on,
      confirm: { title: on ? `「${field.name}」 종류를 적용합니다` : `「${field.name}」 적용 해제`, message, confirmLabel: on ? '적용' : '해제', danger: !on },
    };
  }, [fields, depts, cellValue, applyLockReason, toast]);

  const applyApply = useCallback((plan) => (plan ? run(() => repo.setDataFieldApplied(plan.fieldKey, plan.on)) : null), [run]);

  // ── 계정으로 확인 (DTP-10) ─────────────────────────────
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const loadPreview = useCallback(async (empNoInput) => {
    const empNo = String(empNoInput || '').trim();
    setPreviewError('');
    if (!empNo) { setPreviewError('사번을 입력하세요.'); return; }
    setPreviewing(true);
    try {
      setPreview(await repo.previewDataPermFor(empNo));
    } catch (e) {
      setPreview(null);
      setPreviewError(e?.message || '계정을 찾을 수 없습니다.');
    } finally {
      setPreviewing(false);
    }
  }, []);
  const previewRows = useMemo(() => (preview?.items || []).map((it) => {
    const field = fields.find((f) => f.key === it.fieldKey);
    // 서버가 applied 를 주지 않으면(구 응답) 매트릭스의 적용 여부로 대신합니다
    const applied = it.applied ?? (field ? field.applyFlg !== 'N' : true);
    return {
      ...it,
      appliedLabel: applied ? '적용 중' : '미적용',
      result: !applied ? '미적용 — 가리지 않음' : it.masked ? '●●●● 비공개' : '원본 노출',
    };
  }), [preview, fields]);

  // ── 엑셀 (조회 목록 / 전체, DTP-12·18) ─────────────────
  const deptCells = useCallback(
    (f) => depts.map((d) => (d.locked === 'SUPER_ADMIN' ? '전 권한' : cellValue(f.key, d.id) ? '열람' : '비공개')),
    [depts, cellValue]
  );
  const head = useMemo(() => ['데이터 항목', '분류', '적용', '포함 데이터', ...depts.map((d) => d.name)], [depts]);
  // 열마다 응답 필드명 — 예약어·관리 화면 키라 가려지는 칸은 없지만 마스킹 판정과 이력 blindCnt 를 맞추려고 넘깁니다(R-10)
  const attrs = useMemo(() => ['name', 'categoryNm', 'applyFlg', 'desc', ...depts.map((d) => `dept_${d.id}`)], [depts]);
  const toRow = useCallback((f) => [
    `${f.name}${f.builtIn ? ' (기본)' : ''}`,
    f.categoryNm || f.category || '',
    f.applyFlg === 'N' ? '미적용' : '적용 중',
    f.included ?? includedSummary(f),
    ...deptCells(f),
  ], [deptCells]);

  const exportView = useCallback(async () => {
    downloadXls({
      name: '데이터 접근 권한',
      head,
      attrs,
      rows: fields.map(toRow),
      scope: 'VIEW',
      condSummary: `종류 ${fields.length}개 · 부서 ${depts.length}개`,
      menuId: SCREEN_ID,
    });
  }, [head, attrs, fields, toRow, depts]);

  /**
   * 전체 — 미적용 종류를 포함한 사용 중 전 종류 × 전 부서 + 「가리는 값」 목록(종류 · 응답 필드명 · 화면 열 제목 · 메모).
   * 공통 내려받기(downloadXls)가 시트를 하나만 만들므로 「가리는 값」 은 같은 시트 아래에 구획을 나눠 붙입니다.
   * 메모는 서버 attrDetails[{attrName, remark}] 에서 읽습니다.
   */
  const exportAll = useCallback(async () => {
    let all = fields;
    try {
      const detail = await repo.loadDataFields();
      if (detail?.fields?.length) {
        const byKey = new Map(fields.map((f) => [f.key, f]));
        all = detail.fields.map((f) => ({ ...(byKey.get(f.key) || {}), ...f, included: includedSummary(f) }));
      }
    } catch {
      /* 관리 응답을 못 받으면 매트릭스에 있는 종류로 만듭니다 */
    }
    const pad = (cells) => [...cells, ...Array(Math.max(0, head.length - cells.length)).fill('')];
    const attrRows = all.flatMap((f) => attrNamesOf(f).map((a) => pad([f.name, a, attrTitleOf(f, a), remarkOf(f, a)])));
    const rows = [
      ...all.map(toRow),
      ...(attrRows.length ? [pad(['']), pad(['[가리는 값]', '응답 필드명', '화면 열 제목', '메모']), ...attrRows] : []),
    ];
    downloadXls({
      name: '데이터 접근 권한',
      head,
      attrs,
      rows,
      scope: 'ALL',
      condSummary: `종류 ${all.length}개(미적용 포함) · 부서 ${depts.length}개 · 가리는 값 ${attrRows.length}개`,
      menuId: SCREEN_ID,
    });
  }, [fields, head, attrs, toRow, depts]);

  return {
    loading: loading && !data,
    loadError: !loading && !data && error ? (error.message || '데이터 접근 권한을 불러오지 못했습니다.') : '',
    readOnly,
    busy,
    fields,
    depts,
    matrix,
    adminDepts: data?.adminDepts || [],
    cellValue,
    lockReason,
    applyLockReason,
    toggle,
    planApply,
    applyApply,
    logs: logRows,
    logsLoading: logs.loading && !logs.data,
    logsError: !logs.loading && !logs.data && logs.error ? (logs.error.message || '변경 이력을 불러오지 못했습니다.') : '',
    canSeeAudit,
    preview,
    previewRows,
    previewError,
    previewing,
    loadPreview,
    viewCount: fields.length,
    exportView,
    exportAll,
    reload,
  };
}
