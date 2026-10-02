/**
 * 카드 탭 (CM-05) — 한 화면의 큰 표 여러 개를 탭으로 나눠 하나씩 보입니다.
 *
 * shadcn/ui Tabs(Base UI) 의 동작을 따릅니다.
 *  · 값 제어 — `value` · `onChange` (바깥에서 탭을 바꿀 수 있습니다. 예: 「이 계정의 최근 이력」)
 *  · 접근성 — 목록 `role="tablist"`, 탭 `role="tab"` + `aria-selected` · `aria-controls`, 내용 `role="tabpanel"`
 *  · 키보드 — 탭 목록에서 ←/→ 로 이웃 탭, Home/End 로 처음·끝 탭으로 옮기고 바로 엽니다. 꺼진 탭은 건너뜁니다
 *  · 내용은 고른 탭만 그립니다(Base UI 기본값과 같음). 표가 숨은 상자 안에서 폭을 0 으로 재는 문제를 피합니다
 *
 * 생김새 — 일반 `Tabs`(알약 모양)는 같은 표의 보기 전환용이고, 이것은 카드를 나누는 용도라 더 눈에 띄게 그립니다.
 *  · 고른 탭: 흰 바탕 + 위쪽 3px 잉크색 띠 + 좌우 테두리, 아래 테두리를 지워 내용 카드와 이어 붙입니다
 *  · 나머지 탭: 회색 바탕 + 테두리, 마우스를 올리면 바탕이 밝아집니다
 *  · 탭마다 건수 배지를 붙일 수 있습니다(고른 탭은 잉크색 채움)
 *
 * 사용 예)
 *   <CardTabs
 *     id="account"
 *     items={[{ value: 'users', label: '계정', count: 372 }, { value: 'depts', label: '부서', count: 12 }]}
 *     value={tab}
 *     onChange={setTab}
 *     right={<Button label="계정 등록" />}
 *   >
 *     {tab === 'users' ? <UsersTable /> : <DeptTable />}
 *   </CardTabs>
 */
import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { FONT_FAMILY, NUM_FAMILY } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import Icon from './Icon';

export default function CardTabs({ id = 'tabs', items = [], value, onChange, right, children, bodyStyle }) {
  const theme = useTheme();
  const { color } = theme;
  const listRef = useRef(null);
  // 초점 고리는 키보드로 옮겼을 때만 그립니다(마우스로 누른 탭에 고리가 남으면 내용 카드와 이음매가 끊겨 보입니다)
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const enabled = items.filter((it) => !it.disabled);

  // ←/→ · Home/End — 탭 목록 DOM 에 직접 겁니다(RN Pressable 은 keydown 을 넘기지 않습니다)
  const stateRef = useRef({ enabled, value, onChange });
  stateRef.current = { enabled, value, onChange };
  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;
    const el = listRef.current;
    if (!el?.addEventListener) return undefined;
    const onKey = (e) => {
      setKeyboardFocus(true);
      const { enabled: list, value: cur, onChange: change } = stateRef.current;
      if (!list.length) return;
      const at = Math.max(0, list.findIndex((it) => it.value === cur));
      const next = {
        ArrowRight: list[(at + 1) % list.length],
        ArrowLeft: list[(at - 1 + list.length) % list.length],
        Home: list[0],
        End: list[list.length - 1],
      }[e.key];
      if (!next) return;
      e.preventDefault();
      change?.(next.value);
      // 새 탭으로 초점을 옮깁니다(로빙 초점)
      requestAnimationFrame(() => document.getElementById(`${id}-tab-${next.value}`)?.focus());
    };
    const onPointer = () => setKeyboardFocus(false);
    el.addEventListener('keydown', onKey);
    el.addEventListener('pointerdown', onPointer);
    return () => { el.removeEventListener('keydown', onKey); el.removeEventListener('pointerdown', onPointer); };
  }, [id]);

  const border = color.border;
  const radius = 12;

  return (
    <View style={{ minWidth: 0 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
        <View ref={listRef} role="tablist" aria-label="표 구분" style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, flexShrink: 1, flexWrap: 'wrap', marginBottom: -1, zIndex: 1 }}>
          {items.map((it) => {
            const on = it.value === value;
            return (
              <Pressable
                key={String(it.value)}
                nativeID={`${id}-tab-${it.value}`}
                role="tab"
                aria-selected={on}
                aria-controls={`${id}-panel-${it.value}`}
                aria-disabled={!!it.disabled}
                disabled={!!it.disabled}
                // 로빙 초점 — 고른 탭만 Tab 키로 들어오고, 나머지는 ←/→ 로 옮깁니다
                tabIndex={on ? 0 : -1}
                onPress={() => onChange?.(it.value)}
                style={({ hovered, focused }) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    paddingHorizontal: 18,
                    paddingTop: on ? 10 : 9,
                    paddingBottom: on ? 11 : 9,
                    borderWidth: 1,
                    borderColor: border,
                    borderTopWidth: on ? 3 : 1,
                    borderTopColor: on ? color.primary : border,
                    borderBottomColor: on ? color.card : border,
                    borderTopLeftRadius: radius,
                    borderTopRightRadius: radius,
                    backgroundColor: on ? color.card : hovered ? color.muted : color.secondary,
                    opacity: it.disabled ? 0.5 : 1,
                  },
                  Platform.OS === 'web' ? {
                    cursor: it.disabled ? 'not-allowed' : 'pointer',
                    transitionDuration: '140ms',
                    transitionProperty: 'background-color, border-color',
                    outlineStyle: 'none',
                    ...(focused && keyboardFocus ? { boxShadow: `0 0 0 2px ${color.ring}` } : null),
                  } : null,
                ]}
              >
                {it.icon ? <Icon name={it.icon} size={15} color={on ? color.primary : color.mutedForeground} /> : null}
                <Text style={{ fontFamily: FONT_FAMILY, fontSize: 16, lineHeight: 18, fontWeight: on ? '700' : '500', color: on ? color.primary : color.secondaryForeground }}>
                  {it.label}
                </Text>
                {it.count !== undefined && it.count !== null ? (
                  <View style={{ minWidth: 26, paddingHorizontal: 7, paddingVertical: 1, borderRadius: 999, alignItems: 'center', backgroundColor: on ? color.primary : color.card, borderWidth: on ? 0 : 1, borderColor: border }}>
                    <Text style={{ fontFamily: NUM_FAMILY, fontSize: 13, lineHeight: 17, fontWeight: '600', color: on ? color.primaryForeground : color.mutedForeground }}>
                      {Number(it.count).toLocaleString('ko-KR')}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
        {right ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginLeft: 'auto', paddingBottom: 8 }}>{right}</View> : null}
      </View>
      <View
        nativeID={`${id}-panel-${value}`}
        role="tabpanel"
        aria-labelledby={`${id}-tab-${value}`}
        style={[
          {
            borderWidth: 1,
            borderColor: border,
            borderRadius: radius,
            // 첫 탭이 열려 있으면 그 탭과 이어지도록 왼쪽 위 모서리를 각지게 둡니다
            borderTopLeftRadius: items[0]?.value === value ? 0 : radius,
            backgroundColor: color.card,
            padding: 20,
            minWidth: 0,
          },
          bodyStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
}
