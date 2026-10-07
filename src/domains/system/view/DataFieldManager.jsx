/**
 * 「제거됨」 2026-10-07 — 데이터 접근 권한을 항목 단위로 바꾸며 화면에서 뺐습니다(DataPermView → ItemPermGrid).
 * 어디서도 import 하지 않습니다. 되살릴 수 있게 파일은 남겨 둡니다(AGENTS.md 「제거한 화면은 「제거됨」 으로 표시」).
 *
 * [View] SY-03 항목 관리 (데이터 접근 권한 화면의 모달)
 *
 * 관리자는 「불량 수량을 숨기고 싶다」 로 생각합니다. 그래서 **화면에 보이는 이름(항목)** 에 체크만 하게 합니다.
 * 한 항목이 여러 화면 · 여러 API 데이터 키에 걸쳐 있어도 체크 한 번으로 모든 화면에서 함께 가려집니다(model/dataItemModel).
 * 누가 볼지는 바깥 「부서별 데이터 접근 권한 관리」 표에서 그 항목이 든 줄(데이터 항목)에 부서마다 체크해 정합니다.
 *
 * 탭 (2026-10-07 개편 — 디자인 피드백 1~5차)
 *  · 항목(기본)     — 모든 항목을 한 표로. 체크 · 출력 화면 · 부서별 설정 현황, 머리글 필터 · 쪽 나누기
 *  · 화면별 보기     — 화면을 고르면 그 화면의 열을 항목 탭과 같은 체크로 보입니다. 체크는 항목 단위라
 *                     같은 항목이 보이는 다른 화면도 함께 가려지고, 그 목록을 다 보입니다. 두 탭은 저장 전 변경을 함께 씁니다
 *  · 묶음           — 바깥 표의 한 줄(데이터 항목)에 어떤 항목이 들어 있는지. 여러 항목을 한 줄에서 함께 정하고 싶을 때
 *                     [편집] 에서 항목을 넣고 뺍니다(예전 「가리기 종류」 탭 — 키 이름 대신 항목 이름으로 보입니다)
 *
 *  · 「종류」 를 고르는 칸은 없습니다. 체크한 항목은 이미 든 줄(기본 7종 등)을 따르고, 없으면 항목 이름으로 새 줄을 만듭니다
 *  · 화면마다 뜻이 다른 데이터 키(value · rate · total …)와 시스템 값은 체크할 수 없습니다
 *  · 저장은 한 번의 요청(`PUT /system/data-fields/mapping`)으로 전부 반영되거나 전부 되돌려집니다(DTP-02).
 *    서버 응답에는 다음 조회부터 적용됩니다. 다른 사용자의 화면에 「비공개」 가 나오기까지는 그 사용자가 화면을 다시 열어야 합니다
 *  · 시스템관리 화면은 대상이 아닙니다(DTP-01)
 * 상태와 동작은 useDataFieldManagerController 가 맡습니다 — 이 파일은 그리기만 합니다.
 */
import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Badge, Button, CardTabs, CheckRow, FormAlert, Loading, SelectField, Table, openConfirmModal, openFormModal } from '@shared/components/ui';
import { useCommonStyles } from '@shared/theme/styles';
import { useDataFieldManagerController, validateKind } from '../controller/useDataFieldManagerController';
import { attrNamesOf } from '../model/dataFieldModel';

/** 탭 값 */
const TAB_ITEMS = 'items';
const TAB_HIDE = 'hide';
const TAB_KINDS = 'kinds';
/** 표 칸 높이 — 행 높이가 흔들리지 않게 */
const CELL_H = 40;

export default function DataFieldManager({ onChanged, readOnly = false, onDirtyChange }) {
  const [tab, setTab] = useState(TAB_ITEMS);
  const c = useDataFieldManagerController({ readOnly, onChanged, onDirtyChange });

  if (c.loading) return <Loading />;

  const changedCnt = c.itemChanged.length;
  const saveButton = (
    <Button
      label={c.saving ? '저장하는 중…' : changedCnt ? `저장 (${changedCnt})` : '저장'}
      size="sm"
      variant="primary"
      icon="save"
      onPress={c.saveItems}
      disabled={c.saving || c.readOnly || !changedCnt}
    />
  );

  return (
    <View style={{ gap: 14 }}>
      {c.readOnly ? <FormAlert tone="info">읽기 전용 — 미배정 계정은 이 동작을 할 수 없습니다. 전산팀에 부서 배정을 요청하세요. 보기만 할 수 있습니다.</FormAlert> : null}

      <CardTabs
        id="field-manager"
        value={tab}
        onChange={setTab}
        items={[
          { value: TAB_ITEMS, label: '항목', icon: 'eyeOff', count: changedCnt || undefined },
          { value: TAB_HIDE, label: '화면별 보기', icon: 'grid' },
          { value: TAB_KINDS, label: '묶음', icon: 'layers', count: c.kinds.length },
        ]}
        // 항목 · 화면별 탭은 같은 저장 전 변경을 씁니다 — 저장 단추도 같습니다
        right={tab === TAB_KINDS ? null : saveButton}
      >
        {tab === TAB_ITEMS ? <ItemsPanel c={c} /> : null}
        {tab === TAB_HIDE ? <ScreenPanel c={c} /> : null}
        {tab === TAB_KINDS ? <GroupsPanel c={c} /> : null}
      </CardTabs>
    </View>
  );
}

/**
 * 부서별 설정 현황 — 체크 안 함 「—」, 가릴 수 없음, 저장 전 새 줄, 미적용, 못 보는 부서 목록(안내 문장 없이 값만)
 */
function permTextOf(c, it) {
  if (!it.selectable.length) return lockReasonText(it);
  if (!c.itemChecked(it)) return '—';
  const t = c.itemTarget(it);
  if (t.isNew) return '저장 후 부서 설정';
  if (!c.kindApplied(t.key)) return '미적용';
  return deptListText(c, t.key);
}

/**
 * 부서 목록 글자 — [부서 설정] 에서 **체크된(볼 수 있는) 부서만** 적고, 하나도 없으면 「미배정」(2026-10-07 7차).
 * 통합관리자(늘 봄) · 미배정 부서(늘 못 봄)는 설정 대상이 아니라 적지 않습니다.
 */
function deptListText(c, kindKey) {
  const depts = c.deptPermsOf(kindKey);
  if (!depts) return '';
  const allowed = depts.filter((d) => !d.locked && d.allowed).map((d) => d.name);
  return allowed.length ? allowed.join(' · ') : '미배정';
}

/**
 * 가릴 수 없는 이유를 함께 적습니다(2026-10-07 「가릴 수 없음 조건」 질문)
 *  · 공용 키 — 같은 키가 화면마다 다른 값을 담아(value · rate · result …) 가리면 다른 화면 값까지 지워짐(dataItemModel GENERIC_ATTRS)
 *  · 시스템 값 — 로그인 · 권한 판정 · 공통 응답 키라 서버가 등록을 막음(서버 reservedAttrs)
 */
function lockReasonText(it) {
  const reasons = [];
  if (it.keys.some((k) => k.lock === 'generic')) reasons.push('공용 키');
  if (it.keys.some((k) => k.lock === 'reserved')) reasons.push('시스템 값');
  return `가릴 수 없음 (${reasons.join(' · ') || '시스템 값'})`;
}

/** 체크한 항목의 부서를 바로 정할 수 있는지 — 저장 전 새 줄 · 미적용 · 읽기 전용이면 안 됩니다 */
function canEditDepts(c, it) {
  if (c.readOnly || !it.selectable.length || !c.itemChecked(it)) return false;
  const t = c.itemTarget(it);
  return !t.isNew && c.kindApplied(t.key) && !!c.deptPermsOf(t.key);
}

/**
 * 부서 설정 창 — 항목(또는 묶음)을 볼 수 있는 부서를 체크합니다(2026-10-07 6차 「항목별로 부서를 설정」).
 * 권한은 묶음 단위라 같은 묶음의 다른 항목에도 함께 적용됩니다 — 그 항목들을 창 위에 알립니다.
 */
function openDeptEditor(c, { kindKey, title }) {
  const depts = c.deptPermsOf(kindKey) || [];
  const together = c.items.filter((x) => x.selectable.some((a) => c.ownerOf[a] === kindKey)).map((x) => x.name);
  const others = together.filter((n) => n !== title);
  openFormModal({
    title: `부서 설정 — ${title}`,
    sub: others.length
      ? `「${c.kindName(kindKey)}」 묶음에 함께 든 ${others.length}개 항목(${others.slice(0, 6).join(' · ')}${others.length > 6 ? ' …' : ''})에도 같이 적용됩니다.`
      : '체크한 부서만 이 항목을 봅니다.',
    fields: [{
      key: 'depts', label: '볼 수 있는 부서', type: 'custom', full: true,
      render: ({ value, onChange }) => <DeptChecks depts={depts} value={value} onChange={onChange} />,
    }],
    initial: { depts: Object.fromEntries(depts.map((d) => [String(d.id), d.allowed])) },
    submitLabel: '저장',
    onSubmit: (v) => c.saveKindDepts(kindKey, v.depts || {}),
  });
}

/** 부서 체크 목록 — 통합관리자 · 미배정은 고정(바깥 표와 같은 규칙) */
function DeptChecks({ depts, value = {}, onChange }) {
  const s = useCommonStyles();
  return (
    <View nativeID="dept-perm-editor" style={{ gap: 8 }}>
      {depts.map((d) => {
        const checked = !!value[String(d.id)];
        const fixed = d.locked === 'SUPER_ADMIN' ? '전 권한 · 고정' : d.locked === 'UNASSIGNED' ? '항상 못 봄 · 고정' : '';
        return (
          <View key={d.id} role="checkbox" aria-label={`${d.name} 열람`} aria-checked={checked} aria-disabled={fixed ? true : undefined} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {fixed
              ? <View style={{ opacity: 0.4, pointerEvents: 'none' }}><CheckRow checked={checked} onToggle={() => {}} label={d.name} /></View>
              : <CheckRow checked={checked} onToggle={() => onChange({ ...value, [String(d.id)]: !checked })} label={d.name} />}
            {fixed ? <Text style={s.textXs}>{fixed}</Text> : null}
          </View>
        );
      })}
    </View>
  );
}

/** 부서별 설정 현황 칸 — 못 보는 부서 목록과 [부서 설정] */
function PermCell({ c, it }) {
  const s = useCommonStyles();
  const text = it.permText ?? permTextOf(c, it);
  const editable = canEditDepts(c, it);
  return (
    <Cell>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%' }}>
        <Text style={[text === '—' ? s.textXs : s.textSm, { flex: 1 }]}>{text || ' '}</Text>
        {editable ? (
          <Button label="부서 설정" size="sm" variant="ghost" onPress={() => openDeptEditor(c, { kindKey: c.itemTarget(it).key, title: it.name })} />
        ) : null}
      </View>
    </Cell>
  );
}

/** 항목 체크 칸 — 항목 · 화면별 탭이 같이 씁니다. label 은 화면 읽기 · 시험이 찾는 이름 */
function ItemCheck({ c, it, label }) {
  const lock = c.itemLock(it);
  const checked = c.itemChecked(it);
  return (
    <Cell center>
      <View role="checkbox" aria-label={`${label || it.name} 가리기`} aria-checked={checked} aria-disabled={lock ? true : undefined} aria-description={lock || undefined}>
        {lock
          ? <View style={{ opacity: 0.4, pointerEvents: 'none' }}><CheckRow checked={checked} onToggle={() => {}} /></View>
          : <CheckRow checked={checked} onToggle={() => c.toggleItem(it)} />}
      </View>
    </Cell>
  );
}

/** 저장 전 변경 · 저장 실패 안내 — 항목 · 화면별 탭 아래 */
function PendingNote({ c }) {
  const changed = c.itemChanged;
  return (
    <>
      {c.saveError ? <FormAlert>{`저장하지 못했습니다 — ${c.saveError} (고른 내용은 그대로 남아 있습니다)`}</FormAlert> : null}
      {changed.length ? (
        <View nativeID="field-manager-items-pending">
          <FormAlert tone="info">{`저장하지 않은 변경 ${changed.length}개 — ${changed.map((it) => `${it.name} ${c.itemChecked(it) ? '가림' : '가리지 않음'}`).join(' · ')}. 오른쪽 위 [저장] 을 누르면 반영됩니다.`}</FormAlert>
        </View>
      ) : null}
    </>
  );
}

/** 항목 탭 「가리기」 머리글 필터 선택지 */
const ITEM_STATES = ['가림', '안 가림', '일부 화면만 가려짐', '가릴 수 없음'];

/**
 * 「항목」 탭 — 화면에 보이는 이름으로 가릴 항목을 고릅니다(2026-10-07)
 * 한 항목을 체크하면 그 이름에 묶인 API 데이터 키(여러 화면 · 여러 키)가 모두 같은 데이터 항목으로 들어갑니다.
 * 4차 피드백(같은 날): 검색 · 보기 선택을 표 머리글 필터로, 쪽 나누기(10 · 25 · 50(기본) · 100),
 * 「출력 화면」 은 화면 이름만, 「부서별 설정 현황」 은 못 보는 부서 목록이나 꼭 필요한 안내만.
 */
function ItemsPanel({ c }) {
  const s = useCommonStyles();
  const stateOf = c.itemStateOf;

  const counts = useMemo(() => {
    const n = { partial: 0, hidden: 0, none: 0, locked: 0 };
    c.items.forEach((it) => {
      const st = stateOf(it).state;
      if (st === 'partial') n.partial += 1;
      else if (st === 'all') n.hidden += 1;
      else if (st === 'locked') n.locked += 1;
      else n.none += 1;
    });
    return n;
  }, [c.items, stateOf]);

  const permText = (it) => permTextOf(c, it);
  const stateText = (it) => {
    const st = stateOf(it).state;
    if (st === 'locked') return '가릴 수 없음';
    if (st === 'partial' && !c.itemChecked(it)) return '일부 화면만 가려짐';
    return c.itemChecked(it) ? '가림' : '안 가림';
  };

  // 머리글 필터가 읽는 글자를 행에 붙입니다(렌더 칸은 값이 없어 filterField 로 거릅니다)
  const rows = useMemo(() => c.items.map((it) => ({
    ...it,
    searchText: [it.name, ...it.titles, ...it.keys.map((k) => k.attr)].join(' '),
    screensText: it.screens.join(' '),
    stateText: stateText(it),
    permText: permText(it),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  })), [c.items, c.itemChecked, c.itemTarget, c.deptPermsOf, c.kindApplied, stateOf]);


  return (
    <View nativeID="field-manager-items" style={{ gap: 14 }}>
      <ItemsHowTo />
      <Text style={s.textSm}>
        {`항목 ${c.items.length}개 — 가리는 항목 ${counts.hidden}개 · 일부 화면만 가려진 항목 ${counts.partial}개 · 가리지 않음 ${counts.none}개 · 가릴 수 없음 ${counts.locked}개`}
      </Text>
      {counts.partial ? (
        <FormAlert tone="info">{`일부 화면에서만 가려진 항목이 ${counts.partial}개 있습니다. 같은 항목이 화면에 따라 가려지기도 하고 보이기도 합니다. 체크하고 저장하면 그 항목이 모든 화면에서 가려집니다.`}</FormAlert>
      ) : null}

      <Table
        minWidth={760}
        bordered
        filterable
        pageSize={50}
        rows={rows}
        keyExtractor={(it) => it.id}
        emptyText="조건에 맞는 항목이 없습니다."
        columns={[
          {
            key: 'name', title: '항목', minWidth: 170, flex: 1, filterable: true, filterField: 'searchText',
            render: (it) => (
              <Cell>
                <Text style={[s.textSm, { fontWeight: '600' }]}>{it.name}</Text>
                {it.titles.length ? <Text style={s.textXs}>{`다른 이름: ${it.titles.join(' · ')}`}</Text> : null}
                {/* 「지금 상태」 열은 뺐습니다 — 가림 · 보임은 체크로, 일부만 가려진 것만 여기 표시합니다 */}
                {stateOf(it).state === 'partial' ? <View style={{ marginTop: 4 }}><Badge tone="amber">일부 화면만 가려짐</Badge></View> : null}
              </Cell>
            ),
          },
          {
            // 화면 이름만 줄마다(2026-10-07 4차 — 「—」 뒤 열 이름 · 키는 뺌)
            key: 'screens', title: '출력 화면', minWidth: 260, flex: 1.6, sortable: false, filterable: true, filterField: 'screensText',
            render: (it) => (
              <Cell>
                {it.screens.length
                  ? it.screens.map((name) => <Text key={name} style={s.textXs}>{name}</Text>)
                  : <Text style={s.textXs}>화면 표에 없음 (서버 응답에만 있음)</Text>}
              </Cell>
            ),
          },
          {
            key: 'hide', title: '가리기', width: 150, align: 'center', sortable: false,
            filterable: true, filter: 'list', filterField: 'stateText', filterOptions: ITEM_STATES, filterFixed: true,
            render: (it) => <ItemCheck c={c} it={it} />,
          },
          {
            // 못 보는 부서 목록 또는 꼭 필요한 안내만(부가 설명 없음, 4차)
            key: 'perm', title: '부서별 설정 현황', minWidth: 220, flex: 1.2, sortable: false, filterable: true, filterField: 'permText',
            render: (it) => <PermCell c={c} it={it} />,
          },
        ]}
      />

      <PendingNote c={c} />
    </View>
  );
}

/** 항목 탭 사용 순서 */
function ItemsHowTo() {
  const s = useCommonStyles();
  const steps = [
    ['①', '가릴 항목에 체크합니다', '화면에 보이는 이름입니다. 한 항목이 여러 화면에 걸쳐 있어도 모든 화면에서 함께 가려집니다.'],
    ['②', '[저장] 을 누릅니다', '체크한 항목은 이 창 밖 「부서별 데이터 접근 권한 관리」 표의 데이터 항목이 됩니다.'],
    ['③', '[부서 설정] 으로 볼 부서를 정합니다', '「부서별 설정 현황」 칸의 단추입니다. 칸에는 볼 수 있게 설정한 부서가 나오고, 한 곳도 없으면 「미배정」 입니다. 새로 추가된 항목은 모든 부서가 보는 상태로 시작합니다.'],
  ];
  return (
    <View nativeID="field-manager-items-howto" style={{ gap: 4 }}>
      {steps.map(([n, title, sub]) => (
        <Text key={n} style={s.textSm}>
          <Text style={{ fontWeight: '700' }}>{`${n} ${title}`}</Text>
          {`  ${sub}`}
        </Text>
      ))}
      <Text style={s.textXs}>value · rate · total 처럼 화면마다 뜻이 다른 키는 한 화면만 골라 가릴 수 없어 지금은 체크할 수 없습니다. 여러 항목을 바깥 표의 한 줄에서 함께 정하려면 「묶음」 탭을 쓰세요.</Text>
    </View>
  );
}

/**
 * 「화면별 보기」 탭 — 화면을 고르면 그 화면의 열을 항목 탭과 같은 체크로 보입니다(2026-10-07 5차 피드백)
 *  · 「③ 종류」 열 없음, 머리글 번호 없음, 「가려지는 다른 화면 목록」 은 「외 n곳」 없이 모두
 *  · 체크는 항목 단위입니다 — 이 화면에서 체크해도 같은 항목이 보이는 다른 화면에서 함께 가려집니다
 */
function ScreenPanel({ c }) {
  const s = useCommonStyles();
  const screen = c.screen;
  // 열 → 항목 (이 화면 · 이 키가 든 항목)
  const itemOf = useMemo(() => {
    const m = new Map();
    c.items.forEach((it) => it.places.forEach((p) => { if (screen && p.screen === screen.name) m.set(p.attr, it); }));
    return m;
  }, [c.items, screen]);
  const rows = useMemo(() => (screen ? screen.rows.map((r) => ({ ...r, item: itemOf.get(r.field) || null })) : []), [screen, itemOf]);
  const hiddenCnt = rows.filter((r) => r.item && c.itemChecked(r.item)).length;

  return (
    <View style={{ gap: 14 }}>
      <View nativeID="field-manager-howto" style={{ gap: 4 }}>
        <Text style={s.textSm}><Text style={{ fontWeight: '700' }}>화면을 고르면</Text>  그 화면 표에 보이는 항목이 나옵니다. 지금 무엇이 가려지는지 화면 단위로 확인하는 곳입니다.</Text>
        <Text style={s.textSm}><Text style={{ fontWeight: '700' }}>체크하면</Text>  그 항목이 이 화면과 「가려지는 다른 화면 목록」 의 화면에서 함께 가려집니다. 「항목」 탭과 같은 체크입니다.</Text>
      </View>

      <SelectField
        nativeSelect
        label="화면"
        value={c.screenId}
        options={c.screens.map((x) => ({ value: x.id, label: `${x.group} › ${x.name}` }))}
        onChange={c.setScreenId}
      />

      {screen ? (
        <>
          <Text style={s.textSm}>{`이 화면의 ${rows.length}개 항목 중, ${hiddenCnt}개를 가리고 있습니다.`}</Text>
          <Table
            minWidth={720}
            bordered
            rows={rows}
            keyExtractor={(r) => r.field}
            emptyText="이 화면에는 가릴 수 있는 표 열이 없습니다."
            columns={[
              { key: 'title', title: '항목', minWidth: 180, flex: 1, render: (r) => <Cell><Text style={s.textSm}>{r.title}</Text></Cell> },
              {
                key: 'hide', title: '가리기', width: 90, align: 'center', sortable: false,
                render: (r) => (r.item ? <ItemCheck c={c} it={r.item} label={r.title} /> : <Cell center><Text style={s.textXs}>—</Text></Cell>),
              },
              {
                key: 'also', title: '가려지는 다른 화면 목록', minWidth: 240, flex: 1.4, sortable: false,
                render: (r) => {
                  const list = (r.item?.screens || []).filter((n) => n !== screen.name);
                  return <Cell>{list.length ? list.map((n) => <Text key={n} style={s.textXs}>{n}</Text>) : <Text style={s.textXs}>—</Text>}</Cell>;
                },
              },
              {
                key: 'perm', title: '부서별 설정 현황', minWidth: 220, flex: 1.2, sortable: false,
                render: (r) => (r.item ? <PermCell c={c} it={r.item} /> : <Cell><Text style={s.textSm}>가릴 수 없음</Text></Cell>),
              },
            ]}
          />
        </>
      ) : null}

      <PendingNote c={c} />
    </View>
  );
}

/**
 * 「묶음」 탭 — 바깥 표의 한 줄(데이터 항목)에 든 항목들(2026-10-07 5차 「가리기 종류 탭이 의미가 있는지」 피드백으로 개편)
 *  · 묶음 = 바깥 표의 한 줄. 그 줄에서 부서 체크를 한 번 하면 묶음에 든 항목이 함께 정해집니다
 *  · 키 이름 대신 항목 이름으로 보이고, [편집] 에서 항목을 넣고 뺍니다. 빈 묶음만 [삭제]
 */
function GroupsPanel({ c }) {
  const s = useCommonStyles();
  const groups = useMemo(() => c.kinds.map((k) => ({ ...k, members: itemsOfKind(c, k.key) })), [c]);

  const editGroup = (k) =>
    openFormModal({
      title: `묶음 편집 — ${k.name}`,
      sub: '이름을 바꾸면 바깥 표의 데이터 항목 이름이 함께 바뀝니다.',
      wide: true,
      fields: [
        { key: 'name', label: '묶음 이름', required: true, full: true, placeholder: '예) 단가·금액' },
        { key: 'desc', label: '설명', type: 'textarea', full: true, placeholder: '이 묶음에 무엇이 드는지 (300자 이내)' },
        {
          key: 'members', label: '든 항목', type: 'custom', full: true,
          render: ({ value, onChange }) => <GroupMembersEditor c={c} kind={k} value={value} onChange={onChange} />,
        },
      ],
      initial: { name: k.name || '', desc: k.desc || '', members: itemsOfKind(c, k.key).map((it) => it.id) },
      validate: validateKind,
      submitLabel: '저장',
      onSubmit: (v) => {
        // 항목 → API 데이터 키로 풀어 기존 종류 저장(saveKind)에 넘깁니다. 항목에 묶이지 않은 키(서버 시드 등)는 그대로 둡니다
        const ids = new Set(v.members || []);
        const inItems = new Set(c.items.flatMap((it) => it.selectable));
        const keep = attrNamesOf(k).filter((a) => !inItems.has(a));
        const take = c.items.filter((it) => ids.has(it.id)).flatMap((it) => it.selectable.map((a) => ({ attrName: a, remark: `항목 · ${it.name}` })));
        const values = [...keep.map((a) => ({ attrName: a })), ...take.filter((x, i, arr) => arr.findIndex((y) => y.attrName === x.attrName) === i)];
        return c.saveKind(k, { name: v.name, desc: v.desc, values });
      },
    });

  return (
    <View style={{ gap: 10 }}>
      <View nativeID="field-manager-kinds-guide" style={{ gap: 4 }}>
        <Text style={s.textSm}><Text style={{ fontWeight: '700' }}>묶음이란</Text>  바깥 「부서별 데이터 접근 권한 관리」 표의 한 줄(데이터 항목)입니다. 그 줄에서 부서를 한 번 체크하면 묶음에 든 항목이 모두 함께 정해집니다.</Text>
        <Text style={s.textSm}><Text style={{ fontWeight: '700' }}>언제 쓰나</Text>  여러 항목을 한 줄에서 함께 정하고 싶을 때 [편집] 에서 항목을 넣습니다. 따로 정하려면 쓰지 않아도 됩니다 — 「항목」 탭에서 체크하면 항목마다 줄이 생깁니다.</Text>
      </View>
      <Table
        minWidth={760}
        bordered
        rows={groups}
        keyExtractor={(k) => k.key}
        columns={[
          { key: 'name', title: '묶음', width: 190, render: (k) => <Cell><Text style={[s.textSm, { fontWeight: '600' }]}>{`${k.name}${k.applyFlg === 'N' ? ' (미적용)' : ''}`}</Text></Cell> },
          {
            key: 'members', title: '든 항목', minWidth: 280, flex: 2, sortable: false,
            render: (k) => <Cell><Text style={s.textXs}>{k.members.length ? k.members.map((it) => it.name).join(' · ') : '없음'}</Text></Cell>,
          },
          {
            key: 'hidden', title: '부서별 설정 현황', minWidth: 200, flex: 1.2, sortable: false,
            render: (k) => (
              <Cell>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%' }}>
                  <Text style={[s.textSm, { flex: 1 }]}>{k.applyFlg === 'N' ? '미적용' : deptListText(c, k.key) || ' '}</Text>
                  {!c.readOnly && k.applyFlg !== 'N' && c.deptPermsOf(k.key) ? (
                    <Button label="부서 설정" size="sm" variant="ghost" onPress={() => openDeptEditor(c, { kindKey: k.key, title: k.name })} />
                  ) : null}
                </View>
              </Cell>
            ),
          },
          {
            key: 'act', title: '관리', width: 150, align: 'center', sortable: false,
            render: (k) => (
              <View style={{ flexDirection: 'row', gap: 4, justifyContent: 'center' }}>
                <Button label={c.readOnly ? '보기' : '편집'} size="sm" variant="ghost" onPress={() => editGroup(k)} />
                {!(k.attrs || []).length ? (
                  <Button
                    label="삭제" size="sm" variant="ghost" disabled={c.readOnly}
                    onPress={() => openConfirmModal({
                      title: '묶음 삭제',
                      message: `「${k.name}」 묶음을 삭제하시겠습니까? 든 항목이 없는 묶음입니다.`,
                      confirmLabel: '삭제',
                      danger: true,
                      onConfirm: () => c.removeKind(k),
                    })}
                  />
                ) : null}
              </View>
            ),
          },
        ]}
      />
    </View>
  );
}

/** 이 종류(묶음)에 키가 하나라도 든 항목 */
function itemsOfKind(c, kindKey) {
  return c.items.filter((it) => it.selectable.some((a) => c.ownerOf[a] === kindKey));
}

/** 묶음 편집의 「든 항목」 — 항목 이름으로 넣고 뺍니다. value 는 항목 id 배열 */
function GroupMembersEditor({ c, kind, value = [], onChange }) {
  const s = useCommonStyles();
  const [pick, setPick] = useState('');
  const inList = new Set(value);
  const before = new Set(itemsOfKind(c, kind.key).map((it) => it.id));
  const byId = new Map(c.items.map((it) => [it.id, it]));
  const ownerName = (it) => {
    const k = it.selectable.map((a) => c.ownerOf[a]).find((x) => x && x !== kind.key);
    return k ? ` — 지금 「${c.kindName(k)}」` : '';
  };
  const options = [
    { value: '', label: '항목 골라 넣기…' },
    ...c.items.filter((it) => it.selectable.length && !inList.has(it.id)).map((it) => ({ value: it.id, label: `${it.name}${ownerName(it)}` })),
  ];
  const rows = [
    ...value.map((id) => byId.get(id)).filter(Boolean).map((it) => ({ it, removed: false })),
    ...[...before].filter((id) => !inList.has(id)).map((id) => ({ it: byId.get(id), removed: true })).filter((r) => r.it),
  ];
  return (
    <View nativeID="kind-values-editor" style={{ gap: 10 }}>
      {!c.readOnly ? <SelectField nativeSelect label="항목 넣기" value={pick} options={options} onChange={(v) => { if (v) onChange([...value, v]); setPick(''); }} /> : null}
      <Table
        minWidth={520}
        bordered
        rows={rows}
        keyExtractor={(r) => r.it.id}
        emptyText="든 항목이 없습니다."
        columns={[
          { key: 'name', title: '항목', minWidth: 160, flex: 1, render: (r) => <Text style={[s.textSm, { fontWeight: '600' }, r.removed && { textDecorationLine: 'line-through', opacity: 0.6 }]}>{r.it.name}</Text> },
          { key: 'screens', title: '출력 화면', minWidth: 200, flex: 1.4, sortable: false, render: (r) => <View>{r.it.screens.length ? r.it.screens.map((n) => <Text key={n} style={s.textXs}>{n}</Text>) : <Text style={s.textXs}>화면 표에 없음</Text>}</View> },
          ...(!c.readOnly ? [{
            key: 'act', title: '관리', width: 100, align: 'center', sortable: false,
            render: (r) => (r.removed
              ? <Button label="되살리기" size="sm" variant="ghost" onPress={() => onChange([...value, r.it.id])} />
              : <Button label="빼기" size="sm" variant="ghost" onPress={() => onChange(value.filter((x) => x !== r.it.id))} />),
          }] : []),
        ]}
      />
    </View>
  );
}

/** 표 칸 — 높이를 고정해 내용이 바뀌어도 행 높이가 흔들리지 않게 합니다 */
function Cell({ children, center }) {
  return <View style={{ minHeight: CELL_H, justifyContent: 'center', alignItems: center ? 'center' : 'flex-start', width: '100%' }}>{children}</View>;
}
