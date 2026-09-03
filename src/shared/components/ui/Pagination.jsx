/**
 * 목록 페이지 이동 (CM-05)
 *
 * 서버가 준 페이지 정보(`meta`)를 그대로 받아 그립니다.
 * 목록이 잘려 있다는 사실 자체를 사용자가 알 수 있도록 **전체 건수를 항상 보여 줍니다** —
 * 이전에는 1,331건 중 50건만 나오는데 아무 표시가 없었습니다.
 *
 * 사용 예)
 *   const paging = usePaging({ resetKey: `${from}|${to}` });
 *   <Pagination meta={data?.meta} {...paging.bind} />
 */
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { PAGE_SIZES } from '@shared/hooks/usePaging';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { comma } from '@shared/utils/formatUtil';
import Icon from './Icon';

/**
 * 가운데에 보여 줄 쪽 번호를 고릅니다. 앞뒤 2쪽씩, 양끝은 항상.
 * 예) 총 27쪽에서 13쪽을 보는 중 → [1, '…', 11, 12, 13, 14, 15, '…', 27]
 */
function pageWindow(page, totalPages, span = 2) {
  if (totalPages <= 1) return [1];
  const nums = new Set([1, totalPages]);
  for (let p = page - span; p <= page + span; p += 1) {
    if (p >= 1 && p <= totalPages) nums.add(p);
  }
  const sorted = [...nums].sort((a, b) => a - b);
  const out = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push('…');
    out.push(n);
  });
  return out;
}

/**
 * @param {object} props
 * @param {object} props.meta 서버가 준 페이지 정보 { page, size, total, totalPages }
 * @param {Array<number>} [props.sizes] 한 쪽 건수 선택지. 0 을 넣으면 '전체' 로 그립니다
 */
export default function Pagination({ meta, page, size, onPage, onSize, style, showSize = true, sizes = PAGE_SIZES }) {
  const s = useCommonStyles();
  const theme = useTheme();

  const total = Number(meta?.total ?? 0);
  const totalPages = Number(meta?.totalPages ?? 0);
  const current = Number(page ?? meta?.page ?? 1);

  // size 0 은 '전체' 입니다 (서버 규약)
  const showingAll = Number(size) === 0;
  const per = showingAll ? total : Number(size || meta?.size || 50);

  /** 한 쪽 건수 선택 — 두 갈래 모두에서 씁니다 */
  const SizePicker = () =>
    showSize && onSize ? (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text style={[s.textXs, { color: theme.color.mutedForeground, fontSize: 11.5, marginRight: 2 }]}>페이지당</Text>
        {sizes.map((n) => {
          const isSelected = n === size || (!size && n === 50);
          return (
            <TouchableOpacity
              key={n}
              onPress={() => onSize(n)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={n === 0 ? '전체 보기' : `한 쪽에 ${n}건`}
              style={[
                btn,
                {
                  borderColor: isSelected ? theme.color.primary : theme.color.border,
                  backgroundColor: isSelected ? theme.alpha('primary', 0.08) : 'transparent',
                  paddingHorizontal: 8,
                },
              ]}
            >
              <Text
                style={[
                  s.textXs,
                  {
                    fontSize: 11.5,
                    fontWeight: isSelected ? '700' : '500',
                    color: isSelected ? theme.color.primary : theme.color.foreground,
                  },
                ]}
              >
                {n === 0 ? '전체' : n}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    ) : null;

  // 한 쪽에 다 들어가면 쪽 이동 단추는 그리지 않습니다 (건수는 항상 보여 줍니다)
  if (!total) return null;
  if (showingAll || (totalPages <= 1 && total <= per)) {
    return (
      <View style={[wrap, { borderTopWidth: 1, borderTopColor: theme.color.border }, style]}>
        <Text style={[s.textXs, { fontSize: 12, color: theme.color.mutedForeground }]}>
          전체 <Text style={{ fontWeight: '700', color: theme.color.foreground }}>{comma(total)}</Text>건
        </Text>
        <View style={{ marginLeft: 'auto' }}><SizePicker /></View>
      </View>
    );
  }

  const first = (current - 1) * per + 1;
  const last = Math.min(current * per, total);
  const go = (p) => {
    if (p < 1 || p > totalPages || p === current) return;
    onPage?.(p);
  };

  const Arrow = ({ to, icon, label, disabled }) => (
    <TouchableOpacity
      onPress={() => go(to)}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        btn,
        {
          borderColor: theme.color.border,
          backgroundColor: 'transparent',
        },
        disabled && { opacity: 0.3 },
      ]}
    >
      <Icon name={icon} size={14} color={disabled ? theme.color.mutedForeground : theme.color.foreground} />
    </TouchableOpacity>
  );

  return (
    <View style={[wrap, { borderTopWidth: 1, borderTopColor: theme.color.border }, style]}>
      <Text style={[s.textXs, { fontSize: 12, color: theme.color.mutedForeground }]}>
        전체 <Text style={{ fontWeight: '700', color: theme.color.foreground }}>{comma(total)}</Text>건 중{' '}
        <Text style={{ fontWeight: '600', color: theme.color.foreground }}>{`${comma(first)}–${comma(last)}`}</Text>
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto', flexWrap: 'wrap' }}>
        <Arrow to={1} icon="chevronLeft" label="첫 쪽" disabled={current <= 1} />
        <Arrow to={current - 1} icon="arrowLeft" label="이전 쪽" disabled={current <= 1} />

        {pageWindow(current, totalPages).map((n, i) =>
          n === '…' ? (
            <Text key={`gap-${i}`} style={[s.textXs, { paddingHorizontal: 4, color: theme.color.mutedForeground }]}>…</Text>
          ) : (
            <TouchableOpacity
              key={n}
              onPress={() => go(n)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${n}쪽`}
              style={[
                btn,
                { borderColor: theme.color.border, minWidth: 32, paddingHorizontal: 8 },
                n === current
                  ? { backgroundColor: theme.color.primary, borderColor: theme.color.primary }
                  : { backgroundColor: 'transparent' },
              ]}
            >
              <Text
                style={[
                  s.textXs,
                  { fontSize: 12, fontWeight: n === current ? '700' : '500' },
                  n === current
                    ? { color: theme.color.primaryForeground }
                    : { color: theme.color.foreground },
                ]}
              >
                {n}
              </Text>
            </TouchableOpacity>
          )
        )}

        <Arrow to={current + 1} icon="arrowRight" label="다음 쪽" disabled={current >= totalPages} />
        <Arrow to={totalPages} icon="chevronRight" label="마지막 쪽" disabled={current >= totalPages} />

        {showSize && onSize ? (
          <>
            <View style={{ width: 1, height: 18, backgroundColor: theme.color.border, marginHorizontal: 8 }} />
            <SizePicker />
          </>
        ) : null}
      </View>
    </View>
  );
}

const wrap = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
  flexWrap: 'wrap',
  paddingVertical: 12,
  paddingHorizontal: 16,
};
const btn = {
  height: 30,
  minWidth: 30,
  paddingHorizontal: 6,
  borderRadius: 6,
  borderWidth: 1,
  alignItems: 'center',
  justifyContent: 'center',
};
