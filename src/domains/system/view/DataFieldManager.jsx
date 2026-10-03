/**
 * [View] SY-03 항목 관리 — 화면 보고 가리기 (데이터 접근 권한 화면의 모달)
 *
 * 관리자는 「이 화면의 단가 열을 숨기고 싶다」 로 생각합니다. 그래서 **화면을 고르면 그 화면에 실제로 보이는
 * 열 제목**(LOT 번호 · 단가 …)을 그대로 보여 주고, 가릴 열에 체크한 뒤 어느 **종류**(단가·금액 · 고객사 …)에
 * 넣을지만 고르게 합니다. 누가 볼지는 바깥의 「부서별 데이터 접근 권한 관리」 표에서 종류 단위로 정합니다.
 *
 *  · 열 제목 ↔ 값 이름 짝은 화면 코드에서 자동으로 모은 목록입니다(screenColumns.generated.js)
 *  · 같은 값은 다른 화면에서도 함께 가려집니다 — 저장 전에 그 화면들을 알려 줍니다
 *  · 새 종류는 만들 때 미배정·통합관리자를 뺀 **모든 부서가 볼 수 있게** 시작하고 적용을 켭니다.
 *    만들자마자 여러 화면이 비는 일을 막으려는 것입니다. 숨길 부서는 바깥 표에서 체크를 끕니다.
 *  · 저장은 한 번의 요청으로 전부 반영되거나 전부 되돌려집니다(2026-10-01, 기획 04 DTP-02).
 *    서버 응답에는 다음 조회부터 적용됩니다. 다른 사용자의 화면에 「비공개」 표시가 나오기까지는
 *    그 사용자가 화면을 다시 열어야 합니다(그 전에는 빈칸으로 보입니다).
 *  · 시스템관리 화면과 예약어(로그인·권한 응답 키)는 고를 수 없습니다(DTP-01)
 * 상태와 동작은 useDataFieldManagerController 가 맡습니다 — 이 파일은 그리기만 합니다.
 *
 * 2026-10-02 개편 — 「화면별 가리기」 · 「가리기 종류」 두 탭(CardTabs)으로 나눕니다.
 *  · 가리기 탭은 ①화면 고르기 ②가릴 열 체크 ③종류 고르기 ④저장 순서를 위에 보이고, [되돌리기]·[저장] 은 탭 머리에 둡니다
 *  · 표 칸 높이를 고정해 「가리기」 를 체크해 종류 선택 상자가 나타나도 행 높이가 바뀌지 않게 합니다
 */
/** 탭 값 */
const TAB_HIDE = 'hide';
const TAB_KINDS = 'kinds';
/** 표 칸 높이 — 체크 전(—)과 후(선택 상자)가 같은 높이를 쓰게 합니다 */
const CELL_H = 40;
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Badge, Button, CardTabs, CheckRow, FormAlert, Loading, SelectField, Table, openConfirmModal, openFormModal } from '@shared/components/ui';
import { useCommonStyles } from '@shared/theme/styles';
import { NEW_KIND, otherScreens, useDataFieldManagerController, validateKind } from '../controller/useDataFieldManagerController';

export default function DataFieldManager({ onChanged, readOnly = false, onDirtyChange }) {
  const s = useCommonStyles();
  const [tab, setTab] = useState(TAB_HIDE);
  const c = useDataFieldManagerController({ readOnly, onChanged, onDirtyChange });

  /** 종류 폼 칸 — 새로 만들기와 편집이 같습니다(이름 50자 · 설명 300자 · 분류는 공통코드, DTP-11) */
  const kindFields = [
    { key: 'name', label: '종류 이름', required: true, placeholder: '예) LOT·시리얼 · 작업자 연락처' },
    { key: 'desc', label: '설명', type: 'textarea', placeholder: '이 종류로 무엇을 가리는지 (300자 이내)' },
    { key: 'category', label: '분류', type: 'select', options: c.categoryOptions },
  ];

  /** 종류 편집 */
  const editKind = (k) =>
    openFormModal({
      title: `종류 편집 — ${k.name}`,
      sub: '이름을 바꾸면 바깥 표·종류 목록·로그인 정보의 종류 이름이 함께 바뀝니다. key 는 바꾸지 않습니다.',
      fields: kindFields,
      initial: { name: k.name || '', desc: k.desc || '', category: k.category || '' },
      validate: validateKind,
      submitLabel: '저장',
      onSubmit: (v) => c.updateKind(k, v),
    });

  const askNewKind = (field) =>
    openFormModal({
      title: '새 종류 만들기',
      sub: '가릴 값을 묶는 이름입니다. 누가 볼지는 바깥 표에서 부서마다 정합니다.',
      fields: kindFields,
      validate: validateKind,
      note: '새 종류는 미배정·통합관리자를 뺀 모든 부서가 볼 수 있게 만들어지고 적용이 켜집니다. 숨길 부서는 바깥 표에서 체크를 끄세요.',
      submitLabel: '만들기',
      onSubmit: (v) => c.addNewKind(field, v),
    });

  const onToggle = (field) => {
    if (c.toggleField(field) === 'ask') askNewKind(field);
  };

  /** 바꾼 열이 있는데 화면을 바꾸면 먼저 묻습니다(DTP-14) */
  const changeScreen = (v) => {
    if (v === c.screenId) return;
    if (!c.changed.length) { c.setScreenId(v); return; }
    openConfirmModal({
      title: '저장하지 않은 변경',
      message: `바꾼 열 ${c.changed.length}개가 저장되지 않았습니다. 화면을 바꾸면 버립니다.`,
      confirmLabel: '버리고 바꾸기',
      danger: true,
      onConfirm: () => c.setScreenId(v),
    });
  };

  if (c.loading) return <Loading />;

  const screen = c.screen;
  const changedCnt = c.changed.length;
  /** 지금 화면에서 가리고 있는 열 수(저장 전 변경 포함) */
  const hiddenCnt = screen ? screen.rows.filter((r) => c.current(r.field)).length : 0;

  /** 탭 머리 오른쪽 — 가리기 탭: 되돌리기 · 저장(바꾼 열 수) */
  const tabActions = {
    [TAB_HIDE]: (
      <>
        <Button label="되돌리기" size="sm" onPress={c.resetDraft} disabled={c.saving || !changedCnt} />
        <Button
          label={c.saving ? '저장하는 중…' : changedCnt ? `저장 (${changedCnt})` : '저장'}
          size="sm"
          variant="primary"
          icon="save"
          onPress={c.save}
          disabled={c.saving || c.readOnly || !changedCnt}
        />
      </>
    ),
    [TAB_KINDS]: null,
  };

  return (
    <View style={{ gap: 14 }}>
      {c.readOnly ? <FormAlert tone="info">읽기 전용 — 미배정 계정은 이 동작을 할 수 없습니다. 전산팀에 부서 배정을 요청하세요. 보기만 할 수 있습니다.</FormAlert> : null}

      <CardTabs
        id="field-manager"
        value={tab}
        onChange={setTab}
        items={[
          { value: TAB_HIDE, label: '화면별 가리기', icon: 'eyeOff', count: changedCnt || undefined },
          { value: TAB_KINDS, label: '가리기 종류', icon: 'layers', count: c.kinds.length },
        ]}
        right={tabActions[tab]}
      >
        {tab === TAB_HIDE ? (
          <View style={{ gap: 14 }}>
            {/* 무엇을 하는 곳인지 순서로 보입니다 — 누가 볼지는 바깥 표에서 정합니다 */}
            <HowTo />

            <SelectField
              nativeSelect
              label="① 화면"
              value={c.screenId}
              options={c.screens.map((x) => ({ value: x.id, label: `${x.group} › ${x.name}` }))}
              onChange={changeScreen}
            />
            {c.noTableScreens.length ? (
              <Text style={s.textXs}>
                {`${c.noTableScreens.join(' · ')} 은(는) 표가 아닌 카드·보고서 형식이라 여기서 고를 수 없습니다. 그 화면의 수량·수율은 「생산·출하 수량」「수율·불량률」 종류를 따릅니다.`}
              </Text>
            ) : null}

            {screen ? (
              <>
                <Text style={s.textSm}>{`이 화면의 열 ${screen.rows.length}개 중 ${hiddenCnt}개를 가리고 있습니다.`}</Text>
                <Table
                  minWidth={720}
                  bordered
                  rows={screen.rows}
                  keyExtractor={(r) => r.field}
                  emptyText="이 화면에는 가릴 수 있는 표 열이 없습니다."
                  columns={[
                    { key: 'title', title: '열 이름', minWidth: 200, flex: 1.4, render: (r) => <Cell><Text style={s.textSm}>{r.title}</Text></Cell> },
                    {
                      key: 'hide',
                      title: '② 가리기',
                      width: 100,
                      align: 'center',
                      render: (r) => {
                        const lock = c.fieldLock(r.field);
                        const checked = !!c.current(r.field);
                        // 화면 읽기 프로그램·시험이 찾을 수 있게 체크 상자 역할과 이름을 붙입니다
                        if (!lock) {
                          return (
                            <Cell center>
                              <View role="checkbox" aria-label={`${r.title} 가리기`} aria-checked={checked}>
                                <CheckRow checked={checked} onToggle={() => onToggle(r.field)} />
                              </View>
                            </Cell>
                          );
                        }
                        // 고를 수 없는 행 — 체크를 비활성으로 두고 이유를 보입니다
                        return (
                          <Cell center>
                            <View role="checkbox" aria-label={`${r.title} 가리기`} aria-description={lock} aria-checked={checked} aria-disabled style={{ alignItems: 'center' }}>
                              <View style={{ opacity: 0.4, pointerEvents: 'none' }}><CheckRow checked={checked} onToggle={() => {}} /></View>
                            </View>
                          </Cell>
                        );
                      },
                    },
                    {
                      key: 'kind',
                      title: '③ 종류',
                      minWidth: 220,
                      flex: 1.2,
                      render: (r) => {
                        const lock = c.fieldLock(r.field);
                        if (lock.startsWith('시스템')) return <Cell><Text style={s.textXs}>시스템이 쓰는 값이라 가릴 수 없음</Text></Cell>;
                        const k = c.current(r.field);
                        if (!k) return <Cell><Text style={s.textXs}>— (보임)</Text></Cell>;
                        if (c.readOnly) return <Cell><Text style={s.textSm}>{c.kindName(k)}</Text></Cell>;
                        return (
                          // 표 칸 안이라 떠 있는 목록은 잘립니다 — 브라우저 기본 선택 상자로 엽니다. 칸 높이는 고정
                          <Cell>
                            <View style={{ width: '100%' }}>
                              <SelectField
                                nativeSelect
                                value={k}
                                options={c.kindOptions}
                                onChange={(v) => (v === NEW_KIND ? askNewKind(r.field) : c.setKind(r.field, v))}
                              />
                            </View>
                          </Cell>
                        );
                      },
                    },
                    {
                      key: 'also',
                      title: '함께 가려지는 다른 화면',
                      minWidth: 220,
                      flex: 1.4,
                      render: (r) => {
                        const list = otherScreens(r.field, c.screenId);
                        return <Cell><Text style={s.textXs} numberOfLines={2}>{list.length ? `${list.slice(0, 2).join(' · ')}${list.length > 2 ? ` 외 ${list.length - 2}곳` : ''}` : '—'}</Text></Cell>;
                      },
                    },
                  ]}
                />
              </>
            ) : null}

            {c.saveError ? <FormAlert>{`저장하지 못했습니다 — ${c.saveError} (고른 내용은 그대로 남아 있습니다)`}</FormAlert> : null}

            {changedCnt ? (
              // ④ 저장 전 요약 — 저장 단추는 탭 머리에 있습니다
              <View nativeID="field-manager-pending" style={{ gap: 6 }}>
                <FormAlert tone="info">{`④ 저장하지 않은 변경 ${changedCnt}개 — ${c.changed.map((f) => `${screen?.rows.find((r) => r.field === f)?.title || f} → ${c.draft[f] ? c.kindName(c.draft[f]) : '가리지 않음'}`).join(' · ')}. 오른쪽 위 [저장] 을 누르면 반영됩니다.`}</FormAlert>
                {c.alsoHidden.length ? <Text style={s.textXs}>{`같은 값이 보이는 다른 화면에서도 함께 가려집니다 — ${c.alsoHidden.join(' · ')}`}</Text> : null}
              </View>
            ) : null}
          </View>
        ) : null}

        {tab === TAB_KINDS ? (
          <View style={{ gap: 10 }}>
            {/* 마침표마다 줄을 바꿉니다(2026-10-02) */}
            <Text style={s.textSm}>{[
              '종류는 가릴 값을 묶는 이름입니다(예: 단가·금액).',
              '종류마다 어떤 값이 가려지는지 보고, 이름·설명을 고칩니다.',
              '새 종류는 「화면별 가리기」 에서 열을 체크하고 종류 칸의 「+ 새 종류 만들기」 로 만듭니다.',
              '가리는 값이 없는 종류만 지울 수 있습니다.',
            ].join('\n')}</Text>
            <KindList kinds={c.kinds} titleOf={c.titleOf} readOnly={c.readOnly} removeKind={c.removeKind} editKind={editKind} />
          </View>
        ) : null}
      </CardTabs>
    </View>
  );
}

/** 사용 순서 — 한 줄씩 짧게(2026-10-02 「이 화면의 기능을 이해하기 힘듦」 피드백) */
function HowTo() {
  const s = useCommonStyles();
  const steps = [
    ['①', '화면을 고릅니다', '그 화면 표에 보이는 열이 아래에 나옵니다.'],
    ['②', '가릴 열에 체크합니다', '시스템이 쓰는 값은 체크할 수 없습니다.'],
    ['③', '종류를 고릅니다', '단가·금액처럼 묶을 이름입니다. 없으면 「+ 새 종류 만들기」.'],
    ['④', '[저장] 을 누릅니다', '누가 볼지는 바깥 「부서별 데이터 접근 권한 관리」 표에서 종류마다 정합니다.'],
  ];
  return (
    <View nativeID="field-manager-howto" style={{ gap: 4 }}>
      {steps.map(([n, title, sub]) => (
        <Text key={n} style={s.textSm}>
          <Text style={{ fontWeight: '700' }}>{`${n} ${title}`}</Text>
          {`  ${sub}`}
        </Text>
      ))}
    </View>
  );
}

/** 표 칸 — 높이를 고정해 내용이 바뀌어도 행 높이가 흔들리지 않게 합니다 */
function Cell({ children, center }) {
  return <View style={{ minHeight: CELL_H, justifyContent: 'center', alignItems: center ? 'center' : 'flex-start', width: '100%' }}>{children}</View>;
}

/** 종류 목록 — 무엇이 들어 있는지를 열 제목으로 보여 줍니다. 비어 있는 종류만 지울 수 있습니다 */
function KindList({ kinds, titleOf, readOnly, removeKind, editKind }) {
  const s = useCommonStyles();
  return (
    <View style={{ gap: 8 }}>
      <Table
        minWidth={600}
        bordered
        rows={kinds}
        keyExtractor={(k) => k.key}
        columns={[
          {
            key: 'name',
            title: '종류',
            width: 180,
            render: (k) => (
              <View style={{ gap: 2 }}>
                <Text style={[s.textSm, { fontWeight: '600' }]}>{`${k.name}${k.applyFlg === 'N' ? ' (미적용)' : ''}`}</Text>
                {k.categoryNm || k.category ? <Text style={s.textXs}>{k.categoryNm || k.category}</Text> : null}
              </View>
            ),
          },
          {
            key: 'values',
            title: '가리는 값',
            minWidth: 300,
            flex: 2,
            render: (k) => {
              const names = (k.attrs || []).map((a) => (typeof a === 'string' ? a : a?.attrName));
              const shown = names.map((a) => titleOf[a]).filter(Boolean);
              const rest = names.length - shown.length;
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
            key: 'edit',
            title: '',
            width: 80,
            align: 'center',
            render: (k) => <Button label="편집" size="sm" variant="ghost" disabled={readOnly} onPress={() => editKind(k)} />,
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
                  disabled={readOnly}
                  onPress={() =>
                    openConfirmModal({
                      title: '종류 삭제',
                      message: `「${k.name}」 종류를 삭제하시겠습니까? 가리는 값이 없는 종류입니다.`,
                      confirmLabel: '삭제',
                      danger: true,
                      onConfirm: () => removeKind(k),
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
