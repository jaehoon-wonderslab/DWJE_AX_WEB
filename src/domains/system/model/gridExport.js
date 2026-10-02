/**
 * [Model] 「조회 목록 다운로드」 용 표 → 엑셀 행 변환 (공통 CMN-07, 결정 R-16)
 *
 * 「조회 목록」 은 **그리드 기준**입니다. 지금 표에 보이는 행을 사용자가 잡아 둔 정렬·열 필터·열 순서
 * 그대로 받아야 합니다. 그래서 컨트롤러가 들고 있는 응답 배열(`items`, 서버 순서)이 아니라
 * TabulatorGrid 가 `instanceRef` 로 넘겨준 Tabulator 인스턴스에서 행과 열 순서를 읽습니다.
 *
 * 인스턴스가 아직 없으면(표가 그려지기 전·앱 환경) 응답 배열과 정의 순서로 대신합니다.
 *
 * 열 정의 `defs` 는 { [응답 필드명]: { head, value?(row) } } 입니다. 필드명은 `attrs` 로 그대로 넘어가
 * `downloadXls` 가 데이터 접근 권한 마스킹을 판정합니다(R-10). 그리드에 없는 내보내기 전용 열은
 * `extras` 로 받아 그리드 열 뒤에 붙입니다.
 */

/**
 * @param {object} cfg
 * @param {object} [cfg.instance] Tabulator 인스턴스 (TabulatorGrid instanceRef.current)
 * @param {object[]} cfg.rows 인스턴스가 없을 때 쓸 응답 배열
 * @param {Object<string,{head:string, value?:Function}>} cfg.defs 그리드 열(필드명 → 머리글·값)
 * @param {Array<{attr:string, head:string, value?:Function}>} [cfg.extras] 내보내기 전용 열
 * @returns {{ head:string[], attrs:string[], rows:any[][] }}
 */
export function buildGridExport({ instance, rows = [], defs = {}, extras = [] }) {
  let data = rows;
  let fields = Object.keys(defs);
  if (instance) {
    try {
      // 'active' — 열 필터를 통과한 행을 지금 정렬 순서대로
      const active = instance.getData('active');
      if (Array.isArray(active)) data = active;
    } catch {
      /* 표가 막 사라진 경우 — 응답 배열로 대신합니다 */
    }
    try {
      const order = instance.getColumns().map((c) => c.getField()).filter((f) => f && defs[f]);
      if (order.length) fields = order;
    } catch {
      /* 열 순서를 읽지 못하면 정의 순서 */
    }
  }
  const cols = [
    ...fields.map((f) => ({ attr: f, ...defs[f] })),
    ...extras.filter((e) => !fields.includes(e.attr) || e.always),
  ];
  return {
    head: cols.map((c) => c.head),
    attrs: cols.map((c) => c.attr),
    rows: data.map((r) => cols.map((c) => {
      const v = c.value ? c.value(r) : r?.[c.attr];
      return v === null || v === undefined ? '' : v;
    })),
  };
}
