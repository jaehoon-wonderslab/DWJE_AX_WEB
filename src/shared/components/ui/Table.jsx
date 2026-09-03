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
import React, { useState } from 'react';
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
    <View style={[{ minWidth: minWidth || '100%', width: '100%' }, style]}>
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
        rows.map((row, ri) => (
          <TableRow
            key={rowKey(row, ri)}
            row={row}
            ri={ri}
            isLast={ri === rows.length - 1}
            columns={columns}
            cellStyle={cellStyle}
            alignStyle={alignStyle}
            onRowPress={onRowPress}
            s={s}
            theme={theme}
          />
        ))
      )}
    </View>
  );

  // 열이 많으면 가로 스크롤로 감싸되 기본 너비는 항상 100%를 채웁니다
  return minWidth ? (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator
      style={{ width: '100%', backgroundColor: theme.color.card }}
      contentContainerStyle={{ minWidth: '100%', width: '100%' }}
    >
      {body}
    </ScrollView>
  ) : (
    <View style={{ width: '100%' }}>{body}</View>
  );
}

/** 마우스 오버 시 하이라이트 색상을 부여하는 개별 행 컴포넌트 */
function TableRow({ row, ri, isLast, columns, cellStyle, alignStyle, onRowPress, s, theme }) {
  const [hovered, setHovered] = useState(false);

  const hoverBg = theme.alpha ? theme.alpha('primary', 0.05) : 'rgba(0, 102, 204, 0.05)';
  const bgStyle = hovered ? { backgroundColor: hoverBg } : undefined;

  const content = (
    <View style={[s.tr, isLast && s.trLast, bgStyle]}>
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

  // web 환경에서 onMouseEnter / onMouseLeave 지원
  const hoverProps = {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
  };

  return onRowPress ? (
    <TouchableOpacity activeOpacity={0.7} onPress={() => onRowPress(row, ri)} {...hoverProps}>
      {content}
    </TouchableOpacity>
  ) : (
    <View {...hoverProps}>{content}</View>
  );
}

function alignFlex(align) {
  if (align === 'right') return 'flex-end';
  if (align === 'center') return 'center';
  return 'flex-start';
}
