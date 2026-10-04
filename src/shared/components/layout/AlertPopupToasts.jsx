/**
 * 시스템 팝업 알림 토스트 — 화면 오른쪽 위에 5초 동안 띄웁니다 (2026-10-04)
 *
 *  · 발송 채널 「시스템 팝업(POPUP)」 으로 **나에게** 온 알림만 띄웁니다(GET /alerts/popups).
 *    알림 엔진이 팝업 발송 기록을 남기면 다음 주기(1분)에 뜹니다.
 *  · 아래쪽 막대가 5초 동안 줄어들고, 다 줄면 닫힙니다. 마우스를 올리면 멈추고 내리면 이어 갑니다.
 *  · 누르면 알림 목록(/alert/list?alertId=)으로 가서 그 알림 상세를 엽니다. × 로 바로 닫을 수 있습니다.
 *  · 여러 건이 오면 위에서 아래로 쌓입니다(최대 5건 — 그 뒤는 서버가 다음 주기에 줍니다).
 *
 * 화면은 `AlertBell` 이 그립니다 — 같은 주기로 배지도 함께 다시 셉니다.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, Text, View } from 'react-native';
import { alertLevelTone } from '@domains/alert/model/alertRepository';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import Icon from '../ui/Icon';

// 웹은 body 에 바로 그립니다 — 상단바 안에 두면 바깥 상자(overflow · transform)에 잘려 보이지 않습니다
const createPortal = Platform.OS === 'web' ? require('react-dom').createPortal : null;

/** 토스트가 떠 있는 시간 */
export const POPUP_TOAST_MS = 5000;

function PopupToast({ item, onClose, onOpen }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const progress = useRef(new Animated.Value(1)).current;
  const anim = useRef(null);
  const [hovered, setHovered] = useState(false);

  // 남은 비율만큼 이어서 줄입니다 — 마우스를 올리면 멈춥니다
  useEffect(() => {
    if (hovered) {
      anim.current?.stop();
      return undefined;
    }
    let remain = 1;
    progress.stopAnimation((v) => { remain = v; });
    anim.current = Animated.timing(progress, {
      toValue: 0,
      duration: Math.max(0, POPUP_TOAST_MS * remain),
      easing: Easing.linear,
      useNativeDriver: false,
    });
    anim.current.start(({ finished }) => { if (finished) onClose(); });
    return () => anim.current?.stop();
  }, [hovered]); // eslint-disable-line react-hooks/exhaustive-deps

  const tone = alertLevelTone(item.level);
  const color = tone === 'red' ? theme.color.destructive : tone === 'amber' ? theme.color.warning : theme.color.info;
  const meta = [item.eqptNm || item.eqptCd, item.condNm, item.occurredAt].filter(Boolean).join(' · ');

  return (
    <View
      accessibilityRole="alert"
      testID="alert-popup-toast"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 340,
        backgroundColor: theme.color.popover,
        borderWidth: 1,
        borderColor: theme.hairlineStrong,
        borderLeftWidth: 4,
        borderLeftColor: color,
        borderRadius: theme.metrics.radius,
        overflow: 'hidden',
        ...theme.shadow,
      }}
    >
      <Pressable onPress={onOpen} style={{ flexDirection: 'row', gap: 10, paddingVertical: 11, paddingLeft: 12, paddingRight: 8 }}>
        <Icon name="bell" size={16} color={color} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[s.caption, { color, fontWeight: '700' }]}>{item.levelNm || '이상 알림'}</Text>
            {item.test ? <Text style={[s.caption, { color: theme.color.info }]}>테스트</Text> : null}
          </View>
          <Text style={[s.listTitle, { marginTop: 2 }]} numberOfLines={2}>{item.title || '이상 알림'}</Text>
          {meta ? <Text style={[s.caption, { marginTop: 3 }]} numberOfLines={1}>{meta}</Text> : null}
        </View>
        <Pressable onPress={onClose} accessibilityLabel="알림 닫기" hitSlop={8} style={{ padding: 2 }}>
          <Icon name="close" size={14} color={theme.color.mutedForeground || theme.color.muted} />
        </Pressable>
      </Pressable>
      {/* 남은 시간 — 5초 동안 왼쪽으로 줄어듭니다 */}
      <View style={{ height: 3, backgroundColor: theme.divider }}>
        <Animated.View
          testID="alert-popup-progress"
          style={{
            height: 3,
            backgroundColor: color,
            width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          }}
        />
      </View>
    </View>
  );
}

/**
 * @param {{items:Array, onClose:(sendId)=>void, onOpen:(item)=>void}} props
 */
export default function AlertPopupToasts({ items = [], onClose, onOpen }) {
  if (!items.length) return null;
  const stack = (
    <View
      pointerEvents="box-none"
      style={{ position: 'fixed', top: 72, right: 20, zIndex: 80, gap: 10, alignItems: 'flex-end' }}
    >
      {items.map((it) => (
        <PopupToast key={it.sendId} item={it} onClose={() => onClose(it.sendId)} onOpen={() => onOpen(it)} />
      ))}
    </View>
  );
  return createPortal && typeof document !== 'undefined' ? createPortal(stack, document.body) : stack;
}

