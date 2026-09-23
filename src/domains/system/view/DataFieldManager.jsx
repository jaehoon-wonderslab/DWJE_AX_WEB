/**
 * [View] SY-03 항목 관리 — 화면 보고 가리기 (데이터 접근 권한 화면의 모달)
 *
 * 관리자는 「이 화면의 단가 열을 숨기고 싶다」 로 생각합니다. 그래서 **화면을 고르면 그 화면에 실제로 보이는
 * 열 제목**(LOT 번호 · 단가 …)을 그대로 보여 주고, 가릴 열에 체크한 뒤 어느 **종류**(단가·금액 · 고객사 …)에
 * 넣을지만 고르게 합니다. 누가 볼지는 바깥의 「부서별 데이터 접근 권한 관리」 표에서 종류 단위로 정합니다.
 *
 * 항목 key · 응답 필드명 · 적용 켜기 같은 내부 개념은 화면에 드러내지 않습니다.
 *  · 열 제목 ↔ 값 이름 짝은 화면 코드에서 자동으로 모은 목록입니다(screenColumns.generated.js)
 *  · 같은 값은 다른 화면에서도 함께 가려집니다 — 저장 전에 그 화면들을 알려 줍니다
 *  · 새 종류는 만들 때 **모든 부서가 볼 수 있게** 시작합니다. 만들자마자 여러 화면이 비는 일을 막으려는 것입니다.
 *    숨길 부서는 바깥 표에서 체크를 끕니다.
 *  · 저장하면 바로 반영됩니다(서버가 응답에서 값을 가립니다)
 */
import React, { useCallback, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Badge, Button, CheckRow, Hint, Loading, SelectField, Table, openConfirmModal, openFormModal } from '@shared/components/ui';
import { useAsync } from '@shared/hooks/useAsync';
import { useUiStore } from '@shared/stores/useUiStore';
import { useCommonStyles } from '@shared/theme/styles';
import * as repo from '../model/systemRepository';
import { SCREEN_COLUMNS } from '../model/screenColumns.generated';
import { MENU } from '@shared/constants/menu';

/** 이 관리 화면 자신은 목록에서 뺍니다 */
const SELF = 'sys-data';

/** 새 종류를 고르는 선택지 값 */
const NEW_KIND = '__new__';

/** 내부 key 는 관리자에게 묻지 않고 만듭니다 — 서버 규칙(소문자로 시작 2~30자)에 맞춥니다 */
const autoKey = () => `f_${Date.now().toString(36)}`;

/** 화면 목록 — 업무 화면을 앞에, 시스템관리 화면을 뒤에 */
const SCREENS = SCREEN_COLUMNS.filter((x) => x.id !== SELF)
  .map((x) => {
    // 같은 값이 한 화면의 여러 표에 다른 제목으로 나오면 한 줄로 묶습니다
    const byField = new Map();
    x.columns.forEach((c) => {
      const titles = byField.get(c.field) || [];
      if (!titles.includes(c.title)) titles.push(c.title);
      byField.set(c.field, titles);
    });
    return { ...x, rows: [...byField.entries()].map(([field, titles]) => ({ field, title: titles.join(' · ') })) };
  })
  .sort((a, b) => Number(a.group === '시스템관리') - Number(b.group === '시스템관리'));

/**
 * 여기서 고를 수 없는 화면 — 표가 아니라 카드·보고서 형식이라 「열」이 없습니다.
 * 그 화면의 수량·수율은 기본 종류(생산·출하 수량 · 수율·불량률)를 그대로 따릅니다.
 * 메뉴에서 계산합니다 — 새 화면이 표를 갖게 되면 목록에서 저절로 빠집니다.
 */
const NO_TABLE_SCREENS = MENU.flatMap((g) => g.items)
  .filter((m) => !SCREEN_COLUMNS.some((x) => x.id === m.id) && !['ai-chat', 'daily-history', 'dash-ai-upload'].includes(m.id) && !m.hidden)
  .map((m) => m.name);

/** 이 값이 보이는 다른 화면 */
function otherScreens(field, screenId) {
  return SCREENS.filter((x) => x.id !== screenId && x.rows.some((r) => r.field === field)).map((x) => x.name);
}

export default function DataFieldManager({ onChanged }) {
  const s = useCommonStyles();
  const toast = useUiStore((state) => state.toast);
  const { data, loading, reload } = useAsync(() => repo.loadDataFields(), []);
  const kinds = useMemo(() => data?.fields || data?.items || [], [data]);

  const [screenId, setScreenId] = useState(SCREENS[0]?.id || '');
  const screen = SCREENS.find((x) => x.id === screenId) || null;
  /** 바꾼 것만 — field → 종류 key(가리지 않음은 '') */
  const [draft, setDraft] = useState({});
  /** 저장 전에 만든 새 종류 — key → 이름 */
  const [newKinds, setNewKinds] = useState({});
  const [saving, setSaving] = useState(false);

  // 지금 어느 종류가 그 값을 가리고 있는지
  const ownerOf = useMemo(() => Object.fromEntries(kinds.flatMap((k) => (k.attrs || []).map((a) => [a, k.key]))), [kinds]);
  const kindName = (key) => kinds.find((k) => k.key === key)?.name || newKinds[key] || key;
  const current = (field) => (field in draft ? draft[field] : ownerOf[field] || '');
  const changed = Object.keys(draft).filter((f) => draft[f] !== (ownerOf[f] || ''));

  const kindOptions = [
    ...kinds.map((k) => ({ value: k.key, label: k.name })),
    ...Object.entries(newKinds).map(([value, label]) => ({ value, label: `${label} (새 종류)` })),
    { value: NEW_KIND, label: '+ 새 종류 만들기…' },
  ];

  const set = (field, kindKey) => setDraft((d) => ({ ...d, [field]: kindKey }));

  const askNewKind = (field) =>
    openFormModal({
      title: '새 종류 만들기',
      sub: '가릴 값을 묶는 이름입니다. 누가 볼지는 바깥 표에서 부서마다 정합니다.',
      fields: [{ key: 'name', label: '종류 이름', required: true, placeholder: '예) LOT·시리얼 · 작업자 연락처' }],
      note: '새 종류는 처음에 모든 부서가 볼 수 있게 만들어집니다. 숨길 부서는 바깥 표에서 체크를 끄세요.',
      submitLabel: '만들기',
      onSubmit: (v) => {
        const name = String(v.name || '').trim();
        if (!name) return false;
        const key = autoKey();
        setNewKinds((m) => ({ ...m, [key]: name }));
        set(field, key);
        return true;
      },
    });

  const toggle = (field) => {
    if (current(field)) return set(field, '');
    // 체크하면 종류를 먼저 고르게 합니다 — 종류가 없으면 누가 볼지 정할 곳이 없습니다
    if (!kinds.length && !Object.keys(newKinds).length) return askNewKind(field);
    set(field, kinds[0]?.key || Object.keys(newKinds)[0]);
  };

  const save = useCallback(async () => {
    if (!changed.length || !screen) return;
    setSaving(true);
    const titleOf = (f) => screen.rows.find((r) => r.field === f)?.title;
    const fail = [];
    try {
      // 1) 새 종류 — 만들고, 모든 부서 허용으로 시작하고, 켭니다
      const used = new Set(changed.map((f) => draft[f]).filter((k) => k && newKinds[k]));
      const notCreated = new Set();
      if (used.size) {
        const perms = await repo.loadDataPerms().catch(() => ({ depts: [] }));
        for (const key of used) {
          const res = await repo.createDataField({ key, name: newKinds[key] });
          if (!res.ok) { fail.push(res.message); notCreated.add(key); continue; }
          for (const d of perms.depts || []) await repo.setDataPerm(d.id, key, true);
          await repo.setDataFieldApplied(key, true);
        }
      }
      // 2) 값 옮기기 — 이전 종류에서 빼고 새 종류에 붙입니다(같은 값은 한 종류에만 둘 수 있습니다)
      for (const f of changed) {
        const before = ownerOf[f] || '';
        const after = draft[f];
        // 만들지 못한 종류로 옮기는 값은 건드리지 않습니다 — 빼기만 하고 못 붙이면 가려지던 값이 드러납니다
        if (notCreated.has(after)) continue;
        if (before) {
          const r = await repo.removeFieldAttr(before, f);
          if (!r.ok) { fail.push(r.message); continue; }
        }
        if (after) {
          const r = await repo.addFieldAttr(after, f, `${screen.name} · ${titleOf(f)}`);
          if (!r.ok) fail.push(r.message);
          // 꺼져 있던 종류에 붙이면 켭니다 — 저장하면 바로 가려진다고 안내했습니다
          const k = kinds.find((x) => x.key === after);
          if (k && k.applyFlg !== 'Y') await repo.setDataFieldApplied(after, true);
        }
      }
    } finally {
      setSaving(false);
    }
    toast(fail.length ? `일부를 저장하지 못했습니다 — ${fail[0]}` : `${changed.length}개 열을 저장했습니다 — 바로 반영됩니다`);
    setDraft({});
    setNewKinds({});
    reload();
    onChanged?.();
  }, [changed, draft, newKinds, ownerOf, kinds, screen, toast, reload, onChanged]);

  if (loading) return <Loading />;

  const alsoHidden = [...new Set(changed.filter((f) => draft[f]).flatMap((f) => otherScreens(f, screenId)))];

  return (
    <View style={{ gap: 14 }}>
      <Hint>화면을 고르고 가릴 열에 체크한 뒤 종류를 고르세요. 누가 볼지는 바깥 표에서 종류마다 부서별로 정합니다.</Hint>

      <SelectField
        label="화면"
        value={screenId}
        options={SCREENS.map((x) => ({ value: x.id, label: `${x.group} › ${x.name}` }))}
        onChange={(v) => { setScreenId(v); setDraft({}); }}
      />
      {NO_TABLE_SCREENS.length ? (
        <Text style={s.textXs}>
          {`${NO_TABLE_SCREENS.join(' · ')} 은(는) 표가 아닌 카드·보고서 형식이라 여기서 고를 수 없습니다. 그 화면의 수량·수율은 「생산·출하 수량」「수율·불량률」 종류를 따릅니다.`}
        </Text>
      ) : null}

      {screen ? (
        <Table
          minWidth={680}
          bordered
          rows={screen.rows}
          keyExtractor={(r) => r.field}
          emptyText="이 화면에는 가릴 수 있는 표 열이 없습니다."
          columns={[
            { key: 'title', title: '이 화면에 보이는 열', minWidth: 200, flex: 1.6, render: (r) => <Text style={s.textSm}>{r.title}</Text> },
            {
              key: 'hide',
              title: '가리기',
              width: 90,
              align: 'center',
              render: (r) => <CheckRow checked={!!current(r.field)} onToggle={() => toggle(r.field)} />,
            },
            {
              key: 'kind',
              title: '종류',
              minWidth: 190,
              flex: 1.2,
              render: (r) => {
                const k = current(r.field);
                if (!k) return <Text style={s.textXs}>—</Text>;
                return (
                  // 표 칸 안이라 떠 있는 목록은 잘립니다 — 브라우저 기본 선택 상자로 엽니다
                  <SelectField
                    nativeSelect
                    value={k}
                    options={kindOptions}
                    onChange={(v) => (v === NEW_KIND ? askNewKind(r.field) : set(r.field, v))}
                  />
                );
              },
            },
            {
              key: 'also',
              title: '같은 값이 보이는 다른 화면',
              minWidth: 220,
              flex: 1.4,
              render: (r) => {
                const list = otherScreens(r.field, screenId);
                return <Text style={s.textXs}>{list.length ? `${list.slice(0, 2).join(' · ')}${list.length > 2 ? ` 외 ${list.length - 2}곳` : ''}` : '—'}</Text>;
              },
            },
          ]}
        />
      ) : null}

      {changed.length ? (
        <View style={{ gap: 6 }}>
          <Text style={s.textSm}>{`바꾼 열 ${changed.length}개 · ${changed.map((f) => `${screen?.rows.find((r) => r.field === f)?.title || f} → ${draft[f] ? kindName(draft[f]) : '가리지 않음'}`).join(' · ')}`}</Text>
          {alsoHidden.length ? <Text style={s.textXs}>{`같은 값이 보이는 다른 화면에서도 함께 가려집니다 — ${alsoHidden.join(' · ')}`}</Text> : null}
          <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
            <Button label="되돌리기" size="sm" onPress={() => { setDraft({}); setNewKinds({}); }} disabled={saving} />
            <Button label={saving ? '저장하는 중…' : '저장'} size="sm" variant="primary" icon="save" onPress={save} disabled={saving} />
          </View>
        </View>
      ) : null}

      <KindList kinds={kinds} onChanged={() => { reload(); onChanged?.(); }} />
    </View>
  );
}

/** 종류 목록 — 무엇이 들어 있는지를 열 제목으로 보여 줍니다. 비어 있는 종류만 지울 수 있습니다 */
function KindList({ kinds, onChanged }) {
  const s = useCommonStyles();
  const toast = useUiStore((state) => state.toast);
  // 값 이름 → 사람이 보는 열 제목(여러 화면의 제목 중 처음 것)
  const titleOf = useMemo(() => {
    const m = {};
    SCREENS.forEach((x) => x.rows.forEach((r) => { if (!m[r.field]) m[r.field] = r.title.split(' · ')[0]; }));
    return m;
  }, []);

  return (
    <View style={{ gap: 8 }}>
      <Text style={s.cardTitle}>{`종류 ${kinds.length}개`}</Text>
      <Table
        minWidth={600}
        bordered
        rows={kinds}
        keyExtractor={(k) => k.key}
        columns={[
          { key: 'name', title: '종류', width: 160, render: (k) => <Text style={[s.textSm, { fontWeight: '600' }]}>{k.name}</Text> },
          {
            key: 'values',
            title: '가리는 값',
            minWidth: 300,
            flex: 2,
            render: (k) => {
              const shown = (k.attrs || []).map((a) => titleOf[a]).filter(Boolean);
              const rest = (k.attrs || []).length - shown.length;
              return (
                <Text style={s.textXs}>
                  {shown.length || rest
                    ? `${[...new Set(shown)].join(' · ')}${rest ? `${shown.length ? ' 외 ' : ''}화면 표에 없는 값 ${rest}개` : ''}`
                    : '아직 없음'}
                </Text>
              );
            },
          },
          {
            key: 'act',
            title: '',
            width: 90,
            align: 'center',
            render: (k) =>
              (k.attrs || []).length ? (
                <Badge>{`${k.attrs.length}개`}</Badge>
              ) : (
                <Button
                  label="삭제"
                  size="sm"
                  variant="ghost"
                  onPress={() =>
                    openConfirmModal({
                      title: '종류 삭제',
                      message: `「${k.name}」 종류를 삭제하시겠습니까? 가리는 값이 없는 종류입니다.`,
                      confirmLabel: '삭제',
                      danger: true,
                      onConfirm: async () => {
                        const res = await repo.removeDataField(k.key);
                        toast(res.message);
                        if (res.ok) onChanged();
                      },
                    })
                  }
                />
              ),
          },
        ]}
      />
    </View>
  );
}
