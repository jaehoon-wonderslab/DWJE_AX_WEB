/**
 * [View] 자연어 질의 홈 — 로그인 직후 첫 화면의 빈 대화 상태
 *
 * 한 줄 척추(최대 720px) 위에 순서대로 놓입니다.
 *  1. 인사말 — "000님, 좋은 아침입니다."  + 오늘 날짜·소속
 *  2. 브리핑 카드 — 프리셋 3종(불량률 · 공정 현황 · 현재 이슈)을 문장으로. 각 문단은 눌러서 바로 질의할 수 있습니다.
 *  3. 빠른 질의 칩 — 서버가 준 추천 질의
 *
 * 브리핑 카드는 참조의 Briefing Card 규격(#FAFAFA · #DFE1E7 테두리 · 16px 반지름 · ai 스파클 머리글)입니다.
 */
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { LogoMark } from '@shared/components/brand/Logo';
import AiGatherField from '@shared/components/brand/AiGatherField';
import { FONT_FAMILY, useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import Icon from '@shared/components/ui/Icon';

const TONE_DOT = { ok: 'success', warn: 'warning', bad: 'destructive', muted: 'border' };

export default function ChatHome({ briefing, suggestions = [], onAsk }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const { greeting, dept, sections, loading, period, generatedAt } = briefing || {};
  const today = new Date();
  const dateLabel = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일 ${['일', '월', '화', '수', '목', '금', '토'][today.getDay()]}요일`;

  return (
    <View style={{ width: '100%', maxWidth: theme.metrics.contentColumn, alignSelf: 'center', gap: 18, paddingTop: 12 }}>
      {/* 1. 인사말 */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' }}>
          <LogoMark size={28} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.headingLg}>{greeting || '안녕하세요.'}</Text>
          <Text style={[s.bodySm, { marginTop: 6 }]}>
            {dateLabel}
            {dept ? ` · ${dept}` : ''} · 생산 실적, 불량 현황, 로트 이력, 설비 상태를 자연어로 질의하십시오.
          </Text>
        </View>
      </View>

      {/* 2. 브리핑 카드 — 브리핑이 오는 동안 카드 안에 입자가 떠 있다가 문장이 도착하면 흩어집니다 */}
      <View style={{ padding: 16, paddingHorizontal: 18, borderRadius: theme.metrics.radius, borderWidth: 1, borderColor: theme.divider, backgroundColor: theme.surface, position: 'relative', overflow: 'hidden' }}>
        <AiGatherField active={loading && !sections?.length} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: theme.divider }}>
          <Icon name="sparkles" size={15} color={theme.color.primary} />
          <Text style={s.heading2xs}>AI 브리핑</Text>
          <Text style={[s.caption, { marginLeft: 2 }]}>{period?.from && period?.to ? `${period.from} ~ ${period.to}` : ''}</Text>
          <View style={s.spacer} />
          <Text style={s.caption}>{generatedAt ? `${String(generatedAt.getHours()).padStart(2, '0')}:${String(generatedAt.getMinutes()).padStart(2, '0')} 기준` : loading ? '불러오는 중' : ''}</Text>
        </View>

        {loading && !sections?.length ? (
          // 기다림의 신호는 입자 밭이 맡습니다 — 여기서는 글만 둡니다
          <View style={{ paddingVertical: 26, alignItems: 'center' }}>
            <Text style={s.emptyText}>브리핑을 준비하는 중입니다…</Text>
          </View>
        ) : (
          <View style={{ paddingTop: 12, gap: 14 }}>
            {(sections || []).map((sec) => (
              <Pressable
                key={sec.key}
                onPress={() => onAsk?.(sec.query)}
                accessibilityRole="button"
                accessibilityLabel={`${sec.title} 자세히 질의`}
                style={({ hovered }) => ({ borderRadius: theme.metrics.radiusSm, marginHorizontal: -8, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: hovered ? theme.surfaceHover : 'transparent' })}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 99, backgroundColor: theme.color[TONE_DOT[sec.tone] || 'border'] }} />
                  <Text style={{ fontFamily: FONT_FAMILY, fontSize: 16, lineHeight: 17, fontWeight: '600', color: theme.color.primary }}>{sec.title}</Text>
                  <View style={s.spacer} />
                  <Icon name="arrowRight" size={12} color={theme.color.mutedForeground} />
                </View>
                <Text style={[s.body, { marginTop: 4, paddingLeft: 14 }]}>{sec.lines.join('\n')}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* 빠른 질의 칩 */}
        {suggestions.length ? (
          <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.divider }}>
            <Text style={[s.caption, { marginBottom: 8 }]}>빠른 질의</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {suggestions.slice(0, 6).map((x, i) => (
                <Pressable
                  key={x.q}
                  onPress={() => onAsk?.(x.q)}
                  style={({ hovered }) => [s.chip, { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: hovered ? theme.surfaceHover : theme.color.card }]}
                >
                  <View style={{ width: 6, height: 6, borderRadius: 99, backgroundColor: [theme.color.primary, theme.color.info, theme.color.ink500, theme.color.warning][i % 4] }} />
                  <Text style={s.chipText}>{x.q}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
      </View>

      <Text style={[s.caption, { fontFamily: FONT_FAMILY, paddingHorizontal: 4 }]}>
        브리핑의 문단을 누르면 해당 주제를 바로 질의합니다. 답변에는 원천 화면·기간·LOT 근거가 함께 표시되며, 권한 범위를 벗어난 항목은 마스킹됩니다.
      </Text>
    </View>
  );
}

