/**
 * [Controller] AI-01 자연어 질의
 *
 * 응답은 서버가 내려준 blocks 배열(text · table · chart · source · actions)로 받고,
 * 블록 종류별 렌더링은 View 가 담당합니다.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useAsync } from '@shared/hooks/useAsync';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
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

export function useChatController() {
  const toast = useUiStore((state) => state.toast);
  const servingModelVer = useAuthStore((state) => state.servingModelVer);
  const params = useLocalSearchParams();

  const [messages, setMessages] = useState([]);
  const [followups, setFollowups] = useState([]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [sessionId, setSessionId] = useState(null);

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
      setInput('');
      setPending(true);
      setMessages((prev) => [...prev, { messageId: `local-${Date.now()}`, who: 'me', text: question }]);

      const res = await ask(sessionId, question);
      setPending(false);
      if (!res.ok) {
        toast(res.message || '질의 처리 중 오류가 발생했습니다');
        return;
      }
      setMessages((prev) => [...prev, { who: 'ai', ...res.data }]);
      setFollowups(res.data.followups || []);
      setSessionId(res.data.sessionId);
      rememberSessionId(res.data.sessionId);
    },
    [pending, sessionId, toast]
  );

  // 상단 통합 검색에서 넘어온 질문을 자동으로 던집니다
  const handledQuery = useRef('');
  useEffect(() => {
    const q = params?.q;
    if (q && q !== handledQuery.current) {
      handledQuery.current = q;
      send(q);
    }
  }, [params?.q, send]);

  /** 새 대화 시작 — 세션이 없으면 화면만 비웁니다 */
  const newSession = useCallback(async () => {
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
