/**
 * 일반 표 (CM-05)
 *
 * React Native 에는 <table> 이 없어 Flexbox 로 표를 구성합니다.
 * 열 너비는 columns[].width(고정 px) 또는 columns[].flex(비율)로 지정합니다.
 *
 * 사용 예)
 *   <Table
 *     columns={[{ key:'id', title:'설비', width:90 }, { key:'qty', title:'생산량', flex:1, align:'right' }]}
 *     rows={lines}
 *     onRowPress={(row) => showEquipment(row.id)}
 *   />
 */
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';

export default function Table({
  columns,
  rows,
  onRowPress,
  emptyText = '조회된 데이터가 없습니다.',
  keyExtractor,
  minWidth,
  style,
}) {
  const s = useCommonStyles();
  const theme = useTheme();

  /**
   * 행 key — 같은 값이 두 번 나오면 순번을 덧붙여 갈라 줍니다.
   *
   * 실데이터에서는 같은 설비가 공정별로 여러 줄 오는 식으로 식별자가 겹칩니다.
   * key 가 겹치면 React 가 행을 잘못 재사용해 값이 뒤섞이므로 여기서 한 번 걸러 냅니다.
   */
  const seenKeys = new Set();
  const rowKey = (row, ri) => {
    const base = keyExtractor ? String(keyExtractor(row, ri)) : String(ri);
    if (!seenKeys.has(base)) {
      seenKeys.add(base);
      return base;
    }
    return `${base}#${ri}`;
  };

  const cellStyle = (col) => [
    col.width ? { width: col.width, flexShrink: 0 } : { flex: col.flex || 1, minWidth: col.minWidth || 0 },
  ];
  const alignStyle = (col) => ({
    textAlign: col.align || 'left',
  });

  const body = (
    <View style={[{ minWidth: minWidth || undefined }, style]}>
      {/* 머리글 */}
      <View style={s.theadRow}>
        {columns.map((col) => (
          <View key={col.key} style={cellStyle(col)}>
            <Text style={[s.th, alignStyle(col)]} numberOfLines={1}>
              {col.title}
            </Text>
          </View>
        ))}
      </View>

      {/* 본문 */}
      {!rows?.length ? (
        <View style={s.empty}>
          <Text style={s.emptyText}>{emptyText}</Text>
        </View>
      ) : (
        rows.map((row, ri) => {
          const content = (
            <View style={[s.tr, ri === rows.length - 1 && s.trLast]}>
              {columns.map((col) => (
                <View key={col.key} style={cellStyle(col)}>
                  {col.render ? (
                    <View style={{ paddingVertical: 8, paddingHorizontal: 14, alignItems: alignFlex(col.align) }}>
                      {col.render(row, ri)}
                    </View>
                  ) : (
                    <Text style={[s.td, alignStyle(col), col.mono && s.mono, col.num && s.num]} numberOfLines={col.wrap ? 0 : 1}>
                      {row[col.key] ?? '—'}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          );
          const key = rowKey(row, ri);
          return onRowPress ? (
            <TouchableOpacity key={key} activeOpacity={0.6} onPress={() => onRowPress(row, ri)}>
              {content}
            </TouchableOpacity>
          ) : (
            <View key={key}>{content}</View>
          );
        })
      )}
    </View>
  );

  // 열이 많으면 가로 스크롤로 감쌉니다
  return minWidth ? (
    <ScrollView horizontal showsHorizontalScrollIndicator style={{ backgroundColor: theme.color.card }}>
      {body}
    </ScrollView>
  ) : (
    body
  );
}

function alignFlex(align) {
  if (align === 'right') return 'flex-end';
  if (align === 'center') return 'center';
  return 'flex-start';
}
