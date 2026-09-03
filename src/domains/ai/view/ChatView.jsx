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
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';

export default function ChatView({
  messages, followups, input, setInput, pending, suggestions, servingModelVer, askedCount,
  send, newSession, exportAnswer, rate, requestVoice,
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
              style={{ paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: theme.color.border }}
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
    <View style={{ flex: 1, minHeight: 520 }}>
      {/* 세션 바 */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: theme.color.border,
          marginBottom: 4,
        }}
      >
        <View>
          <Text style={[s.textSm, { fontWeight: '600' }]}>자연어 질의</Text>
          <Text style={[s.textXs, { marginTop: 2 }]}>
            {`${askedCount ? `질의 ${askedCount}건 · 세션 맥락 유지 중` : '새 대화 · 온프레미스 처리'} · 모델 ${servingModelVer || '—'}`}
          </Text>
        </View>
        <View style={s.spacer} />
        <Button label="새 대화" size="sm" icon="plus" onPress={newSession} />
        <Button label="추천 질의" size="sm" icon="sparkles" onPress={showSuggestions} />
      </View>

      {/* 대화 영역 */}
      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 22 }}>
        <View style={{ maxWidth: 840, width: '100%', alignSelf: 'center', gap: 20 }}>
          {!messages.length ? (
            <EmptyChat suggestions={suggestions} onPick={send} />
          ) : (
            messages.map((m, i) => <Message key={m.messageId || i} message={m} deptAv={deptAv} onExport={exportAnswer} onRate={rate} />)
          )}
          {pending ? <Loading compact text="응답을 생성하는 중입니다…" /> : null}
        </View>
      </ScrollView>

      {/* 입력창 */}
      <View style={{ maxWidth: 840, width: '100%', alignSelf: 'center', paddingTop: 10 }}>
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
            borderColor: theme.color.input,
            borderRadius: 16,
            backgroundColor: theme.color.card,
            paddingHorizontal: 14,
            paddingTop: 12,
            paddingBottom: 10,
          }}
        >
          <TextInput
            style={[s.text, { fontSize: 14, paddingBottom: 8, outlineStyle: 'none' }]}
            placeholder="생산 실적 · 불량 현황 · 로트 이력을 물어보세요"
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
              activeOpacity={0.8}
              style={{ width: 32, height: 32, borderRadius: 99, backgroundColor: theme.color.primary, alignItems: 'center', justifyContent: 'center' }}
            >
              <Icon name="arrowUp" size={16} color={theme.color.primaryForeground} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[s.textXs, { textAlign: 'center', marginTop: 8 }]}>
          조회 대상 데이터는 질문 의도에 따라 AI 가 자동으로 판단합니다. 답변에는 원천 화면·기간·LOT 근거가 함께 표시되며, 권한 범위를 벗어난 항목은 마스킹됩니다.
        </Text>
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
        paddingHorizontal: 10,
        borderRadius: 99,
        borderWidth: 1,
        borderColor: theme.color.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
      }}
    >
      <Icon name={icon} size={13} color={theme.color.mutedForeground} />
      <Text style={[s.textXs, { fontSize: 12 }]}>{label}</Text>
    </TouchableOpacity>
  );
}

/** 빈 대화 상태 */
function EmptyChat({ suggestions, onPick }) {
  const s = useCommonStyles();
  const theme = useTheme();
  return (
    <View style={{ maxWidth: 760, alignSelf: 'center', paddingTop: 40, paddingBottom: 10, width: '100%' }}>
      <Text style={[s.pageTitle, { fontSize: 22, textAlign: 'center' }]}>무엇을 확인해 드릴까요?</Text>
      <Text style={[s.textSm, { color: theme.color.mutedForeground, textAlign: 'center', marginTop: 8 }]}>
        생산 실적 · 불량 현황 · 로트 이력 · 설비 가동 상태를 조회합니다. 표와 차트로 정리해 드리고 엑셀로 내려받을 수 있습니다.
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 26 }}>
        {suggestions.map((x) => (
          <TouchableOpacity
            key={x.q}
            onPress={() => onPick(x.q)}
            activeOpacity={0.75}
            style={{
              flexGrow: 1,
              flexBasis: 320,
              borderWidth: 1,
              borderColor: theme.color.border,
              borderRadius: theme.metrics.radius,
              paddingVertical: 13,
              paddingHorizontal: 15,
              backgroundColor: theme.color.card,
              flexDirection: 'row',
              gap: 11,
              alignItems: 'flex-start',
            }}
          >
            <Icon name="message" size={15} color={theme.color.mutedForeground} />
            <View style={{ flex: 1 }}>
              <Text style={[s.textSm, { fontWeight: '600' }]}>{x.q}</Text>
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
        {(message.blocks || []).map((b, i) => (
          <Block key={i} block={b} messageId={message.messageId} onExport={onExport} onRate={onRate} />
        ))}

        {message.agents?.length ? (
          <View style={[s.chips, { marginTop: 10 }]}>
            {message.agents.map((a) => (
              <Badge key={a}>{a}</Badge>
            ))}
            {message.elapsedMs ? <Badge>{`${(message.elapsedMs / 1000).toFixed(1)}초`}</Badge> : null}
          </View>
        ) : null}
      </View>
    </View>
  );
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
      <View style={{ marginTop: 4, marginBottom: 8, borderWidth: 1, borderColor: theme.color.border, borderRadius: theme.metrics.radius, overflow: 'hidden' }}>
        <Table
          columns={block.head.map((h, i) => ({
            key: `c${i}`,
            title: h,
            flex: i === 1 ? 1.4 : 1,
            align: i >= 2 ? 'right' : 'left',
            render: (row) => {
              const field = block.blindColumns?.[i];
              return <BlindValue field={field} value={row[`c${i}`]} textStyle={[s.td, i >= 2 && s.num, { fontSize: 12 }]} />;
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
