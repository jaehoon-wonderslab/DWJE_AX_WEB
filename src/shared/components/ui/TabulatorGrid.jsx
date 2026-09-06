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
}) {
  const ref = useRef(null);
  const instance = useRef(null);
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
  };

  useEffect(() => {
    if (!ref.current) return undefined;

    const table = new Tabulator(ref.current, {
      data: rows,
      columns,
      layout: 'fitColumns',
      responsiveLayout: false,
      placeholder: emptyText,
      height: height || undefined,
      // 셀 안에서 줄이 바뀌므로 행 높이를 내용에 맞춥니다
      variableHeight: true,
      ...(groupBy
        ? {
            groupBy,
            groupStartOpen,
            groupHeader: groupHeader || ((value, count) => `${value} <span style="color:${c.muted}">· ${count}건</span>`),
          }
        : null),
    });

    instance.current = table;
    return () => {
      try {
        table.destroy();
      } catch {
        /* 이미 정리된 경우 */
      }
      instance.current = null;
    };
  }, [columns, rows, height, groupBy, groupHeader, groupStartOpen, emptyText, isDark]);

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
      `}</style>
      <div ref={ref} />
    </View>
  );
}
