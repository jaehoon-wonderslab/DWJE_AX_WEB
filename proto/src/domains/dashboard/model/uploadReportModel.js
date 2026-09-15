/**
 * [Model] 업로드 리포트 — 순수 변환 (DB-01 업로드 리포트 탭)
 *
 * 서버가 엑셀을 파싱해 돌려준 **블록 배열**을 차트·표 컴포넌트가 받는 모양으로 바꿉니다.
 *
 *   블록 = { title, chartType: line|bar|grouped|donut|table, x, columns[], series[], rows[] }
 *   · columns = 시트 1행 헤더 전체 (문자 열 포함) · x = 첫 열 헤더 · series = 차트에 그릴 숫자 열 헤더
 *   · rows[]  = { [헤더명]: 값 } — 정수·소수는 숫자, 날짜는 'yyyy-MM-dd' 문자열
 *   · 시리즈 항목이 { key, label, unit } 객체로 와도 받습니다 (예전 제안 형태)
 *
 * 포맷 엑셀이 확정되어 서버 파서가 바뀌어도 이 계약이 유지되면 화면은 그대로입니다
 * (요청 docs/requests/REQ_20260910_ai_panel_upload_aoi.md B2-6 · API 회신 2026-09-10).
 */

/** 지원하는 차트 종류 — 이 밖의 값은 표로 그립니다 */
export const CHART_TYPES = ['line', 'bar', 'grouped', 'donut', 'table'];

export const CHART_TYPE_LABEL = { line: '선 그래프', bar: '막대', grouped: '그룹 막대', donut: '도넛', table: '표' };

/** 파싱 상태 코드 → 표시 */
export const PARSE_STATE = {
  OK: { label: '정상', tone: 'green' },
  WARN: { label: '경고', tone: 'amber' },
  FAIL: { label: '실패', tone: 'red' },
};

export const parseStateOf = (code) => PARSE_STATE[code] || { label: code || '—', tone: '' };

/** 바이트 → 사람이 읽는 크기 (48213 → 47.1 KB) */
export function formatBytes(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return '—';
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`;
  return `${(v / 1024 / 1024).toFixed(2)} MB`;
}

/** 숫자면 숫자로, 아니면 null (빈 칸 · 문자열 · NaN) */
export function toNum(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** 블록 종류 정리 — 모르는 값은 table 로 */
export const blockType = (block) => (CHART_TYPES.includes(block?.chartType) ? block.chartType : 'table');

/** 시리즈 정의 정리 — 서버는 헤더명 문자열 배열을 줍니다. 객체 { key, label, unit } 도 받습니다 */
export function seriesOf(block) {
  return (block?.series || [])
    .map((s) => (typeof s === 'string' ? { key: s, label: s, unit: '' } : s))
    .filter((s) => s && s.key);
}

/** 헤더 전체 — 없으면 x + 시리즈로 대신합니다 */
export function columnsOf(block) {
  const cols = Array.isArray(block?.columns) && block.columns.length ? block.columns.map(String) : null;
  if (cols) return cols;
  return [xKeyOf(block), ...seriesOf(block).map((s) => s.key)].filter(Boolean);
}

/** x 열의 헤더명 — 행에서 `row[x]` 로 읽습니다 (예전 형태 `row.x` 도 받습니다) */
export const xKeyOf = (block) => (block?.x ? String(block.x) : 'x');
export const xOf = (block, row) => {
  const k = xKeyOf(block);
  const v = row?.[k] !== undefined ? row[k] : row?.x;
  return v === null || v === undefined ? '' : String(v);
};

/** 블록의 대표 단위 — 첫 시리즈의 단위 (모두 같을 때만 축에 씁니다) */
export function blockUnit(block) {
  const units = [...new Set(seriesOf(block).map((s) => s.unit || ''))];
  return units.length === 1 ? units[0] : '';
}

/**
 * 문서 드롭다운 항목 — 「제목 · v최신 · 업로더 · 일시」
 * @param {object} doc getDashboardUploads 항목
 */
export function docOptionLabel(doc) {
  const parts = [doc.title, doc.latestVersion ? `v${doc.latestVersion}` : null, doc.updatedByName || null, doc.updatedAt ? String(doc.updatedAt).slice(0, 16) : null];
  return parts.filter(Boolean).join(' · ');
}

/**
 * 버전 드롭다운 항목 — 「v2 · 업로더 · 일시 · 경고 n」
 * @param {object} v getDashboardUploadsByDocIdVersions 항목
 */
export function versionOptionLabel(v) {
  const parts = [`v${v.version}`, v.uploadedByName || null, v.uploadedAt ? String(v.uploadedAt).slice(0, 16) : null, v.warningCnt ? `경고 ${v.warningCnt}` : null];
  return parts.filter(Boolean).join(' · ');
}

/* ───────── 블록 → 차트 props ───────── */

/** line — LineChart { labels, series[{name,data}], unit } */
export function toLineProps(block) {
  const rows = block.rows || [];
  return {
    labels: rows.map((r) => xOf(block, r)),
    series: seriesOf(block).map((s) => ({ name: s.label || s.key, data: rows.map((r) => toNum(r[s.key])) })),
    unit: blockUnit(block),
  };
}

/**
 * bar — BarChart { data[{l,v,v2}], unit }
 * 시리즈가 1~2개일 때만 막대로 그립니다. 3개 이상이면 호출하는 쪽이 grouped 로 돌립니다.
 */
export function toBarProps(block) {
  const [s0, s1] = seriesOf(block);
  const rows = block.rows || [];
  return {
    data: rows.map((r) => ({ l: xOf(block, r), v: s0 ? toNum(r[s0.key]) : null, v2: s1 ? toNum(r[s1.key]) : null })),
    unit: blockUnit(block),
    names: [s0?.label || s0?.key, s1?.label || s1?.key].filter(Boolean),
  };
}

/** grouped — GroupedBarChart { data[{label, ...}], metrics[{key,label}], unit } */
export function toGroupedProps(block) {
  const series = seriesOf(block);
  return {
    data: (block.rows || []).map((r) => {
      const out = { label: xOf(block, r) };
      series.forEach((s) => { out[s.key] = toNum(r[s.key]); });
      return out;
    }),
    metrics: series.map((s) => ({ key: s.key, label: s.label || s.key })),
    unit: blockUnit(block),
  };
}

/** donut — DonutChart { segs[{l,v}], unitLabel } (첫 시리즈만) */
export function toDonutProps(block) {
  const [s0] = seriesOf(block);
  return {
    segs: (block.rows || []).map((r) => ({ l: xOf(block, r), v: s0 ? toNum(r[s0.key]) : null })),
    unitLabel: blockUnit(block) || '',
  };
}

/**
 * table — TabulatorGrid 열·행. 헤더 전체(`columns`)를 순서대로 놓습니다 — 문자 열(고객사 · 판정)도 표에는 다 보입니다.
 * 헤더명에 `.` 이 있으면 Tabulator 가 중첩 필드로 읽으므로 필드는 `c0, c1, …` 로 바꿔 씁니다.
 * 숫자 열은 오른쪽 맞춤 · 숫자 정렬. 셀 표기는 뷰(formatter)가 맡습니다.
 */
export function toTableProps(block) {
  const headers = columnsOf(block);
  const src = block.rows || [];
  const isNumeric = (h) => src.some((r) => toNum(r[h]) !== null) && src.every((r) => r[h] === null || r[h] === undefined || r[h] === '' || toNum(r[h]) !== null);
  const columns = headers.map((h, i) => ({
    title: h,
    field: `c${i}`,
    minWidth: i === 0 ? 140 : 96,
    hozAlign: isNumeric(h) ? 'right' : 'left',
    sorter: isNumeric(h) ? 'number' : 'string',
    numeric: isNumeric(h),
  }));
  const rows = src.map((r, ri) => {
    const out = { __i: ri };
    headers.forEach((h, i) => { out[`c${i}`] = r[h] !== undefined ? r[h] : (i === 0 ? r.x : undefined); });
    return out;
  });
  return { columns, rows };
}

/**
 * 블록을 어떤 방식으로 그릴지 최종 판정합니다.
 * bar 인데 시리즈가 3개 이상이면 grouped 로, 시리즈가 없으면 table 로 돌립니다.
 */
export function renderKind(block) {
  const type = blockType(block);
  const n = seriesOf(block).length;
  if (!n || !(block.rows || []).length) return 'table';
  if (type === 'bar' && n > 2) return 'grouped';
  return type;
}
