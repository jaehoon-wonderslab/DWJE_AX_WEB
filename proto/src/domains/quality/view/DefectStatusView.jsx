/** 불량 유형·제품·라인별 집계와 계층형 차트. */
import React, { useMemo } from 'react';
import { compactDefectTree } from '../model/compactDefectTree';
import { defectTypeTree } from '../model/defectTypeTree';
import { Text, View } from 'react-native';
import { ParetoChart } from '@shared/components/charts-d3';
import ZoomableSunburst from '@shared/components/charts-d3/ZoomableSunburst';
import Grid from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import { Button, Card, CardBody, DateField, Filters, Loading, StatCard, TabulatorGrid } from '@shared/components/ui';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useTheme } from '@shared/theme/useTheme';
import { comma, fixed } from '@shared/utils/formatUtil';


/** 표 한 쪽에 보일 행 수 */
const PAGE_SIZE = 10;

/**
 * 표에 넘기는 고정 값들은 **모듈 밖에** 둡니다.
 *
 * TabulatorGrid 는 `initialSort` 같은 프롭이 바뀌면 표를 다시 만듭니다. 렌더 안에서
 * 배열·객체 리터럴로 넘기면 값이 같아도 매번 새 것이라, 부모가 다시 그려질 때마다
 * (예: 내려받기 버튼의 '파일 생성 중' 상태) 표가 통째로 재생성됩니다.
 * 정렬·펼침·쪽 위치가 날아가고 콘솔에 Tabulator 경고가 쌓입니다.
 */
const TYPE_SORT = [{ column: 'value', dir: 'desc' }];

const GRID_STYLE = { padding: 16, paddingTop: 0 };

// 계층은 들여쓰기와 펼침 버튼으로 표시합니다.
const TREE_COLUMNS = [{
  title: '계층', field: 'outline', width: 132, minWidth: 132, maxWidth: 132,
  headerSort: false, headerFilter: false, resizable: false,
  formatter: () => '',
}];

function TreeLegend({ levels }) {
  const theme = useTheme();
  return <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
    <Text style={{ fontSize: 14, lineHeight: 22, color: theme.color.mutedForeground }}>계층: {levels.join(' → ')} · +/− 펼침·접기</Text>
    <Text style={{ fontSize: 14, lineHeight: 22, color: theme.color.mutedForeground }}>최상위 분류 아래에서 상세가 하나인 경로는 같은 행에 표시하고, 둘 이상이면 펼쳐 표시합니다. 비중은 상위 행 기준을 유지합니다.</Text>
  </View>;
}

export default function DefectStatusView({
  loading, summary, okQty, typeRows = [], lineRows = [], lineLoading,
  filters, setFrom, setTo, search, exportTypeExcel, exportLineExcel, exportingType, exportingLine, productRows = [], productLoading, productError,
}) {
  const theme = useTheme();
  const canData = useAuthStore((state) => state.canData);
  const qtyOk = canData('qty');
  const rateOk = canData('yield');

  /** 권한이 없으면 숫자 대신 '비공개' — 표 안에서는 배지를 못 쓰므로 글자로 둡니다 */
  const qtyText = (v) => (!qtyOk ? '비공개' : v === null || v === undefined || v === '' ? '—' : comma(v));
  const rateText = (v) => (!rateOk ? '비공개' : v === null || v === undefined || v === '' ? '—' : `${fixed(v)}%`);

  /** 비중 칸 — 1위 유형이 가득 차도록 상대 배율로 그립니다 */
  const maxRatio = Math.max(0, ...typeRows.map((r) => Number(r.ratio) || 0));

  const typeColumns = useMemo(() => [
    { title: '불량 유형', field: 'label', minWidth: 140, widthGrow: 2 },
    {
      title: '불량 수량', field: 'value', width: 120, hozAlign: 'right', headerHozAlign: 'right', headerFilter: false,
      sorter: 'number',
      formatter: (cell) => `<span class="mono">${qtyText(cell.getValue())}</span>`,
    },
    {
      title: '비중', field: 'ratio', width: 190, headerFilter: false, sorter: 'number',
      formatter: (cell) => {
        const v = Number(cell.getValue()) || 0;
        const w = maxRatio ? Math.max(2, (v / maxRatio) * 100) : 0;
        return `<div class="bar-cell">
            <div class="bar-track"><div class="bar-fill" style="width:${w}%"></div></div>
            <span class="mono bar-num">${rateOk ? `${fixed(v)}%` : '비공개'}</span>
          </div>`;
      },
    },
  ], [maxRatio, qtyOk, rateOk]);

  // 생산 실적 표와 동일하게 차원을 개별 열로 표시하고 내용에 맞게 넓힙니다.
  const lineColumns = useMemo(() => [
    ...TREE_COLUMNS,
    { title: '라인(설비) 코드', field: 'eqptCd', minWidth: 180 },
    { title: '설비명', field: 'eqptNm', minWidth: 190 },
    { title: '공장', field: 'plantNm', minWidth: 130 },
    { title: '공정', field: 'wcNm', minWidth: 180 },
    { title: '제품', field: 'itemNm', minWidth: 180 },
    { title: '불량 유형', field: 'defectNm', minWidth: 160 },
    { title: '정상 수량', field: 'okQty', minWidth: 150, hozAlign: 'right', headerHozAlign: 'right', headerFilter: false, sorter: 'number',
      formatter: cell => cell.getValue() == null ? '—' : qtyText(cell.getValue()) },
    { title: '불량 수량', field: 'ngQty', minWidth: 150, hozAlign: 'right', headerHozAlign: 'right', headerFilter: false, sorter: 'number',
      formatter: cell => qtyText(cell.getValue()) },
    { title: '불량률 · 비중', field: 'rate', minWidth: 170, hozAlign: 'right', headerHozAlign: 'right', headerFilter: false, sorter: 'number',
      formatter: cell => rateText(cell.getValue()) },
  ], [qtyOk, rateOk]);

  /** 파레토 — 유형 미상은 '어느 유형을 잡을지' 에 답을 주지 못해 뺍니다 */
  const paretoData = useMemo(
    () => typeRows.filter((r) => !r.unclassified).map((r) => ({ label: r.label, value: r.value })),
    [typeRows],
  );

  const productColumns = useMemo(() => [
    ...TREE_COLUMNS,
    { title: '제품 코드', field: 'itemCd', minWidth: 170 },
    { title: '제품명', field: 'itemNm', minWidth: 200 },
    { title: '불량 유형', field: 'defectNm', minWidth: 170 },
    { title: '라인(설비) 코드', field: 'eqptCd', minWidth: 180 },
    { title: '설비명', field: 'eqptNm', minWidth: 190 },
    { title: '공장', field: 'plantNm', minWidth: 130 },
    { title: '공정', field: 'wcNm', minWidth: 180 },
    ...[
      ['수량', 'totalQty', qtyText], ['불량 수량', 'ngQty', qtyText],
      ['불량률', 'defectRate', rateText], ['상위 대비 비중', 'ratio', rateText],
    ].map(([title, field, format]) => ({ title, field, minWidth: 170, hozAlign: 'right', headerHozAlign: 'right',
      headerFilter: false, sorter: 'number', formatter: cell => format(cell.getValue()) })),
  ], [qtyOk, rateOk]);

  const makeChart = (rows, name) => {
    const toNodes = nodes => nodes.map(r => {
      const name = r.level === 'eqpt' ? (r.eqptCd || r.eqptNm || '설비 미상')
        : r.level === 'item' ? (r.itemNm || r.itemCd || '제품 미상')
        : r.level === 'defect' ? (r.defectNm || '유형 미상') : (r.wcNm || '공정 미상');
      const children = r._children?.length ? toNodes(r._children) : undefined;
      const context = [
        r.defectNm && '불량: ' + r.defectNm,
        r.itemNm && '제품: ' + r.itemNm,
        r.eqptCd && '라인: ' + r.eqptCd,
        r.eqptNm && '설비: ' + r.eqptNm,
        r.plantNm && '공장: ' + r.plantNm,
        r.wcNm && '공정: ' + r.wcNm,
      ].filter(Boolean).join(' · ');
      return { key: r.key, name, levelLabel: r.levelLabel, context,
        details: [['불량 유형', r.defectNm], ['제품', r.itemNm || r.itemCd], ['라인', r.eqptCd],
          ['설비', r.eqptNm], ['공장', r.plantNm], ['공정', r.wcNm]].filter(([, value]) => value),
        value: r.ngQty, rate: r.defectRate ?? (r.level !== 'defect' ? r.rate : null),
        ratio: r.ratio, children };
    });
    return { key: 'root', name, children: toNodes(rows) };
  };
  const typeDetailRows = useMemo(() => defectTypeTree(productRows), [productRows]);
  const typeDetailColumns = useMemo(() => {
    const byField = new Map(productColumns.map(c => [c.field, c]));
    return [...TREE_COLUMNS, ...['defectNm', 'itemCd', 'itemNm', 'eqptCd', 'eqptNm', 'plantNm', 'wcNm',
      'totalQty', 'ngQty', 'defectRate', 'ratio'].map(field => byField.get(field))];
  }, [productColumns]);
  const typeGridRows = useMemo(() => compactDefectTree(typeDetailRows), [typeDetailRows]);
  const productGridRows = useMemo(() => compactDefectTree(productRows), [productRows]);
  const lineGridRows = useMemo(() => compactDefectTree(lineRows), [lineRows]);
  const typeDetailChart = useMemo(() => makeChart(typeDetailRows, '전체 불량 유형'), [typeDetailRows]);
  const lineChart = useMemo(() => makeChart(lineRows, '전체 라인'), [lineRows]);
  const productChart = useMemo(() => makeChart(productRows, '전체 제품'), [productRows]);

  return (
    <View>
      <PageHead title="불량 현황 조회" desc="기간별 불량 발생 현황을 조회합니다." />

      <Filters>
        <DateField label="시작일" value={filters.from} onChange={setFrom} />
        <DateField label="종료일" value={filters.to} onChange={setTo} />
        <Button label="조회" variant="primary" onPress={search} />
      </Filters>

      {loading ? (
        <Loading />
      ) : (
        <Grid cols={1}>
          <Card
            title="불량별 비중"
            right={<Button label={exportingType ? '파일 생성 중…' : '엑셀 다운로드'} size="sm" icon="download" onPress={exportTypeExcel} disabled={exportingType} />}
            tight
          >
            <CardBody>
              <Grid cols={2}>
                <StatCard label="불량 수량" value={comma(summary?.ngQty ?? 0)} unit="EA" field="qty" />
                <StatCard label="정상 수량" value={okQty === null ? '—' : comma(okQty)} unit="EA" field="qty" />
              </Grid>
              <View style={{ marginTop: 14 }}>
                {paretoData.length ? (
                  <ParetoChart data={paretoData} height={320} fontSize={17} unit="EA" />
                ) : (
                  <Text style={{ color: theme.color.mutedForeground, paddingVertical: 24, textAlign: 'center' }}>
                    그릴 불량 유형 실적이 없습니다.
                  </Text>
                )}
              </View>
            </CardBody>
            <TabulatorGrid
              columns={typeColumns}
              rows={typeRows}
              rowKey="label"
              bordered
              productionStyle
              pageSize={PAGE_SIZE}
              initialSort={TYPE_SORT}
              emptyText="해당 조건의 불량 실적이 없습니다."
              style={GRID_STYLE}
            />
          </Card>

          <Card title="불량 유형별 분포" sub="불량 유형 ▸ 제품 ▸ 라인(설비) ▸ 공정 — 유형별 상세 구성" tight>
            <CardBody>
              {productLoading ? <Loading /> : productError ?
                <Text style={{ color: theme.color.destructive }}>유형별 상세 집계를 불러오지 못했습니다. 조회 버튼으로 다시 시도해 주세요.</Text> :
                <ZoomableSunburst data={typeDetailChart} title="불량 유형별 상세 구성" canQty={qtyOk} canRate={rateOk} />}
              <Text style={{ color: theme.color.mutedForeground, fontSize: 15, marginTop: 12 }}>
                유형 행의 불량률은 전체 제품 수량 대비 해당 유형의 불량 수량입니다.
                제품 이하 행은 해당 제품·설비의 수량을 분모로 사용합니다. 비중은 상위 불량 대비이며 유형 행은 전체 불량 대비입니다.
                수량은 반복되는 분모이므로 유형 간 합산하지 않습니다.
              </Text>
            </CardBody>
            <TreeLegend levels={['불량 유형', '제품', '라인(설비)', '공정']} />
            <TabulatorGrid columns={typeDetailColumns} rows={typeGridRows} rowKey="key" bordered productionStyle dataTree treeChildIndent={14}
              pageSize={PAGE_SIZE} style={GRID_STYLE}
              emptyText={productLoading ? '유형별 상세 집계를 불러오는 중입니다…' : productError ? '유형별 상세 집계를 불러오지 못했습니다.' : '해당 조건의 유형별 실적이 없습니다.'} />
          </Card>

          <Card title="제품별 불량 현황" sub="제품 ▸ 불량 유형 ▸ 라인(설비) ▸ 공정 — [+]로 상세를 펼칩니다" tight>
            <CardBody>
              {productLoading ? <Loading /> : productError ?
                <Text style={{ color: theme.color.destructive }}>제품별 집계를 불러오지 못했습니다. 조회 버튼으로 다시 시도해 주세요.</Text> :
                <ZoomableSunburst data={productChart} title="제품별 불량 구성" canQty={qtyOk} canRate={rateOk} />}
              <Text style={{ color: theme.color.mutedForeground, fontSize: 15, marginTop: 12 }}>
                불량률 = 불량 수량 ÷ 해당 제품·설비의 수량 × 100. 유형별 수량은 불량률 계산용 분모이므로 서로 더하지 않습니다.
                비중은 상위 그룹 불량 중 해당 항목의 비율이며, 제품 행은 전체 불량 대비 비중입니다.
              </Text>
            </CardBody>
            <TreeLegend levels={['제품', '불량 유형', '라인(설비)', '공정']} />
            <TabulatorGrid columns={productColumns} rows={productGridRows} rowKey="key" bordered productionStyle dataTree treeChildIndent={14}
              pageSize={PAGE_SIZE} style={GRID_STYLE}
              emptyText={productLoading ? '제품별 집계를 불러오는 중입니다…' : productError ? '제품별 집계를 불러오지 못했습니다.' : '해당 조건의 제품별 실적이 없습니다.'} />
          </Card>

          <Card
            title="라인별 불량률"
            sub="라인(설비) ▸ 공정 ▸ 제품 ▸ 불량 유형 — 라인별 합계를 비교하고 [+]로 상세를 펼칩니다"
            right={<Button label={exportingLine ? '파일 생성 중…' : '엑셀 다운로드'} size="sm" icon="download" onPress={exportLineExcel} disabled={exportingLine} />}
            tight
          >
            <CardBody>
              {lineLoading ? <Loading /> : <ZoomableSunburst data={lineChart} title="라인별 불량 구성" canQty={qtyOk} canRate={rateOk} />}
            </CardBody>
            <TreeLegend levels={['라인(설비)', '공정', '제품', '불량 유형']} />
            <TabulatorGrid
              columns={lineColumns}
              rows={lineGridRows}
              rowKey="key"
              bordered
              productionStyle
              dataTree
              treeChildIndent={14}
              pageSize={PAGE_SIZE}
              emptyText={lineLoading ? '라인별 집계를 불러오는 중입니다…' : '해당 조건의 라인별 실적이 없습니다.'}
              style={GRID_STYLE}
            />
          </Card>
        </Grid>
      )}
    </View>
  );
}
