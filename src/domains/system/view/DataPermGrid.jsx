/**
 * [View] SY-03 부서 × 데이터 항목 표
 *
 * 메뉴 접근 권한(MenuPermGrid)과 같은 Tabulator 표입니다 — 두 권한 화면을 오가며 쓰는 일이
 * 많아 열 너비 조절·가로 스크롤·바닥 합계가 같은 방식으로 동작해야 합니다.
 * 메뉴 쪽과 달리 묶음이 없어 행은 데이터 항목 7종뿐입니다.
 */
import React, { useMemo, useRef } from 'react';
import { TabulatorGrid } from '@shared/components/ui';

const escapeTitle = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

export default function DataPermGrid({ fields, depts, matrix, adminDepts, toggle }) {
  // 콜백 안에서 최신 값을 읽기 위한 통로 — 이것 때문에 표를 새로 만들지는 않습니다
  const totals = useRef({ fields, matrix });
  totals.current = { fields, matrix };
  const actions = useRef({ toggle });
  actions.current = { toggle };

  // 체크만 바뀔 때 표를 재생성하지 않아 열 너비·스크롤 위치를 유지합니다
  const signature = JSON.stringify(depts.map(d => [String(d.id), d.name, d.abbr || '', adminDepts.includes(String(d.id))]));

  const columns = useMemo(() => [
    { title: '데이터 항목', field: 'name', width: 170, minWidth: 140, formatter: cell => `<span class="strong">${escapeTitle(cell.getValue())}</span>` },
    { title: '포함 데이터', field: 'desc', minWidth: 260, widthGrow: 2, formatter: 'textarea', variableHeight: true, bottomCalc: () => '허용 항목 수' },
    ...JSON.parse(signature).map(([deptId, name, abbr, locked]) => {
      const field = `dept_${deptId}`;
      return {
        title: escapeTitle(`${name}${abbr ? ` (${abbr})` : ''}`), field, width: 150, minWidth: 120, hozAlign: 'center', headerHozAlign: 'center',
        bottomCalc: () => (totals.current.matrix[deptId] || []).length,
        formatter: cell => {
          const row = cell.getRow().getData();
          const allowed = row[field] === '허용';
          const input = document.createElement('input');
          input.type = 'checkbox';
          input.checked = allowed;
          input.disabled = locked;
          input.setAttribute('aria-label', `${row.name} · ${name} 열람 허용`);
          input.title = locked ? '통합관리자 부서는 전 권한으로 고정됩니다.' : `${name} · ${allowed ? '열람' : '비공개'}`;
          input.onchange = () => {
            // 서버 응답 전에는 서버가 아는 상태를 유지합니다 — 중복 변경도 함께 막힙니다
            input.checked = allowed;
            actions.current.toggle(row.key, deptId);
          };
          return input;
        },
      };
    }),
  ].map(column => ({ ...column, headerSort: false })), [signature]);

  const rows = useMemo(
    () => fields.map(f => ({
      key: f.key,
      name: f.name,
      desc: f.desc,
      ...Object.fromEntries(depts.map(d => [`dept_${d.id}`, (matrix[d.id] || []).includes(f.key) ? '허용' : '비공개'])),
    })),
    [fields, depts, matrix]
  );

  return <TabulatorGrid columns={columns} rows={rows} rowKey="key" bordered headerFilter={false} />;
}
