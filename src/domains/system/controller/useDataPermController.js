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
import { ENDPOINTS } from '@services/api/endpoints';
import { GENERIC_ATTRS, buildDataItems } from '../model/dataItemModel';
import { SCREEN_COLUMNS, SCREEN_LABELS, SCREEN_USES } from '../model/screenColumns.generated';

/**
 * 항목(이름) 묶기에 넘기는 업무 화면 — 시스템관리 화면은 대상이 아닙니다(DTP-01).
 * 같은 값이 한 화면에서 여러 제목으로 나와도 제목마다 따로 넘깁니다(다른 화면의 같은 제목과 이어지게).
 */
const ITEM_SCREENS = SCREEN_COLUMNS.filter((x) => x.group !== '시스템관리').map((x) => ({ ...x, rows: x.columns }));

/**
 * 표 밖 값 이름의 이름표 — 필드명 → [{ screen, label }] (카드 label · 차트 계열 name, 2026-10-08)
 * 유형별 열 묶음 — 묶음 이름 → 가리기 판정 이름(loss → ngQty)
 */
const LABELS_OF = new Map();
const MAP_ATTR = new Map();
SCREEN_LABELS.forEach((x) => {
  Object.entries(x.labels || {}).forEach(([k, label]) => {
    if (!LABELS_OF.has(k)) LABELS_OF.set(k, []);
    LABELS_OF.get(k).push({ screen: x.name, label });
  });
  Object.entries(x.maps || {}).forEach(([k, attr]) => { if (!MAP_ATTR.has(k)) MAP_ATTR.set(k, { attr, screen: x.name }); });
});

/** 화면 표 열의 응답 데이터 이름 — 이미 항목 × 부서 표에 줄로 나오므로 「새로 발견된 응답 데이터」 에서 뺍니다 */
const SCREEN_COLUMN_KEYS = new Set(ITEM_SCREENS.flatMap((x) => x.columns.map((c) => c.field)));

/**
 * API 경로 → 화면 이름 — WEB API 목록(endpoints.js)의 경로 틀({param})과 화면 표기로 맞춥니다.
 * 서버가 남긴 경로는 숫자 조각이 {id} 로 바뀌어 있어 틀의 {param} 자리와 같이 맞습니다.
 */
const PATH_SCREENS = Object.values(ENDPOINTS)
  .filter((e) => e.method === 'GET' && e.path && e.screen)
  .map((e) => ({ re: new RegExp(`^${e.path.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\\?\{[^}]+\\?\}/g, '[^/]+')}$`), screen: e.screen }));
const screensOfPath = (p) => [...new Set(PATH_SCREENS.filter((x) => x.re.test(p)).map((x) => x.screen))];

/**
 * 표 밖(카드 · 차트 · 요약 문구)에서 그 이름을 쓰는 화면 — 필드명 → 화면 이름들(2026-10-07 「화면 표에 없음」 피드백).
 * 화면 코드(view · controller)를 글자로 훑은 목록이라 화면 몫의 파일 단위입니다(scripts/build-screen-columns.cjs).
 */
const USED_BY = (() => {
  const m = new Map();
  SCREEN_USES.filter((x) => x.group !== '시스템관리').forEach((x) => x.keys.forEach((k) => {
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(x.name);
  }));
  return m;
})();

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
  // 2026-10-07 최근 20건 → 전량(size=0)을 받아 표에서 쪽을 나눕니다(기본 50건)
  const logs = useAsync(() => repo.loadPermChangeLogs('DATA_PERM', 0), [], { silent: true });

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
      return /^[fi]_[a-z0-9]+$/i.test(key) ? '삭제된 항목' : key;
    };
    // 「변경 내용」 의 [키 / 이름] · [키] 도 같은 이름으로 바꿉니다(대상 칸과 같은 표기)
    const detailOf = (text) => String(text || '')
      .replace(/\[([A-Za-z][\w-]*) \/ ([^\]]+)\]/g, (whole, key) => `[${nameOf(key)}]`)
      .replace(/\[([A-Za-z][\w-]*)\]/g, (whole, key) => (live.has(key) || gone.has(key) || /^[fi]_[a-z0-9]+$/i.test(key) ? `[${nameOf(key)}]` : whole));
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

  // ── 항목 × 부서 (2026-10-07, V82 항목 단위 권한) ──────────────────
  //  표의 행은 「항목」(화면에 보이는 이름 — 같은 뜻의 API 데이터 키 여러 개)입니다. 묶음(종류)은 화면에 보이지 않습니다.
  //  칸(항목 × 부서) = 그 항목의 키를 모두 볼 수 있으면 체크, 하나도 못 보면 빈칸, 섞이면 「일부」.
  const reservedAttrs = useMemo(() => new Set(data?.reservedAttrs || []), [data]);
  const kindByKey = useMemo(() => new Map((data?.fields || []).map((f) => [f.key, f])), [data]);
  const ownerOf = useMemo(() => {
    const m = {};
    (data?.fields || []).forEach((f) => attrNamesOf(f).forEach((a) => { m[a] = f.key; }));
    return m;
  }, [data]);
  const items = useMemo(() => buildDataItems({
    screens: ITEM_SCREENS,
    kinds: data?.fields || [],
    reserved: reservedAttrs,
    // 화면 표에 없는 키는 그 키가 든 항목(서버 데이터 항목)의 이름을 씁니다 — 서버 메모를 이름으로 쓰지 않습니다(V82 뒤 항목 = 이름 있는 한 줄)
    titleOfAttr: (k) => k.name,
  }), [data, reservedAttrs]);

  /** 표 밖에서 그 항목의 키를 쓰는 화면(표에 나오는 화면은 뺌) */
  const offTableOf = useCallback((item) => {
    const set = new Set();
    item.keys.forEach((k) => (USED_BY.get(k.attr) || []).forEach((n) => { if (!item.screens.includes(n)) set.add(n); }));
    return [...set];
  }, []);

  // ── 새로 발견된 응답 데이터 (2026-10-08, V83) ─────────────────────
  //  서버가 업무 데이터 응답에서 찾은, 항목 표에 등록되지 않은 응답 값 이름. 처리 전까지 모든 부서에 보입니다.
  //  화면 표 열에 있는 이름은 이미 위 표에 줄로 나오므로 뺍니다.
  const discovered = useAsync(() => repo.loadDiscoveredAttrs(), [], { silent: true });
  /** 이름이 비슷한 기존 항목 — 항목의 키가 새 이름에 들어 있으면(4자 이상) 가장 긴 것 */
  const suggestItem = useCallback((attr) => {
    const low = attr.toLowerCase();
    let best = null;
    items.forEach((it) => it.selectable.forEach((k) => {
      if (k.length >= 4 && low.includes(k.toLowerCase()) && (!best || k.length > best.len)) best = { item: it, len: k.length };
    }));
    return best?.item || null;
  }, [items]);
  const foundRows = useMemo(() => (discovered.data?.items || [])
    .filter((x) => !SCREEN_COLUMN_KEYS.has(x.attrName))
    .map((x) => {
      const screens = [...new Set((x.apiPaths || []).flatMap(screensOfPath))];
      // 유형별 열 묶음(loss · mgmt) — 열마다 붙인 판정 이름의 항목을 추천하고, 이름은 「유형별 <항목>」
      // lossTotals · mgmtTotals 처럼 묶음 이름으로 시작하는 합계 묶음도 같은 묶음으로 봅니다
      const mapKey = MAP_ATTR.has(x.attrName) ? x.attrName : [...MAP_ATTR.keys()].find((k) => x.attrName.startsWith(k) && /^[A-Z]/.test(x.attrName.slice(k.length)));
      const map = mapKey ? MAP_ATTR.get(mapKey) : null;
      const mapItem = map ? items.find((it) => it.selectable.includes(map.attr)) : null;
      // 카드 · 차트의 이름표 — 나온 화면의 것을 먼저
      const named = LABELS_OF.get(x.attrName) || [];
      const pick = named.find((n) => screens.includes(n.screen)) || named[0] || null;
      const label = mapItem ? `유형별 ${mapItem.name}${mapKey !== x.attrName ? ' 합계' : ''}` : pick?.label || '';
      const where = map ? `${map.screen} · 유형별 열` : pick ? `${pick.screen} · 카드·차트` : '';
      return {
        ...x,
        screens,
        generic: GENERIC_ATTRS.has(x.attrName),
        label,
        where,
        suggest: mapItem || suggestItem(x.attrName) || (label ? items.find((it) => it.selectable.length && it.name === label) : null) || null,
      };
    }), [discovered.data, suggestItem, items]);
  const foundNewCount = foundRows.filter((x) => x.status === 'NEW').length;

  /** 칸 상태 — 'on' 볼 수 있음 · 'off' 못 봄 · 'mixed' 키마다 다름 · 'na' 가릴 수 없는 항목 */
  const itemCell = useCallback((item, deptId) => {
    const dept = deptOf(deptId);
    if (dept?.locked === 'SUPER_ADMIN') return 'on';
    if (!item.selectable.length) return 'na';
    if (dept?.locked === 'UNASSIGNED') return 'off';
    const allowed = matrix[String(deptId)] || [];
    const each = item.selectable.map((a) => {
      const k = ownerOf[a];
      return !k || kindByKey.get(k)?.applyFlg !== 'Y' || allowed.includes(k);
    });
    if (each.every(Boolean)) return 'on';
    if (!each.some(Boolean)) return 'off';
    return 'mixed';
  }, [deptOf, matrix, ownerOf, kindByKey]);



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

  /** 항목 칸 체크 — 그 항목의 키를 항목 하나로 모으고 그 부서의 열람을 바꿉니다(PUT item-perms 1회) */
  const toggleItem = useCallback(async (item, deptId) => {
    const reason = lockReason(deptOf(deptId));
    if (reason) { toast(reason); return { ok: false, message: reason }; }
    if (!item.selectable.length) { toast('가릴 수 없는 항목입니다.'); return { ok: false }; }
    const next = itemCell(item, deptId) !== 'on';
    return run(() => repo.saveItemPerms({ name: item.name, attrs: item.selectable, perms: { [String(deptId)]: next } }));
  }, [lockReason, deptOf, itemCell, toast, run]);

  /** 발견된 이름 처리 — 기존 항목에 넣기(그 항목의 부서 설정을 그대로 따름) · 새 항목 · 가리지 않음 · 되돌리기 */
  const addFoundToItem = useCallback(async (attrName, item) => {
    if (readOnly) { toast(NO_WRITE_TEXT); return { ok: false }; }
    const res = await run(() => repo.saveItemPerms({ name: item.name, attrs: [...item.selectable, attrName], perms: {} }));
    discovered.reload();
    return res;
  }, [readOnly, run, toast, discovered]);
  const createFoundItem = useCallback(async (attrName, name) => {
    if (readOnly) { toast(NO_WRITE_TEXT); return { ok: false }; }
    const res = await run(() => repo.saveItemPerms({ name: String(name || '').trim(), attrs: [attrName], perms: {} }));
    discovered.reload();
    return res;
  }, [readOnly, run, toast, discovered]);
  const ignoreFound = useCallback(async (attrNames, ignore = true) => {
    if (readOnly) { toast(NO_WRITE_TEXT); return { ok: false }; }
    const res = await run(() => repo.setDiscoveredIgnored(attrNames, ignore));
    discovered.reload();
    return res;
  }, [readOnly, run, toast, discovered]);

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

  // ── 엑셀 — 항목 × 부서 (2026-10-07) ─────────────────
  const CELL_TEXT = { on: '열람', off: '비공개', mixed: '일부', na: '가릴 수 없음' };
  const itemHead = useMemo(() => ['항목', '출력 화면', ...depts.map((d) => d.name)], [depts]);
  const itemAttrs = useMemo(() => ['name', 'screens', ...depts.map((d) => `dept_${d.id}`)], [depts]);
  const itemRow = useCallback((it) => [
    it.name,
    [...it.screens, ...offTableOf(it).map((n) => `${n}(표 밖)`)].join(', ') || '웹 화면에 나오지 않음',
    ...depts.map((d) => (d.locked === 'SUPER_ADMIN' ? '전 권한' : CELL_TEXT[itemCell(it, d.id)])),
  ], [depts, itemCell, offTableOf]); // eslint-disable-line react-hooks/exhaustive-deps
  const exportItems = useCallback(async (scope) => {
    const list = scope === 'ALL' ? items : items.filter((it) => it.selectable.length);
    downloadXls({
      name: '데이터 접근 권한',
      head: itemHead,
      attrs: itemAttrs,
      rows: list.map(itemRow),
      scope,
      condSummary: `항목 ${list.length}개${scope === 'ALL' ? '(가릴 수 없는 항목 포함)' : ''} · 부서 ${depts.length}개`,
      menuId: SCREEN_ID,
    });
  }, [items, itemHead, itemAttrs, itemRow, depts]);

  // ── 엑셀 (조회 목록 / 전체, DTP-12·18) — 「제거됨」 2026-10-07: 종류(묶음) 표 기준. 항목 × 부서 표(exportItems)로 바꿈 ──
  const deptCells = useCallback(
    (f) => depts.map((d) => (d.locked === 'SUPER_ADMIN' ? '전 권한' : cellValue(f.key, d.id) ? '열람' : '비공개')),
    [depts, cellValue]
  );
  // 「분류」 열은 뺐습니다(2026-10-07 — 분류 자체를 없앰)
  const head = useMemo(() => ['데이터 항목', '적용', '포함 데이터', ...depts.map((d) => d.name)], [depts]);
  // 열마다 응답 필드명 — 예약어·관리 화면 키라 가려지는 칸은 없지만 마스킹 판정과 이력 blindCnt 를 맞추려고 넘깁니다(R-10)
  const attrs = useMemo(() => ['name', 'applyFlg', 'desc', ...depts.map((d) => `dept_${d.id}`)], [depts]);
  const toRow = useCallback((f) => [
    `${f.name}${f.builtIn ? ' (기본)' : ''}`,
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
    // 항목 × 부서 (2026-10-07)
    items,
    itemCell,
    toggleItem,
    offTableOf,
    // 새로 발견된 응답 데이터 (2026-10-08)
    foundRows,
    foundNewCount,
    foundReady: discovered.data?.ready !== false,
    foundLoading: discovered.loading && !discovered.data,
    addFoundToItem,
    createFoundItem,
    ignoreFound,
    viewCount: items.filter((it) => it.selectable.length).length,
    exportView: () => exportItems('VIEW'),
    exportAll: () => exportItems('ALL'),
    reload,
  };
}
