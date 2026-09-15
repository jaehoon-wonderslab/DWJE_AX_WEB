/**
 * [Model] 업로드 리포트 리포지토리 (DB-01 업로드 리포트 탭 · SY-16 이 버전 이력을 함께 씁니다)
 *
 * 사용 API — /api/v1/dashboard/uploads/*
 *   목록 · 버전 이력 · 파싱 데이터 는 조회(unwrap), 업로드는 명령(command).
 *   원본 내려받기는 표준 봉투가 아닌 Blob 이 돌아오므로 여기서 직접 저장합니다.
 */
import { Platform } from 'react-native';
import * as dashboardService from '@services/api/dashboardService';
import { command, unwrap } from '@services/api/request';

/** 문서 목록 — { items[] } */
export async function loadUploadDocs(params = {}) {
  const data = await unwrap(dashboardService.getDashboardUploads(params), { items: [] });
  return Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
}

/** 버전 이력 — 최신 버전이 먼저 오도록 정렬합니다 */
export async function loadUploadVersions(docId) {
  if (!docId) return [];
  const data = await unwrap(dashboardService.getDashboardUploadsByDocIdVersions({ docId }), { items: [] });
  const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
  return [...items].sort((a, b) => Number(b.version) - Number(a.version));
}

/**
 * 업로드·파싱 응답을 화면이 쓰는 한 가지 모양으로 — { docId, title, version, fileName, sizeBytes, uploadedByName, uploadedAt, parseState, sheets[], warnings[] }
 * 서버는 `parsed: { sheets, warnings }` 로 감싸 줍니다. 예전 제안(sheets 가 바로 위에)도 받습니다.
 */
export function normalizeReport(data) {
  if (!data) return null;
  const parsed = data.parsed || {};
  const sheets = Array.isArray(parsed.sheets) ? parsed.sheets : Array.isArray(data.sheets) ? data.sheets : [];
  const warnings = Array.isArray(parsed.warnings) ? parsed.warnings : Array.isArray(data.warnings) ? data.warnings : [];
  const parseState = data.parseState || (!sheets.length ? 'FAIL' : warnings.length ? 'WARN' : 'OK');
  return { ...data, version: Number(data.version), parseState, sheets, warnings };
}

/** 파싱 결과 — 업로드 응답과 같은 형태 (normalizeReport 를 거쳐 sheets · warnings 가 바로 위에 옵니다) */
export async function loadUploadData(docId, version) {
  if (!docId || !version) return null;
  const data = await unwrap(dashboardService.getDashboardUploadsByDocIdVersionsByVersionData({ docId, version }));
  return normalizeReport(data);
}

/** 업로드 명령 결과 — data 를 화면 모양(normalizeReport)으로 바꿔 돌려줍니다 */
async function uploadCommand(promise) {
  const res = await command(promise);
  return { ...res, data: res.ok ? normalizeReport(res.data) : res.data };
}

/**
 * 새 문서 업로드 — multipart { file, title, memo }
 * @returns {Promise<{ok, data:{docId,title,version,parseState,sheets,warnings,...}, message}>}
 */
export const uploadNewDoc = ({ file, title, memo }) => uploadCommand(dashboardService.postDashboardUploads({ file, title, memo }));

/** 기존 문서에 새 버전 — multipart { docId, file, memo }. 응답은 새 문서 업로드와 같은 전체 응답입니다 */
export const uploadNewVersion = ({ docId, file, memo }) => uploadCommand(dashboardService.postDashboardUploadsByDocIdVersions({ docId, file, memo }));

/**
 * 원본 엑셀 내려받기
 *
 * 실 서버는 파일 스트림(Blob)을 그대로 돌려주고, 목은 data 가 null 인 표준 응답을 줍니다.
 * @returns {Promise<{ok:boolean, message:string}>}
 */
export async function downloadUploadFile({ docId, version, fileName }) {
  if (Platform.OS !== 'web') return { ok: false, message: '앱에서는 파일 내려받기를 지원하지 않습니다 — 웹에서 이용하세요' };
  const res = await dashboardService.getDashboardUploadsByDocIdVersionsByVersionFile({ docId, version });
  if (typeof Blob !== 'undefined' && res instanceof Blob) {
    const url = URL.createObjectURL(res);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || `${docId}_v${version}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    return { ok: true, message: '원본 파일을 내려받았습니다' };
  }
  if (res?.success && !res.data) return { ok: false, message: res.message || '원본 파일이 없습니다' };
  return { ok: false, message: res?.message || '원본 파일을 내려받지 못했습니다' };
}
