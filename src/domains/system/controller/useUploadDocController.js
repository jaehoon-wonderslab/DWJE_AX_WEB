/**
 * [Controller] SY-16 업로드 문서 목록 (화면 ID sys-upload-doc)
 *
 * 대시보드 「업로드 리포트」 에 올라온 문서를 조회하고, 잘못 올린 문서를 숨기거나 복원합니다(R-19 · D-13).
 * 숨기기는 소프트 삭제라 원본 파일·버전은 그대로 남고, 숨긴 문서는 대시보드·AI 패널·기본 목록에서 빠집니다.
 * 편집·버전 삭제는 없습니다.
 * 버전 이력은 시스템 관리 경로(GET /system/uploads/{docId}/versions)로 받습니다 — dash-ai 권한이 없는 관리자도 볼 수 있게.
 *
 *  · 조회 조건(검색어·업로더·파싱 상태·기간)과 쪽은 서버가 거릅니다(UPD-01). 「조회」 를 눌러야 서버에 갑니다.
 *  · 카드와 업로더 선택지는 서버 `summary`·`uploaders` 를 씁니다(UPD-06·07). 클라이언트 요약 계산은 「제거됨」.
 *    요약은 API 2단계에서 「파싱 상태 조건만 뺀 조회 조건 기준」(scope COND)이고, 기획 UPD-07 이 오면 전체 기준(scope ALL)입니다.
 *  · 엑셀은 「조회 목록(현재 쪽, 표 정렬·열 순서 그대로)」 과 「전체(size=0, 10,000건 상한)」 두 가지입니다(UPD-15).
 *    내려받기는 조회 권한이면 됩니다 — 쓰기 권한을 보지 않습니다(R-10).
 *  · 숨기기·복원은 쓰기 권한(canWrite('sys-upload-doc'), 서버 requireWrite)이 있어야 합니다. 없으면 단추를 비활성으로 둡니다.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { useAsync } from '@shared/hooks/useAsync';
import { usePaging } from '@shared/hooks/usePaging';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadXls } from '@shared/utils/exportUtil';
import { formatBytes, parseStateOf } from '@domains/dashboard/model/uploadReportModel';
import { buildGridExport } from '../model/gridExport';
import * as repo from '../model/systemRepository';

/* 「ALL_SIZE = 500 으로 한 번에 받기」 는 제거됨 — 서버 쪽 나눔(UPD-01)으로 바꿨습니다 */

/** 화면 ID — 다운로드 이력의 「화면」 칸 */
const MENU_ID = 'sys-upload-doc';
/** 「전체 다운로드」 상한 (공통 D-29 「그 밖 10,000행」) */
export const EXPORT_ALL_LIMIT = 10000;
/** 파싱 상태 선택지 — 값은 공통코드 DASH_UPLOAD_PARSE 코드, 표시는 화면 표시명(기획 8장 Q8 결정 전까지 현행 표기) */
export const PARSE_STATE_OPTIONS = [
  { value: '전체', label: '전체' },
  ...['OK', 'WARN', 'FAIL'].map((c) => ({ value: c, label: parseStateOf(c).label })),
];

/** 쓰기 권한이 없을 때 안내 (공통 문서 9.7 · R-06) */
export const WRITE_DENIED_TEXT = '미배정 계정은 이 동작을 할 수 없습니다. 전산팀에 부서 배정을 요청하세요.';
/** 숨기는 사유 상한 (R-19 — 서버 200자, 초과 400) */
export const HIDE_REASON_MAX = 200;

const EMPTY_FILTERS = { keyword: '', uploadedBy: '전체', parseState: '전체', from: '', to: '' };

/**
 * 엑셀 열 — 그리드 열(필드명 = attrs)과 그리드에 없는 내보내기 전용 열.
 * 「조회 목록」 은 그리드 열 순서를 따르고 전용 열을 뒤에 붙입니다. 「전체」 는 이 정의 순서 그대로입니다.
 */
const GRID_DEFS = {
  title: { head: '문서명' },
  latestVersion: { head: '최신 버전' },
  versionCnt: { head: '버전 수' },
  createdByName: { head: '최초 등록자', value: (d) => d.createdByName || d.createdBy || '' },
  updatedByName: { head: '최근 업로더', value: (d) => d.updatedByName || d.updatedBy || '' },
  updatedAt: { head: '최근 업로드' },
  sizeBytes: { head: '크기', value: (d) => formatBytes(d.sizeBytes) },
  parseState: { head: '파싱 상태', value: (d) => (d.parseState ? parseStateOf(d.parseState).label : '') },
};
const EXPORT_EXTRAS = [
  { attr: 'docId', head: '문서 ID' },
  { attr: 'memo', head: '메모' },
  { attr: 'createdAt', head: '최초 등록' },
  { attr: 'sizeBytes', head: '크기(byte)', always: true },
  { attr: 'fileName', head: '최신 파일명' },
  // 숨긴 문서 포함으로 조회한 경우 (R-19)
  { attr: 'deleted', head: '숨김', value: (d) => (d.deleted ? '숨김' : '') },
  { attr: 'deleteReason', head: '숨긴 사유', value: (d) => (d.deleted ? [d.deleteReason, d.deletedByName, d.deletedAt].filter(Boolean).join(' · ') : '') },
];

/** 조회 조건 요약 — 다운로드 이력의 cond_summary */
function condText(applied, uploaderLabel, meta) {
  const parts = [];
  if (applied.keyword) parts.push(`검색어=${applied.keyword}`);
  if (applied.uploadedBy && applied.uploadedBy !== '전체') parts.push(`업로더=${uploaderLabel || applied.uploadedBy}`);
  if (applied.parseState && applied.parseState !== '전체') parts.push(`파싱 상태=${parseStateOf(applied.parseState).label}`);
  if (applied.from || applied.to) parts.push(`기간=${applied.from || ''}~${applied.to || ''}`);
  parts.push(`쪽 ${meta?.page || 1}/${Math.max(1, meta?.totalPages || 1)}`);
  return parts.join(' · ');
}

export function useUploadDocController() {
  const toast = useUiStore((state) => state.toast);

  // 입력 중인 조건과 적용된 조건을 나눕니다 — 「조회」 를 눌러야 서버에 갑니다
  const [keyword, setKeyword] = useState('');
  const [uploadedBy, setUploadedBy] = useState('전체');
  const [parseState, setParseState] = useState('전체');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [applied, setApplied] = useState(EMPTY_FILTERS);

  // 숨긴 문서 포함 (R-19) — 체크하면 바로 다시 조회합니다. false 는 보내지 않습니다(서버 기본 false)
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const toggleIncludeDeleted = useCallback(() => setIncludeDeleted((v) => !v), []);

  const paging = usePaging({ resetKey: `${JSON.stringify(applied)}|${includeDeleted}` });
  const { data, loading, error, reload } = useAsync(
    () => repo.loadSystemUploads({ ...applied, includeDeleted: includeDeleted || undefined, ...paging.params }),
    [applied, includeDeleted, paging.page, paging.size],
    // 기간 오류(400) 같은 서버 메시지는 FormAlert 로 보여 주므로 토스트를 겹치지 않습니다
    { initialData: { items: [], meta: null, summary: null, uploaders: null }, silent: true }
  );
  const items = data?.items || [];
  const meta = data?.meta || null;
  const summary = data?.summary || null;

  /**
   * 업로더 선택지 — 서버 `uploaders`(문서 전체 기준, 값은 사번). 동명이인은 「이름 (사번)」.
   * 한 번 받은 목록은 기억해 둡니다 — 조회가 실패해도 선택지가 사라지지 않게.
   * 서버가 아직 `uploaders` 를 주지 않으면 지금 목록의 이름으로 만듭니다(이름 부분 일치 — 서버 하위 호환).
   */
  const lastUploaders = useRef(null);
  if (data?.uploaders) lastUploaders.current = data.uploaders;
  const uploaderOptions = useMemo(() => {
    const list = lastUploaders.current;
    if (list) {
      const nameCnt = {};
      list.forEach((u) => { nameCnt[u.userName] = (nameCnt[u.userName] || 0) + 1; });
      return [
        { value: '전체', label: '전체' },
        ...list.map((u) => ({ value: String(u.userId), label: nameCnt[u.userName] > 1 ? `${u.userName} (${u.userId})` : (u.userName || String(u.userId)) })),
      ];
    }
    const names = new Set();
    items.forEach((d) => { if (d.updatedByName) names.add(d.updatedByName); if (d.createdByName) names.add(d.createdByName); });
    return [{ value: '전체', label: '전체' }, ...[...names].sort().map((n) => ({ value: n, label: n }))];
  }, [data?.uploaders, items]); // eslint-disable-line react-hooks/exhaustive-deps

  const search = useCallback(() => {
    if (from && to && from > to) { toast('조회 시작일이 종료일보다 늦습니다'); return; }
    setApplied({ keyword: keyword.trim(), uploadedBy, parseState, from, to });
  }, [keyword, uploadedBy, parseState, from, to, toast]);

  const resetFilters = useCallback(() => {
    setKeyword(''); setUploadedBy('전체'); setParseState('전체'); setFrom(''); setTo('');
    setApplied(EMPTY_FILTERS);
  }, []);

  /** 조건을 하나라도 걸었는지 — 빈 표 문구를 「조건을 넓혀 보십시오」 로 바꿉니다 */
  const filtered = Object.keys(EMPTY_FILTERS).some((k) => applied[k] !== EMPTY_FILTERS[k]);
  /** 파싱 상태 말고 다른 조건이 걸렸는지 — COND 요약이 「전체」 와 같은지 판정합니다 */
  const filteredExceptState = Object.keys(EMPTY_FILTERS).some((k) => k !== 'parseState' && applied[k] !== EMPTY_FILTERS[k]);
  /** 「전체 다운로드(N건)」 의 N — 전체 기준 요약이거나 COND 요약이 전체와 같을 때만, 아니면 건수 생략(공통 규칙) */
  const exportTotal = summary && (summary.scope === 'ALL' || !filteredExceptState) ? summary.docCnt : undefined;

  /** 행의 버전 이력 — 드로어가 열릴 때 부릅니다 */
  const loadVersions = useCallback((docId) => repo.loadSystemUploadVersions(docId), []);

  // ── 엑셀 (조회 목록 / 전체) ─────────────────────────────
  /** 뷰가 TabulatorGrid 의 instanceRef 로 넘겨주는 표 인스턴스 — 「조회 목록」 이 표의 정렬·열 순서를 읽습니다 */
  const gridRef = useRef(null);
  const uploaderLabel = uploaderOptions.find((o) => o.value === applied.uploadedBy)?.label;

  const exportView = useCallback(async () => {
    if (!items.length) { toast('내려받을 행이 없습니다 — 「전체 다운로드」 는 조건과 관계없이 받을 수 있습니다'); return; }
    const out = buildGridExport({ instance: gridRef.current, rows: items, defs: GRID_DEFS, extras: EXPORT_EXTRAS });
    await downloadXls({
      name: '업로드 문서 목록',
      ...out,
      scope: 'VIEW',
      condSummary: `${condText(applied, uploaderLabel, meta)}${includeDeleted ? ' · 숨긴 문서 포함' : ''}`,
      menuId: MENU_ID,
    });
  }, [items, applied, includeDeleted, uploaderLabel, meta, toast]);

  const exportAll = useCallback(async () => {
    try {
      // 조회 조건과 쪽을 모두 무시하고 숨김 제외 전 문서 (UPD-15)
      const all = await repo.loadSystemUploads({ page: 1, size: 0 });
      const rows = all.items.slice(0, EXPORT_ALL_LIMIT);
      if (all.meta?.truncated || all.items.length > EXPORT_ALL_LIMIT) {
        toast(`상한 ${EXPORT_ALL_LIMIT.toLocaleString('ko-KR')}건까지 내려받았습니다`);
      }
      const out = buildGridExport({ rows, defs: GRID_DEFS, extras: EXPORT_EXTRAS });
      await downloadXls({ name: '업로드 문서 목록', ...out, scope: 'ALL', condSummary: '조건 무시(전체)', menuId: MENU_ID });
    } catch (e) {
      toast(e?.message || '업로드 문서 목록을 내려받지 못했습니다');
    }
  }, [toast]);

  // ── 숨기기 · 복원 (R-19 · D-13) ───────────────────────
  const canWriteFn = useAuthStore((state) => state.canWrite);
  /** 쓰기 권한 — 없으면 뷰가 단추를 비활성으로 두고 툴팁을 띄웁니다. 서버 403(E-AUTH-004)이 정본입니다 */
  const canWrite = canWriteFn(MENU_ID);
  const busy = useRef(new Set());

  /** 숨기기 — 사유 필수·200자(폼이 먼저 막고 서버도 400). 성공하면 다시 조회합니다 */
  const hideDoc = useCallback(async (docId, reason) => {
    if (!canWrite) { toast(WRITE_DENIED_TEXT); return { ok: false }; }
    const text = String(reason || '').trim();
    if (!text) { toast('숨기는 사유를 입력하세요'); return { ok: false }; }
    if (text.length > HIDE_REASON_MAX) { toast(`사유는 ${HIDE_REASON_MAX}자까지 쓸 수 있습니다`); return { ok: false }; }
    if (busy.current.has(docId)) return { ok: false };
    busy.current.add(docId);
    try {
      const res = await repo.hideUploadDoc(docId, text);
      toast(res.message || (res.ok ? '문서를 숨겼습니다' : '문서를 숨기지 못했습니다'));
      if (res.ok) reload();
      return res;
    } finally {
      busy.current.delete(docId);
    }
  }, [canWrite, toast, reload]);

  /** 복원 — 숨기지 않은 문서는 서버가 409 */
  const restoreDoc = useCallback(async (docId) => {
    if (!canWrite) { toast(WRITE_DENIED_TEXT); return { ok: false }; }
    if (busy.current.has(docId)) return { ok: false };
    busy.current.add(docId);
    try {
      const res = await repo.restoreUploadDoc(docId);
      toast(res.message || (res.ok ? '문서를 복원했습니다' : '문서를 복원하지 못했습니다'));
      if (res.ok) reload();
      return res;
    } finally {
      busy.current.delete(docId);
    }
  }, [canWrite, toast, reload]);

  return {
    loading,
    error,
    items,
    meta,
    summary,
    filtered,
    exportTotal,
    filters: { keyword, uploadedBy, parseState, from, to },
    applied,
    uploaderOptions,
    parseStateOptions: PARSE_STATE_OPTIONS,
    setKeyword,
    setUploadedBy,
    setParseState,
    setFrom,
    setTo,
    search,
    resetFilters,
    reload,
    paging,
    loadVersions,
    gridRef,
    exportView,
    exportAll,
    // 숨기기 · 복원 (R-19)
    includeDeleted,
    toggleIncludeDeleted,
    canWrite,
    writeDeniedText: WRITE_DENIED_TEXT,
    hideReasonMax: HIDE_REASON_MAX,
    hideDoc,
    restoreDoc,
  };
}
