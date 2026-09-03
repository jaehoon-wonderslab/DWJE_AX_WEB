/**
 * [View] SY-07 제품군 순위 관리 (경로: /system/product-rank)
 *
 * 제품의 매출 순위는 '제품군 순위 × 제품군 내 순서'로 계산합니다.
 * 사용 API 7건 — /api/v1/products/families/*, /products/ranking, /products/rank-logs
 */
import React from 'react';
import { Text, View } from 'react-native';
import Grid, { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import { Badge, BlindNote, BlindValue, Button, Card, Hint, Loading, Pagination, SelectField, StatCard, Table, openConfirmModal } from '@shared/components/ui';
import { useAppNavigation } from '@shared/hooks/useAppNavigation';
import { useCommonStyles } from '@shared/theme/styles';

export default function ProductRankView({
  loading, families, isDefault, ranking, logs, logsTotal, logsPaging, logsMeta, topN, setTopN, openFamily, setOpenFamily, openFamilyNm, familyProducts,
  exportExcel, moveFamily, setFamilyRank, moveProduct, resetOrder,
}) {
  const s = useCommonStyles();
  const { goToScreen } = useAppNavigation();

  /** 기본 순서 복원 확인 */
  const confirmReset = () =>
    openConfirmModal({
      title: '기본 순서 복원',
      message: '제품군 순위와 제품군 내 순서를 모두 기본값으로 되돌립니다. 되돌린 순위는 대시보드 주력 제품 Top N 에도 바로 반영됩니다.',
      confirmLabel: '복원',
      onConfirm: resetOrder,
    });

  if (loading) return <Loading />;

  return (
    <View>
      <PageHead
        title="제품군 순위 관리"
        desc="제품의 매출 순위는 제품군 순위 × 제품군 내 순서로 계산합니다. 제품군 순서를 바꾸면 공정 및 제품 대시보드의 주력 제품 Top N 이 함께 바뀝니다."
        actions={
          <>
            <Button label="엑셀 다운로드" size="sm" icon="download" onPress={exportExcel} />
            <Button label="공정 및 제품 대시보드" size="sm" icon="chart" onPress={() => goToScreen('dash-proc')} />
            <Button label="기본 순서 복원" size="sm" variant="primary" icon="refresh" onPress={confirmReset} />
          </>
        }
      />

      <Grid cols={4}>
        <StatCard label="제품군" value={families.length} unit="개" sub="순위 부여 단위" />
        <StatCard label="전체 제품" value={families.reduce((n, f) => n + (f.productCnt ?? 0), 0)} unit="종" sub="제품군 합계" />
        <StatCard label="순위 기준" value={isDefault ? '기본' : '사용자 지정'} sub="제품군 순위 × 제품군 내 순서" tone={isDefault ? '' : 'up'} />
        <StatCard label="변경 이력" value={logsTotal ?? logs.length} unit="건" sub="감사 로그에 함께 기록" />
      </Grid>
      <Gap />

      <Hint>
        위/아래 버튼으로 제품군 순서를 바꾸거나, 순위 칸에서 목표 순위를 골라 한 번에 이동할 수 있습니다. 순위를 바꾸면 전체 제품의 매출 순위가 다시 계산됩니다.
      </Hint>

      <Grid cols={[3, 2]}>
        <Card title="제품군 순위" sub="위에 있을수록 상위 순위" tight>
          <Table
            minWidth={620}
            keyExtractor={(r) => r.familyCd}
            onRowPress={(r) => setOpenFamily(openFamily === r.familyCd ? null : r.familyCd)}
            columns={[
              { key: 'rank', title: '순위', width: 58, align: 'center', render: (r) => <Text style={[s.td, s.num, { textAlign: 'center', fontWeight: '700' }]}>{r.rank}</Text> },
              { key: 'familyNm', title: '제품군', flex: 1, minWidth: 140, render: (r) => <Text style={[s.td, { fontWeight: '600' }]}>{r.familyNm ?? r.name}</Text> },
              { key: 'productCnt', title: '제품 수', width: 76, align: 'right', num: true },
              {
                key: 'move',
                title: '이동',
                width: 180,
                render: (r) => (
                  <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                    <Button label="▲" size="sm" disabled={r.rank === 1} onPress={() => moveFamily(r.familyCd, 'up')} />
                    <Button label="▼" size="sm" disabled={r.rank === families.length} onPress={() => moveFamily(r.familyCd, 'down')} />
                    <SelectField
                      value={String(r.rank)}
                      options={families.map((_, i) => String(i + 1))}
                      onChange={(v) => setFamilyRank(r.familyCd, v)}
                      style={{ width: 68 }}
                    />
                  </View>
                ),
              },
              {
                key: 'detail',
                title: '상세',
                width: 104,
                render: (r) => (
                  <Button
                    label={openFamily === r.familyCd ? '닫기' : '제품 순서'}
                    size="sm"
                    onPress={() => setOpenFamily(openFamily === r.familyCd ? null : r.familyCd)}
                  />
                ),
              },
            ]}
            rows={families}
          />
        </Card>

        <Card title={`현재 순위 상위 ${topN}`} sub="제품군 순위 × 제품군 내 순서로 산출" tight right={<SelectField value={topN} options={['5', '10', '20']} onChange={setTopN} style={{ width: 92 }} />}>
          <Table
            keyExtractor={(r) => r.code}
            columns={[
              { key: 'rank', title: '#', width: 52, align: 'center', num: true },
              { key: 'code', title: '제품', width: 110, mono: true },
              { key: 'family', title: '제품군', flex: 1, minWidth: 140 },
              { key: 'customer', title: '고객사', width: 130, render: (r) => <BlindValue field="customer" value={r.customer || '—'} textStyle={s.td} /> },
            ]}
            rows={ranking}
          />
          <View style={{ paddingHorizontal: 14, paddingVertical: 6 }}>
            <BlindNote fields={['customer']} />
          </View>
        </Card>
      </Grid>
      <Gap />

      {openFamily ? (
        <>
          <Card title={`${openFamilyNm || openFamily} — 제품군 내 순서`} sub={`${openFamily} · 같은 제품군 안에서의 순서를 조정합니다`} tight right={<Button label="닫기" size="sm" onPress={() => setOpenFamily(null)} />}>
            <Table
              minWidth={780}
              keyExtractor={(r) => r.code}
              columns={[
                { key: 'seq', title: '순서', width: 66, align: 'center', num: true },
                { key: 'code', title: '제품', width: 120, mono: true },
                { key: 'name', title: '제품명', flex: 1, minWidth: 160 },
                { key: 'customer', title: '고객사', width: 150, render: (r) => <BlindValue field="customer" value={r.customer || '—'} textStyle={s.td} /> },
                { key: 'project', title: '프로젝트', width: 100 },
                { key: 'rank', title: '전체 순위', width: 92, align: 'right', num: true },
                {
                  key: 'move',
                  title: '이동',
                  width: 110,
                  render: (r, i) => (
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                      <Button label="▲" size="sm" disabled={i === 0} onPress={() => moveProduct(r.code, 'up')} />
                      <Button label="▼" size="sm" disabled={i === familyProducts.length - 1} onPress={() => moveProduct(r.code, 'down')} />
                    </View>
                  ),
                },
              ]}
              rows={familyProducts}
            />
          </Card>
          <Gap />
        </>
      ) : null}

      <Card title="순위 변경 이력" sub="변경 내역은 감사 로그에도 함께 기록됩니다" tight>
        <Table
          minWidth={760}
          keyExtractor={(r, i) => `${r.ts}-${i}`}
          columns={[
            { key: 'ts', title: '시각', width: 150, mono: true },
            { key: 'act', title: '구분', width: 120, render: (r) => <Badge tone={r.type === 'RESET' ? 'amber' : r.type === 'FAMILY' ? 'blue' : ''}>{r.act || '—'}</Badge> },
            { key: 'detail', title: '변경 내용', flex: 1, minWidth: 260 },
            { key: 'by', title: '수행자', width: 170 },
          ]}
          rows={logs}
        />
        <Pagination meta={logsMeta} {...(logsPaging?.bind || {})} />
      </Card>
    </View>
  );
}
