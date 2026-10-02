/**
 * [Component] 엑셀 다운로드 옵션 패널 (CM-07 · 2026-10-01 기획 CMN-07, 결정 R-16)
 *
 * 엑셀 단추를 누르면 곧바로 받지 않고, **단추 바로 아래**에 두 항목이 있는 패널을 엽니다.
 *   · 조회 목록 다운로드 — 그리드 기준. 지금 그리드에 보이는 행(서버 쪽 나눔이면 현재 쪽)을
 *                         열 필터·정렬·열 순서 그대로 받습니다.            → 이력 범위 VIEW
 *   · 전체 다운로드      — 조회 조건·쪽과 관계없이 화면 데이터 전체(화면별 상한 이내) → 이력 범위 ALL
 *
 * 무엇을 받을지는 화면 컨트롤러가 정해 `onExportView` · `onExportAll` 로 넘깁니다.
 * 마스킹(로그인 계정의 데이터 접근 권한)과 내려받기 이력은 exportUtil 이 맡습니다(R-10).
 * 권한은 화면 조회 권한이면 충분합니다 — 쓰기 권한을 보지 않습니다.
 *
 * 패널은 바깥을 누르거나 Esc 로 닫힙니다. 좁은 화면에서 잘리지 않도록 단추 오른쪽 끝에 맞춰
 * 왼쪽으로 펼칩니다(`align='right'` 기본, 단추가 왼쪽 끝에 있으면 `align='left'`).
 *
 * 웹에서는 패널을 document.body 에 포털로 그리고 단추 위치를 재서 고정 위치로 띄웁니다.
 * RN-web 의 View 는 저마다 쌓임 맥락을 만들어, 단추 옆에 그리면 아래 카드·표에 가려 눌리지 않았습니다.
 * 스크롤·창 크기 변경 때 위치를 다시 잽니다. 화면 가장자리를 넘지 않게 보정합니다.
 *
 * 사용 예)
 *   <ExportMenuButton
 *     viewCount={rows.length}
 *     totalCount={meta?.total}
 *     onExportView={exportView}
 *     onExportAll={exportAll}
 *   />
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { FONT_FAMILY } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import Button from './Button';
import Icon from './Icon';

const isWeb = Platform.OS === 'web' && typeof document !== 'undefined';
// 웹에서만 포털을 씁니다 (react-dom 은 웹 번들에만 있습니다)
// eslint-disable-next-line global-require
const createPortal = isWeb ? require('react-dom').createPortal : null;

const PANEL_MIN_WIDTH = 240;
const PANEL_MAX_WIDTH = 320;
/** 화면 가장자리와 남길 여백 */
const EDGE = 8;
/** 패널 높이 어림값(항목 2개) — 아래 공간이 이보다 작으면 위로 펼칩니다 */
const PANEL_EST_HEIGHT = 132;

/** 건수 표기 — 모르면 비웁니다 */
function countText(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '';
  return ` (${Number(n).toLocaleString('ko-KR')}건)`;
}

/**
 * @param {object} props
 * @param {Function} props.onExportView 조회 목록 다운로드 — Promise 를 돌려주면 끝날 때까지 잠급니다
 * @param {Function} [props.onExportAll] 전체 다운로드 — 없으면 항목을 그리지 않습니다
 * @param {number} [props.viewCount] 조회 목록 건수 (그리드에 보이는 행 수). 0 이면 「조회 목록」 항목을 비활성으로 둡니다
 * @param {number} [props.totalCount] 전체 건수 — 모르면 생략. 0 이면 「전체」 항목을 비활성으로 둡니다
 * @param {boolean} [props.viewDisabled] 「조회 목록」 항목만 막기
 * @param {boolean} [props.allDisabled] 「전체」 항목만 막기
 * @param {string} [props.label] 단추 문구 (기본 「엑셀 다운로드」)
 * @param {'right'|'left'} [props.align] 패널을 단추의 어느 쪽 끝에 맞출지
 * @param {boolean} [props.disabled]
 * @param {'sm'|'md'} [props.size]
 */
export default function ExportMenuButton({
  onExportView,
  onExportAll,
  viewCount,
  totalCount,
  viewDisabled = false,
  allDisabled = false,
  label = '엑셀 다운로드',
  align = 'right',
  disabled = false,
  size = 'sm',
  style,
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState('');
  const [pos, setPos] = useState(null);
  const anchor = useRef(null);

  const close = useCallback(() => setOpen(false), []);

  // 단추 위치를 재서 패널 위치를 정합니다 (웹)
  const measure = useCallback(() => {
    const node = anchor.current;
    if (!isWeb || !node?.getBoundingClientRect) return;
    const r = node.getBoundingClientRect();
    const vw = window.innerWidth;
    const width = Math.min(PANEL_MAX_WIDTH, Math.max(PANEL_MIN_WIDTH, r.width), vw - EDGE * 2);
    let left = align === 'left' ? r.left : r.right - width;
    left = Math.max(EDGE, Math.min(left, vw - width - EDGE));
    // 단추가 화면 아래쪽이라 패널이 넘치면 위로 펼칩니다
    const up = window.innerHeight - r.bottom < PANEL_EST_HEIGHT + EDGE && r.top > PANEL_EST_HEIGHT + EDGE;
    setPos(up ? { bottom: window.innerHeight - r.top + 4, left, width } : { top: r.bottom + 4, left, width });
  }, [align]);

  useLayoutEffect(() => {
    if (open) measure();
  }, [open, measure]);

  // Esc 로 닫고, 스크롤·창 크기 변경 때 위치를 다시 잽니다 (웹)
  useEffect(() => {
    if (!open || !isWeb) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open, measure]);

  const run = useCallback(async (kind, fn) => {
    if (!fn || busy) return;
    setBusy(kind);
    try {
      await fn();
    } finally {
      setBusy('');
      setOpen(false);
    }
  }, [busy]);

  const items = [
    {
      key: 'VIEW',
      label: `조회 목록 다운로드${countText(viewCount)}`,
      hint: viewCount === 0 ? '그리드에 보이는 행이 없습니다' : '그리드에 보이는 그대로',
      fn: onExportView,
      off: viewDisabled || viewCount === 0,
    },
    onExportAll
      ? {
        key: 'ALL',
        label: `전체 다운로드${countText(totalCount)}`,
        hint: totalCount === 0 ? '내려받을 데이터가 없습니다' : '조회 조건과 관계없이 전체',
        fn: onExportAll,
        off: allDisabled || totalCount === 0,
      }
      : null,
  ].filter(Boolean);

  const panel = (
    <View
      accessibilityRole="menu"
      style={{
        ...(isWeb && pos
          ? { position: 'fixed', ...(pos.bottom != null ? { bottom: pos.bottom } : { top: pos.top }), left: pos.left, width: pos.width }
          : { position: 'absolute', top: '100%', marginTop: 4, ...(align === 'left' ? { left: 0 } : { right: 0 }), minWidth: PANEL_MIN_WIDTH, maxWidth: PANEL_MAX_WIDTH }),
        zIndex: 2001,
        paddingVertical: 4,
        borderRadius: theme.metrics?.radiusAction ?? 8,
        borderWidth: 1,
        borderColor: theme.hairlineStrong || theme.color.border,
        backgroundColor: theme.color.popover || theme.color.card || theme.color.background,
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
      }}
    >
      {items.map((it) => (
        <Pressable
          key={it.key}
          accessibilityRole="menuitem"
          accessibilityState={{ disabled: it.off || !!busy }}
          onPress={it.off ? undefined : () => run(it.key, it.fn)}
          disabled={it.off || !!busy}
          style={({ hovered, focused }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingVertical: 9,
            paddingHorizontal: 12,
            backgroundColor: !it.off && (hovered || focused) ? theme.color.muted || 'rgba(0,0,0,0.04)' : 'transparent',
            opacity: it.off || (busy && busy !== it.key) ? 0.45 : 1,
            ...(isWeb ? { cursor: it.off ? 'not-allowed' : 'pointer' } : {}),
          })}
        >
          <Icon name={it.key === 'ALL' ? 'database' : 'grid'} size={14} color={theme.color.secondaryForeground} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontFamily: FONT_FAMILY, fontSize: 15.5, fontWeight: '600', color: theme.color.foreground }}>
              {busy === it.key ? '내려받는 중…' : it.label}
            </Text>
            <Text style={{ fontFamily: FONT_FAMILY, fontSize: 13.5, color: theme.color.mutedForeground }}>{it.hint}</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );

  // 바깥을 누르면 닫히는 투명 덮개 — 사용자 메뉴와 같은 방식
  const backdrop = (
    <Pressable
      onPress={close}
      accessibilityLabel="엑셀 다운로드 선택 닫기"
      style={{ position: isWeb ? 'fixed' : 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2000 }}
    />
  );

  return (
    <View ref={anchor} style={[{ position: 'relative' }, style]} collapsable={false}>
      <Button
        label={busy ? '내려받는 중…' : `${label} ▾`}
        size={size}
        icon="download"
        onPress={() => setOpen((v) => !v)}
        disabled={disabled || !!busy}
      />
      {open
        ? isWeb && createPortal
          ? createPortal(<>{backdrop}{pos ? panel : null}</>, document.body)
          : <>{backdrop}{panel}</>
        : null}
    </View>
  );
}
