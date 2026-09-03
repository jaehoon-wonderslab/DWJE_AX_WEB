/**
 * 보고서 고정 열 정의
 *
 * 원본 엑셀 양식의 열 구성을 그대로 옮긴 것입니다.
 * 양식이 바뀌면 이 파일과 보고서 양식 관리(QC-04)의 파서 버전을 함께 올립니다.
 */

/** RP-04 제품별 수율 — Loss 세부 열 (8 + 2 + 1) 과 관리 항목 (3) */
export const YIELD_LOSS_A = ['품질검사', '재료성(소재불량)', '스크래치', '찍힘', '치수', 'BURR', '변형', 'Try/초품'];
export const YIELD_LOSS_B = ['얼룩', '기타'];
export const YIELD_LOSS_C = ['자주검사'];
export const YIELD_MGMT = ['도면치수NG', '불용재고', '신규 불용폐기'];

/** RP-05 고객사별 LRR — 월·분기 축 */
export const LRR_MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
export const LRR_QUARTERS = ['1Q', '2Q', '3Q', '4Q'];

/** RP-07 폐기 보고서 작성 위저드 — 5단계 */
export const SCRAP_WIZARD_STEPS = [
  { title: 'MES 폐기 대상 검색', sub: '전표 · LOT 선택' },
  { title: '수기 입력', sub: 'MES 미보유 항목' },
  { title: '폐기 금액 산정', sub: '원가 기준정보 적용' },
  { title: '검토 · 결재선 지정', sub: '부서별 검토 요청' },
  { title: '미리보기 · 생성', sub: '결재 양식 확인' },
];
