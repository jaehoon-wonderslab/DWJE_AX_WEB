/**
 * [Model] AI 브리핑 · 원인 분석 리포트 내려받기 (.xlsx)
 *
 * 화면에서 본 것과 **같은 내용**을 엑셀로 냅니다. 회의에 들고 가거나 메일로 돌릴 때 씁니다.
 *
 * ■ 표로 냅니다
 * 문장을 줄줄이 늘어놓으면 받아 본 사람이 무엇과 무엇을 견줘야 하는지 모릅니다.
 * 대상·불량률·원인·처방을 열로 갈라 한눈에 견줄 수 있게 합니다.
 *
 * ■ 근거를 빠뜨리지 않습니다
 * 문장만 옮기면 그 말이 어디서 왔는지 알 수 없습니다. 근거를 열로 붙이고,
 * 인용한 문서는 파일명·위치·쪽·경로까지 따로 적습니다.
 */
import { downloadXlsx } from '@shared/utils/exportUtil';
import { comma, fixed } from '@shared/utils/formatUtil';

/** 근거 종류 → 사람이 읽는 이름 */
const KIND_LABEL = {
  qty: '생산 수량', defect_rate: '불량률', yield: '수율', metric: '수율',
  defect: '불량 유형별 수량', anomaly: '설비 불량률', doc: '문서',
};

/** 근거 값 표기 — 불량률은 분모를 함께 적습니다 */
export function evidenceValueText(e) {
  if (!e || e.value === null || e.value === undefined) return '';
  const n = Number(e.value);
  if (Number.isNaN(n)) return String(e.value);
  if (e.unit === '%') {
    const frac = e.numerator != null && e.denominator ? ` (${comma(e.numerator)}/${comma(e.denominator)})` : '';
    return `${fixed(n, 2)}%${frac}`;
  }
  if (e.unit === 'EA') return `${comma(n)} EA`;
  return e.unit ? `${comma(n)} ${e.unit}` : comma(n);
}

/** 근거 한 조각 → 대상 · 값 두 칸 */
const evidenceCells = (e) =>
  e.kind === 'doc'
    ? [[e.fileName, e.page ? `${e.page}쪽` : null].filter(Boolean).join(' · '), e.quote || '']
    : [e.label || e.key || '', evidenceValueText(e)];

/** 머리 정보 · 꼬리 안내 (두 리포트 공통) */
const head = (title, targetDate, analyzedAt) => [
  { cells: [title], style: 'title' },
  { cells: [`기준일 ${targetDate || '—'}`, `분석 시각 ${analyzedAt || '—'}`], style: 'meta' },
  { cells: [] },
];

const tail = (droppedCnt) => {
  const out = [
    { cells: [] },
    { cells: ['확인 안내'], style: 'section' },
    { cells: ['문장 속 숫자는 모델이 쓴 표기입니다. 확인된 값은 「근거」 열에 있습니다.'] },
  ];
  if (droppedCnt) {
    out.push({ cells: [`근거가 확인되지 않아 뺀 문장 ${comma(droppedCnt)}건 — 값이 실제와 다르거나 없는 대상을 가리킨 경우입니다.`] });
  }
  return out;
};

/** 참고 문서 절 */
function docSection(docs) {
  if (!docs.length) return [];
  const out = [
    { cells: [] },
    { cells: [`참고 문서 ${comma(docs.length)}건`], style: 'section' },
    { cells: ['파일명', '위치 · 쪽', '경로', '인용'], style: 'head' },
  ];
  docs.forEach((d) => {
    const where = [d.location, d.page ? `${d.page}쪽` : null].filter(Boolean).join(' · ');
    out.push({ cells: [d.fileName || d.label || '', where, d.relativePath || d.path || '', (d.quotes || [])[0] || ''] });
    (d.quotes || []).slice(1).forEach((q) => out.push({ cells: ['', '', '', q], style: 'quote' }));
  });
  return out;
}

/** 브리핑 리포트 — 문장 · 근거 · 값 */
export function downloadBriefingReport({ lines = [], docs = [], droppedCnt = 0, analyzedAt, targetDate }) {
  const title = 'AI 일일 품질·생산 종합 브리핑';
  const rows = [
    ...head(title, targetDate, analyzedAt),
    { cells: ['#', '브리핑 내용', '근거', '확인된 값'], style: 'head' },
  ];

  lines.forEach((line, i) => {
    const ev = line.evidence || [];
    if (!ev.length) {
      rows.push({ cells: [i + 1, line.text, '', ''] });
      return;
    }
    ev.forEach((e, j) => {
      const [target, value] = evidenceCells(e);
      rows.push({ cells: [j === 0 ? i + 1 : '', j === 0 ? line.text : '', `${KIND_LABEL[e.kind] || e.kind} · ${target}`, value] });
    });
  });

  downloadXlsx({
    name: `${title} ${targetDate || ''}`.trim(),
    sheetName: '브리핑',
    columns: [{ width: 5 }, { width: 62 }, { width: 40 }, { width: 30 }],
    rows: [...rows, ...docSection(docs), ...tail(droppedCnt)],
  });
}

/**
 * 원인 분석 리포트 — **화면 표 그대로**
 *
 * 화면에서 본 표와 열이 같아야 합니다. 받아 본 사람이 화면과 대조할 때
 * 열이 다르면 같은 자료인지 확인하는 데 시간이 듭니다.
 *
 * html 태그가 섞인 셀은 글자만 뽑아 넣습니다 — 엑셀은 태그를 그대로 찍습니다.
 */
export function downloadCauseReport({ rows = [], docs = [], droppedCnt = 0, omittedCnt = 0, analyzedAt, targetDate, threshold, targetCnt = 0 }) {
  const title = 'AI 공정 원인 분석 및 처방 권고';
  const out = [
    ...head(title, targetDate, analyzedAt),
    ...(threshold
      ? [
          {
            cells: [
              omittedCnt
                ? `불량률 ${fixed(threshold, 1)}% 초과 ${comma(targetCnt + omittedCnt)}곳 중 나쁜 순 ${comma(targetCnt)}곳 — 나머지 ${comma(omittedCnt)}곳은 분석하지 않았습니다`
                : `불량률 ${fixed(threshold, 1)}% 초과 대상 ${comma(targetCnt)}곳`,
            ],
            style: 'meta',
          },
          { cells: [] },
        ]
      : []),
    { cells: ['설비', '제품', 'AI 불량 판단 기준', '원인', '조치 방안 제시', 'AI 불량 판단 근거'], style: 'head' },
    ...rows.map((r) => ({
      cells: [r.eqpt, r.product, plain(r.standard), plain(r.cause), plain(r.action), plain(r.basis)],
    })),
  ];

  downloadXlsx({
    name: `${title} ${targetDate || ''}`.trim(),
    sheetName: '원인분석',
    columns: [{ width: 24 }, { width: 22 }, { width: 22 }, { width: 60 }, { width: 60 }, { width: 52 }],
    rows: [...out, ...docSection(docs), ...tail(droppedCnt)],
  });
}

/** html 을 엑셀에 넣을 글자로 — 줄바꿈은 살리고 태그는 뗍니다 */
function plain(html) {
  return String(html ?? '')
    .replace(/<div[^>]*>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\n{2,}/g, '\n')
    .trim();
}
