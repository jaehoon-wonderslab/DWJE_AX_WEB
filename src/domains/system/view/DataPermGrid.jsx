/**
 * 「제거됨」 2026-10-07 — 데이터 접근 권한을 항목 단위로 바꾸며 화면에서 뺐습니다(DataPermView → ItemPermGrid).
 * 어디서도 import 하지 않습니다. 되살릴 수 있게 파일은 남겨 둡니다(AGENTS.md 「제거한 화면은 「제거됨」 으로 표시」).
 *
 * [View] SY-03 부서 × 데이터 항목 표
 *
 * 메뉴 접근 권한(MenuPermGrid)과 같은 Tabulator 표입니다 — 두 권한 화면을 오가며 쓰는 일이
 * 많아 열 너비 조절·가로 스크롤·바닥 합계가 같은 방식으로 동작해야 합니다.
 *
 * 2026-10-01 (기획 04 DTP-16·17 · 4.3 열 정의)
 *  · 데이터 항목 170/140 · 분류 110/100 · 적용 110/100 · 포함 데이터 —/260 · 부서 150/120
 *  · 부서 머리글 「부서명 · n명」, 통합관리자 「전 권한」·미배정 「0건 고정」 잠금
 *  · 잠금·읽기 전용·저장 중 사유는 컨트롤러(lockReason)가 정합니다
 */
import React, { useMemo, useRef } from 'react';
import { TabulatorGrid } from '@shared/components/ui';

const escapeTitle = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

/** 미적용 종류는 아직 가려지지 않으므로 행을 흐리게 그립니다(DTP-04) */
const TABLE_OPTIONS = {
  rowFormatter: row => {
    row.getElement().style.opacity = row.getData().applyFlg === 'N' ? '0.62' : '';
  },
};

function deptHeader(name, userCnt, locked) {
  const count = `${Number(userCnt || 0).toLocaleString('ko-KR')}명`;
  // 통합관리자 「전 권한」 부제는 뺐습니다(2026-10-07) — 잠금 이유는 머리글 툴팁 · 칸 툴팁에 있습니다
  const second = locked === 'UNASSIGNED' ? '0건 고정' : '';
  return `<div class="strong">${escapeTitle(`${name} · ${count}`)}</div>${second ? `<div class="muted" style="font-weight:400">${escapeTitle(second)}</div>` : ''}`;
}

export default function DataPermGrid({ fields, depts, cellValue, lockReason, applyLockReason, toggle, onApply }) {
  // 콜백 안에서 최신 값을 읽기 위한 통로 — 이것 때문에 표를 새로 만들지는 않습니다
  const latest = useRef({});
  latest.current = { fields, cellValue, toggle, onApply };

  // 체크만 바뀔 때 표를 재생성하지 않아 열 너비·스크롤 위치를 유지합니다
  const signature = JSON.stringify(depts.map(d => [String(d.id), d.name, d.userCnt || 0, d.locked || '']));

  const columns = useMemo(() => [
    // 「(기본)」 표시 · 분류 열 · 적용 열은 뺐습니다(2026-10-02 디자인 피드백)
    { title: '데이터 항목', field: 'name', width: 170, minWidth: 140, formatter: cell => `<span class="strong">${escapeTitle(cell.getValue())}</span>` },
    { title: '포함 데이터', field: 'included', minWidth: 260, widthGrow: 2, formatter: 'textarea', variableHeight: true, bottomCalc: () => '허용 항목 수' },
    ...JSON.parse(signature).map(([deptId, name, userCnt, locked]) => {
      const field = `dept_${deptId}`;
      return {
        title: deptHeader(name, userCnt, locked), field, width: 150, minWidth: 120, hozAlign: 'center', headerHozAlign: 'center',
        headerTooltip: locked === 'UNASSIGNED' ? '미배정 부서는 데이터 접근 권한이 없습니다(모든 종류 비공개)' : locked === 'SUPER_ADMIN' ? '통합관리자 부서는 전 권한으로 고정됩니다' : name,
        bottomCalc: () => latest.current.fields.filter(f => latest.current.cellValue(f.key, deptId)).length,
        formatter: cell => {
          const row = cell.getRow().getData();
          const allowed = row[field] === '허용';
          const reason = row[`${field}__lock`] || '';
          const input = document.createElement('input');
          input.type = 'checkbox';
          input.checked = allowed;
          input.disabled = !!reason;
          input.setAttribute('aria-label', `${row.name} · ${name} 열람 허용`);
          input.title = reason || `${name} · ${allowed ? '열람' : '비공개'}${row.applyFlg === 'N' ? ' — 미적용: 체크해도 아직 가려지지 않습니다' : ''}`;
          input.onchange = () => {
            // 서버 응답 전에는 서버가 아는 상태를 유지합니다 — 중복 변경도 함께 막힙니다
            input.checked = allowed;
            latest.current.toggle(row.key, deptId);
          };
          return input;
        },
      };
    }),
  ].map(column => ({ ...column, headerSort: false })), [signature]);

  const rows = useMemo(
    () => fields.map(f => {
      const row = {
        key: f.key,
        name: f.name,
        builtIn: !!f.builtIn,
        applyFlg: f.applyFlg,
        applyLabel: f.applyFlg === 'N' ? '미적용' : '적용 중',
        applyLock: applyLockReason ? applyLockReason(f) : '',
        desc: f.desc,
        // 설명이 없으면 가리는 값을 열 제목으로 요약합니다(DTP-07)
        included: f.included ?? f.desc,
      };
      depts.forEach(d => {
        row[`dept_${d.id}`] = cellValue(f.key, d.id) ? '허용' : '비공개';
        row[`dept_${d.id}__lock`] = lockReason(d);
      });
      return row;
    }),
    [fields, depts, cellValue, lockReason, applyLockReason]
  );

  return <TabulatorGrid columns={columns} rows={rows} rowKey="key" bordered headerFilter={false} tableOptions={TABLE_OPTIONS} />;
}
