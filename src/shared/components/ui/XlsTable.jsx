/**
 * 엑셀형 조밀 표 (보고서용)
 *
 * 아침회의 자료·출하계획처럼 열이 많고 셀 값이 짧은 보고서 표를 위한 컴포넌트입니다.
 * 셀마다 정상/주의/위험 배경색과 병합(colSpan)을 지원합니다.
 *
 * columns: [{ key, title, width, align, num }]
 * rows:    [{ cells: [{ v, tone, align, span, mono, bold }], tone, group }]
 *   · tone  — 'ok' | 'warn' | 'bad' | 'group' | 'total'
 *   · span  — 가로 병합 칸 수 (해당 칸이 오른쪽 칸들을 흡수)
 *   · faint — 근거가 약한 값(참고값에서 나온 계산 등)을 흐리게
 *   · node  — v 대신 넣는 요소. Text 로 감싸지 않으므로 마스킹 배지·입력칸처럼
 *             View 를 담는 칸에 씁니다 (v 와 같이 주면 node 가 이깁니다)
 *
 * 사용 예)
 *   <XlsTable columns={cols} rows={rows} headerRows={[[{v:'구분',rowSpan:2}, …]]} />
 */
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';

export default function XlsTable({ columns, rows, style, maxHeight, nativeID, footer }) {
  const s = useCommonStyles();
  const theme = useTheme();

  /** 열 정의로부터 셀 폭 스타일을 만듭니다 */
  const widthOf = (col, span = 1) => {
    if (!col) return { flex: 1 };
    if (col.width) {
      // 병합된 칸은 흡수한 열들의 폭을 합칩니다
      let w = 0;
      const start = columns.indexOf(col);
      for (let i = start; i < start + span && i < columns.length; i += 1) w += columns[i].width || 0;
      return { width: w, flexShrink: 0 };
    }
    return { flex: span };
  };

  const toneCell = (tone) => [
    tone === 'ok' && s.xlsOk,
    tone === 'warn' && s.xlsWarn,
    tone === 'bad' && s.xlsBad,
    tone === 'group' && s.xlsGroup,
    tone === 'head' && s.xlsHead,
  ];
  const toneText = (tone) => [
    tone === 'ok' && s.xlsOkText,
    tone === 'warn' && s.xlsWarnText,
    tone === 'bad' && s.xlsBadText,
    tone === 'group' && s.xlsGroupText,
    tone === 'head' && s.xlsHeadText,
  ];

  const totalWidth = columns.reduce((n, c) => n + (c.width || 0), 0);

  const content = (
    <View style={{ minWidth: totalWidth || undefined }} nativeID={nativeID}>
      {/* 머리글 */}
      <View style={s.xlsRow}>
        {columns.map((col) => (
          <View key={col.key} style={[s.xlsCell, s.xlsHead, widthOf(col)]}>
            <Text style={[s.xlsCellText, s.xlsHeadText, col.align === 'left' && s.xlsLeft]} numberOfLines={2}>
              {col.title}
            </Text>
          </View>
        ))}
      </View>

      {/* 본문 */}
      {rows.map((row, ri) => {
        let colIdx = 0;
        return (
          <View key={row.key || ri} style={[s.xlsRow, row.tone === 'total' && s.xlsTotal, row.tone === 'group' && s.xlsGroup]}>
            {row.cells.map((cell, ci) => {
              const col = columns[colIdx];
              const span = cell.span || 1;
              colIdx += span;
              // node 를 준 칸은 Text 로 감싸지 않습니다 (마스킹 배지·입력칸처럼 View 를 담는 칸)
              if (cell.node !== undefined && cell.node !== null) {
                return (
                  <View key={ci} style={[s.xlsCell, ...toneCell(cell.tone || row.tone), widthOf(col, span)]}>
                    {cell.node}
                  </View>
                );
              }
              return (
                <View key={ci} style={[s.xlsCell, ...toneCell(cell.tone || row.tone), widthOf(col, span)]}>
                  <Text
                    style={[
                      s.xlsCellText,
                      cell.align === 'left' && s.xlsLeft,
                      (cell.align === 'right' || cell.num) && s.xlsNum,
                      cell.bold && { fontWeight: '700' },
                      cell.faint && { opacity: 0.55 },
                      row.tone === 'total' && s.xlsTotalText,
                      ...toneText(cell.tone || row.tone),
                    ]}
                    numberOfLines={cell.wrap ? 0 : 1}
                  >
                    {cell.v ?? ''}
                  </Text>
                </View>
              );
            })}
          </View>
        );
      })}
      {footer}
    </View>
  );

  return (
    <View style={[s.xlsWrap, style]}>
      <ScrollView horizontal showsHorizontalScrollIndicator style={{ backgroundColor: theme.color.card }}>
        {maxHeight ? (
          <ScrollView style={{ maxHeight }} showsVerticalScrollIndicator>
            {content}
          </ScrollView>
        ) : (
          content
        )}
      </ScrollView>
    </View>
  );
}

/** 표 아래 색 범례 */
export function XlsLegend({ items }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const colorOf = (tone) =>
    tone === 'ok' ? theme.color.success : tone === 'warn' ? theme.color.warning : theme.color.destructive;
  return (
    <View style={[s.legend, { marginTop: 10 }]}>
      {items.map((it) => (
        <View key={it.label} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={[s.legendDot, { backgroundColor: colorOf(it.tone) }]} />
          <Text style={s.legendText}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}
