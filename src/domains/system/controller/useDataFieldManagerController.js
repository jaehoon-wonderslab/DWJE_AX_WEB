/**
 * [Controller] SY-03 항목 관리 (데이터 접근 권한 화면의 모달)
 *
 * 관리자는 화면에 보이는 이름(항목)에 체크만 합니다. 한 항목은 여러 화면 · 여러 API 데이터 키에 걸칠 수 있고
 * (model/dataItemModel), 체크 한 번으로 그 키들이 모두 같은 종류(바깥 표의 한 줄 — 화면에서는 「묶음」)에 들어갑니다.
 * 누가 볼지는 바깥 표(부서 × 묶음)에서 정합니다.
 *
 * 2026-10-01 (기획 04 DTP-01·02·04·17)
 *  · 시스템관리 화면은 대상이 아닙니다 — 권한 관리 응답·로그인 정보는 가림 대상이 아닙니다
 *  · 서버가 알려 준 예약어(reservedAttrs)는 체크할 수 없습니다. WEB 에 목록을 따로 두지 않습니다
 *  · 저장은 `PUT /system/data-fields/mapping` 1회 — 서버가 전부 반영하거나 전부 되돌립니다. 실패하면 고른 내용을 그대로 둡니다
 *  · 꺼져 있던 종류에 값을 붙여도 자동으로 켜지 않습니다. 새 종류만 요청에서 apply:true 로 켭니다
 *  · 쓰기 권한(sys-data)이 없으면 보기만 합니다
 * 2026-10-07 — 화면 · 열 단위로 종류를 고르던 상태(draft · newKinds · toggleField …)를 걷어내고 항목 단위 체크 하나로 합쳤습니다.
 *  「화면별 보기」 탭도 같은 항목 체크를 씁니다.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { MENU } from '@shared/constants/menu';
import { useAsync } from '@shared/hooks/useAsync';
import { useUiStore } from '@shared/stores/useUiStore';
import * as repo from '../model/systemRepository';
import { SCREEN_COLUMNS } from '../model/screenColumns.generated';
import { attrNamesOf, attrTitleOf } from '../model/dataFieldModel';
import { buildDataItems, itemState } from '../model/dataItemModel';

/** 내부 key 는 관리자에게 묻지 않고 만듭니다 — 서버 규칙(소문자로 시작 2~30자)에 맞춥니다 */
const autoKey = () => `f_${Date.now().toString(36)}`;

/**
 * 화면 목록(「화면별 보기」 탭) — 업무 화면만. 시스템관리 화면은 가릴 대상이 아니라 뺍니다(DTP-01).
 * 같은 값이 한 화면의 여러 표에 다른 제목으로 나오면 한 줄로 묶습니다.
 */
export const SCREENS = SCREEN_COLUMNS.filter((x) => x.group !== '시스템관리')
  .map((x) => {
    const byField = new Map();
    x.columns.forEach((c) => {
      const titles = byField.get(c.field) || [];
      if (!titles.includes(c.title)) titles.push(c.title);
      byField.set(c.field, titles);
    });
    return { ...x, rows: [...byField.entries()].map(([field, titles]) => ({ field, title: titles.join(' · ') })) };
  });

/**
 * 표가 없는 화면 — 카드·보고서 형식이라 「열」이 없습니다. 메뉴에서 계산합니다.
 */
export const NO_TABLE_SCREENS = MENU.filter((g) => g.group !== '시스템관리')
  .flatMap((g) => g.items)
  .filter((m) => !SCREEN_COLUMNS.some((x) => x.id === m.id) && !['ai-chat', 'daily-history', 'dash-ai-upload'].includes(m.id) && !m.hidden)
  .map((m) => m.name);

/**
 * 항목(이름) 묶기에 넘기는 화면 — 같은 값이 한 화면에서 여러 제목으로 나와도 제목마다 따로 넘깁니다.
 * 제목을 「 · 」 로 이어 붙이면(SCREENS.rows) 다른 화면의 같은 제목과 이어지지 않습니다.
 */
const ITEM_SCREENS = SCREEN_COLUMNS.filter((x) => x.group !== '시스템관리').map((x) => ({ ...x, rows: x.columns }));

/** 묶음(종류) 이름·설명 길이 상한 (서버 DTO 와 같음, DTP-11) */
export const KIND_NAME_MAX = 50;
export const KIND_DESC_MAX = 300;

/** 묶음 편집 폼 입력 검사 — 서버 400 과 같은 기준을 먼저 화면에서 봅니다 */
export function validateKind(v) {
  const errors = {};
  const name = String(v?.name || '').trim();
  if (!name) errors.name = '묶음 이름을 입력해 주세요.';
  else if (name.length > KIND_NAME_MAX) errors.name = `묶음 이름은 ${KIND_NAME_MAX}자 이내로 입력해 주세요.`;
  if (String(v?.desc || '').length > KIND_DESC_MAX) errors.desc = `설명은 ${KIND_DESC_MAX}자 이내로 입력해 주세요.`;
  return errors;
}

export function useDataFieldManagerController({ readOnly = false, onChanged, onDirtyChange } = {}) {
  const toast = useUiStore((state) => state.toast);
  const { data, loading, reload } = useAsync(() => repo.loadDataFields(), []);
  const kinds = useMemo(() => data?.fields || [], [data]);
  // 부서별 열람 현황 — 「부서별 설정 현황」 칸에 어느 부서가 못 보는지 보입니다(2026-10-07)
  const perms = useAsync(() => repo.loadDataPerms(), [], { silent: true });
  const reserved = useMemo(() => new Set(data?.reservedAttrs || []), [data]);

  const [screenId, setScreenId] = useState(SCREENS[0]?.id || '');
  const screen = SCREENS.find((x) => x.id === screenId) || null;
  const [saving, setSaving] = useState(false);
  /** 마지막 저장 실패 — 서버 메시지 그대로 (고른 내용은 유지) */
  const [saveError, setSaveError] = useState('');
  /** 저장 전 변경 — 항목 id → 가림 여부(true/false). 항목 · 화면별 탭이 함께 씁니다 */
  const [itemDraft, setItemDraft] = useState({});

  // 지금 어느 종류가 그 키를 가리고 있는지
  const ownerOf = useMemo(
    () => Object.fromEntries(kinds.flatMap((k) => (k.attrs || []).map((a) => [typeof a === 'string' ? a : a?.attrName, k.key]))),
    [kinds]
  );
  const kindName = useCallback((key) => kinds.find((k) => k.key === key)?.name || key, [kinds]);

  // ── 항목(이름) 기준 가리기 (2026-10-07) ───────────────────────────────
  //  관리자는 「불량 수량」 처럼 화면에 보이는 이름에 **체크만** 합니다. 종류를 따로 고르지 않습니다(같은 날 디자인 피드백).
  //   · 체크한 항목은 바깥 표(부서 × 행)의 한 행이 됩니다 — 이미 어느 종류(기본 7종 등)에 들어 있으면 그 행을 따르고,
  //     아니면 항목 이름 그대로 새 행(종류)을 만듭니다. 누가 볼지는 그 행에서 부서마다 정합니다.
  //   · 일부 값 이름만 가려진 항목을 체크하면 이미 가리고 있는 행으로 나머지를 맞춥니다.
  //   · 체크를 끄면 그 항목의 값 이름을 모두 풉니다. 항목 이름으로 만든 행이 비면 그 행도 지웁니다.
  //   · 여러 항목을 한 행으로 묶는 일은 「가리기 종류」 탭(종류 편집)에서 합니다.
  //  지금 DB 는 값 이름 하나가 전역에서 한 종류라, 공용 키(value · rate …)는 고를 수 없습니다(dataItemModel).
  const items = useMemo(
    () => buildDataItems({ screens: ITEM_SCREENS, kinds, reserved, titleOfAttr: attrTitleOf }),
    [kinds, reserved]
  );
  const kindOfAttr = useCallback((a) => ownerOf[a] || '', [ownerOf]);
  const itemStateOf = useCallback((item) => itemState(item, kindOfAttr), [kindOfAttr]);
  /** 지금(저장 전 변경 포함) 가리는지 — 일부만 가려진 항목은 체크 전까지 false */
  const itemChecked = useCallback(
    (item) => (item.id in itemDraft ? !!itemDraft[item.id] : itemStateOf(item).state === 'all'),
    [itemDraft, itemStateOf]
  );
  /**
   * 체크하면 들어갈 행(종류) — 이미 가리는 종류(여러 개면 가장 많이 쓰인 것) → 항목 이름과 같은 이름의 종류 → 새 행
   * @returns {{key:string|null, name:string, isNew:boolean}}
   */
  const itemTarget = useCallback((item) => {
    const cnt = new Map();
    item.selectable.forEach((a) => { const k = ownerOf[a]; if (k) cnt.set(k, (cnt.get(k) || 0) + 1); });
    const best = [...cnt.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    if (best) return { key: best, name: kindName(best), isNew: false };
    const same = kinds.find((k) => String(k.name || '').trim() === item.name);
    if (same) return { key: same.key, name: same.name, isNew: false };
    return { key: null, name: item.name, isNew: true };
  }, [ownerOf, kinds, kindName]);
  /** 저장하면 실제로 바뀌는 항목 */
  const itemChanged = useMemo(() => items.filter((it) => {
    if (!(it.id in itemDraft)) return false;
    const st = itemStateOf(it).state;
    return itemDraft[it.id] ? st !== 'all' : st === 'all' || st === 'partial';
  }), [items, itemDraft, itemStateOf]);

  const itemLock = useCallback((item) => {
    if (!item.selectable.length) {
      return item.keys.some((k) => k.lock === 'generic')
        ? '여러 화면에서 다른 값을 담는 공용 키라 지금은 고를 수 없습니다(2단계에서 처리).'
        : '시스템이 쓰는 값이라 가릴 수 없습니다.';
    }
    if (readOnly) return '미배정 계정은 이 동작을 할 수 없습니다. 전산팀에 부서 배정을 요청하세요.';
    return '';
  }, [readOnly]);

  const toggleItem = useCallback((item) => {
    if (itemLock(item)) return;
    setSaveError('');
    setItemDraft((d) => ({ ...d, [item.id]: !itemChecked(item) }));
  }, [itemLock, itemChecked]);

  const resetItemDraft = useCallback(() => { setItemDraft({}); setSaveError(''); }, []);

  /**
   * 항목 저장 — `PUT mapping` 1회. 새 행(종류)은 newFields 로 함께 만듭니다(미배정·통합관리자 외 전 부서 열람 허용으로 시작).
   * 체크를 꺼서 비게 된 「항목 이름으로 만든 행」 은 저장이 끝난 뒤 지웁니다(기본 7종 · 다른 이름의 종류는 남김).
   */
  const saveItems = useCallback(async () => {
    if (readOnly || !itemChanged.length) return;
    const moves = [];
    const newFields = [];
    const newKeyOf = {};
    const emptied = new Set();
    itemChanged.forEach((it) => {
      if (itemDraft[it.id]) {
        const t = itemTarget(it);
        let key = t.key;
        if (t.isNew) {
          key = newKeyOf[t.name] || `${autoKey()}${newFields.length}`;
          if (!newKeyOf[t.name]) {
            newKeyOf[t.name] = key;
            newFields.push({ fieldKey: key, name: t.name.slice(0, KIND_NAME_MAX), desc: null, grantAllDepts: true, apply: true });
          }
        }
        it.selectable.forEach((a) => {
          if (ownerOf[a] !== key) moves.push({ attrName: a, toFieldKey: key, remark: `항목 · ${it.name}`.slice(0, 200) });
        });
      } else {
        it.selectable.forEach((a) => {
          if (ownerOf[a]) { moves.push({ attrName: a, toFieldKey: null }); emptied.add(ownerOf[a]); }
        });
      }
    });
    if (!moves.length) { setItemDraft({}); return; }
    setSaving(true);
    setSaveError('');
    let res;
    try {
      res = await repo.saveDataFieldMapping({ screenId: '항목 관리 · 항목 기준', newFields, moves });
    } catch {
      res = { ok: false, message: '저장하지 못했습니다. 네트워크를 확인하고 다시 시도해 주세요.' };
    }
    if (!res.ok) {
      setSaving(false);
      setSaveError(res.message || '저장하지 못했습니다.');
      toast(res.message || '저장하지 못했습니다.');
      return;
    }
    // 비게 된 「항목 이름으로 만든 행」 지우기 — 다른 값이 남은 종류 · 기본 7종 · 다른 이름의 종류는 남깁니다
    const leaving = new Set(moves.filter((m) => !m.toFieldKey).map((m) => m.attrName));
    const itemNames = new Set(items.map((it) => it.name));
    const removable = kinds.filter((k) => emptied.has(k.key) && !k.builtIn && itemNames.has(String(k.name || '').trim())
      && attrNamesOf(k).every((a) => leaving.has(a)));
    for (const k of removable) {
      // 지우지 못해도 가리기는 이미 풀렸습니다 — 빈 행만 남습니다
      await repo.removeDataField(k.key).catch(() => null);
    }
    setSaving(false);
    const added = newFields.map((f) => f.name);
    toast([
      `항목 ${itemChanged.length}개를 저장했습니다.`,
      added.length ? `바깥 표에 「${added.join('」·「')}」 행이 생겼습니다 — 지금은 모든 부서가 봅니다. 숨길 부서의 체크를 끄세요.` : '',
      removable.length ? `비게 된 「${removable.map((k) => k.name).join('」·「')}」 행을 지웠습니다.` : '',
    ].filter(Boolean).join(' '));
    setItemDraft({});
    reload();
    perms.reload?.();
    onChanged?.();
  }, [readOnly, itemChanged, itemDraft, itemTarget, ownerOf, items, kinds, toast, reload, perms, onChanged]);

  /**
   * 그 종류를 못 보는 부서 이름 — 통합관리자는 늘 보고, 미배정은 늘 못 봅니다(바깥 표와 같은 규칙).
   * 부서 목록을 아직 못 읽었으면 null
   */
  const hiddenDeptsOf = useCallback((kindKey) => {
    const depts = perms.data?.depts;
    if (!Array.isArray(depts)) return null;
    const matrix = perms.data?.matrix || {};
    return depts.filter((d) => {
      if (d.locked === 'SUPER_ADMIN') return false;
      if (d.locked === 'UNASSIGNED') return true;
      return !(matrix[String(d.id)] || []).includes(kindKey);
    }).map((d) => d.name);
  }, [perms.data]);
  const kindApplied = useCallback((kindKey) => kinds.find((k) => k.key === kindKey)?.applyFlg !== 'N', [kinds]);

  const removeKind = useCallback(async (kind) => {
    if (readOnly) return { ok: false, message: '미배정 계정은 이 동작을 할 수 없습니다. 전산팀에 부서 배정을 요청하세요.' };
    const res = await repo.removeDataField(kind.key).catch(() => ({ ok: false, message: '삭제하지 못했습니다.' }));
    toast(res.message);
    if (res.ok) { reload(); onChanged?.(); }
    return res;
  }, [readOnly, toast, reload, onChanged]);

  /**
   * 종류 편집 저장 — 이름 · 설명과 **가리는 값** 을 함께 고칩니다(2026-10-07 「가리는 값을 추가/삭제/편집할 수 없음」 피드백).
   *  · 값은 `PUT /system/data-fields/mapping` 1회로 넣고 뺍니다(넣기 = 이 종류로 이동, 빼기 = toFieldKey:null — 가리지 않음).
   *    다른 종류에 있던 값을 넣으면 그 종류에서 빠집니다(서버가 옮깁니다)
   *  · 이름 · 설명이 바뀌었을 때만 `PUT /system/data-fields/{key}` 를 부릅니다
   * @returns {Promise<boolean>} 닫아도 되면 true
   */
  const saveKind = useCallback(async (kind, v) => {
    if (readOnly) { toast('미배정 계정은 이 동작을 할 수 없습니다. 전산팀에 부서 배정을 요청하세요.'); return false; }
    const before = attrNamesOf(kind);
    const after = (v.values || []).map((x) => x.attrName);
    const added = (v.values || []).filter((x) => !before.includes(x.attrName));
    const removed = before.filter((a) => !after.includes(a));
    const meta = { name: String(v.name || '').trim(), desc: String(v.desc || '').trim() };
    const metaChanged = meta.name !== (kind.name || '') || meta.desc !== (kind.desc || '');
    const done = [];
    if (added.length || removed.length) {
      const res = await repo.saveDataFieldMapping({
        // 이력의 「어디서」 — 화면이 아니라 종류 편집에서 바꿨다는 표시
        screenId: `종류 편집 · ${kind.name}`.slice(0, 100),
        moves: [
          ...added.map((x) => ({ attrName: x.attrName, toFieldKey: kind.key, ...(x.remark ? { remark: String(x.remark).slice(0, 200) } : null) })),
          ...removed.map((a) => ({ attrName: a, toFieldKey: null })),
        ],
      }).catch(() => ({ ok: false, message: '저장하지 못했습니다. 네트워크를 확인하고 다시 시도해 주세요.' }));
      if (!res.ok) { toast(res.message || '가리는 값을 저장하지 못했습니다.'); return false; }
      done.push(`가리는 값 ${added.length ? `${added.length}개 넣음` : ''}${added.length && removed.length ? ' · ' : ''}${removed.length ? `${removed.length}개 뺌` : ''}`);
      if ((res.data?.notApplied || []).includes(kind.key)) done.push('이 종류는 미적용 상태라 지금은 가려지지 않습니다');
    }
    if (metaChanged) {
      const res = await repo.updateDataField({ fieldKey: kind.key, ...meta })
        .catch(() => ({ ok: false, message: '저장하지 못했습니다.' }));
      if (!res.ok) {
        toast(`${done.length ? `${done.join(' · ')}. ` : ''}이름 · 설명은 저장하지 못했습니다 — ${res.message || '서버 오류'}`);
        if (done.length) { reload(); onChanged?.(); }
        return false;
      }
      done.unshift('이름 · 설명 저장');
    }
    toast(done.length ? `${done.join(' · ')}.` : '바뀐 내용이 없습니다.');
    if (done.length) { reload(); onChanged?.(); }
    return true;
  }, [readOnly, toast, reload, onChanged]);

  /**
   * 항목(이 항목이 든 묶음)의 부서별 열람 — 부서 목록과 지금 열람 여부. 통합관리자 · 미배정은 바꿀 수 없습니다(바깥 표와 같은 규칙)
   * @returns {Array<{id,name,allowed:boolean,locked:string|null}>|null}
   */
  const deptPermsOf = useCallback((kindKey) => {
    const depts = perms.data?.depts;
    if (!Array.isArray(depts)) return null;
    const matrix = perms.data?.matrix || {};
    return depts.map((d) => ({
      id: d.id,
      name: d.name,
      locked: d.locked || null,
      allowed: d.locked === 'SUPER_ADMIN' ? true : d.locked === 'UNASSIGNED' ? false : (matrix[String(d.id)] || []).includes(kindKey),
    }));
  }, [perms.data]);

  /**
   * 항목별 부서 설정 저장(2026-10-07 6차 「항목별로 부서를 설정」) — 바뀐 부서만 `PUT /system/data-perms` 한 건씩.
   * 권한은 묶음(종류) 단위라, 같은 묶음의 다른 항목에도 함께 적용됩니다(화면이 먼저 알립니다).
   * 하나라도 실패하면 거기서 멈추고 서버 메시지를 보입니다. 앞서 저장된 부서는 그대로 남습니다.
   * @param {string} kindKey
   * @param {Record<string, boolean>} next 부서 id → 열람 여부
   * @returns {Promise<boolean>} 닫아도 되면 true
   */
  const saveKindDepts = useCallback(async (kindKey, next) => {
    if (readOnly) { toast('미배정 계정은 이 동작을 할 수 없습니다. 전산팀에 부서 배정을 요청하세요.'); return false; }
    const now = deptPermsOf(kindKey) || [];
    const changes = now.filter((d) => !d.locked && String(d.id) in next && !!next[String(d.id)] !== d.allowed);
    if (!changes.length) { toast('바뀐 부서가 없습니다.'); return true; }
    let done = 0;
    for (const d of changes) {
      const allowed = !!next[String(d.id)];
      const res = await repo.setDataPerm(d.id, kindKey, allowed).catch(() => ({ ok: false, message: '저장하지 못했습니다.' }));
      if (!res?.ok) {
        toast(`${done ? `${done}개 부서는 저장했습니다. ` : ''}「${d.name}」 — ${res?.message || '저장하지 못했습니다.'}`);
        if (done) { perms.reload?.(); onChanged?.(); }
        return false;
      }
      done += 1;
    }
    toast(`부서 ${done}개의 열람 설정을 저장했습니다.`);
    perms.reload?.();
    onChanged?.();
    return true;
  }, [readOnly, deptPermsOf, perms, toast, onChanged]);

  // 바꾼 항목 수를 바깥(모달 닫기 확인)에 알립니다 (DTP-14)
  const changedCount = itemChanged.length;
  useEffect(() => { onDirtyChange?.(changedCount); }, [changedCount, onDirtyChange]);

  return {
    loading: loading && !data,
    readOnly,
    kinds,
    screens: SCREENS,
    noTableScreens: NO_TABLE_SCREENS,
    screenId,
    screen,
    setScreenId,
    kindName,
    ownerOf,
    saving,
    saveError,
    removeKind,
    saveKind,
    // 항목(이름) 기준
    items,
    itemStateOf,
    itemChecked,
    itemTarget,
    itemChanged,
    itemLock,
    toggleItem,
    resetItemDraft,
    saveItems,
    hiddenDeptsOf,
    kindApplied,
    deptPermsOf,
    saveKindDepts,
  };
}
