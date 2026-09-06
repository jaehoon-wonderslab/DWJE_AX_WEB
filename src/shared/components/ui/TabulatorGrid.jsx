/**
 * [Component] 범용 Tabulator 표
 *
 * `TabulatorTable` 은 실적 집계 화면 전용(열·트리 구조가 박혀 있습니다)이라,
 * 열을 받아 그리는 표가 필요한 곳에서 이걸 씁니다.
 *
 * ■ 왜 Tabulator 인가
 * 정렬·열 크기 조절·긴 셀 줄바꿈을 사람이 직접 다룰 수 있어야 하는 표에 씁니다.
 * 단순 나열이면 `Table` · `XlsTable` 이 더 가볍습니다.
 *
 * ■ 행 묶음
 * `groupBy` 를 주면 같은 값끼리 묶어 머리글을 답니다 — 한 대상에 여러 줄이 붙는 표에서
 * 어느 줄이 어느 대상 것인지 눈으로 갈립니다.
 *
 * ■ 행 선택
 * `selectable` 을 주면 왼쪽에 선택 칸이 붙습니다. 머리글 칸을 누르면 **지금 보이는 행 전체**가
 * 선택됩니다 — 검색으로 좁혀 놓고 한 번에 고르는 방식입니다. 어떤 행이 선택됐는지는
 * `rowKey` 로 가려내고 `onSelectedChange` 로 알려 줍니다.
 *
 * ■ 정렬은 표가 스스로 합니다
 * 머리글을 누르면 정렬되고, shift 를 누른 채 다른 머리글을 누르면 **조건이 쌓입니다**.
 * 자료가 바뀔 때 표를 새로 만들지 않고 `replaceData` 로 갈아 끼우므로 그 조건이 유지됩니다.
 */
import React, { useEffect, useId, useRef } from 'react';
import { View } from 'react-native';
import { TabulatorFull as Tabulator } from 'tabulator-tables';
import 'tabulator-tables/dist/css/tabulator.min.css';
import { FONT_FAMILY } from '@shared/theme/styles';

/** 묶음 머리글의 펼침 화살표가 차지하는 폭 — 첫 칸에서 이만큼 뺍니다 */
export const ARROW_W = 26;
import { useTheme } from '@shared/theme/useTheme';

export default function TabulatorGrid({
  columns = [],
  rows = [],
  height,
  groupBy,
  groupHeader,
  groupStartOpen = true,
  emptyText = '표시할 내용이 없습니다.',
  style,
  selectable = false,
  /** 행을 가려내는 필드 — 선택 목록에 이 값이 담깁니다 */
  rowKey,
  selected,
  onSelectedChange,
  /** 첫 정렬 — 이후에는 사용자가 머리글로 바꿉니다 */
  initialSort,
}) {
  const ref = useRef(null);
  const instance = useRef(null);
  /** 최신 값을 콜백 안에서 읽기 위한 통로 — 이것 때문에 표를 새로 만들지는 않습니다 */
  const selectedRef = useRef(selected);
  const onSelectedRef = useRef(onSelectedChange);
  /** 우리가 코드로 선택을 되돌리는 중인지 — 그때 나는 이벤트를 부모에게 되돌려주면 무한히 돕니다 */
  const restoring = useRef(false);
  selectedRef.current = selected;
  onSelectedRef.current = onSelectedChange;
  const theme = useTheme();
  const id = useId().replace(/:/g, '_');
  const isDark = theme.isDark;

  const c = {
    border: isDark ? '#1e293b' : '#e2e8f0',
    headBg: isDark ? '#0f172a' : '#f8fafc',
    headText: isDark ? '#94a3b8' : '#64748b',
    text: isDark ? '#f8fafc' : '#0f172a',
    muted: isDark ? '#64748b' : '#94a3b8',
    rowBorder: isDark ? '#1e293b' : '#f1f5f9',
    hover: isDark ? '#1e293b' : '#f8fafc',
    groupBg: isDark ? '#111c33' : '#eef2f7',
    card: isDark ? '#0f172a' : '#ffffff',
    selected: isDark ? '#1e3a5f' : '#e0f2fe',
    accent: isDark ? '#60a5fa' : '#2563eb',
  };

  useEffect(() => {
    if (!ref.current) return undefined;

    /**
     * 선택 칸을 **첫 열로** 붙입니다
     *
     * Tabulator 6 의 `rowHeader` 옵션으로도 되게 돼 있는데 이 구성에서는 칸이 안 그려집니다
     * (행에 `tabulator-selectable` 은 붙는데 `.tabulator-row-header` 가 없습니다).
     * 열로 넣으면 확실합니다 — 머리글 칸은 지금 보이는 행 전체를 한 번에 고릅니다.
     */
    const cols = selectable
      ? [
          {
            formatter: 'rowSelection',
            titleFormatter: 'rowSelection',
            headerSort: false,
            resizable: false,
            width: 42,
            minWidth: 42,
            hozAlign: 'center',
            headerHozAlign: 'center',
            cellClick: (e, cell) => cell.getRow().toggleSelect(),
          },
          ...columns,
        ]
      : columns;

    const table = new Tabulator(ref.current, {
      data: rows,
      columns: cols,
      layout: 'fitColumns',
      responsiveLayout: false,
      placeholder: emptyText,
      height: height || undefined,
      // 셀 안에서 줄이 바뀌므로 행 높이를 내용에 맞춥니다
      variableHeight: true,
      // shift 를 누른 채 머리글을 누르면 정렬 조건이 쌓입니다
      columnHeaderSortMulti: true,
      ...(initialSort ? { initialSort } : null),
      ...(selectable ? { selectableRows: true } : null),
      ...(groupBy
        ? {
            groupBy,
            groupStartOpen,
            groupHeader: groupHeader || ((value, count) => `${value} <span style="color:${c.muted}">· ${count}건</span>`),
          }
        : null),
    });

    if (selectable) {
      table.on('rowSelectionChanged', (data) => {
        if (restoring.current) return;
        onSelectedRef.current?.(data.map((r) => (rowKey ? r[rowKey] : r)));
      });
    }

    instance.current = table;
    return () => {
      try {
        table.destroy();
      } catch {
        /* 이미 정리된 경우 */
      }
      instance.current = null;
    };
    // rows 는 일부러 뺐습니다 — 아래에서 갈아 끼웁니다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, height, groupBy, groupHeader, groupStartOpen, emptyText, isDark, selectable, rowKey, initialSort]);

  /**
   * 자료만 갈아 끼웁니다 — 정렬·열 너비가 그대로 남습니다
   *
   * 예전에는 `rows` 가 바뀔 때마다 표를 부수고 새로 만들어, 검색어를 한 글자 칠 때마다
   * 사용자가 잡아 둔 정렬이 풀렸습니다. 갈아 끼우면 선택이 풀리므로, 부모가 들고 있는
   * 선택 목록으로 되돌려 놓습니다. 되돌리는 동안 나는 이벤트는 부모에게 알리지 않습니다
   * (그대로 두면 서로를 계속 부릅니다).
   */
  useEffect(() => {
    const table = instance.current;
    if (!table) return;
    const apply = () => {
      table.replaceData(rows).then(() => {
        if (!selectable || !rowKey) return;
        const keep = new Set(selectedRef.current || []);
        if (!keep.size) return;
        restoring.current = true;
        try {
          table.getRows().forEach((r) => {
            if (keep.has(r.getData()[rowKey])) r.select();
          });
        } finally {
          restoring.current = false;
        }
      }).catch(() => { /* 표가 이미 정리된 경우 */ });
    };
    if (table.initialized) apply();
    else table.on('tableBuilt', apply);
  }, [rows, selectable, rowKey]);

  return (
    <View style={style} nativeID={`grid_${id}`}>
      <style>{`
        #grid_${id} .tabulator {
          background: ${c.card};
          border: 1px solid ${c.border};
          border-radius: 6px;
          font-size: 12.5px;
        }
        #grid_${id} .tabulator .tabulator-header {
          background: ${c.headBg};
          border-bottom: 1px solid ${c.border};
        }
        #grid_${id} .tabulator .tabulator-header .tabulator-col {
          background: transparent;
          border-right: 1px solid ${c.rowBorder};
        }
        #grid_${id} .tabulator .tabulator-header .tabulator-col-title {
          color: ${c.headText};
          font-weight: 600;
          font-size: 11.5px;
          padding: 9px 10px;
          white-space: normal;
        }
        #grid_${id} .tabulator .tabulator-row {
          background: ${c.card};
          border-bottom: 1px solid ${c.rowBorder};
        }
        #grid_${id} .tabulator .tabulator-row:hover { background: ${c.hover}; }
        #grid_${id} .tabulator .tabulator-cell {
          color: ${c.text};
          padding: 9px 10px;
          border-right: 1px solid ${c.rowBorder};
          white-space: normal;
          line-height: 1.55;
          vertical-align: top;
        }
        #grid_${id} .tabulator .tabulator-row.tabulator-group {
          background: ${c.groupBg};
          border-bottom: 1px solid ${c.border};
          font-weight: 700;
          font-size: 12.5px;
          color: ${c.text};
          padding: 9px 10px;
        }
        /* 표 안 모든 글자를 화면 글꼴로 — Tabulator 기본 글꼴이 섞이면 표만 따로 놉니다 */
        #grid_${id} .tabulator, #grid_${id} .tabulator * { font-family: ${FONT_FAMILY}; }
        /*
          묶음 머리글을 **본 표의 열 폭에 맞춰** 늘어놓습니다.
          자유롭게 흐르게 두면 값이 어느 열 것인지 눈으로 이어 붙여야 합니다 —
          같은 자리에 놓여야 위 열 이름이 곧 그 값의 이름이 됩니다.
        */
        #grid_${id} .tabulator .tabulator-row.tabulator-group {
          display: flex;
          align-items: center;
          /* Tabulator 기본 좌측 여백을 없애야 첫 칸이 본 표의 첫 열과 같은 x 에서 시작합니다 */
          padding: 9px 0 !important;
        }
        #grid_${id} .tabulator .tabulator-row.tabulator-group .g {
          box-sizing: border-box;
          flex: 0 0 auto;
          /* Tabulator 가 묶음 머리글의 span 마다 좌측 여백 10px 을 줍니다 — 그만큼씩 밀립니다 */
          margin: 0 !important;
          padding: 0 10px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        /*
          화살표는 .tabulator-group-toggle 로 감싸여 있고 그쪽이 flex 칸입니다.
          여기에 폭을 고정해야 뒤 칸이 밀리지 않습니다 — 화살표에 주면 감싼 쪽 여백이 남습니다.
        */
        #grid_${id} .tabulator .tabulator-row.tabulator-group .tabulator-group-toggle {
          box-sizing: border-box;
          flex: 0 0 auto;
          width: ${ARROW_W}px;
          margin: 0 !important;
          padding-left: 8px;
        }
        /* 숫자는 자릿수가 흔들리지 않게 */
        #grid_${id} .tabulator .num { font-variant-numeric: tabular-nums; }
        #grid_${id} .tabulator .muted { color: ${c.muted}; }
        #grid_${id} .tabulator .quote { color: ${c.muted}; font-style: italic; }
        #grid_${id} .tabulator .strong { font-weight: 700; }
        /* 한 칸에 문장이 여럿일 때 — 줄 사이를 벌려 어디서 끊기는지 보이게 합니다 */
        #grid_${id} .tabulator .li + .li { margin-top: 7px; padding-top: 7px; border-top: 1px dashed ${c.rowBorder}; }
        /* 고른 행 — 어두운 화면에서도 갈리게 */
        #grid_${id} .tabulator .tabulator-row.tabulator-selected,
        #grid_${id} .tabulator .tabulator-row.tabulator-selected:hover { background: ${c.selected}; }
        #grid_${id} .tabulator input[type="checkbox"] { width: 15px; height: 15px; cursor: pointer; accent-color: ${c.accent}; }
      `}</style>
      <div ref={ref} />
    </View>
  );
}
