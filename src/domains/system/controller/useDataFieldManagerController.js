/**
 * [Controller] SY-03 항목 관리 — 화면 보고 가리기 (데이터 접근 권한 화면의 모달)
 *
 * 화면을 고르면 그 화면에 보이는 열 제목을 보여 주고, 가릴 열을 어느 종류에 넣을지 고르게 합니다.
 * 누가 볼지는 바깥 표(부서 × 종류)에서 정합니다.
 *
 * 2026-10-01 (기획 04 DTP-01·02·04·17)
 *  · 화면 선택지에서 시스템관리 화면은 뺍니다 — 권한 관리 응답·로그인 정보는 가림 대상이 아닙니다
 *  · 서버가 알려 준 예약어(reservedAttrs)는 체크할 수 없습니다. WEB 에 목록을 따로 두지 않습니다
 *  · 저장은 `PUT /system/data-fields/mapping` 1회 — 서버가 전부 반영하거나 전부 되돌립니다.
 *    실패하면 고른 내용(draft)과 새 종류를 그대로 둡니다
 *  · 꺼져 있던 종류에 값을 붙여도 자동으로 켜지 않습니다 — 응답 notApplied 로 안내합니다.
 *    새 종류만 요청에서 apply:true 로 켭니다(미배정·통합관리자 외 전 부서 허용으로 시작)
 *  · 쓰기 권한(sys-data)이 없으면 보기만 합니다
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { MENU } from '@shared/constants/menu';
import { useAsync } from '@shared/hooks/useAsync';
import { useUiStore } from '@shared/stores/useUiStore';
import { loadCodeGroups } from '@domains/common/model/codeRepository';
import * as repo from '../model/systemRepository';
import { SCREEN_COLUMNS } from '../model/screenColumns.generated';
import { TITLE_OF } from '../model/dataFieldModel';

/** 새 종류를 고르는 선택지 값 */
export const NEW_KIND = '__new__';

/** 내부 key 는 관리자에게 묻지 않고 만듭니다 — 서버 규칙(소문자로 시작 2~30자)에 맞춥니다 */
const autoKey = () => `f_${Date.now().toString(36)}`;

/**
 * 화면 목록 — 업무 화면만. 시스템관리 화면(계정 관리·메뉴 접근 권한 …)은 가릴 대상이 아니라 뺍니다(DTP-01).
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
 * 여기서 고를 수 없는 화면 — 표가 아니라 카드·보고서 형식이라 「열」이 없습니다.
 * 메뉴에서 계산합니다 — 새 화면이 표를 갖게 되면 목록에서 저절로 빠집니다.
 */
export const NO_TABLE_SCREENS = MENU.filter((g) => g.group !== '시스템관리')
  .flatMap((g) => g.items)
  .filter((m) => !SCREEN_COLUMNS.some((x) => x.id === m.id) && !['ai-chat', 'daily-history', 'dash-ai-upload'].includes(m.id) && !m.hidden)
  .map((m) => m.name);

/** 이 값이 보이는 다른 화면 */
export function otherScreens(field, screenId) {
  return SCREENS.filter((x) => x.id !== screenId && x.rows.some((r) => r.field === field)).map((x) => x.name);
}

/** 값 이름 → 사람이 보는 열 제목 — 바깥 표의 「포함 데이터」 와 같은 규칙(model/dataFieldModel, DTP-07) */
export { TITLE_OF };

/** 종류 이름·설명 길이 상한 (서버 DTO 와 같음, DTP-11) */
export const KIND_NAME_MAX = 50;
export const KIND_DESC_MAX = 300;

/** 종류 편집 폼 입력 검사 — 서버 400 과 같은 기준을 먼저 화면에서 봅니다 */
export function validateKind(v) {
  const errors = {};
  const name = String(v?.name || '').trim();
  if (!name) errors.name = '종류 이름을 입력해 주세요.';
  else if (name.length > KIND_NAME_MAX) errors.name = `종류 이름은 ${KIND_NAME_MAX}자 이내로 입력해 주세요.`;
  if (String(v?.desc || '').length > KIND_DESC_MAX) errors.desc = `설명은 ${KIND_DESC_MAX}자 이내로 입력해 주세요.`;
  return errors;
}

export function useDataFieldManagerController({ readOnly = false, onChanged, onDirtyChange } = {}) {
  const toast = useUiStore((state) => state.toast);
  const { data, loading, reload } = useAsync(() => repo.loadDataFields(), []);
  const kinds = useMemo(() => data?.fields || [], [data]);
  const reserved = useMemo(() => new Set(data?.reservedAttrs || []), [data]);
  // 분류 선택지 — 서버 공통코드 DATA_FIELD_CATEGORY 가 정본입니다(하드코딩 금지, DTP-11)
  const codes = useAsync(() => loadCodeGroups('DATA_FIELD_CATEGORY'), [], { silent: true });
  const categoryOptions = codes.data?.DATA_FIELD_CATEGORY || [];

  const [screenId, setScreenIdState] = useState(SCREENS[0]?.id || '');
  const screen = SCREENS.find((x) => x.id === screenId) || null;
  /** 바꾼 것만 — field → 종류 key(가리지 않음은 '') */
  const [draft, setDraft] = useState({});
  /** 저장 전에 만든 새 종류 — key → 이름 */
  const [newKinds, setNewKinds] = useState({});
  const [saving, setSaving] = useState(false);
  /** 마지막 저장 실패 — 서버 메시지 그대로 (draft 는 유지) */
  const [saveError, setSaveError] = useState('');

  // 지금 어느 종류가 그 값을 가리고 있는지
  const ownerOf = useMemo(
    () => Object.fromEntries(kinds.flatMap((k) => (k.attrs || []).map((a) => [typeof a === 'string' ? a : a?.attrName, k.key]))),
    [kinds]
  );
  const kindName = useCallback((key) => kinds.find((k) => k.key === key)?.name || newKinds[key]?.name || key, [kinds, newKinds]);
  const current = useCallback((field) => (field in draft ? draft[field] : ownerOf[field] || ''), [draft, ownerOf]);
  const changed = useMemo(() => Object.keys(draft).filter((f) => draft[f] !== (ownerOf[f] || '')), [draft, ownerOf]);

  const kindOptions = useMemo(() => [
    ...kinds.map((k) => ({ value: k.key, label: `${k.name}${k.applyFlg === 'N' ? ' (미적용)' : ''}` })),
    ...Object.entries(newKinds).map(([value, k]) => ({ value, label: `${k.name} (새 종류)` })),
    { value: NEW_KIND, label: '+ 새 종류 만들기…' },
  ], [kinds, newKinds]);

  /** 이 필드를 고를 수 없는 이유 (없으면 '') */
  const fieldLock = useCallback((field) => {
    if (reserved.has(field)) return '시스템이 쓰는 필드명이라 가릴 수 없습니다.';
    if (readOnly) return '미배정 계정은 이 동작을 할 수 없습니다. 전산팀에 부서 배정을 요청하세요.';
    return '';
  }, [reserved, readOnly]);

  const setKind = useCallback((field, kindKey) => {
    if (fieldLock(field)) return;
    setSaveError('');
    setDraft((d) => ({ ...d, [field]: kindKey }));
  }, [fieldLock]);

  /** 새 종류 추가 (모달에서 이름·설명·분류를 받은 뒤, DTP-11) */
  const addNewKind = useCallback((field, input) => {
    const v = typeof input === 'object' && input ? input : { name: input };
    const name = String(v.name || '').trim();
    if (!name || fieldLock(field) || Object.keys(validateKind(v)).length) return false;
    const key = autoKey();
    setNewKinds((m) => ({ ...m, [key]: { name, desc: String(v.desc || '').trim() || null, category: v.category || null } }));
    setDraft((d) => ({ ...d, [field]: key }));
    return true;
  }, [fieldLock]);

  /** 체크 — 켜면 종류를 먼저 고르게 하고, 종류가 하나도 없으면 새 종류를 만들도록 'ask' 를 돌려줍니다 */
  const toggleField = useCallback((field) => {
    if (fieldLock(field)) return null;
    if (current(field)) { setKind(field, ''); return null; }
    if (!kinds.length && !Object.keys(newKinds).length) return 'ask';
    setKind(field, kinds[0]?.key || Object.keys(newKinds)[0]);
    return null;
  }, [fieldLock, current, setKind, kinds, newKinds]);

  const resetDraft = useCallback(() => { setDraft({}); setNewKinds({}); setSaveError(''); }, []);

  /** 화면 바꾸기 — 바꾼 열이 있으면 view 가 먼저 확인을 받습니다(DTP-14). 쓰이지 않는 새 종류는 지웁니다 */
  const setScreenId = useCallback((v) => { setScreenIdState(v); setDraft({}); setNewKinds({}); setSaveError(''); }, []);

  const save = useCallback(async () => {
    if (readOnly || !changed.length || !screen) return;
    setSaving(true);
    setSaveError('');
    const titleOf = (f) => screen.rows.find((r) => r.field === f)?.title || f;
    const used = [...new Set(changed.map((f) => draft[f]).filter((k) => k && newKinds[k]))];
    const before = Object.fromEntries(changed.map((f) => [f, ownerOf[f] || null]));
    let res;
    try {
      res = await repo.saveDataFieldMapping({
        screenId: screen.id,
        newFields: used.map((key) => ({ fieldKey: key, name: newKinds[key].name, desc: newKinds[key].desc, category: newKinds[key].category, grantAllDepts: true, apply: true })),
        moves: changed.map((f) => (draft[f]
          ? { attrName: f, toFieldKey: draft[f], remark: `${screen.name} · ${titleOf(f)}`.slice(0, 200) }
          : { attrName: f, toFieldKey: null })),
      });
    } catch {
      res = { ok: false, message: '저장하지 못했습니다. 네트워크를 확인하고 다시 시도해 주세요.' };
    } finally {
      setSaving(false);
    }
    if (!res.ok) {
      // 전부 되돌려졌으므로 고른 내용은 그대로 둡니다
      setSaveError(res.message || '저장하지 못했습니다.');
      toast(res.message || '저장하지 못했습니다.');
      return;
    }
    const moved = res.data?.moved || [];
    const raced = moved.filter((m) => (m.from ?? null) !== (before[m.attrName] ?? null));
    const notApplied = (res.data?.notApplied || []).map(kindName);
    toast([
      res.message || `${changed.length}개 열을 저장했습니다.`,
      notApplied.length ? `「${notApplied.join('」·「')}」 종류는 미적용 상태라 지금은 가려지지 않습니다.` : '',
      raced.length ? '다른 관리자가 먼저 바꾼 열이 있어 목록을 다시 읽었습니다.' : '',
    ].filter(Boolean).join(' '));
    resetDraft();
    reload();
    onChanged?.();
  }, [readOnly, changed, screen, draft, newKinds, ownerOf, kindName, toast, resetDraft, reload, onChanged]);

  const removeKind = useCallback(async (kind) => {
    if (readOnly) return { ok: false, message: '미배정 계정은 이 동작을 할 수 없습니다. 전산팀에 부서 배정을 요청하세요.' };
    const res = await repo.removeDataField(kind.key).catch(() => ({ ok: false, message: '삭제하지 못했습니다.' }));
    toast(res.message);
    if (res.ok) { reload(); onChanged?.(); }
    return res;
  }, [readOnly, toast, reload, onChanged]);

  /** 종류 편집 — 이름·설명·분류 (DTP-11). 서버 오류는 토스트로 보이고 폼을 닫지 않습니다 */
  const updateKind = useCallback(async (kind, v) => {
    if (readOnly) { toast('미배정 계정은 이 동작을 할 수 없습니다. 전산팀에 부서 배정을 요청하세요.'); return false; }
    const res = await repo.updateDataField({
      fieldKey: kind.key,
      name: String(v.name || '').trim(),
      desc: String(v.desc || '').trim(),
      category: v.category || '',
    }).catch(() => ({ ok: false, message: '저장하지 못했습니다.' }));
    toast(res.message || (res.ok ? '종류를 수정했습니다.' : '저장하지 못했습니다.'));
    if (!res.ok) return false;
    reload();
    onChanged?.();
    return true;
  }, [readOnly, toast, reload, onChanged]);

  // 바꾼 열 수를 바깥(모달 닫기 확인)에 알립니다 (DTP-14)
  const changedCount = changed.length;
  useEffect(() => { onDirtyChange?.(changedCount); }, [changedCount, onDirtyChange]);

  const alsoHidden = [...new Set(changed.filter((f) => draft[f]).flatMap((f) => otherScreens(f, screenId)))];

  return {
    loading: loading && !data,
    readOnly,
    kinds,
    screens: SCREENS,
    noTableScreens: NO_TABLE_SCREENS,
    screenId,
    screen,
    setScreenId,
    draft,
    changed,
    current,
    kindName,
    kindOptions,
    fieldLock,
    setKind,
    addNewKind,
    toggleField,
    resetDraft,
    save,
    saving,
    saveError,
    alsoHidden,
    removeKind,
    updateKind,
    categoryOptions,
    titleOf: TITLE_OF,
  };
}
