/**
 * [Controller] SY-08 자연어 질의 이력 (화면 ID chat-history · 경로 /history/chat)
 *
 * 전 사용자의 질의 이력을 모두가 봅니다(결정 R-08 — 08 CHH-01). 미배정 계정은 본인 이력만 봅니다(D-22 결정됨 — 공통 11.5 R-21). 질의자보다 데이터 권한이 좁으면
 * 서버가 응답·근거를 가리고(answerHidden), 쓰기 권한이 없으면 남의 이름을 가립니다(CHH-02·09).
 *
 *  · 보기는 두 가지입니다(결정 R-12 — CHH-18). 세션 보기(기본) = 세션 목록 → 세션 대화, 질의 보기 = 질의 한 건씩.
 *    보기·고른 세션은 주소(?view= · ?session= · ?focus=)에 남깁니다. 세션을 열 때는 주소를 쌓아 뒤로 가기로 목록에 돌아옵니다.
 *  · 관리 기능(관리자 검토 · 학습데이터 내보내기 · 디버그)은 이 화면의 쓰기 권한 보유자에게만 엽니다(CHH-16).
 *    판정은 서버 요약의 canManage 를 먼저 보고, 없으면 /auth/me 의 writePerms 로 대신합니다.
 *  · 엑셀은 공통 옵션 패널입니다(CHH-19). 조회 목록 = 지금 그리드 행(정렬 그대로), 전체 = 서버 생성(조건 무시).
 *    학습데이터 내보내기는 패널 밖 별도 버튼이며 쓰기 권한이 필요합니다(공통 10.6).
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

/** 화면 ID — 권한·내려받기 이력에 같은 값을 씁니다 */
const SCREEN_ID = 'chat-history';
const ROUTE = '/history/chat';
/** 쓰기 권한이 없을 때 버튼 옆 안내 (공통 R-06) */
export const NO_WRITE_MESSAGE = '이 화면의 쓰기 권한이 없습니다. 전산팀에 요청하세요.';
/** 가린 값 — 엑셀에도 같은 글자로 나갑니다(공통 R-10) */
const HIDDEN_TEXT = '비공개';

/** 응답 시간 표기 — 초 단위 소수 1자리, 없으면 '—' */
export const secText = (sec) => (sec === null || sec === undefined || sec === '' ? '—' : `${Number(sec).toFixed(1)}s`);
/** 'YYYY-MM-DD HH:mm:ss' → 'MM-DD HH:mm' (짧은 값은 그대로) */
export const shortTs = (ts, withSec = false) => {
  const v = String(ts || '');
  if (v.length < 16) return v || '—';
  return v.slice(5, withSec ? 19 : 16);
};

/** 질의 보기 엑셀 열 — 응답 필드명(attrs)과 같은 순서 (08 CHH-19) */
const MESSAGE_HEAD = ['시각', '부서', '사용자', '질문', '응답', '판단 근거', '미응답 사유', '응답 시간(초)', '평가', '검토'];
const MESSAGE_ATTRS = ['ts', 'dept', 'name', 'question', 'answer', 'judgmentBasis', 'unansweredReason', 'responseSec', 'rating', 'review'];
/** 세션 보기 엑셀 열 */
const SESSION_HEAD = ['세션 시작', '부서', '사용자', '질의 수', '첫 질문', '마지막 질의', '응답 수', '유용', '오답', '검토'];
const SESSION_ATTRS = ['startedAt', 'dept', 'name', 'questionCnt', 'firstQuestion', 'lastAskedAt', 'answeredCnt', 'usefulCnt', 'badCnt', 'reviewedCnt'];

export function useChatHistoryController() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const toast = useUiStore((state) => state.toast);
  const me = useAuthStore((state) => state.userInfo);
  const unassigned = useAuthStore((state) => state.unassigned);
  const canWriteScreen = useAuthStore((state) => state.canWrite(SCREEN_ID));

  const view = params?.view === 'message' ? 'message' : 'session';
  const sessionKey = typeof params?.session === 'string' ? params.session : '';
  const focusId = typeof params?.focus === 'string' ? params.focus : '';

  // 질의 이력도 시스템 기록입니다 (실적 기준일과 무관)
  const [from, setFrom] = useState(recentDays(8).from);
  const [to, setTo] = useState(recentDays(8).to);
  const [group, setGroup] = useState('전체');
  // 검색어 — Enter · 조회 단추로 확정합니다(08 CHH-10)
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  // 평가(질의자) · 검토(관리자) · 응답 여부 (08 CHH-10) — '전체' 는 조건 없음
  const [fRating, setRating] = useState('전체');
  const [fReview, setReview] = useState('전체');
  const [fAnswered, setAnswered] = useState('전체');
  /** 그리드 인스턴스 — 「조회 목록 다운로드」 가 정렬 결과를 그대로 읽습니다 */
  const gridRef = useRef(null);

  // 사용자 그룹 선택지 — 기간 중 질의가 있는 부서(없으면 부서 목록으로 대신)
  const { data: deptOptions } = useAsync(() => repo.loadChatGroups({ from, to }), [from, to], { silent: true, initialData: ['전체'] });
  // 평가 코드(USEFUL · REASK · BAD)의 표시명은 공통코드가 정본입니다
  const { data: codes } = useAsync(() => loadCodeGroups('AI_CHAT_RATING'), [], { silent: true, initialData: {} });
  const ratingCodes = codes?.AI_CHAT_RATING || [];

  const paging = usePaging({ resetKey: `${view}|${from}|${to}|${group}|${keyword}|${fRating}|${fReview}|${fAnswered}` });
  const { data, loading, reload } = useAsync(
    () => {
      const q = { from, to, group, keyword, rating: fRating, review: fReview, answered: fAnswered, ...paging.params };
      return view === 'session' ? repo.loadChatSessions(q) : repo.loadChatHistory(q);
    },
    [view, from, to, group, keyword, fRating, fReview, fAnswered, paging.page, paging.size]
  );
  // 서버가 시각 내림차순으로 줍니다 — 예전의 현재 쪽 재정렬은 서버 정렬과 같아 없앴습니다(08 CHH-12)
  const items = useMemo(() => data?.list?.items || [], [data]);

  const search = useCallback(() => {
    const next = keywordInput.trim();
    if (next === keyword) reload();
    else setKeyword(next);
  }, [keywordInput, keyword, reload]);

  /**
   * 요약 카드 — 서버 필드명(answerRate · questionCnt · avgResponseSec · requeryRate)을 화면 이름으로 맞춥니다.
   */
  const rawSummary = data?.summary;
  const summary = useMemo(() => {
    if (!rawSummary) return null;
    return {
      totalCnt: rawSummary.questionCnt ?? rawSummary.totalCnt ?? 0,
      sessionCnt: rawSummary.sessionCnt,
      answerRate: rawSummary.answerRate,
      avgElapsedSec: rawSummary.avgResponseSec ?? rawSummary.avgElapsedSec,
      reAskRate: rawSummary.requeryRate ?? rawSummary.reAskRate,
      targetAnswerRate: rawSummary.targetAnswerRate ?? rawSummary.targetAnswerRatePct ?? rawSummary.targetAccuracy,
      usefulCnt: rawSummary.usefulCnt,
      badCnt: rawSummary.badCnt,
      reviewedCnt: rawSummary.reviewedCnt,
      retentionDays: rawSummary.retentionDays,
      // 보존 기간이 지나 다음 정리 때 지울 건수 (결정 R-20 — 매일 03:10)
      expiredCnt: rawSummary.expiredCnt,
    };
  }, [rawSummary]);
  // 관리 기능 — 서버 canManage 를 먼저, 없으면 /auth/me 쓰기 권한(08 CHH-16)
  const canManage = rawSummary?.canManage ?? canWriteScreen;
  const maskedRowCnt = data?.list?.maskedRowCnt ?? items.filter((r) => r.answerHidden).length;

  const loadErrors = useMemo(
    () => Object.entries(data?.errors || {}).map(([k, e]) => `${k === 'summary' ? '요약' : view === 'session' ? '세션 목록' : '질의 목록'}을(를) 불러오지 못했습니다 — ${e?.message || '알 수 없는 오류'}`),
    [data, view]
  );

  /** 평가 코드 → 표시명 ('USEFUL' → '유용'). 이미 표시명이면 그대로 */
  const ratingLabel = useCallback((rating) => (rating ? labelOf(ratingCodes, rating) : ''), [ratingCodes]);
  /** 질의자 본인인지 — 본인 질의에만 「유용함 · 오답」 평가를 엽니다 */
  const isOwn = useCallback((row) => !!(row?.empNo && me?.empNo && String(row.empNo) === String(me.empNo)), [me]);

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
      const d = await repo.fetchChatSession(key);
      if (mine !== sessionSeq.current) return;
      setSession(d);
      setSessionError(d ? '' : '세션을 찾을 수 없습니다');
    } catch (e) {
      if (mine !== sessionSeq.current) return;
      setSession(null);
      // 삭제·파기된 세션 — 안내하고 목록을 다시 부릅니다(08 4.3 상태표)
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

  // ── 평가 · 검토 ────────────────────────────────────────
  const afterWrite = useCallback(() => {
    reload();
    if (sessionKey) loadSession(sessionKey);
  }, [reload, loadSession, sessionKey]);

  /** 질의자 본인 평가 (덕반장 AI 와 같은 API) */
  const rate = useCallback(async (messageId, rating) => {
    const res = await repo.rateChatMessage(messageId, rating);
    toast(res.message);
    if (res.ok) afterWrite();
    return res;
  }, [toast, afterWrite]);

  /** 관리자 검토 — 쓰기 권한 보유자만(08 CHH-04·16). 서버도 403 E-AUTH-004 로 막습니다 */
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

  // ── 엑셀 (조회 목록 / 전체 / 이 세션) ───────────────────
  const condSummary = useMemo(
    () => [`보기=${view === 'session' ? '세션' : '질의'}`, `기간=${from}~${to}`, `부서=${group}`, `검색=${keyword || '없음'}`, `평가=${fRating}`, `검토=${fReview}`, `응답=${fAnswered}`, `쪽=${paging.page}`].join(', '),
    [view, from, to, group, keyword, fRating, fReview, fAnswered, paging.page]
  );

  /** 그리드에 보이는 행 — 머리글 정렬 결과 순서 그대로 */
  const gridRows = useCallback(() => {
    try {
      const active = gridRef.current?.getRows?.('active');
      if (Array.isArray(active) && active.length) {
        return active.map((r) => r.getData()).map((d) => (d.__idx != null ? items[d.__idx] : d)).filter(Boolean);
      }
    } catch {
      /* 표가 아직 없으면 화면 데이터 그대로 */
    }
    return items;
  }, [items]);

  const messageRows = (list) => {
    let blind = 0;
    const rows = list.map((h) => {
      // 질의 이력의 응답은 문장이라 열 단위 대응표로 가릴 수 없습니다 — 서버가 준 answerHidden 으로 가립니다(08 CHH-19)
      if (h.answerHidden) blind += 1;
      return [
        h.ts || h.askedAt,
        h.dept || '',
        h.name || '',
        h.question,
        h.answerHidden ? HIDDEN_TEXT : h.answer || '',
        h.answerHidden ? HIDDEN_TEXT : h.judgmentBasis || h.evidenceSummary || '',
        h.unansweredReason || '',
        h.responseSec == null ? '' : Number(h.responseSec).toFixed(1),
        ratingLabel(h.rating) || '',
        ratingLabel(h.review) || '',
      ];
    });
    return { rows, blind };
  };

  const exportView = useCallback(async () => {
    const list = gridRows();
    if (view === 'session') {
      downloadXls({
        name: '자연어 질의 이력(세션)',
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
    downloadXls({ name: '자연어 질의 이력', head: MESSAGE_HEAD, attrs: MESSAGE_ATTRS, rows, blindCount: blind, scope: 'VIEW', condSummary, menuId: SCREEN_ID });
  }, [gridRows, view, condSummary]); // eslint-disable-line react-hooks/exhaustive-deps

  /** 전체 — 조회 조건과 관계없이 전체 기간 최근 5,000건을 서버가 만듭니다. 이력은 서버가 기록합니다 */
  const exportAll = useCallback(async () => {
    await downloadFromServer({
      path: '/ai/chat/history/export',
      body: {
        view: view === 'session' ? 'SESSION' : 'MESSAGE',
        scope: 'ALL',
        menuId: SCREEN_ID,
        condSummary: `보기=${view === 'session' ? '세션' : '질의'}, 전체 기간`,
        format: 'xlsx',
      },
      name: view === 'session' ? '자연어 질의 이력(세션)' : '자연어 질의 이력',
      limit: 5000,
    });
  }, [view]);

  /** 세션 상세의 「이 세션 내려받기」 — 한 행 = 한 질의(조회 목록 범위, 08 Q16) */
  const exportSession = useCallback(async () => {
    if (!session?.turns?.length) return;
    const list = session.turns.map((t) => ({ ...t, ts: t.askedAt, dept: session.dept, name: session.name }));
    const { rows, blind } = messageRows(list);
    downloadXls({
      name: `자연어 질의 이력(세션 ${String(session.sessionKey || sessionKey).slice(0, 12)})`,
      head: MESSAGE_HEAD,
      attrs: MESSAGE_ATTRS,
      rows,
      blindCount: blind,
      scope: 'VIEW',
      condSummary: `보기=세션 상세, 세션=${session.sessionKey || sessionKey}`,
      menuId: SCREEN_ID,
    });
  }, [session, sessionKey]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * 학습데이터 내보내기 — 서버가 만든 .jsonl 파일을 받습니다(08 CHH-03). 쓰기 권한이 필요합니다.
   * 조회 중인 기간과 고른 평가 조건으로 보내고, 0건이면 서버가 404 로 알려 줍니다.
   * 옛 JSON 응답 경로(exportTrainsetByRange)는 제거됨 — 파일이 오지 않았습니다.
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
    loading,
    initialLoading: loading && !data,
    refreshing: loading && !!data,
    loadErrors,
    summaryFailed: !!data?.errors?.summary,
    items,
    gridRef,
    summary,
    canManage,
    unassigned,
    maskedRowCnt,
    filters: { from, to, group, keyword: keywordInput, appliedKeyword: keyword, rating: fRating, review: fReview, answered: fAnswered },
    setRating,
    setReview,
    setAnswered,
    deptOptions,
    ratingLabel,
    isOwn,
    setFrom,
    setTo,
    setGroup,
    setKeyword: setKeywordInput,
    search,
    reload,
    loadDetail: repo.fetchChatDetail,
    rate,
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
