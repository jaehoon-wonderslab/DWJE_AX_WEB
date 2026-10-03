/**
 * [View] SY-08 자연어 질의 이력 (경로: /history/chat · 화면 ID chat-history · 대그룹 「자연어 질의 이력」)
 *
 * 2026-10-03 — 로그인한 계정 본인의 질의와 AI 응답만 봅니다(scope=mine).
 * 모든 사용자의 이력 · 세션 목록 · 관리 기능은 시스템관리 > 전사 자연어 질의 이력(/system/chat-history, 관리자 전용)으로 옮겼습니다.
 *
 * 2026-10-03 (2차)
 *  · 「세션 보기 / 질의 보기」 전환 · 세션 목록 · 행 클릭 상세 모달을 없앴습니다. 질의 표 하나입니다.
 *  · 상세에만 있던 근거 문서 · 내 평가 · 세션 링크를 열로 옮겼습니다 — 평가 열의 「유용 · 개선 필요」 로 바로 평가하고,
 *    대화 열의 「대화 보기 ›」 로 그 질의가 든 대화를 옆 패널(넓은 화면 ≥1100px, 너비 480)로 엽니다. 좁은 화면은 전체 폭.
 *  · 답변 시간 · 미응답 사유 열은 뺐습니다. LLM 메타(모델 · 토큰 · 답변 상태 · 의도) 열을 더했습니다 — 없으면 '—'.
 *  · 「답변 평가 기준」 은 모든 행이 같은 상수라 표 위 [?] 안내로 둡니다.
 * 표는 열을 숨기지 않고 카드 안에서 가로로 스크롤합니다(AGENTS.md 표 기준).
 * 사용 API — /api/v1/ai/chat/history/* (scope=mine — 요약·목록·세션·내려받기) · /ai/chat/messages/{id}/feedback
 */
import React from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import Grid, { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import {
  Badge, Button, Card, DateField, ExportMenuButton, Filters, FormAlert, HelpTip, Hint, Loading, Pagination,
  SelectField, StatCard, Table, TextField,
} from '@shared/components/ui';
import { useAppNavigation } from '@shared/hooks/useAppNavigation';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { comma, fixed } from '@shared/utils/formatUtil';
import { secText, shortTs } from '../controller/useChatHistoryController';
import { CRITERIA, DocsCell, FinishCell, HiddenBadge, ModelCell, SessionDetail, TokenCell, ratingTone } from './ChatHistoryParts';

/** 대화 패널을 목록 옆에 둘 최소 폭 */
const SIDE_PANEL_MIN = 1100;
/** 평가 조건 (08 CHH-10) — NONE = 아직 없음 */
const REVIEW_OPTIONS = ['전체', { value: 'USEFUL', label: '유용' }, { value: 'REASK', label: '재질의' }, { value: 'BAD', label: '오답' }, { value: 'NONE', label: '없음' }];
const ANSWERED_OPTIONS = ['전체', { value: 'Y', label: '응답함' }, { value: 'N', label: '미응답' }];

export default function ChatHistoryView({
  paging, itemsMeta, initialLoading, refreshing, loadErrors, summaryFailed, items, gridRef, summary,
  filters, ratingLabel, isOwn, setFrom, setTo, setKeyword, search,
  setRating, setAnswered,
  rate, sessionKey, focusId, session, sessionError, sessionLoading, openSession, closeSession,
  exportView, exportAll, exportSession, exportViewCount,
}) {
  const s = useCommonStyles();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const side = width >= SIDE_PANEL_MIN;
  const { goToScreen } = useAppNavigation();

  if (initialLoading) return <Loading />;

  const total = itemsMeta?.total ?? items.length;
  const dash = (v) => (summaryFailed || v === null || v === undefined ? '—' : v);

  const notice = [
    '내 질의 이력입니다',
    retentionText(summary),
  ].filter(Boolean).join(' · ');

  const sessionPanel = sessionKey ? (
    <SessionDetail
      session={session}
      error={sessionError}
      loading={sessionLoading}
      focusId={focusId}
      side={side}
      title="내 대화"
      ratingLabel={ratingLabel}
      onClose={closeSession}
      onExport={exportSession}
    />
  ) : null;

  const columns = [
    { key: 'ts', title: '질문 시간', width: 150, mono: true, render: (r) => <Text style={[s.td, s.mono]}>{shortTs(r.ts, true)}</Text> },
    { key: 'question', title: '질문', width: 260, minWidth: 260, wrap: true },
    { key: 'answer', title: '응답', width: 320, minWidth: 320, wrap: true, render: (r) => (r.answerHidden ? <HiddenBadge reason={r.answerHiddenReason} /> : <Text style={s.td} numberOfLines={3}>{r.answer || (r.unansweredReason ? `미응답 — ${r.unansweredReason}` : '—')}</Text>) },
    { key: 'judgmentBasis', title: '판단 근거', width: 240, minWidth: 240, wrap: true, render: (r) => (r.answerHidden ? <HiddenBadge reason={r.answerHiddenReason} showReason={false} /> : <Text style={s.td} numberOfLines={3}>{r.judgmentBasis || r.evidenceSummary || '—'}</Text>) },
    { key: 'docs', title: '근거 문서', width: 270, minWidth: 270, wrap: true, sortable: false, render: (r) => (r.answerHidden ? <Text style={s.td}>—</Text> : <DocsCell row={r} />) },
    { key: 'responseSec', title: '응답 시간', width: 110, align: 'right', render: (r) => <Text style={[s.td, s.num, { textAlign: 'right' }]}>{secText(r.responseSec)}</Text> },
    { key: 'llmModel', title: '모델', width: 120, render: (r) => <ModelCell row={r} /> },
    { key: 'totalTokens', title: '토큰', width: 200, render: (r) => <TokenCell row={r} /> },
    { key: 'finishReason', title: '답변 상태', width: 180, render: (r) => <FinishCell row={r} /> },
    { key: 'intentNm', title: '의도', width: 130, wrap: true, render: (r) => <Text style={s.td} numberOfLines={2}>{r.intentNm || '—'}</Text> },
    {
      key: 'rating',
      title: '평가',
      width: 200,
      minWidth: 200,
      render: (r) => (
        <View style={{ gap: 6, alignItems: 'flex-start' }}>
          {r.rating ? <Badge tone={ratingTone(r.rating)}>{ratingLabel(r.rating)}</Badge> : <Text style={s.textXs}>미평가</Text>}
          {isOwn(r) ? (
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Button label="유용" size="sm" icon="thumbsUp" onPress={() => rate(r.messageId, 'good')} />
              <Button label="개선 필요" size="sm" icon="thumbsDown" onPress={() => rate(r.messageId, 'bad')} />
            </View>
          ) : null}
        </View>
      ),
    },
    {
      key: 'actions',
      title: '대화',
      width: 110,
      sortable: false,
      render: (r) => (r.sessionKey ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`${shortTs(r.ts, true)} 질의의 대화 보기`}
          onPress={() => openSession(r.sessionKey, r.messageId)}
        >
          <Text style={[s.textSm, { color: theme.color.primary, fontWeight: '600' }]}>대화 보기 ›</Text>
        </Pressable>
      ) : <Text style={s.td}>—</Text>),
    },
  ];

  return (
    <View>
      <PageHead
        title="자연어 질의 이력"
        desc="내 질의와 생성 응답, 판단 근거, 근거 문서, 평가 이력을 질의 단위로 확인합니다."
        actions={
          <>
            <ExportMenuButton
              viewCount={exportViewCount}
              onExportView={exportView}
              onExportAll={exportAll}
            />
            <Button label="자연어 질의 열기" size="sm" variant="primary" icon="message" onPress={() => goToScreen('ai-chat')} />
          </>
        }
      />

      <Grid cols={4}>
        <StatCard
          label="질의 건수"
          value={dash(summary ? comma(summary.totalCnt ?? 0) : null)}
          unit="건"
          sub={[
            summary?.sessionCnt != null ? `대화 ${comma(summary.sessionCnt)}개` : '',
            summary?.usefulCnt != null || summary?.badCnt != null ? `유용 ${comma(summary?.usefulCnt ?? 0)} · 오답 ${comma(summary?.badCnt ?? 0)}` : '',
          ].filter(Boolean).join(' · ') || '조회 기간'}
        />
        <StatCard
          label="답변율"
          value={dash(summary ? fixed(summary.answerRate) : null)}
          unit="%"
          sub={summary?.targetAnswerRate != null ? `목표 ${fixed(summary.targetAnswerRate)}%` : undefined}
          tone={summary?.targetAnswerRate != null && summary?.answerRate != null ? (summary.answerRate >= summary.targetAnswerRate ? 'up' : 'down') : ''}
        />
        <StatCard label="평균 응답" value={dash(summary ? fixed(summary.avgElapsedSec) : null)} unit="초" sub="질의부터 답 완료까지" />
        <StatCard label="재질의율" value={dash(summary ? fixed(summary.reAskRate) : null)} unit="%" sub="같은 대화에서 이어 물은 비율" />
      </Grid>
      <Gap />

      {loadErrors?.length ? (
        <>
          <FormAlert tone="error">{loadErrors.join('\n')}</FormAlert>
          <Gap size={12} />
        </>
      ) : null}

      <Filters>
        <DateField label="시작일" value={filters.from} onChange={setFrom} />
        <DateField label="종료일" value={filters.to} onChange={setTo} />
        <TextField label="검색" value={filters.keyword} onChangeText={setKeyword} onSubmitEditing={search} placeholder="질문 내용" style={{ minWidth: 200 }} />
        <SelectField label="평가" value={filters.rating} options={REVIEW_OPTIONS} onChange={setRating} />
        <SelectField label="응답" value={filters.answered} options={ANSWERED_OPTIONS} onChange={setAnswered} />
        <Button label="조회" variant="primary" onPress={search} />
      </Filters>

      <Hint>{notice}</Hint>
      <Gap size={12} />

      <View style={{ flexDirection: side ? 'row' : 'column', gap: 16, alignItems: 'flex-start' }}>
        {/* 좁은 화면에서 대화를 열면 같은 주소의 전체 폭 패널만 보입니다 — 뒤로 가기로 목록에 돌아옵니다 */}
        {side || !sessionPanel ? (
          <Card
            title="질의 이력"
            sub={`${comma(total)}건 · 평가 열에서 바로 평가하고, 대화 열에서 그 질의가 든 대화를 봅니다${refreshing ? ' · 조회 중…' : ''}`}
            right={
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, zIndex: 10 }}>
                <Text style={s.textXs}>답변 평가 기준</Text>
                <HelpTip text={`답변 평가 기준 — ${CRITERIA}`} size={22} align="right" />
              </View>
            }
            tight
            style={{ flex: 1, minWidth: 0, alignSelf: 'stretch' }}
          >
            <Table
              inset
              minWidth={2280}
              bordered
              instanceRef={gridRef}
              keyExtractor={(r) => r.messageId}
              emptyText="조회 기간에 남은 질의가 없습니다."
              columns={columns}
              rows={items}
            />
            <Pagination meta={itemsMeta} {...(paging?.bind || {})} />
          </Card>
        ) : null}
        {sessionPanel}
      </View>
    </View>
  );
}

/**
 * 보존 기간 안내 (결정 R-20 — 3년 보관 뒤 매일 03:10 정리, 공통 11.4)
 *  · 1095일 → 「보존 3년」 처럼 해 단위로 나눠지면 해로 적습니다
 *  · expiredCnt 가 오면 「기간 지난 n건은 매일 03:10 정리」 를 덧붙입니다
 *  · 0 이면 아직 정해지지 않은 것으로 봅니다
 */
function retentionText(summary) {
  const days = summary?.retentionDays;
  if (days === null || days === undefined) return '';
  if (!days) return '보존 기간이 정해지지 않았습니다';
  const span = days % 365 === 0 ? `${days / 365}년` : `${comma(days)}일`;
  const expired = summary?.expiredCnt;
  return `보존 ${span} · ${expired != null ? `기간 지난 ${comma(expired)}건은 ` : '기간이 지난 이력은 '}매일 03:10 정리`;
}
