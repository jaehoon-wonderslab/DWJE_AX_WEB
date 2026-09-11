/**
 * 덕파트장 AI 레일 패널 — 업무 화면 옆에서 함께 쓰는 AI 채팅
 *
 * 기존 자연어 질의 컨트롤러와 응답 렌더러를 그대로 사용해 별도 데모 기능을 만들지 않습니다.
 *  · 본문 패널 오른쪽에 떠 있는 흰 패널. 폭은 레이아웃의 드래그 핸들로 조절(최소 320px · 최대 창 폭의 40%).
 *  · 머리에는 「질의 세션 활성」 캡슐 · 현재 화면 맥락 · 「새 대화」 · 닫기 단추만 둡니다.
 *    (2026-09-10: 최소/중간/전체 크기 단추와 + 단추는 제거)
 *  · 닫으면 레이아웃이 본문 오른쪽에 세로 단추를 붙여 다시 열 수 있게 합니다.
 */
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useChatController } from '@domains/ai/controller/useChatController';
import ChatView from '@domains/ai/view/ChatView';
import { pageGroup, pageName } from '@shared/constants/menu';
import { useAppNavigation } from '@shared/hooks/useAppNavigation';
import { hubGroupOf } from '@shared/navigation/routes';
import { useUiStore } from '@shared/stores/useUiStore';
import { FONT_FAMILY, useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import AiLiveDot from '../brand/AiLiveDot';
import { IconButton } from '../ui/Button';
import Icon from '../ui/Icon';

export default function AiChatPanelHost({ width = 400 }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const { currentScreenId, pathname } = useAppNavigation();
  const close = useUiStore((state) => state.closeAiChat);
  const chat = useChatController({ consumeRouteQuery: false });

  const hubGroup = hubGroupOf(pathname);
  const screenName = hubGroup || pageName(currentScreenId);
  const contextName = hubGroup || `${pageGroup(currentScreenId)} › ${screenName}`;
  const contextQuestions = [
    `${screenName} 화면에서 무엇을 확인할 수 있는지 알려줘`,
    `${screenName} 화면의 현재 데이터를 분석해서 요약해줘`,
  ];

  return (
    <View accessibilityLabel="덕파트장 AI 레일 패널" style={[s.panel, { width, minWidth: 320, flexShrink: 0 }]}>
      {/* 고정 헤더 — 세션 캡슐 · 맥락 · 새 대화 · 닫기 */}
      <View style={{ minHeight: theme.metrics.topbarHeight, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: theme.divider, backgroundColor: theme.color.card }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 11, borderRadius: 999, backgroundColor: theme.color.successTint }}>
          <AiLiveDot size={14} />
          <Text style={{ fontFamily: FONT_FAMILY, fontSize: 15.5, fontWeight: '500', color: theme.color.foreground }}>덕파트장 AI</Text>
        </View>
        <Text style={[s.caption, { flex: 1, minWidth: 40 }]} numberOfLines={1}>{contextName}</Text>
        {chat.messages.length ? (
          <Pressable onPress={chat.newSession} accessibilityRole="button" accessibilityLabel="새 대화" style={({ hovered }) => ({ paddingVertical: 5, paddingHorizontal: 8, borderRadius: theme.metrics.radiusXs, backgroundColor: hovered ? theme.surface : 'transparent' })}>
            <Text style={[s.caption, { color: theme.color.info, fontWeight: '600' }]}>새 대화</Text>
          </Pressable>
        ) : null}
        <IconButton name="close" size={34} iconSize={15} onPress={close} title="AI 패널 닫기" />
      </View>

      <View style={{ flex: 1, width: '100%', paddingHorizontal: 16, paddingVertical: 14 }}>
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
    </View>
  );
}
