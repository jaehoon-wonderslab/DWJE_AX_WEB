/**
 * [View] SY-08 자연어 질의 이력 (경로: /history/chat · 화면 ID chat-history · 대그룹 「자연어 질의 이력」)
 *
 * 전 사용자의 질의와 AI 응답을 세션(대화) 단위 또는 질의 단위로 봅니다(결정 R-08 · R-12).
 *  · 세션 보기 — 세션 목록 → 세션 대화. 넓은 화면(≥1100px)은 오른쪽 패널(너비 480), 좁은 화면은 같은 주소의 전체 폭 상세.
 *  · 질의 보기 — 질의 한 건씩. 각 행의 「세션 ›」 로 그 질의가 든 세션을 엽니다.
 *  · 권한 밖 응답은 서버가 가립니다 — 「권한 밖 응답」 배지와 사유를 보입니다(08 CHH-02).
 *  · 관리 기능(검토 · 학습데이터 · 디버그)은 쓰기 권한 보유자에게만 엽니다. 버튼은 숨기지 않고 비활성 + 이유(공통 R-06),
 *    디버그는 값이라 쓰기 권한이 없으면 영역을 그리지 않습니다(CHH-16).
 * 표는 열을 숨기지 않고 카드 안에서 가로로 스크롤합니다(AGENTS.md 표 기준).
 * 사용 API — /api/v1/ai/chat/history/* (요약·목록·세션·상세·검토·내려받기·학습데이터·그룹)
 */
import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import Grid, { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import {
  Badge, Button, Card, DateField, ExportMenuButton, Filters, FormAlert, HelpTip, Hint, KeyValue, Loading, Pagination,
  SelectField, StatCard, Table, Tabs, TextField,
} from '@shared/components/ui';
import { useAppNavigation } from '@shared/hooks/useAppNavigation';
import { useUiStore } from '@shared/stores/useUiStore';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { comma, fixed } from '@shared/utils/formatUtil';
import { NO_WRITE_MESSAGE, secText, shortTs } from '../controller/useChatHistoryController';

/** 세션 상세를 목록 옆 패널로 둘 최소 폭 */
const SIDE_PANEL_MIN = 1100;
/** 평가 배지 색 — 유용(USEFUL)만 초록, 나머지(재질의·오답)는 주황 */
const ratingTone = (rating) => (rating === 'USEFUL' || rating === '유용' ? 'green' : 'amber');
const CRITERIA = '질문에 직접 답했는지 · 판단 근거와 일치하는지 · 미응답 사유를 명확히 밝혔는지';
const HIDDEN_BADGE = '권한 밖 응답';
/** 평가·검토 조건 (08 CHH-10) — NONE = 아직 없음 */
const REVIEW_OPTIONS = ['전체', { value: 'USEFUL', label: '유용' }, { value: 'REASK', label: '재질의' }, { value: 'BAD', label: '오답' }, { value: 'NONE', label: '없음' }];
const ANSWERED_OPTIONS = ['전체', { value: 'Y', label: '응답함' }, { value: 'N', label: '미응답' }];

export default function ChatHistoryView({
  view, setView, paging, itemsMeta, initialLoading, refreshing, loadErrors, summaryFailed, items, gridRef, summary,
  canManage, unassigned, maskedRowCnt, filters, deptOptions, ratingLabel, isOwn, setFrom, setTo, setGroup, setKeyword, search,
  setRating, setReview, setAnswered,
  loadDetail, rate, review, sessionKey, focusId, session, sessionError, sessionLoading, openSession, closeSession,
  exportView, exportAll, exportSession, exportViewCount, exportTrainset,
}) {
  const s = useCommonStyles();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const side = width >= SIDE_PANEL_MIN;
  const { goToScreen } = useAppNavigation();
  const toast = useUiStore((state) => state.toast);
  const openModal = useUiStore((state) => state.openModal);
  /** 행 안의 「세션 ›」 을 눌렀을 때 행 클릭(상세)이 함께 열리지 않게 막는 표시 */
  const skipRowAt = useRef(0);

  /**
   * 질의 상세 · 평가 · 검토 (08 CHH-04·05)
   *
   * 상세 응답의 askedAt · userName · dept 를 먼저 쓰고, 없으면 목록 행 값을 씁니다.
   */
  const showDetail = async (row) => {
    let d;
    try {
      d = await loadDetail(row.messageId);
    } catch (e) {
      toast(e.message || '질의 상세를 불러오지 못했습니다');
      return;
    }
    if (!d) {
      toast('질의 상세를 불러오지 못했습니다');
      return;
    }
    const hidden = d.answerHidden ?? row.answerHidden;
    const elapsedSec = d.elapsedMs != null ? d.elapsedMs / 1000 : d.responseSec ?? row.responseSec;
    const rating = d.rating ?? row.rating;
    const reviewCd = d.review ?? row.review;
    const hits = d.hits || [];
    const answer = d.answer || d.response || row.answer || '';
    const judgmentBasis = d.judgmentBasis || d.evidenceSummary || row.judgmentBasis || '';
    const unansweredReason = d.unansweredReason || row.unansweredReason;
    const debug = canManage ? d.debug ?? null : null;
    const own = isOwn(row) || isOwn(d);
    const hiddenNote = d.answerHiddenReason || row.answerHiddenReason || '질의자보다 데이터 접근 권한이 좁아 응답을 표시하지 않습니다';
    openModal({
      title: '질의 상세',
      // 상세 응답의 시각·사용자를 먼저 씁니다(서버 필드 ts·name — 기획서 이름 askedAt·userName 도 받습니다)
      sub: `${d.askedAt || d.ts || row.ts || ''} · ${d.userName || d.name || row.name || row.empNo || ''} (${d.dept || row.dept || ''})`,
      render: () => (
        <View>
          <KeyValue
            keyWidth={110}
            rows={[
              ['질의', d.question || row.question || '—'],
              ['응답', hidden ? <HiddenNote text={hiddenNote} /> : answer || '응답 본문이 남아 있지 않습니다.'],
              ['판단 근거', hidden ? <HiddenNote text={hiddenNote} /> : judgmentBasis || '기록된 근거가 없습니다.'],
              ['근거 문서', hits.length
                ? hits.map((h) => [h.title || h.docId, h.page ? `p.${h.page}` : '', h.score != null ? `점수 ${Number(h.score).toFixed(2)}` : ''].filter(Boolean).join(' · ')).join('\n')
                : '근거 문서가 없습니다.'],
              ['미응답 사유', unansweredReason || '미응답 사유가 기록되지 않았습니다.'],
              ['응답 시간', elapsedSec == null ? '—' : `${Number(elapsedSec).toFixed(1)}초`],
              ['평가(질의자)', `${rating ? ratingLabel(rating) : '미평가'}${d.ratingComment ? ` · ${d.ratingComment}` : ''}`],
              ['검토(관리자)', `${reviewCd ? ratingLabel(reviewCd) : '미검토'}${d.reviewComment ? ` · ${d.reviewComment}` : ''}${d.reviewedAt ? ` · ${d.reviewedAt}` : ''}`],
              ['답변 평가 기준', d.evaluationCriteria || CRITERIA],
            ]}
          />
          {debug ? <DebugTable debug={debug} /> : null}
        </View>
      ),
      footer: (close) => (
        <DetailFooter
          close={close}
          own={own}
          canManage={canManage}
          onRate={(r) => { rate(row.messageId, r); close(); }}
          onReview={async (cd, comment) => { const res = await review(row.messageId, cd, comment); if (res?.ok) close(); }}
        />
      ),
    });
  };

  if (initialLoading) return <Loading />;

  const total = itemsMeta?.total ?? items.length;
  const dash = (v) => (summaryFailed || v === null || v === undefined ? '—' : v);

  /** 학습데이터 내보내기 — 평가 조건을 고르고 반출 사실을 알린 뒤 받습니다(08 CHH-03) */
  const openTrainset = () =>
    openModal({
      title: '학습데이터 내보내기',
      sub: `기간 ${filters.from} ~ ${filters.to}`,
      render: (close) => <TrainsetForm onSubmit={exportTrainset} close={close} />,
    });

  const notice = [
    unassigned ? '본인 질의 이력입니다' : '전 사용자의 질의 이력입니다 · 권한 밖 응답은 가려집니다',
    retentionText(summary),
    maskedRowCnt ? `응답 가림 ${maskedRowCnt}건` : '',
  ].filter(Boolean).join(' · ');

  const sessionPanel = view === 'session' && sessionKey ? (
    <SessionDetail
      session={session}
      error={sessionError}
      loading={sessionLoading}
      focusId={focusId}
      side={side}
      ratingLabel={ratingLabel}
      onClose={closeSession}
      onExport={exportSession}
      onOpenMessage={(t) => showDetail({ ...t, ts: t.askedAt, name: session?.name, dept: session?.dept, empNo: session?.empNo })}
    />
  ) : null;

  return (
    <View>
      <PageHead
        title="자연어 질의 이력"
        desc="전 사용자의 질의와 생성 응답, 판단 근거, 미응답 사유, 평가·검토 이력을 세션(대화) 또는 질의 단위로 확인합니다."
        actions={
          <>
            <ExportMenuButton
              viewCount={exportViewCount}
              onExportView={exportView}
              onExportAll={exportAll}
            />
            {/* 학습데이터는 엑셀 패널 밖 별도 버튼 — 쓰기 권한이 있어야 합니다(공통 10.6 · 08 CHH-16) */}
            <Button label="학습데이터 내보내기" size="sm" icon="upload" disabled={!canManage} onPress={openTrainset} />
            {!canManage ? <HelpTip text={NO_WRITE_MESSAGE} size={30} /> : null}
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
            summary?.sessionCnt != null ? `세션 ${comma(summary.sessionCnt)}개` : '',
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

      <Tabs
        items={[{ value: 'session', label: '세션 보기' }, { value: 'message', label: '질의 보기' }]}
        value={view}
        onChange={setView}
      />
      <Gap size={12} />

      <Filters>
        <DateField label="시작일" value={filters.from} onChange={setFrom} />
        <DateField label="종료일" value={filters.to} onChange={setTo} />
        <SelectField label="사용자 그룹" value={filters.group} options={deptOptions} onChange={setGroup} />
        <TextField label="검색" value={filters.keyword} onChangeText={setKeyword} onSubmitEditing={search} placeholder="질문 내용" style={{ minWidth: 200 }} />
        <SelectField label="평가" value={filters.rating} options={REVIEW_OPTIONS} onChange={setRating} />
        <SelectField label="검토" value={filters.review} options={REVIEW_OPTIONS} onChange={setReview} />
        <SelectField label="응답" value={filters.answered} options={ANSWERED_OPTIONS} onChange={setAnswered} />
        <Button label="조회" variant="primary" onPress={search} />
      </Filters>

      <Hint>{notice}</Hint>
      {unassigned ? (
        <>
          <Gap size={8} />
          {/* 미배정 계정은 서버가 본인 질의만 돌려줍니다(D-22 결정됨 — 공통 11.5 R-21) */}
          <Hint>소속 부서 배정 전에는 본인의 질의 이력만 볼 수 있습니다. 데이터 접근 권한이 없어 응답 값은 대부분 비공개로 보입니다.</Hint>
        </>
      ) : null}
      <Gap size={12} />

      {view === 'session' ? (
        <View style={{ flexDirection: side ? 'row' : 'column', gap: 16, alignItems: 'flex-start' }}>
          {/* 좁은 화면에서 세션을 고르면 같은 주소의 전체 폭 상세만 보입니다 — 뒤로 가기로 목록에 돌아옵니다 */}
          {side || !sessionPanel ? (
            <Card
              title="세션"
              sub={`${comma(total)}개 · 행을 누르면 대화를 봅니다${refreshing ? ' · 조회 중…' : ''}`}
              tight
              style={{ flex: 1, minWidth: 0, alignSelf: 'stretch' }}
            >
              <Table
                inset
                minWidth={1200}
                bordered
                instanceRef={gridRef}
                keyExtractor={(r) => r.sessionKey}
                onRowPress={(r) => openSession(r.sessionKey)}
                emptyText="조회 기간에 남은 질의가 없습니다."
                rows={items}
                columns={[
                  { key: 'startedAt', title: '세션 시작', width: 150, mono: true, render: (r) => <Text style={[s.td, s.mono]}>{shortTs(r.startedAt)}</Text> },
                  { key: 'name', title: '부서·사용자', width: 170, minWidth: 170, wrap: true, render: (r) => <Text style={s.td}>{`${r.dept || ''} ${r.name || r.empNo || ''}`.trim() || '—'}</Text> },
                  { key: 'questionCnt', title: '질의 수', width: 80, align: 'right', render: (r) => <Text style={[s.td, s.num, { textAlign: 'right' }]}>{comma(r.questionCnt ?? 0)}</Text> },
                  { key: 'firstQuestion', title: '첫 질문', width: 360, minWidth: 360, wrap: true, render: (r) => <Text style={s.td} numberOfLines={2}>{r.firstQuestion || '—'}</Text> },
                  { key: 'lastAskedAt', title: '마지막 질의', width: 150, mono: true, render: (r) => <Text style={[s.td, s.mono]}>{shortTs(r.lastAskedAt)}</Text> },
                  { key: 'answeredCnt', title: '응답', width: 90, align: 'right', render: (r) => <Text style={[s.td, s.num, { textAlign: 'right' }]}>{`${r.answeredCnt ?? 0}/${r.questionCnt ?? 0}`}</Text> },
                  { key: 'usefulCnt', title: '평가 요약', width: 120, render: (r) => <Text style={s.td}>{`유용 ${r.usefulCnt ?? 0} · 오답 ${r.badCnt ?? 0}`}</Text> },
                  { key: 'reviewedCnt', title: '검토', width: 80, align: 'right', render: (r) => <Text style={[s.td, s.num, { textAlign: 'right' }]}>{r.reviewedCnt ? comma(r.reviewedCnt) : '—'}</Text> },
                ]}
              />
              <Pagination meta={itemsMeta} {...(paging?.bind || {})} />
            </Card>
          ) : null}
          {sessionPanel}
        </View>
      ) : (
        <Card title="질의 이력" sub={`${comma(total)}건 · 행을 누르면 질문, 응답, 판단 근거 및 평가 기준을 볼 수 있습니다${refreshing ? ' · 조회 중…' : ''}`} tight>
          <Table
            inset
            minWidth={1850}
            bordered
            instanceRef={gridRef}
            keyExtractor={(r) => r.messageId}
            onRowPress={(row) => {
              // 같은 클릭에서 「세션 ›」 을 눌렀으면 상세를 열지 않습니다
              setTimeout(() => {
                if (Date.now() - skipRowAt.current < 500) return;
                showDetail(row);
              }, 0);
            }}
            emptyText="조회 기간에 남은 질의가 없습니다."
            columns={[
              {
                key: 'ts',
                title: '시각',
                width: 150,
                mono: true,
                render: (r) => (
                  <View style={{ gap: 2 }}>
                    <Text style={[s.td, s.mono]}>{shortTs(r.ts, true)}</Text>
                    {r.sessionKey ? (
                      <Pressable
                        accessibilityRole="link"
                        accessibilityLabel={`${shortTs(r.ts, true)} 질의의 세션 보기`}
                        onPress={() => { skipRowAt.current = Date.now(); openSession(r.sessionKey, r.messageId); }}
                      >
                        <Text style={[s.textXs, { color: theme.color.primary }]}>세션 보기 ›</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ),
              },
              { key: 'name', title: '부서·사용자', width: 170, minWidth: 170, wrap: true, render: (r) => <Text style={s.td}>{`${r.dept || ''} ${r.name || r.empNo || ''}`.trim() || '—'}</Text> },
              { key: 'question', title: '질문', width: 330, minWidth: 330, wrap: true },
              { key: 'answer', title: '응답', width: 390, minWidth: 390, wrap: true, render: (r) => (r.answerHidden ? <HiddenBadge reason={r.answerHiddenReason} /> : <Text style={s.td} numberOfLines={3}>{r.answer || '상세 보기'}</Text>) },
              { key: 'judgmentBasis', title: '판단 근거', width: 300, minWidth: 300, wrap: true, render: (r) => (r.answerHidden ? <HiddenBadge reason={r.answerHiddenReason} /> : <Text style={s.td} numberOfLines={3}>{r.judgmentBasis || r.evidenceSummary || '상세 보기'}</Text>) },
              { key: 'unansweredReason', title: '미응답 사유', width: 220, minWidth: 220, wrap: true, render: (r) => <Text style={s.td} numberOfLines={3}>{r.unansweredReason || '—'}</Text> },
              { key: 'responseSec', title: '응답 시간', width: 110, align: 'right', render: (r) => <Text style={[s.td, s.num, { textAlign: 'right' }]}>{secText(r.responseSec)}</Text> },
              // 「답변 평가 기준」 은 모든 행이 같은 상수라 표에서 빼고 상세에만 둡니다(08 CHH-11) — 제거됨(표 열)
              { key: 'rating', title: '평가', width: 90, render: (r) => (r.rating ? <Badge tone={ratingTone(r.rating)}>{ratingLabel(r.rating)}</Badge> : <Text style={s.td}>—</Text>) },
              { key: 'review', title: '검토', width: 90, render: (r) => (r.review ? <Badge tone={ratingTone(r.review)}>{ratingLabel(r.review)}</Badge> : <Text style={s.td}>—</Text>) },
            ]}
            rows={items}
          />
          <Pagination meta={itemsMeta} {...(paging?.bind || {})} />
        </Card>
      )}
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

/** 표 칸의 「권한 밖 응답」 배지 — 사유는 접근성 라벨로 함께 읽힙니다 */
function HiddenBadge({ reason }) {
  const s = useCommonStyles();
  return (
    <View accessibilityLabel={`${HIDDEN_BADGE}${reason ? ` — ${reason}` : ''}`} style={{ gap: 4, alignItems: 'flex-start' }}>
      <Badge>{HIDDEN_BADGE}</Badge>
      {reason ? <Text style={s.textXs} numberOfLines={2}>{reason}</Text> : null}
    </View>
  );
}

function HiddenNote({ text }) {
  const s = useCommonStyles();
  return (
    <View style={{ gap: 4, alignItems: 'flex-start' }}>
      <Badge>{HIDDEN_BADGE}</Badge>
      <Text style={s.textSm}>{text}</Text>
    </View>
  );
}

/** 디버그 기록 — JSON 원문 대신 키·값 표 (쓰기 권한 보유자만, 08 CHH-05) */
function DebugTable({ debug }) {
  const s = useCommonStyles();
  const LABEL = { route: '경로', parse: '파싱', tool: '도구', result: '실행 결과', errorCd: '오류 코드', period: '기간', rows: '행 수', docs: '문서 수', toolMs: '도구 ms', totalMs: '전체 ms' };
  const entries = typeof debug === 'object' && !Array.isArray(debug) ? Object.entries(debug) : null;
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={[s.fieldLabel, { marginBottom: 6 }]}>디버그 기록 · 쓰기 권한 보유자 전용</Text>
      {entries ? (
        <KeyValue keyWidth={110} rows={entries.map(([k, v]) => [LABEL[k] || k, v === null || v === undefined ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v)])} />
      ) : (
        <ScrollView style={{ maxHeight: 220 }}>
          <Text selectable style={[s.textXs, { fontFamily: 'monospace', lineHeight: 18 }]}>{String(debug)}</Text>
        </ScrollView>
      )}
    </View>
  );
}

/**
 * 상세 모달 아래 단추
 *  · 본인 질의 → 「유용함 · 오답」(질의자 평가)
 *  · 관리자 검토 → 의견 + 「유용 · 재질의 · 오답」. 쓰기 권한이 없으면 비활성 + 이유
 */
function DetailFooter({ close, own, canManage, onRate, onReview }) {
  const [comment, setComment] = useState('');
  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', justifyContent: 'flex-end', flex: 1 }}>
      <Button label="닫기" onPress={close} />
      {own ? (
        <>
          <Button label="유용함" icon="thumbsUp" onPress={() => onRate('good')} />
          <Button label="오답" icon="thumbsDown" variant="danger" onPress={() => onRate('bad')} />
        </>
      ) : null}
      <TextField label="검토 의견" value={comment} onChangeText={setComment} placeholder="선택" style={{ minWidth: 180 }} />
      <Button label="검토: 유용" size="sm" disabled={!canManage} onPress={() => onReview('USEFUL', comment)} />
      <Button label="검토: 재질의" size="sm" disabled={!canManage} onPress={() => onReview('REASK', comment)} />
      <Button label="검토: 오답" size="sm" variant="danger" disabled={!canManage} onPress={() => onReview('BAD', comment)} />
      {!canManage ? <HelpTip text={NO_WRITE_MESSAGE} size={30} /> : null}
    </View>
  );
}

/** 학습데이터 내보내기 확인 — 평가 조건을 고릅니다 */
function TrainsetForm({ onSubmit, close }) {
  const s = useCommonStyles();
  const [rating, setRating] = useState('USEFUL');
  const [busy, setBusy] = useState(false);
  const done = () => close?.();
  return (
    <View style={{ gap: 12 }}>
      <SelectField
        label="평가"
        value={rating}
        options={[{ value: 'USEFUL', label: '유용만' }, { value: 'BAD', label: '오답만' }, { value: 'ALL', label: '전체' }]}
        onChange={setRating}
      />
      <Text style={s.textSm}>질의 원문이 파일로 반출되며 다운로드 이력에 기록됩니다. 관리자 검토가 있으면 검토 값을, 없으면 질의자 평가를 기준으로 고릅니다.</Text>
      <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
        <Button label="취소" onPress={done} />
        <Button
          label={busy ? '내려받는 중…' : '내보내기'}
          variant="primary"
          disabled={busy}
          onPress={async () => {
            setBusy(true);
            const ok = await onSubmit({ ratingFilter: rating });
            setBusy(false);
            if (ok) done();
          }}
        />
      </View>
    </View>
  );
}

/**
 * 세션 상세 — 질문(오른쪽 말풍선)·응답(왼쪽 말풍선)을 시간순으로 그립니다(08 CHH-18).
 * 각 응답 아래 「질의 상세 ›」 로 질의 상세 모달을 엽니다. focusId 질의는 테두리로 강조합니다.
 */
function SessionDetail({ session, error, loading, focusId, side, ratingLabel, onClose, onExport, onOpenMessage }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const turns = session?.turns || [];
  const title = session ? `${session.name || session.empNo || ''} (${session.dept || ''})` : '세션 상세';
  const range = session ? `${shortTs(session.startedAt)} ~ ${String(session.lastAskedAt || '').slice(11, 16)} · 질의 ${turns.length}건` : '';
  return (
    <Card
      title={title}
      sub={range}
      right={
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {turns.length ? <Button label="이 세션 내려받기" size="sm" icon="download" onPress={onExport} /> : null}
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
                <Text style={[s.textXs, { marginTop: 6 }]}>
                  {`${secText(t.responseSec)} · 평가 ${t.rating ? ratingLabel(t.rating) : '—'} · 검토 ${t.review ? ratingLabel(t.review) : '—'}`}
                </Text>
                <Pressable accessibilityRole="link" onPress={() => onOpenMessage(t)}>
                  <Text style={[s.textXs, { color: theme.color.primary, marginTop: 4 }]}>질의 상세 ›</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
        {session && !turns.length ? <Text style={s.caption}>이 세션에 남은 질의가 없습니다(보존 기간이 지나 삭제되었을 수 있습니다).</Text> : null}
      </View>
    </Card>
  );
}
