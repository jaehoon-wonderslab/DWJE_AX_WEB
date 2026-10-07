/**
 * [View] SY-03 항목 × 부서 표 (2026-10-07 — 데이터 접근 권한을 항목 단위로)
 *
 * 행 = 항목(화면에 보이는 이름. 같은 뜻의 API 데이터 키 여러 개를 하나로 묶은 것 — model/dataItemModel),
 * 열 = 항목 · 출력 화면 · 부서. 부서 칸 체크 = 그 부서가 이 항목을 봅니다. 체크는 누르는 즉시 저장됩니다.
 *  · 「항목 관리」 모달 · 묶음(종류) 없이 이 표 하나로 정합니다(사용자 결정 2026-10-07)
 *  · 통합관리자 열은 전 권한, 미배정 열은 0건 고정(잠금 — 판정은 컨트롤러 lockReason)
 *  · 가릴 수 없는 항목(공용 키 · 시스템 값)은 칸을 잠그고 이유를 항목 칸에 적습니다
 *  · 키마다 열람이 다르면(「일부」) 체크 칸을 반쯤 채워 보이고, 누르면 그 부서가 모두 보게 맞춥니다
 *  · 머리글 필터(항목 · 출력 화면), 쪽 나누기 10 · 25 · 50(기본) · 100
 */
import React, { useMemo, useRef } from 'react';
import { TabulatorGrid } from '@shared/components/ui';

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const PAGE_SIZES = [10, 25, 50, 100];
/** 행을 찾는 열 — updateInPlace 가 이 값으로 같은 행을 찾아 고칩니다 */
const TABLE_OPTIONS = { index: 'id' };

function deptHeader(name, userCnt, locked) {
  const count = `${Number(userCnt || 0).toLocaleString('ko-KR')}명`;
  const second = locked === 'UNASSIGNED' ? '0건 고정' : '';
  return `<div class="strong">${esc(`${name} · ${count}`)}</div>${second ? `<div class="muted" style="font-weight:400">${esc(second)}</div>` : ''}`;
}

/** 가릴 수 없는 이유 — 공용 키(화면마다 다른 값을 담는 키) · 시스템 값(서버 예약어) */
export function lockReasonOf(item) {
  if (item.selectable.length) return '';
  const r = [];
  if (item.keys.some((k) => k.lock === 'generic')) r.push('공용 키');
  if (item.keys.some((k) => k.lock === 'reserved')) r.push('시스템 값');
  return `가릴 수 없음 (${r.join(' · ') || '시스템 값'})`;
}

export default function ItemPermGrid({ items, depts, itemCell, lockReason, toggleItem, offTableOf = () => [] }) {
  // 콜백 안에서 최신 값을 읽는 통로 — 체크만 바뀔 때 표를 새로 만들지 않아 스크롤 · 쪽 · 필터가 유지됩니다
  const latest = useRef({});
  latest.current = { items, itemCell, toggleItem };

  const signature = JSON.stringify(depts.map((d) => [String(d.id), d.name, d.userCnt || 0, d.locked || '']));

  const columns = useMemo(() => [
    {
      title: '항목', field: 'name', width: 200, minWidth: 160, frozen: true,
      headerFilterPlaceholder: '항목 검색',
      formatter: (cell) => {
        const r = cell.getRow().getData();
        const sub = [r.titles ? `다른 이름: ${r.titles}` : '', r.lock].filter(Boolean);
        return `<div class="strong">${esc(r.name)}</div>${sub.map((t) => `<div class="muted" style="font-weight:400">${esc(t)}</div>`).join('')}`;
      },
      variableHeight: true,
    },
    {
      title: '출력 화면', field: 'screensText', minWidth: 220, widthGrow: 2,
      headerFilterPlaceholder: '출력 화면 검색',
      formatter: (cell) => {
        const r = cell.getRow().getData();
        // 표에 나오는 화면 → 표 밖(카드 · 차트 · 요약)에서 쓰는 화면 → 둘 다 없으면 「웹 화면에 나오지 않음」(2026-10-07 피드백)
        const parts = [
          ...r.screens.map((n) => `<div>${esc(n)}</div>`),
          ...r.offTable.map((n) => `<div>${esc(n)} <span class="muted">· 표 밖(카드·차트)</span></div>`),
        ];
        return parts.length ? parts.join('') : '<div class="muted">웹 화면에 나오지 않음</div><div class="muted" style="font-size:13px">API 응답 · AI 답변에서만 가립니다</div>';
      },
      variableHeight: true,
    },
    ...JSON.parse(signature).map(([deptId, name, userCnt, locked]) => {
      const field = `dept_${deptId}`;
      return {
        title: deptHeader(name, userCnt, locked), field, width: 140, minWidth: 116, hozAlign: 'center', headerHozAlign: 'center', headerFilter: false,
        headerTooltip: locked === 'UNASSIGNED' ? '미배정 부서는 데이터 접근 권한이 없습니다(모든 항목 비공개)' : locked === 'SUPER_ADMIN' ? '통합관리자 부서는 전 권한으로 고정됩니다' : name,
        bottomCalc: () => latest.current.items.filter((it) => it.selectable.length && latest.current.itemCell(it, deptId) === 'on').length,
        formatter: (cell) => {
          const r = cell.getRow().getData();
          // 칸 값 = 「상태|잠금 사유」 — 제자리 고치기(updateData)는 값이 바뀐 칸만 다시 그리므로 잠금 사유도 칸 값에 담습니다
          const [state, lockText = ''] = String(cell.getValue() ?? '').split('|');
          const reason = r.lock || lockText;
          const input = document.createElement('input');
          input.type = 'checkbox';
          input.checked = state === 'on' || state === 'na';
          input.indeterminate = state === 'mixed';
          input.disabled = !!reason;
          input.setAttribute('aria-label', `${r.name} · ${name} 열람`);
          input.title = reason || `${name} · ${state === 'on' ? '열람' : state === 'mixed' ? '일부 화면만 열람' : '비공개'}`;
          input.onchange = () => {
            // 서버 응답 전에는 서버가 아는 상태를 유지합니다 — 중복 요청도 함께 막힙니다
            input.checked = state === 'on';
            input.indeterminate = state === 'mixed';
            const item = latest.current.items.find((it) => it.id === r.id);
            if (item) latest.current.toggleItem(item, deptId);
          };
          return input;
        },
      };
    }),
  ].map((column) => ({ ...column, headerSort: column.field === 'name' })), [signature]);

  const rows = useMemo(() => items.map((it) => {
    const row = {
      id: it.id,
      name: it.name,
      titles: it.titles.join(' · '),
      screens: it.screens,
      offTable: offTableOf(it),
      // 머리글 필터가 읽는 글자 — 표 밖 화면 · 「웹 화면에 나오지 않음」 으로도 찾을 수 있게
      screensText: [...it.screens, ...offTableOf(it)].join(' ') || '웹 화면에 나오지 않음',
      lock: lockReasonOf(it),
    };
    depts.forEach((d) => {
      row[`dept_${d.id}`] = `${itemCell(it, d.id)}|${lockReason(d) || ''}`;
    });
    return row;
  }), [items, depts, itemCell, lockReason, offTableOf]);

  return (
    <TabulatorGrid
      columns={columns}
      rows={rows}
      rowKey="id"
      bordered
      pageSize={50}
      pageSizes={PAGE_SIZES}
      // 체크 저장 뒤 다시 읽어도 쪽 · 스크롤 위치가 그대로이도록 값만 고칩니다(2026-10-07 피드백)
      updateInPlace
      tableOptions={TABLE_OPTIONS}
      emptyText="항목이 없습니다."
    />
  );
}
