/**
 * 토스트 · 모달 · 드로어 호스트 (CM-05)
 *
 * App 최상위에 한 번만 붙여 두면, 어느 화면에서든 useUiStore 의
 * toast() / openModal() / openDrawer() 호출로 이 컴포넌트들이 반응합니다.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Modal as RNModal, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useUiStore } from '@shared/stores/useUiStore';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { IconButton } from './Button';

/* ───────── 토스트 ───────── */
export function ToastHost() {
  const s = useCommonStyles();
  const theme = useTheme();
  const message = useUiStore((state) => state.toastMessage);
  const visible = useUiStore((state) => state.toastVisible);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, { toValue: visible ? 1 : 0, duration: 180, useNativeDriver: true }).start();
  }, [visible, anim]);

  if (!message) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        right: 20,
        bottom: 20,
        zIndex: 80,
        backgroundColor: theme.color.primary,
        paddingVertical: 11,
        paddingHorizontal: 15,
        borderRadius: theme.metrics.radius,
        maxWidth: 460,
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
        ...theme.shadow,
      }}
    >
      <Text style={[s.textSm, { color: theme.color.primaryForeground, fontSize: 13 }]}>{message}</Text>
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
              <Pressable
                style={[
                  s.card,
                  {
                    width: '100%',
                    maxWidth: m.wide ? 900 : 620,
                    maxHeight: height * 0.85,
                    borderRadius: theme.metrics.radius + 2,
                    ...theme.shadow,
                  },
                ]}
                onPress={(e) => e.stopPropagation?.()}
              >
                {m.title ? (
                  <View style={s.cardHead}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.cardHeadTitle}>{m.title}</Text>
                      {m.sub ? <Text style={s.cardHeadSub}>{m.sub}</Text> : null}
                    </View>
                    <IconButton name="close" size={30} iconSize={15} onPress={close} title="닫기" />
                  </View>
                ) : null}

                <ScrollView contentContainerStyle={m.tight ? undefined : s.cardBody}>
                  {typeof m.render === 'function' ? m.render(close) : m.render}
                </ScrollView>

                {m.footer ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      gap: 8,
                      justifyContent: 'flex-end',
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      borderTopWidth: 1,
                      borderTopColor: theme.color.border,
                      flexWrap: 'wrap',
                    }}
                  >
                    {typeof m.footer === 'function' ? m.footer(close) : m.footer}
                  </View>
                ) : null}
              </Pressable>
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
            width: Math.min(380, width * 0.92),
            height: '100%',
            backgroundColor: theme.color.card,
            borderLeftWidth: 1,
            borderLeftColor: theme.color.border,
          }}
          onPress={(e) => e.stopPropagation?.()}
        >
          <View style={[s.cardHead, { paddingVertical: 15 }]}>
            <View style={{ flex: 1 }}>
              <Text style={s.cardHeadTitle}>{drawer.title}</Text>
              {drawer.sub ? <Text style={s.cardHeadSub}>{drawer.sub}</Text> : null}
            </View>
            <IconButton name="close" size={30} iconSize={15} onPress={close} title="닫기" />
          </View>
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            {typeof drawer.render === 'function' ? drawer.render(close) : drawer.render}
          </ScrollView>
        </Pressable>
      </Pressable>
    </RNModal>
  );
}
