/**
 * [Component] DatePicker Popover 달력
 *
 * - 입력창 바로 아래(dropdown popover)에 열려 마우스 이동을 최소화합니다.
 * - Shadcn 스타일의 미니멀하고 세련된 캘린더 UI
 * - 연/월 이동 (<, >) 및 '오늘' 바로가기 버튼
 * - 일~토 요일별 그리드 (일요일 빨강, 토요일 파랑 틴트)
 * - 현재 선택된 날짜 하이라이트 & 오늘 날짜 표시
 * - 외부 클릭 시 자동 닫힘 (Click Outside)
 */
import React, { useEffect, useRef, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { FONT_FAMILY, useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import Icon from './Icon';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export default function DatePickerPopover({ visible, onClose, value, onSelect, min, max }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const popoverRef = useRef(null);

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

  useEffect(() => {
    if (visible) {
      const parsed = parseInitialDate();
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
    }
  }, [visible, value]);

  // 웹 외부 클릭 감지
  useEffect(() => {
    if (!visible) return;
    const handleDocumentClick = (e) => {
      if (popoverRef.current) {
        // popover DOM 요소 내부 클릭이 아니면 닫기
        const domNode = popoverRef.current;
        if (domNode.contains && !domNode.contains(e.target)) {
          onClose();
        }
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    if (typeof document !== 'undefined') {
      // 다음 틱에 바인딩하여 열기 클릭 이벤트에 바로 닫히지 않도록 함
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleDocumentClick);
        document.addEventListener('keydown', handleKeyDown);
      }, 50);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleDocumentClick);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [visible, onClose]);

  if (!visible) return null;

  const todayStr = (() => {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  })();

  const prevMonth = (e) => {
    e?.stopPropagation?.();
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = (e) => {
    e?.stopPropagation?.();
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const selectToday = (e) => {
    e?.stopPropagation?.();
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
  // 다음 달 날짜들 (총 42칸 맞춤)
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
    <View
      ref={popoverRef}
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        marginTop: 6,
        width: 290,
        backgroundColor: theme.color.popover,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.hairlineStrong,
        padding: 14,
        ...theme.shadow,
        zIndex: 9999,
      }}
    >
      {/* 헤더: 연/월 이동 & 오늘 버튼 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <TouchableOpacity
            onPress={prevMonth}
            activeOpacity={0.7}
            style={{ width: 26, height: 26, borderRadius: 99, borderWidth: 1, borderColor: theme.hairlineStrong, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="chevronLeft" size={13} color={theme.color.foreground} />
          </TouchableOpacity>
          <Text style={{ fontFamily: FONT_FAMILY, fontSize: 17, fontWeight: '500', letterSpacing: -0.2, color: theme.color.foreground, marginHorizontal: 6 }}>
            {viewYear}년 {viewMonth + 1}월
          </Text>
          <TouchableOpacity
            onPress={nextMonth}
            activeOpacity={0.7}
            style={{ width: 26, height: 26, borderRadius: 99, borderWidth: 1, borderColor: theme.hairlineStrong, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="chevronRight" size={13} color={theme.color.foreground} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={selectToday}
          activeOpacity={0.7}
          style={{
            paddingHorizontal: 9,
            paddingVertical: 3,
            borderRadius: 99,
            backgroundColor: theme.alpha('primary', 0.12),
          }}
        >
          <Text style={{ fontFamily: FONT_FAMILY, fontSize: 15, fontWeight: '500', color: theme.color.primary }}>오늘</Text>
        </TouchableOpacity>
      </View>

      {/* 요일 헤더 */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, borderBottomWidth: 1, borderBottomColor: theme.hairline, paddingBottom: 6 }}>
        {WEEKDAYS.map((wd, i) => (
          <View key={wd} style={{ width: 34, alignItems: 'center' }}>
            <Text
              style={{
                fontFamily: FONT_FAMILY,
                fontSize: 14.5,
                fontWeight: '500',
                letterSpacing: 0.3,
                color: i === 0 ? theme.color.destructive : i === 6 ? theme.color.info : theme.color.mutedForeground,
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
                width: 34,
                height: 30,
                alignItems: 'center',
                justifyContent: 'center',
                marginVertical: 1.5,
                borderRadius: 99,
                backgroundColor: isSelected ? theme.color.primary : 'transparent',
                borderWidth: !isSelected && isToday ? 1 : 0,
                borderColor: theme.color.primary,
              }}
            >
              <Text
                style={{
                  fontFamily: FONT_FAMILY,
                  fontSize: 15.5,
                  fontWeight: isSelected ? '600' : isToday ? '500' : '400',
                  color: isSelected
                    ? theme.color.primaryForeground
                    : !item.isCurrentMonth
                    ? theme.alpha('mutedForeground', 0.35)
                    : colIdx === 0
                    ? theme.color.destructive
                    : colIdx === 6
                    ? theme.color.info
                    : theme.color.foreground,
                }}
              >
                {item.day}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
