/** 데이터 연동 이력(SY-15 · sys-sync) 소스 계약 — 기획 12 의 6장 WEB 시험 */
const fs = require('fs');
const path = require('path');
const { suite, test, ok, eq } = require('../lib/runner');

const read = (file) => fs.readFileSync(path.join(__dirname, '..', '..', file), 'utf8');

suite('데이터 연동 이력 표시 계약', () => {
  const controller = read('src/domains/system/controller/useSyncHistoryController.js');
  const view = read('src/domains/system/view/SyncHistoryView.jsx');
  const repo = read('src/domains/system/model/systemRepository.js');
  const mock = read('src/services/mock/systemMock.js');

  test('SYN-01 — 상태 선택지는 SYNC_STATE 코드, 대표 오류 firstError, 영역별 실패 문구, kind 를 보내지 않음', () => {
    ok(/\.\.\.stateCodes\]/.test(controller), 'stateCodes 로 선택지');
    ok(!/'예약 대기', '완료', '진행 중'/.test(view), '하드코딩 상태 배열 없음');
    ok(/loadError: firstError\(data\)/.test(controller), 'firstError');
    ok(/loadErrors\.list \?/.test(view) && /loadErrors\.runs \?/.test(view) && view.includes('불러오지 못했습니다 — '), '영역별 실패 문구');
    ok(/getSyncJobs\(\{ state, from, to, srcTable, runId, page, size \}\)/.test(repo), 'kind 파라미터 제거 · srcTable·runId 전달');
    ok(/작업 상세를 불러오지 못했습니다/.test(controller), '상세 실패 토스트');
    ok(/SYNC_STATE_LABEL\[state\]/.test(mock) && /E-VALID-001', `이관 작업 상태 값이 올바르지 않습니다/.test(mock), '목이 코드 밖 값에 400');
  });

  test('SYN-02·14 — 재실행 판정은 retryable, 쓰기 권한 없으면 비활성 + 안내, 중복 요청 방지', () => {
    const model = read('src/domains/system/model/syncModel.js');
    ok(/typeof job\.retryable === 'boolean'/.test(model), 'retryable 우선');
    ok(!/getData\(\)\.ngRows \? btn\('재실행'/.test(view), 'ngRows 기준 제거');
    ok(/canWriteFn\(MENU_ID\)/.test(controller) && /const MENU_ID = 'sys-sync'/.test(controller), 'canWrite(sys-sync)');
    ok(/btn\('재실행', true, true, act\.current\.writeDeniedText\)/.test(view), '목록 단추 비활성 + 툴팁');
    ok(/disabled=\{!canWrite\}/.test(view), '상세 모달 재실행 비활성');
    ok(/inFlight\.current\.has\(jobId\)/.test(controller), '연속 요청 방지');
  });

  test('SYN-03 — 연동 상태 줄 + 카드 2종(금일 이관 · 미조치 실패), 실패 작업 보기는 oldestOpenFailAt 부터', () => {
    ok(/nativeID="sync-health-line"/.test(view), '상태 줄');
    eq((view.match(/<StatCard\b/g) || []).length, 3, 'StatCard 3곳(미조치 실패는 서버 판정 유무로 둘 중 하나만 그림)');
    ok(/<Grid cols=\{2\}>/.test(view), '카드 2열');
    ok(view.includes('label="미조치 실패"') && view.includes('조치할 실패 없음'), '미조치 실패 카드');
    ok(/oldestOpenFailAt/.test(controller) && /state: 'FAIL'/.test(controller), '실패 작업 보기');
    ok(view.includes('연동 상태를 확인하지 못했습니다'), '요약 실패 표시');
  });

  test('SYN-05 — 실행 메시지·작업 비고·오류 메시지의 내부 주소를 가린다', () => {
    const { maskInternalAddress } = loadModel();
    const masked = maskInternalAddress('The TCP/IP connection to the host 192.0.2.10, port 1433 has failed. jdbc:sqlserver://192.0.2.10:1433;db=x 10.0.0.1');
    ok(!/\b\d{1,3}(\.\d{1,3}){3}\b/.test(masked), `IPv4 없음: ${masked}`);
    ok(masked.includes('port 1433') && masked.includes('(접속 문자열 가림)'), `포트 유지·jdbc 가림: ${masked}`);
    eq(maskInternalAddress('호스트 db01, 포트 1433 연결 실패'), '호스트 (가림), 포트 1433 연결 실패');
    eq(maskInternalAddress('Connection is not available, request timed out after 30009ms'), 'Connection is not available, request timed out after 30009ms');
    ok(/maskSyncHistory\(data\)/.test(repo) && /maskSyncJobDetail\(await unwrap/.test(repo), '목록·상세 응답에 적용');
  });

  test('SYN-07 — 확인창 부제는 목록 행·params, checksumMatch null 은 「검증 전」', () => {
    const { retryConfirmText } = loadModel();
    const t = retryConfirmText({ jobId: 'J1', srcTable: undefined, dstTable: undefined, kind: 'FULL' });
    ok(!t.sub.includes('undefined') && !t.message.includes('undefined'), 'undefined 없음');
    ok(t.message.includes('원본 전체로 다시 이관'), 'FULL 문구');
    ok(retryConfirmText({ jobId: 'J2', srcTable: 'A', dstTable: 'B', kind: 'INCR' }).message.includes('워터마크'), 'INCR 문구');
    ok(/srcTable: row\.srcTable \|\| params\.srcTable/.test(controller), 'params 로 부제');
    ok(/m\.checksumMatch === true/.test(view) && view.includes('검증 전(또는 미수행)'), 'checksum null 분기');
  });

  test('SYN-07·08·09 — 오류 상세 표, 원본 테이블 조건, 실행 이력 조건·쪽·행 클릭 필터', () => {
    ok(/function JobErrorTable/.test(view) && /field: 'rowNo', width: 64/.test(view) && /field: 'code', width: 90/.test(view), '오류 표 열');
    ok(/field: 'message', minWidth: 320/.test(view) && /field: 'srcKey', minWidth: 200/.test(view), '메시지·원본 키 폭');
    ok(/앞 \$\{ERROR_LIMIT\}건만 표시합니다/.test(view), '500건 각주');
    ok(/label="원본 테이블"/.test(view) && /srcTableOptions/.test(controller), '원본 테이블 조건');
    ok(/source: runSource/.test(repo) && /RUN_SOURCE_OPTIONS/.test(controller) && /sizes=\{RUN_PAGE_SIZES\}/.test(view), '실행 이력 출처·쪽');
    ok(/onRowClick=\{onRunClick\}/.test(view) && /runHasJobs\(run\)/.test(view) && /엔진 실행 상세/.test(view), '행 클릭 → 필터 또는 실행 상세');
    ok(/실행 조건 해제/.test(view), '조건 해제');
    ok(!/zIndex: -1/.test(view), '패널 가림 회피 코드 제거(공통 포털)');
  });

  test('SYN-10 — 숨긴 카드 자료는 조회하지 않고, 연동 매핑은 진입 때 한 번만, 내보내기 열 추가', () => {
    ok(/withDrift: SHOW_DRIFT_CARD/.test(controller) && /\.\.\.\(withDrift \? \{/.test(repo), '드리프트 조회는 카드가 보일 때만');
    ok(/useAsync\(\(\) => repo\.loadSyncMaps\(\), \[\]/.test(controller) && !/maps: systemService\.getSyncMaps/.test(repo), '매핑은 폴링에서 뺌');
    ['원 작업', '정합성', '재시도', '실행 경로', '실패 원인'].forEach((h) => ok(controller.includes(`head: '${h}'`), `내보내기 ${h}`));
    ok(!/rawRuns|rawItems/.test(controller), '3단계 화면 쪽 이중 거름 제거');
  });

  test('SYN-15 — 머리말 엑셀 단추 없음, 카드마다 ExportMenuButton, 조회 목록 attrs·VIEW, 전체 POST /sync/export', () => {
    ok(!/actions=\{<Button label="엑셀 다운로드"/.test(view), '머리말 단추 제거');
    ok((view.match(/<ExportMenuButton/g) || []).length >= 3, '작업·실행(+숨긴 드리프트) 카드마다');
    ok(/instanceRef=\{jobsGridRef\}/.test(view) && /instanceRef=\{runsGridRef\}/.test(view), '그리드 인스턴스');
    ok(/scope: 'VIEW'/.test(controller) && /buildGridExport\(\{ instance: cfg\.ref\.current/.test(controller), '조회 목록');
    ok(/downloadFromServer\(\{ path, body/.test(controller) && /path: '\/sync\/export'/.test(repo) && /scope: 'ALL'/.test(repo), '전체 = 서버 생성');
    const endpoints = read('src/services/api/endpoints.js');
    ok(/postSyncExport: \{[\s\S]*?path: '\/api\/v1\/sync\/export'/.test(endpoints), '카탈로그 등록');
    const model = read('src/domains/system/model/syncModel.js');
    ok(/SHOW_DRIFT_CARD = false/.test(model) && /SHOW_MAP_CARD = false/.test(model) && /SHOW_DRIFT_CARD \? \(/.test(view), '숨긴 카드 플래그 유지');
  });
});

/** syncModel.js 는 ESM 이라 간단히 변환해 불러옵니다 (외부 의존 없음) */
function loadModel() {
  const src = read('src/domains/system/model/syncModel.js').replace(/export (const|function) /g, '$1 ');
  const names = ['maskInternalAddress', 'retryConfirmText', 'isRetryTarget', 'healthLine', 'agoText'];
  // eslint-disable-next-line no-new-func
  return new Function(`${src}\nreturn { ${names.join(', ')} };`)();
}
