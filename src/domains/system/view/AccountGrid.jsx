import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Pagination, Table, TextField } from '@shared/components/ui';
import { useCommonStyles } from '@shared/theme/styles';
import { useTableActive } from './useTableActive';

/**
 * 검색과 페이징은 서버 전체 결과를 대상으로 하며 입력창은 재조회 중에도 유지합니다.
 *
 * `exportRef` 를 주면 「조회 목록 다운로드」(ACC-17) 가 읽을 수 있게 지금 그리드에 보이는 그대로를 내어 줍니다
 * — 검색어로 서버가 거른 결과에 열 필터를 적용한 **모든 쪽**의 행(로컬 쪽 나눔 표), 정렬 순서, 열 순서.
 * 관리 열(`action`)은 빼고 돌려줍니다. `onActiveChange` 는 열 필터가 바뀔 때마다 보이는 행을 알려 줍니다.
 */
export default function AccountGrid({ grid, label, exportRef, onActiveChange, toolbar, ...tableProps }) {
  const [draft, setDraft] = useState('');
  const tableRef = useRef(null);
  const s = useCommonStyles();
  const search = () => grid.search(draft);
  // 열 필터를 적용한 뒤 보이는 행 수 — 「조회 목록 다운로드(n건)」 건수 (ACC-17)
  useTableActive(tableRef, (rows) => onActiveChange?.(rows));

  useEffect(() => {
    if (!exportRef) return undefined;
    exportRef.current = {
      getExportView: () => {
        const table = tableRef.current;
        if (!table) return { rows: grid.rows, fields: null, filters: [], sorters: [] };
        const fields = table.getColumns()
          .filter((c) => c.isVisible() && c.getField() && c.getField() !== 'action')
          .map((c) => c.getField());
        const rows = table.getData('active').map(({ __idx, __k, ...row }) => row);
        const filters = (table.getHeaderFilters?.() || []).filter((f) => f.value !== '' && f.value != null).map((f) => ({ field: f.field, value: f.value }));
        const sorters = (table.getSorters?.() || []).map((x) => ({ field: x.field, dir: x.dir }));
        return { rows, fields, filters, sorters };
      },
    };
    return () => { exportRef.current = null; };
  }, [exportRef, grid.rows]);

  return (
    <View nativeID={`account-grid-${label}`} style={{ gap: 12, minWidth: 0 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <TextField value={draft} onChangeText={setDraft} onSubmitEditing={search} blurOnSubmit={false} placeholder={`${label} 검색`} accessibilityLabel={`${label} 검색`} style={{ flexGrow: 1, flexBasis: 220 }} />
        <Button label="검색" onPress={search} />
        <Button label="초기화" onPress={() => { setDraft(''); tableRef.current?.clearHeaderFilter(); grid.search(''); }} />
        {toolbar}
      </View>
      <Text style={s.textSm}>{grid.loading ? '조회 중…' : grid.error ? `조회 실패: ${grid.error.message}` : '전체 목록에서 검색합니다. 열 필터는 모든 페이지에 적용됩니다. 열 경계를 드래그하면 너비를 조절할 수 있습니다.'}</Text>
      <Table {...tableProps} instanceRef={tableRef} height={460} bordered contained filterable={grid.localFilters} pageSize={grid.localFilters ? 10 : undefined} rows={tableProps.rows ?? grid.rows} columns={tableProps.columns.map(col => ({ wrap: !col.render, ...col, filterable: col.key !== 'action', filterField: col.filterField || (col.key === 'state' ? 'stateNm' : undefined) }))} />
      {grid.localFilters ? null : grid.meta?.total ? <Pagination meta={grid.meta} {...grid.paging.bind} sizes={[10, 25, 50, 100]} /> : <Text style={s.textSm}>검색 결과 0건</Text>}
    </View>
  );
}
