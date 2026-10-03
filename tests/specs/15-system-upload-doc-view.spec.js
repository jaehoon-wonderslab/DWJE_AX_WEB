/** 업로드 문서 목록(SY-16 · sys-upload-doc) 소스 계약 — 기획 11 의 6장 WEB 시험 */
const fs = require('fs');
const path = require('path');
const { suite, test, ok } = require('../lib/runner');

const read = (file) => fs.readFileSync(path.join(__dirname, '..', '..', file), 'utf8');

suite('업로드 문서 목록 표시 계약', () => {
  const controller = read('src/domains/system/controller/useUploadDocController.js');
  const view = read('src/domains/system/view/UploadDocView.jsx');
  const repo = read('src/domains/system/model/systemRepository.js');

  test('UPD-01 — 서버 쪽 나눔(usePaging)·파싱 상태 조건을 쓰고 ALL_SIZE 로 한 번에 받지 않는다', () => {
    ok(/usePaging\(/.test(controller), 'usePaging');
    ok(!/export const ALL_SIZE/.test(controller), 'ALL_SIZE 제거');
    ok(/parseState/.test(controller) && /PARSE_STATE_OPTIONS/.test(controller), '파싱 상태 조건');
    ok(/<Pagination meta=\{meta\}/.test(view), '표 아래 Pagination');
  });

  test('UPD-06·07 — 업로더 선택지는 서버 uploaders(사번 값), 카드는 서버 summary, 클라이언트 요약 계산 없음', () => {
    ok(/data\?\.uploaders/.test(controller) && /value: String\(u\.userId\)/.test(controller), 'uploaders 사번 값');
    ok(/summary: normalizeUploadSummary\(res\.data\?\.summary\)/.test(repo), '저장소가 summary 를 화면 모양으로');
    ok(/u\.empNo \?\? u\.userId/.test(repo) && /u\.name \?\? u\.userName/.test(repo), '서버 uploaders{empNo,name,cnt} 를 받음');
    ok(/s\.docCnt \?\? s\.total/.test(repo) && /scope: all \? 'ALL' : 'COND'/.test(repo), '2단계 summary{total,ok,warn,fail} 와 UPD-07 모양 둘 다');
    ok(!/monthCnt/.test(controller), '클라이언트 이번 달 계산 제거');
    ['문서 수', '총 버전', '원본 용량', '최근 업로드'].forEach((label) => ok(view.includes(`label="${label}"`), `카드 ${label}`));
    ok(view.includes('문서명 · 메모 · 파일명 · 문서 ID'), '검색 안내 문구');
    ok(view.includes('조건을 넓혀 보십시오'), '조건 결과 0건 문구');
  });

  test('UPD-02·08·09·10 — 드로어가 memo·fileState·warnings·직전 버전 같은 파일을 그린다', () => {
    ok(/v\.memo \?/.test(view) && view.includes('메모: '), 'memo');
    ok(/fileState/.test(view) && view.includes('원본 없음') && view.includes('API 서버 저장소를 확인하십시오'), 'fileState');
    ok(/v\.parseState === 'FAIL'/.test(view) && /warnings/.test(view), '경고 펼침(FAIL 기본 펼침)');
    ok(view.includes('직전 버전과 같은 파일'), '중복 안내');
  });

  test('UPD-15 — ExportMenuButton, 조회 목록은 그리드 인스턴스·attrs·VIEW, 전체는 size=0·ALL·상한', () => {
    ok(/<ExportMenuButton/.test(view) && !/label="엑셀 다운로드"/.test(view), '패널 단추로 교체');
    ok(/instanceRef=\{gridRef\}/.test(view), '그리드 인스턴스 연결');
    ok(/buildGridExport\(\{ instance: gridRef\.current/.test(controller), '조회 목록 = 그리드 행·열 순서');
    ok(/scope: 'VIEW'/.test(controller) && /scope: 'ALL'/.test(controller), 'scope VIEW/ALL');
    ok(/condSummary/.test(controller) && /menuId: MENU_ID/.test(controller), 'condSummary·menuId');
    ok(/loadSystemUploads\(\{ page: 1, size: 0 \}\)/.test(controller), '전체 = size=0');
    ok(/EXPORT_ALL_LIMIT = 10000/.test(controller) && /truncated/.test(controller), '상한 10,000건 안내');
    const exportUtil = read('src/domains/system/model/gridExport.js');
    ok(/attrs: cols\.map\(\(c\) => c\.attr\)/.test(exportUtil), 'attrs 를 열 순서대로 넘김');
    const exportPart = controller.slice(controller.indexOf('const exportView'), controller.indexOf('// ── 숨기기'));
    ok(exportPart.length > 100 && !/canWrite/.test(exportPart), '내려받기는 쓰기 권한을 보지 않음(R-10)');
  });

  test('R-19 · D-13 — 숨긴 문서 포함 · 숨기기(사유 필수 200자)·복원 · 흐림+숨김 태그 · 쓰기 권한 비활성', () => {
    const service = read('src/services/api/systemService.js');
    ok(/includeDeleted: includeDeleted \|\| undefined/.test(controller), 'includeDeleted 는 체크했을 때만 보냄');
    ok(/label=\{`숨긴 문서 포함/.test(view), '숨긴 문서 포함 체크');
    ok(/title: '관리', field: 'action'/.test(view) && /d\.deleted \? '복원' : '숨기기'/.test(view), '관리 열 숨기기/복원');
    ok(/required: true/.test(view) && /hideReasonMax/.test(view) && /HIDE_REASON_MAX = 200/.test(controller), '사유 필수·200자');
    ok(/opacity = row\.getData\(\)\?\.deleted/.test(view) && /<span class="tag">숨김<\/span>/.test(view), '흐림 + 숨김 태그');
    ok(/canWriteFn\(MENU_ID\)/.test(controller) && /btn\(label, true, act\.current\.writeDeniedText\)/.test(view), '쓰기 권한 없으면 비활성 + 툴팁');
    ok(/deletedDocCnt: num\(s\.deletedDocCnt\)/.test(repo), '요약 deletedDocCnt');
    // DELETE 본문: 카탈로그의 deleteBody 로 경로 변수(docId)를 뺀 나머지(reason)를 본문에 싣습니다
    const catalog = read('src/services/api/endpoints.js');
    ok(/deleteSystemUploadsByDocId: \{[\s\S]{0,600}?deleteBody: true/.test(catalog)
      && /request\('deleteSystemUploadsByDocId', params\)/.test(service)
      && /deleteSystemUploadsByDocId\(\{ docId, reason \}\)/.test(repo), 'DELETE 본문으로 사유');
    ok(!/읽기 전용/.test(view.slice(0, view.indexOf('export default'))), '화면 설명에서 「읽기 전용」 정리');
  });

  test('UPD-03·14 — 대시보드 업로드: xlsm 안내·메모 1000자·쓰기 권한 없으면 단추 비활성 + 안내', () => {
    const dc = read('src/domains/dashboard/controller/useUploadReportController.js');
    const dv = read('src/domains/dashboard/view/UploadReportView.jsx');
    ok(/\\\.xlsm\$\/i/.test(dc) && dc.includes('매크로 포함 통합문서(xlsm)는 올릴 수 없습니다'), 'xlsm 안내');
    ok(/MAX_MEMO_LEN = 1000/.test(dc) && /validate: memoError/.test(dc), '메모 길이 검증');
    ok(/canWrite\('dash-ai-upload'\)/.test(dc), '쓰기 권한 판정');
    ok(dc.includes('미배정 계정은 이 동작을 할 수 없습니다. 전산팀에 부서 배정을 요청하세요.'), '안내 문구');
    ok(/disabled=\{uploading \|\| !canWriteUpload\}/.test(dv), '단추 비활성(숨기지 않음)');
    ok(/duplicateOf/.test(dc), '같은 파일 재업로드 안내');
  });
});
