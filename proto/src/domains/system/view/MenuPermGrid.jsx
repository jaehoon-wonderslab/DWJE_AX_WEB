import React, { useMemo, useRef, useState } from 'react';
import { TabulatorGrid } from '@shared/components/ui';

const escapeTitle = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

/** 메뉴 권한 행과 그룹 일괄 변경을 같은 표에 표시합니다. */
export default function MenuPermGrid({ screens, depts, matrix, adminDepts, busy, toggle, toggleGroup }) {
  const [collapsed, setCollapsed] = useState(() => new Set());
  const totals = useRef({ screens, matrix });
  totals.current = { screens, matrix };
  const actions = useRef({ toggle, toggleGroup });
  actions.current = { toggle, toggleGroup };
  // 권한만 바뀔 때 표를 재생성하지 않아 펼침 상태·열 너비·스크롤을 유지합니다.
  const signature = JSON.stringify(depts.map(d => [String(d.id), d.name, adminDepts.includes(String(d.id))]));
  const columns = useMemo(() => [
    { title: '메뉴 그룹', field: 'group', width: 180, minWidth: 140, headerSort: false, formatter: cell => {
      const row = cell.getRow().getData();
      if (row.kind !== 'group') return '';
      const button = document.createElement('button');
      button.className = 'tbtn';
      button.textContent = `${row.collapsed ? '+' : '−'} ${row.group}`;
      button.title = `${row.group} ${row.collapsed ? '펼치기' : '접기'}`;
      button.setAttribute('aria-label', button.title);
      button.setAttribute('aria-expanded', String(!row.collapsed));
      button.onclick = () => setCollapsed(previous => {
        const next = new Set(previous);
        if (next.has(row.group)) next.delete(row.group); else next.add(row.group);
        return next;
      });
      return button;
    } },
    { title: '화면', field: 'label', width: 350, minWidth: 220, formatter: 'textarea', variableHeight: true, bottomCalc: () => '전체 화면 허용 수' },
    { title: '구분', field: 'kindLabel', width: 140, minWidth: 120, formatter: 'plaintext' },
    ...JSON.parse(signature).map(([deptId, name, locked]) => {
      const field = `dept_${deptId}`;
      return {
        title: escapeTitle(`${name}${locked ? ' (전 권한)' : ''}`), field, width: 180, minWidth: 150, hozAlign: 'center', headerHozAlign: 'center',
        bottomCalc: () => totals.current.screens.filter(screen => locked || (totals.current.matrix[deptId] || []).includes(screen.id)).length,
        formatter: cell => {
          const row = cell.getRow().getData();
          const allowed = row[field] === '허용';
          if (row.kind === 'group') {
            const button = document.createElement('button');
            button.className = 'tbtn';
            button.textContent = locked ? '전 권한' : allowed ? '전체 해제' : '전체 허용';
            button.disabled = locked || row.busy;
            button.title = `${row.group} · ${name} · 그룹 전체에 적용`;
            button.setAttribute('aria-label', `${row.group} ${name} ${button.textContent}`);
            button.onclick = event => { event.stopPropagation(); actions.current.toggleGroup(row.group, deptId, !allowed); };
            return button;
          }
          const input = document.createElement('input');
          input.type = 'checkbox'; input.checked = allowed; input.disabled = locked || row.busy;
          input.setAttribute('aria-label', `${row.label} · ${name} 접근 허용`);
          input.title = locked ? '통합관리자 부서는 전 권한으로 고정됩니다.' : `${name} · ${allowed ? '허용' : '차단'}`;
          input.onchange = () => {
            // 응답 전에는 서버의 상태를 유지하며 중복 변경을 막습니다.
            input.checked = allowed;
            actions.current.toggle(row.id, deptId);
          };
          return input;
        },
      };
    }),
  ].map(column => ({ ...column, headerSort: false })), [signature]);

  const rows = useMemo(() => {
    const groups = [...new Set(screens.map(screen => screen.group))];
    return groups.flatMap(group => {
      const children = screens.filter(screen => screen.group === group);
      const bulk = { id: `group:${group}`, group, label: '그룹 일괄', kind: 'group', kindLabel: '그룹 일괄', busy, collapsed: collapsed.has(group) };
      depts.forEach(dept => {
        const count = children.filter(screen => adminDepts.includes(String(dept.id)) || (matrix[dept.id] || []).includes(screen.id)).length;
        bulk[`dept_${dept.id}`] = count === children.length ? '허용' : count ? '일부 허용' : '차단';
      });
      return [bulk, ...(collapsed.has(group) ? [] : children).map(screen => ({
        ...screen, label: screen.label || screen.name, kind: 'screen', kindLabel: screen.action ? '동작' : screen.sub ? '하위 화면' : '메뉴', busy,
        ...Object.fromEntries(depts.map(dept => [`dept_${dept.id}`, adminDepts.includes(String(dept.id)) || (matrix[dept.id] || []).includes(screen.id) ? '허용' : '차단'])),
      }))];
    });
  }, [screens, depts, matrix, adminDepts, busy, collapsed]);

  return <TabulatorGrid columns={columns} rows={rows} rowKey="id" height={620} bordered headerFilter={false} />;
}
