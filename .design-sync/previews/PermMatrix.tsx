import './_rnw';
import React from 'react';
import { PermMatrix } from 'dwje-ax-web';

const DEPTS = [
  { key: 'admin', label: '통합관리', sublabel: 'ADM', locked: true },
  { key: 'prod1', label: '생산1팀', sublabel: 'PRD1' },
  { key: 'qc', label: '품질보증', sublabel: 'QA' },
  { key: 'equip', label: '설비보전', sublabel: 'EQ' },
  { key: 'sales', label: '영업관리', sublabel: 'SAL' },
];

const SCREENS = [
  { id: 'PD-01', name: '생산 실적 집계', group: '생산' },
  { id: 'PD-02', name: '조간회의 자료', group: '생산' },
  { id: 'PD-03', name: '실적 상세 (LOT)', group: '생산', sub: true },
  { id: 'QC-01', name: '불량 현황', group: '품질' },
  { id: 'QC-02', name: 'AOI 판정 예측', group: '품질' },
  { id: 'SY-01', name: '사용자 관리', group: '시스템' },
  { id: 'SY-02', name: '메뉴 권한', group: '시스템' },
];

const MENU_PERM: Record<string, string[]> = {
  admin: SCREENS.map((s) => s.id),
  prod1: ['PD-01', 'PD-02', 'PD-03', 'QC-01'],
  qc: ['PD-01', 'QC-01', 'QC-02'],
  equip: ['PD-01', 'QC-01'],
  sales: ['PD-02'],
};

/** 부서 × 화면 — 메뉴 그룹 열 · "그룹 일괄" 줄(onToggleGroup) · ↳ 하위 화면 · 잠긴 통합관리 열 · 합계 */
export const Menus = () => (
  <div style={{ width: 860 }}>
    <PermMatrix
      rows={SCREENS}
      columns={DEPTS}
      isChecked={(rowId, colKey) => (MENU_PERM[colKey] || []).includes(String(rowId))}
      onToggle={() => {}}
      onToggleGroup={() => {}}
      footerLabel="접근 허용 화면 수"
      footerValue={(colKey) => (MENU_PERM[colKey] || []).length}
    />
  </div>
);

const FIELDS = [
  { id: 'qty', name: '생산·불량 수량', desc: '투입·양품·불량 수량, 계획 대비 달성률' },
  { id: 'yield', name: '수율·불량률', desc: '공정별 수율, 불량률, 불량 유형 분포' },
  { id: 'customer', name: '고객사', desc: '고객사명, 출하 예정일, 납기' },
  { id: 'cost', name: '원가·단가', desc: '재료비, 가공 단가, 손실 금액' },
];

const DATA_PERM: Record<string, string[]> = {
  admin: FIELDS.map((f) => f.id),
  prod1: ['qty', 'yield'],
  qc: ['qty', 'yield', 'customer'],
  equip: ['qty'],
  sales: ['qty', 'customer', 'cost'],
};

/** 부서 × 데이터 항목 — 그룹 없음 · descOf 로 "포함 데이터" 설명 열 · rowLabelWidth 150 · 부서 4열 */
export const DataItems = () => (
  <div style={{ width: 840 }}>
    <PermMatrix
      rows={FIELDS}
      columns={DEPTS.slice(0, 4)}
      rowLabelWidth={150}
      isChecked={(rowId, colKey) => (DATA_PERM[colKey] || []).includes(String(rowId))}
      onToggle={() => {}}
      descOf={(r) => FIELDS.find((f) => f.id === r.id)?.desc || ''}
      footerLabel="허용 항목 수"
      footerValue={(colKey) => (DATA_PERM[colKey] || []).length}
    />
  </div>
);
