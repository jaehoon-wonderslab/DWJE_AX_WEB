/**
 * [View] AI-01 자연어 질의 (경로: /ai/chat)
 *
 * 생산 실적 · 불량 현황 · 로트 이력 · 설비 가동 상태를 자연어로 조회합니다.
 * 응답은 blocks 배열(text · table · chart · source · actions)을 종류별 컴포넌트로 그립니다.
 * 사용 API 6건 — /api/v1/ai/chat/*
 */
import React, { useEffect, useRef } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LineChart } from '@shared/components/charts';
import { Badge, BlindValue, Button, Chip, ChipRow, Icon, Loading, Table } from '@shared/components/ui';
import { DEPTS } from '@shared/constants/dataFields';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { FONT_FAMILY, useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';

import ChatHome from './ChatHome';

export default function ChatView({
  messages, followups, input, setInput, pending, suggestions, servingModelVer, askedCount,
  send, newSession, exportAnswer, rate, requestVoice, compact = false, briefing = null,
}) {
  const s = useCommonStyles();
  const theme = useTheme();
  const openDrawer = useUiStore((state) => state.openDrawer);
  const closeDrawer = useUiStore((state) => state.closeDrawer);
  const userInfo = useAuthStore((state) => state.userInfo);
  const scrollRef = useRef(null);

  // 새 메시지가 붙으면 아래로 스크롤합니다
  useEffect(() => {
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(timer);
  }, [messages.length, pending]);

  const showSuggestions = () =>
    openDrawer({
      title: '추천 질의',
      sub: '자주 묻는 질문 · 누르면 바로 질의합니다',
      render: () => (
        <View>
          {suggestions.map((x) => (
            <TouchableOpacity
              key={x.q}
              style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.divider }}
              onPress={() => {
                closeDrawer();
                send(x.q);
              }}
              activeOpacity={0.7}
            >
              <Text style={[s.textSm, { fontWeight: '500' }]}>{x.q}</Text>
              <Text style={[s.textXs, { marginTop: 3 }]}>{x.desc}</Text>
            </TouchableOpacity>
          ))}
          <Text style={[s.sourceText, { marginTop: 14 }]}>현장 빈출 질의 목록이 확보되면 이 항목을 실제 질문으로 교체합니다.</Text>
        </View>
      ),
    });

  const deptAv = DEPTS.find((d) => d.id === userInfo?.dept)?.av || 'ME';

  return (
    <View style={{ flex: 1, minHeight: compact ? 0 : 520 }}>
      {/* 세션 바 */}
      {!compact ? <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: theme.divider,
          marginBottom: 4,
          width: '100%',
          maxWidth: theme.metrics.contentColumn,
          alignSelf: 'center',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: theme.color.successTint }}>
          <View style={{ width: 6, height: 6, borderRadius: 99, backgroundColor: theme.color.success }} />
          <Text style={{ fontFamily: FONT_FAMILY, fontSize: 15.5, fontWeight: '500', color: theme.color.foreground }}>질의 세션 활성</Text>
        </View>
        <Text style={[s.caption, { flexShrink: 1 }]} numberOfLines={1}>
          {`${askedCount ? `질의 ${askedCount}건 · 세션 맥락 유지 중` : '새 대화 · 온프레미스 처리'} · 모델 ${servingModelVer || '—'}`}
        </Text>
        <View style={s.spacer} />
        <Button label="새 대화" size="sm" icon="plus" onPress={newSession} />
        <Button label="추천 질의" size="sm" icon="sparkles" onPress={showSuggestions} />
      </View> : null}

      {/* 대화 영역 */}
      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: compact ? 14 : 18 }}>
        <View style={{ maxWidth: theme.metrics.contentColumn, width: '100%', alignSelf: 'center', gap: 16 }}>
          {!messages.length ? (
            briefing && !compact ? (
              <ChatHome briefing={briefing} suggestions={suggestions} onAsk={send} />
            ) : (
              <EmptyChat suggestions={suggestions} onPick={send} compact={compact} />
            )
          ) : (
            // 질문과 답이 같은 messageId 를 나눠 쓰므로 누가 말했는지와 순번을 함께 키로 씁니다
            messages.map((m, i) => <Message key={`${m.messageId ?? 'm'}-${m.who}-${i}`} message={m} deptAv={deptAv} onExport={exportAnswer} onRate={rate} />)
          )}
          {pending ? <Loading compact text="응답을 생성하는 중입니다…" /> : null}
        </View>
      </ScrollView>

      {/* 입력창 */}
      <View style={{ maxWidth: theme.metrics.contentColumn, width: '100%', alignSelf: 'center', paddingTop: 10 }}>
        {followups.length ? (
          <ChipRow style={{ marginTop: 0, marginBottom: 10 }}>
            {followups.map((q) => (
              <Chip key={q} label={q} onPress={() => send(q)} />
            ))}
          </ChipRow>
        ) : null}

        <View
          style={{
            borderWidth: 1,
            borderColor: theme.divider,
            borderRadius: theme.metrics.radius,
            backgroundColor: theme.color.card,
            paddingHorizontal: 14,
            paddingTop: 12,
            paddingBottom: 10,
          }}
        >
          <TextInput
            style={[s.text, { fontSize: 17, lineHeight: 20, paddingBottom: 10, outlineStyle: 'none' }]}
            placeholder="생산 실적 · 불량 현황 · 로트 이력을 질의하십시오"
            placeholderTextColor={theme.color.mutedForeground}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => send(input)}
            returnKeyType="send"
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MiniButton icon="sparkles" label="추천 질의" onPress={showSuggestions} />
            <MiniButton icon="mic" label="음성" onPress={requestVoice} />
            <View style={s.spacer} />
            <TouchableOpacity
              onPress={() => send(input)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="질의 보내기"
              style={{ height: 32, paddingHorizontal: 14, borderRadius: theme.metrics.radiusAction, backgroundColor: theme.color.primary, flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <Icon name="sparkles" size={14} color={theme.color.primaryForeground} />
              <Text style={{ fontFamily: FONT_FAMILY, fontSize: 16, fontWeight: '600', color: theme.color.primaryForeground }}>질의</Text>
            </TouchableOpacity>
          </View>
        </View>

        {!compact && messages.length ? <Text style={[s.caption, { textAlign: 'center', marginTop: 8 }]}>
          조회 대상 데이터는 질문 의도에 따라 AI 가 자동으로 판단합니다. 답변에는 원천 화면·기간·LOT 근거가 함께 표시되며, 권한 범위를 벗어난 항목은 마스킹됩니다.
        </Text> : null}
      </View>
    </View>
  );
}

function MiniButton({ icon, label, onPress }) {
  const s = useCommonStyles();
  const theme = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        height: 30,
        paddingHorizontal: 11,
        borderRadius: 99,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.07)',
        backgroundColor: theme.color.card,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
      }}
    >
      <Icon name={icon} size={13} color={theme.color.mutedForeground} />
      <Text style={[s.textXs, { fontSize: 16 }]}>{label}</Text>
    </TouchableOpacity>
  );
}

/** 빈 대화 상태 */
function EmptyChat({ suggestions, onPick, compact }) {
  const s = useCommonStyles();
  const theme = useTheme();
  return (
    <View style={{ maxWidth: 760, alignSelf: 'center', paddingTop: compact ? 8 : 40, paddingBottom: 10, width: '100%' }}>
      <Text style={compact ? s.heading2xs : [s.headingXs, { textAlign: 'center' }]}>무엇을 확인해 드릴까요?</Text>
      <Text style={[s.bodySm, { textAlign: compact ? 'left' : 'center', marginTop: compact ? 6 : 10, alignSelf: compact ? 'flex-start' : 'center', maxWidth: 560 }]}>
        생산 실적 · 불량 현황 · 로트 이력 · 설비 가동 상태를 조회합니다. 표와 차트로 정리해 드리고 엑셀로 내려받을 수 있습니다.
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: compact ? 18 : 26 }}>
        {suggestions.map((x) => (
          <TouchableOpacity
            key={x.q}
            onPress={() => onPick(x.q)}
            activeOpacity={0.75}
            style={{
              flexGrow: 1,
              flexBasis: 320,
              borderWidth: 1,
              borderColor: 'rgba(0,0,0,0.07)',
              borderRadius: theme.metrics.radiusSm,
              paddingVertical: 12,
              paddingHorizontal: 14,
              backgroundColor: theme.color.card,
              flexDirection: 'row',
              gap: 11,
              alignItems: 'flex-start',
            }}
          >
            <View style={{ width: 6, height: 6, borderRadius: 99, marginTop: 6, backgroundColor: theme.color.ink500 }} />
            <View style={{ flex: 1 }}>
              <Text style={[s.textSm, { fontWeight: '600', color: theme.color.primary }]}>{x.q}</Text>
              <Text style={[s.textXs, { marginTop: 3 }]}>{x.desc}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

/** 말풍선 하나 */
function Message({ message, deptAv, onExport, onRate }) {
  const s = useCommonStyles();
  const theme = useTheme();

  if (message.who === 'me') {
    return (
      <View style={[s.msg, s.msgMe]}>
        <View style={s.avatarSm}>
          <Text style={s.avatarSmText}>{deptAv}</Text>
        </View>
        <View style={[s.bubble, s.bubbleMe]}>
          <Text style={[s.bubbleText, s.bubbleMeText]}>{message.text}</Text>
        </View>
      </View>
    );
  }

  const denied = message.intent === 'denied';
  const unknown = message.intent === 'unknown';
  const plain = !denied && !unknown;

  return (
    <View style={s.msg}>
      <View style={s.avatarSm}>
        <Text style={s.avatarSmText}>AI</Text>
      </View>
      <View
        style={[
          s.bubble,
          denied && s.bubbleDeny,
          unknown && s.bubbleUnknown,
          // 일반 응답은 말풍선 테두리 없이 본문처럼 보여 줍니다
          plain && { borderWidth: 0, backgroundColor: 'transparent', paddingHorizontal: 0, paddingVertical: 0 },
          { flex: 1 },
        ]}
      >
        {(message.blocks || []).length ? (
          (message.blocks || []).map((b, i) => (
            <Block key={i} block={b} messageId={message.messageId} onExport={onExport} onRate={onRate} />
          ))
        ) : (
          // 블록이 없는 응답 — 서버의 answerHtml(또는 text)을 글로 보여 줍니다
          <Text style={[s.bubbleText, { marginBottom: 8 }]}>{plainText(message.answerHtml || message.text || message.answer) || '응답 내용이 없습니다.'}</Text>
        )}

        {message.sources?.length ? (
          <View style={[s.source, { marginBottom: 4 }]}>
            <Text style={s.sourceText}>근거: {message.sources.map(labelOf).filter(Boolean).join(' · ')}</Text>
          </View>
        ) : null}

        {message.agents?.length || message.elapsedMs ? (
          <View style={[s.chips, { marginTop: 10 }]}>
            {(message.agents || []).map((a, i) => (
              <Badge key={`${labelOf(a)}-${i}`}>{labelOf(a)}</Badge>
            ))}
            {message.elapsedMs ? <Badge>{`${(message.elapsedMs / 1000).toFixed(1)}초`}</Badge> : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

/**
 * 서버가 문자열 대신 객체로 주는 항목({ no } · { name } · { q } …)을 글자 하나로 만듭니다.
 * 객체를 그대로 <Text> 에 넣으면 React 가 던집니다(2026-09-09 실측: agents 가 [{ no: '②' }]).
 */
function labelOf(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  if (typeof v === 'object') {
    const picked = v.name ?? v.label ?? v.title ?? v.agent ?? v.q ?? v.text ?? v.no ?? v.id;
    return picked === undefined ? '' : String(picked);
  }
  return String(v);
}

/** HTML 문자열에서 태그를 걷어내고 글만 남깁니다 (줄바꿈 태그는 줄바꿈으로) */
function plainText(html) {
  if (!html) return '';
  return String(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** 응답 블록 종류별 렌더링 */
function Block({ block, messageId, onExport, onRate }) {
  const s = useCommonStyles();
  const theme = useTheme();

  if (block.type === 'text') {
    return <Text style={[s.bubbleText, { marginBottom: 8 }]}>{block.text}</Text>;
  }

  if (block.type === 'table') {
    return (
      <View style={{ marginTop: 4, marginBottom: 8 }}>
        <Table
          columns={block.head.map((h, i) => ({
            key: `c${i}`,
            title: h,
            flex: i === 1 ? 1.4 : 1,
            align: i >= 2 ? 'right' : 'left',
            render: (row) => {
              const field = block.blindColumns?.[i];
              return <BlindValue field={field} value={row[`c${i}`]} textStyle={[s.td, i >= 2 && s.num, { fontSize: 16 }]} />;
            },
          }))}
          rows={block.rows.map((r) => Object.fromEntries(r.map((v, i) => [`c${i}`, v])))}
          keyExtractor={(r, i) => `${i}`}
        />
      </View>
    );
  }

  if (block.type === 'chart' && block.chart === 'line') {
    return (
      <View style={{ marginTop: 4, marginBottom: 8 }}>
        <LineChart labels={block.labels} series={block.series} min={block.min} max={block.max} height={170} />
      </View>
    );
  }

  if (block.type === 'source') {
    return (
      <View style={[s.source, { marginBottom: 4 }]}>
        <Text style={s.sourceText}>{block.text}</Text>
      </View>
    );
  }

  if (block.type === 'actions') {
    return (
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
        <Button label="엑셀 다운로드" size="sm" icon="download" onPress={() => onExport(messageId)} />
        <Button label="유용함" size="sm" icon="thumbsUp" onPress={() => onRate(messageId, 'good')} />
        <Button label="개선 필요" size="sm" icon="thumbsDown" onPress={() => onRate(messageId, 'bad')} />
      </View>
    );
  }

  return null;
}
