/**
 * 공통 스타일 시트 — "Soft-matte panels" 디자인 언어의 React Native 판
 *
 * 스타일 참조(docs/duckwoo-ax-style-reference.md)의 원칙을 그대로 따릅니다.
 *  · 위계는 크기가 아니라 **색과 굵기**로 만든다 — 라벨·본문 500, 제목·수치 600. 400·700 은 쓰지 않는다.
 *  · 노안 대응을 위해 기존 기준보다 모든 글자 크기를 4px 키운다(14.5 ~ 32px). 제목·수치는 -0.02em 자간, 수치는 Inter.
 *  · 표면은 두 단계 — 흰 패널 안에 #FAFAFA 카드(보더 없음). 구분은 #DFE1E7 헤어라인.
 *  · 앰버는 데이터 채움·활성 점에만. 글자·버튼에는 잉크(#0B1440).
 *  · 한글은 `word-break: keep-all` — 단어 중간에서 줄이 끊기지 않게.
 *
 * 화면 컴포넌트는 여기 정의된 스타일을 조합해 쓰고, 화면 고유 스타일만 각 파일에서 별도로 만듭니다.
 *
 * 사용 예) const s = useCommonStyles();  <View style={s.card}>...</View>
 */
import { Platform, StyleSheet } from 'react-native';
import { makeStyles } from './useTheme';

/** 글꼴 스택 — 한글은 Pretendard, 라틴·숫자는 Inter (app/+html.jsx 에서 로드) */
export const FONT_FAMILY = Platform.select({
  web: '"Pretendard Variable", "Pretendard", "Inter", "Noto Sans KR", "Apple SD Gothic Neo", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  ios: 'System',
  default: 'sans-serif',
});

/** 수치 글꼴 — 숫자가 같은 폭으로 정렬되도록 Inter 를 앞세웁니다 */
export const NUM_FAMILY = Platform.select({
  web: '"Inter", "Pretendard Variable", "Pretendard", sans-serif',
  ios: 'System',
  default: 'sans-serif',
});

/** 제목 글꼴 — 본문과 같은 서체 (참조: 단일 서체, 굵기 600 으로 위계) */
export const DISPLAY_FAMILY = FONT_FAMILY;

/** 숫자 정렬용 고정폭 글꼴 (표의 코드 칸) */
export const MONO_FAMILY = Platform.select({
  web: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
  ios: 'Menlo',
  default: 'monospace',
});

/** 한글 줄바꿈 — 단어 단위 (웹 전용) */
const KEEP_ALL = Platform.select({ web: { wordBreak: 'keep-all' }, default: {} });

/** 웹에서만 적용되는 부드러운 전환 */
const TRANSITION = Platform.select({ web: { transitionDuration: '140ms', transitionProperty: 'background-color, border-color, color, opacity' }, default: {} });

export const useCommonStyles = makeStyles((theme) => {
  const { color, alpha, metrics, hairline, hairlineStrong, divider, surface, surfaceHover } = theme;
  const ink = color.primary;
  const text2 = color.secondaryForeground;
  const text3 = color.mutedForeground;

  return StyleSheet.create({
    /* ---------- 기본 텍스트 ---------- */
    text: { fontFamily: FONT_FAMILY, fontSize: 16.5, lineHeight: 20, fontWeight: '500', color: color.foreground, ...KEEP_ALL },
    textMuted: { fontFamily: FONT_FAMILY, fontSize: 16, lineHeight: 19, fontWeight: '500', color: text3, ...KEEP_ALL },
    textSm: { fontFamily: FONT_FAMILY, fontSize: 16, lineHeight: 18, fontWeight: '500', color: color.foreground, ...KEEP_ALL },
    textXs: { fontFamily: FONT_FAMILY, fontSize: 14.5, lineHeight: 16, fontWeight: '500', color: text3, ...KEEP_ALL },
    bold: { fontWeight: '600' },
    num: { fontFamily: NUM_FAMILY, fontVariant: ['tabular-nums'] },
    mono: { fontFamily: MONO_FAMILY, fontSize: 15.5 },

    /* ---------- 타이포 스케일 (참조) ---------- */
    /** 소제목 — 15px · 600 · +0.02em · 캡션 회색 (앰버는 글자에 쓰지 않습니다) */
    eyebrow: { fontFamily: FONT_FAMILY, fontSize: 15, lineHeight: 15, fontWeight: '600', letterSpacing: 0.22, color: text3, ...KEEP_ALL },
    /** 라벨 — 15px · 500 · +0.02em */
    label: { fontFamily: FONT_FAMILY, fontSize: 15, lineHeight: 15, fontWeight: '500', letterSpacing: 0.22, color: text3, ...KEEP_ALL },
    /** 캡션 — 14.5px */
    caption: { fontFamily: FONT_FAMILY, fontSize: 14.5, lineHeight: 15, fontWeight: '500', color: text3, ...KEEP_ALL },
    /** 본문 — 16.5px · 500 · 1.6 */
    body: { fontFamily: FONT_FAMILY, fontSize: 16.5, lineHeight: 20, fontWeight: '500', color: text2, ...KEEP_ALL },
    bodySm: { fontFamily: FONT_FAMILY, fontSize: 16, lineHeight: 20, fontWeight: '500', color: text3, ...KEEP_ALL },
    /** 채팅 본문 — 17px · 1.7 */
    chat: { fontFamily: FONT_FAMILY, fontSize: 17, lineHeight: 22, fontWeight: '500', color: color.foreground, ...KEEP_ALL },
    /** 카드 제목 — 17px · 600 */
    heading2xs: { fontFamily: DISPLAY_FAMILY, fontSize: 17, lineHeight: 18, fontWeight: '600', letterSpacing: -0.1, color: ink, ...KEEP_ALL },
    /** 제목 — 22px · 600 · -0.02em */
    headingXs: { fontFamily: DISPLAY_FAMILY, fontSize: 22, lineHeight: 25, fontWeight: '600', letterSpacing: -0.36, color: ink, ...KEEP_ALL },
    /** 페이지 제목 — 25px · 600 · -0.02em */
    subheading: { fontFamily: DISPLAY_FAMILY, fontSize: 25, lineHeight: 29, fontWeight: '600', letterSpacing: -0.42, color: ink, ...KEEP_ALL },
    headingSm: { fontFamily: DISPLAY_FAMILY, fontSize: 25, lineHeight: 29, fontWeight: '600', letterSpacing: -0.42, color: ink, ...KEEP_ALL },
    heading: { fontFamily: DISPLAY_FAMILY, fontSize: 25, lineHeight: 29, fontWeight: '600', letterSpacing: -0.42, color: ink, ...KEEP_ALL },
    /** 홈 인사말 등 — 참조 상한을 살짝 넘는 자리에만 */
    headingLg: { fontFamily: DISPLAY_FAMILY, fontSize: 28, lineHeight: 32, fontWeight: '600', letterSpacing: -0.48, color: ink, ...KEEP_ALL },
    display: { fontFamily: DISPLAY_FAMILY, fontSize: 32, lineHeight: 36, fontWeight: '600', letterSpacing: -0.56, color: ink, ...KEEP_ALL },
    /** 수치 — 25px · 600 · Inter */
    numeral: { fontFamily: NUM_FAMILY, fontSize: 25, lineHeight: 26, fontWeight: '600', letterSpacing: -0.42, color: ink, fontVariant: ['tabular-nums'] },
    numeralSm: { fontFamily: NUM_FAMILY, fontSize: 21, lineHeight: 21, fontWeight: '600', letterSpacing: -0.34, color: ink, fontVariant: ['tabular-nums'] },

    /* ---------- 레이아웃 (앱 셸) ---------- */
    /** 셸 — 캔버스 위에 패널들이 16px 여백을 두고 놓입니다. 셸 자체는 스크롤하지 않습니다 */
    app: { flex: 1, flexDirection: 'row', backgroundColor: color.background, padding: metrics.gutter, gap: metrics.gutter, overflow: 'hidden' },
    /** 최상위 패널 — 흰색 · 24px 반지름 · 거의 안 보이는 테두리 · 넓고 옅은 그림자 */
    panel: {
      backgroundColor: color.card,
      borderRadius: metrics.radiusPanel,
      borderWidth: 1,
      borderColor: hairline,
      overflow: 'hidden',
      ...theme.panelShadow,
    },
    main: { flex: 1, minWidth: 0 },
    // 본문 패널의 가용 폭을 끝까지 사용합니다. 화면별 카드·표가 오른쪽에서 임의로 끊기지 않도록
    // 고정 contentMaxWidth 제한은 제거하고, 각 화면의 내부 레이아웃이 폭을 결정하게 합니다.
    content: { padding: 24, paddingTop: 22, width: '100%', alignSelf: 'stretch' },
    hairline: { height: 1, backgroundColor: divider },

    /* ---------- page-head ---------- */
    pageHead: { marginBottom: 20, flexDirection: 'row', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' },
    pageTitle: { fontFamily: DISPLAY_FAMILY, fontSize: 25, lineHeight: 29, fontWeight: '600', letterSpacing: -0.42, color: ink, ...KEEP_ALL },
    pageDesc: { fontFamily: FONT_FAMILY, fontSize: 16.5, lineHeight: 20, fontWeight: '500', color: text3, marginTop: 6, maxWidth: 720, ...KEEP_ALL },
    pageActions: { marginLeft: 'auto', flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' },

    /* ---------- card ---------- */
    /** 카드 — 패널 안의 흰 카드. 구분선 색 테두리 · 16px 반지름 · 그림자 없음 */
    card: {
      borderWidth: 1,
      borderColor: divider,
      borderRadius: metrics.radius,
      backgroundColor: color.card,
      overflow: 'hidden',
    },
    /** 중첩 카드 — #FAFAFA 채움 · 보더 없음 (스탯·브리핑) */
    cardNested: { borderWidth: 0, borderRadius: metrics.radius, backgroundColor: surface, overflow: 'hidden' },
    cardHead: {
      paddingVertical: 14,
      paddingHorizontal: 18,
      borderBottomWidth: 1,
      borderBottomColor: divider,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    cardHeadTitle: { fontFamily: DISPLAY_FAMILY, fontSize: 17, lineHeight: 18, fontWeight: '600', letterSpacing: -0.1, color: ink, ...KEEP_ALL },
    cardHeadSub: { fontFamily: FONT_FAMILY, fontSize: 14.5, lineHeight: 15, fontWeight: '500', color: text3, marginTop: 2, ...KEEP_ALL },
    cardHeadRight: { marginLeft: 'auto', flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' },
    cardBody: { padding: 18 },
    cardBodyTight: { padding: 0 },

    /* ---------- grid ---------- */
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    gridRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
    col: { flex: 1, minWidth: 0 },

    /* ---------- stat (중첩 스탯 카드) ---------- */
    stat: { padding: 14, borderWidth: 0, backgroundColor: surface },
    statLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    statValue: { fontFamily: NUM_FAMILY, fontSize: 25, lineHeight: 26, fontWeight: '600', letterSpacing: -0.42, color: ink, fontVariant: ['tabular-nums'] },
    statUnit: { fontFamily: FONT_FAMILY, fontSize: 15, fontWeight: '500', color: text3 },
    statSub: { fontFamily: FONT_FAMILY, fontSize: 14.5, lineHeight: 15, fontWeight: '500', color: text3, marginTop: 6, ...KEEP_ALL },
    up: { color: color.success },
    down: { color: color.destructive },

    /* ---------- 진행 바 (알약 트랙) ---------- */
    bar: { height: 9, borderRadius: 999, backgroundColor: surfaceHover, overflow: 'hidden', marginTop: 10 },
    barFill: { height: '100%', borderRadius: 999, backgroundColor: color.ink500 },
    barFillOk: { backgroundColor: ink },
    barFillWarn: { backgroundColor: color.warning },
    barFillBad: { backgroundColor: color.destructive },

    /* ---------- 일반 표 (Tabulator 안의 React 셀이 쓰는 글자 스타일) ---------- */
    tableWrap: { width: '100%' },
    th: { fontFamily: FONT_FAMILY, fontSize: 15, fontWeight: '600', letterSpacing: 0.22, color: text3, paddingVertical: 10, paddingHorizontal: 12 },
    theadRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: divider },
    tr: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: divider, alignItems: 'center' },
    trLast: { borderBottomWidth: 0 },
    trHover: { backgroundColor: surface },
    /** 셀 글자 — 여백은 표(Tabulator 셀)가 잡으므로 여기서는 두지 않습니다 */
    td: { fontFamily: FONT_FAMILY, fontSize: 16.5, lineHeight: 19, fontWeight: '500', color: color.foreground, ...KEEP_ALL },

    /* ---------- badge (흰 칩 · 상태별 옅은 틴트) ---------- */
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 2,
      paddingHorizontal: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.07)',
      backgroundColor: color.card,
      alignSelf: 'flex-start',
    },
    badgeText: { fontFamily: FONT_FAMILY, fontSize: 15, lineHeight: 15, fontWeight: '500', color: text2 },
    badgeGreen: { backgroundColor: color.successTint, borderColor: 'transparent' },
    badgeGreenText: { color: color.success },
    badgeRed: { backgroundColor: alpha('destructive', 0.1), borderColor: 'transparent' },
    badgeRedText: { color: color.destructive },
    badgeAmber: { backgroundColor: alpha('warning', 0.18), borderColor: 'transparent' },
    badgeAmberText: { color: color.warningText },
    badgeBlue: { backgroundColor: alpha('info', 0.08), borderColor: 'transparent' },
    badgeBlueText: { color: color.info },

    /* ---------- 상태 점 ---------- */
    dot: { width: 6, height: 6, borderRadius: 99, backgroundColor: color.success },
    dotRed: { backgroundColor: color.destructive },
    dotAmber: { backgroundColor: color.warning },
    dotGray: { backgroundColor: color.border },

    /* ---------- tabs (트랙 위의 흰 알약) ---------- */
    tabs: {
      flexDirection: 'row',
      gap: 2,
      padding: 3,
      backgroundColor: surfaceHover,
      borderRadius: 999,
      alignSelf: 'flex-start',
      marginBottom: 14,
      flexWrap: 'wrap',
    },
    tab: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 999, ...TRANSITION },
    tabText: { fontFamily: FONT_FAMILY, fontSize: 16, lineHeight: 17, fontWeight: '500', color: text2 },
    tabOn: { backgroundColor: color.card, borderWidth: 0, ...Platform.select({ web: { boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }, default: {} }) },
    tabOnText: { color: ink, fontWeight: '600' },

    /* ---------- 조회 조건 ---------- */
    filters: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 16, alignItems: 'flex-end' },
    field: { gap: 5 },
    fieldLabel: { fontFamily: FONT_FAMILY, fontSize: 15, lineHeight: 15, fontWeight: '500', letterSpacing: 0.22, color: text3 },
    input: {
      height: 36,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: hairlineStrong,
      borderRadius: metrics.radiusSm,
      backgroundColor: color.card,
      fontFamily: FONT_FAMILY,
      fontSize: 16.5,
      fontWeight: '500',
      color: color.foreground,
      minWidth: 130,
      ...Platform.select({ web: { outlineStyle: 'none', transitionDuration: '140ms', transitionProperty: 'border-color, box-shadow' }, default: {} }),
    },
    inputFocus: { borderColor: color.ring, ...Platform.select({ web: { boxShadow: `0 0 0 3px ${alpha('info', 0.12)}` }, default: {} }) },
    inputError: { borderColor: alpha('destructive', 0.6), backgroundColor: alpha('destructive', 0.04) },
    fieldError: { fontFamily: FONT_FAMILY, fontSize: 15, lineHeight: 16, fontWeight: '500', color: color.destructive },
    textarea: { height: 'auto', minHeight: 78, paddingVertical: 9, textAlignVertical: 'top', width: '100%' },

    /* ---------- kv (정의 목록) ---------- */
    kvRow: { flexDirection: 'row', gap: 12, marginBottom: 9, alignItems: 'flex-start' },
    kvKey: { fontFamily: FONT_FAMILY, fontSize: 16, lineHeight: 18, fontWeight: '500', color: text3, width: 130, flexShrink: 0 },
    kvVal: { fontFamily: FONT_FAMILY, fontSize: 16.5, lineHeight: 18, fontWeight: '500', color: color.foreground, flex: 1, ...KEEP_ALL },

    /* ---------- list ---------- */
    listItem: {
      flexDirection: 'row',
      gap: 10,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: divider,
      alignItems: 'flex-start',
    },
    listTitle: { fontFamily: FONT_FAMILY, fontSize: 16, lineHeight: 17, fontWeight: '600', color: color.foreground, ...KEEP_ALL },
    listDesc: { fontFamily: FONT_FAMILY, fontSize: 16, lineHeight: 18, fontWeight: '500', color: text2, marginTop: 2, ...KEEP_ALL },
    listTime: { fontFamily: FONT_FAMILY, fontSize: 14.5, fontWeight: '500', color: text3 },

    /* ---------- 안내문 ---------- */
    empty: { paddingVertical: 40, paddingHorizontal: 16, alignItems: 'center' },
    emptyText: { fontFamily: FONT_FAMILY, fontSize: 16.5, lineHeight: 20, fontWeight: '500', color: text3, textAlign: 'center', ...KEEP_ALL },
    source: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: divider },
    sourceText: { fontFamily: FONT_FAMILY, fontSize: 14.5, lineHeight: 16, fontWeight: '500', color: text3, ...KEEP_ALL },
    note: { borderLeftWidth: 2, borderLeftColor: divider, paddingLeft: 10, marginTop: 10 },
    /** 안내 박스 — 틴트 캡슐은 세션 상태에만 쓰므로 #FAFAFA 카드로 */
    hint: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'flex-start',
      paddingVertical: 11,
      paddingHorizontal: 14,
      borderRadius: metrics.radius,
      backgroundColor: surface,
      borderWidth: 1,
      borderColor: divider,
      marginBottom: 16,
    },
    hintText: { fontFamily: FONT_FAMILY, fontSize: 16, lineHeight: 19, fontWeight: '500', color: text2, flex: 1, ...KEEP_ALL },

    /* ---------- 칩 (흰 알약) ---------- */
    chips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 10 },
    chip: {
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.07)',
      borderRadius: 999,
      paddingVertical: 6,
      paddingHorizontal: 12,
      backgroundColor: color.card,
      ...TRANSITION,
    },
    chipText: { fontFamily: FONT_FAMILY, fontSize: 15.5, lineHeight: 16, fontWeight: '500', color: text2, ...KEEP_ALL },
    chipSrc: { backgroundColor: surface, borderColor: 'transparent' },
    chipSrcText: { fontWeight: '500', color: text2 },

    /* ---------- 선택 칩 (공정·제품) ---------- */
    selChip: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 6,
      marginRight: 6,
      marginBottom: 6,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.07)',
      borderRadius: 999,
      backgroundColor: color.card,
      ...TRANSITION,
    },
    selChipText: { fontFamily: FONT_FAMILY, fontSize: 16, fontWeight: '500', color: text2 },
    selChipSub: { fontFamily: FONT_FAMILY, fontSize: 14.5, fontWeight: '500', color: text3 },
    /** 선택됨 — 잉크 채움 */
    selChipOn: { backgroundColor: ink, borderColor: ink },
    selChipOnText: { color: color.primaryForeground, fontWeight: '600' },
    selChipOnSub: { color: color.primaryForeground, opacity: 0.7 },
    selChipSm: { paddingVertical: 4, paddingHorizontal: 10, marginRight: 5, marginBottom: 5 },

    /* ---------- blind (데이터 마스킹) ---------- */
    blind: {
      minWidth: 62,
      borderRadius: 999,
      paddingVertical: 1,
      paddingHorizontal: 9,
      backgroundColor: surface,
      borderWidth: 1,
      borderColor: divider,
      borderStyle: 'dashed',
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    blindText: { fontFamily: FONT_FAMILY, fontSize: 14.5, fontWeight: '600', letterSpacing: 0.4, color: text3 },

    /* ---------- 엑셀형 조밀 표 (보고서 문서) ---------- */
    xlsWrap: { borderWidth: 1, borderColor: divider, borderRadius: metrics.radiusSm, backgroundColor: color.card, overflow: 'hidden' },
    xlsRow: { flexDirection: 'row' },
    xlsCell: { borderWidth: 0.5, borderColor: divider, paddingVertical: 6, paddingHorizontal: 9, justifyContent: 'center' },
    xlsCellText: { fontFamily: FONT_FAMILY, fontSize: 15.5, lineHeight: 17, fontWeight: '500', color: color.foreground, textAlign: 'center' },
    xlsHead: { backgroundColor: surface },
    xlsHeadText: { fontWeight: '600', color: text3, letterSpacing: 0.2 },
    xlsNum: { textAlign: 'right', fontFamily: NUM_FAMILY, fontVariant: ['tabular-nums'] },
    xlsLeft: { textAlign: 'left' },
    xlsOk: { backgroundColor: color.successTint },
    xlsOkText: { color: color.success, fontWeight: '600' },
    xlsWarn: { backgroundColor: alpha('warning', 0.2) },
    xlsWarnText: { color: color.warningText, fontWeight: '600' },
    xlsBad: { backgroundColor: alpha('destructive', 0.12) },
    xlsBadText: { color: color.destructive, fontWeight: '600' },
    xlsGroup: { backgroundColor: surface },
    xlsGroupText: { fontWeight: '600', textAlign: 'left' },
    xlsTotal: { backgroundColor: alpha('info', 0.06) },
    xlsTotalText: { fontWeight: '600', color: ink },

    /* ---------- 범례 ---------- */
    legend: { flexDirection: 'row', gap: 12, alignItems: 'center', flexWrap: 'wrap' },
    legendText: { fontFamily: FONT_FAMILY, fontSize: 15, fontWeight: '500', color: text3 },
    legendDot: { width: 8, height: 8, borderRadius: 2, marginRight: 6 },
    legendLine: { width: 14, height: 2, borderRadius: 2, marginRight: 6 },

    /* ---------- 문서 미리보기 ---------- */
    doc: {
      backgroundColor: color.card,
      borderWidth: 1,
      borderColor: divider,
      borderRadius: metrics.radius,
      paddingVertical: 28,
      paddingHorizontal: 32,
      maxWidth: 820,
      width: '100%',
      alignSelf: 'center',
    },
    docWide: { maxWidth: undefined, paddingVertical: 22, paddingHorizontal: 24 },
    docTitle: { fontFamily: DISPLAY_FAMILY, fontSize: 22, lineHeight: 25, fontWeight: '600', letterSpacing: -0.36, textAlign: 'center', color: ink },
    docSub: {
      fontFamily: FONT_FAMILY,
      fontSize: 15,
      fontWeight: '500',
      color: text3,
      textAlign: 'center',
      marginTop: 4,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: divider,
      marginBottom: 16,
    },
    docSection: { marginBottom: 16 },
    docSectionHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 7 },
    docSectionTitle: { fontFamily: FONT_FAMILY, fontSize: 16.5, fontWeight: '600', color: ink },
    editable: {
      borderWidth: 1,
      borderColor: 'transparent',
      borderRadius: metrics.radiusXs,
      paddingVertical: 7,
      paddingHorizontal: 9,
      fontFamily: FONT_FAMILY,
      fontSize: 16.5,
      lineHeight: 21,
      fontWeight: '500',
      color: color.foreground,
      minHeight: 34,
      ...Platform.select({ web: { outlineStyle: 'none' }, default: {} }),
    },
    editableFocus: { borderColor: color.ring, backgroundColor: color.card },

    /* ---------- 단계형 마법사 ---------- */
    steps: { flexDirection: 'row', marginBottom: 16, flexWrap: 'wrap', gap: 6 },
    step: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      paddingVertical: 9,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.07)',
      borderRadius: 999,
      backgroundColor: color.card,
      flex: 1,
      minWidth: 150,
    },
    stepNo: { width: 20, height: 20, borderRadius: 99, backgroundColor: surfaceHover, alignItems: 'center', justifyContent: 'center' },
    stepNoText: { fontFamily: NUM_FAMILY, fontSize: 14.5, fontWeight: '600', color: text3 },
    stepTitle: { fontFamily: FONT_FAMILY, fontSize: 16, fontWeight: '500', color: text2 },
    stepSub: { fontFamily: FONT_FAMILY, fontSize: 14.5, fontWeight: '500', color: text3 },
    stepOn: { backgroundColor: surface, borderColor: 'transparent' },
    stepOnNo: { backgroundColor: ink },
    stepOnNoText: { color: color.primaryForeground },
    stepDoneNo: { backgroundColor: color.successTint },
    stepDoneNoText: { color: color.success },
    wizFoot: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: divider, flexWrap: 'wrap' },
    pickBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      flexWrap: 'wrap',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: metrics.radius,
      backgroundColor: surface,
      marginTop: 12,
    },

    /* ---------- 예측 카드 ---------- */
    pred: { borderWidth: 0, borderRadius: metrics.radius, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: surface },
    predRisk: { backgroundColor: alpha('destructive', 0.06) },
    predWatch: { backgroundColor: alpha('warning', 0.1) },
    predLabel: { fontFamily: FONT_FAMILY, fontSize: 14.5, fontWeight: '500', color: text3 },
    predValue: { fontFamily: NUM_FAMILY, fontSize: 22, lineHeight: 22, fontWeight: '600', color: ink, marginTop: 5, letterSpacing: -0.36, fontVariant: ['tabular-nums'] },
    predCi: { fontFamily: FONT_FAMILY, fontSize: 14.5, fontWeight: '500', color: text3, marginTop: 5 },

    /* ---------- 채팅 ---------- */
    msg: { flexDirection: 'row', gap: 10, maxWidth: '78%' },
    msgMe: { marginLeft: 'auto', flexDirection: 'row-reverse' },
    bubble: {
      borderWidth: 1,
      borderColor: divider,
      borderRadius: metrics.radius,
      paddingVertical: 12,
      paddingHorizontal: 15,
      backgroundColor: color.card,
      flexShrink: 1,
    },
    /** 사용자 말풍선 — 잉크 틴트 채움 */
    bubbleMe: { backgroundColor: alpha('info', 0.08), borderColor: 'transparent', borderRadius: metrics.radius, borderBottomRightRadius: 6 },
    bubbleMeText: { color: ink },
    bubbleDeny: { borderColor: alpha('destructive', 0.3), backgroundColor: alpha('destructive', 0.05) },
    bubbleUnknown: { borderColor: alpha('warning', 0.5), backgroundColor: alpha('warning', 0.08) },
    bubbleText: { fontFamily: FONT_FAMILY, fontSize: 17, lineHeight: 22, fontWeight: '500', color: color.foreground, ...KEEP_ALL },
    avatarSm: { width: 28, height: 28, borderRadius: 99, backgroundColor: color.info, alignItems: 'center', justifyContent: 'center' },
    avatarSmText: { fontFamily: FONT_FAMILY, fontSize: 14, fontWeight: '600', letterSpacing: 0.2, color: color.primaryForeground },

    /* ---------- 유틸 ---------- */
    row: { flexDirection: 'row', alignItems: 'center' },
    rowGap6: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    rowGap8: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    rowWrap: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
    spacer: { flex: 1 },
    mt6: { marginTop: 6 },
    mt10: { marginTop: 10 },
    mt14: { marginTop: 14 },
    mb14: { marginBottom: 14 },
  });
});
