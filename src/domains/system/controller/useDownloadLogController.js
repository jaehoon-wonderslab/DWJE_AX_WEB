/**
 * [Controller] SY-14 보고서 다운로드 이력
 *
 * 인쇄·PDF 출력도 함께 기록되며, 권한 밖 값은 파일에 「비공개」 로 채워진 채 그 셀 수가 남습니다.
 *
 * ■ 2026-10-01 개편 (기획 10 DLG-03 · 05 · 06 · 08 · 09 · 10 · 12 · 15 · 16)
 * - 「보고서」 선택 → 「화면」 선택(menuId). 선택지는 메뉴 순서대로 「그룹 · 화면」 (동작 권한 행 제외)
 * - 「범위」 선택(조회 목록 VIEW · 전체 다운로드 ALL · 미상), 「계정·검색어」(Enter·「조회」 에서만 반영), 「blind 포함만」
 * - 요약 카드에 조회 조건을 함께 넘깁니다(카드 수 = 표 total)
 * - 부제는 서버 total 기준 「전체 N건 중 최근 n건」 — 받아 온 건수가 한도라서 잘렸는지는 total 로 판정
 * - 엑셀은 옵션 패널 두 항목(공통 10.6) — 조회 목록 = 그리드 정렬·열 순서·열 필터 그대로(VIEW),
 *   전체 = 서버 생성(조건 무관, 상한 50,000, ALL — 서버가 기록). 받은 뒤 목록을 다시 불러 방금 기록이 보이게 합니다.
 * - 이 화면에는 데이터를 바꾸는 동작이 없어 쓰기 권한(R-06)과 무관합니다.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { labelOf, loadCodeGroups } from '@domains/common/model/codeRepository';
import { permRows } from '@shared/constants/menu';
import { useAsync } from '@shared/hooks/useAsync';
import { firstError } from '@services/api/request';
import { recentDays } from '@shared/stores/useAppStore';
import { downloadXls } from '@shared/utils/exportUtil';
import * as repo from '../model/systemRepository';
import { gridCount, gridExport } from './gridExport';

/**
 * 한 번에 받아 오는 건수 — 쪽을 나누지 않고 조회 조건에 맞는 기록을 전부 표에 놓습니다 (2026-09-08 요청).
 * 서버가 `meta` 를 주지 않아 쪽 나눔이 동작하지 않았고, 사용자는 "최근 10건만 보인다" 로 느꼈습니다.
 * 이 수를 넘게 쌓이면 표 부제에 알립니다 — 조회 기간을 좁히거나 전체 다운로드로 받으라는 뜻입니다.
 */
export const ALL_SIZE = 1000;

/**
 * 화면 선택지 — 메뉴 순서대로 「그룹 · 화면」 (DLG-03). 동작 권한 행(dash-ai-upload)은 화면이 아니라 뺍니다.
 * 보고서 7종만 고를 수 있던 예전 「보고서」 선택은 「제거됨」 — 화면 선택이 보고서까지 포함합니다.
 */
const SCREEN_OPTIONS = permRows()
  .filter((r) => !r.sub)
  .map((r) => ({ value: r.id, label: `${r.group} · ${r.name}` }));

/** 형식 코드 기본 표시명 — 공통코드 RPT_FORMAT 을 못 받았을 때(목 모드 등)만 씁니다 (DLG-02) */
const FORMAT_FALLBACK = [
  { value: 'XLS', label: '엑셀 (.xls)' },
  { value: 'XLSX', label: '엑셀 (.xlsx)' },
  { value: 'CSV', label: 'CSV (.csv)' },
  { value: 'PDF', label: '인쇄 · PDF' },
  { value: 'PNG', label: '이미지 (.png)' },
  { value: 'JSONL', label: '학습데이터 (.jsonl)' },
];

/** 내려받기 범위 (DLG-15) — 서버 파라미터 scopeCd. 미상 = 2026-10 이전 기록(scope_cd NULL) */
export const SCOPE_OPTIONS = [
  { value: '전체', label: '전체' },
  { value: 'VIEW', label: '조회 목록' },
  { value: 'ALL', label: '전체 다운로드' },
  { value: 'UNKNOWN', label: '미상' },
];
/** 범위 코드 → 표 칸 표시 */
export const scopeLabel = (cd) => (cd === 'VIEW' ? '조회 목록' : cd === 'ALL' ? '전체' : '—');
/** 출처 코드 → 표 칸 표시 (DLG-05) */
/** 출처 선택지 (DLG-09) — 서버 파라미터 origin. 미상 = 2026-10 이전 기록(origin NULL) */
export const ORIGIN_OPTIONS = [
  { value: '전체', label: '전체' },
  { value: 'CLIENT', label: '브라우저' },
  { value: 'SERVER', label: '서버' },
  { value: 'UNKNOWN', label: '미상' },
];
export const originLabel = (cd) => (cd === 'CLIENT' ? '브라우저' : cd === 'SERVER' ? '서버' : '—');

/** attrs 없이 만든 파일인지 — 이력 params.note 에 'attrs-missing' (DLG-15) */
export const isAttrsMissing = (params) => {
  if (!params) return false;
  if (typeof params === 'string') return params.includes('attrs-missing');
  return params.note === 'attrs-missing';
};

/**
 * 화면 ID(menuId) → { name: 메뉴명, path: 페이지 URL }
 *
 * 메뉴에 있는 ID 면 메뉴명과 경로를, 없으면(예전 기록의 RPT_DAILY_PROD 같은 코드) 그 값을 이름 자리에
 * 그대로, 비어 있으면 null 을 돌려줍니다.
 */
export const screenInfo = (menuId) => {
  if (!menuId) return null;
  const row = permRows().find((r) => r.id === menuId);
  return row ? { name: row.name, path: row.path } : { name: menuId, path: null };
};

/** 화면 ID → 한 줄 문자열 (엑셀용) — 「메뉴명 (/경로)」 */
export const screenLabel = (menuId) => {
  const info = screenInfo(menuId);
  return info ? (info.path ? `${info.name} (${info.path})` : info.name) : '—';
};

/** 행 하나 — 2026-10 이전 브라우저 기록은 화면 ID 가 reportId 에 들어 있으므로 menuId 가 비면 그것을 씁니다 */
const normalize = (r) => ({ ...r, menuId: r.menuId || r.reportId || null, condSummary: r.condSummary ?? r.scope ?? '' });

export function useDownloadLogController() {
  // 내려받기 이력도 시스템 기록입니다 (실적 기준일과 무관 · 오늘 기준). 기본 기간은 감사 로그와 같은 최근 7일(DLG-09)
  const [from, setFrom] = useState(recentDays(7).from);
  const [to, setTo] = useState(recentDays(7).to);
  const [menuId, setMenuId] = useState('전체');
  const [deptId, setDeptId] = useState('전체');
  const [format, setFormat] = useState('전체');
  const [scopeCd, setScopeCd] = useState('전체');
  const [blindOnly, setBlindOnly] = useState(false);
  const [origin, setOrigin] = useState('전체');
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');

  /** 그리드 인스턴스 — 「조회 목록」 이 지금 정렬·열 순서·열 필터 결과를 읽습니다 */
  const gridRef = useRef(null);

  // 부서는 서버 부서 목록(ID), 형식은 공통코드 RPT_FORMAT(XLS · XLSX · CSV · PDF · PNG)이 정본입니다
  const { data: deptOptions } = useAsync(repo.loadDeptIdOptions, [], { silent: true, initialData: [] });
  const { data: codes } = useAsync(() => loadCodeGroups('RPT_FORMAT'), [], { silent: true, initialData: {} });
  const formatCodes = codes?.RPT_FORMAT?.length ? codes.RPT_FORMAT : FORMAT_FALLBACK;

  // 서버 파라미터 이름은 menuId · deptId · format · scopeCd 입니다 ('전체' 는 client 가 요청에서 걸러 냅니다)
  const { data, loading, reload } = useAsync(
    () => repo.loadDownloadLogs({
      from, to, menuId, deptId, format, scopeCd, keyword, origin,
      ...(blindOnly ? { blindOnly: true } : {}),
      page: 1, size: ALL_SIZE,
    }),
    [from, to, menuId, deptId, format, scopeCd, keyword, origin, blindOnly],
    { silent: true }
  );
  // 보관 중 전체 건수 — 「전체 다운로드(N건)」 의 N (보존 정책 응답의 totalCnt, DLG-16)
  const { data: policy, reload: reloadPolicy } = useAsync(repo.fetchRetentionPolicy, [], { silent: true });

  const listError = data?.errors?.list || null;
  const items = useMemo(() => (listError ? [] : (data?.list?.items || []).map(normalize)), [data, listError]);
  const total = listError ? 0 : data?.listMeta?.total ?? items.length;
  const rawSummary = data?.summary;

  /**
   * 요약 — 서버 필드(totalCnt · todayCnt)를 화면 이름으로 맞춥니다.
   * blind 포함 · 최다 이용 · 계정별 이용은 2026-09-08 요청으로 화면에서 빼서 더 다루지 않습니다.
   */
  const summary = rawSummary
    ? {
        total: rawSummary.totalCnt ?? rawSummary.total ?? 0,
        today: rawSummary.todayCnt ?? rawSummary.today ?? 0,
      }
    : null;

  /** 형식 코드 → 표시명 (XLS → 엑셀 (.xls)). 이미 표시명으로 저장된 예전 기록은 그대로 */
  const formatLabel = useCallback((code) => (code ? labelOf(formatCodes, code) : '—'), [formatCodes]);

  // ── 그리드에 보이는 행 수 (열 필터 적용 후) — 「조회 목록 다운로드(n건)」 의 n ──
  const [viewCount, setViewCount] = useState(null);
  const boundGrid = useRef(null);
  useEffect(() => {
    setViewCount(items.length);
    // 표는 자료가 그려진 뒤 만들어지므로 한 박자 늦게 붙입니다
    const t = setTimeout(() => {
      const table = gridRef.current;
      if (!table || boundGrid.current === table || typeof table.on !== 'function') return;
      boundGrid.current = table;
      table.on('dataFiltered', (_filters, rows) => setViewCount(rows.length));
      const n = gridCount(table);
      if (n != null) setViewCount(n);
    }, 300);
    return () => clearTimeout(t);
  }, [items, formatLabel]);

  /** 입력칸(계정·검색어)을 조회 조건에 반영합니다 — 「조회」 토스트는 즉시 조회와 겹쳐 뺐습니다(DLG-12) */
  const search = useCallback(() => {
    const k = keywordInput.trim();
    if (k === keyword) reload();
    else setKeyword(k);
  }, [keywordInput, keyword, reload]);

  /** 엑셀 이력의 조건 요약 — 「{from}~{to} · 화면 · 부서 · 형식 · 검색어」 (DLG-16) */
  const condSummary = useMemo(() => {
    const deptName = deptId === '전체' ? '전체' : (deptOptions || []).find((d) => String(d.value) === String(deptId))?.label || deptId;
    return [
      `${from}~${to}`,
      `화면 ${menuId === '전체' ? '전체' : screenInfo(menuId)?.name || menuId}`,
      `부서 ${deptName}`,
      `형식 ${format === '전체' ? '전체' : formatLabel(format)}`,
      `범위 ${SCOPE_OPTIONS.find((o) => o.value === scopeCd)?.label || '전체'}`,
      `검색어 ${keyword || '없음'}`,
      ...(origin !== '전체' ? [`출처 ${ORIGIN_OPTIONS.find((o) => o.value === origin)?.label || origin}`] : []),
      ...(blindOnly ? ['blind 포함만'] : []),
    ].join(' · ');
  }, [from, to, menuId, deptId, format, scopeCd, keyword, origin, blindOnly, deptOptions, formatLabel]);

  /** 엑셀 열 — 표와 같은 순서, attr 는 응답 필드명(마스킹 판정, R-10 · DLG-16) */
  const exportCols = useMemo(() => [
    { field: 'ts', head: '일시' },
    { field: 'empNo', head: '계정' },
    { field: 'name', head: '이름' },
    { field: 'dept', head: '부서' },
    { field: 'report', head: '보고서' },
    { field: 'menuId', head: '화면', value: (d) => screenLabel(d.menuId) },
    { field: 'format', head: '형식', value: (d) => formatLabel(d.format) },
    { field: 'scopeCd', head: '범위', value: (d) => scopeLabel(d.scopeCd) },
    { field: 'condSummary', head: '조회 조건' },
    { field: 'rowCnt', head: '행 수' },
    { field: 'blindCnt', head: 'blind 항목', value: (d) => d.blindCnt ?? 0 },
    { field: 'origin', head: '출처', value: (d) => originLabel(d.origin) },
    { field: 'ip', head: 'IP' },
  ], [formatLabel]);

  /** 받은 뒤 목록을 다시 불러 방금 기록이 맨 위에 보이게 합니다 (DLG-12) */
  const afterExport = useCallback(() => {
    reload();
    reloadPolicy();
  }, [reload, reloadPolicy]);

  /** 조회 목록 다운로드 — 그리드에 보이는 행 전체를 지금 정렬·열 순서대로 (DLG-16) */
  const exportView = useCallback(async () => {
    const t = gridExport(gridRef.current, exportCols, items);
    const saved = await downloadXls({
      name: '보고서 다운로드 이력',
      head: t.head,
      attrs: t.attrs,
      rows: t.rows,
      scope: 'VIEW',
      condSummary,
      menuId: 'sys-dl',
    });
    if (saved) afterExport();
  }, [exportCols, items, condSummary, afterExport]);

  /** 전체 다운로드 — 서버 생성(조건 무관, 상한 50,000). 이력은 서버가 남깁니다 (DLG-08) */
  const exportAll = useCallback(async () => {
    const ok = await repo.exportDownloadLogsAll();
    if (ok) afterExport();
  }, [afterExport]);

  /** 기록 상세 — 상세 API 가 실패하면 목록 값으로 보여 줍니다 (DLG-10) */
  const loadDetail = useCallback(async (row) => {
    if (!row?.dlId) return { ...row, detailMissing: true };
    try {
      const d = await repo.fetchDownloadLog(row.dlId);
      return d ? normalize({ ...row, ...d }) : { ...row, detailMissing: true };
    } catch (e) {
      return { ...row, detailMissing: true, detailError: e?.message };
    }
  }, []);

  return {
    loading,
    items,
    total,
    /** 받아 온 건수가 서버 total 보다 적은지 — 한도(ALL_SIZE)에서 잘렸다는 뜻입니다 (DLG-08) */
    capped: total > items.length,
    summary,
    summaryError: data?.errors?.summary || null,
    loadError: listError || (data && !data.list && firstError(data)) || null,
    gridRef,
    viewCount: viewCount ?? items.length,
    totalCount: policy?.totalCnt ?? null,
    filters: { from, to, menuId, deptId, format, scopeCd, origin, keyword: keywordInput, blindOnly },
    screenOptions: [{ value: '전체', label: '전체' }, ...SCREEN_OPTIONS],
    deptOptions: [{ value: '전체', label: '전체' }, ...(deptOptions || [])],
    formatOptions: [{ value: '전체', label: '전체' }, ...formatCodes],
    scopeOptions: SCOPE_OPTIONS,
    originOptions: ORIGIN_OPTIONS,
    formatLabel,
    screenLabel,
    setFrom,
    setTo,
    setMenuId,
    setDeptId,
    setFormat,
    setScopeCd,
    setOrigin,
    setKeyword: setKeywordInput,
    toggleBlindOnly: () => setBlindOnly((v) => !v),
    search,
    reload,
    exportView,
    exportAll,
    loadDetail,
    loadPolicy: repo.fetchRetentionPolicy,
  };
}
