/**
 * [Controller] SY-16 업로드 문서 목록 (읽기 전용)
 *
 * 대시보드 「업로드 리포트」 에 올라온 문서를 전부 보여 줍니다 — 삭제·편집은 없습니다(요구 8).
 * 버전 이력은 시스템 관리 경로(GET /system/uploads/{docId}/versions)로 받습니다 — dash-ai 권한이 없는 관리자도 볼 수 있게.
 */
import { useCallback, useMemo, useState } from 'react';
import { useAsync } from '@shared/hooks/useAsync';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadXls } from '@shared/utils/exportUtil';
import { today } from '@shared/utils/formatUtil';
import * as repo from '../model/systemRepository';

/** 한 번에 받는 건수 — 문서는 많지 않아 쪽을 나누지 않습니다 */
export const ALL_SIZE = 500;

export function useUploadDocController() {
  const toast = useUiStore((state) => state.toast);

  // 입력 중인 조건과 적용된 조건을 나눕니다 — 「조회」 를 눌러야 서버에 갑니다
  const [keyword, setKeyword] = useState('');
  const [uploadedBy, setUploadedBy] = useState('전체');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [applied, setApplied] = useState({ keyword: '', uploadedBy: '전체', from: '', to: '' });

  const { data, loading, error, reload } = useAsync(
    () => repo.loadSystemUploads({ ...applied, page: 1, size: ALL_SIZE }),
    [applied],
    { initialData: { items: [], meta: null } }
  );
  const items = data?.items || [];

  /** 업로더 선택지 — 목록에 등장한 최초 등록자·최근 업로더 이름 (서버에 별도 목록 API 가 없습니다) */
  const uploaderOptions = useMemo(() => {
    const names = new Set();
    items.forEach((d) => { if (d.updatedByName) names.add(d.updatedByName); if (d.createdByName) names.add(d.createdByName); });
    return [{ value: '전체', label: '전체' }, ...[...names].sort().map((n) => ({ value: n, label: n }))];
  }, [items]);

  /**
   * 요약 — 목록에서 계산합니다 (서버 응답은 items + meta 만).
   * 이번 달 업로드는 「이번 달에 최근 업로드가 있었던 문서 수」 입니다 — 버전 단위 집계는 문서마다 이력을 다 받아야 해 여기서는 문서로 셉니다.
   */
  const summary = useMemo(() => {
    const month = today().slice(0, 7);
    const versionCnt = items.reduce((a, d) => a + (Number(d.versionCnt) || 0), 0);
    const monthCnt = items.filter((d) => String(d.updatedAt || '').startsWith(month)).length;
    const last = items.reduce((a, d) => (String(d.updatedAt || '') > a ? String(d.updatedAt) : a), '');
    return { docCnt: items.length, versionCnt, monthCnt, lastUploadedAt: last || null };
  }, [items]);

  const search = useCallback(() => {
    if (from && to && from > to) { toast('시작일이 종료일보다 늦습니다'); return; }
    setApplied({ keyword: keyword.trim(), uploadedBy, from, to });
  }, [keyword, uploadedBy, from, to, toast]);

  const resetFilters = useCallback(() => {
    setKeyword(''); setUploadedBy('전체'); setFrom(''); setTo('');
    setApplied({ keyword: '', uploadedBy: '전체', from: '', to: '' });
  }, []);

  /** 행의 버전 이력 — 드로어가 열릴 때 부릅니다 */
  const loadVersions = useCallback((docId) => repo.loadSystemUploadVersions(docId), []);

  const exportExcel = useCallback(() => {
    downloadXls({
      name: '업로드 문서 목록',
      head: ['문서 ID', '문서명', '메모', '최신 버전', '버전 수', '최초 등록자', '최초 등록', '최근 업로더', '최근 업로드', '크기(byte)', '파싱 상태'],
      rows: items.map((d) => [d.docId, d.title, d.memo || '', d.latestVersion, d.versionCnt, d.createdByName || d.createdBy || '', d.createdAt || '', d.updatedByName || d.updatedBy || '', d.updatedAt || '', d.sizeBytes ?? '', d.parseState || '']),
    });
  }, [items]);

  return {
    loading,
    error,
    items,
    summary,
    filters: { keyword, uploadedBy, from, to },
    applied,
    uploaderOptions,
    setKeyword,
    setUploadedBy,
    setFrom,
    setTo,
    search,
    resetFilters,
    reload,
    loadVersions,
    exportExcel,
  };
}
