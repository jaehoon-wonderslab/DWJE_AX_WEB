/**
 * 제품 선택 팝업 (DB-02-F01)
 *
 * 제품이 205종이라 목록 대신 검색으로 고릅니다.
 * 제품군·프로젝트로 좁히고 여러 개를 선택할 수 있습니다.
 *
 * ■ 목록은 Tabulator 가 맡습니다 (2026-09-07)
 * 예전에는 손으로 만든 표에 '정렬' 셀렉트와 '검색 결과 N종 모두 선택' · '검색 결과 해제' ·
 * '선택한 것만' 버튼이 붙어 있었습니다. 표가 이미 할 수 있는 일을 버튼으로 흉내 낸 것이라
 * 정렬은 한 열만 되고, 선택은 어느 행이 골라졌는지 표에서 안 보였습니다.
 *   · 정렬 — 머리글을 누릅니다. shift 를 누른 채 다른 머리글을 누르면 조건이 쌓입니다
 *   · 모두 선택 — 머리글의 선택 칸을 누르면 지금 보이는 행이 전부 골라집니다
 *
 * ■ 고객사는 뺐습니다
 * 205종 전부 `customer` 가 null 입니다(`customerCd` 도 마찬가지). 빈 칸만 나오는
 * 필터와 열이었습니다. 마스터에 값이 들어오면 그때 되살립니다.
 *
 * 사용 예) openProductPicker({ selected, onApply })
 */
import React, { useCallback, useMemo, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useAppStore } from '@shared/stores/useAppStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { useAsync } from '@shared/hooks/useAsync';
import { loadProductOptions } from '../model/dashboardRepository';
import Button from '@shared/components/ui/Button';
import { SelectField, TextField } from '@shared/components/ui/Field';
import { Loading } from '@shared/components/ui/Feedback';
import Icon from '@shared/components/ui/Icon';
import TabulatorGrid from '@shared/components/ui/TabulatorGrid';

/** html 삽입 전 이스케이프 — 제품명에 &, < 가 들어옵니다 */
const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** 값이 없으면 옅은 '—' — 빈 칸으로 두면 자리가 밀려 어느 열인지 헷갈립니다 */
const dash = (v) => (v === null || v === undefined || v === '' ? '<span class="muted">—</span>' : esc(v));

/** 'YYYY-MM-DD HH:MI:SS' 로 와도 날짜만 씁니다 */
const day = (v) => (v ? String(v).slice(0, 10) : null);

/**
 * 열 — 내용 길이에 맞춰 폭을 줍니다
 *
 * 제품명이 가장 길어 남는 폭을 그쪽에 몰아 줍니다(`widthGrow`).
 * 나머지는 글자 수가 정해져 있어 고정 폭이 낫습니다 — 늘어나 봐야 빈 칸만 생깁니다.
 */
const COLUMNS = [
  { title: '순위', field: 'rank', width: 64, hozAlign: 'center', headerHozAlign: 'center', sorter: 'number' },
  { title: '제품 코드', field: 'code', width: 128, formatter: 'html', sorter: 'string' },
  { title: '제품명', field: 'name', widthGrow: 3, minWidth: 200, formatter: 'html', sorter: 'string' },
  { title: '제품군', field: 'family', width: 140, formatter: 'html', sorter: 'string' },
  { title: '프로젝트', field: 'project', width: 140, formatter: 'html', sorter: 'string' },
  { title: '등록일', field: 'createdAt', width: 112, formatter: 'html', sorter: 'string' },
  { title: '수정일', field: 'updatedAt', width: 112, formatter: 'html', sorter: 'string' },
];

/** 첫 정렬 — 이후에는 사용자가 머리글로 바꿉니다 */
const INITIAL_SORT = [{ column: 'rank', dir: 'asc' }];

function PickerBody({ initial, onChange }) {
  const s = useCommonStyles();
  const theme = useTheme();

  const [keyword, setKeyword] = useState('');
  const [family, setFamily] = useState('전체');
  const [project, setProject] = useState('전체');
  const [picked, setPicked] = useState(initial || []);

  // 전체 제품 목록을 한 번 받아 화면에서 걸러 냅니다 (205종 규모)
  const { data, loading } = useAsync(() => loadProductOptions('rank'), []);
  const products = data?.products || [];

  const families = useMemo(() => ['전체', ...new Set(products.map((p) => p.family).filter(Boolean))], [products]);
  const projects = useMemo(() => ['전체', ...new Set(products.map((p) => p.project).filter(Boolean))], [products]);

  /** 검색·필터에 걸린 것만 — 정렬은 표가 합니다 */
  const rows = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return products
      .filter((p) => {
        if (family !== '전체' && p.family !== family) return false;
        if (project !== '전체' && p.project !== project) return false;
        if (!q) return true;
        return [p.code, p.name, p.family, p.project].some((v) => String(v ?? '').toLowerCase().includes(q));
      })
      .map((p) => ({
        code: p.code,
        rank: p.rank,
        name: dash(p.name),
        family: dash(p.family),
        project: dash(p.project),
        createdAt: dash(day(p.createdAt ?? p.regDt ?? p.createDt)),
        updatedAt: dash(day(p.updatedAt ?? p.modDt ?? p.updateDt)),
      }));
  }, [products, keyword, family, project]);

  const apply = useCallback((next) => {
    setPicked(next);
    onChange(next);
  }, [onChange]);

  /**
   * 표에서 고른 것을 받습니다
   *
   * 표에는 **지금 걸러진 행만** 있습니다. 검색으로 가려진 제품까지 지우면
   * 조건을 바꿀 때마다 앞서 고른 것이 사라집니다 — 보이지 않는 선택은 그대로 둡니다.
   */
  const onSelectedChange = useCallback((visibleCodes) => {
    const shown = new Set(rows.map((r) => r.code));
    const hidden = picked.filter((c) => !shown.has(c));
    apply([...new Set([...hidden, ...visibleCodes])]);
  }, [rows, picked, apply]);

  const removeChip = (code) => apply(picked.filter((x) => x !== code));
  const applyPreset = (n) => apply(products.filter((p) => p.rank <= n).map((p) => p.code));

  if (loading) return <Loading text="제품 목록을 불러오는 중입니다…" />;

  return (
    <View>
      {/*
        검색·필터가 목록 위에 뜹니다 — 셀렉트를 펼치면 표를 덮어야 하므로 쌓임 순서를 올립니다.
        예전에는 순서가 없어 펼친 목록이 표 아래로 파고들어 글자가 겹쳐 보였습니다.
      */}
      <View style={{ zIndex: 30 }}>
        <TextField label="검색" value={keyword} onChangeText={setKeyword} placeholder="제품 코드 · 제품명 · 제품군 · 프로젝트" full />

        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          <SelectField label="제품군" value={family} options={families} onChange={setFamily} style={{ flexGrow: 1, flexBasis: 220 }} full />
          <SelectField label="프로젝트" value={project} options={projects} onChange={setProject} style={{ flexGrow: 1, flexBasis: 220 }} full />
        </View>

        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 12, alignItems: 'center' }}>
          {[5, 10, 20].map((n) => (
            <Button key={n} label={`Top ${n}`} size="sm" onPress={() => applyPreset(n)} />
          ))}
          <View style={s.spacer} />
          <Text style={s.textXs}>{`선택 ${picked.length}종 / 검색 ${rows.length}종 / 전체 ${products.length}종`}</Text>
        </View>

        {/* 고른 것 — 칩을 누르면 빠집니다 */}
        {picked.length ? (
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 5,
              maxHeight: 82,
              padding: 9,
              marginTop: 12,
              borderWidth: 1,
              borderColor: theme.color.border,
              borderRadius: theme.metrics.radius,
              backgroundColor: theme.color.secondary,
            }}
          >
            {picked.map((code) => (
              <TouchableOpacity
                key={code}
                onPress={() => removeChip(code)}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  paddingVertical: 2,
                  paddingLeft: 9,
                  paddingRight: 4,
                  borderRadius: 99,
                  backgroundColor: theme.color.card,
                  borderWidth: 1,
                  borderColor: theme.color.border,
                }}
              >
                <Text style={[s.mono, { fontSize: 11.5, fontWeight: '600' }]}>{code}</Text>
                <Icon name="close" size={10} color={theme.color.mutedForeground} />
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </View>

      {/* 목록 — 선택·정렬은 표가 스스로 합니다 */}
      <View style={{ marginTop: 12, zIndex: 0 }}>
        <TabulatorGrid
          columns={COLUMNS}
          rows={rows}
          height={340}
          selectable
          rowKey="code"
          selected={picked}
          onSelectedChange={onSelectedChange}
          initialSort={INITIAL_SORT}
          emptyText="검색 조건에 맞는 제품이 없습니다."
        />
        <Text style={[s.textXs, { marginTop: 6 }]}>
          머리글 왼쪽 칸을 누르면 검색된 제품이 모두 선택됩니다. 머리글을 누르면 정렬되고,
          shift 를 누른 채 다른 머리글을 누르면 조건이 쌓입니다.
        </Text>
      </View>
    </View>
  );
}

/**
 * 제품 선택 팝업을 엽니다.
 *
 * @param {object} config { selected: string[], onApply: (codes) => void }
 */
export function openProductPicker({ selected = [], onApply }) {
  let current = selected;
  const ui = useUiStore.getState();
  ui.openModal({
    title: '제품 검색 · 선택',
    sub: '제품군 · 프로젝트로 좁혀 여러 제품을 고를 수 있습니다',
    wide: true,
    // 열이 일곱이라 900 으로는 제품명이 눌립니다
    maxWidth: 1180,
    render: () => <PickerBody initial={selected} onChange={(next) => { current = next; }} />,
    footer: (close) => (
      <>
        <Button label="취소" onPress={close} />
        <Button
          label="적용"
          variant="primary"
          onPress={() => {
            if (!current.length) {
              ui.toast('제품을 1개 이상 선택하세요');
              return;
            }
            useAppStore.getState().pushRecentModels(current.slice(0, 6));
            onApply?.(current);
            close();
          }}
        />
      </>
    ),
  });
}
