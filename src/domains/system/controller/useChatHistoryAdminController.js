/**
 * [Controller] SY-18 전사 자연어 질의 이력 (화면 ID sys-chat-history · 경로 /system/chat-history)
 *
 * 2026-10-03 신규 — 모든 사용자의 질의를 봅니다. 조회는 모두 scope=all 입니다.
 * 본인 이력만 보는 화면은 자연어 질의 이력(/history/chat, chat-history)입니다.
 *
 * 2026-10-03 (2차) — **관리자 전용**(통합관리자, 관리 화면 ADMIN_SCREENS). 옛 /history/chat 이 하던 관리 기능을 모두 여기로 모았습니다.
 *  · 보기 두 가지 — 질의 보기(기본, 평평한 표) · 세션 보기(세션 목록 → 대화 패널). 보기·고른 세션은 주소(?view= · ?session= · ?focus=)
 *  · 조건 — 기간(기본 최근 7일 · 오늘 종료) · 사용자 그룹(부서) · 사용자(사번) · 검색어 · 평가 · 검토 · 응답 여부.
 *    질의 표는 열 머리글 필터(현재 쪽 기준)도 씁니다.
 *  · 답변 추가(학습 데이터) — 행마다 학습용 답변을 적어 둡니다(PUT …/{messageId}/train-answer). 비우고 저장하면 지웁니다.
 *    학습데이터 내보내기는 이 답변이 있는 행을 그 답변으로 넣습니다(서버).
 *  · 관리 기능(답변 추가 · 검토 · 학습데이터 · 디버그)은 canManage 가 참일 때만 엽니다.
 *    판정은 서버 요약의 canManage 를 먼저 보고, 없으면 canWrite(sys-chat-history) — 접근 && 미배정 아님.
 *  · LLM 메타(모델 · 토큰 · 답변 상태 · 의도 · 요청 ID)는 V71 이후 서버가 줍니다. 없으면 '—'.
 *  · 엑셀은 공통 옵션 패널입니다. 조회 목록 = 지금 표 행(정렬·필터 그대로), 전체 = 서버 생성(조건 무시).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { labelOf, loadCodeGroups } from '@domains/common/model/codeRepository';
import { useAsync } from '@shared/hooks/useAsync';
import { usePaging } from '@shared/hooks/usePaging';
import { recentDays } from '@shared/stores/useAppStore';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadFromServer, downloadXls } from '@shared/utils/exportUtil';
import * as repo from '../model/systemRepository';
import { NO_WRITE_MESSAGE, finishText, tokenText } from './useChatHistoryController';

/** 화면 ID — 권한·내려받기 이력에 같은 값을 씁니다 */
export const SCREEN_ID = 'sys-chat-history';
const ROUTE = '/system/chat-history';
/** 조회 범위 — 이 화면은 항상 전 사용자 */
const SCOPE = 'all';
/** 가린 값 — 엑셀에도 같은 글자로 나갑니다(공통 R-10) */
const HIDDEN_TEXT = '비공개';
/** 학습 데이터 답변 상한 (서버와 같게) */
export const TRAIN_ANSWER_MAX = 4000;

/** 질의 보기 엑셀 열 — 표 열과 같은 순서. attrs 는 응답 필드명 */
const EXPORT_HEAD = ['사용자', '부서', '질문', '답변', '판단 근거', '미응답 사유', '사용자 평가', '검토', '질문 시간', '답변 시간', '응답 시간(초)', '모델', '토큰', '답변 상태', '의도', '답변 추가(학습 데이터)'];
const EXPORT_ATTRS = ['name', 'dept', 'question', 'answer', 'judgmentBasis', 'unansweredReason', 'rating', 'review', 'ts', 'answeredAt', 'responseSec', 'llmModel', 'totalTokens', 'finishReason', 'intentNm', 'trainAnswer'];
/** 세션 보기 엑셀 열 */
const SESSION_HEAD = ['세션 시작', '부서', '사용자', '질의 수', '첫 질문', '마지막 질의', '응답 수', '유용', '오답', '검토'];
const SESSION_ATTRS = ['startedAt', 'dept', 'name', 'questionCnt', 'firstQuestion', 'lastAskedAt', 'answeredCnt', 'usefulCnt', 'badCnt', 'reviewedCnt'];

export function useChatHistoryAdminController() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const toast = useUiStore((state) => state.toast);
  // 함수(canWrite)만 구독하면 권한이 바뀌어도 다시 그리지 않으므로 값을 구독합니다
  const menuPerms = useAuthStore((state) => state.menuPerms);
  const unassigned = useAuthStore((state) => state.unassigned);
  const canWriteScreen = useMemo(() => useAuthStore.getState().canWrite(SCREEN_ID), [menuPerms, unassigned]); // eslint-disable-line react-hooks/exhaustive-deps

  // 보기 — 기본은 질의(평평한 표). 세션 보기에서 고른 세션은 주소에 남깁니다
  const view = params?.view === 'session' ? 'session' : 'message';
  const sessionKey = typeof params?.session === 'string' ? params.session : '';
  const focusId = typeof params?.focus === 'string' ? params.focus : '';

  // 질의 이력은 시스템 기록입니다 (실적 기준일과 무관) — 기본 최근 7일 · 오늘 종료
  const [from, setFrom] = useState(recentDays(8).from);
  const [to, setTo] = useState(recentDays(8).to);
  const [group, setGroup] = useState('전체');
  // 사용자(사번) · 검색어 — Enter · 조회 단추로 확정합니다(08 CHH-10)
  const [empNoInput, setEmpNoInput] = useState('');
  const [empNo, setEmpNo] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  // 평가(질의자) · 검토(관리자) · 응답 여부 — '전체' 는 조건 없음
  const [fRating, setRating] = useState('전체');
  const [fReview, setReview] = useState('전체');
  const [fAnswered, setAnswered] = useState('전체');
  /** 그리드 인스턴스 — 「조회 목록 다운로드」 가 정렬·필터 결과를 그대로 읽습니다 */
  const gridRef = useRef(null);

  // 사용자 그룹 선택지 — 기간 중 질의가 있는 부서(없으면 부서 목록으로 대신)
  const { data: deptOptions } = useAsync(() => repo.loadChatGroups({ from, to, scope: SCOPE }), [from, to], { silent: true, initialData: ['전체'] });
  // 평가 코드(USEFUL · REASK · BAD)의 표시명은 공통코드가 정본입니다
  const { data: codes } = useAsync(() => loadCodeGroups('AI_CHAT_RATING'), [], { silent: true, initialData: {} });
  const ratingCodes = codes?.AI_CHAT_RATING || [];
  /** 평가 코드 → 표시명 ('USEFUL' → '유용'). 이미 표시명이면 그대로 */
  const ratingLabel = useCallback((rating) => (rating ? labelOf(ratingCodes, rating) : ''), [ratingCodes]);

  const paging = usePaging({ size: 100, resetKey: `${view}|${from}|${to}|${group}|${empNo}|${keyword}|${fRating}|${fReview}|${fAnswered}` });
  const { data, loading, reload } = useAsync(
    () => {
      const q = { scope: SCOPE, from, to, group, empNo, keyword, rating: fRating, review: fReview, answered: fAnswered, ...paging.params };
      return view === 'session' ? repo.loadChatSessions(q) : repo.loadChatHistory(q);
    },
    [view, from, to, group, empNo, keyword, fRating, fReview, fAnswered, paging.page, paging.size]
  );

  /** 조회 단추 · Enter — 입력칸(사번 · 검색어)을 확정합니다. 바뀐 게 없으면 다시 부릅니다 */
  const search = useCallback(() => {
    const k = keywordInput.trim();
    const e = empNoInput.trim();
    if (k === keyword && e === empNo) reload();
    else {
      setKeyword(k);
      setEmpNo(e);
    }
  }, [keywordInput, keyword, empNoInput, empNo, reload]);

  /** 표 행 — 머리글 필터가 글자로 거를 수 있게 표시값(사용자 · 평가 · 검토 · 답변 상태)을 덧붙입니다 */
  const items = useMemo(
    () => (data?.list?.items || []).map((r) => ({
      ...r,
      userLabel: `${r.name || r.empNo || '—'}${r.dept ? ` (${r.dept})` : ''}`,
      ratingText: r.rating ? ratingLabel(r.rating) : '미평가',
      reviewText: r.review ? ratingLabel(r.review) : '미검토',
      finishText: finishText(r.finishReason),
    })),
    [data, ratingLabel]
  );

  const rawSummary = data?.summary;
  const summary = useMemo(() => (rawSummary ? {
    totalCnt: rawSummary.questionCnt ?? rawSummary.totalCnt ?? 0,
    sessionCnt: rawSummary.sessionCnt,
    answerRate: rawSummary.answerRate,
    avgElapsedSec: rawSummary.avgResponseSec ?? rawSummary.avgElapsedSec,
    reAskRate: rawSummary.requeryRate ?? rawSummary.reAskRate,
    usefulCnt: rawSummary.usefulCnt,
    badCnt: rawSummary.badCnt,
    reviewedCnt: rawSummary.reviewedCnt,
    retentionDays: rawSummary.retentionDays,
    expiredCnt: rawSummary.expiredCnt,
  } : null), [rawSummary]);
  /** 관리 기능 — 서버 canManage 를 먼저, 없으면 canWrite(sys-chat-history) */
  const canManage = rawSummary?.canManage ?? canWriteScreen;
  const maskedRowCnt = data?.list?.maskedRowCnt ?? items.filter((r) => r.answerHidden).length;
  const trainCnt = items.filter((r) => r.trainAnswer).length;

  const loadErrors = useMemo(
    () => Object.entries(data?.errors || {}).map(([k, e]) => `${k === 'summary' ? '요약' : view === 'session' ? '세션 목록' : '질의 목록'}을(를) 불러오지 못했습니다 — ${e?.message || '알 수 없는 오류'}`),
    [data, view]
  );

  // ── 세션 상세 ──────────────────────────────────────────
  const [session, setSession] = useState(null);
  const [sessionError, setSessionError] = useState('');
  const [sessionLoading, setSessionLoading] = useState(false);
  const sessionSeq = useRef(0);
  const loadSession = useCallback(async (key) => {
    sessionSeq.current += 1;
    const mine = sessionSeq.current;
    if (!key) {
      setSession(null);
      setSessionError('');
      return;
    }
    setSessionLoading(true);
    try {
      const d = await repo.fetchChatSession(key, SCOPE);
      if (mine !== sessionSeq.current) return;
      setSession(d);
      setSessionError(d ? '' : '세션을 찾을 수 없습니다');
    } catch (e) {
      if (mine !== sessionSeq.current) return;
      setSession(null);
      setSessionError(e?.code === 'E-NOTFOUND' ? '세션을 찾을 수 없습니다' : e?.message || '세션을 불러오지 못했습니다');
      if (e?.code === 'E-NOTFOUND') reload();
    } finally {
      if (mine === sessionSeq.current) setSessionLoading(false);
    }
  }, [reload]);
  useEffect(() => {
    loadSession(view === 'session' ? sessionKey : '');
  }, [view, sessionKey]); // eslint-disable-line react-hooks/exhaustive-deps

  /** 세션 열기 — 주소를 쌓아 뒤로 가기로 목록에 돌아오게 합니다. focus 는 강조할 질의 */
  const openSession = useCallback((key, focusMessageId) => {
    if (!key) return;
    router.push({ pathname: ROUTE, params: { view: 'session', session: String(key), ...(focusMessageId ? { focus: String(focusMessageId) } : {}) } });
  }, [router]);
  const closeSession = useCallback(() => router.setParams({ session: undefined, focus: undefined }), [router]);
  const setView = useCallback((v) => router.setParams({ view: v, session: undefined, focus: undefined }), [router]);

  const afterWrite = useCallback(() => {
    reload();
    if (sessionKey) loadSession(sessionKey);
  }, [reload, loadSession, sessionKey]);

  // ── 답변 추가(학습 데이터) · 검토 ──────────────────────
  /**
   * 학습 데이터 답변 저장 — 비우고 저장하면 지웁니다.
   * @returns {Promise<{ok:boolean, message?:string}>}
   */
  const saveTrainAnswer = useCallback(async (messageId, answer) => {
    if (!canManage) {
      toast(NO_WRITE_MESSAGE);
      return { ok: false };
    }
    const text = String(answer ?? '');
    if (text.trim().length > TRAIN_ANSWER_MAX) {
      return { ok: false, message: `학습 데이터 답변은 ${TRAIN_ANSWER_MAX.toLocaleString('ko-KR')}자까지 입력할 수 있습니다.` };
    }
    const res = await repo.saveChatTrainAnswer(messageId, text.trim() ? text : '');
    toast(res.message || (res.ok ? (text.trim() ? '학습 데이터 답변을 저장했습니다.' : '학습 데이터 답변을 지웠습니다.') : '학습 데이터 답변을 저장하지 못했습니다'));
    if (res.ok) afterWrite();
    return res;
  }, [canManage, toast, afterWrite]);

  /** 관리자 검토 (08 CHH-04) — 서버도 403 E-AUTH-004 로 막습니다 */
  const review = useCallback(async (messageId, reviewCd, comment) => {
    if (!canManage) {
      toast(NO_WRITE_MESSAGE);
      return { ok: false };
    }
    const res = await repo.reviewChatMessage(messageId, reviewCd, comment);
    toast(res.message || (res.ok ? '검토 결과를 저장했습니다.' : '검토를 저장하지 못했습니다'));
    if (res.ok) afterWrite();
    return res;
  }, [canManage, toast, afterWrite]);

  // ── 내려받기 ─────────────────────────────────────────
  const condSummary = useMemo(
    () => [`보기=${view === 'session' ? '세션' : '질의'}`, '범위=전 사용자', `기간=${from}~${to}`, `부서=${group}`, `사번=${empNo || '전체'}`, `검색=${keyword || '없음'}`, `평가=${fRating}`, `검토=${fReview}`, `응답=${fAnswered}`, `쪽=${paging.page}`].join(', '),
    [view, from, to, group, empNo, keyword, fRating, fReview, fAnswered, paging.page]
  );

  /** 표에 보이는 행 — 머리글 정렬·필터 결과 그대로 */
  const gridRows = useCallback(() => {
    try {
      const active = gridRef.current?.getRows?.('active');
      if (Array.isArray(active)) return active.map((r) => r.getData()).map((d) => (d.__idx != null ? items[d.__idx] : d)).filter(Boolean);
    } catch {
      /* 표가 아직 없으면 화면 데이터 그대로 */
    }
    return items;
  }, [items]);

  const messageRows = (list) => {
    let blind = 0;
    const rows = list.map((h) => {
      // 응답은 문장이라 열 단위 대응표로 가릴 수 없습니다 — 서버가 준 answerHidden 으로 가립니다
      if (h.answerHidden) blind += 1;
      return [
        h.name || h.empNo || '',
        h.dept || '',
        h.question,
        h.answerHidden ? HIDDEN_TEXT : h.answer || '',
        h.answerHidden ? HIDDEN_TEXT : h.judgmentBasis || h.evidenceSummary || '',
        h.unansweredReason || '',
        ratingLabel(h.rating) || '',
        ratingLabel(h.review) || '',
        h.ts || h.askedAt || '',
        h.answeredAt || '',
        h.responseSec == null ? '' : Number(h.responseSec).toFixed(1),
        h.llmModel || '',
        tokenText(h).replace(/^—$/, ''),
        finishText(h.finishReason).replace(/^—$/, ''),
        h.intentNm || '',
        h.trainAnswer || '',
      ];
    });
    return { rows, blind };
  };

  const exportView = useCallback(async () => {
    const list = gridRows();
    if (view === 'session') {
      downloadXls({
        name: '전사 자연어 질의 이력(세션)',
        head: SESSION_HEAD,
        attrs: SESSION_ATTRS,
        rows: list.map((r) => [r.startedAt, r.dept || '', r.name || '', r.questionCnt, r.firstQuestion, r.lastAskedAt, r.answeredCnt, r.usefulCnt, r.badCnt, r.reviewedCnt]),
        scope: 'VIEW',
        condSummary,
        menuId: SCREEN_ID,
      });
      return;
    }
    const { rows, blind } = messageRows(list);
    downloadXls({ name: '전사 자연어 질의 이력', head: EXPORT_HEAD, attrs: EXPORT_ATTRS, rows, blindCount: blind, scope: 'VIEW', condSummary, menuId: SCREEN_ID });
  }, [gridRows, view, condSummary]); // eslint-disable-line react-hooks/exhaustive-deps

  /** 전체 — 조회 조건과 관계없이 전체 기간 최근 5,000건(전 사용자)을 서버가 만듭니다. 이력은 서버가 기록합니다 */
  const exportAll = useCallback(async () => {
    await downloadFromServer({
      // 조회 범위는 주소 scope(본문 scope 는 VIEW/ALL 행 범위라 이름이 겹칩니다 — API 2026-10-03)
      path: `/ai/chat/history/export?scope=${SCOPE}`,
      body: {
        view: view === 'session' ? 'SESSION' : 'MESSAGE',
        scope: 'ALL',
        menuId: SCREEN_ID,
        condSummary: `보기=${view === 'session' ? '세션' : '질의'}, 범위=전 사용자, 전체 기간`,
        format: 'xlsx',
      },
      name: view === 'session' ? '전사 자연어 질의 이력(세션)' : '전사 자연어 질의 이력',
      limit: 5000,
    });
  }, [view]);

  /** 세션 상세의 「이 대화 내려받기」 — 한 행 = 한 질의 */
  const exportSession = useCallback(async () => {
    if (!session?.turns?.length) return;
    const list = session.turns.map((t) => ({ ...t, ts: t.askedAt, dept: session.dept, name: session.name, empNo: session.empNo }));
    const { rows, blind } = messageRows(list);
    downloadXls({
      name: `전사 자연어 질의 이력(세션 ${String(session.sessionKey || sessionKey).slice(0, 12)})`,
      head: EXPORT_HEAD,
      attrs: EXPORT_ATTRS,
      rows,
      blindCount: blind,
      scope: 'VIEW',
      condSummary: `보기=세션 상세, 세션=${session.sessionKey || sessionKey}`,
      menuId: SCREEN_ID,
    });
  }, [session, sessionKey]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * 학습데이터 내보내기 — 서버가 만든 .jsonl 파일을 받습니다(08 CHH-03).
   * 학습 데이터 답변이 있는 행은 그 답변을 assistant 로 넣습니다(서버). 0건이면 서버가 404 로 알려 줍니다.
   */
  const exportTrainset = useCallback(async ({ ratingFilter = 'USEFUL' } = {}) => {
    if (!canManage) {
      toast(NO_WRITE_MESSAGE);
      return false;
    }
    return downloadFromServer({
      path: '/ai/chat/history/export-trainset',
      body: { from, to, ratingFilter, source: 'REVIEW_OR_USER', format: 'jsonl' },
      name: '학습데이터',
    });
  }, [canManage, from, to, toast]);

  return {
    view,
    setView,
    paging,
    itemsMeta: data?.listMeta,
    initialLoading: loading && !data,
    refreshing: loading && !!data,
    loadErrors,
    summaryFailed: !!data?.errors?.summary,
    items,
    gridRef,
    summary,
    canManage,
    maskedRowCnt,
    trainCnt,
    filters: { from, to, group, empNo: empNoInput, keyword: keywordInput, rating: fRating, review: fReview, answered: fAnswered },
    deptOptions,
    setFrom,
    setTo,
    setGroup,
    setEmpNo: setEmpNoInput,
    setKeyword: setKeywordInput,
    setRating,
    setReview,
    setAnswered,
    search,
    reload,
    ratingLabel,
    loadDetail: (messageId) => repo.fetchChatDetail(messageId, SCOPE),
    saveTrainAnswer,
    review,
    // 세션
    sessionKey,
    focusId,
    session,
    sessionError,
    sessionLoading,
    openSession,
    closeSession,
    // 내려받기
    exportView,
    exportAll,
    exportSession,
    exportViewCount: items.length,
    exportTrainset,
  };
}
