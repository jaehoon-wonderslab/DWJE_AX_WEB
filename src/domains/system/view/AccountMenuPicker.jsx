import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { FormAlert, TextField } from '@shared/components/ui';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';

/** 관리 화면 4종 — 부서 권한·계정 추가 허용은 통합관리자만 부여·회수합니다(R-07, 서버 MenuId.ADMIN_SCREENS 와 같은 목록) */
export const ADMIN_SCREENS = ['sys-account', 'sys-menu', 'sys-data', 'sys-gw-dept'];

/** 미배정 계정 안내 (ACC-14, R-11) */
export const UNASSIGNED_PICKER_NOTE = '미배정 계정은 대시보드 3개·덕반장 AI·자연어 질의 이력만 볼 수 있고 데이터 값은 모두 비공개입니다. 추가 메뉴는 실제 부서로 옮긴 뒤 지정하십시오.';

/**
 * 부서 기본 권한과 계정에 별도로 유지할 추가 허용을 구분합니다.
 *
 * 잠그는 경우 (4.3 「읽기 전용」)
 *  · readOnly — 본인 계정 편집(ACC-02) 또는 쓰기 권한 없음(ACC-15). 체크 상태는 그대로 보입니다.
 *  · unassigned — 고른 부서가 미배정(ACC-14). 수동 허용을 모두 풀고, 실부서로 되돌리면 원래 선택을 되살립니다.
 *  · superAdmin=false — 관리 화면 4종 줄만 잠급니다(ACC-16, R-07). 이미 허용된 줄은 체크된 채 잠깁니다.
 */
export default function AccountMenuPicker({ value = [], onChange, deptId, options, readOnly = false, readOnlyNote, unassigned = false, superAdmin = false, reasons, initialIds = [], grants = [] }) {
  // 부여 사유 (ACC-10) — 이번에 새로 켠 메뉴에만 받습니다. 폼 값은 메뉴 목록이라, 사유는 부모가 넘긴 객체에 적습니다
  const [reasonText, setReasonText] = useState(() => ({ ...(reasons || {}) }));
  const setReason = (id, text) => {
    const next = { ...reasonText, [id]: text.slice(0, 200) };
    setReasonText(next);
    if (reasons) reasons[id] = next[id];
  };
  const grantOf = (id) => grants.find((g) => g.id === id);
  const [keyword, setKeyword] = useState('');
  const s = useCommonStyles();
  const theme = useTheme();

  // 실부서 → 미배정으로 바꾸면 수동 허용을 비웁니다. 되돌리면 원래 선택을 되살립니다.
  const parked = useRef(null);
  const [revokedCnt, setRevokedCnt] = useState(0);
  useEffect(() => {
    if (unassigned && value.length) {
      parked.current = value;
      setRevokedCnt(value.length);
      onChange([]);
    } else if (!unassigned && parked.current) {
      const restore = parked.current;
      parked.current = null;
      setRevokedCnt(0);
      onChange(restore);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unassigned]);

  const inherited = new Set(options.matrix?.[String(deptId)] || []);
  const screens = options.screens || [];
  const extra = new Set(value);
  const groups = {};
  screens.filter(menu => `${menu.group} ${menu.name} ${menu.id}`.toLowerCase().includes(keyword.toLowerCase().trim()))
    .forEach(menu => { (groups[menu.group || '기타'] ||= []).push(menu); });
  const locked = readOnly || unassigned;
  const toggle = id => onChange(extra.has(id) ? value.filter(x => x !== id) : [...value, id]);
  return (
    <View style={{ gap: 12 }} nativeID="account-menu-picker">
      <Text style={[s.text, { fontWeight: '700' }]}>수동 메뉴 설정</Text>
      <Text style={s.textSm}>부서 기본 권한 {inherited.size}개 · 수동 허용 {value.length}개</Text>
      {unassigned ? (
        <FormAlert tone="info">{UNASSIGNED_PICKER_NOTE}</FormAlert>
      ) : readOnly ? (
        <FormAlert tone="info">{readOnlyNote || '이 계정의 수동 메뉴는 바꿀 수 없습니다.'}</FormAlert>
      ) : (
        <Text style={s.textSm}>체크한 메뉴는 소속 부서 권한에 추가됩니다. 부서 기본 메뉴는 해제할 수 없으며, 부서를 바꾸면 기본 메뉴도 바뀝니다.</Text>
      )}
      {unassigned && revokedCnt ? <FormAlert>{`저장하면 수동 허용 ${revokedCnt}개가 회수됩니다.`}</FormAlert> : null}
      <TextField value={keyword} onChangeText={setKeyword} placeholder="메뉴 이름 또는 그룹 검색" accessibilityLabel="수동 허용 메뉴 검색" full />
      <div style={{ color: theme.color.foreground, fontSize: 16, maxHeight: 330, overflowY: 'auto', border: `1px solid ${theme.hairlineStrong}`, borderRadius: 10, padding: 14, opacity: locked ? 0.72 : 1 }}>
        {Object.entries(groups).map(([group, menus]) => (
          <section key={group} style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>{group}</div>
            {menus.map(menu => {
              const base = inherited.has(menu.id);
              const adminLock = !superAdmin && ADMIN_SCREENS.includes(menu.id);
              const disabled = locked || adminLock || (base && !extra.has(menu.id));
              return (
                <label key={menu.id} title={adminLock ? '관리 화면 권한은 통합관리자만 부여하거나 회수할 수 있습니다' : undefined} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '9px 8px', borderBottom: `1px solid ${theme.hairline}`, cursor: disabled ? 'default' : 'pointer' }}>
                  <input type="checkbox" aria-label={`${menu.name} 추가 허용`} checked={base || extra.has(menu.id)} disabled={disabled} onChange={() => toggle(menu.id)} style={{ width: 18, height: 18, flexShrink: 0, accentColor: theme.color.primary }} />
                  <span style={{ flex: 1 }}>{menu.name}</span>
                  <span style={{ fontSize: 13, color: theme.color.mutedForeground }}>
                    {[base ? '부서 기본' : '', extra.has(menu.id) ? '수동 허용' : '', adminLock ? '통합관리자만 변경' : '', grantOf(menu.id)?.reason ? `사유: ${grantOf(menu.id).reason}` : ''].filter(Boolean).join(' · ')}
                  </span>
                  {reasons && extra.has(menu.id) && !initialIds.includes(menu.id) && !locked ? (
                    <input
                      type="text"
                      aria-label={`${menu.name} 부여 사유`}
                      placeholder="부여 사유 (200자)"
                      maxLength={200}
                      value={reasonText[menu.id] || ''}
                      onChange={(e) => setReason(menu.id, e.target.value)}
                      style={{ width: 200, fontSize: 14, padding: '4px 8px', border: `1px solid ${theme.hairlineStrong}`, borderRadius: 6, background: 'transparent', color: theme.color.foreground }}
                    />
                  ) : null}
                </label>
              );
            })}
          </section>
        ))}
        {!Object.keys(groups).length && <Text style={s.textSm}>일치하는 메뉴가 없습니다.</Text>}
        {value.filter(id => !screens.some(menu => menu.id === id)).map(id => (
          <label key={id} style={{ display: 'flex', gap: 10, padding: 8 }}>
            <input type="checkbox" checked disabled={locked || (!superAdmin && ADMIN_SCREENS.includes(id))} onChange={() => toggle(id)} />
            <span>{id} (현재 선택지에 없는 메뉴 · 체크 해제로 제거)</span>
          </label>
        ))}
      </div>
    </View>
  );
}
