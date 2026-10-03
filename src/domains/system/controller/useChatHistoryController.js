/**
 * [Controller] SY-08 자연어 질의 이력 (화면 ID chat-history · 경로 /history/chat)
 *
 * 2026-10-03 — 로그인한 계정 **본인** 의 질의 이력만 봅니다(조회는 모두 scope=mine). 모든 부서 기본 허용.
 * 전 사용자 이력 · 세션 목록 · 관리자 검토 · 학습데이터 · 디버그 · 부서/사용자 조건 · 이름 가림은
 * 시스템관리 > 전사 자연어 질의 이력(sys-chat-history, 관리자 전용 — useChatHistoryAdminController)으로 옮겼습니다.
 *
 *  · 2026-10-03 (2차) — 「세션 보기 / 질의 보기」 전환과 세션 목록을 없앴습니다. 질의 표 하나만 둡니다.
 *    행 클릭 상세 모달도 없앴습니다 — 근거 문서 · 평가 · 대화 보기를 표의 열로 옮겼습니다.
 *    대화 보기를 누르면 그 질의가 든 세션 대화를 옆 패널로 엽니다(주소 ?session= · ?focus= — 뒤로 가기로 닫힘).
 *  · LLM 메타(모델 · 토큰 · 답변 상태 · 의도)를 열로 보입니다. 서버가 아직 안 주면 '—' 입니다(V71).
 *  · 본인 질의라 평가 열의 「유용 · 개선 필요」 로 바로 평가합니다(덕반장 AI 와 같은 API).
 *  · 엑셀은 공통 옵션 패널입니다(CHH-19). 조회 목록 = 지금 표 열 · 행(정렬 그대로), 전체 = 서버 생성(조건 무시, 본인 행).
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
/** 조회 범위 — 이 화면은 항상 본인 */
const SCOPE = 'mine';
/** 쓰기 불가(미배정 계정)일 때 버튼 옆 안내 — 전사 화면이 씁니다 */
export const NO_WRITE_MESSAGE = '미배정 계정은 이 동작을 할 수 없습니다. 전산팀에 부서 배정을 요청하세요.';
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

/* ── LLM 메타 표기 (2026-10-03 2차) — 두 화면 · 엑셀이 같이 씁니다 ── */
const n0 = (v) => Number(v).toLocaleString('ko-KR');
/** 토큰 — 「입력 n · 출력 m」. 둘 다 없으면 '—' */
export const tokenText = (r) => {
  if (r?.promptTokens == null && r?.completionTokens == null) return '—';
  return `입력 ${r.promptTokens == null ? '—' : n0(r.promptTokens)} · 출력 ${r.completionTokens == null ? '—' : n0(r.completionTokens)}`;
};
/** 토큰 합계 안내(마우스 올림) */
export const tokenTitle = (r) => (r?.totalTokens == null ? '' : `합계 ${n0(r.totalTokens)} 토큰`);
/** 답변 상태(finish_reason) 표시명 — 모르는 값은 그대로 */
const FINISH_LABEL = { stop: '정상', length: '길이 제한으로 잘림', tool_calls: '도구 호출' };
export const finishText = (v) => (v === null || v === undefined || v === '' ? '—' : FINISH_LABEL[v] || String(v));
/** 근거 문서 한 줄 — 「제목 · p.3 · 0.82」 (쪽이 여럿이면 「p.3, 5」) */
export const docLine = (d) => {
  const pages = Array.isArray(d.pages) ? d.pages : d.page != null && d.page !== '' ? [d.page] : [];
  return [d.title || '—', pages.length ? `p.${pages.join(', ')}` : '', d.score != null ? Number(d.score).toFixed(2) : ''].filter(Boolean).join(' · ');
};
/**
 * 근거 문서 묶기 — 서버 docs 는 검색 조각(hit) 단위라 같은 문서가 여러 번 옵니다.
 * 제목으로 묶고 쪽은 모으며 점수는 가장 높은 값을 둡니다. 순서는 처음 나온 순서.
 */
export const docGroups = (docs = []) => {
  const map = new Map();
  docs.forEach((d) => {
    const key = d.title || '—';
    const g = map.get(key) || { title: key, pages: [], score: null };
    if (d.page != null && d.page !== '' && !g.pages.includes(d.page)) g.pages.push(d.page);
    if (d.score != null && (g.score == null || Number(d.score) > g.score)) g.score = Number(d.score);
    map.set(key, g);
  });
  return [...map.values()];
};
/** 근거 수 안내 — 문서(제목) 수와 조각 수(docCnt)가 다를 때 「근거 n건」 을 덧붙입니다 */
export const docCountNote = (r) => {
  const groups = docGroups(r?.docs || []);
  const cnt = r?.docCnt ?? (r?.docs || []).length;
  return cnt > groups.length ? `근거 ${cnt.toLocaleString('ko-KR')}건` : '';
};
/** 근거 문서 요약(엑셀) — 문서별 한 줄 + 근거 수. 없으면 '—' */
export const docsText = (r) => {
  const groups = docGroups(r?.docs || []);
  if (!groups.length) return '—';
  return [...groups.map(docLine), docCountNote(r)].filter(Boolean).join('\n');
};

/** 엑셀 열 — 표 열과 같은 순서(대화 단추 열은 뺍니다). attrs 는 응답 필드명 (08 CHH-19) */
const MESSAGE_HEAD = ['질문 시간', '질문', '응답', '판단 근거', '근거 문서', '응답 시간(초)', '모델', '토큰', '답변 상태', '의도', '평가'];
const MESSAGE_ATTRS = ['ts', 'question', 'answer', 'judgmentBasis', 'docs', 'responseSec', 'llmModel', 'totalTokens', 'finishReason', 'intentNm', 'rating'];

export function useChatHistoryController() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const toast = useUiStore((state) => state.toast);
  const me = useAuthStore((state) => state.userInfo);

  // 대화 패널 — 주소 ?session= · ?focus= (질의 표의 「대화 보기 ›」 가 엽니다)
  const sessionKey = typeof params?.session === 'string' ? params.session : '';
  const focusId = typeof params?.focus === 'string' ? params.focus : '';

  // 질의 이력도 시스템 기록입니다 (실적 기준일과 무관)
  const [from, setFrom] = useState(recentDays(8).from);
  const [to, setTo] = useState(recentDays(8).to);
  // 검색어 — Enter · 조회 단추로 확정합니다(08 CHH-10)
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  // 평가(본인) · 응답 여부 (08 CHH-10) — '전체' 는 조건 없음
  const [fRating, setRating] = useState('전체');
  const [fAnswered, setAnswered] = useState('전체');
  /** 그리드 인스턴스 — 「조회 목록 다운로드」 가 정렬 결과를 그대로 읽습니다 */
  const gridRef = useRef(null);

  // 평가 코드(USEFUL · REASK · BAD)의 표시명은 공통코드가 정본입니다
  const { data: codes } = useAsync(() => loadCodeGroups('AI_CHAT_RATING'), [], { silent: true, initialData: {} });
  const ratingCodes = codes?.AI_CHAT_RATING || [];

  const paging = usePaging({ resetKey: `${from}|${to}|${keyword}|${fRating}|${fAnswered}` });
  const { data, loading, reload } = useAsync(
    () => repo.loadChatHistory({ scope: SCOPE, from, to, keyword, rating: fRating, answered: fAnswered, ...paging.params }),
    [from, to, keyword, fRating, fAnswered, paging.page, paging.size]
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

  const loadErrors = useMemo(
    () => Object.entries(data?.errors || {}).map(([k, e]) => `${k === 'summary' ? '요약' : '질의 목록'}을(를) 불러오지 못했습니다 — ${e?.message || '알 수 없는 오류'}`),
    [data]
  );

  /** 평가 코드 → 표시명 ('USEFUL' → '유용'). 이미 표시명이면 그대로 */
  const ratingLabel = useCallback((rating) => (rating ? labelOf(ratingCodes, rating) : ''), [ratingCodes]);
  /** 질의자 본인인지 — 서버가 본인 행만 주므로 사번이 비어 있어도 본인으로 봅니다 */
  const isOwn = useCallback((row) => !row?.empNo || !me?.empNo || String(row.empNo) === String(me.empNo), [me]);

  // ── 대화(세션) 패널 ─────────────────────────────────────
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
      setSessionError(d ? '' : '대화를 찾을 수 없습니다');
    } catch (e) {
      if (mine !== sessionSeq.current) return;
      setSession(null);
      // 삭제·파기된 세션 — 안내하고 목록을 다시 부릅니다(08 4.3 상태표)
      setSessionError(e?.code === 'E-NOTFOUND' ? '대화를 찾을 수 없습니다' : e?.message || '대화를 불러오지 못했습니다');
      if (e?.code === 'E-NOTFOUND') reload();
    } finally {
      if (mine === sessionSeq.current) setSessionLoading(false);
    }
  }, [reload]);
  useEffect(() => {
    loadSession(sessionKey);
  }, [sessionKey]); // eslint-disable-line react-hooks/exhaustive-deps

  /** 대화 열기 — 주소를 쌓아 뒤로 가기로 닫히게 합니다. focus 는 강조할 질의 */
  const openSession = useCallback((key, focusMessageId) => {
    if (!key) return;
    router.push({ pathname: ROUTE, params: { session: String(key), ...(focusMessageId ? { focus: String(focusMessageId) } : {}) } });
  }, [router]);
  const closeSession = useCallback(() => router.setParams({ session: undefined, focus: undefined }), [router]);

  // ── 평가 ──────────────────────────────────────────────
  const afterWrite = useCallback(() => {
    reload();
    if (sessionKey) loadSession(sessionKey);
  }, [reload, loadSession, sessionKey]);

  /** 질의자 본인 평가 (덕반장 AI 와 같은 API) — 'good' 유용 · 'bad' 개선 필요 */
  const rate = useCallback(async (messageId, rating) => {
    const res = await repo.rateChatMessage(messageId, rating);
    toast(res.message);
    if (res.ok) afterWrite();
    return res;
  }, [toast, afterWrite]);

  // ── 엑셀 (조회 목록 / 전체 / 이 대화) ───────────────────
  const condSummary = useMemo(
    () => ['범위=본인', `기간=${from}~${to}`, `검색=${keyword || '없음'}`, `평가=${fRating}`, `응답=${fAnswered}`, `쪽=${paging.page}`].join(', '),
    [from, to, keyword, fRating, fAnswered, paging.page]
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
        h.question,
        h.answerHidden ? HIDDEN_TEXT : h.answer || '',
        h.answerHidden ? HIDDEN_TEXT : h.judgmentBasis || h.evidenceSummary || '',
        h.answerHidden ? HIDDEN_TEXT : docsText(h).replace(/^—$/, ''),
        h.responseSec == null ? '' : Number(h.responseSec).toFixed(1),
        h.llmModel || '',
        tokenText(h).replace(/^—$/, ''),
        finishText(h.finishReason).replace(/^—$/, ''),
        h.intentNm || '',
        ratingLabel(h.rating) || '',
      ];
    });
    return { rows, blind };
  };

  const exportView = useCallback(async () => {
    const { rows, blind } = messageRows(gridRows());
    downloadXls({ name: '자연어 질의 이력', head: MESSAGE_HEAD, attrs: MESSAGE_ATTRS, rows, blindCount: blind, scope: 'VIEW', condSummary, menuId: SCREEN_ID });
  }, [gridRows, condSummary]); // eslint-disable-line react-hooks/exhaustive-deps

  /** 전체 — 조회 조건과 관계없이 전체 기간 최근 5,000건(본인 행)을 서버가 만듭니다. 이력은 서버가 기록합니다 */
  const exportAll = useCallback(async () => {
    await downloadFromServer({
      // 조회 범위는 주소 scope(본문 scope 는 VIEW/ALL 행 범위라 이름이 겹칩니다 — API 2026-10-03)
      path: `/ai/chat/history/export?scope=${SCOPE}`,
      body: { view: 'MESSAGE', scope: 'ALL', menuId: SCREEN_ID, condSummary: '보기=질의, 범위=본인, 전체 기간', format: 'xlsx' },
      name: '자연어 질의 이력',
      limit: 5000,
    });
  }, []);

  /** 대화 패널의 「이 대화 내려받기」 — 한 행 = 한 질의(조회 목록 범위, 08 Q16) */
  const exportSession = useCallback(async () => {
    if (!session?.turns?.length) return;
    const list = session.turns.map((t) => ({ ...t, ts: t.askedAt }));
    const { rows, blind } = messageRows(list);
    downloadXls({
      name: `자연어 질의 이력(대화 ${String(session.sessionKey || sessionKey).slice(0, 12)})`,
      head: MESSAGE_HEAD,
      attrs: MESSAGE_ATTRS,
      rows,
      blindCount: blind,
      scope: 'VIEW',
      condSummary: `보기=대화, 세션=${session.sessionKey || sessionKey}`,
      menuId: SCREEN_ID,
    });
  }, [session, sessionKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
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
    filters: { from, to, keyword: keywordInput, appliedKeyword: keyword, rating: fRating, answered: fAnswered },
    setRating,
    setAnswered,
    ratingLabel,
    isOwn,
    setFrom,
    setTo,
    setKeyword: setKeywordInput,
    search,
    reload,
    rate,
    // 대화 패널
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
  };
}
