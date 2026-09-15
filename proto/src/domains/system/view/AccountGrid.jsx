import React, { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Pagination, Table, TextField } from '@shared/components/ui';
import { useCommonStyles } from '@shared/theme/styles';

/** 검색과 페이징은 서버 전체 결과를 대상으로 하며 입력창은 재조회 중에도 유지합니다. */
export default function AccountGrid({ grid, label, ...tableProps }) {
  const [draft, setDraft] = useState('');
  const tableRef = useRef(null);
  const s = useCommonStyles();
  const search = () => grid.search(draft);
  return (
    <View nativeID={`account-grid-${label}`} style={{ gap: 12, minWidth: 0 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <TextField value={draft} onChangeText={setDraft} onSubmitEditing={search} blurOnSubmit={false} placeholder={`${label} 검색`} accessibilityLabel={`${label} 검색`} style={{ flexGrow: 1, flexBasis: 220 }} />
        <Button label="검색" onPress={search} />
        <Button label="초기화" onPress={() => { setDraft(''); tableRef.current?.clearHeaderFilter(); grid.search(''); }} />
      </View>
      <Text style={s.textSm}>{grid.loading ? '조회 중…' : grid.error ? `조회 실패: ${grid.error.message}` : '전체 목록에서 검색합니다. 열 필터는 모든 페이지에 적용됩니다. 열 경계를 드래그하면 너비를 조절할 수 있습니다.'}</Text>
      <Table {...tableProps} instanceRef={tableRef} height={460} bordered contained filterable={grid.localFilters} pageSize={grid.localFilters ? 10 : undefined} rows={grid.rows} columns={tableProps.columns.map(col => ({ wrap: !col.render, ...col, filterable: col.key !== 'action', ...(col.key === 'state' ? { filterField: 'stateNm' } : {}) }))} />
      {grid.localFilters ? null : grid.meta?.total ? <Pagination meta={grid.meta} {...grid.paging.bind} sizes={[10, 25, 50, 100]} /> : <Text style={s.textSm}>검색 결과 0건</Text>}
    </View>
  );
}
