'use strict';

const MAX_CONTEXT_CHARS = 12000;

function scalar(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function formatLlmContext(askData = {}) {
  let index = 0;
  const sections = [];
  const dataEvidence = Array.isArray(askData.dataEvidence) ? askData.dataEvidence : [];
  const sources = Array.isArray(askData.sources) ? askData.sources : [];

  const dataLines = dataEvidence.map((item) => {
    const text = scalar(item?.text).trim();
    if (!text) return '';
    index += 1;
    const title = scalar(item?.title).trim() || '실적 집계 근거';
    return `[${index}] ${title}\n${text}`;
  }).filter(Boolean);
  if (dataLines.length) sections.push(`[실적 데이터 근거]\n${dataLines.join('\n\n')}`);

  const documentLines = sources.map((item) => {
    const snippet = scalar(item?.snippet).trim();
    const title = scalar(item?.title || item?.name).trim();
    if (!snippet && !title) return '';
    index += 1;
    const metadata = [item?.docDate, item?.page ? `p.${item.page}` : null].filter(Boolean).map(scalar).join(' · ');
    return `[${index}] ${title || '문서 근거'}${metadata ? ` (${metadata})` : ''}${snippet ? `\n${snippet}` : ''}`;
  }).filter(Boolean);
  if (documentLines.length) sections.push(`[문서 근거]\n${documentLines.join('\n\n')}`);

  const blockLines = (Array.isArray(askData.blocks) ? askData.blocks : []).flatMap((block) => {
    if (block?.type === 'text' && scalar(block.text).trim()) return [scalar(block.text).trim()];
    if (block?.type === 'table') {
      const columns = block.head || block.columns || [];
      const rows = block.rows || [];
      const lines = rows.map((row) => {
        const cells = Array.isArray(row) ? row : columns.map((column) => row?.[column]);
        return cells.map(scalar).filter(Boolean).join(' | ');
      }).filter(Boolean);
      return lines.length ? [`${scalar(block.title).trim()}\n${lines.join('\n')}`.trim()] : [];
    }
    return [];
  });
  if (blockLines.length) sections.push(`[추가 검색 결과]\n${blockLines.join('\n\n')}`);

  const policy = [
    '[답변 지침]',
    '질문에 답할 때 아래 근거와 직접 확인되는 사실만 단정하고, 근거가 있는 문장은 해당 번호 [n]를 인용하세요.',
    '근거가 질문과 무관하거나 부족하면 사실·수치·세부 절차를 만들어 내지 말고 확인할 수 없는 범위를 분명히 밝히세요.',
    '길 안내, 실시간 교통, 영업시간 등 외부 또는 최신 정보는 검증 근거가 없으면 구체적인 경로를 지어내지 말고 최신 지도 확인이 필요하다고 안내하세요.',
    '검증된 근거가 없는 짧은 인사나 일상 대화에는 자연스럽게 답할 수 있습니다.',
  ].join('\n');
  const evidence = sections.length ? sections.join('\n\n') : '[확인된 근거 없음]';
  return `${policy}\n\n${evidence}`.slice(0, MAX_CONTEXT_CHARS);
}

function parseLlmSse(response) {
  if (response && typeof response === 'object') {
    if (response.success === false) {
      const error = new Error(response.message || 'LLM 응답 생성에 실패했습니다.');
      error.code = response.code || response.error?.code;
      error.status = response.httpStatus || response.status || response.error?.status;
      throw error;
    }
    if (response.data !== undefined) return parseLlmSse(response.data);
    const content = response?.choices?.[0]?.message?.content ?? response?.choices?.[0]?.text;
    return typeof content === 'string' ? content.trim() : '';
  }

  const body = String(response ?? '');
  if (!body.includes('data:')) {
    try {
      const parsed = JSON.parse(body);
      const content = parsed?.choices?.[0]?.message?.content ?? parsed?.choices?.[0]?.text;
      if (typeof content === 'string') return content.trim();
    } catch {
      return body.trim();
    }
    return body.trim();
  }

  const deltas = [];
  for (const line of body.split(/\r?\n/)) {
    if (!line.startsWith('data:')) continue;
    const data = line.slice(5).trim();
    if (!data || data === '[DONE]') continue;
    try {
      const parsed = JSON.parse(data);
      const content = parsed?.choices?.[0]?.delta?.content ?? parsed?.choices?.[0]?.message?.content ?? '';
      if (typeof content === 'string') deltas.push(content);
    } catch {
      // Ignore SSE keepalive and non-JSON events.
    }
  }
  return deltas.join('').trim();
}

/** API/LLM 프록시의 오류를 민감한 서버 메시지 없이 사용자 안내로 변환합니다. */
function formatChatError(error = {}) {
  const code = error.code || error.error?.code || error.response?.code || error.response?.error?.code;
  const status = Number(error.status || error.httpStatus || error.response?.httpStatus || error.response?.status || 0);
  if (status === 401 || code === 'E-AUTH-001') return '로그인 인증이 필요하거나 만료되었습니다. 다시 로그인한 뒤 시도해 주세요. (401 / E-AUTH-001)';
  if (status === 403 || code === 'E-AUTH-002' || code === 'E-AUTH-003') return `채팅 접근 권한이 없습니다. 권한 설정을 확인해 주세요. (${code || status})`;
  if (code === 'E-LLM-004') return 'LLM 게이트웨이가 요청을 거부했습니다. 게이트웨이의 접근 정책과 요청 조건을 확인해 주세요. (502 / E-LLM-004)';
  if (status === 502 || code === 'E-LLM-001') return 'LLM 게이트웨이 인증 또는 연결에 실패했습니다. API 서버의 LLM 설정을 확인해 주세요. (502 / E-LLM-001)';
  if (status === 500 || code === 'E-SERVER') return 'API 서버에서 오류가 발생했습니다. 서버 로그에서 요청 오류를 확인해 주세요. (500 / E-SERVER)';
  if (status) return `채팅 요청에 실패했습니다. 잠시 후 다시 시도해 주세요. (HTTP ${status}${code ? ` / ${code}` : ''})`;
  if (code) return `채팅 요청에 실패했습니다. 설정을 확인해 주세요. (${code})`;
  return '채팅 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.';
}

function mergeAssistantResponse(askData, llmAnswer, generationWarning) {
  return {
    ...(askData || {}),
    ...(llmAnswer ? { llmAnswer } : {}),
    ...(generationWarning ? { generationWarning } : {}),
  };
}

function shouldGenerateAnswer(intent) {
  return intent !== 'denied';
}

function formatCitationSources(askData = {}) {
  const entries = [];
  for (const item of Array.isArray(askData.dataEvidence) ? askData.dataEvidence : []) {
    const title = scalar(item?.title).trim() || '실적 집계 근거';
    const detail = scalar(item?.text).trim();
    if (title || detail) entries.push({ number: entries.length + 1, title, detail });
  }
  for (const item of Array.isArray(askData.sources) ? askData.sources : []) {
    const title = scalar(item?.title || item?.name).trim() || '문서 근거';
    const detail = [item?.docDate, item?.page ? `p.${item.page}` : null].filter(Boolean).map(scalar).join(' · ');
    if (title || detail) entries.push({ number: entries.length + 1, title, detail });
  }
  return entries;
}

module.exports = { formatLlmContext, parseLlmSse, mergeAssistantResponse, shouldGenerateAnswer, formatCitationSources, formatChatError };
