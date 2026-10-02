/**
 * [Controller 보조] 「조회 목록 다운로드」 — 그리드에 보이는 그대로 내보낼 표를 만듭니다 (공통 10.6 CMN-07)
 *
 * 「조회 목록」 은 그리드 기준입니다. 사람이 머리글로 정렬하거나 열 필터를 걸거나 열을 옮긴 결과가
 * 파일에도 같아야 합니다. 그래서 응답 배열(`items`)이 아니라 표 인스턴스에서 지금 행·열 순서를 읽습니다.
 *
 *  · 행: `getRows('active')` — 열 필터를 통과한 행을 지금 정렬 순서대로
 *  · 열: `getColumns()` — 지금 열 순서. 그리드에 없는 내보내기 전용 열은 뒤에 붙입니다
 *  · 표 인스턴스가 아직 없으면(첫 그리기 전) 응답 순서 그대로 씁니다
 *
 * JSX 를 쓰지 않습니다. 화면(View)은 `instanceRef` 만 넘깁니다.
 */

/**
 * @typedef {object} ExportCol
 * @property {string} field 그리드 열의 field (행 자료의 키)
 * @property {string} head 파일 머리글
 * @property {string} [attr] 응답 필드명(마스킹 판정용, 기획 R-10). 없으면 field
 * @property {(row:object)=>*} [value] 파일 칸 값 — 없으면 row[field]
 */

/**
 * @param {object|null} table Tabulator 인스턴스 (TabulatorGrid · Table 의 instanceRef.current)
 * @param {ExportCol[]} cols 내보낼 열 정의
 * @param {object[]} fallbackRows 표가 없을 때 쓸 행
 * @returns {{ head:string[], attrs:string[], rows:Array<Array<*>>, count:number }}
 */
export function gridExport(table, cols, fallbackRows = []) {
  let data = fallbackRows || [];
  let order = cols.map((c) => c.field);
  if (table && typeof table.getRows === 'function') {
    try {
      data = table.getRows('active').map((r) => r.getData());
      const shown = table
        .getColumns()
        .filter((c) => (typeof c.isVisible === 'function' ? c.isVisible() : true))
        .map((c) => c.getField())
        .filter((f) => f && cols.some((c) => c.field === f));
      order = [...shown, ...cols.map((c) => c.field).filter((f) => !shown.includes(f))];
    } catch (e) {
      // 표가 막 다시 만들어지는 중이면 응답 순서로 내보냅니다
      data = fallbackRows || [];
    }
  }
  const byField = Object.fromEntries(cols.map((c) => [c.field, c]));
  const picked = order.map((f) => byField[f]);
  return {
    head: picked.map((c) => c.head),
    attrs: picked.map((c) => c.attr || c.field),
    rows: data.map((r) => picked.map((c) => {
      const v = c.value ? c.value(r) : r[c.field];
      return v === null || v === undefined ? '' : v;
    })),
    count: data.length,
  };
}

/**
 * 그리드에 지금 보이는 행 수 (열 필터 적용 후). 표가 없으면 null.
 * @param {object|null} table
 */
export function gridCount(table) {
  try {
    return table && typeof table.getDataCount === 'function' ? table.getDataCount('active') : null;
  } catch (e) {
    return null;
  }
}
