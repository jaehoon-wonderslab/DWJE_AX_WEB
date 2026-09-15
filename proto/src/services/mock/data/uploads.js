/**
 * 업로드 리포트 목 데이터 (DB-01 업로드 리포트 탭 · SY-16 업로드 문서 목록)
 *
 * 서버가 엑셀을 파싱해 돌려주는 **블록 계약**(API 회신 2026-09-10 확정)을 그대로 흉내 냅니다.
 *   sheets[] = { title, chartType(line|bar|grouped|donut|table), x, columns[], series[], rows[] }
 *   · columns = 시트 1행 헤더 전체 · x = 첫 열 헤더 · series = 차트에 그릴 숫자 열 헤더만
 *   · rows[]  = { [헤더명]: 값 } — 정수는 정수, 소수는 소수, 날짜 셀은 'yyyy-MM-dd' 문자열
 *   · 시트명 접미어 `#line #bar #grouped #donut #table` 로 종류 지정(엑셀은 `[ ]` 를 시트명에 허용하지 않음)
 * 포맷 엑셀이 확정되면 서버 파서만 바뀌고 이 모양은 유지됩니다
 * (요청 docs/requests/REQ_20260910_ai_panel_upload_aoi.md B2-6 · B3 · API 회신).
 *
 * 문서·버전·파싱 결과는 `uploadStore()` 가 mockState.store.uploads 에 두어
 * 대시보드 목과 시스템관리 목이 같은 것을 읽습니다. 업로드하면 이 세션 안에서 바로 늘어납니다.
 */
import { mockState } from '../state';

/**
 * 블록 하나 — 서버 파서와 같은 규칙으로 만듭니다.
 *   headers[0] 이 x, 값이 전부 숫자인 열만 series, rows 는 { [헤더]: 값 }.
 */
function block(title, chartType, headers, table) {
  const rows = table.map((cells) => Object.fromEntries(headers.map((h, i) => [h, cells[i]])));
  const numeric = (h) => rows.every((r) => typeof r[h] === 'number');
  return { title, chartType, x: headers[0], columns: headers, series: headers.slice(1).filter(numeric), rows };
}

/* ───────── 문서 1 「8월 4주 회의 자료」 — 2개 버전 ───────── */

const DAILY_YIELD_V1 = block('일별 수율', 'line', ['일자', '수율(%)', '목표(%)'], [
  ['2026-08-24', 97.1, 97.5], ['2026-08-25', 96.8, 97.5], ['2026-08-26', 97.4, 97.5], ['2026-08-27', 97.9, 97.5],
  ['2026-08-28', 98.2, 97.5], ['2026-08-29', 97.6, 97.5], ['2026-08-30', 98.0, 97.5],
]);

const PROCESS_DEFECT_V1 = block('공정별 불량 건수', 'bar', ['공정', '불량 건수'], [
  ['프레스', 142], ['세정', 38], ['도금', 96], ['검사(AOI)', 61], ['포장', 12],
]);

const MODEL_RESULT_V1 = block('모델별 실적', 'table', ['모델', '고객사', '계획(EA)', '실적(EA)', '불량(EA)', '수율(%)', '달성률(%)'], [
  ['D53AB-YF', '현대모비스', 120000, 118420, 2130, 98.2, 98.7],
  ['D61CA-TR', '현대모비스', 96000, 97310, 1950, 98.0, 101.4],
  ['H22-SHIELD', 'LG전자', 45000, 41200, 1480, 96.4, 91.6],
  ['K7-BRKT', '삼성전자', 60000, 60950, 890, 98.5, 101.6],
  ['M3-CLIP', 'LG전자', 150000, 146800, 3960, 97.3, 97.9],
  ['S9-FRAME', '삼성전자', 30000, 28650, 1210, 95.8, 95.5],
]);

const DEFECT_MIX_V1 = block('불량 유형 비율', 'donut', ['불량 유형', '비율(%)'], [
  ['chip (찍힘)', 46.2], ['stain (얼룩)', 21.5], ['BURR', 13.8], ['치수 이탈', 10.1], ['변형', 8.4],
]);

/** v2 — 8/31 실적이 추가되고 수치가 갱신된 버전 */
const DAILY_YIELD_V2 = block('일별 수율', 'line', ['일자', '수율(%)', '목표(%)'], [
  ['2026-08-25', 96.8, 97.5], ['2026-08-26', 97.4, 97.5], ['2026-08-27', 97.9, 97.5], ['2026-08-28', 98.2, 97.5],
  ['2026-08-29', 97.6, 97.5], ['2026-08-30', 98.0, 97.5], ['2026-08-31', 98.3, 97.5],
]);

const PROCESS_DEFECT_V2 = block('공정별 불량 건수', 'bar', ['공정', '불량 건수'], [
  ['프레스', 155], ['세정', 41], ['도금', 103], ['검사(AOI)', 66], ['포장', 14],
]);

const MODEL_RESULT_V2 = block('모델별 실적', 'table', ['모델', '고객사', '계획(EA)', '실적(EA)', '불량(EA)', '수율(%)', '달성률(%)'], [
  ['D53AB-YF', '현대모비스', 140000, 138960, 2460, 98.2, 99.3],
  ['D61CA-TR', '현대모비스', 112000, 113480, 2240, 98.0, 101.3],
  ['H22-SHIELD', 'LG전자', 52500, 48900, 1720, 96.5, 93.1],
  ['K7-BRKT', '삼성전자', 70000, 71230, 1020, 98.6, 101.8],
  ['M3-CLIP', 'LG전자', 175000, 171400, 4580, 97.3, 97.9],
  ['S9-FRAME', '삼성전자', 35000, 33720, 1390, 95.9, 96.3],
]);

const DEFECT_MIX_V2 = block('불량 유형 비율', 'donut', ['불량 유형', '비율(%)'], [
  ['chip (찍힘)', 44.9], ['stain (얼룩)', 22.7], ['BURR', 14.1], ['치수 이탈', 10.0], ['변형', 8.3],
]);

/* ───────── 문서 2 「도금 두께 공정능력 요약」 — 1개 버전 ───────── */

const PLATING_THICKNESS = block('일별 평균 도금 두께', 'line', ['일자', '평균 두께(μm)', '상한 USL(μm)', '하한 LSL(μm)'], [
  ['2026-08-25', 5.12, 5.6, 4.6], ['2026-08-26', 5.08, 5.6, 4.6], ['2026-08-27', 5.21, 5.6, 4.6], ['2026-08-28', 5.17, 5.6, 4.6],
  ['2026-08-29', 5.03, 5.6, 4.6], ['2026-08-30', 5.11, 5.6, 4.6], ['2026-08-31', 5.15, 5.6, 4.6],
]);

const LINE_CAPABILITY = block('라인별 공정능력 (Cp · Cpk)', 'grouped', ['라인', 'Cp', 'Cpk'], [
  ['도금 1라인', 1.52, 1.38], ['도금 2라인', 1.41, 1.22], ['도금 3라인', 1.67, 1.55], ['도금 4라인', 1.29, 1.04],
]);

const LOT_SUMMARY = block('로트별 측정 요약', 'table', ['LOT', '측정일', '측정 수', '평균(μm)', '표준편차(μm)', '최소(μm)', '최대(μm)', '판정'], [
  ['PL-260825-01', '2026-08-25', 30, 5.12, 0.11, 4.91, 5.38, '적합'],
  ['PL-260826-01', '2026-08-26', 30, 5.08, 0.14, 4.80, 5.41, '적합'],
  ['PL-260827-01', '2026-08-27', 30, 5.21, 0.09, 5.02, 5.44, '적합'],
  ['PL-260828-01', '2026-08-28', 30, 5.17, 0.16, 4.78, 5.57, '주의'],
  ['PL-260829-01', '2026-08-29', 30, 5.03, 0.12, 4.79, 5.29, '적합'],
  ['PL-260830-01', '2026-08-30', 30, 5.11, 0.10, 4.93, 5.33, '적합'],
]);

const OUT_OF_SPEC_MIX = block('규격 이탈 원인 비율', 'donut', ['원인', '비율(%)'], [
  ['전류 밀도 편차', 38.0], ['욕조 온도', 27.5], ['전처리 불량', 19.5], ['지그 접촉', 15.0],
]);

/* ───────── 시드 문서 · 버전 · 파싱 결과 ───────── */

const SEED_DOCS = [
  { docId: 'UPD-2026-0001', title: '8월 4주 회의 자료', memo: '주간 생산·품질 회의 (8/24~8/30) — 8/31 실적 반영 v2', createdBy: '20150310', createdByName: '한도현', createdAt: '2026-08-31 09:12:40' },
  { docId: 'UPD-2026-0002', title: '도금 두께 공정능력 요약', memo: '도금 1~4라인 두께 측정 · Cp/Cpk 주간 요약', createdBy: '20200826', createdByName: '서지안', createdAt: '2026-09-02 15:41:08' },
];

const SEED_VERSIONS = {
  'UPD-2026-0001': [
    { version: 1, fileName: '8월4주_회의자료.xlsx', sizeBytes: 48213, sha256: '3f9a1c…b27e', uploadedBy: '20150310', uploadedByName: '한도현', uploadedAt: '2026-08-31 09:12:40', parseState: 'WARN', warningCnt: 1, memo: '최초 등록' },
    { version: 2, fileName: '8월4주_회의자료_v2.xlsx', sizeBytes: 49870, sha256: 'a81d7e…04c9', uploadedBy: '20140901', uploadedByName: '시스템', uploadedAt: '2026-09-01 08:35:12', parseState: 'OK', warningCnt: 0, memo: '8/31 실적 추가 · 모델별 계획 갱신' },
  ],
  'UPD-2026-0002': [
    { version: 1, fileName: '도금두께_공정능력_9월1주.xlsx', sizeBytes: 36544, sha256: 'c2e0f5…91ab', uploadedBy: '20200826', uploadedByName: '서지안', uploadedAt: '2026-09-02 15:41:08', parseState: 'OK', warningCnt: 0, memo: '최초 등록' },
  ],
};

const SEED_DATA = {
  'UPD-2026-0001:1': {
    sheets: [DAILY_YIELD_V1, PROCESS_DEFECT_V1, MODEL_RESULT_V1, DEFECT_MIX_V1],
    warnings: ["시트 '설비 가동률 #gauge' — 모르는 접미어라 건너뛰었습니다 (#line · #bar · #grouped · #donut · #table 만 지원)."],
  },
  'UPD-2026-0001:2': {
    sheets: [DAILY_YIELD_V2, PROCESS_DEFECT_V2, MODEL_RESULT_V2, DEFECT_MIX_V2],
    warnings: [],
  },
  'UPD-2026-0002:1': {
    sheets: [PLATING_THICKNESS, LINE_CAPABILITY, LOT_SUMMARY, OUT_OF_SPEC_MIX],
    warnings: [],
  },
};

/**
 * 새로 업로드된 파일의 파싱 결과 — 목은 파일 내용을 읽지 않으므로 예시 블록을 돌려줍니다.
 *   파일명에 '도금' → 공정능력 예시 · '빈'/'empty' → FAIL(읽을 시트 없음) · 그 밖에는 회의 자료 예시(WARN 1건).
 */
export function sampleParsed(fileName = '') {
  if (/빈|empty/i.test(fileName)) {
    return { sheets: [], warnings: ['읽을 수 있는 시트가 없습니다 — 1행 헤더 · 1열 X축 · 나머지 열 시리즈 규칙을 확인하세요.'] };
  }
  const plating = /도금|plating/i.test(fileName);
  return JSON.parse(JSON.stringify(plating ? SEED_DATA['UPD-2026-0002:1'] : {
    sheets: SEED_DATA['UPD-2026-0001:2'].sheets,
    warnings: ['목 모드 — 서버 파서가 없어 예시 블록을 보여 줍니다. 실제 서버는 업로드한 엑셀의 시트를 읽어 블록을 만듭니다.'],
  }));
}

/** 파싱 상태 — OK(경고 없음) · WARN(경고 있음) · FAIL(읽을 시트 없음, 저장은 됨) */
export const parseStateOf = (parsed) => (!parsed.sheets.length ? 'FAIL' : parsed.warnings.length ? 'WARN' : 'OK');

/** 세션 저장소 — 대시보드 목과 시스템관리 목이 함께 씁니다 */
export function uploadStore() {
  if (!mockState.store.uploads) {
    mockState.store.uploads = {
      docs: JSON.parse(JSON.stringify(SEED_DOCS)),
      versions: JSON.parse(JSON.stringify(SEED_VERSIONS)),
      data: JSON.parse(JSON.stringify(SEED_DATA)),
      seq: SEED_DOCS.length,
    };
  }
  return mockState.store.uploads;
}

/** 문서 한 건을 목록 응답 모양으로 (최신 버전 · 버전 수 · 최근 업로더 · 크기 · 파싱 상태) */
export function docSummary(doc) {
  const versions = uploadStore().versions[doc.docId] || [];
  const latest = versions[versions.length - 1];
  return {
    docId: doc.docId,
    title: doc.title,
    memo: doc.memo || '',
    latestVersion: latest?.version ?? 0,
    versionCnt: versions.length,
    createdBy: doc.createdBy,
    createdByName: doc.createdByName,
    createdAt: doc.createdAt,
    updatedBy: latest?.uploadedBy ?? doc.createdBy,
    updatedByName: latest?.uploadedByName ?? doc.createdByName,
    updatedAt: latest?.uploadedAt ?? doc.createdAt,
    fileName: latest?.fileName ?? '',
    sizeBytes: latest?.sizeBytes ?? 0,
    parseState: latest?.parseState ?? 'OK',
    warningCnt: latest?.warningCnt ?? 0,
  };
}

/** 문서 목록 — 최근 업로드 순 */
export function listDocs({ keyword, uploadedBy, from, to } = {}) {
  const kw = String(keyword || '').trim();
  return uploadStore().docs
    .map(docSummary)
    .filter((d) => !kw || d.title.includes(kw) || d.memo.includes(kw) || d.docId.includes(kw))
    .filter((d) => !uploadedBy || d.updatedByName === uploadedBy || d.updatedBy === uploadedBy || d.createdByName === uploadedBy)
    .filter((d) => !from || d.updatedAt.slice(0, 10) >= from)
    .filter((d) => !to || d.updatedAt.slice(0, 10) <= to)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

/**
 * 업로드된 파일 하나를 버전으로 등록합니다 — 파일 내용은 읽지 않고 예시 블록을 파싱 결과로 둡니다.
 * @returns 업로드 응답 `data` 와 같은 모양 { docId, title, version, fileName, sizeBytes, sha256, uploadedBy, uploadedByName, uploadedAt, parseState, parsed }
 */
export function addVersion(docId, { file, memo, stamp, user }) {
  const st = uploadStore();
  const doc = st.docs.find((d) => d.docId === docId);
  const list = st.versions[docId] || (st.versions[docId] = []);
  const version = (list[list.length - 1]?.version || 0) + 1;
  const fileName = file?.name || `업로드_${docId}_v${version}.xlsx`;
  const parsed = sampleParsed(fileName);
  const record = {
    version,
    fileName,
    sizeBytes: Number(file?.size) || 41200 + version * 1024,
    sha256: `${Math.random().toString(16).slice(2, 8)}…${Math.random().toString(16).slice(2, 6)}`,
    uploadedBy: user.empNo,
    uploadedByName: user.name,
    uploadedAt: stamp,
    parseState: parseStateOf(parsed),
    warningCnt: parsed.warnings.length,
    memo: memo || '',
  };
  list.push(record);
  st.data[`${docId}:${version}`] = parsed;
  return { docId, title: doc?.title || '', ...record, parsed };
}

/** 버전 이력 응답 — { docId, title, latestVersion, items[] } (최신 버전이 먼저) */
export function versionsOf(docId) {
  const doc = uploadStore().docs.find((d) => d.docId === docId);
  const items = [...(uploadStore().versions[docId] || [])].sort((a, b) => b.version - a.version);
  return { docId, title: doc?.title || '', latestVersion: items[0]?.version ?? 0, items };
}

/** 파싱 데이터 응답 — 업로드 응답과 같은 형태 (버전 기록 + parsed) */
export function dataOf(docId, version) {
  const st = uploadStore();
  const doc = st.docs.find((d) => d.docId === docId);
  const record = (st.versions[docId] || []).find((v) => Number(v.version) === Number(version));
  const parsed = st.data[`${docId}:${version}`];
  if (!doc || !record || !parsed) return null;
  return { docId, title: doc.title, memo: doc.memo, ...record, parsed };
}
