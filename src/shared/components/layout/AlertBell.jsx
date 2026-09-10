/**
 * 상단 알림 종 — 이상 알림 메뉴를 여기로 통합했습니다
 *
 *  · 종 위의 배지: 미확인(OPEN) 알림 건수. 진입 시 한 번 세고, 팝오버를 열 때마다 새로 셉니다.
 *  · 팝오버: 최근 미확인 알림 5건(등급 점 · 제목 · 대상 설비 · 발생 시각). 항목을 누르면 목록 화면으로.
 *  · 하단 「알림 전체 보기」 → /alert/list (권한 ID alert-list 는 그대로).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as alertService from '@services/api/alertService';
import { unwrapPaged } from '@services/api/request';
import { alertLevelTone } from '@domains/alert/model/alertRepository';
import { useAppNavigation } from '@shared/hooks/useAppNavigation';
import { FONT_FAMILY, useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import Icon from '../ui/Icon';
import { IconButton } from '../ui/Button';
import { Loading } from '../ui/Feedback';

const PAGE_SIZE = 5;

async function fetchOpenAlerts() {
  const res = await unwrapPaged(alertService.getAlerts({ ackState: 'OPEN', period: '7d', page: 1, size: PAGE_SIZE }), 'items');
  const items = res?.items || res?.list || [];
  const total = res?.meta?.total ?? items.length;
  return { items, total };
}

export default function AlertBell() {
  const s = useCommonStyles();
  const theme = useTheme();
  const { goToScreen } = useAppNavigation();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState({ items: [], total: null, loading: false, failed: false });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, failed: false }));
    try {
      const { items, total } = await fetchOpenAlerts();
      setState({ items, total, loading: false, failed: false });
    } catch {
      setState((prev) => ({ ...prev, loading: false, failed: true }));
    }
  }, []);

  // 진입 시 배지 건수만 한 번 셉니다
  useEffect(() => {
    load();
  }, [load]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) load();
  };

  const goList = () => {
    setOpen(false);
    goToScreen('alert-list');
  };

  const badge = state.total != null && state.total > 0 ? (state.total > 99 ? '99+' : String(state.total)) : null;

  return (
    <View>
      <View>
        <IconButton name="bell" onPress={toggle} title="이상 알림" active={open} />
        {badge ? (
          <View
            pointerEvents="none"
            style={{ position: 'absolute', top: -3, right: -3, minWidth: 16, height: 16, paddingHorizontal: 4, borderRadius: 99, backgroundColor: theme.color.destructive, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: theme.color.card }}
          >
            <Text style={{ fontFamily: FONT_FAMILY, fontSize: 13, lineHeight: 11, fontWeight: '600', color: '#fff' }}>{badge}</Text>
          </View>
        ) : null}
      </View>

      {open ? (
        <>
          {/* 바깥 클릭 시 닫힘 */}
          <Pressable onPress={() => setOpen(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 59 }} />
          <View
            style={{
              position: 'absolute',
              right: 0,
              top: 42,
              zIndex: 60,
              width: 340,
              backgroundColor: theme.color.popover,
              borderWidth: 1,
              borderColor: theme.hairlineStrong,
              borderRadius: theme.metrics.radius,
              overflow: 'hidden',
              ...theme.shadow,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: theme.divider }}>
              <Text style={s.heading2xs}>이상 알림</Text>
              <Text style={s.caption}>{state.total != null ? `미확인 ${state.total.toLocaleString('ko-KR')}건` : ''}</Text>
              <View style={s.spacer} />
              <Text style={s.caption}>최근 7일</Text>
            </View>

            {state.loading && !state.items.length ? (
              <Loading compact text="알림을 불러오는 중입니다…" />
            ) : state.failed ? (
              <Text style={[s.emptyText, { paddingVertical: 24 }]}>알림을 불러오지 못했습니다.</Text>
            ) : !state.items.length ? (
              <Text style={[s.emptyText, { paddingVertical: 24 }]}>미확인 알림이 없습니다.</Text>
            ) : (
              state.items.map((a, i) => {
                const tone = alertLevelTone(a.level);
                const dot = tone === 'red' ? theme.color.destructive : tone === 'amber' ? theme.color.warning : theme.divider;
                return (
                  <Pressable
                    key={a.alertId || a.id || i}
                    onPress={goList}
                    style={({ hovered }) => ({ flexDirection: 'row', gap: 10, paddingVertical: 11, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: theme.divider, backgroundColor: hovered ? theme.surface : 'transparent' })}
                  >
                    <View style={{ width: 3, borderRadius: 2, backgroundColor: dot, marginTop: 2 }} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.listTitle} numberOfLines={1}>{a.title || a.type || '알림'}</Text>
                      {a.desc ? <Text style={[s.listDesc, { fontSize: 15.5, lineHeight: 16 }]} numberOfLines={2}>{a.desc}</Text> : null}
                      <Text style={[s.caption, { marginTop: 4 }]} numberOfLines={1}>
                        {[a.eqptNm || a.eqptCd, a.agent, a.occurredAt].filter(Boolean).join(' · ')}
                      </Text>
                    </View>
                  </Pressable>
                );
              })
            )}

            <Pressable
              onPress={goList}
              style={({ hovered }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, backgroundColor: hovered ? theme.surfaceHover : theme.surface })}
            >
              <Text style={[s.textSm, { fontWeight: '600', color: theme.color.info }]}>알림 전체 보기</Text>
              <Icon name="arrowRight" size={13} color={theme.color.info} />
            </Pressable>
          </View>
        </>
      ) : null}
    </View>
  );
}
