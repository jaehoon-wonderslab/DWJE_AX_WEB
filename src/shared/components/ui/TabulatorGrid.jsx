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
 *
 * ■ 행 클릭
 * `onRowClick` 을 주면 행을 눌렀을 때 그 행의 자료를 넘겨 줍니다. 칸 안의 버튼·링크를 누른 것은
 * 행 클릭으로 치지 않습니다 — 「재실행」을 눌렀는데 상세까지 열리면 두 가지가 겹칩니다.
 *
 * ■ 칸 안의 배지·버튼
 * 셀 formatter 가 HTML 문자열을 돌려주면 그대로 그려지므로, `Badge` · `Button` 과 같은 모양의
 * 클래스를 표 안에 두었습니다 — `.tag .tag-green|red|amber|blue` · `.tbtn .tbtn-primary` · `.mono`.
 * 버튼 동작은 열의 `cellClick` 에서 받습니다.
 */
import React, { useEffect, useId, useMemo, useRef } from 'react';
import { View } from 'react-native';
import { TabulatorFull as Tabulator } from 'tabulator-tables';
import 'tabulator-tables/dist/css/tabulator.min.css';
import './tabulatorHeaders.css';
import { FONT_FAMILY, MONO_FAMILY } from '@shared/theme/styles';

/**
 * 쪽 이동 한글 문구
 *
 * `counter` 는 `showing + 범위 + of + 합계 + rows` 를 이어 붙입니다.
 * 한국어 어순에 맞추려고 showing 을 비우고 of 를 ' / ' 로 둡니다 → 「1-10 / 40건」
 */
const KO_LANG = {
  ko: {
    pagination: {
      page_size: '표시 건수',
      page_title: '쪽',
      first: '처음',
      first_title: '첫 쪽',
      last: '끝',
      last_title: '마지막 쪽',
      prev: '이전',
      prev_title: '이전 쪽',
      next: '다음',
      next_title: '다음 쪽',
      all: '전체',
      counter: { showing: '', of: ' / ', rows: '건', pages: '쪽' },
    },
    data: { loading: '불러오는 중', error: '오류' },
  },
};

/** 묶음 머리글의 펼침 화살표가 차지하는 폭 — 첫 칸에서 이만큼 뺍니다 */
export const ARROW_W = 26;
import { useTheme } from '@shared/theme/useTheme';
import { useAuthStore } from '@shared/stores/useAuthStore';

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
  /** 행을 눌렀을 때 — (행 자료, 이벤트). 칸 안의 버튼·링크 클릭은 제외됩니다 */
  onRowClick,
  /** 각 데이터 열의 머리글에 검색 입력칸을 붙입니다 */
  headerFilter = true,
  /** 선택 가능한 최대 행 수 (0이면 제한 없음) */
  maxSelectable = 0,
  /** 외부 동작(상세 보기 등)에서 머리글 필터에 넣을 값 */
  headerFilters,
  /** 만들어진 Tabulator 인스턴스를 받아 갈 ref (행 높이 재계산 등 — 표를 다시 만들지는 않습니다) */
  instanceRef,
  /** Tabulator 옵션 덧붙이기 (예: renderVertical: 'basic') — 표를 만들 때 한 번만 읽습니다 */
  tableOptions,
  /** 쪽 나누기 — 한 쪽에 보일 행 수. 주면 표 아래에 쪽 이동이 붙습니다 */
  pageSize,
  /** 칸마다 세로 줄을 그립니다 — 열이 많아 눈이 미끄러지는 표에서 씁니다 */
  bordered = false,
  productionStyle = false,
  /** 접었다 펴는 트리 — 자식 행은 각 행의 `childField` 배열에 담습니다 */
  dataTree = false,
  childField = '_children',
  treeStartExpanded = false,
  treeChildIndent = 14,
}) {
  const ref = useRef(null);
  const railRef = useRef(null);
  const railWidthRef = useRef(null);
  const instance = useRef(null);
  /** 최신 값을 콜백 안에서 읽기 위한 통로 — 이것 때문에 표를 새로 만들지는 않습니다 */
  const selectedRef = useRef(selected);
  const onSelectedRef = useRef(onSelectedChange);
  const onRowClickRef = useRef(onRowClick);
  /** 우리가 코드로 선택을 되돌리는 중인지 — 그때 나는 이벤트를 부모에게 되돌려주면 무한히 돕니다 */
  const restoring = useRef(false);
  selectedRef.current = selected;
  onSelectedRef.current = onSelectedChange;
  onRowClickRef.current = onRowClick;
  const hasRowClick = typeof onRowClick === 'function';
  const theme = useTheme();
  const id = useId().replace(/:/g, '_');

  /**
   * 가려야 하는 열 — 열의 응답 필드명(`field`)이 권한 없는 데이터 항목에 속하는 경우입니다.
   *
   * 화면이 열마다 항목을 적어 두지 않는 것이 요점입니다. 관리자가 항목·필드명을 추가하면
   * 다음 로그인부터 이 판정이 저절로 달라집니다.
   */
  const attrIndex = useAuthStore((state) => state.attrIndex);
  const dataPerms = useAuthStore((state) => state.dataPerms);
  const blocked = useMemo(() => {
    const canData = useAuthStore.getState().canData;
    return new Set(Object.keys(attrIndex).filter((attr) => !canData(attrIndex[attr])));
  }, [attrIndex, dataPerms]);
  // 표를 다시 만들 조건에 넣기 위한 값 — Set 은 매번 새 객체라 그대로는 못 씁니다
  const blockedKey = [...blocked].sort().join(',');
  const isDark = theme.isDark;
  const { color, alpha } = theme;

  // 테마 토큰에서 표 색을 뽑습니다 — 헤어라인·틴트만으로 구분하는 화면 규칙과 같게
  const c = {
    border: theme.divider,
    headBg: theme.surface,
    headText: color.mutedForeground,
    text: color.foreground,
    muted: color.mutedForeground,
    rowBorder: theme.divider,
    hover: theme.surface,
    groupBg: theme.surface,
    card: 'transparent',
    selected: alpha('info', 0.08),
    accent: color.info,
    focusRing: alpha('info', 0.14),
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
    // 표마다 필터 설정을 반복하지 않아도 되도록 데이터 열은 기본적으로 검색 가능하게 둡니다.
    // `headerFilter: false` 를 준 열은 (아이콘·계산 열 등) 그대로 제외합니다.
    // 머리글 그룹({ title, columns: [...] })은 자식까지 내려가며 손봅니다.
    // 그룹 자체에는 field 가 없어, 얕게 훑으면 그룹 안의 열에만 검색칸·최소 너비가 빠집니다.
    const prepare = (definition) => {
      if (Array.isArray(definition.columns)) {
        return { ...definition, columns: definition.columns.map(prepare) };
      }
      // 가용 폭이 좁아져도 열을 계속 압축하지 않고 표 내부 가로 스크롤로 넘깁니다.
      const column = {
        ...definition,
        minWidth: definition.minWidth ?? (typeof definition.width === 'number' ? definition.width : 120),
      };
      // 권한 없는 항목의 열은 값을 그리지 않습니다.
      // 정렬·검색도 막습니다 — 가린 값으로 줄을 세우면 순서로 원본을 되짚을 수 있습니다.
      if (column.field && blocked.has(column.field)) {
        return {
          ...column,
          headerSort: false,
          headerFilter: false,
          bottomCalc: undefined,
          formatter: () => {
            const badge = document.createElement('span');
            badge.textContent = '●●●● 비공개';
            badge.title = '소속 부서에 이 데이터 항목의 접근 권한이 없습니다';
            badge.setAttribute('aria-label', '비공개 항목');
            badge.style.cssText = `display:inline-block;padding:1px 9px;border-radius:999px;border:1px dashed ${c.border};color:${c.muted};font-size:12px;white-space:nowrap`;
            return badge;
          },
        };
      }
      if (!headerFilter || !column?.field || column.headerFilter === false) return column;
      return {
        ...column,
        headerFilter: column.headerFilter || 'input',
        headerFilterLiveFilter: column.headerFilterLiveFilter ?? true,
        ...(dataTree && !column.headerFilterFunc ? {
          headerFilterFunc: (query, value, row) => {
            const q = String(query ?? '').trim().toLocaleLowerCase();
            const matches = node => String(node[column.field] ?? '').toLocaleLowerCase().includes(q) ||
              (node[childField] || []).some(matches);
            return !q || matches(row);
          },
        } : {}),
        headerFilterPlaceholder: column.headerFilterPlaceholder || `${column.title || '항목'} 검색`,
      };
    };
    const filterableColumns = columns.map(prepare);

    const cols = selectable
      ? [
          {
            formatter: 'rowSelection',
            title: '',
            headerSort: false,
            resizable: false,
            width: 42,
            minWidth: 42,
            hozAlign: 'center',
            headerHozAlign: 'center',
            cellClick: (e, cell) => cell.getRow().toggleSelect(),
          },
          ...filterableColumns,
        ]
      : filterableColumns;

    const table = new Tabulator(ref.current, {
      data: rows,
      columns: cols,
      layout: productionStyle ? 'fitData' : 'fitColumns',
      layoutColumnsOnNewData: productionStyle,
      columnDefaults: { resizable: 'header' },
      resizableColumnFit: false,
      responsiveLayout: false,
      placeholder: emptyText,
      height: height || (dataTree ? 560 : undefined),
      // 셀 안에서 줄이 바뀌므로 행 높이를 내용에 맞춥니다
      variableHeight: true,
      // shift 를 누른 채 머리글을 누르면 정렬 조건이 쌓입니다
      columnHeaderSortMulti: true,
      ...(tableOptions || null),
      // 크기 조정은 아래 observer 한 곳에서 처리합니다.
      autoResize: false,
      ...(initialSort ? { initialSort } : null),
      ...(selectable ? { selectableRows: maxSelectable || true } : null),
      ...(pageSize && !dataTree
        ? {
            pagination: true,
            paginationMode: 'local',
            paginationSize: pageSize,
            paginationCounter: 'rows',
            // 쪽 이동 문구는 **항상** 한글입니다 — 한국어 화면에 First/Prev/Next/Last 와
            // "Showing 1-10 of 40 rows" 가 섞여 있을 이유가 없습니다
            locale: 'ko',
            langs: KO_LANG,
            ...(productionStyle ? { paginationSizeSelector: [10, 25, 50, 100] } : null),
          }
        : null),
      ...(dataTree
        ? {
            dataTree: true,
            dataTreeChildField: childField,
            dataTreeStartExpanded: treeStartExpanded,
            dataTreeChildIndent: treeChildIndent,
            dataTreeExpandElement: '<button type="button" class="dw-tree-toggle" aria-label="하위 항목 펼치기" aria-expanded="false">+</button>',
            dataTreeCollapseElement: '<button type="button" class="dw-tree-toggle" aria-label="하위 항목 접기" aria-expanded="true">−</button>',
            // 자식이 없는 행에 빈 자리를 남기지 않습니다
            dataTreeBranchElement: false,
            // 자식이 검색에 걸리면 그 위 단계도 함께 남깁니다 — 아니면 걸린 행이 통째로 사라집니다
            dataTreeFilter: true,
          }
        : null),
      ...(groupBy
        ? {
            groupBy,
            groupStartOpen,
            groupHeader: groupHeader || ((value, count) => `${value} <span style="color:${c.muted}">· ${count}건</span>`),
          }
        : null),
    });


    // 붙여넣기·한글 조합 완료도 검색합니다(기본 Tabulator는 keyup 중심).
    const applyHeaderInput = event => {
      const input = event.target;
      if (event.isComposing || !input.closest?.('.tabulator-header-filter')) return;
      const field = input.closest('.tabulator-col')?.getAttribute('tabulator-field');
      if (!field) return;
      // setHeaderFilterValue는 입력 요소를 재생성하므로 커서가 사라집니다.
      // 기존 입력 요소의 기본 검색 이벤트를 사용합니다.
      input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Unidentified', bubbles: true }));
    };
    ref.current.addEventListener('input', applyHeaderInput);
    ref.current.addEventListener('compositionend', applyHeaderInput);

    // 트리 버튼은 펼침/접힘 때 교체되므로 렌더와 상태 변경 후 의미를 다시 붙입니다.
    let tooltipFrame = 0;
    const updateTreeTooltips = () => {
      if (!dataTree || !ref.current) return;
      const visit = rows => rows.forEach(row => {
        if (row.isTreeExpanded()) visit(row.getTreeChildren());
        const button = row.getElement().querySelector('.dw-tree-toggle');
        if (!button) return;
        const chain = [];
        let current = row;
        while (current) {
          const label = current.getData().levelLabel;
          if (label) chain.unshift(label);
          current = current.getTreeParent();
        }
        if (!chain.length) return;
        const action = button.getAttribute('aria-expanded') === 'true' ? '접기' : '펼치기';
        const description = chain.join(' → ') + ' · 하위 항목 ' + action;
        button.title = description;
        button.setAttribute('aria-label', description);
      });
      visit(table.getRows());
    };
    ['renderComplete', 'dataTreeRowExpanded', 'dataTreeRowCollapsed'].forEach(event => table.on(event, () => {
      updateTreeTooltips();
      cancelAnimationFrame(tooltipFrame);
      tooltipFrame = requestAnimationFrame(updateTreeTooltips);
    }));

    let sizeFrame = 0, railFrame = 0, holder;
    const rail = railRef.current;
    const syncRail = () => {
      cancelAnimationFrame(railFrame);
      railFrame = requestAnimationFrame(() => {
        if (!holder || !rail || !railWidthRef.current) return;
        railWidthRef.current.style.width = (rail.clientWidth + Math.max(0, holder.scrollWidth - holder.clientWidth)) + 'px';
        rail.scrollLeft = holder.scrollLeft;
      });
    };
    const fromRail = () => { if (holder && holder.scrollLeft !== rail.scrollLeft) holder.scrollLeft = rail.scrollLeft; };
    const fromTable = () => { if (rail && rail.scrollLeft !== holder.scrollLeft) rail.scrollLeft = holder.scrollLeft; };
    const autoSize = () => {
      cancelAnimationFrame(sizeFrame);
      sizeFrame = requestAnimationFrame(() => {
        table.getColumns().forEach(column => column.setWidth(true));
        syncRail();
      });
    };
    if (productionStyle) {
      rail?.addEventListener('scroll', fromRail);
      table.on('tableBuilt', () => {
        holder = ref.current?.querySelector('.tabulator-tableholder');
        holder?.addEventListener('scroll', fromTable);
        autoSize();
      });
      ['dataProcessed', 'dataTreeRowExpanded', 'pageLoaded'].forEach(event => table.on(event, autoSize));
      ['renderComplete', 'columnResized'].forEach(event => table.on(event, syncRail));
    }
    if (selectable) {
      table.on('rowSelectionChanged', (data) => {
        if (restoring.current) return;
        onSelectedRef.current?.(data.map((r) => (rowKey ? r[rowKey] : r)));
      });
    }

    if (hasRowClick) {
      table.on('rowClick', (e, row) => {
        // 칸 안의 버튼·링크·입력을 누른 것은 그 요소의 몫입니다 — 행 상세까지 함께 열지 않습니다
        if (e?.target?.closest?.('button, a, input, select, textarea')) return;
        onRowClickRef.current?.(row.getData(), e);
      });
    }

    instance.current = table;
    if (instanceRef) instanceRef.current = table;

    // 내용 높이는 포털이 채워진 결과이므로 redraw의 입력으로 쓰지 않습니다.
    // 높이 변화 → 강제 redraw → 빈 포털 → 높이 변화의 반복을 막습니다.
    let ro = null;
    let raf = 0;
    let built = false;
    table.on('tableBuilt', () => { built = true; });
    if (typeof ResizeObserver !== 'undefined' && ref.current) {
      let lastW;
      let lastH;
      ro = new ResizeObserver((entries) => {
        const rect = entries[0]?.contentRect;
        if (!rect) return;
        const w = Math.round(rect.width);
        const h = Math.round(rect.height);
        const changed = w !== lastW || (height && h !== lastH);
        lastW = w;
        lastH = h;
        if (!changed || !w || !built) return;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          // 강제 redraw는 formatter/포털과 스크롤 위치를 초기화합니다.
          table.redraw();
        });
      });
      ro.observe(ref.current);
    }
    return () => {
      if (ro) ro.disconnect();
      ref.current?.removeEventListener('input', applyHeaderInput);
      ref.current?.removeEventListener('compositionend', applyHeaderInput);
      cancelAnimationFrame(sizeFrame);
      cancelAnimationFrame(tooltipFrame);
      cancelAnimationFrame(railFrame);
      rail?.removeEventListener('scroll', fromRail);
      holder?.removeEventListener('scroll', fromTable);
      cancelAnimationFrame(raf);
      try {
        table.destroy();
      } catch {
        /* 이미 정리된 경우 */
      }
      instance.current = null;
      if (instanceRef) instanceRef.current = null;
    };
    // rows 는 일부러 뺐습니다 — 아래에서 갈아 끼웁니다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, height, groupBy, groupHeader, groupStartOpen, emptyText, isDark, selectable, rowKey, initialSort, hasRowClick, headerFilter, maxSelectable, productionStyle, treeChildIndent, dataTree, blockedKey]);

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
      /**
       * 갈아 끼우는 **동안 내내** 부모에게 알리지 않습니다
       *
       * `replaceData` 는 먼저 선택을 전부 풀고(빈 목록으로 한 번 알림) 그다음 새 행을 놓습니다.
       * 되살리는 순간만 막으면 그 "전부 풀림" 이 부모에게 그대로 전해져, 검색으로 걸러진
       * 행의 선택이 지워집니다 — 205종을 고른 뒤 검색하면 191종으로 줄었습니다.
       */
      restoring.current = true;
      table.replaceData(rows).then(() => {
        if (!selectable || !rowKey) return;
        const keep = new Set(selectedRef.current || []);
        if (!keep.size) return;
        table.getRows().forEach((r) => {
          if (keep.has(r.getData()[rowKey])) r.select();
        });
      }).catch(() => { /* 표가 이미 정리된 경우 */ })
        .finally(() => { restoring.current = false; });
    };
    if (table.initialized) apply();
    else table.on('tableBuilt', apply);
  }, [rows, selectable, rowKey]);

  /**
   * "선택 해제"처럼 부모가 선택 목록을 직접 바꾼 경우에도 표 안의 체크 상태를 맞춥니다.
   * 기존에는 자료를 교체할 때만 되살려서, 버튼으로 빈 배열을 넣어도 Tabulator 행은 계속 선택돼 있었습니다.
   */
  useEffect(() => {
    const table = instance.current;
    if (!table || !selectable || !rowKey) return;
    restoring.current = true;
    try {
      table.deselectRow();
      const keep = new Set(selected || []);
      if (keep.size) {
        table.getRows().forEach((row) => {
          if (keep.has(row.getData()[rowKey])) row.select();
        });
      }
    } catch {
      /* 표가 정리되는 중에는 동기화하지 않습니다 */
    } finally {
      restoring.current = false;
    }
  }, [selected, selectable, rowKey]);

  useEffect(() => {
    const table = instance.current;
    if (!table || !headerFilters) return;
    try {
      table.clearHeaderFilter();
      Object.entries(headerFilters).forEach(([field, value]) => {
        if (value !== null && value !== undefined && String(value) !== '') table.setHeaderFilter(field, 'like', value);
      });
    } catch {
      /* 표가 정리된 중에는 적용하지 않습니다 */
    }
  }, [headerFilters]);

  return (
    <View style={[{ minWidth: 0, width: '100%', maxWidth: '100%' }, style]} nativeID={`grid_${id}`}>
      <style>{`
        #grid_${id} .tabulator {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          background: ${c.card};
          border: 1px solid ${theme.divider};
          border-radius: 16px;
          font-size:16.5px;
          font-weight: 500;
        }
        #grid_${id} .tabulator .tabulator-header {
          background: ${c.headBg};
          border-bottom: 1px solid ${c.border};
        }
        #grid_${id} .tabulator .tabulator-header .tabulator-col {
          background: transparent;
          border-right: ${bordered ? `1px solid ${c.border}` : '0'};
        }
        /* 얼린 열(frozen) — 배경을 채우지 않으면 밑으로 지나가는 본문 글자가 비칩니다.
           행 배경을 물려받게 두면 hover 색도 함께 따라옵니다. */
        /* 이 표는 행 배경이 투명입니다(흰색은 카드가 냅니다). 그래서 얼린 칸에 inherit 를 주면
           투명으로 풀려 밑으로 지나가는 글자가 그대로 비칩니다 — 실제 색을 박아 둡니다. */
        #grid_${id} .tabulator .tabulator-row .tabulator-cell.tabulator-frozen {
          background: ${color.card};
          /* 흐르는 칸이 얼린 칸 위에 그려지지 않도록 */
          z-index: 3;
        }
        #grid_${id} .tabulator .tabulator-row:not(.tabulator-tree-level-0)[class*="tabulator-tree-level-"] .tabulator-cell.tabulator-frozen {
          background: ${c.groupBg};
        }
        #grid_${id} .tabulator .tabulator-row:hover .tabulator-cell.tabulator-frozen { background: ${c.hover}; }
        #grid_${id} .tabulator .tabulator-header .tabulator-col.tabulator-frozen { background: ${c.headBg}; z-index: 4; }
        /* 얼린 쪽과 흐르는 쪽의 경계 — 여기서 잘렸다는 표시 */
        #grid_${id} .tabulator .tabulator-frozen.tabulator-frozen-left { border-right: 1px solid ${c.border}; }
        #grid_${id} .tabulator .tabulator-frozen.tabulator-frozen-right { border-left: 1px solid ${c.border}; }

        /* 머리글 그룹 — 묶음 제목은 가운데, 그 아래 실제 열이 붙습니다 */
        #grid_${id} .tabulator .tabulator-header .tabulator-col.tabulator-col-group > .tabulator-col-content .tabulator-col-title {
          text-align: center;
          color: ${c.text};
          font-weight: 600;
        }
        #grid_${id} .tabulator .tabulator-header .tabulator-col.tabulator-col-group .tabulator-col-group-cols {
          border-top: 1px solid ${c.border};
        }
        #grid_${id} .tabulator .tabulator-header .tabulator-col-title {
          color: ${c.headText};
          font-weight: 600;
          font-size:15px;
          letter-spacing: 0.22px;
          padding: 10px 12px;
          white-space: normal;
        }
        #grid_${id} .tabulator .tabulator-header .tabulator-header-filter {
          padding: 0 8px 8px;
        }
        #grid_${id} .tabulator .tabulator-header .tabulator-header-filter input {
          width: 100%;
          height: 28px;
          padding: 0 8px;
          color: ${c.text};
          background: ${alpha('foreground', 0.03)};
          border: 1px solid ${c.border};
          border-radius: 8px;
          font-size:15px;
          outline: none;
        }
        #grid_${id} .tabulator .tabulator-header .tabulator-header-filter input:focus {
          border-color: ${c.accent};
          box-shadow: 0 0 0 2px ${c.focusRing};
        }
        /* Tabulator 기본 CSS 의 흰 표 배경·짝수행 회색을 지웁니다 — 캔버스가 그대로 비치게 */
        #grid_${id} .tabulator .tabulator-tableholder {
          overflow-x: auto !important;
          touch-action: pan-x pan-y;
          overscroll-behavior-x: contain;
        }
        #grid_${id} .tabulator .tabulator-tableholder,
        #grid_${id} .tabulator .tabulator-tableholder .tabulator-table { background: transparent; color: ${c.text}; }
        #grid_${id} .tabulator .tabulator-row,
        #grid_${id} .tabulator .tabulator-row.tabulator-row-even,
        #grid_${id} .tabulator .tabulator-row.tabulator-row-odd {
          background: ${c.card};
          border-bottom: 1px solid ${c.rowBorder};
        }
        #grid_${id} .tabulator .tabulator-header .tabulator-col.tabulator-sortable:hover { background: ${c.hover}; }
        #grid_${id} .tabulator .tabulator-header .tabulator-col.tabulator-sortable[aria-sort="ascending"],
        #grid_${id} .tabulator .tabulator-header .tabulator-col.tabulator-sortable[aria-sort="descending"] { background: transparent; }
        #grid_${id} .tabulator .tabulator-header .tabulator-col .tabulator-col-content .tabulator-col-sorter { color: ${c.muted}; }
        #grid_${id} .tabulator .tabulator-footer { background: transparent; border-top: 1px solid ${c.border}; color: ${c.muted}; }
        /* 쪽 이동 — 표 아래 가운데. 지금 쪽만 잉크색으로 채웁니다 */
        #grid_${id} .tabulator .tabulator-footer .tabulator-paginator { color: ${c.muted}; font-size: 15px; padding: 6px 10px; }
        #grid_${id} .tabulator .tabulator-footer .tabulator-page {
          background: transparent; border: 1px solid ${c.border}; border-radius: 8px;
          color: ${c.text}; font-family: inherit; font-size: 15px; font-weight: 500;
          margin: 0 2px; padding: 3px 9px;
        }
        #grid_${id} .tabulator .tabulator-footer .tabulator-page:hover:not(.active):not(:disabled) { background: ${c.hover}; }
        #grid_${id} .tabulator .tabulator-footer .tabulator-page.active {
          background: ${color.primary}; border-color: ${color.primary}; color: ${color.primaryForeground}; font-weight: 600;
        }
        #grid_${id} .tabulator .tabulator-footer .tabulator-page:disabled { opacity: 0.4; }
        #grid_${id} .tabulator .tabulator-footer .tabulator-page-size {
          background: transparent; border: 1px solid ${c.border}; border-radius: 8px;
          color: ${c.text}; font-family: inherit; font-size: 15px; padding: 3px 6px; margin: 0 6px;
        }
        #grid_${id} .dw-tree-toggle {
          display:inline-flex; align-items:center; justify-content:center;
          width:26px; height:26px; padding:0; margin-right:8px;
          border:1px solid ${c.muted}; border-radius:6px;
          color:${c.text}; background:${color.card}; font-family:inherit; font-weight:600;
          font-size:20px; line-height:1; cursor:pointer; vertical-align:middle;
        }
        #grid_${id} .dw-tree-toggle:hover, #grid_${id} .dw-tree-toggle:focus-visible {
          border-color:${color.primary}; outline:2px solid ${color.primary}; outline-offset:1px;
        }
        #grid_${id} .tabulator .tabulator-cell[tabulator-field="outline"] {
          padding:12px 8px !important; position:relative;
        }
        ${[1,2,3].map(depth => `
          #grid_${id} .tabulator-row.tabulator-tree-level-${depth} .tabulator-cell[tabulator-field="outline"] {
            padding-left:${8 + depth * 14}px !important;
            background-image:repeating-linear-gradient(to right, ${c.border} 0px, ${c.border} 1px, transparent 1px, transparent 14px);
            background-size:${depth * 14}px 100%; background-position:8px 0; background-repeat:no-repeat;
          }
        `).join('')}
        /* 트리 펼침 단추 — 이름 앞에 붙는 작은 삼각형 */
        #grid_${id} .tabulator .tabulator-cell .tabulator-data-tree-control {
          border-color: ${c.muted}; margin-right: 7px;
        }
        #grid_${id} .tabulator .tabulator-cell .tabulator-data-tree-control:hover { border-color: ${color.primary}; }
        #grid_${id} .tabulator .tabulator-cell .tabulator-data-tree-control .tabulator-data-tree-control-collapse,
        #grid_${id} .tabulator .tabulator-cell .tabulator-data-tree-control .tabulator-data-tree-control-expand { background: ${c.muted}; }
        #grid_${id} .tabulator .tabulator-cell .tabulator-data-tree-control:hover .tabulator-data-tree-control-collapse,
        #grid_${id} .tabulator .tabulator-cell .tabulator-data-tree-control:hover .tabulator-data-tree-control-expand { background: ${color.primary}; }
        /* 자식 행은 살짝 가라앉혀 부모와 갈립니다.
           Tabulator 6 은 깊이를 속성이 아니라 클래스로 답니다 — .tabulator-tree-level-N */
        #grid_${id} .tabulator .tabulator-row:not(.tabulator-tree-level-0)[class*="tabulator-tree-level-"] {
          background: ${c.groupBg};
        }
        #grid_${id} .tabulator .tabulator-row:not(.tabulator-tree-level-0)[class*="tabulator-tree-level-"]:hover {
          background: ${c.hover};
        }
        #grid_${id} .tabulator .tabulator-placeholder { background: transparent; }
        #grid_${id} .tabulator .tabulator-placeholder .tabulator-placeholder-contents { color: ${c.muted}; font-size:16.5px; }
        #grid_${id} .tabulator .tabulator-row:hover { background: ${c.hover}; }
        #grid_${id} .tabulator .tabulator-cell {
          color: ${c.text};
          padding: 10px 12px;
          border-right: ${bordered ? `1px solid ${c.rowBorder}` : '0'};
          white-space: normal;
          line-height: 1.55;
          vertical-align: top;
        }
        #grid_${id} .tabulator .tabulator-row.tabulator-group {
          background: ${c.groupBg};
          border-bottom: 1px solid ${c.border};
          font-weight: 500;
          font-size:16.5px;
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
        /* 한 줄 셀 — 넘치면 말줄임 */
        #grid_${id} .tabulator .nowrap { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        /* React 포털 셀 */
        #grid_${id} .tabulator .ax-cell { display: block; width: 100%; }
        #grid_${id} .tabulator .muted { color: ${c.muted}; }
        /* 칩 목록(유사어 등) — 칸 안에서 줄바꿈되는 캡슐 묶음. 내 것은 파란 테두리 + × 삭제 */
        #grid_${id} .tabulator .chips { display: flex; flex-wrap: wrap; gap: 5px; padding: 2px 0; }
        #grid_${id} .tabulator .chips .tag { white-space: nowrap; }
        #grid_${id} .tabulator .chips .tag small { margin-left: 4px; font-size:14px; font-weight: 500; }
        #grid_${id} .tabulator .chip-mine { cursor: pointer; }
        #grid_${id} .tabulator .chip-x { margin-left: 4px; padding: 0 3px; font-weight: 600; color: ${c.muted}; cursor: pointer; }
        #grid_${id} .tabulator .chip-x:hover { color: ${c.text}; }
        #grid_${id} .tabulator .tbtn-ghost { border-color: transparent; background: transparent; }
        #grid_${id} .tabulator .tbtn + .tbtn { margin-left: 4px; }
        #grid_${id} .tabulator .quote { color: ${c.muted}; font-style: italic; }
        #grid_${id} .tabulator .strong { font-weight: 500; color: ${c.text}; }
        /* 한 칸에 문장이 여럿일 때 — 줄 사이를 벌려 어디서 끊기는지 보이게 합니다 */
        #grid_${id} .tabulator .li + .li { margin-top: 7px; padding-top: 7px; border-top: 1px dashed ${c.rowBorder}; }
        /* 고른 행 — 어두운 화면에서도 갈리게 */
        #grid_${id} .tabulator .tabulator-row.tabulator-selected,
        #grid_${id} .tabulator .tabulator-row.tabulator-selected:hover { background: ${c.selected}; }
        #grid_${id} .tabulator input[type="checkbox"] { width: 15px; height: 15px; cursor: pointer; accent-color: ${c.accent}; }
        /*
          열 너비 손잡이는 머리글에만 둡니다.
          행에도 붙어 나오는데, 선택 칸처럼 좁고 가운데 정렬된 칸에서는 점 하나가 찍힌 것처럼 보입니다.
        */
        #grid_${id} .tabulator .tabulator-row .tabulator-col-resize-handle { display: none; }
        ${hasRowClick ? `#grid_${id} .tabulator .tabulator-row { cursor: pointer; }` : ''}
        /* 고정폭 글꼴 — ID·테이블명처럼 자릿수를 맞춰 읽는 칸 */
        #grid_${id} .tabulator .mono { font-family: ${MONO_FAMILY}; font-size:16px; }
        /*
          칸 안의 배지 — 화면의 \`Badge\` 와 같은 색·모양입니다.
          formatter 가 HTML 을 돌려주는 자리라 RN 컴포넌트를 못 쓰므로 클래스로 둡니다.
        */
        #grid_${id} .tabulator .tag {
          display: inline-flex; align-items: center; vertical-align: middle;
          padding: 1px 8px; border-radius: 99px; border: 1px solid rgba(0,0,0,0.07);
          background: #fff; color: ${color.secondaryForeground};
          font-size:15px; font-weight: 500; line-height: 16px; white-space: nowrap;
        }
        #grid_${id} .tabulator .tag-green { background: ${color.successTint}; border-color: transparent; color: ${color.success}; }
        #grid_${id} .tabulator .tag-red { background: ${alpha('destructive', 0.1)}; border-color: transparent; color: ${color.destructive}; }
        #grid_${id} .tabulator .tag-amber { background: ${alpha('warning', 0.18)}; border-color: transparent; color: ${color.warningText}; }
        #grid_${id} .tabulator .tag-blue { background: ${alpha('info', 0.08)}; border-color: transparent; color: ${color.info}; }
        /* 칸 안의 작은 버튼 — 화면의 \`Button size="sm"\` 에 맞춘 모양. 동작은 열의 cellClick 에서 받습니다 */
        #grid_${id} .tabulator .tbtn {
          font: inherit; font-size:16px; font-weight: 500; line-height: 18px;
          padding: 3px 11px; border-radius: 10px; border: 1px solid rgba(0,0,0,0.06);
          background: #fff; color: ${c.text}; cursor: pointer; white-space: nowrap;
        }
        #grid_${id} .tabulator .tbtn:hover { background: ${c.hover}; }
        #grid_${id} .tabulator .tbtn-primary { background: ${color.primary}; border-color: ${color.primary}; color: ${color.primaryForeground}; font-weight: 600; }
        /* 칸 안의 비중 막대 — .bar-cell > .bar-track > .bar-fill + .bar-num */
        #grid_${id} .tabulator .bar-cell { display: flex; align-items: center; gap: 8px; width: 100%; }
        #grid_${id} .tabulator .bar-track {
          flex: 1; min-width: 24px; height: 6px; border-radius: 99px;
          background: ${alpha('foreground', 0.08)}; overflow: hidden;
        }
        #grid_${id} .tabulator .bar-fill { height: 100%; border-radius: 99px; background: ${color.primary}; }
        #grid_${id} .tabulator .bar-num { flex: none; font-size: 15px; color: ${c.text}; }
        #grid_${id} .tabulator .tbtn-primary:hover { opacity: 0.9; background: ${color.primary}; }

        ${bordered ? `
          #grid_${id} .tabulator .tabulator-header .tabulator-col-resize-handle { width:10px; margin-left:-5px; margin-right:-5px; cursor:col-resize; background:linear-gradient(to right, transparent 4px, ${theme.hairlineStrong} 4px, ${theme.hairlineStrong} 6px, transparent 6px); }
          #grid_${id} .tabulator .tabulator-header .tabulator-col-resize-handle:hover { background:${color.primary}; }
        ` : ''}
        ${productionStyle ? `
          #grid_${id} .tabulator { font-size:17px; font-weight:400; }
          #grid_${id} .tabulator .tabulator-header .tabulator-col { padding:11px 16px; border-right:1px solid ${theme.hairlineStrong}; }
          #grid_${id} .tabulator .tabulator-col-content { padding:0; }
          #grid_${id} .tabulator .tabulator-col-title { padding:0; white-space:nowrap; }
          #grid_${id} .tabulator .tabulator-header-filter { padding:0; margin-top:6px; }
          #grid_${id} .tabulator .tabulator-header-filter input { font-size:15.5px; }
          #grid_${id} .tabulator .tabulator-row .tabulator-cell { padding:12px 16px; white-space:nowrap; border-right:1px solid ${theme.hairlineStrong}; font-variant-numeric:tabular-nums; }
          #grid_${id} .tabulator .tabulator-header .tabulator-col-resize-handle { width:10px; margin-left:-5px; margin-right:-5px; cursor:col-resize; background:linear-gradient(to right, transparent 4px, ${theme.hairlineStrong} 4px, ${theme.hairlineStrong} 6px, transparent 6px); }
          #grid_${id} .tabulator .tabulator-header .tabulator-col-resize-handle:hover { background:${color.primary}; }
          #grid_${id} .tabulator .tabulator-data-tree-control { border-radius:99px; width:17px; height:17px; margin-right:7px; }
          #grid_${id} .tabulator .tabulator-footer { background:${c.headBg}; padding:10px 16px; }
          #grid_${id} .tabulator .tabulator-page { border-radius:99px; font-size:16px; }
          #grid_${id} .tabulator .tabulator-page.active { background:${color.primary}; color:${color.primaryForeground}; }
        ` : ''}
      `}</style>
      {productionStyle && <>
        <div style={{ fontSize:14, color:c.muted, marginBottom:6 }}>열 너비는 내용에 맞춰 자동 조정됩니다. 경계를 드래그해 조절하거나 가로 스크롤로 오른쪽 열을 확인하세요.</div>
        <div ref={railRef} role="region" aria-label="표 가로 스크롤" tabIndex={0} style={{ width:'100%', overflowX:'scroll', height:18, marginBottom:8, touchAction:'pan-x pan-y' }}>
          <div ref={railWidthRef} style={{ height:1 }} />
        </div>
      </>}
      <div ref={ref} style={{ width: '100%', minWidth: 0 }} />
    </View>
  );
}
