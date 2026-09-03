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
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 8 }}>
        {sizes.map((n) => (
          <TouchableOpacity
            key={n}
            onPress={() => onSize(n)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={n === 0 ? '전체 보기' : `한 쪽에 ${n}건`}
            style={[btn, { borderColor: theme.color.border, paddingHorizontal: 7 }, n === size && { backgroundColor: theme.color.secondary }]}
          >
            <Text style={[s.textXs, { fontSize: 11, fontWeight: n === size ? '700' : '400' }]}>{n === 0 ? '전체' : n}</Text>
          </TouchableOpacity>
        ))}
      </View>
    ) : null;

  // 한 쪽에 다 들어가면 쪽 이동 단추는 그리지 않습니다 (건수는 항상 보여 줍니다)
  if (!total) return null;
  if (showingAll || (totalPages <= 1 && total <= per)) {
    return (
      <View style={[wrap, style]}>
        <Text style={[s.textXs, { fontSize: 11.5 }]}>{`전체 ${comma(total)}건`}</Text>
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
      style={[btn, disabled && { opacity: 0.35 }, { borderColor: theme.color.border }]}
    >
      <Icon name={icon} size={13} color={theme.color.mutedForeground} />
    </TouchableOpacity>
  );

  return (
    <View style={[wrap, style]}>
      <Text style={[s.textXs, { fontSize: 11.5 }]}>
        {`전체 ${comma(total)}건 중 ${comma(first)}–${comma(last)}`}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
        <Arrow to={1} icon="chevronLeft" label="첫 쪽" disabled={current <= 1} />
        <Arrow to={current - 1} icon="arrowLeft" label="이전 쪽" disabled={current <= 1} />

        {pageWindow(current, totalPages).map((n, i) =>
          n === '…' ? (
            <Text key={`gap-${i}`} style={[s.textXs, { paddingHorizontal: 2 }]}>…</Text>
          ) : (
            <TouchableOpacity
              key={n}
              onPress={() => go(n)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${n}쪽`}
              style={[
                btn,
                { borderColor: theme.color.border, paddingHorizontal: 8, minWidth: 30 },
                n === current && { backgroundColor: theme.color.primary, borderColor: theme.color.primary },
              ]}
            >
              <Text
                style={[
                  s.textXs,
                  { fontSize: 11.5, fontWeight: n === current ? '700' : '500' },
                  n === current && { color: theme.color.primaryForeground },
                ]}
              >
                {n}
              </Text>
            </TouchableOpacity>
          )
        )}

        <Arrow to={current + 1} icon="arrowRight" label="다음 쪽" disabled={current >= totalPages} />
        <Arrow to={totalPages} icon="chevronRight" label="마지막 쪽" disabled={current >= totalPages} />

        <SizePicker />
      </View>
    </View>
  );
}

const wrap = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
  flexWrap: 'wrap',
  paddingVertical: 10,
  paddingHorizontal: 14,
};
const btn = {
  height: 26,
  minWidth: 26,
  paddingHorizontal: 5,
  borderRadius: 7,
  borderWidth: 1,
  alignItems: 'center',
  justifyContent: 'center',
};
