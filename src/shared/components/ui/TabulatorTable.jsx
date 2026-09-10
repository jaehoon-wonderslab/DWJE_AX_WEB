/**
 * [Component] Tabulator 6.x 기반 데이터 테이블 (Shadcn UI 테마)
 *
 * https://www.tabulator.info/docs/6.x/
 * - Tabulator 6.x 풀 번들 (TabulatorFull) 연동
 * - Shadcn UI 컬러 컨셉 및 모던 미니멀 디자인 (Slate / Zinc 기반)
 * - 행 Hover 하이라이트 (bg-muted/50)
 * - fitColumns 기반 반응형 100% 카드 폭 레이아웃
 * - 숫자 정렬 (tabular-nums) 및 맞춤형 포맷터
 */
import React, { useEffect, useId, useRef } from 'react';
import { View } from 'react-native';
import { TabulatorFull as Tabulator } from 'tabulator-tables';
import 'tabulator-tables/dist/css/tabulator.min.css';
import { useTheme } from '@shared/theme/useTheme';
import { comma, fixed, minutesText } from '@shared/utils/formatUtil';

export default function TabulatorTable({
  rows = [],
  emptyText = '해당 기간의 실적이 없습니다.',
  style,
}) {
  const tableContainerRef = useRef(null);
  const tabulatorInstanceRef = useRef(null);
  const theme = useTheme();
  const tableId = useId().replace(/:/g, '_');

  // 테마 토큰에서 표 색을 뽑습니다 (헤어라인·틴트 규칙)
  const isDark = theme.isDark;
  const { alpha } = theme;
  const colors = {
    bg: 'transparent',
    card: 'transparent',
    border: theme.divider,
    headerBg: theme.surface,
    headerText: theme.color.mutedForeground,
    rowText: theme.color.foreground,
    rowBorder: theme.divider,
    rowHover: theme.surface,
    primary: theme.color.primary,
    mutedText: theme.color.mutedForeground,
    danger: theme.color.destructive,
    info: theme.color.info,
    warn: theme.color.warningText,
    violet: theme.color.primary,
    chipBg: alpha('foreground', 0.06),
    chipBorder: theme.hairlineStrong,
    infoBg: alpha('info', 0.14),
    warnBg: alpha('warning', 0.16),
    violetBg: alpha('primary', 0.16),
    subtle: alpha('foreground', 0.04),
  };

  // 포맷터 정의
  const pct = (v) => (v === null || v === undefined || v === '' ? '—' : `${fixed(v)} %`);
  const mins = (v) => (v === null || v === undefined || v === '' ? '—' : minutesText(v));

  const isBuiltRef = useRef(false);

  useEffect(() => {
    if (!tableContainerRef.current) return;
    isBuiltRef.current = false;

    const getSortField = (s) => (typeof s.column === 'string' ? s.column : (s.column?.getField ? s.column.getField() : s.field));

    // 다중 컬럼 정렬 토글 핸들러 (Shift 키 없이도 복수 컬럼 동시 정렬 지원)
    const handleSortToggle = (field) => {
      const tbl = tabulatorInstanceRef.current || table;
      if (!field || !tbl) return;

      const rawSorters = tbl.getSorters() || [];
      const current = rawSorters
        .map((s) => ({
          column: getSortField(s),
          dir: s.dir,
        }))
        .filter((s) => !!s.column);

      const idx = current.findIndex((s) => s.column === field);

      if (idx < 0) {
        // 1회 클릭: desc 추가 (투입/불량 등 큰 값 우선)
        current.push({ column: field, dir: 'desc' });
      } else if (current[idx].dir === 'desc') {
        // 2회 클릭: asc로 변경
        current[idx].dir = 'asc';
      } else {
        // 3회 클릭: 해당 컬럼 정렬 해제
        current.splice(idx, 1);
      }

      if (current.length > 0) {
        tbl.setSort(current);
      } else {
        tbl.clearSort();
      }
      updateSortHeadersUI(tbl, tbl.getSorters());
    };

    // 다중 컬럼 정렬 헤더 UI 갱신 및 네이티브 클릭 리스너 연결
    const updateSortHeadersUI = (tbl, sorters = []) => {
      if (!tbl) return;
      try {
        const cols = tbl.getColumns();
        const activeSorters = (sorters || [])
          .map((s) => ({
            field: getSortField(s),
            dir: s.dir,
          }))
          .filter((s) => !!s.field);

        cols.forEach((col) => {
          const f = col.getField();
          const el = col.getElement();
          if (!el) return;

          if (el && !el.dataset.sortAttached) {
            el.dataset.sortAttached = 'true';
            el.addEventListener('click', (e) => {
              if (e.target.tagName === 'INPUT' || e.target.closest('.tabulator-header-filter')) {
                return;
              }
              e.stopPropagation();
              handleSortToggle(f);
            });
          }

          const sIdx = activeSorters.findIndex((s) => s.field === f);
          const sInfo = sIdx >= 0 ? activeSorters[sIdx] : null;

          const titleEl = el.querySelector('.tabulator-col-title');
          let indicator = el.querySelector('.custom-sort-indicator');
          if (!indicator && titleEl) {
            indicator = document.createElement('span');
            indicator.className = 'custom-sort-indicator';
            indicator.style.cssText = 'display: inline-flex; align-items: center; gap: 3px; margin-left: 5px; vertical-align: middle; cursor: pointer;';
            titleEl.appendChild(indicator);
          }

          if (indicator) {
            if (sInfo) {
              const arrow = sInfo.dir === 'asc' ? '▲' : '▼';
              const rankBadge = activeSorters.length > 1
                ? `<span style="font-size:13px; font-weight: 600; background: ${colors.primary}; color: #ffffff; border-radius: 9px; min-width: 13px; height: 13px; padding: 0 3px; display: inline-flex; align-items: center; justify-content: center; line-height: 1;">${sIdx + 1}</span>`
                : '';
              indicator.innerHTML = `<span style="color: ${colors.primary}; font-weight: 600; font-size:14px;">${arrow}</span>${rankBadge}`;
              el.setAttribute('aria-sort', sInfo.dir === 'asc' ? 'ascending' : 'descending');
            } else {
              indicator.innerHTML = `<span style="color: ${colors.mutedText}; opacity: 0.35; font-size:13.5px;">▲▼</span>`;
              el.setAttribute('aria-sort', 'none');
            }
          }
        });
      } catch (err) {
        console.error('[updateSortHeadersUI error]', err);
      }
    };

    // Tabulator 6.x 초기화 (내장 페이징 및 Tree 뷰 활성화)
    const table = new Tabulator(tableContainerRef.current, {
      data: rows,
      layout: 'fitColumns',
      responsiveLayout: false,
      placeholder: emptyText,
      dataTree: true,
      dataTreeElementColumn: 'date',
      dataTreeStartExpanded: false,
      dataTreeChildField: '_children',
      dataTreeChildIndent: 16,
      dataTreeFilter: true, // 자식 행(제품·설비)이 검색 조건에 매칭되면 상위 부모 행도 함께 유지
      headerSort: false, // 커스텀 다중 정렬(Multi-Column Sort) 사용
      rowFormatter: function(row) {
        const data = row.getData();
        // 마지막 depth (3depth) 또는 자식이 없는 행은 +/- 컨트롤 숨김
        if (data.isGrandChild || data.depth === 3 || (!data._children || data._children.length === 0)) {
          const el = row.getElement();
          const treeCtrl = el.querySelector('.tabulator-data-tree-control');
          if (treeCtrl) {
            treeCtrl.style.display = 'none';
          }
        }
      },
      pagination: true,
      paginationMode: 'local',
      paginationSize: 25,
      paginationSizeSelector: [10, 25, 50, 100],
      paginationCounter: function(pageSize, currentRow, currentPage, totalRows, totalPages) {
        if (!totalRows) return '';
        const fromRow = currentRow;
        const toRow = Math.min(currentRow + pageSize - 1, totalRows);
        return `전체 ${totalRows.toLocaleString()}건 중 ${fromRow}–${toRow}`;
      },
      locale: 'ko',
      langs: {
        ko: {
          pagination: {
            page_size: '표시 건수',
            first: '처음',
            first_title: '첫 페이지',
            last: '마지막',
            last_title: '마지막 페이지',
            prev: '이전',
            prev_title: '이전 페이지',
            next: '다음',
            next_title: '다음 페이지',
            all: '전체',
          },
        },
      },
      columns: [
        {
          title: '일자',
          field: 'date',
          width: 175,
          minWidth: 165,
          headerHozAlign: 'left',
          hozAlign: 'left',
          headerSort: false,
          sorter: 'string',
          headerFilter: 'input',
          headerFilterPlaceholder: '일자 검색',
          headerFilterLiveFilter: true,
          headerFilterFunc: (headerValue, rowValue, rowData) => {
            if (!headerValue) return true;
            const q = String(headerValue).trim().toLowerCase();
            const date = String(rowData?.date || rowValue || '').toLowerCase();
            if (date.includes(q)) return true;
            if (Array.isArray(rowData?._children)) {
              return rowData._children.some((c) => {
                const cd = String(c.date || c.period || '').toLowerCase();
                return cd.includes(q);
              });
            }
            return false;
          },
          formatter: (cell) => {
            const rowData = cell.getRow().getData();
            const val = cell.getValue() || rowData.date || rowData.period || '—';
            if (rowData.isGrandChild || rowData.depth === 3) {
              return `<span data-depth="3" style="color: ${colors.mutedText}; font-size:15px; opacity: 0.45;">↳ ↳</span>`;
            }
            if (rowData.isChild || rowData.depth === 2) {
              return `<span style="display: inline-flex; align-items: center; gap: 4px; font-size:15.5px; color: ${colors.mutedText};">
                <span style="opacity: 0.65;">↳</span>
                <span style="font-variant-numeric: tabular-nums; font-weight: 400;">${val}</span>
              </span>`;
            }
            return `<span style="font-weight: 500; font-size:16.5px; color: ${colors.rowText}; font-variant-numeric: tabular-nums;">${val}</span>`;
          },
        },
        {
          title: '제품명',
          field: 'productNm',
          width: 140,
          minWidth: 125,
          headerHozAlign: 'left',
          hozAlign: 'left',
          headerSort: false,
          sorter: 'string',
          headerFilter: 'input',
          headerFilterPlaceholder: '제품명 검색',
          headerFilterLiveFilter: true,
          headerFilterFunc: (headerValue, rowValue, rowData) => {
            if (!headerValue) return true;
            const q = String(headerValue).trim().toLowerCase();

            // Depth 2 (제품) 또는 Depth 3 (제품 하위 공정/설비): 해당 행의 제품명이 일치하면 표시
            const prod = String(rowData?.productNm || rowData?.parentProductNm || (rowData?.depth === 2 ? rowData?.period : '') || '').toLowerCase();
            if (prod && prod.includes(q)) return true;

            // Depth 1 (일자 부모 행): 하위 제품 중 검색어를 포함하는 것이 있으면 부모 행 유지
            if (Array.isArray(rowData?._children)) {
              return rowData._children.some((child) => {
                const cp = String(child.productNm || child.parentProductNm || child.period || '').toLowerCase();
                return cp.includes(q);
              });
            }

            return false;
          },
          formatter: (cell) => {
            const rowData = cell.getRow().getData();
            const val = cell.getValue() || rowData.productNm || '';
            if (rowData.isGrandChild || rowData.depth === 3) {
              const pName = val || rowData.parentProductNm || '';
              return `<span style="display: inline-flex; align-items: center; gap: 4px; color: ${colors.mutedText}; font-size:15px; opacity: 0.75;">
                <span>↳</span>
                <span style="font-weight: 500;">${pName || '—'}</span>
              </span>`;
            }
            if (rowData.isChild || rowData.depth === 2) {
              const displayVal = val || rowData.period || '기타';
              return `<span style="display: inline-flex; align-items: center; font-weight: 500; color: ${colors.rowText}; background: ${colors.chipBg}; padding: 2px 9px; border-radius: 99px; font-size:15.5px;">${displayVal}</span>`;
            }
            // Depth 1 (일자 행)
            const childCount = Array.isArray(rowData._children) ? rowData._children.length : 0;
            return `<span style="color: ${colors.mutedText}; font-size:15.5px; font-weight: 500;">전체 (${childCount ? `${childCount}개 품목` : '일자 합계'})</span>`;
          },
        },
        {
          title: '공장·공정·설비',
          field: 'facility',
          minWidth: 260,
          headerHozAlign: 'left',
          hozAlign: 'left',
          headerSort: false,
          sorter: 'string',
          headerFilter: 'input',
          headerFilterPlaceholder: '공장·공정·설비 검색',
          headerFilterLiveFilter: true,
          headerFilterFunc: (headerValue, rowValue, rowData) => {
            if (!headerValue) return true;
            const q = String(headerValue).trim().toLowerCase();

            // Depth 3: 설비명, 공정명, 공장명, facility 문자열 검색
            const fac = String(rowData?.facility || '').toLowerCase();
            const equip = String(rowData?.equipNm || rowData?.period || '').toLowerCase();
            const plant = String(rowData?.plantNm || '').toLowerCase();
            const proc = String(rowData?.processNm || '').toLowerCase();
            if (fac.includes(q) || equip.includes(q) || plant.includes(q) || proc.includes(q)) return true;

            // Depth 2: 하위 설비(자식) 중 검색어를 포함하는 것이 있으면 표시
            if (Array.isArray(rowData?._children)) {
              return rowData._children.some((child) => {
                const cf = String(child.facility || child.equipNm || child.period || '').toLowerCase();
                const cp = String(child.plantNm || '').toLowerCase();
                const cproc = String(child.processNm || '').toLowerCase();
                if (cf.includes(q) || cp.includes(q) || cproc.includes(q)) return true;
                // Depth 1인 경우 손자(설비)까지 탐색
                if (Array.isArray(child._children)) {
                  return child._children.some((gc) => {
                    const gf = String(gc.facility || gc.equipNm || gc.period || '').toLowerCase();
                    const gp = String(gc.plantNm || '').toLowerCase();
                    const gproc = String(gc.processNm || '').toLowerCase();
                    return gf.includes(q) || gp.includes(q) || gproc.includes(q);
                  });
                }
                return false;
              });
            }

            return false;
          },
          formatter: (cell) => {
            const rowData = cell.getRow().getData();
            if (rowData.isGrandChild || rowData.depth === 3) {
              const isPress = (rowData.processNm || '').includes('프레스');
              const tagColor = isPress ? colors.warn : colors.violet;
              const tagBg = isPress ? colors.warnBg : colors.violetBg;
              // 공장을 모르면 **칸을 아예 안 냅니다** — 없는 값을 '제1공장' 으로 채우던 자리입니다.
              // 작업장 이름에 공장이 적힌 곳만 서버가 채워 줍니다(2026-09-06 기준 620행 중 126행).
              const plantText = rowData.plantNm || '';
              const equipText = rowData.equipNm || rowData.period || '—';
              return `<span data-depth="3" style="display: inline-flex; align-items: center; gap: 5px; font-weight: 400; font-size:15.5px; color: ${colors.rowText};">
                ${plantText ? `<span style="font-weight: 500; color: ${colors.info}; background: ${colors.infoBg}; padding: 1px 7px; border-radius: 99px; font-size:14px;">${plantText}</span>` : ''}
                <span style="font-weight: 500; color: ${tagColor}; background: ${tagBg}; padding: 1px 7px; border-radius: 99px; font-size:14px;">${rowData.processNm || '공정'}</span>
                <span style="font-weight: 500;">${equipText}</span>
              </span>`;
            }
            if (rowData.isChild || rowData.depth === 2) {
              return `<span style="color: ${colors.mutedText}; font-size:15px; background: ${colors.subtle}; padding: 1px 8px; border-radius: 99px;">품목별 소계</span>`;
            }
            // Depth 1
            return `<span style="color: ${colors.mutedText}; font-size:15.5px;">—</span>`;
          },
        },
        {
          title: '투입',
          field: 'inputQty',
          minWidth: 85,
          headerHozAlign: 'right',
          hozAlign: 'right',
          headerSort: false,
          sorter: (a, b) => (Number(a) || 0) - (Number(b) || 0),
          headerFilter: 'input',
          headerFilterPlaceholder: '>=',
          headerFilterLiveFilter: true,
          headerFilterFunc: (headerValue, rowValue, rowData) => {
            if (!headerValue) return true;
            const target = Number(String(headerValue).replace(/,/g, ''));
            if (isNaN(target)) return true;
            if ((Number(rowValue) || 0) >= target) return true;
            if (Array.isArray(rowData?._children)) {
              return rowData._children.some((c) => {
                if ((Number(c.inputQty) || 0) >= target) return true;
                if (Array.isArray(c._children)) {
                  return c._children.some((gc) => (Number(gc.inputQty) || 0) >= target);
                }
                return false;
              });
            }
            return false;
          },
          formatter: (cell) => {
            const v = cell.getValue();
            return `<span>${v !== null && v !== undefined ? comma(v) : '—'}</span>`;
          },
        },
        {
          title: '양품',
          field: 'okQty',
          minWidth: 85,
          headerHozAlign: 'right',
          hozAlign: 'right',
          headerSort: false,
          sorter: (a, b) => (Number(a) || 0) - (Number(b) || 0),
          headerFilter: 'input',
          headerFilterPlaceholder: '>=',
          headerFilterLiveFilter: true,
          headerFilterFunc: (headerValue, rowValue, rowData) => {
            if (!headerValue) return true;
            const target = Number(String(headerValue).replace(/,/g, ''));
            if (isNaN(target)) return true;
            if ((Number(rowValue) || 0) >= target) return true;
            if (Array.isArray(rowData?._children)) {
              return rowData._children.some((c) => {
                if ((Number(c.okQty) || 0) >= target) return true;
                if (Array.isArray(c._children)) {
                  return c._children.some((gc) => (Number(gc.okQty) || 0) >= target);
                }
                return false;
              });
            }
            return false;
          },
          formatter: (cell) => {
            const v = cell.getValue();
            return `<span>${v !== null && v !== undefined ? comma(v) : '—'}</span>`;
          },
        },
        {
          title: '불량',
          field: 'ngQty',
          minWidth: 80,
          headerHozAlign: 'right',
          hozAlign: 'right',
          headerSort: false,
          sorter: (a, b) => (Number(a) || 0) - (Number(b) || 0),
          headerFilter: 'input',
          headerFilterPlaceholder: '>=',
          headerFilterLiveFilter: true,
          headerFilterFunc: (headerValue, rowValue, rowData) => {
            if (!headerValue) return true;
            const target = Number(String(headerValue).replace(/,/g, ''));
            if (isNaN(target)) return true;
            if ((Number(rowValue) || 0) >= target) return true;
            if (Array.isArray(rowData?._children)) {
              return rowData._children.some((c) => {
                if ((Number(c.ngQty) || 0) >= target) return true;
                if (Array.isArray(c._children)) {
                  return c._children.some((gc) => (Number(gc.ngQty) || 0) >= target);
                }
                return false;
              });
            }
            return false;
          },
          formatter: (cell) => {
            const v = cell.getValue();
            const isDefect = v !== null && v !== undefined && v > 0;
            return `<span style="${isDefect ? `color: ${colors.danger}; font-weight: 500;` : ''}">${v !== null && v !== undefined ? comma(v) : '—'}</span>`;
          },
        },
        {
          title: '불량률',
          field: 'defectRate',
          width: 95,
          minWidth: 90,
          headerHozAlign: 'right',
          hozAlign: 'right',
          headerSort: false,
          sorter: (a, b) => (Number(a) || 0) - (Number(b) || 0),
          headerFilter: 'input',
          headerFilterPlaceholder: '% >=',
          headerFilterLiveFilter: true,
          headerFilterFunc: (headerValue, rowValue, rowData) => {
            if (!headerValue) return true;
            const target = Number(String(headerValue).replace(/%/g, ''));
            if (isNaN(target)) return true;
            if ((Number(rowValue) || 0) >= target) return true;
            if (Array.isArray(rowData?._children)) {
              return rowData._children.some((c) => {
                if ((Number(c.defectRate) || 0) >= target) return true;
                if (Array.isArray(c._children)) {
                  return c._children.some((gc) => (Number(gc.defectRate) || 0) >= target);
                }
                return false;
              });
            }
            return false;
          },
          formatter: (cell) => {
            const v = cell.getValue();
            const isHigh = v !== null && v !== undefined && Number(v) >= 2.0;
            return `<span style="${isHigh ? `color: ${colors.danger}; font-weight: 500;` : ''}">${pct(v)}</span>`;
          },
        },
        {
          title: '가동률',
          field: 'uptimeRate',
          width: 95,
          minWidth: 90,
          headerHozAlign: 'right',
          hozAlign: 'right',
          headerSort: false,
          sorter: (a, b) => (Number(a) || 0) - (Number(b) || 0),
          formatter: (cell) => {
            const rowData = cell.getRow().getData();
            if (rowData.isChild || rowData.isGrandChild || rowData.depth > 1) return `<span style="color: ${colors.mutedText};">—</span>`;
            return `<span>${pct(cell.getValue())}</span>`;
          },
        },
        {
          title: '비가동 시간',
          field: 'downtimeMin',
          width: 110,
          minWidth: 100,
          headerHozAlign: 'right',
          hozAlign: 'right',
          headerSort: false,
          sorter: (a, b) => (Number(a) || 0) - (Number(b) || 0),
          formatter: (cell) => {
            const rowData = cell.getRow().getData();
            if (rowData.isChild || rowData.isGrandChild || rowData.depth > 1) return `<span style="color: ${colors.mutedText};">—</span>`;
            return `<span>${mins(cell.getValue())}</span>`;
          },
        },
      ],
    });

    table.on('sortChanged', (sorters) => {
      updateSortHeadersUI(table, sorters);
    });

    table.on('tableBuilt', () => {
      isBuiltRef.current = true;
      if (typeof window !== 'undefined') {
        window._dwje_tabulator = table;
      }
      updateSortHeadersUI(table, table.getSorters());
    });

    tabulatorInstanceRef.current = table;

    return () => {
      isBuiltRef.current = false;
      try {
        table.destroy();
      } catch (_) {}
      tabulatorInstanceRef.current = null;
    };
  }, []);

  // 데이터 변경 시 tableBuilt 이후에만 setData 반영
  useEffect(() => {
    if (tabulatorInstanceRef.current && isBuiltRef.current) {
      tabulatorInstanceRef.current.setData(rows);
    }
  }, [rows]);

  return (
    <View style={[{ width: '100%' }, style]}>
      {/* Shadcn UI 테마 CSS 주입 */}
      <style>{`
        .tabulator-shadcn-${tableId} {
          border: 1px solid ${theme.divider} !important;
          border-radius: 16px !important;
          background-color: ${colors.card} !important;
          font-family: inherit !important;
          font-size:17px !important;
          overflow: hidden !important;
          width: 100% !important;
        }
        .tabulator-shadcn-${tableId} .tabulator-header {
          background-color: ${colors.headerBg} !important;
          border-bottom: 1px solid ${colors.border} !important;
          color: ${colors.headerText} !important;
          font-weight: 600 !important;
          font-size:15px !important;
          letter-spacing: 0.22px !important;
          border-top: none !important;
        }
        .tabulator-shadcn-${tableId} .tabulator-header .tabulator-col {
          background-color: transparent !important;
          border-right: none !important;
          padding: 11px 16px !important;
          cursor: pointer !important;
          user-select: none !important;
          transition: background-color 0.15s ease !important;
        }
        .tabulator-shadcn-${tableId} .tabulator-header .tabulator-col:hover {
          background-color: ${colors.rowHover} !important;
        }
        .tabulator-shadcn-${tableId} .tabulator-header .tabulator-col .tabulator-header-filter {
          cursor: default !important;
        }
        /* 3depth(마지막 depth)의 +/- 트리 컨트롤 완전히 숨김 */
        .tabulator-shadcn-${tableId} .tabulator-row:has([data-depth="3"]) .tabulator-data-tree-control {
          display: none !important;
        }
        .tabulator-shadcn-${tableId} .tabulator-header .tabulator-col-content {
          padding: 0 !important;
        }
        .tabulator-shadcn-${tableId} .tabulator-header .tabulator-col .tabulator-header-filter {
          margin-top: 6px !important;
        }
        .tabulator-shadcn-${tableId} .tabulator-header .tabulator-col .tabulator-header-filter input {
          width: 100% !important;
          padding: 4px 8px !important;
          font-size:15.5px !important;
          font-family: inherit !important;
          border-radius: 8px !important;
          border: 1px solid ${colors.border} !important;
          background-color: ${alpha('foreground', 0.03)} !important;
          color: ${colors.rowText} !important;
          letter-spacing: 0 !important;
          font-weight: 500 !important;
          outline: none !important;
          box-sizing: border-box !important;
          transition: border-color 0.15s ease, box-shadow 0.15s ease !important;
        }
        .tabulator-shadcn-${tableId} .tabulator-header .tabulator-col .tabulator-header-filter input:focus {
          border-color: ${colors.primary} !important;
          box-shadow: 0 0 0 2px ${alpha('primary', 0.2)} !important;
        }
        .tabulator-shadcn-${tableId} .tabulator-header .tabulator-col .tabulator-header-filter input::placeholder {
          color: ${colors.mutedText} !important;
          font-size:15px !important;
        }
        .tabulator-shadcn-${tableId} .tabulator-header .tabulator-col-title {
          font-weight: 600 !important;
          color: ${colors.headerText} !important;
        }
        .tabulator-shadcn-${tableId} .tabulator-tableholder {
          overflow-x: auto !important;
          background-color: transparent !important;
        }
        /* Tabulator 기본 CSS 의 흰 표 배경·짝수행 회색을 지웁니다 — 캔버스가 그대로 비치게 */
        .tabulator-shadcn-${tableId} .tabulator-tableholder .tabulator-table {
          background-color: transparent !important;
          color: ${colors.rowText} !important;
        }
        .tabulator-shadcn-${tableId} .tabulator-row.tabulator-row-even,
        .tabulator-shadcn-${tableId} .tabulator-row.tabulator-row-odd {
          background-color: transparent !important;
        }
        .tabulator-shadcn-${tableId} .tabulator-header .tabulator-col.tabulator-sortable:hover,
        .tabulator-shadcn-${tableId} .tabulator-header .tabulator-col.tabulator-sortable[aria-sort="ascending"],
        .tabulator-shadcn-${tableId} .tabulator-header .tabulator-col.tabulator-sortable[aria-sort="descending"] {
          background-color: transparent !important;
        }
        .tabulator-shadcn-${tableId} .tabulator-header .tabulator-col.tabulator-sortable:hover {
          background-color: ${colors.rowHover} !important;
        }
        .tabulator-shadcn-${tableId} .tabulator-row {
          background-color: ${colors.card} !important;
          border-bottom: 1px solid ${colors.rowBorder} !important;
          min-height: 44px !important;
          color: ${colors.rowText} !important;
          transition: background-color 0.15s ease !important;
        }
        .tabulator-shadcn-${tableId} .tabulator-row:last-child {
          border-bottom: none !important;
        }
        .tabulator-shadcn-${tableId} .tabulator-row:hover {
          background-color: ${colors.rowHover} !important;
          cursor: default !important;
        }
        .tabulator-shadcn-${tableId} .tabulator-row .tabulator-cell {
          border-right: none !important;
          padding: 12px 16px !important;
          vertical-align: middle !important;
          font-variant-numeric: tabular-nums !important;
        }
        /* Tabulator Data Tree 토글 컨트롤 및 들여쓰기 선 */
        .tabulator-shadcn-${tableId} .tabulator-data-tree-control,
        .tabulator-shadcn-${tableId} .tabulator-tree-control {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 17px !important;
          height: 17px !important;
          margin-right: 7px !important;
          border-radius: 99px !important;
          border: 1px solid ${colors.border} !important;
          background-color: transparent !important;
          color: ${colors.headerText} !important;
          font-weight: 500 !important;
          font-size:15px !important;
          cursor: pointer !important;
          user-select: none !important;
          vertical-align: middle !important;
          transition: all 0.15s ease !important;
        }
        .tabulator-shadcn-${tableId} .tabulator-data-tree-control:hover,
        .tabulator-shadcn-${tableId} .tabulator-tree-control:hover {
          border-color: ${colors.primary} !important;
          color: ${colors.primary} !important;
          background-color: ${alpha('primary', 0.12)} !important;
        }
        .tabulator-shadcn-${tableId} .tabulator-data-tree-branch,
        .tabulator-shadcn-${tableId} .tabulator-tree-branch {
          border-color: ${colors.border} !important;
          margin-right: 4px !important;
        }
        .tabulator-shadcn-${tableId} .tabulator-placeholder {
          background-color: ${colors.card} !important;
          color: ${colors.mutedText} !important;
          padding: 40px !important;
          text-align: center !important;
          font-size:17px !important;
        }
        /* Tabulator 내장 푸터 & 페이징 컨트롤 (Shadcn UI 스타일) */
        .tabulator-shadcn-${tableId} .tabulator-footer {
          background-color: ${colors.headerBg} !important;
          border-top: 1px solid ${colors.border} !important;
          padding: 10px 16px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          flex-wrap: wrap !important;
          gap: 10px !important;
          font-family: inherit !important;
        }
        .tabulator-shadcn-${tableId} .tabulator-footer .tabulator-page-counter {
          color: ${colors.headerText} !important;
          font-size:16.5px !important;
          font-weight: 500 !important;
        }
        .tabulator-shadcn-${tableId} .tabulator-footer .tabulator-paginator {
          display: flex !important;
          align-items: center !important;
          gap: 4px !important;
          flex-wrap: wrap !important;
        }
        .tabulator-shadcn-${tableId} .tabulator-footer .tabulator-paginator label {
          font-size:16px !important;
          color: ${colors.headerText} !important;
          margin-right: 6px !important;
          margin-left: 8px !important;
        }
        .tabulator-shadcn-${tableId} .tabulator-footer .tabulator-page-size {
          border: 1px solid ${colors.border} !important;
          border-radius: 99px !important;
          padding: 4px 10px !important;
          background-color: transparent !important;
          color: ${colors.rowText} !important;
          font-size:16px !important;
          margin-right: 14px !important;
          outline: none !important;
          cursor: pointer !important;
        }
        .tabulator-shadcn-${tableId} .tabulator-footer .tabulator-page {
          border: 1px solid transparent !important;
          border-radius: 99px !important;
          background-color: transparent !important;
          color: ${colors.mutedText} !important;
          padding: 3px 8px !important;
          font-size:16px !important;
          font-weight: 400 !important;
          min-width: 28px !important;
          height: 28px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          margin: 0 1px !important;
          transition: all 0.15s ease !important;
          cursor: pointer !important;
        }
        .tabulator-shadcn-${tableId} .tabulator-footer .tabulator-page:hover:not(:disabled):not(.active) {
          background-color: ${colors.rowHover} !important;
          border-color: ${colors.border} !important;
        }
        .tabulator-shadcn-${tableId} .tabulator-footer .tabulator-page.active {
          background-color: ${theme.color.primary} !important;
          color: ${theme.color.primaryForeground} !important;
          border-color: ${theme.color.primary} !important;
          font-weight: 600 !important;
        }
        .tabulator-shadcn-${tableId} .tabulator-footer .tabulator-page:disabled {
          opacity: 0.35 !important;
          cursor: not-allowed !important;
        }
      `}</style>

      {/* Tabulator 마운트 컨테이너 */}
      <div
        ref={tableContainerRef}
        className={`tabulator-shadcn-${tableId}`}
        style={{ width: '100%' }}
      />
    </View>
  );
}
