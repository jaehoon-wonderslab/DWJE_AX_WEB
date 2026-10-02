/**
 * [View 보조] Tabulator 표에서 「지금 보이는 행」 이 바뀔 때마다 알려 줍니다
 *
 * 열 검색·상단 검색으로 좁혀진 결과를 컨트롤러가 알아야 하는 화면에서 씁니다
 * (재배정 대상 = 보이는 행, GWD-01 · 「조회 목록 다운로드(n건)」 건수, ACC-17 · GWD-15).
 *
 * 공통 TabulatorGrid 에는 아직 이 콜백이 없어(공통 변경 요청 `onFilteredChange`) 화면 쪽에서
 * `instanceRef` 로 받은 표에 `dataFiltered` 를 직접 붙입니다. 표는 열 정의·높이가 바뀌면 새로 만들어지므로
 * 렌더마다 인스턴스가 바뀌었는지 보고 새 표에 다시 붙입니다.
 *
 * @param {{ current: any }} instanceRef TabulatorGrid · Table 의 instanceRef
 * @param {(rows: object[]) => void} onChange 보이는 행(필터 적용 후, 원본 자료)
 */
import { useEffect, useRef } from 'react';

export function useTableActive(instanceRef, onChange) {
  const attached = useRef(null);
  const cb = useRef(onChange);
  cb.current = onChange;
  // 의존성 없이 매 렌더 확인합니다 — 자식 표의 effect 가 먼저 돌아 인스턴스가 채워진 뒤입니다
  useEffect(() => {
    const table = instanceRef?.current;
    if (!table || attached.current === table) return;
    attached.current = table;
    const emitAll = () => {
      try {
        cb.current?.(table.getData('active'));
      } catch {
        /* 표가 정리되는 중 */
      }
    };
    table.on('dataFiltered', (_filters, rows) => cb.current?.(rows.map((r) => r.getData())));
    if (table.initialized) emitAll();
    else table.on('tableBuilt', emitAll);
  });
}
