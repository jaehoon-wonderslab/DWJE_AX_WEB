/**
 * 사내 LLM 채팅 스트리밍 — POST /api/ai/chat
 *
 * 다른 API 는 모두 client.js 의 `request()`(axios)를 거치지만, 이것만은 `fetch` 를 씁니다.
 * axios 는 브라우저에서 응답 본문을 조각으로 읽지 못해(다 받은 뒤에야 돌려줌) 점진 표시가 안 됩니다.
 *
 * 브라우저는 LLM 서버(wddg.ddns.net:11435)를 직접 부르지 않습니다. 반드시 우리 API 를 거칩니다.
 *  · LLM 서버의 CORS 는 localhost 만 허용하고, http 라 https 화면에서는 mixed content 로 막힙니다
 *  · 인증 없는 서버 주소를 번들에 넣지 않습니다
 *
 * 응답은 SSE 입니다 — `data: {...}` 줄마다 `choices[0].delta.content` 에 글 조각이 들어 있고
 * 마지막 줄이 `data: [DONE]` 입니다. `[DONE]` 없이 끝나면 중간에 끊긴 것입니다.
 *
 * **`role: "system"` 은 보내지 않습니다.** 모델에 내장된 덕우전자 지시문이 통째로 대체됩니다.
 * 근거는 `context` 로 보내면 서버가 마지막 질문을 `[근거] … [질문] …` 으로 감쌉니다.
 */
import { API_BASE_URL, USE_MOCK, refreshAccessToken } from './client';
import { useAuthStore } from '@shared/stores/useAuthStore';

export const LLM_CHAT_PATH = '/api/ai/chat';

/** 오류 문구 — LLM 연동 명세 「오류 처리」 */
export const LLM_ERRORS = {
  unreachable: 'AI 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.',
  rateLimited: '요청이 많습니다. 잠시 후 다시 시도해 주세요.',
  interrupted: '(응답이 중단되었습니다)',
};

/**
 * 대화를 보내고 답을 조각으로 받습니다.
 *
 * @param {object} args
 * @param {{role:'user'|'assistant', content:string}[]} args.messages 오래된 것부터. 서버가 최근 10턴만 씁니다
 * @param {string} [args.context]   근거 문서
 * @param {number} [args.messageId] `/ai/chat/ask` 의 질의 이력 ID — 주면 서버가 받은 답을 이력에 저장합니다
 * @param {AbortSignal} [args.signal] 생성 중단
 * @param {(text:string, delta:string) => void} [args.onDelta] 조각이 올 때마다 — 지금까지 모인 전체 글과 이번 조각
 * @returns {Promise<{status:'done'|'aborted'|'interrupted'|'error', text:string, message?:string}>}
 *   던지지 않습니다. `error` 면 `message` 가 사용자에게 보여 줄 문구입니다.
 */
export async function streamLlmChat({ messages, context, messageId, signal, onDelta }) {
  if (USE_MOCK) return mockStream({ signal, onDelta });

  const body = JSON.stringify({
    messages: (messages || []).filter((m) => m.role === 'user' || m.role === 'assistant'),
    ...(context && context.trim() ? { context } : null),
    ...(messageId ? { messageId } : null),
  });

  let res;
  try {
    res = await post(body, signal);
    // 세션 만료 — 토큰을 한 번 갱신하고 다시 보냅니다
    if (res.status === 401 && (await refreshAccessToken())) res = await post(body, signal);
  } catch (e) {
    if (signal?.aborted) return { status: 'aborted', text: '' };
    return { status: 'error', text: '', message: LLM_ERRORS.unreachable };
  }

  if (!res.ok) return { status: 'error', text: '', message: await errorMessage(res) };
  if (!res.body?.getReader) {
    // 스트림을 못 읽는 환경 — 다 받은 뒤 한 번에 그립니다
    const text = parseAll(await res.text());
    onDelta?.(text, text);
    return { status: 'done', text };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let text = '';
  let done = false;

  try {
    for (;;) {
      const { value, done: ended } = await reader.read();
      if (ended) break;
      buffer += decoder.decode(value, { stream: true });
      // 줄 단위로 끊어 읽습니다 — 조각 경계가 줄 중간에 걸리면 뒷부분은 다음 조각과 합칩니다
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        const delta = parseLine(line);
        if (delta === DONE) {
          done = true;
        } else if (delta) {
          text += delta;
          onDelta?.(text, delta);
        }
      }
      if (done) break;
    }
  } catch (e) {
    if (signal?.aborted) return { status: 'aborted', text };
    return { status: 'interrupted', text };
  } finally {
    reader.releaseLock?.();
  }

  if (signal?.aborted) return { status: 'aborted', text };
  return { status: done ? 'done' : 'interrupted', text };
}

function post(body, signal) {
  const token = useAuthStore.getState().accessToken;
  return fetch(`${API_BASE_URL}${LLM_CHAT_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // 오류는 JSON 으로 옵니다 — 둘 다 받는다고 알려야 서버가 406 으로 바꾸지 않습니다
      Accept: 'text/event-stream, application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : null),
    },
    body,
    signal,
  });
}

const DONE = Symbol('done');

/** SSE 한 줄 → 글 조각 · DONE · null */
function parseLine(raw) {
  const line = raw.trim();
  if (!line.startsWith('data:')) return null;
  const data = line.slice(5).trim();
  if (data === '[DONE]') return DONE;
  try {
    return JSON.parse(data)?.choices?.[0]?.delta?.content || null;
  } catch {
    return null;
  }
}

function parseAll(body) {
  return body.split('\n').map(parseLine).filter((d) => d && d !== DONE).join('');
}

async function errorMessage(res) {
  if (res.status === 429) return LLM_ERRORS.rateLimited;
  if (res.status === 502 || res.status === 503 || res.status === 504) return LLM_ERRORS.unreachable;
  try {
    const json = await res.json();
    if (json?.message) return json.message;
  } catch {
    /* 본문이 JSON 이 아니면 기본 문구 */
  }
  return LLM_ERRORS.unreachable;
}

/** 목(mock) 모드 — 백엔드 없이 화면만 볼 때. 사내 LLM 을 부르지 않고 안내문을 흘려 보여 줍니다 */
async function mockStream({ signal, onDelta }) {
  const full = '목(mock) 모드에서는 사내 LLM 을 부르지 않습니다. **EXPO_PUBLIC_USE_MOCK=false** 로 두고 API 서버를 띄우면 실제 답이 스트리밍됩니다.';
  let text = '';
  for (const ch of full) {
    if (signal?.aborted) return { status: 'aborted', text };
    await new Promise((r) => setTimeout(r, 18));
    text += ch;
    onDelta?.(text, ch);
  }
  return { status: 'done', text };
}
