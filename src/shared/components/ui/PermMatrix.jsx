/**
 * 권한 매트릭스 표 (SY-02 · SY-03 공용)
 *
 * 행(화면 또는 데이터 항목) × 열(부서) 체크박스 격자입니다.
 * 통합관리자처럼 전체 권한을 가진 부서 열은 잠금 처리합니다.
 */
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import Icon from './Icon';

export default function PermMatrix({
  rows, // [{ id, name, group, sub }]
  columns, // [{ key, label, sublabel, locked }]
  isChecked, // (rowId, colKey) => boolean
  onToggle, // (rowId, colKey) => void
  onToggleGroup, // (group, colKey, allowed) => void  (선택)
  rowLabelWidth = 200,
  groupLabelWidth = 120,
  footerLabel = '허용 항목 수',
  footerValue, // (colKey) => number
  descOf, // (row) => string  (선택 — 데이터 항목 설명)
  maxHeight,
}) {
  const s = useCommonStyles();
  const theme = useTheme();

  const colWidth = 104;
  const groups = [...new Set(rows.map((r) => r.group).filter(Boolean))];

  const Cell = ({ on, locked, onPress }) => (
    <TouchableOpacity
      disabled={locked}
      onPress={onPress}
      activeOpacity={0.7}
      style={[s.xlsCell, { width: colWidth, alignItems: 'center' }]}
    >
      <View
        style={{
          width: 16,
          height: 16,
          borderRadius: 4,
          borderWidth: 1,
          borderColor: on ? theme.color.primary : theme.color.border,
          backgroundColor: on ? theme.color.primary : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: locked ? 0.55 : 1,
        }}
      >
        {on ? <Icon name="check" size={11} color={theme.color.primaryForeground} strokeWidth={2.6} /> : null}
      </View>
    </TouchableOpacity>
  );

  const body = (
    <View>
      {/* 머리글 */}
      <View style={s.xlsRow}>
        {groups.length ? (
          <View style={[s.xlsCell, s.xlsHead, { width: groupLabelWidth }]}>
            <Text style={[s.xlsCellText, s.xlsHeadText]}>메뉴 그룹</Text>
          </View>
        ) : null}
        <View style={[s.xlsCell, s.xlsHead, { width: rowLabelWidth }]}>
          <Text style={[s.xlsCellText, s.xlsHeadText, s.xlsLeft]}>{groups.length ? '화면' : '데이터 항목'}</Text>
        </View>
        {descOf ? (
          <View style={[s.xlsCell, s.xlsHead, { width: 260 }]}>
            <Text style={[s.xlsCellText, s.xlsHeadText, s.xlsLeft]}>포함 데이터</Text>
          </View>
        ) : null}
        {columns.map((c) => (
          <View key={c.key} style={[s.xlsCell, s.xlsHead, { width: colWidth }]}>
            <Text style={[s.xlsCellText, s.xlsHeadText]} numberOfLines={1}>
              {c.label}
            </Text>
            {c.sublabel ? <Text style={[s.xlsCellText, { fontSize: 10, opacity: 0.7 }]}>{c.sublabel}</Text> : null}
          </View>
        ))}
      </View>

      {/* 그룹 일괄 토글 줄 */}
      {onToggleGroup
        ? groups.map((g) => (
            <View key={`g-${g}`} style={[s.xlsRow, s.xlsGroup]}>
              <View style={[s.xlsCell, { width: groupLabelWidth }]}>
                <Text style={[s.xlsCellText, s.xlsGroupText]}>{g}</Text>
              </View>
              <View style={[s.xlsCell, { width: rowLabelWidth }]}>
                <Text style={[s.xlsCellText, s.xlsLeft, { opacity: 0.7 }]}>그룹 일괄</Text>
              </View>
              {descOf ? <View style={[s.xlsCell, { width: 260 }]} /> : null}
              {columns.map((c) => {
                const groupRows = rows.filter((r) => r.group === g);
                const allOn = groupRows.every((r) => isChecked(r.id, c.key));
                return (
                  <TouchableOpacity
                    key={c.key}
                    disabled={c.locked}
                    onPress={() => onToggleGroup(g, c.key, !allOn)}
                    activeOpacity={0.7}
                    style={[s.xlsCell, { width: colWidth, alignItems: 'center' }]}
                  >
                    <Text style={[s.xlsCellText, { fontSize: 10.5, color: c.locked ? theme.color.mutedForeground : theme.color.primary }]}>
                      {allOn ? '전체 해제' : '전체 허용'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))
        : null}

      {/* 본문 */}
      {rows.map((r) => (
        <View key={r.id} style={s.xlsRow}>
          {groups.length ? (
            <View style={[s.xlsCell, { width: groupLabelWidth }]}>
              <Text style={s.xlsCellText}>{r.group}</Text>
            </View>
          ) : null}
          <View style={[s.xlsCell, { width: rowLabelWidth }]}>
            <Text style={[s.xlsCellText, s.xlsLeft, r.sub && { color: theme.color.mutedForeground }]} numberOfLines={1}>
              {r.sub ? `↳ ${r.name}` : r.name}
            </Text>
          </View>
          {descOf ? (
            <View style={[s.xlsCell, { width: 260 }]}>
              <Text style={[s.xlsCellText, s.xlsLeft, { color: theme.color.mutedForeground }]} numberOfLines={2}>
                {descOf(r)}
              </Text>
            </View>
          ) : null}
          {columns.map((c) => (
            <Cell key={c.key} on={isChecked(r.id, c.key)} locked={c.locked} onPress={() => onToggle(r.id, c.key)} />
          ))}
        </View>
      ))}

      {/* 합계 */}
      <View style={[s.xlsRow, s.xlsTotal]}>
        {groups.length ? (
          <View style={[s.xlsCell, { width: groupLabelWidth }]}>
            <Text style={[s.xlsCellText, s.xlsTotalText]}>합계</Text>
          </View>
        ) : null}
        <View style={[s.xlsCell, { width: rowLabelWidth }]}>
          <Text style={[s.xlsCellText, s.xlsTotalText, s.xlsLeft]}>{footerLabel}</Text>
        </View>
        {descOf ? <View style={[s.xlsCell, { width: 260 }]} /> : null}
        {columns.map((c) => (
          <View key={c.key} style={[s.xlsCell, { width: colWidth }]}>
            <Text style={[s.xlsCellText, s.xlsTotalText, s.xlsNum]}>{footerValue(c.key)}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <View style={s.xlsWrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator style={{ backgroundColor: theme.color.card }}>
        {maxHeight ? (
          <ScrollView style={{ maxHeight }} showsVerticalScrollIndicator>
            {body}
          </ScrollView>
        ) : (
          body
        )}
      </ScrollView>
    </View>
  );
}
