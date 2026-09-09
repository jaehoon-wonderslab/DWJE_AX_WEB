/**
 * 현재 업무 화면 옆에서 함께 사용하는 AI 질의 레일 패널입니다.
 * 기존 자연어 질의 컨트롤러와 응답 렌더러를 그대로 사용해 별도 데모 기능을 만들지 않습니다.
 *
 *  · 레일 모드(기본): 본문 패널 옆에 떠 있는 별도의 흰 패널. 너비는 최소·중간 두 단계.
 *  · 작업 모드(full / 좁은 화면): 본문 패널 안을 가득 채웁니다.
 * 머리에는 「질의 세션 활성」 캡슐(유일한 틴트 캡슐)과 현재 화면 맥락이 놓입니다.
 */
import React from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useChatController } from '@domains/ai/controller/useChatController';
import ChatView from '@domains/ai/view/ChatView';
import { pageGroup, pageName } from '@shared/constants/menu';
import { useAppNavigation } from '@shared/hooks/useAppNavigation';
import { hubGroupOf } from '@shared/navigation/routes';
import { useUiStore } from '@shared/stores/useUiStore';
import { FONT_FAMILY, useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { IconButton } from '../ui/Button';
import Icon from '../ui/Icon';

const SIZE_LABELS = [
  ['compact', '최소'],
  ['medium', '중간'],
  ['full', '전체'],
];

export default function AiChatPanelHost({ workspaceMode = false }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { currentScreenId, pathname } = useAppNavigation();
  const size = useUiStore((state) => state.aiChatSize);
  const close = useUiStore((state) => state.closeAiChat);
  const setSize = useUiStore((state) => state.setAiChatSize);
  const chat = useChatController({ consumeRouteQuery: false });

  const actualSize = workspaceMode ? 'full' : size;
  const panelWidth = actualSize === 'medium' ? Math.min(560, width * 0.4) : Math.min(380, width * 0.32);
  const hubGroup = hubGroupOf(pathname);
  const screenName = hubGroup || pageName(currentScreenId);
  const contextName = hubGroup || `${pageGroup(currentScreenId)} › ${screenName}`;
  const contextQuestions = [
    `${screenName} 화면에서 무엇을 확인할 수 있는지 알려줘`,
    `${screenName} 화면의 현재 데이터를 분석해서 요약해줘`,
  ];

  const body = (
    <>
      {/* 고정 헤더 — 세션 캡슐 · 맥락 · 크기 · 동작 */}
      <View style={{ minHeight: theme.metrics.topbarHeight, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: theme.divider, backgroundColor: theme.color.card }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: theme.color.successTint }}>
          <View style={{ width: 6, height: 6, borderRadius: 99, backgroundColor: theme.color.success }} />
          <Text style={{ fontFamily: FONT_FAMILY, fontSize: 11.5, fontWeight: '500', color: theme.color.foreground }}>질의 세션 활성</Text>
        </View>
        <Text style={[s.caption, { flex: 1, minWidth: 40 }]} numberOfLines={1}>{contextName}</Text>
        {width >= 1000 && !workspaceMode ? (
          <View style={{ flexDirection: 'row', padding: 2, borderRadius: 999, backgroundColor: theme.surfaceHover }}>
            {SIZE_LABELS.map(([value, label]) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityLabel={`${label} 너비`}
                onPress={() => setSize(value)}
                style={{ paddingVertical: 4, paddingHorizontal: 9, borderRadius: 999, backgroundColor: size === value ? theme.color.card : 'transparent' }}
              >
                <Text style={[s.caption, { color: size === value ? theme.color.primary : theme.color.mutedForeground, fontWeight: size === value ? '600' : '500' }]}>{label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {workspaceMode ? <IconButton name="chevronDown" size={34} iconSize={15} onPress={() => setSize('medium')} title="레일로 줄이기" /> : null}
        <IconButton name="plus" size={34} iconSize={15} onPress={chat.newSession} title="새 대화" />
        <IconButton name="close" size={34} iconSize={15} onPress={close} title="AI 질의 닫기" />
      </View>

      <View style={{ flex: 1, width: '100%', maxWidth: actualSize === 'full' ? theme.metrics.contentColumn : undefined, alignSelf: 'center', paddingHorizontal: actualSize === 'full' ? 24 : 16, paddingVertical: 14 }}>
        {!chat.messages.length ? (
          <View style={{ marginBottom: 6 }}>
            <Text style={s.caption}>현재 보고 있는 화면에서 바로 질의하실 수 있습니다.</Text>
            <View style={{ gap: 6, marginTop: 8 }}>
              {contextQuestions.map((question) => (
                <Pressable
                  key={question}
                  onPress={() => chat.send(question)}
                  style={({ hovered }) => ({ minHeight: 38, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(0,0,0,0.07)', borderRadius: theme.metrics.radiusSm, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: hovered ? theme.surfaceHover : theme.color.card })}
                >
                  <View style={{ width: 6, height: 6, borderRadius: 99, backgroundColor: theme.color.ink500 }} />
                  <Text style={[s.chipText, { flex: 1 }]}>{question.replace(`${screenName} 화면`, '이 화면')}</Text>
                  <Icon name="arrowRight" size={12} color={theme.color.mutedForeground} />
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
        <ChatView {...chat} compact />
      </View>
    </>
  );

  if (workspaceMode) {
    return (
      <View accessibilityLabel="AI 질의 작업 패널" style={{ flex: 1, minHeight: 0 }}>
        {body}
      </View>
    );
  }

  return (
    <View accessibilityLabel="AI 질의 레일 패널" style={[s.panel, { width: panelWidth, minWidth: 320, flexShrink: 0 }]}>
      {body}
    </View>
  );
}
