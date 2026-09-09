/**
 * [Component] 달력 날짜 선택 모달 (Datepicker Modal)
 *
 * - 연/월 이동 (<, >) 및 '오늘' 바로가기
 * - 일~토 요일별 날짜 그리드
 * - 현재 선택된 날짜 하이라이트 & 오늘 날짜 표시
 * - 날짜 클릭 시 YYYY-MM-DD 형식으로 반환 후 닫힘
 */
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import Icon from './Icon';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export default function DatePickerModal({ visible, onClose, value, onSelect, min, max }) {
  const s = useCommonStyles();
  const theme = useTheme();

  // 초기 연/월 파싱
  const parseInitialDate = () => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-').map(Number);
      return { year: y, month: m - 1, day: d };
    }
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth(), day: today.getDate() };
  };

  const initial = parseInitialDate();
  const [viewYear, setViewYear] = useState(initial.year);
  const [viewMonth, setViewMonth] = useState(initial.month);

  // value 가 바뀔 때 뷰 연/월도 동기화
  useEffect(() => {
    if (visible) {
      const parsed = parseInitialDate();
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
    }
  }, [visible, value]);

  const todayStr = (() => {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  })();

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const selectToday = () => {
    onSelect(todayStr);
    onClose();
  };

  // 달력 날짜 매트릭스 계산
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

  const days = [];
  // 이전 달 날짜들
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    days.push({
      day: prevMonthDays - i,
      month: viewMonth === 0 ? 11 : viewMonth - 1,
      year: viewMonth === 0 ? viewYear - 1 : viewYear,
      isCurrentMonth: false,
    });
  }
  // 이번 달 날짜들
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      day: i,
      month: viewMonth,
      year: viewYear,
      isCurrentMonth: true,
    });
  }
  // 다음 달 날짜들 (6줄 42칸 맞춤)
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({
      day: i,
      month: viewMonth === 11 ? 0 : viewMonth + 1,
      year: viewMonth === 11 ? viewYear + 1 : viewYear,
      isCurrentMonth: false,
    });
  }

  const handleSelectDay = (item) => {
    const m = String(item.month + 1).padStart(2, '0');
    const d = String(item.day).padStart(2, '0');
    const dateStr = `${item.year}-${m}-${d}`;
    onSelect(dateStr);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{
          flex: 1,
          backgroundColor: theme.overlay || 'rgba(0,0,0,0.4)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}
        onPress={onClose}
      >
        <Pressable
          style={{
            width: 320,
            backgroundColor: theme.color.card,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.color.border,
            padding: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 8,
          }}
          onPress={(e) => e.stopPropagation?.()}
        >
          {/* 달력 헤더: 연/월 이동 & 오늘 */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <TouchableOpacity
                onPress={prevMonth}
                activeOpacity={0.7}
                style={{ width: 28, height: 28, borderRadius: 6, borderWidth: 1, borderColor: theme.color.border, alignItems: 'center', justifyContent: 'center' }}
              >
                <Icon name="chevronLeft" size={14} color={theme.color.foreground} />
              </TouchableOpacity>
              <Text style={{ fontSize: 14, fontWeight: '700', color: theme.color.foreground }}>
                {viewYear}년 {viewMonth + 1}월
              </Text>
              <TouchableOpacity
                onPress={nextMonth}
                activeOpacity={0.7}
                style={{ width: 28, height: 28, borderRadius: 6, borderWidth: 1, borderColor: theme.color.border, alignItems: 'center', justifyContent: 'center' }}
              >
                <Icon name="chevronRight" size={14} color={theme.color.foreground} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={selectToday}
              activeOpacity={0.7}
              style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 6,
                backgroundColor: theme.alpha('primary', 0.1),
                borderWidth: 1,
                borderColor: theme.color.primary,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '600', color: theme.color.primary }}>오늘</Text>
            </TouchableOpacity>
          </View>

          {/* 요일 헤더 */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, borderBottomWidth: 1, borderBottomColor: theme.color.border, paddingBottom: 6 }}>
            {WEEKDAYS.map((wd, i) => (
              <View key={wd} style={{ width: 38, alignItems: 'center' }}>
                <Text
                  style={{
                    fontSize: 11.5,
                    fontWeight: '600',
                    color: i === 0 ? '#ef4444' : i === 6 ? '#3b82f6' : theme.color.mutedForeground,
                  }}
                >
                  {wd}
                </Text>
              </View>
            ))}
          </View>

          {/* 날짜 그리드 */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            {days.map((item, idx) => {
              const m = String(item.month + 1).padStart(2, '0');
              const d = String(item.day).padStart(2, '0');
              const itemDateStr = `${item.year}-${m}-${d}`;
              const isSelected = itemDateStr === value;
              const isToday = itemDateStr === todayStr;
              const colIdx = idx % 7;

              return (
                <TouchableOpacity
                  key={`${item.year}-${item.month}-${item.day}-${idx}`}
                  onPress={() => handleSelectDay(item)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`날짜 ${itemDateStr}`}
                  style={{
                    width: 38,
                    height: 34,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginVertical: 2,
                    borderRadius: 6,
                    backgroundColor: isSelected
                      ? theme.color.primary
                      : 'transparent',
                    borderWidth: !isSelected && isToday ? 1 : 0,
                    borderColor: theme.color.primary,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: isSelected ? '700' : isToday ? '600' : '400',
                      color: isSelected
                        ? theme.color.primaryForeground
                        : !item.isCurrentMonth
                        ? theme.alpha('mutedForeground', 0.4)
                        : colIdx === 0
                        ? '#ef4444'
                        : colIdx === 6
                        ? '#3b82f6'
                        : theme.color.foreground,
                    }}
                  >
                    {item.day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 하단 닫기 */}
          <View style={{ marginTop: 12, alignItems: 'flex-end' }}>
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.7}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 5,
                borderRadius: 6,
                borderWidth: 1,
                borderColor: theme.color.border,
              }}
            >
              <Text style={{ fontSize: 12, color: theme.color.foreground }}>닫기</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
