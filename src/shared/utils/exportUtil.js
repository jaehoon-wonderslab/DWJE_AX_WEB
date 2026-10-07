/**
 * 내려받기 · 인쇄 유틸 (CM-07)
 *
 * 엑셀(.xlsx) · CSV · 인쇄/PDF · 차트 이미지(.png) 출력을 담당합니다.
 * 모든 출력은 보고서 다운로드 이력(SY-14)에 자동 기록되며, 권한 밖 값은 「비공개」 로 채웁니다.
 *
 * 웹에서만 실제 파일이 만들어지고, 앱(네이티브)에서는 안내 토스트만 띄웁니다.
 *
 * ■ 2026-10-01 개편 (기획 10 DLG-02 · 03 · 04 · 05 · 13 · 15, 공통 10.6 CMN-07)
 * - 기록 선행(DLG-05): 파일을 저장하기 **전에** 기록을 기다립니다. 기록이 실패하면 파일을 만들지 않습니다.
 *   목 모드(USE_MOCK)는 기록 성공 여부와 관계없이 저장합니다(목에는 감사 대상이 없습니다).
 * - 형식 코드(DLG-02): 표시명('엑셀 (.xls)') 대신 코드(`FORMAT`)를 보냅니다.
 * - 화면 식별자(DLG-03): `reportId` 가 아니라 `menuId` 로 보냅니다. 서버가 `menuId` 로 보고서 ID 를 찾습니다.
 * - 누락 경로(DLG-04): 차트 이미지 저장(saveChartAsPng)도 기록합니다.
 * - 범위·조건(DLG-15): 인자 `scope`('VIEW'|'ALL') 를 서버 본문 `scopeCd` 로 바꿔 보내고 `condSummary` 를 함께 보냅니다.
 *   파일 첫 줄에 「비공개 처리 n건(데이터 접근 권한 기준)」 을 넣고, 같은 n 을 기록의 blindCnt 로 보냅니다.
 * - 인쇄(DLG-13): 호출부가 행 수를 넘길 수 있고, 범위 문구에 「실제 인쇄 여부는 확인할 수 없음」 을 적습니다.
 */
import { Platform } from 'react-native';
import { toast } from '@shared/stores/useUiStore';
import { API_BASE_URL, USE_MOCK } from '@services/api/client';
import * as systemService from '@services/api/systemService';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { maskRows } from '@shared/utils/maskUtil';
import { HOME_PATH, HOME_SCREEN_ID, screenIdOf } from '@shared/navigation/routes';

const isWeb = Platform.OS === 'web' && typeof document !== 'undefined';

/**
 * 내려받기 형식 코드 (공통코드 RPT_FORMAT, 기획 DLG-02)
 *
 * 예전에는 표시명('엑셀 (.xls)', 'CSV (.csv)', '인쇄 · PDF')을 보내 서버가 대문자 표시명으로 저장했습니다.
 * 형식 필터가 코드(XLS)로 걸러 그 기록이 빠졌습니다. 형식 문자열은 이 표 한 곳에만 둡니다.
 */
export const FORMAT = Object.freeze({ XLS: 'XLS', XLSX: 'XLSX', CSV: 'CSV', PDF: 'PDF', PNG: 'PNG' });

/** 기록이 실패해 파일을 만들지 않았을 때의 안내 (기획 DLG-05) */
export const LOG_FAIL_MESSAGE = '내려받기 기록을 남기지 못해 파일을 만들지 않았습니다. 잠시 뒤 다시 시도해 주세요.';

/** 인쇄 기록의 범위 문구 — 브라우저는 인쇄 취소를 알려 주지 않습니다 (기획 DLG-13) */
const PRINT_SCOPE = '인쇄 창 열림 — 실제 인쇄·PDF 저장 여부는 확인할 수 없음';

/** 파일 안에 남기는 비공개 건수 문구 — 이력의 blindCnt 와 같은 n 입니다 (기획 DLG-15) */
export const blindNote = (n) => `비공개 처리 ${Number(n) || 0}건(데이터 접근 권한 기준)`;

/** 개발 모드 여부 — attrs 누락을 콘솔에 알릴 때만 씁니다 */
const IS_DEV = typeof __DEV__ !== 'undefined' && !!__DEV__;

/**
 * `attrs` 없이 부른 호출을 개발 모드 콘솔에 알립니다 (기획 DLG-15 · R-10).
 * attrs 가 없으면 권한 밖 값을 가리지 못하고 서버가 비운 값이 빈칸으로 나갑니다.
 * @returns {boolean} 누락 여부 — 기록 본문 `params.note='attrs-missing'` 으로도 남깁니다
 */
function attrsMissing(attrs, name) {
  const missing = !Array.isArray(attrs) || !attrs.some(Boolean);
  if (missing && IS_DEV) console.error(`[내려받기] attrs 없이 호출했습니다 — 권한 밖 값을 가리지 못합니다: ${name}`);
  return missing;
}

/** 값 하나를 CSV 셀로 감쌉니다 */
function csvCell(v) {
  return `"${String(v ?? '').replace(/"/g, '""')}"`;
}

/**
 * 브라우저에서 파일을 내려받습니다.
 *
 * @param {Blob} blob 파일 내용
 * @param {string} filename 저장 파일명 (확장자 포함)
 */
function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * 지금 보고 있는 화면의 ID — 내려받기 기록의 `menuId` 로 보냅니다 (2026-10-01 DLG-03 — 예전에는 `reportId`).
 *
 * 화면 코드가 화면 ID 를 일일이 넘기지 않아도 되도록 URL 에서 알아냅니다.
 * `screenIdOf` 는 모르는 경로를 홈(dash-ai)으로 돌려주므로, 홈 경로가 아닌데 홈이 나오면
 * "모름" 으로 봅니다 — 엉뚱한 화면에 기록을 붙이는 것보다 비워 두는 편이 낫습니다.
 */
function currentScreenId() {
  if (!isWeb) return undefined;
  const path = window.location?.pathname || '';
  const id = screenIdOf(path);
  if (id === HOME_SCREEN_ID && !path.startsWith(HOME_PATH)) return undefined;
  return id;
}

/**
 * 다운로드 이력을 서버에 기록합니다. (SY-14)
 *
 * 서버가 받는 키는 `reportId` · `reportNm` · `rowCnt` · `blindCnt` 입니다.
 * 예전에는 `reportName` · `rowCount` · `blindCount` 로 보내서 **이름과 건수가 버려진 채**
 * 기록되고 있었습니다. 실패를 `.catch(() => {})` 로 삼키고 있어 아무도 몰랐습니다.
 * 화면 ID 도 `menuId` 라는 이름으로 보내 서버가 버렸습니다 — 그래서 이력의 「화면」 칸이 늘 비었습니다.
 * 호출부 시그니처는 그대로 두고 여기서만 서버 이름으로 바꿉니다.
 * → 2026-10-01: 서버가 `menuId` 를 받게 되어 `menuId` 로 되돌림(DLG-03). `reportId` 는 서버가 menuId 로 찾아 채웁니다.
 *   이제 기록을 기다린 뒤에 파일을 저장합니다(DLG-05) — 반환값은 `{ ok, logId }` 입니다.
 *
 * @param {object} log { reportName, format, rowCount, blindCount, menuId } — menuId 를 안 주면 현재 URL 의 화면으로
 */
/**
 * 내보내기 직전 마스킹.
 *
 * 가리는 일을 호출부가 아니라 여기서 하는 이유는, 새 화면을 만들면서 빠뜨려도 조용히
 * 새지 않게 하기 위해서입니다. 어느 값이 어느 항목인지는 서버가 내려준 대응표가 판정하므로
 * 화면은 「이 열이 어디서 온 값인지」(응답 필드명)만 알려 주면 됩니다.
 *
 * @param {(string|number)[][]} rows
 * @param {string[]} [attrs] 열 순서대로의 응답 필드명
 * @param {number} given 호출부가 이미 센 비공개 건수 (직접 가린 화면과 이중으로 세지 않습니다)
 */
function applyMask(rows, attrs, given) {
  const out = maskRows(rows, attrs);
  return { rows: out.rows, blindCount: out.blindCount || given || 0 };
}

/**
 * @param {object} log
 * @param {'VIEW'|'ALL'} [log.scope] 엑셀 옵션 패널에서 고른 범위 (조회 목록 / 전체, 기획 CMN-07).
 *        서버 본문에서는 `scopeCd` 입니다 — 기존 `scope` 필드는 사람이 읽는 범위 문구라 이름을 나눴습니다(공통 10.6).
 * @param {string} [log.condSummary] 조회 조건 요약 (예: "기간=09-24~09-30 · 상태=실패 · 쪽=1")
 * @param {string} [log.scopeDesc] 사람이 읽는 범위 문구 — 서버 본문의 기존 `scope`(scope_desc). 인쇄·차트 이미지가 씁니다
 * @param {number} [log.fileSize] 파일 크기(byte)
 * @param {boolean} [log.attrsMissing] attrs 없이 만든 파일 — 이력 `params.note='attrs-missing'` 으로 남깁니다
 * @returns {Promise<{ok:boolean, logId:number|null, message?:string}>}
 */
async function logDownload({ reportName, format, rowCount, blindCount, menuId, scope, condSummary, scopeDesc, fileSize, attrsMissing: noAttrs }) {
  const body = {
    menuId: menuId || currentScreenId(),
    reportNm: reportName,
    format,
    rowCnt: rowCount ?? 0,
    blindCnt: blindCount ?? 0,
    ...(scope ? { scopeCd: scope } : {}),
    ...(condSummary ? { condSummary: String(condSummary).slice(0, 500) } : {}),
    ...(scopeDesc ? { scope: String(scopeDesc).slice(0, 100) } : {}),
    ...(fileSize != null ? { fileSize } : {}),
    ...(noAttrs ? { params: { note: 'attrs-missing' } } : {}),
  };
  try {
    const res = await systemService.postDownloadLogs(body);
    if (res?.success) return { ok: true, logId: res?.data?.logId ?? null };
    // 조용히 삼키지 않습니다 — 예전에 이름·건수가 버려진 채 기록되는 것을 오래 못 봤습니다
    console.warn('[내려받기 이력] 기록 실패:', res?.code, res?.message, res?.error?.field || '');
    return { ok: false, logId: null, message: res?.message };
  } catch (e) {
    console.warn('[내려받기 이력] 기록 실패:', e?.message);
    return { ok: false, logId: null, message: e?.message };
  }
}

/**
 * 기록을 먼저 남기고, 성공했을 때만 저장합니다 (기획 DLG-05 「기록 선행」).
 *
 * 기록이 없는 내려받기는 감사에서 보이지 않으므로 파일을 만들지 않고 안내합니다.
 * 목 모드는 감사 대상이 없어 기록 결과와 관계없이 저장합니다.
 *
 * @param {object} log logDownload 인자
 * @param {Function} save 실제 저장 동작
 * @returns {Promise<boolean>} 저장했는지
 */
async function logThenSave(log, save) {
  const rec = await logDownload(log);
  if (!rec.ok && !USE_MOCK) {
    toast(LOG_FAIL_MESSAGE);
    return false;
  }
  save();
  return true;
}

/** 비공개 건수를 덧붙인 완료 토스트 */
const doneText = (file, blindCount) => `${file} 파일을 내려받았습니다${blindCount ? ` — 비공개 처리 ${blindCount}건` : ''}`;

/**
 * 서버가 만든 파일을 그대로 내려받습니다.
 *
 * 화면에서 표를 조립해 만드는 `downloadXls` 와 달리, **쪽에 걸리지 않은 전량**을 서버가 뽑아 줍니다.
 * 내려받기 이력(SY-14)도 서버가 직접 남기므로 여기서 `logDownload` 를 부르지 않습니다
 * (부르면 한 번의 내려받기가 이력에 두 줄로 남습니다).
 *
 * @param {object} config
 *   path   `/api/v1` 뒤의 경로 (예: '/production/results/export')
 *   body   요청 본문
 *   name   실패 안내에 쓸 이름
 *   limit  화면별 상한 행 수(선택) — 서버가 `X-Export-Limit` 을 주지 않을 때만 안내에 씁니다.
 *          상한은 서버가 정하므로 모르면 넘기지 마십시오(틀린 숫자를 안내하게 됩니다)
 *   method 'POST'(기본) · 'GET' — GET 은 본문 없이 부릅니다(예: 용어 사전 업로드 템플릿, 2026-10-03)
 * @returns {Promise<boolean>} 성공 여부
 *
 * 상한 초과는 오류가 아닙니다. 서버가 응답 헤더 `X-Export-Truncated: true` · `X-Export-Total: N` 으로 알리면
 * 「상한 n건까지 내려받았습니다(전체 N건)」 을 띄웁니다(공통 10.6). n 은 `X-Export-Limit` 헤더 → `limit` 인자 순이고,
 * 둘 다 없으면 「상한까지 내려받았습니다(전체 N건)」 입니다. 교차 출처라 서버 CORS 가 이 헤더들을
 * `Access-Control-Expose-Headers` 에 넣어야 읽힙니다(2단계 서버는 Truncated·Total 노출).
 */
export async function downloadFromServer({ path, body = {}, name = '파일', limit, method = 'POST' }) {
  if (!isWeb) {
    toast('앱에서는 파일 내려받기를 지원하지 않습니다 — 웹에서 이용하세요');
    return false;
  }

  /*
   * 목(데모) 모드 — 이 내려받기만은 서버가 직접 파일을 만들어 주는 것이라 목 계층을 거치지 않습니다.
   * 그대로 두면 데모 사이트에서 단추를 누를 때마다 네트워크 오류 토스트가 뜹니다.
   * 조회 조건을 담은 안내 파일을 내려 주어, 단추가 동작한다는 것과 **실제 값은 서버가 만든다**는 것을
   * 함께 알립니다. 여기서 가짜 집계를 지어내면 화면의 수와 어긋납니다.
   */
  if (USE_MOCK) {
    // 서버 생성 경로는 서버가 기록합니다 — 데모 파일도 브라우저 기록을 남기지 않습니다
    await downloadXlsx({
      log: false,
      name,
      sheetName: '데모',
      columns: [{ header: '항목', width: 22 }, { header: '값', width: 60 }],
      rows: [
        { cells: [`${name} — 데모`], style: 'title' },
        { cells: ['이 파일은 데모용입니다', '실제 내려받기는 서버가 조회 전량을 뽑아 만듭니다'], style: 'meta' },
        { cells: ['항목', '값'], style: 'head' },
        { cells: ['요청 경로', path] },
        ...Object.entries(body || {}).map(([k, v]) => ({ cells: [k, Array.isArray(v) ? v.join(', ') : String(v ?? '—')] })),
      ],
    });
    return true;
  }
  try {
    const { accessToken } = useAuthStore.getState();
    const auth = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
    const get = String(method).toUpperCase() === 'GET';
    const res = await fetch(`${API_BASE_URL}/api/v1${path}`, get
      ? { method: 'GET', headers: auth }
      : { method: 'POST', headers: { 'Content-Type': 'application/json', ...auth }, body: JSON.stringify(body) });
    if (!res.ok) {
      // 서버가 오류를 JSON 으로 주면 그 문구를 그대로 보여 줍니다
      const msg = await res.json().then((j) => j?.message).catch(() => null);
      toast(msg || `${name}을(를) 내려받지 못했습니다 (HTTP ${res.status})`);
      return false;
    }
    saveBlob(await res.blob(), filenameOf(res) || `${name}.xlsx`);
    const truncated = String(res.headers.get('x-export-truncated') || '').toLowerCase() === 'true';
    if (truncated) {
      // 상한은 서버가 정합니다(2026-10-01 2단계 서버는 10,000건). 서버가 X-Export-Limit 을 주면 그 값, 아니면 호출부 값
      const total = Number(res.headers.get('x-export-total'));
      const capN = Number(res.headers.get('x-export-limit')) || Number(limit) || 0;
      const cap = capN ? `상한 ${capN.toLocaleString('ko-KR')}건까지` : '상한까지';
      toast(`${cap} 내려받았습니다${Number.isFinite(total) && total > 0 ? `(전체 ${total.toLocaleString('ko-KR')}건)` : ''}`);
    } else {
      toast(`${name}을(를) 내려받았습니다`);
    }
    return true;
  } catch (e) {
    toast(e?.message || `${name}을(를) 내려받지 못했습니다`);
    return false;
  }
}

/** Content-Disposition 에서 서버가 정한 파일명을 꺼냅니다 (RFC 5987 우선) */
function filenameOf(res) {
  const cd = res.headers.get('content-disposition') || '';
  const star = cd.match(/filename\*=UTF-8''([^;]+)/i);
  if (star) return decodeURIComponent(star[1]);
  const plain = cd.match(/filename="?([^";]+)"?/i);
  return plain ? plain[1] : null;
}

/**
 * 표 데이터를 CSV 로 내려받습니다.
 *
 * `attrs` 를 주면 열마다 응답 필드명을 보고 **이 함수가 직접** 값을 가립니다 — 호출부에서
 * 미리 가릴 필요가 없습니다. 빠뜨리면 원본이 그대로 나가므로 값이 있는 표에는 꼭 넘겨 주세요.
 *
 * 파일 첫 줄에 「비공개 처리 n건(데이터 접근 권한 기준)」 을 넣습니다 — 같은 n 이 이력의 blindCnt 입니다(DLG-15).
 *
 * @param {object} config { name, head:string[], attrs?:string[], rows:(string|number)[][], blindCount, scope?:'VIEW'|'ALL', condSummary?, menuId? }
 * @returns {Promise<boolean>} 저장했는지 (기록이 실패하면 저장하지 않습니다)
 */
export async function downloadCsv({ name, head, attrs, rows, blindCount = 0, scope, condSummary, menuId }) {
  if (!isWeb) {
    toast('앱에서는 파일 내려받기를 지원하지 않습니다 — 웹에서 이용하세요');
    return false;
  }
  if (!rows?.length) {
    toast('내려받을 표를 찾을 수 없습니다');
    return false;
  }
  const noAttrs = attrsMissing(attrs, name);
  ({ rows, blindCount } = applyMask(rows, attrs, blindCount));
  const lines = [[blindNote(blindCount)], head, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
  // BOM(﻿) 을 붙여야 엑셀에서 한글이 깨지지 않습니다
  const blob = new Blob([`﻿${lines}`], { type: 'text/csv;charset=utf-8;' });
  const saved = await logThenSave(
    { reportName: name, format: FORMAT.CSV, rowCount: rows.length, blindCount, scope, condSummary, menuId, fileSize: blob.size, attrsMissing: noAttrs },
    () => saveBlob(blob, `${name}.csv`)
  );
  if (saved) toast(doneText(`${name}.csv`, blindCount));
  return saved;
}

/**
 * 표 데이터를 엑셀(.xlsx) 로 내려받습니다.
 * 이 프로젝트의 엑셀 파일은 모두 .xlsx 입니다(2026-10-06). 예전에는 HTML 표에 `.xls` 확장자를 붙여 저장해
 * 엑셀이 열 때 「파일 형식과 확장자가 일치하지 않습니다」 경고를 냈습니다. 함수 이름은 부르는 화면이 많아 그대로 둡니다.
 *
 * `attrs` 를 주면 열마다 응답 필드명을 보고 이 함수가 직접 값을 가립니다.
 * 로그인한 계정의 데이터 접근 권한 밖 값은 빈칸이 아니라 「비공개」 로 채웁니다(기획 R-10).
 * 파일 첫 줄(표 위)에 「비공개 처리 n건(데이터 접근 권한 기준)」 을 남기며, 이 n 은 내려받기 이력의 blindCnt 와 같습니다.
 * (2026-10-01 처음에는 표 아래에 두었다가 기획 DLG-15 「첫 행 위」 에 맞춰 옮겼습니다)
 * 시트 구성: 1행 = 비공개 건수 · 범위 · 조건, 2행 = 머리글, 3행부터 본문.
 *
 * @param {object} config { name, head, attrs?:string[], rows, blindCount, scope?:'VIEW'|'ALL', condSummary?, menuId? }
 * @returns {Promise<boolean>} 저장했는지 (기록이 실패하면 저장하지 않습니다)
 */
export async function downloadXls({ name, head, attrs, rows, blindCount = 0, scope, condSummary, menuId }) {
  if (!isWeb) {
    toast('앱에서는 파일 내려받기를 지원하지 않습니다 — 웹에서 이용하세요');
    return false;
  }
  if (!rows?.length) {
    toast('내려받을 표를 찾을 수 없습니다');
    return false;
  }
  const noAttrs = attrsMissing(attrs, name);
  ({ rows, blindCount } = applyMask(rows, attrs, blindCount));
  const meta = `${blindNote(blindCount)}${scope ? ` · 범위 ${scope === 'ALL' ? '전체' : '조회 목록'}` : ''}${condSummary ? ` · 조건 ${condSummary}` : ''}`;
  let blob;
  try {
    // Metro에서 외부 node_modules 경로의 동적 청크가 404가 되는 것을 방지합니다.
    const excelModule = require('exceljs');
    const ExcelJS = excelModule.default || excelModule;
    const wb = new ExcelJS.Workbook();
    wb.creator = '덕우전자 AX 시스템';
    wb.created = new Date();
    const ws = wb.addWorksheet('Sheet1');
    // 값은 화면에 보이던 글자 그대로 넣습니다(사번 앞자리 0 · 「1,234」 같은 표기가 숫자로 바뀌지 않게)
    const text = (v) => (v === null || v === undefined ? '' : String(v));
    ws.addRow([meta]).font = { size: 10, color: { argb: 'FF666666' } };
    const headRow = ws.addRow(head.map(text));
    headRow.font = { bold: true };
    headRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF3F8' } };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
    rows.forEach((r) => {
      const row = ws.addRow(r.map(text));
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
    });
    // 열 너비 — 머리글 · 본문 중 가장 긴 글자 기준(한글은 2칸), 8 ~ 60
    const cw = (v) => [...text(v)].reduce((n, ch) => n + (ch.charCodeAt(0) > 0xff ? 2 : 1), 0);
    ws.columns.forEach((col, i) => {
      const longest = Math.max(cw(head[i]), ...rows.map((r) => cw(r[i])));
      col.width = Math.min(60, Math.max(8, longest + 2));
    });
    ws.views = [{ state: 'frozen', ySplit: 2 }];
    const buf = await wb.xlsx.writeBuffer();
    blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  } catch (e) {
    console.error('[엑셀 내려받기] 실패:', e);
    toast('엑셀 파일을 만들지 못했습니다');
    return false;
  }
  const saved = await logThenSave(
    { reportName: name, format: FORMAT.XLSX, rowCount: rows.length, blindCount, scope, condSummary, menuId, fileSize: blob.size, attrsMissing: noAttrs },
    () => saveBlob(blob, `${name}.xlsx`)
  );
  if (saved) toast(doneText(`${name}.xlsx`, blindCount));
  return saved;
}

/**
 * 표를 진짜 엑셀(.xlsx) 파일로 내려받습니다.
 *
 * 제목 · 절 · 머리 정보 줄로 꾸민 리포트는 이쪽을 씁니다(표 한 장은 `downloadXls`).
 *
 * 행은 `{ cells, style }` 로 줍니다.
 *   `title`   보고서 제목 줄
 *   `meta`    기준일·모델 같은 머리 정보
 *   `section` 절 제목
 *   `head`    표 머리글
 *   기본       본문
 *
 * 열에 `attr`(응답 필드명)을 달아 두면 본문 행의 그 칸을 이 함수가 직접 가립니다.
 * 제목·머리 정보·머리글 줄(`title`·`meta`·`section`·`head`)은 값이 아니라 글이므로 건드리지 않습니다.
 *
 * 머리 정보 줄(제목·meta 줄 바로 뒤)에 「비공개 처리 n건(데이터 접근 권한 기준)」 을 넣습니다(DLG-15).
 *
 * @param {object} config { name, sheetName, columns[{header,width,attr}], rows, blindCount, scope?, condSummary?, menuId? }
 *   `log: false` 는 내부용입니다 — 서버 생성 경로의 데모 파일처럼 이력을 서버가 맡는 경우.
 * @returns {Promise<boolean>} 저장했는지
 */
export async function downloadXlsx({ name, sheetName = 'Sheet1', columns = [], rows = [], blindCount = 0, scope, condSummary, menuId, log = true }) {
  if (!isWeb) {
    toast('앱에서는 파일 내려받기를 지원하지 않습니다 — 웹에서 이용하세요');
    return false;
  }
  if (!rows?.length) {
    toast('내려받을 내용이 없습니다');
    return false;
  }

  // 본문 줄만 골라 가립니다 — 꾸밈 줄에는 가릴 값이 없습니다
  const attrs = columns.map((c) => c?.attr || '');
  const noAttrs = log && attrsMissing(attrs, name);
  const body = new Set(['title', 'meta', 'section', 'head']);
  const bodyRows = rows.filter((r) => !body.has(r?.style));
  const maskedBody = maskRows(bodyRows.map((r) => r.cells || r), attrs);
  if (maskedBody.blindCount) {
    let i = 0;
    rows = rows.map((r) => (body.has(r?.style) ? r : { ...(r.cells ? r : { cells: r }), cells: maskedBody.rows[i++] }));
    blindCount = maskedBody.blindCount;
  }
  // 비공개 건수 머리 정보 — 제목·meta 줄이 끝나는 자리에 넣습니다
  if (log) {
    const lead = rows.findIndex((r) => !(r?.style === 'title' || r?.style === 'meta'));
    const at = lead < 0 ? rows.length : lead;
    rows = [...rows.slice(0, at), { cells: [blindNote(blindCount)], style: 'meta' }, ...rows.slice(at)];
  }

  try {
    // Metro에서 외부 node_modules 경로의 동적 청크가 404가 되는 것을 방지합니다.
    const excelModule = require('exceljs');
    const ExcelJS = excelModule.default || excelModule;
    const wb = new ExcelJS.Workbook();
    wb.creator = '덕우전자 AX 시스템';
    wb.created = new Date();

    const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
    if (columns.length) ws.columns = columns.map((c) => ({ width: c.width || 18 }));

    rows.forEach((r) => {
      const row = ws.addRow(r.cells || r);
      const style = r.style;
      row.alignment = { vertical: 'top', wrapText: true, horizontal: 'left' };

      if (style === 'title') {
        row.font = { bold: true, size: 15 };
        row.height = 26;
      } else if (style === 'meta') {
        row.font = { size: 10, color: { argb: 'FF666666' } };
      } else if (style === 'section') {
        row.font = { bold: true, size: 12 };
        row.height = 22;
      } else if (style === 'head') {
        row.font = { bold: true, size: 10.5 };
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF3F8' } };
          cell.border = { bottom: { style: 'thin', color: { argb: 'FFBBC4D0' } } };
        });
      } else if (style === 'quote') {
        row.font = { size: 10, italic: true, color: { argb: 'FF555555' } };
      } else {
        row.font = { size: 10.5 };
      }
    });

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    if (!log) {
      saveBlob(blob, `${name}.xlsx`);
      return true;
    }
    const saved = await logThenSave(
      { reportName: name, format: FORMAT.XLSX, rowCount: bodyRows.length, blindCount, scope, condSummary, menuId, fileSize: blob.size, attrsMissing: noAttrs },
      () => saveBlob(blob, `${name}.xlsx`)
    );
    if (saved) toast(doneText(`${name}.xlsx`, blindCount));
    return saved;
  } catch (e) {
    console.error('[엑셀 내려받기] 실패:', e);
    toast('엑셀 파일을 만들지 못했습니다');
    return false;
  }
}

/**
 * 보고서 영역을 인쇄(또는 PDF 저장)합니다.
 *
 * React Native for Web 에서는 DOM 노드를 직접 다루지 않고,
 * 인쇄할 영역에 nativeID 를 지정해 두고 그 id 로 찾아 새 창에 복사합니다.
 *
 * 기록 순서(DLG-05 · DLG-13): 인쇄 창을 먼저 연 뒤(팝업 차단을 피하려면 클릭 직후 열어야 합니다)
 * 기록을 기다리고, 기록이 실패하면 창을 닫고 안내합니다. 브라우저는 인쇄 취소를 알려 주지 않으므로
 * 기록 시점은 창 열기이며, 범위 문구에 그 사실을 적습니다.
 *
 * @param {object} config { nodeId, title, role, rowCount?, condSummary?, menuId? }
 * @returns {Promise<boolean>} 인쇄 창을 띄웠는지
 */
export async function printDocument({ nodeId, title, role, rowCount = 0, condSummary, menuId }) {
  if (!isWeb) {
    toast('앱에서는 인쇄를 지원하지 않습니다 — 웹에서 이용하세요');
    return false;
  }
  const node = document.getElementById(nodeId);
  if (!node) {
    toast('인쇄할 보고서 영역을 찾을 수 없습니다');
    return false;
  }
  const win = window.open('', '_blank', 'width=1180,height=860');
  if (!win) {
    // 창이 열리지 않으면 기록하지 않습니다 (기획 10 4.7)
    toast('팝업이 차단되어 인쇄 창을 열 수 없습니다');
    return false;
  }
  const blindCount = node.querySelectorAll('[data-blind="1"]').length;
  const rec = await logDownload({ reportName: title, format: FORMAT.PDF, rowCount, blindCount, condSummary, menuId, scopeDesc: PRINT_SCOPE });
  if (!rec.ok && !USE_MOCK) {
    win.close();
    toast(LOG_FAIL_MESSAGE);
    return false;
  }
  // 현재 문서의 스타일을 그대로 복사해야 표 서식이 유지됩니다
  const css = Array.from(document.querySelectorAll('style')).map((x) => x.outerHTML).join('');
  const stamp = new Date().toISOString().slice(0, 10);
  win.document.write(
    `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${title}</title>${css}` +
      `<style>body{background:#fff;padding:16px;color:#0b0d10}@page{size:A4 landscape;margin:9mm}` +
      `.no-print{display:none!important}</style></head><body>${node.outerHTML}` +
      `<div style="margin-top:14px;font-size:14.5px;color:#6b7280">덕우전자 AX — ${title} · 출력 ${stamp} · 열람 계정 ${role || ''}</div>` +
      `</body></html>`
  );
  win.document.close();
  setTimeout(() => {
    unclipForPrint(win);
    win.focus();
    win.print();
  }, 400);
  return true;
}

/**
 * 인쇄 창에 복사된 스크롤 영역의 높이 제한·잘림을 풉니다(2026-10-03).
 *
 * 화면의 표는 스크롤 영역(maxHeight 620 등) 안에 있어, DOM 을 그대로 복사하면 그 높이를 넘는 행이
 * 인쇄물에서 잘립니다(아침회의 자료 Plating·Coating 19개 공정 중 9개만 출력). 세로로 스크롤되는 요소만
 * 골라 높이를 풀고, 가로 스크롤 영역은 표 폭을 지키도록 그대로 둡니다.
 */
function unclipForPrint(win) {
  try {
    win.document.querySelectorAll('body *').forEach((el) => {
      const cs = win.getComputedStyle(el);
      if (cs.overflowY !== 'auto' && cs.overflowY !== 'scroll' && cs.overflowY !== 'hidden') return;
      if (el.scrollHeight <= el.clientHeight + 1) return;
      el.style.setProperty('max-height', 'none', 'important');
      el.style.setProperty('height', 'auto', 'important');
      el.style.setProperty('overflow-y', 'visible', 'important');
    });
  } catch {
    // 인쇄 자체는 막지 않습니다 — 잘린 채라도 출력은 됩니다
  }
}

/**
 * 계층 트리 데이터(일자 ➔ 제품 ➔ 공정/프레스 기기)를 엑셀 그룹핑(+/- 아웃라인)이 적용된
 * 순수 .xlsx 파일로 내려받습니다.
 *
 * 첫 줄은 「비공개 처리 n건(데이터 접근 권한 기준)」, 둘째 줄이 머리글입니다(DLG-15).
 *
 * @param {object} config { name, head, rows, blindCount, scope?, condSummary?, menuId? }
 * @returns {Promise<boolean>} 저장했는지
 */
export async function downloadXlsxTree({ name, head, attrs, rows, blindCount = 0, scope, condSummary, menuId }) {
  if (!isWeb) {
    toast('앱에서는 파일 내려받기를 지원하지 않습니다 — 웹에서 이용하세요');
    return false;
  }
  if (!rows?.length) {
    toast('내려받을 데이터가 없습니다');
    return false;
  }
  const noAttrs = attrsMissing(attrs, name);
  ({ rows, blindCount } = applyMask(rows, attrs, blindCount));

  try {
    // Metro에서 외부 node_modules 경로의 동적 청크가 404가 되는 것을 방지합니다.
    const excelModule = require('exceljs');
    const ExcelJS = excelModule.default || excelModule;
    const wb = new ExcelJS.Workbook();
    wb.creator = '덕우전자 AX 시스템';
    wb.lastModifiedBy = '덕우전자 AX 시스템';
    wb.created = new Date();

    const ws = wb.addWorksheet('생산실적집계', {
      views: [{ showGridLines: true }],
      properties: {
        outlineProperties: {
          summaryBelow: false,
          summaryRight: false,
        },
      },
    });

    // 컬럼 정의 (사용자 후처리 편집 및 피벗 분석이 용이하도록 개별 셀로 완전 분리)
    // 머리글을 열 정의(header)로 두면 1행에 박혀 그 위에 비공개 건수 줄을 둘 수 없으므로, 줄로 따로 씁니다
    const treeColumns = [
      { header: '일자', key: 'period', width: 14 },
      { header: '제품명', key: 'product', width: 18 },
      { header: '공장', key: 'plant', width: 13 },
      { header: '공정', key: 'process', width: 14 },
      { header: '설비 코드', key: 'equipmentCode', width: 16 },
      { header: '설비명', key: 'equipment', width: 30 },
      { header: '투입 수량', key: 'inputQty', width: 16 },
      { header: '양품 수량', key: 'okQty', width: 16 },
      { header: '불량 수량', key: 'ngQty', width: 16 },
      { header: '불량률', key: 'defectRate', width: 13 },
      { header: '가동률', key: 'uptimeRate', width: 13 },
      { header: '비가동 시간', key: 'downtimeMin', width: 15 },
    ];
    ws.columns = treeColumns.map(({ key, width }) => ({ key, width }));
    const noteRow = ws.addRow([blindNote(blindCount)]);
    noteRow.font = { name: 'Pretendard', size: 10, color: { argb: 'FF666666' } };
    ws.addRow(treeColumns.map((col) => col.header));

    // 헤더 스타일링 (Shadcn 깔끔한 테마)
    const headerRow = ws.getRow(2);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Pretendard', size: 11, bold: true, color: { argb: 'FF1E293B' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF1F5F9' },
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'medium', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    const borderStyle = {
      top: { style: 'thin', color: { argb: 'FFF1F5F9' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFF1F5F9' } },
      right: { style: 'thin', color: { argb: 'FFF1F5F9' } },
    };

    const numFmt = (v) => (v != null && typeof v === 'number' ? v : v ?? '—');
    const pctFmt = (v) => (v != null && v !== '' ? (typeof v === 'number' ? `${v.toFixed(1)}%` : `${v}%`) : '—');

    let totalExportedRows = 0;

    // 1depth (일자) ➔ 2depth (제품) ➔ 3depth (공장/공정/설비) 순회
    rows.forEach((r1) => {
      totalExportedRows++;
      // Depth 1 (일자 요약 행)
      const row1 = ws.addRow({
        period: r1.period,
        product: '전체 (일자 합계)',
        plant: '—',
        process: '—',
        equipmentCode: '',
        equipment: '',
        inputQty: numFmt(r1.inputQty),
        okQty: numFmt(r1.okQty),
        ngQty: numFmt(r1.ngQty),
        defectRate: pctFmt(r1.defectRate),
        uptimeRate: pctFmt(r1.uptimeRate),
        downtimeMin: r1.downtimeMin != null ? `${r1.downtimeMin}분` : '—',
      });
      row1.height = 25;
      row1.font = { name: 'Pretendard', size: 10.5, bold: true, color: { argb: 'FF0F172A' } };
      row1.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF8FAFC' },
      };
      row1.outlineLevel = 0;
      row1.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.border = borderStyle;
        cell.alignment = {
          vertical: 'middle',
          horizontal: colNumber <= 4 ? 'center' : colNumber <= 6 ? 'left' : 'right',
        };
        if (colNumber >= 7 && colNumber <= 9 && typeof cell.value === 'number') {
          cell.numFmt = '#,##0';
        }
      });

      if (Array.isArray(r1._children) && r1._children.length > 0) {
        r1._children.forEach((r2) => {
          totalExportedRows++;
          // Depth 2 (제품 소계 행)
          const row2 = ws.addRow({
            period: r1.period,
            product: r2.period,
            plant: '—',
            process: '—',
            equipmentCode: '',
            equipment: '',
            inputQty: numFmt(r2.inputQty),
            okQty: numFmt(r2.okQty),
            ngQty: numFmt(r2.ngQty),
            defectRate: pctFmt(r2.defectRate),
            uptimeRate: '—',
            downtimeMin: '—',
          });
          row2.height = 23;
          row2.font = { name: 'Pretendard', size: 10, bold: true, color: { argb: 'FF1D4ED8' } };
          row2.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF0F7FF' },
          };
          row2.outlineLevel = 1; // 엑셀 그룹 1레벨
          row2.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            cell.border = borderStyle;
            cell.alignment = {
              vertical: 'middle',
              horizontal: colNumber <= 4 ? 'center' : colNumber <= 6 ? 'left' : 'right',
            };
            if (colNumber >= 7 && colNumber <= 9 && typeof cell.value === 'number') {
              cell.numFmt = '#,##0';
            }
          });

          if (Array.isArray(r2._children) && r2._children.length > 0) {
            r2._children.forEach((r3) => {
              totalExportedRows++;
              // Depth 3 (세부 공장/공정/설비 행)
              const row3 = ws.addRow({
                period: r1.period,
                product: r2.period,
                // 없으면 빈 칸 — '제1공장' 으로 채우던 자리입니다. 공장은 DB 에 축이 없습니다
                plant: r3.plantNm || '',
                process: r3.processNm || '',
                equipmentCode: r3.equipCd || '',
                equipment: r3.equipNm || '',
                inputQty: numFmt(r3.inputQty),
                okQty: numFmt(r3.okQty),
                ngQty: numFmt(r3.ngQty),
                defectRate: pctFmt(r3.defectRate),
                uptimeRate: '—',
                downtimeMin: '—',
              });
              row3.height = 22;
              row3.font = { name: 'Pretendard', size: 9.5, color: { argb: 'FF334155' } };
              row3.outlineLevel = 2; // 엑셀 그룹 2레벨
              row3.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                cell.border = borderStyle;
                cell.alignment = {
                  vertical: 'middle',
                  horizontal: colNumber <= 4 ? 'center' : colNumber <= 6 ? 'left' : 'right',
                };
                if (colNumber >= 7 && colNumber <= 9 && typeof cell.value === 'number') {
                  cell.numFmt = '#,##0';
                }
              });
            });
          }
        });
      }
    });

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const saved = await logThenSave(
      { reportName: name, format: FORMAT.XLSX, rowCount: totalExportedRows, blindCount, scope, condSummary, menuId, fileSize: blob.size, attrsMissing: noAttrs },
      () => saveBlob(blob, `${name}.xlsx`)
    );
    if (saved) toast(`${name}.xlsx 파일을 내려받았습니다. (엑셀 좌측 +/- 그룹핑 지원)${blindCount ? ` — 비공개 처리 ${blindCount}건` : ''}`);
    return saved;
  } catch (err) {
    console.error('XLSX 다운로드 오류:', err);
    toast('엑셀 파일 생성 중 오류가 발생했습니다.');
    return false;
  }
}

/**
 * D3 SVG 차트를 고해상도 PNG 이미지로 변환하여 다운로드합니다.
 */
/**
 * D3 SVG 차트를 고해상도 PNG 이미지로 변환하여 다운로드합니다.
 * svgId 또는 containerId를 받아 단일/복수 SVG 차트를 모두 완벽하게 캡처합니다.
 */
export async function saveChartAsPng({
  svgId,
  containerId,
  fileName = '차트',
  title = '',
  sub = '',
  isDark = false,
  showLegend = false,
} = {}) {
  try {
    if (typeof document === 'undefined') return;

    let svgs = [];
    if (containerId) {
      const container = document.getElementById(containerId);
      if (container) {
        svgs = Array.from(container.querySelectorAll('svg'));
      }
    } else if (svgId) {
      const el = document.getElementById(svgId);
      if (el) svgs = [el];
    }

    if (!svgs.length) {
      toast('저장할 차트 요소를 찾을 수 없습니다.');
      return;
    }

    // 각 SVG를 Image 객체로 비동기 변환
    const URL = window.URL || window.webkitURL || window;
    const items = await Promise.all(
      svgs.map((svg) => {
        return new Promise((resolve, reject) => {
          const clone = svg.cloneNode(true);
          const w = parseInt(svg.getAttribute('width'), 10) || svg.clientWidth || 600;
          const h = parseInt(svg.getAttribute('height'), 10) || svg.clientHeight || 200;

          const svgString = new XMLSerializer().serializeToString(clone);
          const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
          const blobURL = URL.createObjectURL(svgBlob);

          const img = new Image();
          img.onload = () => resolve({ img, w, h, blobURL });
          img.onerror = () => {
            URL.revokeObjectURL(blobURL);
            reject(new Error('SVG 이미지 로드 실패'));
          };
          img.src = blobURL;
        });
      })
    );

    const maxW = Math.max(...items.map((it) => it.w), 500);
    const topPadding = title ? 48 : 20;
    const bottomPadding = showLegend ? 44 : 20;
    const gap = 14;
    const totalSvgH = items.reduce((acc, it) => acc + it.h, 0) + (items.length - 1) * gap;

    const canvasWidth = Math.max(maxW + 40, 600);
    const canvasHeight = topPadding + totalSvgH + bottomPadding;

    const canvas = document.createElement('canvas');
    const scale = 2; // Retina 고해상도 2배수
    canvas.width = canvasWidth * scale;
    canvas.height = canvasHeight * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    // 배경 채우기
    ctx.fillStyle = isDark ? '#0f172a' : '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 타이틀
    if (title) {
      ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
      ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, Pretendard, sans-serif';
      ctx.fillText(title, 20, 30);

      if (sub) {
        const titleWidth = ctx.measureText(title).width;
        ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
        ctx.font = 'normal 12px -apple-system, BlinkMacSystemFont, Pretendard, sans-serif';
        ctx.fillText(sub, 20 + titleWidth + 12, 30);
      }
    }

    // SVG 차트들 세로로 그리기
    let curY = topPadding;
    items.forEach((it) => {
      ctx.drawImage(it.img, 20, curY, it.w, it.h);
      URL.revokeObjectURL(it.blobURL);
      curY += it.h + gap;
    });

    // 선택적 범례 (생산량/불량률)
    if (showLegend) {
      const legendY = curY + 6;
      const centerX = canvasWidth / 2;

      // 범례 1: 생산량
      ctx.fillStyle = isDark ? '#3b82f6' : '#2563eb';
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(centerX - 130, legendY - 8, 12, 10, 2);
      } else {
        ctx.fillRect(centerX - 130, legendY - 8, 12, 10);
      }
      ctx.fill();

      ctx.fillStyle = isDark ? '#cbd5e1' : '#475569';
      ctx.font = '11.5px -apple-system, BlinkMacSystemFont, Pretendard, sans-serif';
      ctx.fillText('생산량 (좌측 축)', centerX - 112, legendY);

      // 범례 2: 불량률 %
      ctx.fillStyle = isDark ? '#fb923c' : '#ea580c';
      ctx.fillRect(centerX + 30, legendY - 4, 14, 3);

      ctx.fillStyle = isDark ? '#cbd5e1' : '#475569';
      ctx.fillText('불량률 % (우측 축)', centerX + 50, legendY);
    }

    // 차트 이미지도 내려받기입니다 — 예전에는 기록 없이 저장했습니다(기획 DLG-04). 기록을 먼저 남깁니다(DLG-05)
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) return;
    const saved = await logThenSave(
      { reportName: fileName, format: FORMAT.PNG, rowCount: 0, blindCount: 0, scopeDesc: sub || title || '', fileSize: blob.size },
      () => saveBlob(blob, `${fileName}.png`)
    );
    if (saved) toast(`${fileName}.png 차트 이미지를 저장했습니다.`);
  } catch (err) {
    console.error('차트 이미지 저장 오류:', err);
    toast('차트 이미지 저장 중 오류가 발생했습니다.');
  }
}

