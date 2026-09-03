/**
 * 시스템관리 목 데이터 (SY-01 ~ SY-15)
 */

/* ───────── SY-01 계정·권한 변경 이력 ───────── */
export const PERM_LOGS = [
  { ts: '2026-08-28 09:02', target: '제조팀', act: '메뉴 권한', detail: '비가동 관리 입력 권한 부여', by: '한도현 (전산팀)' },
  { ts: '2026-08-27 16:40', target: '윤가람 (제조팀)', act: '계정', detail: '계정 정지', by: '한도현 (전산팀)' },
  { ts: '2026-08-27 11:18', target: '경영진', act: '메뉴 권한', detail: '성과지표 대시보드 접근 허용', by: '한도현 (전산팀)' },
  { ts: '2026-08-25 14:05', target: '생산관리팀', act: '데이터 권한', detail: '단가·금액 데이터 차단', by: '최영도 (경영진)' },
  { ts: '2026-08-23 10:33', target: '최민아', act: '계정', detail: '생산관리팀으로 부서 이동', by: '한도현 (전산팀)' },
  { ts: '2026-08-21 09:12', target: '품질보증팀', act: '메뉴 권한', detail: '부적합 관리 입력 권한 부여', by: '한도현 (전산팀)' },
];

/* ───────── SY-03 데이터 접근 감사 ───────── */
export const DATA_ACCESS_AUDIT = [
  { ts: '09:12:41', user: '김선영', dept: '품질보증팀', screen: '폐기 보고서', field: '단가·금액', result: 'blind', note: '부서 권한 없음' },
  { ts: '09:08:02', user: '정우진', dept: '생산관리팀', screen: '제품별 수율', field: '단가·금액', result: 'blind', note: '부서 권한 없음' },
  { ts: '09:04:12', user: '시스템', dept: '통합관리자', screen: '연간 출하계획', field: '출하 계획', result: '열람', note: '권한 확인됨' },
  { ts: '08:52:30', user: '강민석', dept: '제조팀', screen: '불량 현황 조회', field: '수율·불량률', result: 'blind', note: '부서 권한 없음' },
  { ts: '08:41:03', user: '김선영', dept: '품질보증팀', screen: '고객사별 LRR', field: '고객사', result: '열람', note: '권한 확인됨' },
  { ts: '08:22:55', user: '한도현', dept: '전산팀', screen: '계정 관리', field: '작업자 정보', result: '열람', note: '권한 확인됨' },
  { ts: '08:05:17', user: '정우진', dept: '생산관리팀', screen: '폐기 보고서', field: '단가·금액', result: 'blind', note: 'CSV 다운로드에서도 제외' },
];

/** 데이터 접근 권한 적용 미리보기 항목 */
export const DATA_PERM_PREVIEW = [
  { field: 'qty', label: '생산 수량', value: '12,480 EA' },
  { field: 'yield', label: '공정 수율', value: '99.1%' },
  { field: 'price', label: '폐기 금액', value: '48,320,000원' },
  { field: 'customer', label: '고객사', value: '글로벌 고객사 A' },
  { field: 'plan', label: '출하 계획', value: '19,735,723 EA' },
  { field: 'mold', label: '금형 이력', value: 'M-2207 · 교체 후 42분' },
  { field: 'worker', label: '작업자', value: '20260101 김OO' },
];

/* ───────── SY-04 이상 알림 발송 조건 ───────── */
export const ALERT_CONDITIONS = [
  { condId: 'AC-01', name: '불량률 임계 초과', metric: '공정 불량률 (%)', op: '>=', threshold: '3.0 %', duration: '10분 연속', target: 'PR-01 ~ PR-10', severity: '위험', channels: '메일 · 시스템 팝업', groups: '품질보증팀 · 제조팀 파트장', window: '24시간 상시', dedup: '30분', enabled: true },
  { condId: 'AC-02', name: '패턴 이상 감지', metric: '불량 유형 급증 배수', op: '>=', threshold: '3.0 배', duration: '2시간 이동평균', target: 'AOI-01 ~ AOI-10', severity: '주의', channels: '메일', groups: '품질보증팀 · 생산관리팀', window: '08:00 ~ 20:00', dedup: '60분', enabled: true },
  { condId: 'AC-03', name: '설비 정지 지속', metric: '비가동 시간 (분)', op: '>=', threshold: '30 분', duration: '즉시', target: '프레스 전체', severity: '위험', channels: '메일 · SMS', groups: '생산관리팀 · 제조팀', window: '24시간 상시', dedup: '없음', enabled: true },
  { condId: 'AC-04', name: '비가동 사유 미등록', metric: '사유 미입력 경과 (분)', op: '>=', threshold: '30 분', duration: '즉시', target: '전체 설비', severity: '주의', channels: '시스템 팝업', groups: '현장 반장', window: '08:00 ~ 20:00', dedup: '60분', enabled: true },
  { condId: 'AC-05', name: '목표 수율 미달', metric: '일 수율 (%)', op: '<', threshold: '97.0 %', duration: '일 마감 시', target: '전체 모델', severity: '주의', channels: '메일', groups: '품질보증팀 · 경영진', window: '18:00 일 1회', dedup: '일 1회', enabled: true },
  { condId: 'AC-06', name: '데이터 수집 지연', metric: 'IoT 수신 지연 (초)', op: '>=', threshold: '300 초', duration: '5분 연속', target: '프레스 IoT · AOI 로그', severity: '위험', channels: '메일 · 시스템 팝업', groups: '전산팀', window: '24시간 상시', dedup: '15분', enabled: true },
  { condId: 'AC-07', name: '경계 판정 누적', metric: '미검토 경계 건수', op: '>=', threshold: '10 건', duration: '즉시', target: 'AOI 전체', severity: '주의', channels: '시스템 팝업', groups: '품질보증팀', window: '08:00 ~ 20:00', dedup: '120분', enabled: true },
  { condId: 'AC-08', name: '출하 후 불량 통보', metric: '고객사 통보 접수', op: '>=', threshold: '1 건', duration: '즉시', target: '전체 고객사', severity: '위험', channels: '메일', groups: '품질보증팀 · 경영진', window: '24시간 상시', dedup: '없음', enabled: true },
  { condId: 'AC-09', name: '월 폐기 금액 초과', metric: '월 누적 폐기 금액', op: '>=', threshold: '50,000,000 원', blindField: 'price', duration: '일 1회 집계', target: '전 공정', severity: '위험', channels: '메일', groups: '경영진 · 생산관리팀', window: '09:00 일 1회', dedup: '일 1회', enabled: true },
  { condId: 'AC-10', name: '금형 교체 초기 구간', metric: '교체 후 경과 60분 내 불량률', op: '>=', threshold: '2.0 %', duration: '즉시', target: '프레스 전체', severity: '낮음', channels: '시스템 팝업', groups: '제조팀', window: '24시간 상시', dedup: '60분', enabled: false },
  { condId: 'AC-11', name: '재고 임계 미달', metric: '소재 재고 (일)', op: '<=', threshold: '3 일', duration: '일 1회 집계', target: '주요 소재 12종', severity: '주의', channels: '메일', groups: '생산관리팀', window: '09:00 일 1회', dedup: '일 1회', enabled: false },
];

/* ───────── SY-05 알림 수신자 ───────── */
export const RECIPIENTS = [
  { recipientId: 'R01', empNo: '20180412', mail: 'sy.kim@dukwoo.co.kr', phone: '010-2481-3092', messenger: '@sykim', night: true, state: '수신' },
  { recipientId: 'R02', empNo: '20210133', mail: 'sm.lee@dukwoo.co.kr', phone: '010-3372-1180', messenger: '@smlee', night: false, state: '부재' },
  { recipientId: 'R03', empNo: '20190271', mail: 'jh.park@dukwoo.co.kr', phone: '010-8820-4417', messenger: '@jhpark', night: false, state: '수신' },
  { recipientId: 'R04', empNo: '20170905', mail: 'wj.jung@dukwoo.co.kr', phone: '010-5514-2206', messenger: '@wjjung', night: true, state: '수신' },
  { recipientId: 'R05', empNo: '20220418', mail: 'ma.choi@dukwoo.co.kr', phone: '010-2290-7735', messenger: '@machoi', night: false, state: '수신' },
  { recipientId: 'R06', empNo: '20160722', mail: 'ms.kang@dukwoo.co.kr', phone: '010-4471-9908', messenger: '@mskang', night: true, state: '수신' },
  { recipientId: 'R07', empNo: '20230201', mail: 'sh.oh@dukwoo.co.kr', phone: '010-6612-3341', messenger: '@shoh', night: true, state: '수신' },
  { recipientId: 'R08', empNo: '20150310', mail: 'dh.han@dukwoo.co.kr', phone: '010-3308-5572', messenger: '@dhhan', night: true, state: '수신' },
  { recipientId: 'R09', empNo: '20200826', mail: 'ja.seo@dukwoo.co.kr', phone: '010-7745-1123', messenger: '@jaseo', night: true, state: '수신' },
  { recipientId: 'R10', empNo: '20110204', mail: 'yd.choi@dukwoo.co.kr', phone: '010-2201-8890', messenger: '@ydchoi', night: false, state: '수신' },
  { recipientId: 'R11', empNo: '20130619', mail: 'tk.lim@dukwoo.co.kr', phone: '010-9938-4402', messenger: '@tklim', night: false, state: '수신' },
];

export const RECIPIENT_GROUPS = [
  { groupId: 'G1', name: '품질보증팀', channels: '메일 · 시스템 팝업', window: '24시간 상시', night: true, members: ['20180412', '20210133', '20190271'] },
  { groupId: 'G2', name: '생산관리팀', channels: '메일', window: '08:00 ~ 20:00', night: false, members: ['20170905', '20220418'] },
  { groupId: 'G3', name: '제조팀 파트장', channels: '메일 · SMS', window: '24시간 상시', night: true, members: ['20160722', '20230201'] },
  { groupId: 'G4', name: '전산팀', channels: '메일 · 시스템 팝업', window: '24시간 상시', night: true, members: ['20150310', '20200826'] },
  { groupId: 'G5', name: '경영진', channels: '메일', window: '08:00 ~ 20:00', night: false, members: ['20110204', '20130619'] },
  { groupId: 'G6', name: '현장 반장', channels: '시스템 팝업', window: '06:00 ~ 18:00', night: false, members: ['20230201'] },
];

/** 당번 · 부재 시 대리 수신 */
export const DUTIES = [
  { dutyId: 'D1', from: '2026-08-25', to: '2026-08-29', group: '제조팀 파트장', main: '강민석', sub: '오세훈', reason: '주간 정기 당번' },
  { dutyId: 'D2', from: '2026-08-24', to: '2026-08-26', group: '품질보증팀', main: '이수민', sub: '박지훈', reason: '연차' },
  { dutyId: 'D3', from: '2026-08-22', to: '2026-08-24', group: '전산팀', main: '서지안', sub: '한도현', reason: '외부 교육' },
  { dutyId: 'D4', from: '2026-09-01', to: '2026-09-05', group: '생산관리팀', main: '정우진', sub: '최민아', reason: '출장' },
];

/** 미확인 건 승격 단계 */
export const ESCALATION_RULES = [
  { level: '1차', after: '30분', to: '제조팀 파트장', channels: '메일 · SMS', note: '담당자가 확인하지 않은 경우' },
  { level: '2차', after: '2시간', to: '해당 팀장', channels: '메일 · 시스템 팝업', note: '1차 승격 후에도 미확인' },
  { level: '3차', after: '4시간', to: '경영진', channels: '메일', note: '위험 등급만 승격' },
];

/* ───────── SY-06 용어 사전 ───────── */
export const GLOSSARY = [
  { termId: 'T01', term: 'Derkwoo', definition: '덕우전자 (Derkwoo Electronics)', domain: '회사/고객사', variants: [{ variantId: 'V01', word: '덕우전자', by: '20180412', at: '2026-08-12' }, { variantId: 'V02', word: '덕우', by: '20170905', at: '2026-08-12' }, { variantId: 'V03', word: 'DW', by: '20150310', at: '2026-08-14' }] },
  { termId: 'T02', term: 'FACA', definition: '고장 원인 분석 및 시정 조치 보고서 (Failure Analysis and Corrective Action)', domain: '품질관리', variants: [{ variantId: 'V04', word: '보고서', by: '20180412', at: '2026-08-12' }, { variantId: 'V05', word: '오류보고서', by: '20180412', at: '2026-08-12' }, { variantId: 'V06', word: '파카', by: '20160722', at: '2026-08-18' }] },
  { termId: 'T03', term: 'Issue', definition: '품질 이상 및 부적합 이슈 (Quality Issue)', domain: '품질관리', variants: [{ variantId: 'V07', word: 'issue', by: '20140901', at: '2026-08-11' }, { variantId: 'V08', word: '이슈', by: '20180412', at: '2026-08-13' }] },
  { termId: 'T04', term: 'LGIT', definition: 'LG이노텍 (LG Innotek)', domain: '고객사', variants: [{ variantId: 'V09', word: '엘지이노텍', by: '20170905', at: '2026-08-13' }, { variantId: 'V10', word: '이노텍', by: '20110204', at: '2026-08-19' }] },
  { termId: 'T05', term: 'MEM', definition: '메인 양산 프로젝트 라인 (MEM / MEMS)', domain: '프로젝트', variants: [{ variantId: 'V11', word: 'MEMS', by: '20140901', at: '2026-08-11' }, { variantId: 'V12', word: '멤', by: '20160722', at: '2026-08-20' }] },
  { termId: 'T06', term: 'VR', definition: 'VR 기기용 부품 프로젝트 (Virtual Reality)', domain: '프로젝트', variants: [] },
  { termId: 'T07', term: 'Baffle', definition: '배플 / 차광판 (Baffle)', domain: '제품/부품', variants: [{ variantId: 'V13', word: '배플', by: '20160722', at: '2026-08-16' }, { variantId: 'V14', word: '차광판', by: '20180412', at: '2026-08-16' }] },
  { termId: 'T08', term: 'Cowell', definition: '코웰 (Cowell E Holdings)', domain: '고객사', variants: [{ variantId: 'V15', word: '코웰', by: '20170905', at: '2026-08-13' }] },
  { termId: 'T09', term: 'Shield', definition: '쉴드 / 차폐 커버 (Shield)', domain: '제품/부품', variants: [{ variantId: 'V16', word: '쉴드', by: '20160722', at: '2026-08-16' }, { variantId: 'V17', word: '차폐커버', by: '20180412', at: '2026-08-17' }] },
  { termId: 'T10', term: 'Cosmetic', definition: '외관 품질 / 외관 상태 (Cosmetic Quality)', domain: '품질항목', variants: [{ variantId: 'V18', word: '외관', by: '20180412', at: '2026-08-14' }, { variantId: 'V19', word: '코스메틱', by: '20160722', at: '2026-08-20' }] },
  { termId: 'T11', term: 'Can', definition: '캔 / 케이스 (Can)', domain: '제품/부품', variants: [{ variantId: 'V20', word: 'can', by: '20140901', at: '2026-08-11' }, { variantId: 'V21', word: '캔', by: '20160722', at: '2026-08-16' }, { variantId: 'V22', word: '케이스', by: '20170905', at: '2026-08-18' }] },
  { termId: 'T12', term: 'KR', definition: '한국 사업장 / 국내 법인 (Korea)', domain: '지역/법인', variants: [{ variantId: 'V23', word: '한국', by: '20110204', at: '2026-08-19' }, { variantId: 'V24', word: '국내', by: '20110204', at: '2026-08-19' }] },
  { termId: 'T13', term: 'DPBU', definition: '디스플레이 부품 사업부 (Display Product Business Unit)', domain: '조직/부서', variants: [{ variantId: 'V25', word: '디스플레이사업부', by: '20110204', at: '2026-08-19' }] },
  { termId: 'T14', term: 'Report', definition: '품질/원인분석 보고서 (Report)', domain: '문서양식', variants: [{ variantId: 'V26', word: '리포트', by: '20180412', at: '2026-08-14' }] },
  { termId: 'T15', term: 'SC', definition: '쉴드 캔 약칭 (Shield Can)', domain: '제품/부품', variants: [{ variantId: 'V27', word: 'sc', by: '20140901', at: '2026-08-11' }, { variantId: 'V28', word: 's/c', by: '20140901', at: '2026-08-11' }, { variantId: 'V29', word: '쉴드캔', by: '20160722', at: '2026-08-16' }] },
  { termId: 'T16', term: 'NG', definition: '불량 / 부적합 판정 (Not Good)', domain: '품질판정', variants: [{ variantId: 'V30', word: '불량', by: '20180412', at: '2026-08-12' }, { variantId: 'V31', word: '엔지', by: '20160722', at: '2026-08-20' }] },
  { termId: 'T17', term: 'Decode', definition: '바코드 디코드 / 판독 (Decode)', domain: '식별/바코드', variants: [{ variantId: 'V32', word: '디코드', by: '20150310', at: '2026-08-15' }, { variantId: 'V33', word: '판독', by: '20150310', at: '2026-08-15' }] },
  { termId: 'T18', term: 'PDX', definition: '선행 개발/시제품 프로젝트 (PDX)', domain: '프로젝트', variants: [] },
  { termId: 'T19', term: 'Dent', definition: '찍힘 / 덴트 (Dent)', domain: '불량유형', variants: [{ variantId: 'V34', word: '찍힘', by: '20180412', at: '2026-08-12' }, { variantId: 'V35', word: '덴트', by: '20160722', at: '2026-08-16' }, { variantId: 'V36', word: 'chip', by: '20180412', at: '2026-08-21' }] },
  { termId: 'T20', term: 'Stiffener', definition: '스티프너 / FPCB 보강판 (Stiffener)', domain: '제품/부품', variants: [{ variantId: 'V37', word: '스티프너', by: '20160722', at: '2026-08-16' }, { variantId: 'V38', word: '보강판', by: '20170905', at: '2026-08-18' }] },
  { termId: 'T21', term: 'Cu', definition: '구리 / 동 (Copper - Cu)', domain: '원자재', variants: [{ variantId: 'V39', word: '구리', by: '20170905', at: '2026-08-13' }, { variantId: 'V40', word: '동판', by: '20160722', at: '2026-08-20' }] },
  { termId: 'T22', term: 'CM', definition: '카메라 모듈 (Camera Module)', domain: '제품군', variants: [{ variantId: 'V41', word: '카메라모듈', by: '20170905', at: '2026-08-13' }] },
  { termId: 'T23', term: 'Deformation', definition: '변형 / 형상 뒤틀림 (Deformation)', domain: '불량유형', variants: [{ variantId: 'V42', word: '변형', by: '20180412', at: '2026-08-12' }, { variantId: 'V43', word: '뒤틀림', by: '20160722', at: '2026-08-20' }] },
  { termId: 'T24', term: 'ENG', definition: '엔지니어링 / 영문 기술 문서 (Engineering / English)', domain: '구분/언어', variants: [{ variantId: 'V44', word: 'Eng', by: '20140901', at: '2026-08-11' }, { variantId: 'V45', word: '영문', by: '20150310', at: '2026-08-15' }] },
  { termId: 'T25', term: 'Sphinx', definition: '스핑크스 프로젝트 (Sphinx)', domain: '프로젝트', variants: [{ variantId: 'V46', word: '스핑크스', by: '20170905', at: '2026-08-18' }] },
  { termId: 'T26', term: 'CMBU', definition: '카메라 모듈 사업부 (Camera Module Business Unit)', domain: '조직/부서', variants: [{ variantId: 'V47', word: '카메라사업부', by: '20110204', at: '2026-08-19' }] },
  { termId: 'T27', term: 'Low', definition: '하한치 / 규격 미달 (Low Spec / Low Cpk)', domain: '수치기준', variants: [{ variantId: 'V48', word: '하한', by: '20180412', at: '2026-08-14' }, { variantId: 'V49', word: '로우', by: '20160722', at: '2026-08-20' }] },
  { termId: 'T28', term: 'Cpk', definition: '공정능력지수 (Process Capability Index)', domain: '품질통계', variants: [{ variantId: 'V50', word: '공정능력지수', by: '20180412', at: '2026-08-14' }, { variantId: 'V51', word: '씨피케이', by: '20160722', at: '2026-08-20' }] },
  { termId: 'T29', term: 'Side', definition: '측면 / 옆면 (Side)', domain: '위치부위', variants: [{ variantId: 'V52', word: '측면', by: '20160722', at: '2026-08-16' }, { variantId: 'V53', word: '옆면', by: '20160722', at: '2026-08-16' }] },
  { termId: 'T30', term: 'Reel', definition: '릴 포장 (Reel Packaging)', domain: '포장/물류', variants: [{ variantId: 'V54', word: '릴', by: '20170905', at: '2026-08-18' }, { variantId: 'V55', word: '릴포장', by: '20170905', at: '2026-08-18' }] },
  { termId: 'T31', term: 'Dimension', definition: '치수 / 기하 규격 (Dimension)', domain: '치수관리', variants: [{ variantId: 'V56', word: '치수', by: '20180412', at: '2026-08-12' }, { variantId: 'V57', word: '디멘전', by: '20160722', at: '2026-08-20' }] },
  { termId: 'T32', term: 'Centaur', definition: '센토 프로젝트 (Centaur)', domain: '프로젝트', variants: [{ variantId: 'V58', word: '센토', by: '20170905', at: '2026-08-18' }] },
];

export const GLOSSARY_DOMAINS = [
  '회사/고객사', '고객사', '품질관리', '품질항목', '품질판정', '품질통계', '프로젝트', '제품/부품', '제품군',
  '불량유형', '원자재', '조직/부서', '지역/법인', '문서양식', '식별/바코드', '수치기준', '위치부위', '포장/물류', '치수관리', '구분/언어',
];

/* ───────── SY-07 제품군 순위 변경 이력 ───────── */
export const FAMILY_RANK_LOGS = [
  { ts: '2026-08-23 14:22', act: '제품군 순위', detail: 'Camera Module 2순위 → 6순위 조정', by: '최영도 (경영진)' },
  { ts: '2026-08-15 09:40', act: '제품군 순위', detail: 'Shield · 차폐 커버 신규 등록 · 3순위', by: '한도현 (전산팀)' },
];

/* ───────── SY-08 자연어 질의 이력 ───────── */
export const CHAT_HISTORY_SEED = [
  { messageId: 'H01', ts: '09:24', question: '오늘 chip 불량 가장 많은 라인 어디야?', intentLabel: '불량 집계 조회', agents: '② ⑤', elapsedMs: 1600, rating: '유용', user: '김선영', dept: '품질보증팀' },
  { messageId: 'H02', ts: '09:02', question: 'L260824-031 어디까지 갔어?', intentLabel: 'LOT 이력 추적', agents: '⑤', elapsedMs: 2100, rating: '유용', user: '이수민', dept: '품질보증팀' },
  { messageId: 'H03', ts: '08:47', question: '지난주 Krios_s 공정별 수율', intentLabel: '수율 집계 조회', agents: '② ④', elapsedMs: 2400, rating: '유용', user: '정우진', dept: '생산관리팀' },
  { messageId: 'H04', ts: '08:31', question: 'PR-05 왜 멈췄어', intentLabel: '비가동 사유 조회', agents: '⑨', elapsedMs: 1400, rating: '재질의', user: '강민석', dept: '제조팀' },
  { messageId: 'H05', ts: '08:10', question: '이번 달 미도금 불량 추이', intentLabel: '불량 추이 조회', agents: '②', elapsedMs: 1900, rating: '유용', user: '박지훈', dept: '품질보증팀' },
];

export const CHAT_HISTORY_SUMMARY = { totalCnt: 86, intentAccuracy: 82.6, avgElapsedSec: 1.8, reAskRate: 11.6 };

/* ───────── SY-09 보안 감사 로그 ───────── */
export const AUDIT_LOGS = [
  { ts: '09:12:41', type: '마스킹 처리', target: '8D 보고서 · L260824-031', group: '품질', result: '3건 마스킹', note: '단가·수율·거래처' },
  { ts: '09:04:12', type: '원본 조회', target: '재고 단가', group: '관리자', result: '허용', note: '권한 확인됨' },
  { ts: '08:41:03', type: '마스킹 해제 요청', target: 'L260824-031', group: '품질', result: '반려', note: '권한 없음' },
  { ts: '08:22:55', type: '권한 변경', target: '현장 그룹 · 비가동 관리', group: '관리자', result: '입력 권한 부여', note: '—' },
  { ts: '07:10:00', type: '자동 생성', target: '일일 생산현황 보고서', group: '시스템', result: '마스킹 1건', note: '수율' },
];

/* ───────── SY-10 AI 모델 설정 ───────── */
export const MODEL_CONFIG = {
  anomaly: { defectThreshold: 3.0, targetGapThreshold: 15, interval: '수시 (실시간)', scope: '모델별·공정별' },
  classify: { okConfidenceLow: 0.05, ngConfidenceHigh: 0.6, borderlinePolicy: 'HITL 플래깅 (담당자 검토)', defectTags: 'chip, bend, welding, stain' },
};

export const MASK_RULES = [
  { ruleId: 'MR1', name: '단가', fields: 'item_price, unit_cost', action: '마스킹', policy: '전체 비공개', enabled: true },
  { ruleId: 'MR2', name: '수율', fields: 'yield_rate', action: '마스킹', policy: '고객사 A 비공개', enabled: true },
  { ruleId: 'MR3', name: '거래처', fields: 'customer_nm, bp_nm', action: '마스킹', policy: '전체 비공개', enabled: true },
  { ruleId: 'MR4', name: 'LOT 식별자', fields: 'lot_no', action: '부분 마스킹', policy: '고객사 A 비공개', enabled: true },
];

/* ───────── SY-11 AI 모델 버전 관리 ───────── */
export const VECTOR_BUILDS = [
  { vecId: 'VEC-2026.08-03', ts: '2026-08-26 02:40', duration: '42분', state: '완료', source: 'MES 문서 · 보고서 양식 · 용어 사전 v2 · 8D 이력', docs: 18420, chunks: 214800, embedding: 'bge-m3-ko', dim: 1024, size: '3.2 GB' },
  { vecId: 'VEC-2026.08-02', ts: '2026-08-19 02:40', duration: '38분', state: '완료', source: 'MES 문서 · 보고서 양식 · 8D 이력', docs: 17960, chunks: 208400, embedding: 'bge-m3-ko', dim: 1024, size: '3.1 GB' },
  { vecId: 'VEC-2026.07-04', ts: '2026-07-29 02:40', duration: '35분', state: '완료', source: 'MES 문서 · 보고서 양식', docs: 16240, chunks: 191200, embedding: 'bge-m3-ko', dim: 1024, size: '2.8 GB' },
  { vecId: 'VEC-2026.08-04', ts: '2026-08-28 02:40', duration: '진행 12분', state: '진행 중', source: 'MES 문서 · 보고서 양식 · 용어 사전 v2 · 8D 이력 · 폐기 전표', docs: 19120, chunks: 0, embedding: 'bge-m3-ko', dim: 1024, size: '—' },
];

export const FINETUNE_BUILDS = [
  { ftId: 'FT-2026.08-02', ts: '2026-08-25 03:10', duration: '6시간 12분', state: '완료', base: 'Qwen2.5-14B-Instruct', method: 'LoRA r=32 · α=64', samples: 12480, epoch: 3, vram: '48 GB', evaluation: { intent: 86.4, cite: 91.2, refuse: 97.0, halluc: 2.1 } },
  { ftId: 'FT-2026.08-01', ts: '2026-08-11 03:10', duration: '5시간 48분', state: '완료', base: 'Qwen2.5-14B-Instruct', method: 'LoRA r=16 · α=32', samples: 10240, epoch: 3, vram: '40 GB', evaluation: { intent: 82.6, cite: 88.4, refuse: 95.2, halluc: 3.4 } },
  { ftId: 'FT-2026.07-02', ts: '2026-07-24 03:10', duration: '5시간 20분', state: '완료', base: 'Qwen2.5-14B-Instruct', method: 'LoRA r=16 · α=32', samples: 8960, epoch: 2, vram: '40 GB', evaluation: { intent: 79.1, cite: 84.0, refuse: 93.8, halluc: 4.8 } },
  { ftId: 'FT-2026.08-03', ts: '2026-08-27 03:10', duration: '2시간 04분', state: '실패', base: 'Qwen2.5-14B-Instruct', method: 'LoRA r=64 · α=128', samples: 12480, epoch: 4, vram: 'OOM', evaluation: null },
];

export const MODEL_RELEASES = [
  { ver: 'v1.4.0', vecId: 'VEC-2026.08-03', ftId: 'FT-2026.08-02', ts: '2026-08-26 09:20', by: '한도현 (전산팀)', state: '서비스 중', mode: '즉시 전환', note: '용어 사전 v2 반영 · 현장 표현 정규화 개선' },
  { ver: 'v1.3.2', vecId: 'VEC-2026.08-02', ftId: 'FT-2026.08-01', ts: '2026-08-12 10:05', by: '서지안 (전산팀)', state: '대기', mode: '즉시 전환', note: 'LoRA r=16 기준 · 직전 서비스 버전' },
  { ver: 'v1.3.0', vecId: 'VEC-2026.07-04', ftId: 'FT-2026.07-02', ts: '2026-07-25 11:40', by: '한도현 (전산팀)', state: '보관', mode: '즉시 전환', note: '파일럿 최초 배포 버전' },
];

export const DEPLOY_LOGS = [
  { ts: '2026-08-26 09:20', act: '서비스 전환', detail: 'v1.3.2 → v1.4.0 (즉시 전환)', by: '한도현 (전산팀)' },
  { ts: '2026-08-26 09:02', act: '릴리스 등록', detail: 'v1.4.0 · VEC-2026.08-03 + FT-2026.08-02', by: '한도현 (전산팀)' },
  { ts: '2026-08-26 03:22', act: '벡터 색인', detail: 'VEC-2026.08-03 빌드 완료 · 214,800 청크', by: '시스템 (배치)' },
  { ts: '2026-08-25 09:30', act: '파인튜닝', detail: 'FT-2026.08-02 학습 완료 · 6시간 12분', by: '시스템 (배치)' },
];

export const PERFORMANCE_TREND = {
  labels: ['v1.3.0', 'v1.3.2', 'v1.4.0'],
  series: [
    { name: '의도 파악 (%)', data: [79.1, 82.6, 86.4] },
    { name: '근거 인용률 (%)', data: [84.0, 88.4, 91.2] },
    { name: '환각률 (%)', data: [4.8, 3.4, 2.1] },
  ],
};

/* ───────── SY-12 Agent 실행 현황 ───────── */
export const AGENT_PIPELINE = [
  { name: 'Semantic Parser', desc: '의도 해석', highlight: true },
  { name: 'Task Planner', desc: '실행 계획' },
  { name: 'DAG Publisher', desc: '순서·의존관계' },
  { name: 'Agent Bus', desc: '메시지 중계' },
  { name: 'Result Evaluator', desc: '산출물 검증·통합' },
];

export const AGENT_RUNS = [
  { ts: '2026-08-28 09:12:04', agentCd: '④', detail: 'PR-03 원인 분석 · 각도 편차 기여도 산출', elapsedMs: 3200, result: '성공' },
  { ts: '2026-08-28 09:11:58', agentCd: '③', detail: 'AOI-03 판정 배치 1,204건', elapsedMs: 880, result: '성공' },
  { ts: '2026-08-28 09:11:40', agentCd: '②', detail: '수집 데이터 정규화 318건', elapsedMs: 410, result: '성공' },
  { ts: '2026-08-28 09:04:00', agentCd: '⑨', detail: 'PR-03 불량률 임계 초과 감지 · 알림 발송', elapsedMs: 620, result: '성공' },
  { ts: '2026-08-28 07:10:00', agentCd: '⑥', detail: '일일 생산현황 보고서 초안 생성', elapsedMs: 12400, result: '성공' },
];

/* ───────── SY-13 지표 기준 수치 ───────── */
export const METRIC_STANDARDS = [
  { stdId: 'M01', category: '불량', name: '공정 불량률', unit: '%', current: 2.6, ok: 2.0, warn: 3.0, bad: 3.5, lowerIsBetter: true, window: '10분 이동', basis: 'MES 생산 이력 · AOI 판정 로그', enabled: true, updatedAt: '2026-08-25', updatedBy: '한도현' },
  { stdId: 'M02', category: '불량', name: '일 수율', unit: '%', current: 97.4, ok: 97.0, warn: 96.0, bad: 95.0, lowerIsBetter: false, window: '일 마감', basis: 'MES 투입·양품 실적', enabled: true, updatedAt: '2026-08-22', updatedBy: '김선영' },
  { stdId: 'M03', category: '불량', name: '경계 판정 누적', unit: '건', current: 12, ok: 5, warn: 10, bad: 20, lowerIsBetter: true, window: '즉시', basis: 'AOI 판정 로그', enabled: true, updatedAt: '2026-08-20', updatedBy: '김선영' },
  { stdId: 'M04', category: '불량', name: '고객사 LRR', unit: '%', current: 0.12, ok: 0.1, warn: 0.3, bad: 0.5, lowerIsBetter: true, window: '월 누계', basis: '고객사 통보 · 출하 실적', enabled: true, updatedAt: '2026-08-11', updatedBy: '김선영' },
  { stdId: 'M05', category: '설비 장애', name: '설비 가동률', unit: '%', current: 83.5, ok: 87.0, warn: 82.0, bad: 75.0, lowerIsBetter: false, window: '2시간 이동', basis: '프레스 IoT · 비가동 등록', enabled: true, updatedAt: '2026-08-24', updatedBy: '정우진' },
  { stdId: 'M06', category: '설비 장애', name: '비가동 지속 시간', unit: '분', current: 34, ok: 10, warn: 30, bad: 60, lowerIsBetter: true, window: '즉시', basis: '설비 정지 신호', enabled: true, updatedAt: '2026-08-14', updatedBy: '정우진' },
  { stdId: 'M07', category: '설비 장애', name: '금형 잔여 타발수', unit: '천타', current: 6.2, ok: 20.0, warn: 10.0, bad: 5.0, lowerIsBetter: false, window: '즉시', basis: '금형 이력 · 타발 카운터', enabled: true, updatedAt: '2026-08-09', updatedBy: '강민석' },
  { stdId: 'M08', category: '생산', name: '일목표 달성률', unit: '%', current: 106.5, ok: 100.0, warn: 95.0, bad: 85.0, lowerIsBetter: false, window: '일 마감', basis: 'MES 생산 실적 · 생산 계획', enabled: true, updatedAt: '2026-08-06', updatedBy: '정우진' },
  { stdId: 'M09', category: '데이터 수집', name: 'IoT 수신 지연', unit: '초', current: 12, ok: 60, warn: 120, bad: 300, lowerIsBetter: true, window: '5분 연속', basis: '프레스 IoT 수신 타임스탬프', enabled: true, updatedAt: '2026-08-23', updatedBy: '서지안' },
  { stdId: 'M10', category: '데이터 수집', name: '이관 실패율', unit: '%', current: 0.0, ok: 0.5, warn: 2.0, bad: 5.0, lowerIsBetter: true, window: '배치별', basis: 'MSSQL→PostgreSQL 이관 결과', enabled: true, updatedAt: '2026-08-25', updatedBy: '서지안' },
  { stdId: 'M11', category: '원가', name: '월 누적 폐기 금액', unit: '백만원', current: 644.8, ok: 300.0, warn: 400.0, bad: 500.0, lowerIsBetter: true, window: '월 누계', basis: '폐기 전표 · 원가 기준정보', enabled: true, updatedAt: '2026-08-18', updatedBy: '최영도' },
  { stdId: 'M12', category: '생산', name: '재공 체류 시간', unit: '시간', current: 5.4, ok: 6.0, warn: 12.0, bad: 24.0, lowerIsBetter: true, window: '일 평균', basis: 'MES 공정 이동 이력', enabled: false, updatedAt: '2026-07-28', updatedBy: '정우진' },
];

export const METRIC_HISTORY = [
  { ts: '2026-08-25 09:02', metric: '공정 불량률', field: '위험 임계', before: '4.0', after: '3.5', by: '한도현 (전산팀)' },
  { ts: '2026-08-24 15:20', metric: '설비 가동률', field: '주의 임계', before: '80.0', after: '82.0', by: '정우진 (생산관리팀)' },
  { ts: '2026-08-23 10:44', metric: 'IoT 수신 지연', field: '위험 임계', before: '600', after: '300', by: '서지안 (전산팀)' },
  { ts: '2026-08-22 11:05', metric: '일 수율', field: '정상 기준', before: '96.5', after: '97.0', by: '김선영 (품질보증팀)' },
  { ts: '2026-08-18 16:32', metric: '월 누적 폐기 금액', field: '위험 임계', before: '450.0', after: '500.0', by: '최영도 (경영진)' },
  { ts: '2026-08-14 09:18', metric: '비가동 지속 시간', field: '주의 임계', before: '20', after: '30', by: '정우진 (생산관리팀)' },
];

/* ───────── SY-14 보고서 다운로드 이력 ───────── */
export const DOWNLOAD_LOGS = [
  { ts: '2026-08-28 09:05:12', user: '김선영', dept: '품질보증팀', reportName: '고객사별 LRR', format: '엑셀 (.xls)', scope: '현재 조회 결과', rowCount: 39, blindCount: 0, ip: '10.20.14.31' },
  { ts: '2026-08-28 08:48:03', user: '정우진', dept: '생산관리팀', reportName: '연간 출하계획', format: 'CSV (.csv)', scope: '전체 기간', rowCount: 20, blindCount: 0, ip: '10.20.11.08' },
  { ts: '2026-08-28 08:31:40', user: '정우진', dept: '생산관리팀', reportName: '폐기 보고서', format: '인쇄 · PDF', scope: '문서 전체', rowCount: 0, blindCount: 12, ip: '10.20.11.08' },
  { ts: '2026-08-28 08:12:55', user: '김선영', dept: '품질보증팀', reportName: '제품별 수율', format: '엑셀 (.xls)', scope: '현재 조회 결과', rowCount: 17, blindCount: 0, ip: '10.20.14.31' },
  { ts: '2026-08-27 17:22:09', user: '강민석', dept: '제조팀', reportName: '아침회의 자료 (PRESS)', format: 'CSV (.csv)', scope: '현재 조회 결과', rowCount: 16, blindCount: 20, ip: '10.20.31.77' },
  { ts: '2026-08-27 16:04:31', user: '최영도', dept: '경영진', reportName: '폐기 보고서', format: '엑셀 (.xls)', scope: '현재 조회 결과', rowCount: 20, blindCount: 0, ip: '10.20.02.05' },
  { ts: '2026-08-27 11:40:18', user: '시스템', dept: '통합관리자', reportName: '아침회의 자료 (Plating·Coating)', format: '인쇄 · PDF', scope: '문서 전체', rowCount: 0, blindCount: 0, ip: '10.20.01.02' },
  { ts: '2026-08-27 09:58:44', user: '이수민', dept: '품질보증팀', reportName: '고객사별 LRR', format: 'CSV (.csv)', scope: '현재 조회 결과', rowCount: 39, blindCount: 0, ip: '10.20.14.44' },
  { ts: '2026-08-25 14:11:26', user: '한도현', dept: '전산팀', reportName: '보안 감사 로그', format: '엑셀 (.xls)', scope: '전체 기간', rowCount: 120, blindCount: 0, ip: '10.20.09.10' },
];

export const RETENTION_POLICY = {
  period: '3 년',
  target: '보고서·화면 다운로드 및 인쇄 이력 전체',
  note: '보존 기간이 지난 이력은 월 1회 배치로 자동 삭제되며, 삭제 사실만 감사 로그에 남습니다.',
};

/* ───────── SY-15 데이터 연동 이력 ───────── */
export const SYNC_JOBS = [
  { jobId: 'MIG-260828-04', srcTable: 'DWJ_MES.dbo.AOI_JUDGE', dstTable: 'ax.aoi_judge', kind: '증분', startAt: '2026-08-28 09:10:00', endAt: '', duration: '', rows: 41820, okRows: 38400, ngRows: 0, state: '진행 중' },
  { jobId: 'MIG-260828-03', srcTable: 'DWJ_MES.dbo.SCRAP_SLIP', dstTable: 'ax.scrap_slip', kind: '증분', startAt: '2026-08-28 02:18:40', endAt: '2026-08-28 02:19:52', duration: '1분', rows: 412, okRows: 412, ngRows: 0, state: '완료' },
  { jobId: 'MIG-260828-02', srcTable: 'DWJ_MES.dbo.DOWNTIME', dstTable: 'ax.downtime', kind: '증분', startAt: '2026-08-28 02:15:02', endAt: '2026-08-28 02:18:33', duration: '3분', rows: 1840, okRows: 1840, ngRows: 0, state: '완료' },
  { jobId: 'MIG-260828-01', srcTable: 'DWJ_MES.dbo.PRD_RESULT', dstTable: 'ax.prod_result', kind: '증분', startAt: '2026-08-28 02:00:12', endAt: '2026-08-28 02:14:38', duration: '14분', rows: 1284310, okRows: 1284310, ngRows: 0, state: '완료' },
  { jobId: 'MIG-260827-05', srcTable: 'DWJ_MES.dbo.MOLD_HIST', dstTable: 'ax.mold_hist', kind: '증분', startAt: '2026-08-27 02:22:10', endAt: '2026-08-27 02:23:41', duration: '1분', rows: 288, okRows: 288, ngRows: 0, state: '완료' },
  { jobId: 'MIG-260827-04', srcTable: 'DWJ_MES.dbo.AOI_JUDGE', dstTable: 'ax.aoi_judge', kind: '증분', startAt: '2026-08-27 02:16:55', endAt: '2026-08-27 02:21:40', duration: '5분', rows: 402180, okRows: 401906, ngRows: 274, state: '실패' },
  { jobId: 'MIG-260827-01', srcTable: 'DWJ_MES.dbo.PRD_RESULT', dstTable: 'ax.prod_result', kind: '증분', startAt: '2026-08-27 02:00:08', endAt: '2026-08-27 02:16:02', duration: '16분', rows: 1341220, okRows: 1341220, ngRows: 0, state: '완료' },
  { jobId: 'MIG-260826-09', srcTable: 'DWJ_MES.dbo.ITEM_MST', dstTable: 'ax.item_master', kind: '전체', startAt: '2026-08-26 03:00:00', endAt: '2026-08-26 03:04:12', duration: '4분', rows: 3418, okRows: 3418, ngRows: 0, state: '완료' },
  { jobId: 'MIG-260826-02', srcTable: 'DWJ_MES.dbo.DOWNTIME', dstTable: 'ax.downtime', kind: '증분', startAt: '2026-08-26 02:15:00', endAt: '2026-08-26 02:20:18', duration: '5분', rows: 1622, okRows: 1622, ngRows: 0, state: '재시도 완료' },
];

/** 실패 원인 (재실행 모달) */
export const SYNC_FAIL_REASON = {
  reason: '대상 컬럼 judge_code 길이 초과 — 원본 4자 / 대상 3자',
  scope: '실패 건만 (성공 건은 건너뜁니다)',
  estimate: '약 1분',
  guide: '재실행 전에 대상 스키마를 먼저 수정해야 같은 오류가 반복되지 않습니다.',
};

export const SYNC_MAPS = [
  { srcTable: 'DWJ_MES.dbo.PRD_RESULT', dstTable: 'ax.prod_result', kind: '증분', keyColumn: 'result_seq', schedule: '매일 02:00' },
  { srcTable: 'DWJ_MES.dbo.AOI_JUDGE', dstTable: 'ax.aoi_judge', kind: '증분', keyColumn: 'judge_seq', schedule: '매일 02:15' },
  { srcTable: 'DWJ_MES.dbo.DOWNTIME', dstTable: 'ax.downtime', kind: '증분', keyColumn: 'downtime_seq', schedule: '매일 02:15' },
  { srcTable: 'DWJ_MES.dbo.SCRAP_SLIP', dstTable: 'ax.scrap_slip', kind: '증분', keyColumn: 'slip_no', schedule: '매일 02:18' },
  { srcTable: 'DWJ_MES.dbo.MOLD_HIST', dstTable: 'ax.mold_hist', kind: '증분', keyColumn: 'hist_seq', schedule: '매일 02:22' },
  { srcTable: 'DWJ_MES.dbo.ITEM_MST', dstTable: 'ax.item_master', kind: '전체', keyColumn: 'item_cd', schedule: '주 1회 (일 03:00)' },
];

/**
 * 스키마 드리프트 — 이관 정의(ax.tb_sync_map)와 원본·대상 DB 의 실제 테이블 구성이 어긋난 사실.
 * 이관 엔진이 배치마다 판정해 기록하며, 같은 건은 1행으로 유지하고 발견 횟수만 누적됩니다.
 */
export const SYNC_DRIFTS = [
  {
    driftId: 1, side: 'SOURCE', kind: 'NEW', objectName: 'DWJ_MES.dbo.TB_POP_INSPECT_HIST',
    mapId: null, detail: 'MES 에 새 테이블이 있습니다. 이관이 필요하면 이관 정의를 추가하고 대상 테이블을 만드십시오.',
    firstSeenAt: '2026-08-26 20:00:14', lastSeenAt: '2026-08-28 20:00:09', detectCnt: 3, resolved: false,
  },
  {
    driftId: 2, side: 'SOURCE', kind: 'NEW', objectName: 'DWJ_MES.dbo.TB_MD_TOOL',
    mapId: null, detail: 'MES 에 새 테이블이 있습니다. 이관이 필요하면 이관 정의를 추가하고 대상 테이블을 만드십시오.',
    firstSeenAt: '2026-08-28 20:00:09', lastSeenAt: '2026-08-28 20:00:09', detectCnt: 1, resolved: false,
  },
  {
    driftId: 3, side: 'TARGET', kind: 'MISSING', objectName: 'dwje_ax.mes.tb_md_mold_by_eqpt',
    mapId: 9, detail: '이관 정의(map_id=9)의 대상 테이블이 없습니다. 대상 스키마 적재가 누락됐는지 확인하십시오.',
    firstSeenAt: '2026-08-28 20:00:09', lastSeenAt: '2026-08-28 20:00:09', detectCnt: 1, resolved: false,
  },
  {
    driftId: 4, side: 'SOURCE', kind: 'MISSING', objectName: 'DWJ_MES.dbo.TB_MD_ITEM_OLD',
    mapId: 2, detail: '이관 정의(map_id=2)의 원본 테이블이 없습니다. MES 에서 삭제·개명됐는지 확인하십시오.',
    firstSeenAt: '2026-08-20 20:00:11', lastSeenAt: '2026-08-25 20:00:07', detectCnt: 6, resolved: true,
    resolvedAt: '2026-08-26 09:12:40', resolvedBy: 'admin', resolveNote: '이관 대상 아님으로 확인 — 정의 비활성화 처리',
  },
];

export const SYNC_POLICY = {
  source: 'MSSQL — DWJ_MES (사내 MES)',
  target: 'PostgreSQL — ax 스키마 (AX 플랫폼)',
  mode: '증분 이관 기본 · 마스터는 주 1회 전체 이관',
  validation: '건수 대조 + 체크섬 대조',
  retry: '실패 건만 재실행 · 최대 3회 자동 재시도',
  note: '이관 실패율은 지표 측정 데이터 관리(SY-13)의 임계값으로 판정합니다.',
};
