/**
 * AI 자연어 질의 목 핸들러 (API 7건)
 *
 * 응답은 HTML 대신 blocks 배열로 내려줍니다.
 * (React Native 에는 innerHTML 이 없으므로, 화면이 블록 종류별로 컴포넌트를 골라 렌더링합니다)
 *
 *  block.type — text | table | chart | source | actions
 */
import { nowStamp } from '@shared/utils/formatUtil';
import { DATA_SCOPE_DEFAULT } from '@shared/constants/dataFields';
import { appliedDataFields } from './data/dataFieldStore';
import { mockState } from './state';

/**
 * 의도 분류 — 기능명세서 「권한 정의」 7절 규칙
 *
 * 예전에는 단가·거래처가 들어간 질의를 통째로 막았습니다(`denied`). 지금은 막지 않습니다 —
 * **답은 정상으로 내고 결과 안의 값만 가립니다**(maskAnswer). 물어본 것 자체를 거절하면
 * 권한 있는 부분까지 함께 사라져, 쓸 수 있는 답을 못 받습니다.
 * `denied` 는 데이터 권한이 아닌 다른 사유(업무 범위 밖 등)를 위해 남겨 둡니다.
 */
export function classifyIntent(question) {
  const t = String(question).replace(/\s/g, '');
  if (/수리이력|금형수리|설비이력|재물조사|외주|세정|도금|도장|작업일지/.test(t)) return 'unknown';
  if (/추이|트렌드|월별|주별|지난주|지난달|변화|비교/.test(t)) return 'trend';
  if (/로트|LOT|이력|추적|어디까지/.test(t)) return 'trace';
  if (/비가동|정지|가동률/.test(t)) return 'downtime';
  return 'metric';
}

const SUGGESTIONS = [
  { q: '오늘 chip 불량 가장 많은 라인 어디야?', desc: '라인별 불량 집계 · 표' },
  { q: '지난주 Krios_s 공정별 수율 추이', desc: '기간 비교 · 선 그래프' },
  { q: 'L260824-031 로트 어디까지 갔어?', desc: 'LOT 단계별 이력 추적' },
  { q: 'PR-05 왜 멈췄어?', desc: '비가동 사유 · 후보 제안' },
  { q: '이번 달 목표수율 대비 달성률', desc: '목표 대비 편차' },
  { q: '금형 M-2207 수리 이력 보여줘', desc: '수집 범위 밖 응답 예시' },
];

/**
 * 답변 결과에서 **권한 없는 항목의 값만** 가립니다.
 *
 * 질의를 막지 않기로 했으므로(classifyIntent 주석 참고) 가리는 일은 전부 결과 쪽에서 합니다.
 * 문장은 구조를 살리고 값만 바꿉니다 — 「8월 평균 단가는 12,400원입니다」 → 「… 비공개입니다」.
 * 무엇이 가려졌는지는 `blindFields` 로 함께 알려 줘야 화면이 이유를 말해 줄 수 있습니다.
 *
 * [주의] 이건 목(데모)의 근사입니다. 실제로는 서버가 값을 만들 때 가립니다 —
 * 문장을 정규식으로 훑는 방식은 표현이 바뀌면 놓칠 수 있어 원본에 의존하면 안 됩니다.
 */
/**
 * 값처럼 보이는 토막 — 숫자+단위, 또는 코드형 식별자(L260824-031 · PR-03).
 * 사람 이름·제품명 같은 일반 한글 낱말은 일부러 넣지 않습니다. 넣으면 라벨 뒤의 멀쩡한
 * 낱말까지 집어삼켜 문장이 망가집니다.
 */
const VALUE_TOKEN = '([\\d,.]+\\s*(?:%p|%|퍼센트|포인트|원|천원|만원|억원|개|EA|ea|건|초|분|시간|℃|μm)?|[A-Z][A-Za-z0-9]*[-_]?[A-Za-z0-9]+)';
/** 라벨과 값 사이 — 조사나 콜론 */
const JOSA = '(\\s*(?:는|은|이|가|:|=)?\\s*)';

const escapeRe = (t) => String(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * 한 항목이 문장에서 어떤 말로 나타나는지 — 항목명 조각과 응답 필드명을 모두 씁니다.
 *
 * 항목명을 쓰는 이유는 문장이 필드명(`unitPrice`)이 아니라 사람 말(「단가」)로 쓰이기 때문이고,
 * 필드명도 함께 쓰는 이유는 표를 옮겨 적은 문장에는 필드명이 그대로 박히기도 해서입니다.
 * 관리자가 등록한 항목에서 뽑으므로 **항목을 늘리거나 이름을 바꾸면 문장 필터도 따라옵니다.**
 */
function labelsOf(field) {
  const fromName = String(field.name || '')
    .split(/[·,/()]/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
  return [...new Set([...fromName, ...(field.attrs || [])])].filter(Boolean);
}

/**
 * 지금 계정이 못 보는 **항목 정의** 목록 ('*' 는 전 권한이라 가릴 것이 없습니다)
 *
 * 적용 중인 항목에서 고르므로 관리자가 항목을 추가하면 문장 필터도 배포 없이 함께 넓어집니다.
 * 고정 목록을 쓰던 때는 새로 등록한 항목이 문장에서 그대로 샜습니다.
 */
export function blockedFields() {
  const scope = mockState.dataScope[mockState.currentUser.dept] ?? DATA_SCOPE_DEFAULT[mockState.currentUser.dept] ?? [];
  if (scope === '*') return [];
  return appliedDataFields().filter((f) => !scope.includes(f.key));
}

/**
 * 문장에서 권한 없는 값만 「비공개」로 바꿉니다. 라벨은 남겨 두어 무엇이 가려졌는지 보이게 합니다.
 *
 * @param {string} text
 * @param {Array<{key:string,name:string,attrs:string[]}>} blocked 가려야 할 항목 정의
 */
export function maskText(text, blocked) {
  let out = String(text ?? '');
  blocked.forEach((field) => {
    labelsOf(field).forEach((label) => {
      out = out.replace(new RegExp(`(${escapeRe(label)})${JOSA}${VALUE_TOKEN}`, 'g'), (_m, l, gap) => `${l}${gap}비공개`);
    });
  });
  return out;
}

/**
 * 답변 전체(문장 블록 · 표 블록)를 훑어 가립니다.
 * 표는 열 단위라 `blindColumns` 로 화면에 맡기고, 값은 서버가 비웁니다.
 */
function maskAnswer(answer) {
  const blocked = blockedFields();
  if (!blocked.length) return { ...answer, blindFields: [] };

  const blocks = (answer.blocks || []).map((b) => {
    if (b.type === 'text' || b.type === 'source') return { ...b, text: maskText(b.text, blocked) };
    // 표는 열 단위라 서버가 내려준 blindColumns 를 그대로 씁니다 —
    // 어느 열이 어느 항목인지는 목이 지어낼 수 없습니다(서버가 attr 표를 보고 정합니다)
    return b;
  });
  return { ...answer, blocks, blindFields: blocked.map((f) => f.key) };
}

/** 의도별 응답 생성 */
function buildAnswer(question) {
  const intent = classifyIntent(question);

  if (intent === 'unknown') {
    return {
      intent,
      title: '수집 범위 밖',
      agents: ['Master AI (수집 범위 판정)'],
      blocks: [
        {
          type: 'text',
          text:
            '이 질문은 현재 수집 범위 밖입니다. 해당 자료는 아직 시스템에 연동되어 있지 않습니다.\n\n' +
            '자료 소재 — 제조팀 별도 PC(설비·금형 수리 이력) / 생산관리팀 개인 엑셀(재물조사)\n' +
            'MES 에서 직접 확인하려면 POP > 이력 > 수불 이력 화면을 참고하세요.',
        },
        { type: 'source', text: '답을 추정해 만들지 않고 자료 소재를 안내합니다' },
      ],
      followups: ['수집 범위에 있는 항목은 뭐야?', '담당 부서에 자료 요청하기'],
    };
  }

  if (intent === 'trend') {
    return {
      intent,
      title: '수율 추이',
      agents: ['② 데이터 분류', '④ 원인 분석'],
      blocks: [
        { type: 'text', text: '지난 5개월 Krios_s 공정별 수율 추이입니다. 8월 들어 프레스 공정 수율이 1.4%p 개선되었습니다.' },
        {
          type: 'chart',
          chart: 'line',
          labels: ['4월', '5월', '6월', '7월', '8월'],
          series: [
            { name: '프레스 공정 수율 (%)', data: [95.2, 95.6, 95.4, 95.8, 97.2] },
            { name: '출하 기준 수율 (%)', data: [92.1, 92.4, 92.0, 92.6, 94.1] },
          ],
          min: 88,
          max: 100,
          blindField: 'yield',
        },
        { type: 'source', text: '근거 — MES 생산 이력 · QM 검사 이력 (2026-04-01 ~ 08-28) · 부서별 수율 기준 2종 병기' },
        { type: 'actions', name: '수율 추이' },
      ],
      followups: ['프레스 공정만 자세히', '불량 유형별로 나눠줘', '같은 기간 EOS-Stiffener는?'],
    };
  }

  if (intent === 'trace') {
    return {
      intent,
      title: 'LOT 이력',
      agents: ['⑤ 이력 추적', '⑧ KG 구축'],
      blocks: [
        { type: 'text', text: 'L260824-031 로트의 단계별 이력입니다.' },
        {
          type: 'table',
          head: ['단계', '내용', '시각'],
          rows: [
            ['LOT 생성', 'EOS-Stiffener · 12,480EA', '08-24 06:40'],
            ['금형', 'M-2207 (교체 후 42분)', '08-24 07:12'],
            ['라인', 'PR-03 → AOI-03', '08-24 07:20'],
            ['공정조건', '각도 편차 +0.8° · 78 spm', '08-24 07:20'],
            ['검사', '불량 412EA (chip 318 · stain 94)', '08-24 08:41'],
          ],
        },
        { type: 'source', text: '근거 — Knowledge Graph 탐색 · AOI 판정 로그 · 프레스 IoT' },
        { type: 'actions', name: 'LOT 이력' },
      ],
      followups: ['이 로트 증빙 이미지 보여줘', '같은 금형 재발 이력은?', '원인 분석 열어줘'],
    };
  }

  if (intent === 'downtime') {
    return {
      intent,
      title: '비가동 이력',
      agents: ['⑨ 이상 알림'],
      blocks: [
        {
          type: 'text',
          text:
            '오늘 PR-05 는 08:12부터 34분 정지 상태이며 사유가 등록되지 않았습니다.\n' +
            '이상 알림 Agent 는 금형수리 & 금형교체를 사유 후보로 제안하고 있습니다.',
        },
        {
          type: 'table',
          head: ['설비', '정지', '시간', '사유'],
          rows: [
            ['PR-05', '08:12', '34m', '미등록'],
            ['PR-03', '07:28', '13m', '미등록'],
            ['PR-08', '06:02', '33m', '금형수리 & 금형교체'],
          ],
        },
        {
          type: 'source',
          text: '근거 — 프레스 IoT 설비 동작상태 · 비가동 등록 이력 · 미등록 구간은 가동률 산출에서 원인 불명으로 집계',
        },
        { type: 'actions', name: '비가동 이력' },
      ],
      followups: ['비가동 사유 등록하러 가기', '이번 주 비가동 시간 합계는?'],
    };
  }

  return {
    intent: 'metric',
    title: '불량 집계',
    agents: ['② 데이터 분류', '⑤ 이력 추적'],
    blocks: [
      {
        type: 'text',
        text:
          '오늘 chip 불량이 가장 많은 라인은 PR-03 입니다. 412EA 발생했고 불량률은 3.3%입니다.\n' +
          '금형 M-2207 교체 직후 42분 구간에 집중되어 있습니다.',
      },
      {
        type: 'table',
        head: ['설비', '모델', 'chip', '불량률'],
        rows: [
          ['PR-03', 'Krios_s', '412', '3.3%'],
          ['PR-08', 'Krios_s', '322', '3.3%'],
          ['PR-06', 'Krios_s', '309', '2.8%'],
        ],
        blindColumns: { 2: 'qty', 3: 'yield' },
      },
      { type: 'source', text: '근거 — AOI 판정 로그 (08-28 00:00~09:00) · MES 생산 이력 · LOT L260824-031' },
      { type: 'actions', name: '불량 집계' },
    ],
    followups: ['PR-03 원인 분석해줘', '추이로 보여줘', '이 로트 어디까지 갔어?'],
  };
}

function store() {
  if (!mockState.store.ai) {
    mockState.store.ai = {
      sessionId: `S-${Date.now()}`,
      messages: [],
      history: [],
    };
  }
  return mockState.store.ai;
}

export const aiMock = {
  // 목 모드에서는 사내 LLM 을 부르지 않습니다 — 후속 질의는 비워 둡니다(고정 문장으로 채우지 않습니다)
  postAiFollowups: () => ({ questions: [], reason: 'MODEL_NOT_READY' }),

  postAiChatAsk: ({ question }) => {
    const st = store();
    const started = Date.now();
    // 질의는 막지 않고, 만들어진 답에서 권한 없는 값만 가립니다
    const answer = maskAnswer(buildAnswer(question));
    const messageId = `M-${started}`;
    st.messages.push({ messageId: `${messageId}-q`, who: 'me', text: question, ts: nowStamp() });
    st.messages.push({ messageId, who: 'ai', ts: nowStamp(), ...answer });
    st.history.unshift({
      messageId,
      ts: nowStamp(),
      question,
      intent: answer.intent,
      intentLabel: answer.title,
      agents: answer.agents.join(' · '),
      elapsedMs: 1400 + (started % 900),
      rating: '',
      user: mockState.currentUser.name,
      dept: mockState.currentUser.dept,
    });
    return {
      messageId,
      sessionId: st.sessionId,
      intent: answer.intent,
      blocks: answer.blocks,
      agents: answer.agents,
      followups: answer.followups,
      // 무엇이 가려졌는지 — 화면이 이유를 한 줄로 알려 줍니다
      blindFields: answer.blindFields || [],
      elapsedMs: 1400 + (started % 900),
      modelVer: mockState.servingModelVer,
    };
  },

  getAiChatSessionsBySessionId: () => ({ messages: store().messages, sessionId: store().sessionId }),

  deleteAiChatSessionsBySessionId: () => {
    const st = store();
    st.sessionId = `S-${Date.now()}`;
    st.messages = [];
    return { success: true, code: 'SUCCESS', message: '새 대화를 시작했습니다.', data: { newSessionId: st.sessionId } };
  },

  getAiChatSuggestions: () => ({ suggestions: SUGGESTIONS }),

  postAiChatMessagesByMessageIdExport: ({ format }) => ({
    success: true,
    code: 'SUCCESS',
    message: `응답 결과를 ${format === 'csv' ? 'CSV' : '엑셀'}로 내려받았습니다 (비공개 항목 제외)`,
    data: { format },
  }),

  postAiChatMessagesByMessageIdFeedback: ({ messageId, rating }) => {
    const row = store().history.find((h) => h.messageId === messageId);
    if (row) row.rating = rating === 'good' ? '유용' : '재질의';
    return {
      success: true,
      code: 'SUCCESS',
      message: rating === 'good' ? '답변을 유용함으로 평가했습니다.' : '개선이 필요함으로 평가했습니다.',
      data: { success: true },
    };
  },

  postAiChatAsr: () => ({
    success: false,
    code: 'E-SERVER',
    message: '음성 입력 — 현장 PC·PDA 용, 프로토타입에서는 동작하지 않습니다',
    data: null,
  }),
};

export { SUGGESTIONS };
