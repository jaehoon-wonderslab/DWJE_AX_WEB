import React, { useEffect, useRef, useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { Button, Pagination, Table, TextField } from '@shared/components/ui';
import { useCommonStyles } from '@shared/theme/styles';

/**
 * 검색과 페이징은 서버 전체 결과를 대상으로 하며 입력창은 재조회 중에도 유지합니다.
 *
 * `exportRef` 를 주면 「조회 목록 다운로드」(ACC-17) 가 읽을 수 있게 지금 그리드에 보이는 그대로를 내어 줍니다
 * — 열 필터 · 정렬을 적용한 **지금 쪽**의 행(2026-10-06 — 표가 100건을 보이면 100건), 정렬 순서, 열 순서.
 *   예전에는 모든 쪽을 내보내 「조회 목록 100건」 인데 파일에는 전체가 들어갔습니다. 전체는 「전체 다운로드」 로 받습니다.
 * 관리 열(`action`)은 빼고 돌려줍니다. `onActiveChange` 는 열 필터가 바뀔 때마다 보이는 행을 알려 줍니다.
 *
 * 표는 탭 하나에 하나씩 들어가므로(2026-10-02) 창 높이에 맞춰 세로로 길게 씁니다 — 기본 100행을 한 쪽에 보이고
 * 표 안에서 세로로 스크롤합니다(머리글은 그대로 붙어 있습니다).
 */
/** 기본 표시 건수 — 쪽마다 100행 */
export const ACCOUNT_PAGE_SIZE = 100;
/** 표 높이 — 창 높이에서 머리말·요약 카드·탭·검색 줄을 뺀 값. 낮은 창에서도 이만큼은 둡니다 */
const MIN_GRID_HEIGHT = 520;
const GRID_HEIGHT_OFFSET = 260;
/**
 * @param {boolean} [searchable=true] false 면 위쪽 검색줄(검색칸 · [검색] · [초기화])과 안내 문장을 그리지 않습니다 — 열 필터만 씁니다
 *   (조회 실패·조회 중 문구는 그대로 보입니다)
 */
export default function AccountGrid({ grid, label, exportRef, onActiveChange, toolbar, searchable = true, ...tableProps }) {
  const [draft, setDraft] = useState('');
  const tableRef = useRef(null);
  const s = useCommonStyles();
  const { height: windowHeight } = useWindowDimensions();
  const gridHeight = Math.max(MIN_GRID_HEIGHT, Math.round(windowHeight - GRID_HEIGHT_OFFSET));
  const search = () => grid.search(draft);
  // 지금 쪽에 보이는 행 — 「조회 목록 다운로드(n건)」 건수 (ACC-17). 열 필터 · 쪽 이동 · 쪽 크기가 바뀔 때마다 다시 셉니다
  const attached = useRef(null);
  const activeCb = useRef(onActiveChange);
  activeCb.current = onActiveChange;
  useEffect(() => {
    const table = tableRef.current;
    if (!table || attached.current === table) return;
    attached.current = table;
    const emit = () => {
      try {
        activeCb.current?.(table.getData('display'));
      } catch {
        /* 표가 정리되는 중 */
      }
    };
    ['dataFiltered', 'pageLoaded', 'dataSorted', 'renderComplete'].forEach((ev) => table.on(ev, () => setTimeout(emit, 0)));
    if (table.initialized) emit();
    else table.on('tableBuilt', emit);
  });

  useEffect(() => {
    if (!exportRef) return undefined;
    exportRef.current = {
      getExportView: () => {
        const table = tableRef.current;
        if (!table) return { rows: grid.rows, fields: null, filters: [], sorters: [] };
        const fields = table.getColumns()
          .filter((c) => c.isVisible() && c.getField() && c.getField() !== 'action')
          .map((c) => c.getField());
        const rows = table.getData('display').map(({ __idx, __k, ...row }) => row);
        const filters = (table.getHeaderFilters?.() || []).filter((f) => f.value !== '' && f.value != null).map((f) => ({ field: f.field, value: f.value }));
        const sorters = (table.getSorters?.() || []).map((x) => ({ field: x.field, dir: x.dir }));
        return { rows, fields, filters, sorters };
      },
    };
    return () => { exportRef.current = null; };
  }, [exportRef, grid.rows]);

  return (
    <View nativeID={`account-grid-${label}`} style={{ gap: 12, minWidth: 0 }}>
      {searchable ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <TextField value={draft} onChangeText={setDraft} onSubmitEditing={search} blurOnSubmit={false} placeholder={`${label} 검색`} accessibilityLabel={`${label} 검색`} style={{ flexGrow: 1, flexBasis: 220 }} />
          <Button label="검색" onPress={search} />
          <Button label="초기화" onPress={() => { setDraft(''); tableRef.current?.clearHeaderFilter(); grid.search(''); }} />
          {toolbar}
        </View>
      ) : toolbar}
      {searchable || grid.loading || grid.error ? (
        <Text style={s.textSm}>{grid.loading ? '조회 중…' : grid.error ? `조회 실패: ${grid.error.message}` : `전체 목록에서 검색합니다. ${tableProps.columns.some((c) => c.filter === 'list') ? '목록 모양 머리글(상태 · 직급 등)은 눌러서 값을 고르고, × 로 지웁니다. ' : ''}열 필터는 모든 페이지에 적용됩니다.`}</Text>
      ) : null}
      <Table {...tableProps} instanceRef={tableRef} height={gridHeight} bordered contained filterable={grid.localFilters} pageSize={grid.localFilters ? ACCOUNT_PAGE_SIZE : undefined} rows={tableProps.rows ?? grid.rows} columns={tableProps.columns.map(col => ({ wrap: !col.render, ...col, filterable: col.key !== 'action' && col.filterable !== false, filterField: col.filterField || (col.key === 'state' ? 'stateNm' : undefined) }))} />
      {grid.localFilters ? null : grid.meta?.total ? <Pagination meta={grid.meta} {...grid.paging.bind} sizes={[10, 25, 50, 100]} /> : <Text style={s.textSm}>검색 결과 0건</Text>}
    </View>
  );
}
