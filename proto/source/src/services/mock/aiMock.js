/**
 * AI 자연어 질의 목 핸들러 (API 7건)
 *
 * 응답은 HTML 대신 blocks 배열로 내려줍니다.
 * (React Native 에는 innerHTML 이 없으므로, 화면이 블록 종류별로 컴포넌트를 골라 렌더링합니다)
 *
 *  block.type — text | table | chart | source | actions
 */
import { nowStamp } from '@shared/utils/formatUtil';
import { mockState } from './state';

/** 의도 분류 — 기능명세서 「권한 정의」 7절 규칙 그대로 */
export function classifyIntent(question) {
  const t = String(question).replace(/\s/g, '');
  if (/단가|원가|매입|거래처|계약금/.test(t)) return 'denied';
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

/** 의도별 응답 생성 */
function buildAnswer(question) {
  const intent = classifyIntent(question);

  if (intent === 'denied') {
    return {
      intent,
      title: '권한 밖 질의',
      agents: ['⑦ 보안 필터링'],
      blocks: [
        {
          type: 'text',
          text:
            '요청하신 항목에는 단가·거래처가 포함되어 있어 현재 권한으로는 조회할 수 없습니다.\n' +
            '마스킹된 범위에서만 응답드리며, 원본이 필요하면 권한 요청 후 다시 질의해 주세요.',
        },
        { type: 'source', text: '보안 필터링 규칙 적용 · 조회 시도는 감사 로그에 기록됩니다' },
      ],
      followups: ['마스킹된 범위로 다시 보여줘', '권한 요청 방법 알려줘'],
    };
  }

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
  postAiChatAsk: ({ question }) => {
    const st = store();
    const started = Date.now();
    const answer = buildAnswer(question);
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
