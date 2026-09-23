/**
 * [Controller] AI-01 자연어 질의
 *
 * 질문 하나는 두 단계로 답합니다.
 *  1. `/api/v1/ai/chat/ask` — 사내 문서 검색 · 실적 DB 집계(수치 질문일 때) · 권한 마스킹 · 질의 이력 기록.
 *     근거(`dataEvidence[].text` · `sources[].snippet`)만 씁니다
 *  2. `/api/ai/chat` — 그 근거를 붙여 사내 LLM(dwje-ax)에 묻고 답을 **스트리밍으로 점진 표시**합니다
 * 사용자가 「근거 문서」 칸에 글을 넣으면 검색 결과 대신 그 글을 근거로 씁니다.
 * 근거가 없으면 모델은 「사내 문서에서 확인할 수 없습니다」라고 답합니다 — 정상입니다.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useAsync } from '@shared/hooks/useAsync';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { streamLlmChat, LLM_ERRORS } from '@services/api/llmStream';
import { ask, exportMessage, loadSession, loadSuggestions, rateMessage, speechToText, startNewSession } from '../model/aiRepository';

/** 대화 세션 ID 보관 — 새로고침해도 직전 대화를 이어 볼 수 있게 합니다 */
const SESSION_KEY = 'dwje.ax.chatSession';

function restoreSessionId() {
  try {
    return typeof window !== 'undefined' ? window.localStorage?.getItem(SESSION_KEY) || null : null;
  } catch {
    return null;
  }
}

function rememberSessionId(sessionId) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    if (sessionId) window.localStorage.setItem(SESSION_KEY, String(sessionId));
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    /* 저장소를 못 쓰면 세션 유지만 포기합니다 */
  }
}

/** 근거로 쓸 검색 결과 — 권한 때문에 발췌가 가려진 문서는 제목만 남으므로 근거로 넘기지 않습니다 */
function usableSources(sources) {
  return (sources || []).filter((x) => x && !x.blinded && String(x.snippet || '').trim());
}

/**
 * 근거 목록 → `[근거]` 글. 번호는 화면의 근거 목록 번호와 같아 답의 `[1]` 이 그 항목을 가리킵니다.
 * 실적 DB 집계(`kind: 'data'`)가 앞 번호, 사내 문서 발췌가 뒤 번호입니다.
 */
function sourcesToContext(sources) {
  return sources
    .map((x, i) => {
      if (x.kind === 'data') return `[${i + 1}] ${String(x.text).trim()}`;
      const where = [x.page ? `${x.page}쪽` : '', x.docDate || ''].filter(Boolean).join(' · ');
      return `[${i + 1}] ${x.title || '문서'}${where ? ` (${where})` : ''}\n${String(x.snippet).trim()}`;
    })
    .join('\n\n');
}

/** 서버가 집계한 실적 근거 — 수치 질문일 때만 옵니다 (문서에는 월별 불량률 같은 수치가 없습니다) */
function dataSources(list) {
  return (list || []).filter((x) => x && String(x.text || '').trim()).map((x) => ({ ...x, kind: 'data' }));
}

/** 화면 대화 → 모델에 보낼 대화. 오류 말풍선과 빈 답은 뺍니다(서버가 최근 10턴만 씁니다) */
function toLlmHistory(messages) {
  const out = [];
  messages.forEach((m) => {
    if (m.who === 'me' && m.text) out.push({ role: 'user', content: String(m.text) });
    else if (m.who === 'ai' && m.llm && m.status !== 'error' && m.text) out.push({ role: 'assistant', content: String(m.text) });
  });
  return out;
}

export function useChatController({ consumeRouteQuery = true } = {}) {
  const toast = useUiStore((state) => state.toast);
  const servingModelVer = useAuthStore((state) => state.servingModelVer);
  const params = useLocalSearchParams();

  const [messages, setMessages] = useState([]);
  const [followups, setFollowups] = useState([]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  /** 진행 단계 — idle · searching(근거 찾는 중) · waiting(첫 조각 전) · streaming */
  const [phase, setPhase] = useState('idle');
  const [sessionId, setSessionId] = useState(null);
  /** 「근거 문서」 칸 — 비어 있으면 사내 문서 검색 결과를 근거로 씁니다 */
  const [context, setContext] = useState('');

  const abortRef = useRef(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  /** 말풍선 하나만 고칩니다 — 조각이 올 때마다 부르므로 나머지는 그대로 둡니다 */
  const patchMessage = useCallback((key, patch) => {
    setMessages((prev) => prev.map((m) => (m.localKey === key ? { ...m, ...patch } : m)));
  }, []);

  const { data: suggestionData } = useAsync(() => loadSuggestions(), [], { silent: true });

  // 세션 대화 복원 — 이전 세션 ID 가 있을 때만 (첫 진입은 빈 대화로 시작합니다)
  useEffect(() => {
    let alive = true;
    const saved = restoreSessionId();
    if (!saved) return undefined;
    loadSession(saved)
      .then((res) => {
        if (!alive) return;
        setMessages(res?.messages || []);
        setSessionId(res?.sessionId || saved);
      })
      .catch(() => rememberSessionId(null));
    return () => {
      alive = false;
    };
  }, []);

  /** 질의 전송 */
  const send = useCallback(
    async (text) => {
      const question = String(text ?? '').trim();
      if (!question || pending) return;
      const history = toLlmHistory(messagesRef.current);
      const manual = context.trim();
      const abort = new AbortController();
      abortRef.current = abort;

      setInput('');
      setPending(true);
      setPhase('searching');
      setMessages((prev) => [...prev, { messageId: `local-${Date.now()}`, who: 'me', text: question }]);

      // 1. 근거 — 검색·권한·이력 기록. 실패해도 질문은 모델로 보냅니다(근거 없이 답하게 됩니다)
      const res = await ask(sessionId, question);
      const meta = res.ok ? res.data || {} : {};
      if (res.ok) {
        // 후속 질의는 문자열 또는 { q } 객체로 옵니다 — 화면은 문자열만 받습니다
        setFollowups((meta.followups || []).map((f) => (typeof f === 'string' ? f : f?.q || f?.question || f?.text || '')).filter(Boolean));
        setSessionId(meta.sessionId);
        rememberSessionId(meta.sessionId);
      } else if (!manual) {
        toast('사내 문서 검색에 실패해 근거 없이 질의합니다');
      }
      // 수치 질문(집계 근거가 있을 때)은 문서를 3건까지만 — 월별 수치와 무관한 FACA 보고서가 근거 목록을 채우지 않게
      const data = manual ? [] : dataSources(meta.dataEvidence);
      const docs = manual ? [] : usableSources(meta.sources).slice(0, data.length ? 3 : undefined);
      const sources = [...data, ...docs];
      const evidence = manual || sourcesToContext(sources);

      // 2. 사내 LLM — 첫 조각이 오기 전까지는 말풍선 대신 「모델 준비 중」을 보여 줍니다
      const localKey = `llm-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          localKey,
          who: 'ai',
          llm: true,
          status: 'waiting',
          text: '',
          messageId: meta.messageId,
          sources,
          manualContext: !!manual,
          blindFields: meta.blindFields,
        },
      ]);
      setPhase('waiting');

      const started = Date.now();
      const result = abort.signal.aborted
        ? { status: 'aborted', text: '' }
        : await streamLlmChat({
            messages: [...history, { role: 'user', content: question }],
            context: evidence,
            messageId: meta.messageId,
            signal: abort.signal,
            onDelta: (full) => {
              setPhase('streaming');
              patchMessage(localKey, { text: full, status: 'streaming' });
            },
          });

      const elapsedMs = Date.now() - started;
      if (result.status === 'done') patchMessage(localKey, { text: result.text, status: 'done', elapsedMs });
      else if (result.status === 'aborted') patchMessage(localKey, { text: result.text, status: 'aborted', elapsedMs });
      else if (result.status === 'interrupted') {
        patchMessage(localKey, { text: `${result.text}${result.text ? '\n\n' : ''}${LLM_ERRORS.interrupted}`, status: 'interrupted', elapsedMs });
      } else patchMessage(localKey, { text: result.message, status: 'error' });

      if (abortRef.current === abort) abortRef.current = null;
      setPending(false);
      setPhase('idle');
    },
    [context, patchMessage, pending, sessionId, toast]
  );

  /** 생성 중단 — 받은 데까지는 남깁니다 */
  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  // 화면을 떠나면 진행 중인 생성을 끊습니다 (LLM 서버는 한 번에 한 건만 처리합니다)
  useEffect(() => () => abortRef.current?.abort(), []);

  // 상단 통합 검색에서 넘어온 질문을 자동으로 던집니다
  const handledQuery = useRef('');
  useEffect(() => {
    const q = params?.q;
    if (consumeRouteQuery && q && q !== handledQuery.current) {
      handledQuery.current = q;
      send(q);
    }
  }, [consumeRouteQuery, params?.q, send]);

  /** 새 대화 시작 — 세션이 없으면 화면만 비웁니다 */
  const newSession = useCallback(async () => {
    abortRef.current?.abort();
    if (sessionId) {
      const res = await startNewSession(sessionId);
      toast(res.message || '새 대화를 시작합니다');
    } else {
      toast('새 대화를 시작합니다');
    }
    setMessages([]);
    setFollowups([]);
    setSessionId(null);
    rememberSessionId(null);
  }, [sessionId, toast]);

  const exportAnswer = useCallback(
    async (messageId) => {
      const res = await exportMessage(messageId, 'xls');
      toast(res.message);
    },
    [toast]
  );

  const rate = useCallback(
    async (messageId, rating) => {
      const res = await rateMessage(messageId, rating);
      toast(res.message);
    },
    [toast]
  );

  const requestVoice = useCallback(async () => {
    const res = await speechToText();
    toast(res.message);
  }, [toast]);

  return {
    messages,
    followups,
    input,
    setInput,
    pending,
    phase,
    context,
    setContext,
    stop,
    suggestions: suggestionData?.suggestions || [],
    servingModelVer,
    askedCount: messages.filter((m) => m.who === 'me').length,
    send,
    newSession,
    exportAnswer,
    rate,
    requestVoice,
  };
}
