/**
 * [View 부품] 자연어 질의 이력(SY-08, /history/chat) · 전사 자연어 질의 이력(SY-18, /system/chat-history) 공용
 *
 * 2026-10-03 (2차) — 두 화면이 같이 쓰는 칸 · 패널을 한곳에 둡니다.
 *  · 권한 밖 응답 배지(HiddenBadge · HiddenNote)
 *  · LLM 메타 칸 — 모델 · 토큰 · 답변 상태 · 근거 문서. 서버가 아직 안 주면 '—'(V71)
 *  · 세션 대화 패널(SessionDetail) — 질문(오른쪽 말풍선) · 응답(왼쪽 말풍선) 시간순, focusId 질의 강조
 */
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Badge, Button, Card, FormAlert, Loading } from '@shared/components/ui';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { docCountNote, docGroups, docLine, finishText, secText, shortTs, tokenText, tokenTitle } from '../controller/useChatHistoryController';

export const HIDDEN_BADGE = '권한 밖 응답';
/** 답변 평가 기준 (08 CHH-11) — 모든 행이 같은 상수라 표 열로 두지 않습니다 */
export const CRITERIA = '질문에 직접 답했는지 · 판단 근거와 일치하는지 · 미응답 사유를 명확히 밝혔는지';
/** 평가 배지 색 — 유용(USEFUL)만 초록, 나머지(재질의·오답)는 주황 */
export const ratingTone = (rating) => (rating === 'USEFUL' || rating === '유용' ? 'green' : 'amber');

/** 표 칸의 「권한 밖 응답」 배지 — 사유는 접근성 라벨로 함께 읽힙니다 */
export function HiddenBadge({ reason, showReason = true }) {
  const s = useCommonStyles();
  return (
    <View accessibilityLabel={`${HIDDEN_BADGE}${reason ? ` — ${reason}` : ''}`} style={{ gap: 4, alignItems: 'flex-start' }}>
      <Badge>{HIDDEN_BADGE}</Badge>
      {reason && showReason ? <Text style={s.textXs} numberOfLines={2}>{reason}</Text> : null}
    </View>
  );
}

export function HiddenNote({ text }) {
  const s = useCommonStyles();
  return (
    <View style={{ gap: 4, alignItems: 'flex-start' }}>
      <Badge>{HIDDEN_BADGE}</Badge>
      <Text style={s.textSm}>{text}</Text>
    </View>
  );
}

/** 모델 칸 */
export function ModelCell({ row }) {
  const s = useCommonStyles();
  return <Text style={[s.td, s.mono]} numberOfLines={1}>{row.llmModel || '—'}</Text>;
}

/** 토큰 칸 — 「입력 n · 출력 m」, 마우스를 올리면 합계 */
export function TokenCell({ row }) {
  const s = useCommonStyles();
  const title = tokenTitle(row);
  // 웹 전용 화면이라 마우스 올림 안내는 DOM title 로 둡니다(RN View 는 title 을 넘기지 않습니다)
  return (
    <Text style={[s.td, s.num]} numberOfLines={1}>
      <span title={title || undefined}>{tokenText(row)}</span>
    </Text>
  );
}

/** 답변 상태 칸 — length(잘림)만 주황 배지로 눈에 띄게 둡니다 */
export function FinishCell({ row }) {
  const s = useCommonStyles();
  if (row.finishReason === 'length') return <Badge tone="amber">{finishText(row.finishReason)}</Badge>;
  return <Text style={s.td} numberOfLines={1}>{finishText(row.finishReason)}</Text>;
}

/** 근거 문서 칸 — 같은 제목은 한 줄로 묶고(쪽 모음 · 최고 점수), 조각 수가 더 많으면 「근거 n건」 */
export function DocsCell({ row }) {
  const s = useCommonStyles();
  const groups = docGroups(row.docs || []);
  if (!groups.length) return <Text style={s.td}>—</Text>;
  const note = docCountNote(row);
  return (
    <View style={{ gap: 2 }}>
      {groups.map((d) => <Text key={d.title} style={s.textXs} numberOfLines={1}>{docLine(d)}</Text>)}
      {note ? <Text style={[s.textXs, { opacity: 0.7 }]}>{note}</Text> : null}
    </View>
  );
}

/**
 * 세션 대화 패널 — 질문(오른쪽 말풍선)·응답(왼쪽 말풍선)을 시간순으로 그립니다(08 CHH-18).
 * focusId 질의는 테두리로 강조합니다. onOpenMessage 가 있으면 응답 아래 「질의 상세 ›」 를 둡니다(전사 화면).
 * showReview — 관리자 검토 값도 함께 적습니다(전사 화면).
 */
export function SessionDetail({ session, error, loading, focusId, side, ratingLabel, title, onClose, onExport, onOpenMessage, showReview = false }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const turns = session?.turns || [];
  const range = session ? `${shortTs(session.startedAt)} ~ ${String(session.lastAskedAt || '').slice(11, 16)} · 질의 ${turns.length}건` : '';
  return (
    <Card
      title={session ? title || '대화' : '대화'}
      sub={range}
      right={
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {turns.length ? <Button label="이 대화 내려받기" size="sm" icon="download" onPress={onExport} /> : null}
          <Button label={side ? '닫기' : '목록으로'} size="sm" onPress={onClose} />
        </View>
      }
      style={side ? { width: 480, flexShrink: 0 } : { alignSelf: 'stretch' }}
    >
      {loading && !session ? <Loading compact /> : null}
      {error ? <FormAlert tone="error">{error}</FormAlert> : null}
      <View style={{ gap: 14 }}>
        {turns.map((t) => {
          const focused = focusId && String(t.messageId) === String(focusId);
          const meta = [
            secText(t.responseSec),
            `평가 ${t.rating ? ratingLabel(t.rating) : '—'}`,
            showReview ? `검토 ${t.review ? ratingLabel(t.review) : '—'}` : '',
            t.llmModel || '',
            t.finishReason === 'length' ? finishText(t.finishReason) : '',
          ].filter(Boolean).join(' · ');
          return (
            <View
              key={t.messageId}
              accessibilityLabel={focused ? '선택한 질의' : undefined}
              style={{
                gap: 6,
                padding: focused ? 8 : 0,
                borderRadius: theme.metrics.radiusSm,
                borderWidth: focused ? 2 : 0,
                borderColor: focused ? theme.color.primary : 'transparent',
              }}
            >
              <View style={{ alignSelf: 'flex-end', maxWidth: '88%', padding: 10, borderRadius: 12, backgroundColor: theme.alpha('primary', 0.08) }}>
                <Text style={s.textXs}>{shortTs(t.askedAt)}</Text>
                <Text style={[s.textSm, { lineHeight: 21 }]}>{t.question}</Text>
              </View>
              <View style={{ alignSelf: 'flex-start', maxWidth: '92%', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: theme.hairline || theme.color.border, backgroundColor: theme.color.card }}>
                {t.answerHidden ? (
                  <HiddenNote text={t.answerHiddenReason || '질의자보다 데이터 접근 권한이 좁아 응답을 표시하지 않습니다'} />
                ) : (
                  <Text style={[s.textSm, { lineHeight: 21 }]} numberOfLines={8}>{t.answer || (t.unansweredReason ? `미응답 — ${t.unansweredReason}` : '응답 생성 중입니다.')}</Text>
                )}
                <Text style={[s.textXs, { marginTop: 6 }]}>{meta}</Text>
                {onOpenMessage ? (
                  <Pressable accessibilityRole="link" onPress={() => onOpenMessage(t)}>
                    <Text style={[s.textXs, { color: theme.color.primary, marginTop: 4 }]}>질의 상세 ›</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        })}
        {session && !turns.length ? <Text style={s.caption}>이 대화에 남은 질의가 없습니다(보존 기간이 지나 삭제되었을 수 있습니다).</Text> : null}
      </View>
    </Card>
  );
}
