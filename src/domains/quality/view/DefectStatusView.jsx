/**
 * [View] QC-01 불량 현황 조회 (경로: /quality/defect)
 *
 * 기간·공정·불량 유형별 발생 현황을 조회합니다. Agent 분석 결과가 함께 표시됩니다.
 * 사용 API 3건 — /api/v1/quality/defects/*
 */
import React from 'react';
import { Text, View } from 'react-native';
import Grid from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import { Badge, BlindValue, Button, Card, DateField, Filters, Loading, ProgressBar, SelectField, Table } from '@shared/components/ui';
import { useAppNavigation } from '@shared/hooks/useAppNavigation';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { compositionOf } from '@domains/common/model/metricModel';
import { comma, fixed } from '@shared/utils/formatUtil';

export default function DefectStatusView({
  loading, summary, typeItems, lineItems, lineLoading, filters, setFrom, setTo, setProcessId, setDefectTypeCd, search, exportExcel, processOptions, defectTypeOptions }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const { goToScreen } = useAppNavigation();
  const canData = useAuthStore((state) => state.canData);

  const blindQty = (v) => (canData('qty') ? comma(v ?? 0) : '비공개');

  /**
   * 유형별 구성 — 비중의 분모는 **불량 수량 원장(ngQty)** 입니다.
   * 서버가 준 ratio 는 표시된 유형들의 합을 분모로 써서 유형이 없는 몫만큼 부풀려져 있습니다.
   * 남는 몫은 '유형 미상' 으로 드러내 합이 원장과 맞게 합니다.
   */
  const { rows: typeRows } = compositionOf(typeItems, summary?.ngQty, { labelKey: 'defectType', valueKey: 'cnt' });

  /** 비중 막대는 1위 유형이 가득 차도록 상대 배율로 그립니다 */
  const maxRatio = Math.max(0, ...typeRows.map((r) => Number(r.ratio) || 0));

  return (
    <View>
      <PageHead
        title="불량 현황 조회"
        desc="기간·공정·불량 유형별 발생 현황을 조회합니다. Agent 분석 결과가 함께 표시됩니다."
        actions={
          <>
            <Button label="엑셀 다운로드" size="sm" icon="download" onPress={exportExcel} />
            <Button label="품질 보고서 작성" size="sm" icon="file" onPress={() => goToScreen('qc-report')} />
          </>
        }
      />

      <Filters>
        <DateField label="시작일" value={filters.from} onChange={setFrom} />
        <DateField label="종료일" value={filters.to} onChange={setTo} />
        <SelectField label="공정" value={filters.processId} options={processOptions} onChange={setProcessId} />
        <SelectField
          label="불량 유형"
          value={filters.defectTypeCd}
          options={defectTypeOptions}
          onChange={setDefectTypeCd}
        />
        <Button label="조회" variant="primary" onPress={search} />
      </Filters>

      {loading ? (
        <Loading />
      ) : (
        <Grid cols={2}>
          <Card
            title="불량 유형별 분포"
            sub={`불량 수량 ${blindQty(summary?.ngQty)} EA · 불량 발생 ${comma(summary?.totalCnt ?? 0)}건 · 비중은 불량 수량 기준`}
            tight
          >
            <Table
              keyExtractor={(r) => r.label}
              columns={[
                {
                  key: 'label',
                  title: '불량 유형',
                  flex: 1.3,
                  render: (r) => (
                    <Text style={[s.td, r.unclassified && { color: theme.color.mutedForeground }]} numberOfLines={1}>
                      {r.label}
                    </Text>
                  ),
                },
                {
                  key: 'value',
                  title: '불량 수량',
                  width: 96,
                  align: 'right',
                  render: (r) => <BlindValue field="qty" value={comma(r.value)} textStyle={[s.td, s.num, { textAlign: 'right' }]} />,
                },
                {
                  key: 'ratio',
                  title: '비중',
                  width: 140,
                  render: (r) => (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%' }}>
                      <View style={{ flex: 1 }}>
                        <ProgressBar percent={maxRatio ? (r.ratio / maxRatio) * 100 : 0} />
                      </View>
                      <Text style={[s.textSm, s.num]}>{fixed(r.ratio)}%</Text>
                    </View>
                  ),
                },
                {
                  key: 'momChange',
                  title: '전월 대비',
                  width: 92,
                  align: 'right',
                  // 전월 대비 증감률(%) — 서버는 숫자로 줍니다. 줄어든 쪽이 좋은 지표입니다.
                  render: (r) => {
                    const v = Number(r.momChange);
                    if (!Number.isFinite(v)) return <Text style={[s.td, s.num]}>—</Text>;
                    return (
                      <Text style={[s.td, s.num, { color: v < 0 ? theme.color.success : theme.color.destructive }]}>
                        {`${v > 0 ? '+' : ''}${v}%`}
                      </Text>
                    );
                  },
                },
              ]}
              rows={typeRows}
            />
          </Card>

          <Card title="라인별 불량률" sub="상위 5개" tight>
            <Table
              keyExtractor={(r) => r.eqptCd}
              columns={[
                { key: 'eqptCd', title: '설비', width: 82, mono: true },
                { key: 'eqptNm', title: '설비명', flex: 1.2, render: (r) => <Text style={s.td} numberOfLines={1}>{r.eqptNm || r.model || '—'}</Text> },
                { key: 'ngQty', title: '불량', width: 82, align: 'right', render: (r) => <BlindValue field="qty" value={comma(r.ngQty)} textStyle={[s.td, s.num]} /> },
                { key: 'defectRate', title: '불량률', width: 88, align: 'right', render: (r) => <BlindValue field="yield" value={`${fixed(r.defectRate)}%`} textStyle={[s.td, s.num]} /> },
                { key: 'mainType', title: '주 유형', width: 100, render: (r) => (r.mainType ? <Badge>{r.mainType}</Badge> : <Text style={s.td}>—</Text>) },
              ]}
              rows={lineItems}
              emptyText={lineLoading ? '라인별 집계를 불러오는 중입니다…' : '해당 조건의 라인별 실적이 없습니다.'}
            />
          </Card>
        </Grid>
      )}
    </View>
  );
}
