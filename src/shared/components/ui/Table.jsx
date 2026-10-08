/**
 * 일반 표 (CM-05) — Tabulator 기반
 *
 * 화면 코드가 쓰던 API(columns[].key/title/width/flex/align/render · rows · onRowPress)는 그대로 두고,
 * 그리는 엔진만 Tabulator 로 바꿨습니다. 정렬·열 폭 조절·긴 셀 줄바꿈을 사람이 직접 다룰 수 있습니다.
 *
 *  · `render` 가 있는 열은 React 요소를 Tabulator 셀 안에 **포털**로 그립니다
 *    (Badge · Button · BlindValue 같은 RN 컴포넌트가 컨텍스트를 그대로 물고 동작합니다).
 *    formatter 는 빈 칸(div)만 돌려주고, 칸을 등록해 두면 다음 렌더에서 포털이 채웁니다.
 *    채운 뒤에는 행 높이를 다시 재서 두 줄 셀이 잘리지 않게 합니다.
 *  · `render` 가 없는 열은 값을 글자로 적고, 비어 있으면 '—' 를 놓습니다.
 *  · 열에 `help: '설명'` 을 주면 머리글 제목 옆에 「?」 아이콘이 붙고, 마우스를 올리거나 초점을 주면 설명 상자가 뜹니다(줄바꿈 \n 유지).
 *  · `filterable` 을 주면 머리글에 검색 입력칸이 붙습니다.
 *    열에 `filter: 'list'` 를 주면 입력칸 대신 선택 목록이 붙습니다
 *    (Tabulator 6.x 예제 filter-header 의 gender 열과 같은 list 머리글 필터 — 값 목록 · 정확히 일치 · × 로 지우기).
 *    머리글 칸을 누르면 그 열에 실제로 있는 값(`filterField` 가 있으면 그 값)이 목록으로 열리고,
 *    고른 값과 **같은** 행만 남습니다. 맨 위 「전체」 를 고르면 필터가 풀립니다.
 *    목록 순서를 정하려면 `filterOptions: ['사용','잠김',…]` 을 줍니다(없으면 표 값을 가나다순으로).
 *    `filterFixed: true` 면 표에 있는 값과 관계없이 `filterOptions` 를 그대로 선택지로 둡니다(코드 · 부서 목록처럼 정해진 값, 2026-10-06).
 *    `filter: 'date'` 면 달력 입력칸(input type=date)이 붙고, 값(`filterField` 또는 열 값)이 그 날짜(YYYY-MM-DD)로 시작하는 행을 남깁니다.
 *
 * 사용 예)
 *   <Table
 *     columns={[{ key:'id', title:'설비', width:90 }, { key:'qty', title:'생산량', flex:1, align:'right' }]}
 *     rows={lines}
 *     onRowPress={(row) => showEquipment(row.id)}
 *   />
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { createPortal } from 'react-dom';
import TabulatorGrid, { GRID_INSET } from './TabulatorGrid';

let cellSeq = 0;

/**
 * 머리글 제목 + 도움말 아이콘 — 아이콘에 마우스를 올리거나 초점을 주면 설명 상자를 띄웁니다(열 정의 `help`, 2026-10-08).
 * 머리글은 Tabulator 가 그리는 HTML 이라 RN HelpTip 을 쓸 수 없고, 머리글 칸이 넘치는 내용을 자르므로
 * 설명 상자는 body 에 붙여 아이콘 아래에 고정 위치로 띄웁니다. 줄바꿈(\n)은 그대로 보입니다.
 */
function helpTitle(title, help) {
  const wrap = document.createElement('span');
  wrap.style.cssText = 'display:inline-flex;align-items:center;gap:6px';
  wrap.append(document.createTextNode(String(title ?? '')));
  const icon = document.createElement('span');
  icon.textContent = '?';
  icon.tabIndex = 0;
  icon.setAttribute('role', 'img');
  icon.setAttribute('aria-label', `${title} 도움말`);
  icon.className = 'ax-col-help';
  icon.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:99px;'
    + 'border:1px solid rgba(0,0,0,.25);font-size:12px;font-weight:800;line-height:1;cursor:help;color:rgb(120,120,120)';
  let tip = null;
  const show = () => {
    if (tip) return;
    tip = document.createElement('div');
    tip.className = 'ax-col-help-tip';
    tip.setAttribute('role', 'tooltip');
    tip.textContent = help;
    const r = icon.getBoundingClientRect();
    tip.style.cssText = `position:fixed;z-index:99999;max-width:360px;white-space:pre-line;padding:10px 12px;border-radius:10px;`
      + `background:#fff;color:rgb(28,28,28);font-size:14.5px;font-weight:500;line-height:1.5;text-align:left;`
      + `box-shadow:0 12px 30px rgba(11,20,64,.16);border:1px solid rgba(0,0,0,.06);top:${r.bottom + 8}px;left:${Math.max(8, r.right - 360)}px`;
    document.body.append(tip);
  };
  const hide = () => { tip?.remove(); tip = null; };
  icon.addEventListener('mouseenter', show);
  icon.addEventListener('mouseleave', hide);
  icon.addEventListener('focus', show);
  icon.addEventListener('blur', hide);
  // 머리글 정렬 클릭으로 번지지 않게
  icon.addEventListener('click', (e) => e.stopPropagation());
  wrap.append(icon);
  return wrap;
}

export default function Table({
  columns,
  rows,
  onRowPress,
  emptyText = '조회된 데이터가 없습니다.',
  keyExtractor,
  minWidth,
  style,
  filterable = false,
  height,
  bordered = false,
  /**
   * 카드 벽에 붙지 않도록 표 둘레에 여백을 줍니다 — `<Card tight>` 안에 표만 놓을 때 씁니다.
   * 여백은 가로 스크롤 상자 **바깥**에 둡니다. 안쪽에 두면 옆으로 밀었을 때 여백까지 함께 밀려
   * 표가 다시 카드 벽에 닿습니다.
   */
  inset = false,
  // 고정 높이 표에서는 Tabulator 내부 스크롤 하나로 헤더/본문을 함께 이동합니다.
  contained = false,
  pageSize,
  instanceRef,
}) {
  /** 최신 열·행을 formatter 가 읽는 통로 (formatter 는 표를 만들 때의 클로저에 묶입니다) */
  const colsRef = useRef(columns);
  const rowsRef = useRef(rows);
  const keyExtractorRef = useRef(keyExtractor);
  colsRef.current = columns;
  rowsRef.current = rows;
  keyExtractorRef.current = keyExtractor;
  const internalTableRef = useRef(null);
  const tableRef = instanceRef || internalTableRef;

  /** 포털로 채울 셀 — formatter 가 만든 빈 div 와 (열 순번 · 행 순번) */
  const [cells, setCells] = useState([]);
  const pendingRef = useRef([]);
  const flushScheduled = useRef(false);

  /** formatter 가 부릅니다 — 한 프레임에 여러 셀이 오므로 마이크로태스크로 모아 한 번만 상태를 바꿉니다 */
  const registerCell = (entry) => {
    pendingRef.current.push({ ...entry, sourceRows: rowsRef.current });
    if (flushScheduled.current) return;
    flushScheduled.current = true;
    queueMicrotask(() => {
      flushScheduled.current = false;
      const fresh = pendingRef.current;
      pendingRef.current = [];
      // 필터/페이지로 잠시 떨어진 셀도 Tabulator가 재사용합니다. 포털을 지우면
      // 다시 나타난 행의 버튼이 비므로, 데이터/표가 교체되거나 같은 셀이 재포맷될 때만 버립니다.
      setCells((prev) => [
        ...prev.filter(c => c.sourceRows === rowsRef.current &&
          (!fresh.length || c.table === fresh[0].table) && !fresh.some(next => next.cell === c.cell)),
        ...fresh.filter(c => c.sourceRows === rowsRef.current),
      ]);
    });
  };

  // 포털이 채워진 뒤 행 높이를 다시 잽니다 (Tabulator 는 빈 칸 기준으로 높이를 잡아 둡니다).
  // 행이 자란 만큼 표 전체 높이도 다시 맞춥니다 — 안 맞추면 표 안에 세로 스크롤이 생깁니다.
  useEffect(() => {
    const table = tableRef.current;
    if (!table || !cells.length) return;
    try {
      table.getRows().forEach((row) => row.normalizeHeight());
      table.rowManager?.adjustTableSize?.();
    } catch {
      /* 표가 정리되는 중 */
    }
  }, [cells]);

  /**
   * 세로 렌더링은 basic — 화면의 표는 쪽 단위(≤200행)라 가상 스크롤이 필요 없고,
   * 가상 렌더는 스크롤마다 셀을 다시 만들어 포털을 새로 채워야 합니다.
   */
  const tableOptions = useMemo(() => ({ renderVertical: 'basic', layout: 'fitColumns', ...(pageSize ? { paginationSizeSelector: [10, 25, 50, 100] } : {}) }), [pageSize]);

  /**
   * 열 정의 → Tabulator 열
   *
   * 열의 **모양**이 바뀔 때만 표를 다시 만듭니다. 화면들이 render 마다 새 배열을 넘기므로
   * 정의 자체를 의존성으로 두면 키 입력마다 표가 부서지고 정렬이 풀립니다.
   */
  const signature = columns.map((c) => [c.key, c.title, c.width, c.flex, c.minWidth, c.align, !!c.render, !!c.wrap, !!c.mono, !!c.num, c.sortable, c.filterable, c.filterField, c.filter, !!c.filterFixed, (c.filterOptions || []).join(',')].join(':')).join('|');
  const tabColumns = useMemo(
    () => {
      // 모든 열이 고정 폭이면 표 오른쪽이 비어 버립니다 — 마지막 열이 남는 폭을 채우게 합니다
      const hasFlex = columns.some((c) => !c.width);
      return columns.map((col, i) => {
        const align = col.align || 'left';
        const stretchLast = !hasFlex && i === columns.length - 1;
        const base = {
          title: col.title,
          field: col.key,
          hozAlign: align,
          headerHozAlign: align,
          headerSort: col.sortable !== false,
          headerFilter: filterable && col.filterable !== false && (!col.render || col.filterable === true || col.filter === 'list' || col.filter === 'date') ? (col.filter === 'list' ? 'list' : 'input') : false,
          ...(col.filter === 'list' ? listFilter(col, rowsRef) : col.filter === 'date' ? dateFilter(col) : col.filterField ? { headerFilterFunc: (query, _value, row) => String(row[col.filterField] ?? '').toLocaleLowerCase().includes(String(query).toLocaleLowerCase()) } : {}),
          tooltip: col.render ? false : (_event, cell) => {
            const el = document.createElement('div');
            el.textContent = String(cell.getValue() ?? '');
            return el;
          },
          variableHeight: !!col.wrap || !!col.render,
          // 목록 머리글 필터 표시(▾·손가락 커서) — tabulatorHeaders.css
          ...(col.filter === 'list' ? { cssClass: 'ax-list-filter' } : {}),          // 머리글 도움말(?) — 마우스를 올리면 설명이 뜹니다(2026-10-08)
          ...(col.help ? { titleFormatter: () => helpTitle(col.title, col.help) } : {}),
        };
        if (col.width && !stretchLast) {
          base.width = col.width;
          base.minWidth = col.minWidth || col.width;
        } else {
          base.widthGrow = col.flex || 1;
          const min = col.minWidth || col.width || 120;
          if (min) base.minWidth = min;
        }
        if (col.render) {
          base.formatter = (cell) => {
            const data = cell.getRow().getData();
            const el = document.createElement('div');
            el.className = 'ax-cell';
            registerCell({ id: `c${(cellSeq += 1)}`, el, cell, table: cell.getTable(), colIndex: i, rowIdx: data.__idx, data });
            return el;
          };
        } else {
          base.formatter = (cell) => {
            const v = cell.getValue();
            const span = document.createElement('span');
            span.textContent = v === null || v === undefined || v === '' ? '—' : String(v);
            const cls = [];
            if (col.mono) cls.push('mono');
            if (col.num || align === 'right') cls.push('num');
            if (!col.wrap) cls.push('nowrap');
            span.className = cls.join(' ');
            return span;
          };
        }
        return base;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [signature, filterable]
  );

  // 행 데이터 — 원본 행을 그대로 두고 순번만 붙입니다 (포털이 원본 객체를 찾는 열쇠)
  const data = useMemo(
    () => (rows || []).map((row, i) => ({ ...row, __idx: i, __k: keyExtractorRef.current ? String(keyExtractorRef.current(row, i)) : String(i) })),
    [rows]
  );

  const grid = (
    <TabulatorGrid
      columns={tabColumns}
      rows={data}
      emptyText={emptyText}
      headerFilter={filterable}
      height={height}
      bordered={bordered}
      pageSize={pageSize}
      instanceRef={tableRef}
      tableOptions={tableOptions}
      onRowClick={onRowPress ? (rowData) => onRowPress(rowsRef.current?.[rowData.__idx] ?? rowData, rowData.__idx) : undefined}
      style={style}
    />
  );

  // 포털 — 셀마다 최신 render 를 호출합니다 (부모가 다시 그리면 셀 내용도 함께 바뀝니다)
  const portals = cells.map((c) => {
    const col = colsRef.current[c.colIndex];
    if (!col?.render) return null;
    const row = rowsRef.current?.[c.rowIdx] ?? c.data;
    return createPortal(
      <View style={{ alignItems: alignFlex(col.align), justifyContent: 'center', width: '100%' }}>{col.render(row, c.rowIdx)}</View>,
      c.el,
      c.id
    );
  });

  // 포털이 비어 있는 시점의 내용 폭으로 열을 재지 않고 선언된 최소 폭을 보장합니다.
  // 스크롤 컨테이너는 부모 폭 안에 두어 넓은 표가 페이지 전체를 밀어내지 않게 합니다.
  const tableMinWidth = Math.max(
    minWidth || 0,
    columns.reduce((sum, col) => sum + (col.width || col.minWidth || 120), 0)
  );
  // 가로 스크롤은 이 바깥 상자가 맡습니다. 안쪽 Tabulator 스크롤 영역은 넘치지 않는데도 가로 휠을 붙잡아
  // 트랙패드로 옆으로 밀어도 움직이지 않았습니다 — ax-table-scroller 안에서는 휠을 이 상자로 넘깁니다
  // (tabulatorHeaders.css). 뒤로 가기 스와이프로 번지지 않게 막는 것은 이 상자의 contain 이 합니다.
  const scroller = (
    <div className={contained ? undefined : 'ax-table-scroller'} style={{ width: '100%', minWidth: 0, maxWidth: '100%', overflowX: contained ? 'hidden' : 'auto', touchAction: 'pan-x pan-y', overscrollBehaviorX: 'contain' }}>
      <div style={{ width: '100%', minWidth: contained ? 0 : tableMinWidth }}>{grid}</div>
    </div>
  );
  return (
    <>
      {inset ? <View style={GRID_INSET}>{scroller}</View> : scroller}
      {portals}
    </>
  );
}

/** 목록 머리글 필터에서 「전체」 의 값 — 빈 값이면 Tabulator 가 그 열 필터를 풉니다 */
const LIST_ALL = '';
const LIST_EMPTY_LABEL = '(값 없음)';

/**
 * 목록 머리글 필터 (`filter: 'list'`)
 *
 * 선택지는 목록을 **열 때마다** 지금 행에서 다시 뽑습니다(valuesLookup 함수) — 조회 조건이 바뀌어 행이
 * 달라져도 목록이 따라옵니다. 비교 값은 `filterField`(화면에 보이는 글자, 예: stateLabel) 또는 열 값입니다.
 */
function listFilter(col, rowsRef) {
  const field = col.filterField || col.key;
  const textOf = (row) => {
    const v = row?.[field];
    return v === null || v === undefined || v === '' ? LIST_EMPTY_LABEL : String(v);
  };
  return {
    headerFilterPlaceholder: '전체',
    headerFilterParams: {
      valuesLookup: () => {
        if (col.filterFixed && col.filterOptions?.length) {
          return [{ label: '전체', value: LIST_ALL }, ...col.filterOptions.map((v) => ({ label: v, value: v }))];
        }
        const present = new Set((rowsRef.current || []).map(textOf));
        const ordered = col.filterOptions?.length
          ? [...col.filterOptions.filter((o) => present.has(o)), ...[...present].filter((v) => !col.filterOptions.includes(v)).sort((a, b) => a.localeCompare(b, 'ko'))]
          : [...present].sort((a, b) => a.localeCompare(b, 'ko'));
        return [{ label: '전체', value: LIST_ALL }, ...ordered.map((v) => ({ label: v, value: v }))];
      },
      // × 단추로 필터를 지웁니다(예제 gender 열과 같음)
      clearable: true,
      autocomplete: false,
    },
    headerFilterFunc: (query, _value, row) => query === LIST_ALL || textOf(row) === query,
  };
}

/**
 * 날짜 머리글 필터 (`filter: 'date'`) — 달력(input type=date)으로 고르고, 값이 그 날짜로 시작하는 행을 남깁니다.
 * 값은 「YYYY-MM-DD HH:mm」 처럼 날짜가 앞에 오는 글자여야 합니다.
 */
function dateFilter(col) {
  const field = col.filterField || col.key;
  return {
    headerFilterParams: { elementAttributes: { type: 'date' } },
    headerFilterLiveFilter: false,
    headerFilterFunc: (query, _value, row) => !query || String(row?.[field] ?? '').startsWith(String(query)),
  };
}

function alignFlex(align) {
  if (align === 'right') return 'flex-end';
  if (align === 'center') return 'center';
  return 'flex-start';
}
