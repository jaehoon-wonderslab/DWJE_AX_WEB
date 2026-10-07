/**
 * 브라우저가 만든 엑셀(.xlsx) 읽기 — `downloadXls` 가 쓰는 시트 구성을 그대로 풀어 줍니다.
 *   1행 = 「비공개 처리 n건(…) · 범위 … · 조건 …」, 2행 = 머리글, 3행부터 본문.
 * 2026-10-06 이전에는 HTML 표(.xls)였고 시험마다 <tr> 을 정규식으로 읽었습니다.
 */
const ExcelJS = require('exceljs');

/**
 * @param {string} file 내려받은 파일 경로
 * @returns {Promise<{ meta: string, head: string[], body: string[][], text: string }>}
 *   text 는 1행부터 모든 칸을 줄 단위(칸은 탭)로 이은 글자입니다 — 「파일 어딘가에 이 글자가 있나」 확인용
 */
async function readXlsx(file) {
  const book = new ExcelJS.Workbook();
  await book.xlsx.readFile(file);
  const ws = book.worksheets[0];
  const rows = [];
  ws.eachRow({ includeEmpty: true }, (row) => {
    const cells = [];
    for (let i = 1; i <= ws.columnCount; i += 1) {
      const v = row.getCell(i).value;
      cells.push(v === null || v === undefined ? '' : String(v));
    }
    while (cells.length && cells[cells.length - 1] === '') cells.pop();
    rows.push(cells);
  });
  const [metaRow = [], head = [], ...body] = rows;
  // 본문 행 길이를 머리글에 맞춥니다(끝 빈칸을 떼어 낸 행)
  const fit = (r) => (r.length < head.length ? [...r, ...Array(head.length - r.length).fill('')] : r);
  return { meta: metaRow[0] || '', head, body: body.map(fit), text: rows.map((r) => r.join('\t')).join('\n') };
}

module.exports = { readXlsx };
