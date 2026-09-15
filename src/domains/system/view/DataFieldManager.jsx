/**
 * [View] SY-03 데이터 항목 관리 — 데이터 접근 권한 화면의 모달
 *
 * 통제할 항목을 **운영 중에** 늘리는 곳입니다. 항목에 「응답 필드명」을 붙여 두면 화면의 표와
 * 엑셀이 그 이름을 보고 스스로 값을 가립니다. 화면 코드를 고치거나 다시 배포할 필요가 없습니다.
 *
 * 등록은 두 단계입니다.
 *   1) 항목을 만들고 응답 필드명을 붙인다  → 이 상태로는 아무것도 가려지지 않습니다
 *   2) 부서 허용을 정한 뒤 「적용」을 켠다  → 다음 로그인부터 가려집니다
 * 한 단계로 하면 항목을 만드는 순간 여러 화면이 갑자기 비어 사고처럼 보입니다.
 */
import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { Badge, Button, Chip, ChipRow, Hint, Loading, TextField, openConfirmModal, openFormModal } from '@shared/components/ui';
import { useAsync } from '@shared/hooks/useAsync';
import { useUiStore } from '@shared/stores/useUiStore';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import * as repo from '../model/systemRepository';

/** 분류 선택지 — 표를 묶어 보는 용도라 자유 입력보다 고른 값이 낫습니다 */
const CATEGORIES = ['수량', '품질', '원가', '고객', '계획', '설비', '인사', '식별', '기준정보'];

/**
 * 너무 흔한 이름은 엉뚱한 화면까지 가립니다.
 * `name` 을 등록하면 전 화면의 `name` 값이 전부 비공개가 되어 시스템이 마비돼 보입니다.
 */
const TOO_GENERIC = ['name', 'code', 'value', 'id', 'key', 'type', 'nm', 'cd', 'no', 'date', 'ts', 'total', 'count', 'cnt'];

export default function DataFieldManager() {
  const s = useCommonStyles();
  const theme = useTheme();
  const toast = useUiStore((state) => state.toast);
  const { data, loading, reload } = useAsync(() => repo.loadDataFields(), []);
  const fields = data?.fields || data?.items || [];

  const [selectedKey, setSelectedKey] = useState('');
  const [attrInput, setAttrInput] = useState('');
  const selected = fields.find((f) => f.key === selectedKey) || fields[0] || null;

  const run = useCallback(
    async (promise, after) => {
      const res = await promise;
      toast(res.message);
      if (res.ok) {
        reload();
        after?.();
      }
      return res;
    },
    [toast, reload]
  );

  const openCreate = () =>
    openFormModal({
      title: '데이터 항목 등록',
      sub: '등록만으로는 가려지지 않습니다 — 응답 필드명을 붙이고 「적용」을 켜야 반영됩니다',
      fields: [
        { key: 'key', label: '항목 key', required: true, placeholder: 'lot · model · process' },
        { key: 'name', label: '항목명', required: true, placeholder: 'LOT 번호' },
        { key: 'category', label: '분류', type: 'select', options: CATEGORIES },
        { key: 'desc', label: '설명', type: 'textarea', full: true, placeholder: '어떤 값이 이 항목에 속하는지' },
      ],
      note: '항목 key 는 영문 소문자로 시작하는 2~30자입니다. 등록 뒤에는 바꿀 수 없습니다.',
      submitLabel: '등록',
      onSubmit: async (v) => {
        const res = await run(repo.createDataField(v), () => setSelectedKey(v.key));
        return res.ok;
      },
    });

  const addAttr = async () => {
    const attr = attrInput.trim();
    if (!selected || !attr) return;
    if (TOO_GENERIC.includes(attr.toLowerCase())) {
      // 막지는 않습니다 — 정말 그 이름으로 써야 하는 경우가 있을 수 있어 경고만 합니다
      openConfirmModal({
        title: '흔한 이름입니다',
        message: `「${attr}」 은(는) 여러 화면에서 쓰이는 이름입니다. 등록하면 그 이름을 가진 값이 전 화면에서 가려집니다.\n\n정말 등록하시겠습니까?`,
        confirmLabel: '그래도 등록',
        danger: true,
        onConfirm: () => run(repo.addFieldAttr(selected.key, attr), () => setAttrInput('')),
      });
      return;
    }
    await run(repo.addFieldAttr(selected.key, attr), () => setAttrInput(''));
  };

  if (loading) return <Loading />;

  return (
    <View style={{ gap: 14 }}>
      <Hint>
        항목에 붙인 「응답 필드명」을 보고 화면의 표와 엑셀이 스스로 값을 가립니다. 화면을 고칠 필요가 없고,
        바뀐 내용은 다시 로그인하면 반영됩니다.
      </Hint>

      {/* ── 항목 목록 ── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={s.cardTitle}>{`데이터 항목 ${fields.length}개`}</Text>
        <Button label="항목 등록" size="sm" icon="plus" variant="primary" onPress={openCreate} />
      </View>

      <View style={{ borderWidth: 1, borderColor: theme.divider, borderRadius: 10, overflow: 'hidden' }}>
        {fields.map((f, i) => {
          const on = f.applyFlg === 'Y';
          const picked = selected?.key === f.key;
          return (
            <View
              key={f.key}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingVertical: 9,
                paddingHorizontal: 12,
                borderTopWidth: i ? 1 : 0,
                borderTopColor: theme.divider,
                backgroundColor: picked ? theme.alpha('primary', 0.06) : 'transparent',
              }}
            >
              <Button label={f.name} size="sm" variant={picked ? 'primary' : 'ghost'} onPress={() => setSelectedKey(f.key)} />
              <Text style={[s.textXs, s.mono]}>{f.key}</Text>
              {/* 서버는 코드값(category)과 표시명(categoryNm)을 함께 줍니다 — 사람이 읽을 쪽을 답니다 */}
              {f.categoryNm || f.category ? <Badge>{f.categoryNm || f.category}</Badge> : null}
              <Text style={[s.textXs, { flex: 1 }]}>{`필드명 ${f.attrs?.length || 0}개`}</Text>
              <Badge tone={on ? 'green' : ''}>{on ? '적용 중' : '미적용'}</Badge>
              <Button
                label={on ? '적용 해제' : '적용'}
                size="sm"
                onPress={() => run(repo.setDataFieldApplied(f.key, !on))}
              />
              <Button
                label="삭제"
                size="sm"
                variant="ghost"
                onPress={() =>
                  openConfirmModal({
                    title: '데이터 항목 삭제',
                    message: `「${f.name}」 항목을 삭제하면 이 항목으로 가려지던 값이 다시 보이게 됩니다.\n\n삭제하시겠습니까?`,
                    confirmLabel: '삭제',
                    danger: true,
                    onConfirm: () => run(repo.removeDataField(f.key), () => setSelectedKey('')),
                  })
                }
              />
            </View>
          );
        })}
      </View>

      {/* ── 선택한 항목의 응답 필드명 ── */}
      {selected ? (
        <View style={{ gap: 8 }}>
          <Text style={s.cardTitle}>{`「${selected.name}」 의 응답 필드명`}</Text>
          <Text style={s.textXs}>
            API 응답 JSON 에 이 이름으로 담겨 오는 값이 가려집니다. 같은 이름을 두 항목에 붙일 수는 없습니다.
          </Text>

          <ChipRow>
            {(selected.attrs || []).map((attr) => (
              <Chip key={attr} label={`${attr}  ✕`} onPress={() => run(repo.removeFieldAttr(selected.key, attr))} />
            ))}
            {!(selected.attrs || []).length ? <Text style={s.textXs}>등록된 필드명이 없습니다 — 이 항목은 아무것도 가리지 않습니다.</Text> : null}
          </ChipRow>

          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
            <TextField
              label="응답 필드명 추가"
              value={attrInput}
              onChangeText={setAttrInput}
              placeholder="lotNo · modelNm · processNm"
              style={{ flex: 1 }}
            />
            <Button label="추가" size="sm" variant="primary" icon="plus" onPress={addAttr} />
          </View>
        </View>
      ) : null}
    </View>
  );
}
