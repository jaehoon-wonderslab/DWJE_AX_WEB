/**
 * [View] SY-02 부서 × 화면 표 (메뉴 접근 권한)
 *
 * 2026-10-01 (기획 03 MNP-03·15·16·17)
 *  · 부서마다 머리글 그룹 「부서명 · n명」 아래 「조회」·「쓰기」 두 칸 (각 width 100 / minWidth 90)
 *  · 통합관리자 열 = 전 권한(잠금), 미배정 열 = 고정(5화면) · 변경 불가(잠금)
 *  · 관리 화면 4종 행은 통합관리자가 아니면 모든 부서 칸 잠금, 쓰기 칸은 조회가 꺼져 있으면 잠금
 *  · 그룹 일괄 버튼은 칸별(조회/쓰기)이고 동작 행을 빼고 셉니다
 * 표가 카드보다 넓으면 표 안에서 가로로 스크롤합니다(열을 줄이거나 숨기지 않습니다).
 * 잠금 여부·값은 컨트롤러가 정해 넘깁니다 — 이 파일은 그리기만 합니다.
 */
import React, { useMemo, useRef } from 'react';
import { TabulatorGrid } from '@shared/components/ui';

const escapeTitle = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const PERMS = [['READ', 'read', '조회'], ['WRITE', 'write', '쓰기']];
/** 동작 행 배경을 옅게 — 밝은·어두운 테마 모두에서 보이는 반투명 회색 */
const TABLE_OPTIONS = {
  rowFormatter: row => {
    row.getElement().style.backgroundColor = row.getData().action ? 'rgba(127,127,127,0.07)' : '';
  },
};

/** 부서 머리글 — 「부서명 · n명」 과 잠금 표기 두 줄 */
function deptHeader(name, userCnt, locked) {
  const count = `${Number(userCnt || 0).toLocaleString('ko-KR')}명`;
  const second = locked === 'SUPER_ADMIN' ? '전 권한' : locked === 'UNASSIGNED' ? '고정(5화면) · 변경 불가' : '';
  // 계정 0명 부서는 흐리게 — 바꿔도 영향받는 사람이 없습니다(MNP-09)
  const dim = !locked && !Number(userCnt || 0) ? ' style="opacity:.55"' : '';
  return `<div${dim}><div class="strong">${escapeTitle(`${name} · ${count}`)}</div>${second ? `<div class="muted" style="font-weight:400">${escapeTitle(second)}</div>` : ''}</div>`;
}

export default function MenuPermGrid({
  screens, depts, collapsed, toggleCollapsed, cellValue, lockReason, cellWarn, groupLockReason, grantCounts = {},
  onToggle, onToggleGroup, onShowGrants,
}) {
  // 콜백 안에서 최신 값을 읽기 위한 통로 — 이것 때문에 표를 새로 만들지는 않습니다
  const latest = useRef({});
  latest.current = { screens, cellValue, onToggle, onToggleGroup, toggleCollapsed, onShowGrants };

  // 부서 구성만 바뀔 때 표를 다시 만듭니다 — 체크만 바뀌면 자료만 갈아 끼워 펼침·열 너비·스크롤을 유지합니다
  const signature = JSON.stringify(depts.map(d => [String(d.id), d.name, d.userCnt || 0, d.locked || '']));
  const columns = useMemo(() => [
    { title: '메뉴 그룹', field: 'group', width: 180, minWidth: 140, formatter: cell => {
      const row = cell.getRow().getData();
      if (row.kind !== 'group') return '';
      const button = document.createElement('button');
      button.className = 'tbtn';
      button.textContent = `${row.collapsed ? '+' : '−'} ${row.group}`;
      button.title = `${row.group} ${row.collapsed ? '펼치기' : '접기'}`;
      button.setAttribute('aria-label', button.title);
      button.setAttribute('aria-expanded', String(!row.collapsed));
      button.onclick = () => latest.current.toggleCollapsed(row.group);
      return button;
    } },
    { title: '화면', field: 'label', width: 350, minWidth: 220, formatter: 'textarea', variableHeight: true, bottomCalc: () => '전체 화면 허용 수' },
    { title: '구분', field: 'kindLabel', width: 140, minWidth: 120, formatter: 'plaintext' },
    { title: '개인 허용', field: 'grantCount', width: 120, minWidth: 110, hozAlign: 'center', headerHozAlign: 'center', formatter: cell => {
      const row = cell.getRow().getData();
      if (!row.grantN) return row.kind === 'group' ? '' : '—';
      // n명 ▸ — 누르면 그 화면에 추가 허용을 가진 계정 명단(MNP-06)
      const button = document.createElement('button');
      button.className = 'tbtn';
      button.textContent = `${row.grantN}명 ▸`;
      button.title = `${row.plainLabel} 개인 허용 계정 보기`;
      button.setAttribute('aria-label', `${row.plainLabel} 개인 허용 ${row.grantN}명 보기`);
      button.onclick = event => { event.stopPropagation(); latest.current.onShowGrants?.(row.id); };
      return button;
    } },
    ...JSON.parse(signature).map(([deptId, name, userCnt, locked]) => ({
      title: deptHeader(name, userCnt, locked),
      headerHozAlign: 'center',
      columns: PERMS.map(([perm, suffix, permLabel]) => {
        const field = `dept_${deptId}_${suffix}`;
        return {
          title: permLabel, field, width: 100, minWidth: 90, hozAlign: 'center', headerHozAlign: 'center', headerSort: false,
          headerTooltip: locked === 'UNASSIGNED' ? '미배정 부서는 대시보드·덕반장 AI·질의 이력 조회 전용으로 고정됩니다(변경 불가)' : locked === 'SUPER_ADMIN' ? '통합관리자 부서는 전 권한으로 고정됩니다' : `${name} ${permLabel}`,
          bottomCalc: () => latest.current.screens.filter(screen => latest.current.cellValue(screen.id, deptId, perm)).length,
          formatter: cell => {
            const row = cell.getRow().getData();
            const value = row[field];
            const reason = row[`${field}__lock`] || '';
            if (row.kind === 'group') {
              const button = document.createElement('button');
              button.className = 'tbtn';
              const allowed = value === '허용';
              button.textContent = locked === 'SUPER_ADMIN' ? '전 권한' : locked === 'UNASSIGNED' ? '고정' : allowed ? '전체 해제' : '전체 허용';
              button.disabled = !!reason;
              button.title = reason || `${row.group} · ${name} · ${permLabel} — 그룹 전체(동작 행 제외)에 적용`;
              button.setAttribute('aria-label', `${row.group} ${name} ${permLabel} ${button.textContent}`);
              button.onclick = event => { event.stopPropagation(); latest.current.onToggleGroup(row.group, deptId, perm, !allowed); };
              return button;
            }
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.checked = value === '허용';
            input.disabled = !!reason;
            input.setAttribute('aria-label', `${row.plainLabel} · ${name} ${permLabel} 허용`);
            input.title = reason || `${name} · ${permLabel} ${input.checked ? '허용' : '차단'}`;
            input.onchange = () => {
              // 응답 전에는 서버의 상태를 유지하며 중복 변경을 막습니다
              input.checked = value === '허용';
              latest.current.onToggle(row.id, deptId, perm);
            };
            const warn = row[`${field}__warn`];
            if (!warn) return input;
            // 상위 화면이 꺼진 하위 화면 — 칸 옆 주의 표시, 이유는 title 로(MNP-10)
            const wrap = document.createElement('span');
            const mark = document.createElement('span');
            mark.textContent = ' ⚠';
            mark.title = warn;
            mark.setAttribute('aria-label', warn);
            mark.setAttribute('role', 'img');
            wrap.append(input, mark);
            return wrap;
          },
        };
      }),
    })),
  ].map(column => ({ ...column, headerSort: false })), [signature]);

  const rows = useMemo(() => {
    const groups = [...new Set(screens.map(screen => screen.group))];
    return groups.flatMap(group => {
      const children = screens.filter(screen => screen.group === group);
      // 그룹 일괄은 동작 행(업로드 같은 버튼 권한)을 빼고 셉니다(MNP-05)
      const countable = children.filter(screen => !screen.action);
      const isCollapsed = collapsed.has(group);
      const bulk = { id: `group:${group}`, group, label: '그룹 일괄(동작 제외)', plainLabel: '그룹 일괄', kind: 'group', kindLabel: '그룹 일괄', grantCount: '', collapsed: isCollapsed };
      depts.forEach(dept => PERMS.forEach(([perm, suffix]) => {
        const field = `dept_${dept.id}_${suffix}`;
        const count = countable.filter(screen => cellValue(screen.id, dept.id, perm)).length;
        bulk[field] = countable.length && count === countable.length ? '허용' : count ? '일부 허용' : '차단';
        bulk[`${field}__lock`] = countable.length ? groupLockReason(group, dept) : '바꿀 화면이 없습니다.';
      }));
      return [bulk, ...(isCollapsed ? [] : children).map(screen => {
        const base = screen.label || screen.name;
        const suffix = `${screen.admin ? ' (관리)' : ''}${screen.common ? ' (전사 공통)' : ''}`;
        const row = {
          id: screen.id, group: screen.group, label: `${base}${suffix}`, plainLabel: base, kind: 'screen',
          // 동작 행은 화면이 아니라 버튼(쓰기) 권한이라 구분을 밝히고 배경을 옅게 나눕니다(MNP-05)
          kindLabel: screen.action ? '동작(쓰기)' : screen.sub ? '하위 화면' : '메뉴',
          action: !!screen.action,
          grantN: grantCounts[screen.id] || 0,
          grantCount: grantCounts[screen.id] ? `${grantCounts[screen.id]}명` : '—',
        };
        depts.forEach(dept => PERMS.forEach(([perm, key]) => {
          const field = `dept_${dept.id}_${key}`;
          row[field] = cellValue(screen.id, dept.id, perm) ? '허용' : '차단';
          row[`${field}__lock`] = lockReason(screen, dept, perm);
          row[`${field}__warn`] = cellWarn ? cellWarn(screen, dept, perm) : '';
        }));
        return row;
      })];
    });
  }, [screens, depts, collapsed, cellValue, lockReason, cellWarn, groupLockReason, grantCounts]);

  return <TabulatorGrid columns={columns} rows={rows} rowKey="id" height={620} bordered headerFilter={false} tableOptions={TABLE_OPTIONS} />;
}
