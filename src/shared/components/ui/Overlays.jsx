/**
 * 토스트 · 모달 · 드로어 호스트 (CM-05)
 *
 * App 최상위에 한 번만 붙여 두면, 어느 화면에서든 useUiStore 의
 * toast() / openModal() / openDrawer() 호출로 이 컴포넌트들이 반응합니다.
 *
 * 모달·드로어는 캔버스와 같은 24px 반지름의 흰 패널입니다(패널 그림자 한 번).
 * 토스트는 잉크 네이비 알약 — 흰 글자.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Modal as RNModal, Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useUiStore } from '@shared/stores/useUiStore';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { IconButton } from './Button';

const NATIVE = Platform.OS !== 'web';

/* ───────── 토스트 ───────── */
export function ToastHost() {
  const s = useCommonStyles();
  const theme = useTheme();
  const message = useUiStore((state) => state.toastMessage);
  const visible = useUiStore((state) => state.toastVisible);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, { toValue: visible ? 1 : 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: NATIVE }).start();
  }, [visible, anim]);

  if (!message) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        right: 24,
        bottom: 24,
        zIndex: 80,
        backgroundColor: theme.color.primary,
        paddingVertical: 11,
        paddingHorizontal: 16,
        borderRadius: theme.metrics.radiusSm,
        maxWidth: 460,
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
        ...theme.shadow,
      }}
    >
      <Text style={[s.textSm, { color: theme.color.primaryForeground, fontSize: 16.5, fontWeight: '500' }]}>{message}</Text>
    </Animated.View>
  );
}

/** 모달 패널이 떠오르는 애니메이션 */
function Rise({ children, style }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: NATIVE }).start();
  }, [anim]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }, { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/* ───────── 모달 ───────── */
export function ModalHost() {
  const s = useCommonStyles();
  const theme = useTheme();
  const modals = useUiStore((state) => state.modals);
  const closeModal = useUiStore((state) => state.closeModal);
  const { height } = useWindowDimensions();

  if (!modals.length) return null;

  return (
    <>
      {modals.map((m) => {
        const close = () => closeModal(m.id);
        return (
          <RNModal key={m.id} visible transparent animationType="fade" onRequestClose={close}>
            <Pressable
              style={{ flex: 1, backgroundColor: theme.overlay, alignItems: 'center', justifyContent: 'center', padding: 20 }}
              onPress={close}
            >
              <Rise
                style={{
                  width: '100%',
                  // 내용에 따라 더 넓게 열 수 있게 — 표가 든 창은 900 으로는 열이 눌립니다
                  maxWidth: m.maxWidth || (m.wide ? 900 : 620),
                  maxHeight: height * 0.85,
                }}
              >
                <Pressable
                  style={{
                    width: '100%',
                    maxHeight: height * 0.85,
                    backgroundColor: theme.color.popover,
                    borderWidth: 1,
                    borderColor: theme.hairline,
                    borderRadius: theme.metrics.radiusPanel,
                    overflow: 'hidden',
                    ...theme.shadow,
                  }}
                  onPress={(e) => e.stopPropagation?.()}
                >
                  {m.title ? (
                    <View style={[s.cardHead, { paddingVertical: 16, paddingHorizontal: 20 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.headingXs}>{m.title}</Text>
                        {m.sub ? <Text style={s.cardHeadSub}>{m.sub}</Text> : null}
                      </View>
                      <IconButton name="close" size={32} iconSize={15} onPress={close} title="닫기" />
                    </View>
                  ) : null}

                  <ScrollView contentContainerStyle={m.tight ? undefined : [s.cardBody, { padding: 20 }]}>
                    {typeof m.render === 'function' ? m.render(close) : m.render}
                  </ScrollView>

                  {m.footer ? (
                    <View
                      style={{
                        flexDirection: 'row',
                        gap: 8,
                        justifyContent: 'flex-end',
                        paddingVertical: 14,
                        paddingHorizontal: 20,
                        borderTopWidth: 1,
                        borderTopColor: theme.divider,
                        flexWrap: 'wrap',
                      }}
                    >
                      {typeof m.footer === 'function' ? m.footer(close) : m.footer}
                    </View>
                  ) : null}
                </Pressable>
              </Rise>
            </Pressable>
          </RNModal>
        );
      })}
    </>
  );
}

/* ───────── 우측 드로어 ───────── */
export function DrawerHost() {
  const s = useCommonStyles();
  const theme = useTheme();
  const drawer = useUiStore((state) => state.drawer);
  const closeDrawer = useUiStore((state) => state.closeDrawer);
  const { width } = useWindowDimensions();

  if (!drawer) return null;
  const close = () => closeDrawer();

  return (
    <RNModal visible transparent animationType="slide" onRequestClose={close}>
      <Pressable style={{ flex: 1, backgroundColor: theme.drawerOverlay, flexDirection: 'row', justifyContent: 'flex-end' }} onPress={close}>
        <Pressable
          style={{
            width: Math.min(400, width * 0.92),
            height: '100%',
            backgroundColor: theme.color.card,
            borderLeftWidth: 1,
            borderLeftColor: theme.hairline,
          }}
          onPress={(e) => e.stopPropagation?.()}
        >
          <View style={[s.cardHead, { paddingVertical: 16, paddingHorizontal: 20, minHeight: theme.metrics.topbarHeight }]}>
            <View style={{ flex: 1 }}>
              <Text style={s.headingXs}>{drawer.title}</Text>
              {drawer.sub ? <Text style={s.cardHeadSub}>{drawer.sub}</Text> : null}
            </View>
            <IconButton name="close" size={32} iconSize={15} onPress={close} title="닫기" />
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {typeof drawer.render === 'function' ? drawer.render(close) : drawer.render}
          </ScrollView>
        </Pressable>
      </Pressable>
    </RNModal>
  );
}
