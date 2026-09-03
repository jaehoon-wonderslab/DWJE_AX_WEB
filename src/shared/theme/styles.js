/**
 * 공통 스타일 시트 — 프로토타입 전역 CSS 의 React Native 판
 *
 * 프로토타입 index.html 의 `.card` `.stat` `.badge` `.xls` 같은 CSS 클래스를
 * StyleSheet 객체로 1:1 옮겨 둔 것입니다. 화면 컴포넌트는 여기 정의된 스타일을 조합해 쓰고,
 * 화면 고유 스타일만 각 파일에서 별도로 만듭니다.
 *
 * 사용 예) const s = useCommonStyles();  <View style={s.card}>...</View>
 */
import { Platform, StyleSheet } from 'react-native';
import { makeStyles } from './useTheme';

/** 한글 가독성을 우선한 글꼴 스택 */
export const FONT_FAMILY = Platform.select({
  web: '"Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  ios: 'System',
  default: 'sans-serif',
});

/** 숫자 정렬용 고정폭 글꼴 (표의 수치 칸) */
export const MONO_FAMILY = Platform.select({
  web: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  ios: 'Menlo',
  default: 'monospace',
});

export const useCommonStyles = makeStyles((theme) => {
  const { color, alpha, metrics } = theme;

  return StyleSheet.create({
    /* ---------- 기본 텍스트 ---------- */
    text: { fontFamily: FONT_FAMILY, fontSize: 14, lineHeight: 21, color: color.foreground },
    textMuted: { fontFamily: FONT_FAMILY, fontSize: 13, lineHeight: 19, color: color.mutedForeground },
    textSm: { fontFamily: FONT_FAMILY, fontSize: 12, lineHeight: 18, color: color.foreground },
    textXs: { fontFamily: FONT_FAMILY, fontSize: 11, lineHeight: 16, color: color.mutedForeground },
    bold: { fontWeight: '600' },
    num: { fontVariant: ['tabular-nums'] },
    mono: { fontFamily: MONO_FAMILY, fontSize: 12 },

    /* ---------- 레이아웃 ---------- */
    app: { flex: 1, flexDirection: 'row', backgroundColor: color.background },
    main: { flex: 1, minWidth: 0 },
    content: { padding: 22, width: '100%', maxWidth: metrics.contentMaxWidth, alignSelf: 'flex-start' },

    /* ---------- page-head ---------- */
    pageHead: { marginBottom: 18, flexDirection: 'row', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' },
    pageTitle: { fontFamily: FONT_FAMILY, fontSize: 21, fontWeight: '700', letterSpacing: -0.4, color: color.foreground },
    pageDesc: { fontFamily: FONT_FAMILY, fontSize: 13, lineHeight: 19, color: color.mutedForeground, marginTop: 4, maxWidth: 760 },
    pageActions: { marginLeft: 'auto', flexDirection: 'row', gap: 8, flexWrap: 'wrap' },

    /* ---------- card ---------- */
    card: {
      borderWidth: 1,
      borderColor: color.border,
      borderRadius: metrics.radius,
      backgroundColor: color.card,
      overflow: 'hidden',
    },
    cardHead: {
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: color.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    cardHeadTitle: { fontFamily: FONT_FAMILY, fontSize: 14, fontWeight: '600', letterSpacing: -0.14, color: color.foreground },
    cardHeadSub: { fontFamily: FONT_FAMILY, fontSize: 12, lineHeight: 17, color: color.mutedForeground, marginTop: 2 },
    cardHeadRight: { marginLeft: 'auto', flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' },
    cardBody: { padding: 16 },
    cardBodyTight: { padding: 0 },

    /* ---------- grid ---------- */
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
    gridRow: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
    col: { flex: 1, minWidth: 0 },

    /* ---------- stat ---------- */
    stat: { padding: 16 },
    statLabel: { fontFamily: FONT_FAMILY, fontSize: 12, color: color.mutedForeground, flexDirection: 'row', alignItems: 'center', gap: 6 },
    statValue: {
      fontFamily: FONT_FAMILY,
      fontSize: 26,
      fontWeight: '700',
      letterSpacing: -0.78,
      color: color.foreground,
      fontVariant: ['tabular-nums'],
    },
    statUnit: { fontFamily: FONT_FAMILY, fontSize: 13, fontWeight: '500', color: color.mutedForeground },
    statSub: { fontFamily: FONT_FAMILY, fontSize: 12, color: color.mutedForeground, marginTop: 6 },
    up: { color: color.success },
    down: { color: color.destructive },

    /* ---------- 진행 바 ---------- */
    bar: { height: 6, borderRadius: 99, backgroundColor: color.muted, overflow: 'hidden', marginTop: 10 },
    barFill: { height: '100%', borderRadius: 99, backgroundColor: color.primary },
    barFillOk: { backgroundColor: color.success },
    barFillWarn: { backgroundColor: color.warning },
    barFillBad: { backgroundColor: color.destructive },

    /* ---------- 일반 표 ---------- */
    tableWrap: { width: '100%' },
    th: {
      fontFamily: FONT_FAMILY,
      fontSize: 12,
      fontWeight: '600',
      color: color.mutedForeground,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    theadRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: color.border },
    tr: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: color.border, alignItems: 'center' },
    trLast: { borderBottomWidth: 0 },
    trHover: { backgroundColor: alpha('muted', 0.5) },
    td: { fontFamily: FONT_FAMILY, fontSize: 13, color: color.foreground, paddingVertical: 11, paddingHorizontal: 14 },

    /* ---------- badge ---------- */
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 2,
      paddingHorizontal: 8,
      borderRadius: 99,
      borderWidth: 1,
      borderColor: color.border,
      backgroundColor: color.secondary,
      alignSelf: 'flex-start',
    },
    badgeText: { fontFamily: FONT_FAMILY, fontSize: 11, fontWeight: '600', color: color.secondaryForeground },
    badgeGreen: { backgroundColor: alpha('success', 0.12), borderColor: alpha('success', 0.25) },
    badgeGreenText: { color: color.success },
    badgeRed: { backgroundColor: alpha('destructive', 0.12), borderColor: alpha('destructive', 0.25) },
    badgeRedText: { color: color.destructive },
    badgeAmber: { backgroundColor: alpha('warning', 0.14), borderColor: alpha('warning', 0.3) },
    badgeAmberText: { color: color.warningText },
    badgeBlue: { backgroundColor: alpha('info', 0.12), borderColor: alpha('info', 0.25) },
    badgeBlueText: { color: color.info },

    /* ---------- 상태 점 ---------- */
    dot: { width: 7, height: 7, borderRadius: 99, backgroundColor: color.success },
    dotRed: { backgroundColor: color.destructive },
    dotAmber: { backgroundColor: color.warning },
    dotGray: { backgroundColor: color.mutedForeground },

    /* ---------- tabs ---------- */
    tabs: {
      flexDirection: 'row',
      gap: 4,
      padding: 3,
      backgroundColor: color.muted,
      borderRadius: metrics.radius,
      alignSelf: 'flex-start',
      marginBottom: 14,
      flexWrap: 'wrap',
    },
    tab: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: metrics.radiusXs },
    tabText: { fontFamily: FONT_FAMILY, fontSize: 13, fontWeight: '500', color: color.mutedForeground },
    tabOn: { backgroundColor: color.card },
    tabOnText: { color: color.foreground, fontWeight: '600' },

    /* ---------- 조회 조건 ---------- */
    filters: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 14, alignItems: 'flex-end' },
    field: { gap: 5 },
    fieldLabel: { fontFamily: FONT_FAMILY, fontSize: 12, fontWeight: '500', color: color.mutedForeground },
    input: {
      height: 34,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: color.input,
      borderRadius: metrics.radius,
      backgroundColor: color.card,
      fontFamily: FONT_FAMILY,
      fontSize: 13,
      color: color.foreground,
      minWidth: 130,
      ...Platform.select({ web: { outlineStyle: 'none' }, default: {} }),
    },
    inputFocus: { borderColor: color.ring },
    inputError: { borderColor: alpha('destructive', 0.65), backgroundColor: alpha('destructive', 0.04) },
    fieldError: { fontFamily: FONT_FAMILY, fontSize: 11.5, lineHeight: 17, color: color.destructive },
    textarea: { height: 'auto', minHeight: 78, paddingVertical: 9, textAlignVertical: 'top', width: '100%' },

    /* ---------- kv (정의 목록) ---------- */
    kvRow: { flexDirection: 'row', gap: 14, marginBottom: 9, alignItems: 'flex-start' },
    kvKey: { fontFamily: FONT_FAMILY, fontSize: 13, color: color.mutedForeground, width: 130, flexShrink: 0 },
    kvVal: { fontFamily: FONT_FAMILY, fontSize: 13, fontWeight: '500', color: color.foreground, flex: 1 },

    /* ---------- list ---------- */
    listItem: {
      flexDirection: 'row',
      gap: 11,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: color.border,
      alignItems: 'flex-start',
    },
    listTitle: { fontFamily: FONT_FAMILY, fontSize: 13, fontWeight: '600', color: color.foreground },
    listDesc: { fontFamily: FONT_FAMILY, fontSize: 12, lineHeight: 17, color: color.mutedForeground, marginTop: 3 },
    listTime: { fontFamily: FONT_FAMILY, fontSize: 11, color: color.mutedForeground },

    /* ---------- 안내문 ---------- */
    empty: { paddingVertical: 44, paddingHorizontal: 16, alignItems: 'center' },
    emptyText: { fontFamily: FONT_FAMILY, fontSize: 13, color: color.mutedForeground, textAlign: 'center' },
    source: {
      marginTop: 9,
      paddingTop: 9,
      borderTopWidth: 1,
      borderTopColor: color.border,
      borderStyle: 'dashed',
    },
    sourceText: { fontFamily: FONT_FAMILY, fontSize: 11, lineHeight: 17, color: color.mutedForeground },
    note: {
      borderLeftWidth: 2,
      borderLeftColor: color.border,
      paddingLeft: 10,
      marginTop: 12,
    },
    hint: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'flex-start',
      paddingVertical: 11,
      paddingHorizontal: 13,
      borderRadius: metrics.radius,
      backgroundColor: alpha('info', 0.08),
      borderWidth: 1,
      borderColor: alpha('info', 0.2),
      marginBottom: 16,
    },
    hintText: { fontFamily: FONT_FAMILY, fontSize: 12.5, lineHeight: 19, color: color.foreground, flex: 1 },

    /* ---------- 칩 ---------- */
    chips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 10 },
    chip: {
      borderWidth: 1,
      borderColor: color.border,
      borderRadius: 99,
      paddingVertical: 4,
      paddingHorizontal: 10,
      backgroundColor: color.card,
    },
    chipText: { fontFamily: FONT_FAMILY, fontSize: 11.5, color: color.mutedForeground },
    chipSrc: { backgroundColor: color.muted },
    chipSrcText: { fontWeight: '500' },

    /* ---------- 선택 칩 (공정·제품) ---------- */
    selChip: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 6,
      marginRight: 6,
      marginBottom: 6,
      paddingVertical: 7,
      paddingHorizontal: 13,
      borderWidth: 1,
      borderColor: color.border,
      borderRadius: 99,
      backgroundColor: color.card,
    },
    selChipText: { fontFamily: FONT_FAMILY, fontSize: 12.5, fontWeight: '500', color: color.foreground },
    selChipSub: { fontFamily: FONT_FAMILY, fontSize: 10.5, color: color.mutedForeground },
    selChipOn: { backgroundColor: color.primary, borderColor: 'transparent' },
    selChipOnText: { color: color.primaryForeground },
    selChipOnSub: { color: color.primaryForeground, opacity: 0.75 },
    selChipSm: { paddingVertical: 5, paddingHorizontal: 11, marginRight: 5, marginBottom: 5 },

    /* ---------- blind (데이터 마스킹) ---------- */
    blind: {
      minWidth: 62,
      borderRadius: 4,
      paddingVertical: 1,
      paddingHorizontal: 9,
      backgroundColor: color.muted,
      borderWidth: 1,
      borderColor: color.border,
      borderStyle: 'dashed',
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    blindText: {
      fontFamily: FONT_FAMILY,
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 0.44,
      color: color.mutedForeground,
    },

    /* ---------- 엑셀형 조밀 표 ---------- */
    xlsWrap: {
      borderWidth: 1,
      borderColor: color.border,
      borderRadius: metrics.radius,
      backgroundColor: color.card,
      overflow: 'hidden',
    },
    xlsRow: { flexDirection: 'row' },
    xlsCell: {
      borderWidth: 0.5,
      borderColor: color.border,
      paddingVertical: 5,
      paddingHorizontal: 9,
      justifyContent: 'center',
    },
    xlsCellText: { fontFamily: FONT_FAMILY, fontSize: 11.5, lineHeight: 17, color: color.foreground, textAlign: 'center' },
    xlsHead: { backgroundColor: color.muted },
    xlsHeadText: { fontWeight: '600' },
    xlsNum: { textAlign: 'right', fontVariant: ['tabular-nums'] },
    xlsLeft: { textAlign: 'left' },
    xlsOk: { backgroundColor: alpha('success', 0.16) },
    xlsOkText: { color: color.success, fontWeight: '700' },
    xlsWarn: { backgroundColor: alpha('warning', 0.2) },
    xlsWarnText: { color: color.warningText, fontWeight: '700' },
    xlsBad: { backgroundColor: alpha('destructive', 0.16) },
    xlsBadText: { color: color.destructive, fontWeight: '700' },
    xlsGroup: { backgroundColor: color.secondary },
    xlsGroupText: { fontWeight: '700', textAlign: 'left' },
    xlsTotal: { backgroundColor: color.secondary },
    xlsTotalText: { fontWeight: '700' },

    /* ---------- 범례 ---------- */
    legend: { flexDirection: 'row', gap: 14, alignItems: 'center', flexWrap: 'wrap' },
    legendText: { fontFamily: FONT_FAMILY, fontSize: 11.5, color: color.mutedForeground },
    legendDot: { width: 9, height: 9, borderRadius: 99, marginRight: 5 },
    legendLine: { width: 14, height: 3, borderRadius: 2, marginRight: 5 },

    /* ---------- 문서 미리보기 ---------- */
    doc: {
      backgroundColor: color.card,
      borderWidth: 1,
      borderColor: color.border,
      borderRadius: 6,
      paddingVertical: 30,
      paddingHorizontal: 34,
      maxWidth: 820,
      width: '100%',
      alignSelf: 'center',
    },
    docWide: { maxWidth: undefined, paddingVertical: 22, paddingHorizontal: 24 },
    docTitle: { fontFamily: FONT_FAMILY, fontSize: 17, fontWeight: '700', textAlign: 'center', color: color.foreground },
    docSub: {
      fontFamily: FONT_FAMILY,
      fontSize: 11.5,
      color: color.mutedForeground,
      textAlign: 'center',
      marginTop: 4,
      paddingBottom: 14,
      borderBottomWidth: 2,
      borderBottomColor: color.foreground,
      marginBottom: 16,
    },
    docSection: { marginBottom: 16 },
    docSectionHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 7 },
    docSectionTitle: { fontFamily: FONT_FAMILY, fontSize: 13, fontWeight: '700', color: color.foreground },
    editable: {
      borderWidth: 1,
      borderColor: 'transparent',
      borderRadius: 5,
      paddingVertical: 7,
      paddingHorizontal: 9,
      fontFamily: FONT_FAMILY,
      fontSize: 12.5,
      lineHeight: 22,
      color: color.foreground,
      minHeight: 34,
      ...Platform.select({ web: { outlineStyle: 'none' }, default: {} }),
    },
    editableFocus: { borderColor: color.ring, backgroundColor: color.card },

    /* ---------- 단계형 마법사 ---------- */
    steps: { flexDirection: 'row', marginBottom: 16, flexWrap: 'wrap' },
    step: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      paddingVertical: 11,
      paddingHorizontal: 15,
      borderWidth: 1,
      borderColor: color.border,
      backgroundColor: color.card,
      flex: 1,
      minWidth: 158,
    },
    stepNo: {
      width: 21,
      height: 21,
      borderRadius: 99,
      backgroundColor: color.muted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepNoText: { fontFamily: FONT_FAMILY, fontSize: 11, fontWeight: '700', color: color.mutedForeground },
    stepTitle: { fontFamily: FONT_FAMILY, fontSize: 12.5, fontWeight: '600', color: color.mutedForeground },
    stepSub: { fontFamily: FONT_FAMILY, fontSize: 10.5, color: color.mutedForeground, opacity: 0.8 },
    stepOn: { backgroundColor: color.secondary },
    stepOnNo: { backgroundColor: color.primary },
    stepOnNoText: { color: color.primaryForeground },
    stepDoneNo: { backgroundColor: color.success },
    stepDoneNoText: { color: '#fff' },
    wizFoot: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
      marginTop: 14,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: color.border,
      flexWrap: 'wrap',
    },
    pickBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 18,
      flexWrap: 'wrap',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: color.border,
      borderRadius: metrics.radius,
      backgroundColor: color.secondary,
      marginTop: 12,
    },

    /* ---------- 예측 카드 ---------- */
    pred: {
      borderWidth: 1,
      borderColor: color.border,
      borderRadius: metrics.radius,
      paddingVertical: 13,
      paddingHorizontal: 15,
      backgroundColor: color.card,
    },
    predRisk: { borderColor: alpha('destructive', 0.45), backgroundColor: alpha('destructive', 0.05) },
    predWatch: { borderColor: alpha('warning', 0.5), backgroundColor: alpha('warning', 0.07) },
    predLabel: { fontFamily: FONT_FAMILY, fontSize: 11.5, color: color.mutedForeground },
    predValue: { fontFamily: FONT_FAMILY, fontSize: 20, fontWeight: '700', color: color.foreground, marginTop: 5, letterSpacing: -0.4 },
    predCi: { fontFamily: FONT_FAMILY, fontSize: 11, color: color.mutedForeground, marginTop: 5 },

    /* ---------- 채팅 ---------- */
    msg: { flexDirection: 'row', gap: 10, maxWidth: '88%' },
    msgMe: { marginLeft: 'auto', flexDirection: 'row-reverse' },
    bubble: {
      borderWidth: 1,
      borderColor: color.border,
      borderRadius: metrics.radius,
      paddingVertical: 11,
      paddingHorizontal: 13,
      backgroundColor: color.card,
      flexShrink: 1,
    },
    bubbleMe: { backgroundColor: color.primary, borderColor: 'transparent', borderRadius: 16, borderBottomRightRadius: 4 },
    bubbleMeText: { color: color.primaryForeground },
    bubbleDeny: { borderColor: alpha('destructive', 0.35), backgroundColor: alpha('destructive', 0.06) },
    bubbleUnknown: { borderColor: alpha('warning', 0.4), backgroundColor: alpha('warning', 0.07) },
    bubbleText: { fontFamily: FONT_FAMILY, fontSize: 13.5, lineHeight: 23, color: color.foreground },
    avatarSm: {
      width: 28,
      height: 28,
      borderRadius: 99,
      backgroundColor: color.secondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarSmText: { fontFamily: FONT_FAMILY, fontSize: 11, fontWeight: '700', color: color.secondaryForeground },

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
