/**
 * 제품 선택 팝업 (DB-02-F01)
 *
 * 제품이 113종이라 목록 대신 검색으로 고릅니다.
 * 제품군·고객사·프로젝트로 좁히고, 실적을 보며 여러 개를 선택할 수 있습니다.
 *
 * 사용 예) openProductPicker({ selected, onApply })
 */
import React, { useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useAppStore } from '@shared/stores/useAppStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { useAsync } from '@shared/hooks/useAsync';
import { loadProductOptions } from '../model/dashboardRepository';
import Button from '@shared/components/ui/Button';
import { SelectField, TextField } from '@shared/components/ui/Field';
import { EmptyState, Loading } from '@shared/components/ui/Feedback';
import Icon from '@shared/components/ui/Icon';

const SORTS = [
  { value: 'rank', label: '매출 순위' },
  { value: 'name', label: '제품 코드' },
  { value: 'family', label: '제품군' },
];

function PickerBody({ initial, onChange }) {
  const s = useCommonStyles();
  const theme = useTheme();

  const [keyword, setKeyword] = useState('');
  const [family, setFamily] = useState('전체');
  const [customer, setCustomer] = useState('전체');
  const [project, setProject] = useState('전체');
  const [sort, setSort] = useState('rank');
  const [onlySelected, setOnlySelected] = useState(false);
  const [picked, setPicked] = useState(initial || []);

  // 전체 제품 목록을 한 번 받아 클라이언트에서 검색합니다 (113종 규모)
  const { data, loading } = useAsync(() => loadProductOptions(sort), [sort]);

  const products = data?.products || [];

  const families = useMemo(() => ['전체', ...new Set(products.map((p) => p.family).filter(Boolean))], [products]);
  const customers = useMemo(() => ['전체', ...new Set(products.map((p) => p.customer).filter(Boolean))], [products]);
  const projects = useMemo(() => ['전체', ...new Set(products.map((p) => p.project).filter(Boolean))], [products]);

  const rows = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    let list = products.filter((p) => {
      if (family !== '전체' && p.family !== family) return false;
      if (customer !== '전체' && p.customer !== customer) return false;
      if (project !== '전체' && p.project !== project) return false;
      if (onlySelected && !picked.includes(p.code)) return false;
      if (!q) return true;
      return (
        p.code.toLowerCase().includes(q) ||
        String(p.family).toLowerCase().includes(q) ||
        String(p.customer).toLowerCase().includes(q) ||
        String(p.project).toLowerCase().includes(q)
      );
    });
    if (sort === 'name') list = [...list].sort((a, b) => a.code.localeCompare(b.code));
    else if (sort === 'family') list = [...list].sort((a, b) => a.family.localeCompare(b.family) || a.seq - b.seq);
    else list = [...list].sort((a, b) => a.rank - b.rank);
    return list;
  }, [products, keyword, family, customer, project, sort, onlySelected, picked]);

  const toggle = (code) => {
    const next = picked.includes(code) ? picked.filter((x) => x !== code) : [...picked, code];
    setPicked(next);
    onChange(next);
  };

  const applyPreset = (n) => {
    const next = products.filter((p) => p.rank <= n).map((p) => p.code);
    setPicked(next);
    onChange(next);
  };

  const setAllFiltered = (on) => {
    const codes = rows.map((r) => r.code);
    const next = on ? [...new Set([...picked, ...codes])] : picked.filter((c) => !codes.includes(c));
    setPicked(next);
    onChange(next);
  };

  if (loading) return <Loading text="제품 목록을 불러오는 중입니다…" />;

  return (
    <View>
      {/* 검색 */}
      <TextField label="검색" value={keyword} onChangeText={setKeyword} placeholder="제품 코드 · 제품군 · 고객사 · 프로젝트" full />

      {/* 필터 */}
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
        <SelectField label="제품군" value={family} options={families} onChange={setFamily} style={{ flexGrow: 1, flexBasis: 180 }} full />
        <SelectField label="고객사" value={customer} options={customers} onChange={setCustomer} style={{ flexGrow: 1, flexBasis: 180 }} full />
        <SelectField label="프로젝트" value={project} options={projects} onChange={setProject} style={{ flexGrow: 1, flexBasis: 150 }} full />
        <SelectField label="정렬" value={sort} options={SORTS} onChange={setSort} style={{ flexGrow: 1, flexBasis: 150 }} full />
      </View>

      {/* 빠른 선택 */}
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 12, alignItems: 'center' }}>
        {[5, 10, 20].map((n) => (
          <Button key={n} label={`Top ${n}`} size="sm" onPress={() => applyPreset(n)} />
        ))}
        <Button label={`검색 결과 ${rows.length}종 모두 선택`} size="sm" onPress={() => setAllFiltered(true)} />
        <Button label="검색 결과 해제" size="sm" onPress={() => setAllFiltered(false)} />
        <Button label={onlySelected ? '전체 보기' : '선택한 것만'} size="sm" onPress={() => setOnlySelected((v) => !v)} />
        <View style={s.spacer} />
        <Text style={s.textXs}>{`선택 ${picked.length}종 / 전체 ${products.length}종`}</Text>
      </View>

      {/* 선택 칩 */}
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
              onPress={() => toggle(code)}
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

      {/* 목록 */}
      <View style={{ marginTop: 12, borderWidth: 1, borderColor: theme.color.border, borderRadius: theme.metrics.radius, overflow: 'hidden' }}>
        <View style={[s.theadRow, { backgroundColor: theme.color.muted }]}>
          <Text style={[s.th, { width: 46, textAlign: 'center' }]}>순위</Text>
          <Text style={[s.th, { flex: 1.2 }]}>제품</Text>
          <Text style={[s.th, { flex: 1.4 }]}>제품군</Text>
          <Text style={[s.th, { flex: 1.2 }]}>고객사</Text>
          <Text style={[s.th, { width: 82 }]}>프로젝트</Text>
        </View>
        <ScrollView style={{ maxHeight: 320 }}>
          {!rows.length ? (
            <EmptyState text="검색 조건에 맞는 제품이 없습니다." />
          ) : (
            rows.map((p) => {
              const on = picked.includes(p.code);
              return (
                <TouchableOpacity
                  key={p.code}
                  onPress={() => toggle(p.code)}
                  activeOpacity={0.7}
                  style={[s.tr, on && { backgroundColor: theme.alpha('primary', 0.1) }]}
                >
                  <Text style={[s.td, s.num, { width: 46, textAlign: 'center' }]}>#{p.rank}</Text>
                  <Text style={[s.td, s.mono, { flex: 1.2, fontWeight: '600' }]} numberOfLines={1}>
                    {p.code}
                  </Text>
                  <Text style={[s.td, { flex: 1.4 }]} numberOfLines={1}>
                    {p.family}
                  </Text>
                  <Text style={[s.td, { flex: 1.2 }]} numberOfLines={1}>
                    {p.customer}
                  </Text>
                  <Text style={[s.td, { width: 82 }]} numberOfLines={1}>
                    {p.project}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
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
    sub: '제품군 · 고객사 · 프로젝트로 좁혀 여러 제품을 고를 수 있습니다',
    wide: true,
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
