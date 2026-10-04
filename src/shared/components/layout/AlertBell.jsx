/**
 * 상단 알림 종 — 이상 알림 메뉴를 여기로 통합했습니다
 *
 *  · 종 위의 배지: 미확인(OPEN) 알림 건수. 진입 시 세고, 이후 1분마다(엔진 판정 주기) 다시 셉니다.
 *    탭이 가려져 있으면 건너뛰고, 다시 보일 때 바로 셉니다. 팝오버를 열 때도 새로 셉니다.
 *  · 팝오버: 최근 미확인 알림 5건(등급 점 · 제목 · 대상 설비 · 발생 시각). 항목을 누르면 목록 화면으로.
 *  · 하단 「알림 전체 보기」 → /alert/list (권한 ID alert-list 는 그대로).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import AlertPopupToasts from './AlertPopupToasts';

const PAGE_SIZE = 5;
/** 배지 갱신 주기 — 알림 엔진의 판정 주기(기본 1분)와 맞춥니다 */
const POLL_MS = 60_000;

/** @param {boolean} silent 주기 갱신이면 true — 매분 전역 로딩 표시가 번쩍이지 않게 합니다 */
/** 팝업 토스트 확인 주기 — 엔진이 팝업을 기록하면 이 안에 뜹니다(배지 주기보다 짧게) */
const POPUP_POLL_MS = 20_000;

// 테스트 발송 알림도 포함합니다(2026-10-04) — 시스템 팝업으로 받은 테스트 알림도 「이상 알림」 에 보이도록. 「테스트」 로 표시합니다
async function fetchOpenAlerts(silent = false) {
  const res = await unwrapPaged(alertService.getAlerts({ ackState: 'OPEN', period: '7d', includeTest: true, page: 1, size: PAGE_SIZE }, { silent }), 'items');
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
  /** 떠 있는 팝업 토스트 · 마지막으로 받은 발송 로그 번호(null 이면 아직 기준점 전) */
  const [popups, setPopups] = useState([]);
  const cursor = useRef(null);

  const load = useCallback(async (silent = false) => {
    setState((prev) => ({ ...prev, loading: true, failed: false }));
    try {
      const { items, total } = await fetchOpenAlerts(silent);
      setState({ items, total, loading: false, failed: false });
    } catch {
      setState((prev) => ({ ...prev, loading: false, failed: true }));
    }
  }, []);

  /**
   * 나에게 온 팝업 — 처음엔 기준점만 받고(지난 팝업은 띄우지 않음), 그 뒤 새 것만 토스트로 띄웁니다.
   * 새 팝업이 오면 배지도 바로 다시 셉니다.
   */
  const pollPopups = useCallback(async () => {
    try {
      const res = await alertService.getAlertsPopups(cursor.current == null ? {} : { after: cursor.current }, { silent: true });
      const data = res?.data ?? res;
      if (!data) return;
      const fresh = cursor.current == null ? [] : data.items || [];
      if (data.lastSendId != null) cursor.current = data.lastSendId;
      if (fresh.length) {
        setPopups((prev) => [...prev, ...fresh.filter((f) => !prev.some((p) => p.sendId === f.sendId))].slice(-5));
        load(true);
      }
    } catch {
      /* 조용히 다음 주기에 다시 — 토스트는 놓쳐도 배지 · 목록에는 남습니다 */
    }
  }, [load]);

  useEffect(() => {
    pollPopups();
    const visible = () => typeof document === 'undefined' || document.visibilityState !== 'hidden';
    const timer = setInterval(() => { if (visible()) pollPopups(); }, POPUP_POLL_MS);
    return () => clearInterval(timer);
  }, [pollPopups]);

  /** 알림 하나로 — 목록 화면이 그 알림 상세를 엽니다(테스트 알림이면 includeTest 도) */
  const openAlert = (a) => {
    setOpen(false);
    if (!a?.alertId) {
      goToScreen('alert-list');
      return;
    }
    goToScreen('alert-list', { alertId: String(a.alertId), ...(a.test ? { includeTest: 'true' } : {}) });
  };

  // 진입 시 세고, 이후 주기적으로 다시 셉니다 — 엔진이 새 알림을 만들면 새로고침 없이 배지가 오릅니다
  useEffect(() => {
    load();
    const visible = () => typeof document === 'undefined' || document.visibilityState !== 'hidden';
    const timer = setInterval(() => {
      if (visible()) load(true);
    }, POLL_MS);
    const onVisible = () => {
      if (visible()) load(true);
    };
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisible);
    };
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
      <AlertPopupToasts
        items={popups}
        onClose={(sendId) => setPopups((prev) => prev.filter((p) => p.sendId !== sendId))}
        onOpen={(it) => {
          setPopups((prev) => prev.filter((p) => p.sendId !== it.sendId));
          openAlert(it);
        }}
      />
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
                    onPress={() => openAlert(a)}
                    style={({ hovered }) => ({ flexDirection: 'row', gap: 10, paddingVertical: 11, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: theme.divider, backgroundColor: hovered ? theme.surface : 'transparent' })}
                  >
                    <View style={{ width: 3, borderRadius: 2, backgroundColor: dot, marginTop: 2 }} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[s.listTitle, { flexShrink: 1 }]} numberOfLines={1}>{a.title || a.type || '알림'}</Text>
                        {a.test ? <Text style={[s.caption, { color: theme.color.info }]}>테스트</Text> : null}
                      </View>
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
