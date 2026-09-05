/**
 * [Model] AI 브리핑 · 원인 분석 리포트 내려받기
 *
 * 화면에서 본 것과 **같은 내용**을 엑셀로 냅니다. 회의에 들고 가거나 메일로 돌릴 때 씁니다.
 *
 * ■ 근거를 빠뜨리지 않습니다
 * 문장만 옮기면 받아 본 사람은 그 말이 어디서 왔는지 알 수 없습니다.
 * 문장마다 근거를 한 줄씩 붙이고, 인용한 문서는 파일명·경로·쪽까지 따로 적습니다.
 *
 * ■ 확인되지 않아 뺀 문장도 적습니다
 * 조용히 빼면 "모델이 그것밖에 말 안 했나" 로 잘못 읽힙니다.
 */
import { downloadXls } from '@shared/utils/exportUtil';
import { comma, fixed } from '@shared/utils/formatUtil';

/** 근거 종류 → 사람이 읽는 이름 */
const KIND_LABEL = {
  qty: '생산 수량', defect_rate: '불량률', yield: '수율', metric: '수율',
  defect: '불량 유형별 수량', anomaly: '설비 불량률', doc: '문서',
};

/** 근거 값 표기 — 불량률은 분모를 함께 적습니다 */
function valueText(e) {
  if (e.value === null || e.value === undefined) return '';
  const n = Number(e.value);
  if (Number.isNaN(n)) return String(e.value);
  if (e.unit === '%') {
    const frac = e.numerator != null && e.denominator ? ` (${comma(e.numerator)}/${comma(e.denominator)})` : '';
    return `${fixed(n, 2)}%${frac}`;
  }
  if (e.unit === 'EA') return `${comma(n)} EA`;
  return e.unit ? `${comma(n)} ${e.unit}` : comma(n);
}

/**
 * 리포트 한 장을 내려받습니다.
 *
 * @param {object} p title · sections[{heading, lines}] · docs[] · droppedCnt · modelVer · analyzedAt · targetDate
 */
export function downloadAiReport({ title, sections = [], docs = [], droppedCnt = 0, modelVer, analyzedAt, targetDate }) {
  const rows = [
    ['보고서', title, '', ''],
    ['기준일', targetDate || '', '분석 시각', analyzedAt || ''],
    ['모델', modelVer || '', '', ''],
    ['', '', '', ''],
  ];

  sections.forEach((sec) => {
    rows.push([sec.heading, '', '', '']);
    if (!(sec.lines || []).length) {
      rows.push(['', '근거가 확인된 문장이 없습니다.', '', '']);
    }
    (sec.lines || []).forEach((line, i) => {
      rows.push([`${i + 1}`, line.text, '', '']);
      (line.evidence || []).forEach((e) => {
        rows.push([
          '',
          `  근거 · ${KIND_LABEL[e.kind] || e.kind}`,
          e.kind === 'doc' ? [e.fileName, e.page ? `${e.page}쪽` : null].filter(Boolean).join(' · ') : e.label || e.key || '',
          e.kind === 'doc' ? e.quote || '' : valueText(e),
        ]);
      });
    });
    rows.push(['', '', '', '']);
  });

  if (docs.length) {
    rows.push([`참고 문서 ${comma(docs.length)}건`, '', '', '']);
    rows.push(['', '파일명', '위치 · 쪽', '경로']);
    docs.forEach((d) => {
      rows.push([
        '',
        d.fileName || d.label || '',
        [d.location, d.page ? `${d.page}쪽` : null].filter(Boolean).join(' · '),
        d.relativePath || d.path || '',
      ]);
      (d.quotes || []).forEach((q) => rows.push(['', '  인용', q, '']));
    });
    rows.push(['', '', '', '']);
  }

  rows.push(['확인 안내', '문장 속 숫자는 모델이 쓴 표기입니다. 확인된 값은 「근거」 줄에 있습니다.', '', '']);
  if (droppedCnt) {
    rows.push(['제외', `근거가 확인되지 않아 뺀 문장 ${comma(droppedCnt)}건`, '값이 실제와 다르거나 없는 대상을 가리킨 경우입니다.', '']);
  }

  downloadXls({ name: `${title} ${targetDate || ''}`.trim(), head: ['구분', '내용', '대상', '값 · 인용'], rows });
}
