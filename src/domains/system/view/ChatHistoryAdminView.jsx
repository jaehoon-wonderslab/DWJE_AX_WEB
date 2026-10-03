/**
 * [View] SY-18 전사 자연어 질의 이력 (경로: /system/chat-history · 화면 ID sys-chat-history · 대그룹 「시스템관리」)
 *
 * 2026-10-03 신규 — 모든 사용자의 질의를 봅니다(scope=all).
 * 2026-10-03 (2차) — 관리자 전용(통합관리자). 옛 /history/chat 의 관리 기능을 모두 둡니다.
 *  · 보기 — 질의 보기(기본) · 세션 보기(세션 목록 → 오른쪽 대화 패널, 좁은 화면은 전체 폭)
 *  · 조건 — 기간 · 사용자 그룹 · 사용자(사번) · 검색 · 평가 · 검토 · 응답 + 질의 표 열 머리글 필터(현재 쪽 기준)
 *  · 질의 열: 사용자 · 질문 · 답변 · 판단 근거 · 미응답 사유 · 사용자 평가 · 검토 · 질문 시간(세션 보기 ›) · 답변 시간 · 응답 시간 ·
 *    모델 · 토큰 · 답변 상태 · 의도 · 답변 추가(학습 데이터)
 *  · 답변 추가 칸 — 저장된 답변이 있으면 앞부분 + [수정], 없으면 [추가]. 모달에서 원 질문 · 원 답변을 보며 적고,
 *    비우고 저장하면 지웁니다. canManage 가 거짓이면 단추를 숨기지 않고 비활성 + 이유(공통 R-06)
 *  · 행을 누르면 질의 상세(근거 문서 · LLM 메타 · 요청 ID · 검토 · 디버그)를 봅니다
 * 표는 열을 숨기지 않고 카드 안에서 가로로 스크롤합니다(AGENTS.md 표 기준).
 * 사용 API — /api/v1/ai/chat/history/* (scope=all — 요약·목록·세션·상세·검토·답변 추가·내려받기·학습데이터·그룹)
 */
import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import Grid, { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import {
  Badge, Button, Card, DateField, ExportMenuButton, Filters, FormAlert, HelpTip, Hint, KeyValue, Loading, Pagination,
  SelectField, StatCard, Table, Tabs, TextField, openFormModal,
} from '@shared/components/ui';
import { useUiStore } from '@shared/stores/useUiStore';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { comma, fixed } from '@shared/utils/formatUtil';
import { NO_WRITE_MESSAGE, docGroups, docLine, finishText, secText, shortTs, tokenText, tokenTitle } from '../controller/useChatHistoryController';
import { TRAIN_ANSWER_MAX } from '../controller/useChatHistoryAdminController';
import { CRITERIA, FinishCell, HIDDEN_BADGE, HiddenBadge, HiddenNote, ModelCell, SessionDetail, TokenCell, ratingTone } from './ChatHistoryParts';
import { GuardedButton } from './WriteGuard';

/** 세션 상세를 목록 옆 패널로 둘 최소 폭 */
const SIDE_PANEL_MIN = 1100;
/** 평가·검토 조건 (08 CHH-10) — NONE = 아직 없음 */
const REVIEW_OPTIONS = ['전체', { value: 'USEFUL', label: '유용' }, { value: 'REASK', label: '재질의' }, { value: 'BAD', label: '오답' }, { value: 'NONE', label: '없음' }];
const ANSWERED_OPTIONS = ['전체', { value: 'Y', label: '응답함' }, { value: 'N', label: '미응답' }];
/** 답변 추가 칸에 보일 앞부분 글자 수 */
const PREVIEW_LEN = 40;
const preview = (text) => {
  const v = String(text || '').replace(/\s+/g, ' ').trim();
  return v.length > PREVIEW_LEN ? `${v.slice(0, PREVIEW_LEN)}…` : v;
};

export default function ChatHistoryAdminView({
  view, setView, paging, itemsMeta, initialLoading, refreshing, loadErrors, summaryFailed, items, gridRef, summary, canManage, maskedRowCnt, trainCnt,
  filters, deptOptions, setFrom, setTo, setGroup, setEmpNo, setKeyword, setRating, setReview, setAnswered, search,
  ratingLabel, loadDetail, saveTrainAnswer, review,
  sessionKey, focusId, session, sessionError, sessionLoading, openSession, closeSession,
  exportView, exportAll, exportSession, exportViewCount, exportTrainset,
}) {
  const s = useCommonStyles();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const side = width >= SIDE_PANEL_MIN;
  const toast = useUiStore((state) => state.toast);
  const openModal = useUiStore((state) => state.openModal);
  /** 행 안의 단추 · 링크를 눌렀을 때 행 클릭(상세)이 함께 열리지 않게 막는 표시 */
  const skipRowAt = useRef(0);

  /** 답변 추가(학습 데이터) 모달 — 원 질문 · 원 답변을 보며 적습니다. 비우고 저장하면 지웁니다 */
  const openTrainAnswer = (row) => {
    skipRowAt.current = Date.now();
    if (!canManage) { toast(NO_WRITE_MESSAGE); return; }
    const had = !!row.trainAnswer;
    openFormModal({
      title: had ? '학습 데이터 답변 수정' : '학습 데이터 답변 추가',
      sub: `${row.userLabel || ''} · ${row.ts || ''}`,
      wide: true,
      fields: [
        { key: 'question', label: '원 질문', type: 'static', value: row.question || '—', full: true },
        { key: 'origAnswer', label: '원 답변', type: 'static', value: row.answerHidden ? HIDDEN_BADGE : row.answer || row.unansweredReason || '—', full: true },
        { key: 'answer', label: '학습 데이터 답변', type: 'textarea', rows: 8, full: true, placeholder: '이 질문에 학습시킬 올바른 답변을 적습니다.' },
      ],
      initial: { answer: row.trainAnswer || '' },
      note: `비우고 저장하면 학습 데이터 답변을 지웁니다. 최대 ${TRAIN_ANSWER_MAX.toLocaleString('ko-KR')}자. 학습데이터 내보내기에서 이 답변이 원 답변 대신 쓰입니다.${row.trainAnswerAt ? ` 마지막 저장 ${row.trainAnswerAt}${row.trainAnswerByNm ? ` · ${row.trainAnswerByNm}` : ''}` : ''}`,
      validate: (v) => (String(v.answer || '').trim().length > TRAIN_ANSWER_MAX ? { answer: `${TRAIN_ANSWER_MAX.toLocaleString('ko-KR')}자까지 입력할 수 있습니다.` } : {}),
      submitLabel: '저장',
      onSubmit: async (v) => {
        const res = await saveTrainAnswer(row.messageId, v.answer);
        if (!res?.ok && res?.message) toast(res.message);
        return res?.ok ? undefined : false;
      },
    });
  };

  /** 질의 상세 — 근거 문서 · LLM 메타 · 요청 ID · 검토 · 디버그 (08 CHH-04·05) */
  const showDetail = async (row) => {
    let d;
    try {
      d = await loadDetail(row.messageId);
    } catch (e) {
      toast(e.message || '질의 상세를 불러오지 못했습니다');
      return;
    }
    if (!d) { toast('질의 상세를 불러오지 못했습니다'); return; }
    const hidden = d.answerHidden ?? row.answerHidden;
    const hiddenNote = d.answerHiddenReason || row.answerHiddenReason || '열람자의 데이터 접근 권한이 질의자보다 좁아 응답을 표시하지 않습니다';
    const elapsedSec = d.elapsedMs != null ? d.elapsedMs / 1000 : d.responseSec ?? row.responseSec;
    const hits = d.hits?.length ? d.hits : d.docs || row.docs || [];
    const rating = d.rating ?? row.rating;
    const reviewCd = d.review ?? row.review;
    const trainAnswer = d.trainAnswer ?? row.trainAnswer;
    const debug = canManage ? d.debug ?? null : null;
    // 상세에 LLM 메타가 없으면 목록 행 값을 씁니다
    const llm = d.llmModel || d.totalTokens != null || d.finishReason ? d : row;
    const userLabel = row.userLabel || `${d.userName || d.name || row.name || row.empNo || ''}${d.dept || row.dept ? ` (${d.dept || row.dept})` : ''}`;
    openModal({
      title: '질의 상세',
      sub: `${userLabel} · 질문 ${d.askedAt || row.ts || ''}${d.answeredAt || row.answeredAt ? ` · 답변 ${d.answeredAt || row.answeredAt}` : ''}`,
      render: () => (
        <View>
          <KeyValue
            keyWidth={120}
            rows={[
              ['질문', d.question || row.question || '—'],
              ['답변', hidden ? <HiddenNote text={hiddenNote} /> : d.answer || row.answer || '응답 본문이 남아 있지 않습니다.'],
              ['판단 근거', hidden ? <HiddenNote text={hiddenNote} /> : d.judgmentBasis || row.judgmentBasis || '기록된 근거가 없습니다.'],
              // 조각(hit) 단위라 같은 문서가 여러 번 옵니다 — 제목으로 묶습니다
              ['근거 문서', hits.length ? [...docGroups(hits.map((h) => ({ ...h, title: h.title || h.docId }))).map(docLine), `근거 ${comma(d.docCnt ?? hits.length)}건`].join('\n') : '근거 문서가 없습니다.'],
              ['미응답 사유', d.unansweredReason || row.unansweredReason || '미응답 사유가 기록되지 않았습니다.'],
              ['응답 시간', elapsedSec == null ? '—' : `${Number(elapsedSec).toFixed(1)}초${llm.llmMs != null ? ` (LLM ${(llm.llmMs / 1000).toFixed(1)}초)` : ''}`],
              ['모델', llm.llmModel || '—'],
              ['토큰', `${tokenText(llm)}${tokenTitle(llm) ? ` · ${tokenTitle(llm)}` : ''}`],
              ['답변 상태', finishText(llm.finishReason)],
              ['의도', d.intentNm || row.intentNm || '—'],
              ['요청 ID', d.llmRequestId || row.llmRequestId || '—'],
              ['사용자 평가', `${rating ? ratingLabel(rating) : '미평가'}${d.ratingComment ? ` · ${d.ratingComment}` : ''}`],
              ['검토(관리자)', `${reviewCd ? ratingLabel(reviewCd) : '미검토'}${d.reviewComment ? ` · ${d.reviewComment}` : ''}${d.reviewedAt ? ` · ${d.reviewedAt}` : ''}`],
              ['학습 데이터 답변', trainAnswer || '없음'],
              ['답변 평가 기준', d.evaluationCriteria || CRITERIA],
            ]}
          />
          {debug ? <DebugTable debug={debug} /> : null}
        </View>
      ),
      footer: (close) => (
        <ReviewFooter
          close={close}
          canManage={canManage}
          onReview={async (cd, comment) => { const res = await review(row.messageId, cd, comment); if (res?.ok) close(); }}
          onTrain={() => { close(); openTrainAnswer({ ...row, userLabel, question: row.question || d.question, answer: row.answer || d.answer, trainAnswer }); }}
          hasTrain={!!trainAnswer}
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
    '전 사용자의 질의 이력입니다 · 데이터 접근 권한 밖 응답은 가려집니다',
    retentionText(summary),
    view === 'message' ? '머리글 검색은 지금 쪽 안에서 거릅니다' : '',
    maskedRowCnt ? `응답 가림 ${maskedRowCnt}건` : '',
  ].filter(Boolean).join(' · ');

  const sessionPanel = view === 'session' && sessionKey ? (
    <SessionDetail
      session={session}
      error={sessionError}
      loading={sessionLoading}
      focusId={focusId}
      side={side}
      title={session ? `${session.name || session.empNo || ''} (${session.dept || ''})` : ''}
      ratingLabel={ratingLabel}
      showReview
      onClose={closeSession}
      onExport={exportSession}
      onOpenMessage={(t) => showDetail({ ...t, ts: t.askedAt, name: session?.name, dept: session?.dept, empNo: session?.empNo, userLabel: `${session?.name || session?.empNo || ''}${session?.dept ? ` (${session.dept})` : ''}` })}
    />
  ) : null;

  return (
    <View>
      <PageHead
        title="전사 자연어 질의 이력"
        desc="모든 사용자의 질문, 답변, 판단 근거, 미응답 사유와 평가·검토를 세션(대화) 또는 질의 단위로 확인하고, 학습 데이터로 쓸 답변을 추가합니다."
        actions={
          <>
            {/* 학습데이터는 엑셀 패널 밖 별도 버튼 — 관리 기능(canManage)이 있어야 합니다(공통 10.6) */}
            <Button label="학습데이터 내보내기" size="sm" icon="upload" disabled={!canManage} onPress={openTrainset} />
            {!canManage ? <HelpTip text={NO_WRITE_MESSAGE} size={30} /> : null}
            <ExportMenuButton viewCount={exportViewCount} onExportView={exportView} onExportAll={exportAll} />
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
        <StatCard label="답변율" value={dash(summary ? fixed(summary.answerRate) : null)} unit="%" sub="조회 기간" />
        <StatCard label="평균 응답" value={dash(summary ? fixed(summary.avgElapsedSec) : null)} unit="초" sub="질의부터 답 완료까지" />
        <StatCard label="학습 데이터 답변" value={comma(trainCnt)} unit="건" sub={view === 'message' ? '지금 쪽 기준' : '질의 보기에서 셉니다'} />
      </Grid>
      <Gap />

      {loadErrors?.length ? (
        <>
          <FormAlert tone="error">{loadErrors.join('\n')}</FormAlert>
          <Gap size={12} />
        </>
      ) : null}

      <Tabs
        items={[{ value: 'message', label: '질의 보기' }, { value: 'session', label: '세션 보기' }]}
        value={view}
        onChange={setView}
      />
      <Gap size={12} />

      <Filters>
        <DateField label="시작일" value={filters.from} onChange={setFrom} />
        <DateField label="종료일" value={filters.to} onChange={setTo} />
        <SelectField label="사용자 그룹" value={filters.group} options={deptOptions} onChange={setGroup} />
        <TextField label="사용자(사번)" value={filters.empNo} onChangeText={setEmpNo} onSubmitEditing={search} placeholder="예) 10002" style={{ minWidth: 130 }} />
        <TextField label="검색" value={filters.keyword} onChangeText={setKeyword} onSubmitEditing={search} placeholder="질문 내용" style={{ minWidth: 200 }} />
        <SelectField label="평가" value={filters.rating} options={REVIEW_OPTIONS} onChange={setRating} />
        <SelectField label="검토" value={filters.review} options={REVIEW_OPTIONS} onChange={setReview} />
        <SelectField label="응답" value={filters.answered} options={ANSWERED_OPTIONS} onChange={setAnswered} />
        <Button label="조회" variant="primary" onPress={search} />
      </Filters>

      <Hint>{notice}</Hint>
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
        <Card title="질의 이력" sub={`${comma(total)}건 · 행을 누르면 상세(근거 문서 · LLM 메타 · 검토)를 봅니다${refreshing ? ' · 조회 중…' : ''}`} tight>
          <Table
            inset
            minWidth={3100}
            bordered
            filterable
            instanceRef={gridRef}
            keyExtractor={(r) => r.messageId}
            onRowPress={(row) => {
              // 같은 클릭에서 행 안의 단추 · 링크를 눌렀으면 상세를 열지 않습니다
              setTimeout(() => {
                if (Date.now() - skipRowAt.current < 500) return;
                showDetail(row);
              }, 0);
            }}
            emptyText="조회 기간에 남은 질의가 없습니다."
            columns={[
              { key: 'userLabel', title: '사용자', width: 170, minWidth: 170, wrap: true },
              { key: 'question', title: '질문', width: 300, minWidth: 300, wrap: true },
              { key: 'answer', title: '답변', width: 360, minWidth: 360, wrap: true, filterable: true, render: (r) => (r.answerHidden ? <HiddenBadge reason={r.answerHiddenReason} showReason={false} /> : <Text style={s.td} numberOfLines={3}>{r.answer || '—'}</Text>) },
              { key: 'judgmentBasis', title: '판단 근거', width: 280, minWidth: 280, wrap: true, filterable: true, render: (r) => (r.answerHidden ? <HiddenBadge reason={r.answerHiddenReason} showReason={false} /> : <Text style={s.td} numberOfLines={3}>{r.judgmentBasis || r.evidenceSummary || '—'}</Text>) },
              { key: 'unansweredReason', title: '미응답 사유', width: 200, minWidth: 200, wrap: true },
              { key: 'ratingText', title: '사용자 평가', width: 120, filter: 'list', render: (r) => (r.rating ? <Badge tone={ratingTone(r.rating)}>{ratingLabel(r.rating)}</Badge> : <Text style={s.td}>—</Text>) },
              { key: 'reviewText', title: '검토', width: 110, filter: 'list', render: (r) => (r.review ? <Badge tone={ratingTone(r.review)}>{ratingLabel(r.review)}</Badge> : <Text style={s.td}>—</Text>) },
              {
                key: 'ts',
                title: '질문 시간',
                width: 170,
                mono: true,
                filterable: true,
                render: (r) => (
                  <View style={{ gap: 2 }}>
                    <Text style={[s.td, s.mono]}>{r.ts || '—'}</Text>
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
              { key: 'answeredAt', title: '답변 시간', width: 160, mono: true },
              { key: 'responseSec', title: '응답 시간', width: 110, align: 'right', filterable: false, render: (r) => <Text style={[s.td, s.num, { textAlign: 'right' }]}>{secText(r.responseSec)}</Text> },
              { key: 'llmModel', title: '모델', width: 130, filterable: true, render: (r) => <ModelCell row={r} /> },
              { key: 'totalTokens', title: '토큰', width: 200, filterable: false, render: (r) => <TokenCell row={r} /> },
              { key: 'finishText', title: '답변 상태', width: 180, filter: 'list', render: (r) => <FinishCell row={r} /> },
              { key: 'intentNm', title: '의도', width: 130, wrap: true },
              {
                key: 'trainAnswer',
                title: '답변 추가(학습 데이터)',
                width: 260,
                minWidth: 260,
                filterable: true,
                sortable: false,
                render: (r) => (
                  <View style={{ gap: 4, alignItems: 'flex-start' }}>
                    {r.trainAnswer ? <Text style={s.textXs} numberOfLines={2}>{preview(r.trainAnswer)}</Text> : null}
                    <GuardedButton
                      allowed={canManage}
                      label={r.trainAnswer ? '수정' : '추가'}
                      size="sm"
                      icon={r.trainAnswer ? 'edit' : 'plus'}
                      onPress={() => openTrainAnswer(r)}
                    />
                  </View>
                ),
              },
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
 */
function retentionText(summary) {
  const days = summary?.retentionDays;
  if (days === null || days === undefined) return '';
  if (!days) return '보존 기간이 정해지지 않았습니다';
  const span = days % 365 === 0 ? `${days / 365}년` : `${comma(days)}일`;
  const expired = summary?.expiredCnt;
  return `보존 ${span} · ${expired != null ? `기간 지난 ${comma(expired)}건은 ` : '기간이 지난 이력은 '}매일 03:10 정리`;
}

/** 디버그 기록 — JSON 원문 대신 키·값 표 (관리 기능 보유자만, 08 CHH-05) */
function DebugTable({ debug }) {
  const s = useCommonStyles();
  const LABEL = { route: '경로', parse: '파싱', tool: '도구', result: '실행 결과', errorCd: '오류 코드', period: '기간', rows: '행 수', docs: '문서 수', toolMs: '도구 ms', totalMs: '전체 ms' };
  const entries = typeof debug === 'object' && !Array.isArray(debug) ? Object.entries(debug) : null;
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={[s.fieldLabel, { marginBottom: 6 }]}>디버그 기록</Text>
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

/** 상세 모달 아래 단추 — 관리자 검토(의견 + 유용 · 재질의 · 오답)와 답변 추가. canManage 가 거짓이면 비활성 + 이유 */
function ReviewFooter({ close, canManage, onReview, onTrain, hasTrain }) {
  const [comment, setComment] = useState('');
  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', justifyContent: 'flex-end', flex: 1 }}>
      <Button label="닫기" onPress={close} />
      <TextField label="검토 의견" value={comment} onChangeText={setComment} placeholder="선택" style={{ minWidth: 180 }} />
      <Button label="검토: 유용" size="sm" disabled={!canManage} onPress={() => onReview('USEFUL', comment)} />
      <Button label="검토: 재질의" size="sm" disabled={!canManage} onPress={() => onReview('REASK', comment)} />
      <Button label="검토: 오답" size="sm" variant="danger" disabled={!canManage} onPress={() => onReview('BAD', comment)} />
      <Button label={hasTrain ? '학습 답변 수정' : '학습 답변 추가'} size="sm" variant="primary" disabled={!canManage} onPress={onTrain} />
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
      <Text style={s.textSm}>질의 원문이 파일로 반출되며 다운로드 이력에 기록됩니다. 관리자 검토가 있으면 검토 값을, 없으면 질의자 평가를 기준으로 고릅니다. 학습 데이터 답변이 있는 질의는 그 답변으로 넣습니다.</Text>
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
