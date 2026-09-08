/**
 * 현재 업무 화면 위에서 여는 전역 AI 채팅 패널입니다.
 * 기존 자연어 질의 컨트롤러와 응답 렌더러를 그대로 사용해 별도 데모 기능을 만들지 않습니다.
 */
import React from 'react';
import { Pressable, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useChatController } from '@domains/ai/controller/useChatController';
import ChatView from '@domains/ai/view/ChatView';
import { pageGroup, pageName } from '@shared/constants/menu';
import { useAppNavigation } from '@shared/hooks/useAppNavigation';
import { hubGroupOf } from '@shared/navigation/routes';
import { useUiStore } from '@shared/stores/useUiStore';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { IconButton } from '../ui/Button';
import Icon from '../ui/Icon';

const SIZE_LABELS = [
  ['compact', '최소'],
  ['medium', '중간'],
  ['full', '전체'],
];

export default function AiChatPanelHost() {
  const s = useCommonStyles();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { currentScreenId, pathname } = useAppNavigation();
  const open = useUiStore((state) => state.aiChatOpen);
  const size = useUiStore((state) => state.aiChatSize);
  const close = useUiStore((state) => state.closeAiChat);
  const setSize = useUiStore((state) => state.setAiChatSize);
  const chat = useChatController({ consumeRouteQuery: false });

  if (!open) return null;

  const actualSize = width < 720 ? 'full' : size;
  const panelWidth = actualSize === 'full' ? width : actualSize === 'medium' ? Math.min(720, width * 0.68) : Math.min(430, width * 0.92);
  const hubGroup = hubGroupOf(pathname);
  const screenName = hubGroup || pageName(currentScreenId);
  const contextName = hubGroup || `${pageGroup(currentScreenId)} > ${screenName}`;
  const contextQuestions = [
    `${screenName} 화면에서 무엇을 확인할 수 있는지 알려줘`,
    `${screenName} 화면의 현재 데이터를 분석해서 요약해줘`,
  ];

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', inset: 0, zIndex: 70 }}>
      <Pressable
        accessibilityLabel="AI 채팅 배경"
        onPress={close}
        style={{ position: 'absolute', inset: 0, backgroundColor: actualSize === 'full' ? theme.color.background : theme.drawerOverlay }}
      />
      <View
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: panelWidth, backgroundColor: theme.color.background, borderLeftWidth: actualSize === 'full' ? 0 : 1, borderLeftColor: theme.color.border, ...theme.shadow }}
      >
          <View style={{ minHeight: 58, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: theme.color.border }}>
            <View style={{ flex: 1, minWidth: 90 }}>
              <Text style={[s.textSm, { fontWeight: '700' }]}>AI 채팅</Text>
              <Text style={s.textXs} numberOfLines={1}>{contextName}</Text>
            </View>
            {width >= 720 ? (
              <View style={{ flexDirection: 'row', padding: 2, borderRadius: 8, backgroundColor: theme.color.secondary }}>
                {SIZE_LABELS.map(([value, label]) => (
                  <TouchableOpacity
                    key={value}
                    accessibilityRole="button"
                    accessibilityLabel={`${label} 너비`}
                    onPress={() => setSize(value)}
                    style={{ paddingVertical: 5, paddingHorizontal: 7, borderRadius: 6, backgroundColor: size === value ? theme.color.card : 'transparent' }}
                  >
                    <Text style={[s.textXs, { color: size === value ? theme.color.foreground : theme.color.mutedForeground }]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
            <IconButton name="plus" size={30} iconSize={14} onPress={chat.newSession} title="새 대화" />
            <IconButton name="close" size={30} iconSize={14} onPress={close} title="닫기" />
          </View>

          <View style={{ flex: 1, paddingHorizontal: actualSize === 'full' ? Math.max(20, (width - 900) / 2) : 16, paddingVertical: 12 }}>
            {!chat.messages.length ? (
              <View style={{ marginBottom: 4 }}>
                <Text style={s.textXs}>현재 보고 있는 화면에서 바로 물어볼 수 있습니다.</Text>
                <View style={{ gap: 8, marginTop: 9 }}>
                  {contextQuestions.map((question) => (
                    <TouchableOpacity
                      key={question}
                      onPress={() => chat.send(question)}
                      activeOpacity={0.72}
                      style={{ minHeight: 40, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: theme.color.border, borderRadius: theme.metrics.radius, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.color.card }}
                    >
                      <Icon name="sparkles" size={14} color={theme.color.primary} />
                      <Text style={[s.textSm, { flex: 1, fontWeight: '500' }]}>{question.replace(`${screenName} 화면`, '이 화면')}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null}
            <ChatView {...chat} compact />
          </View>
      </View>
    </View>
  );
}
