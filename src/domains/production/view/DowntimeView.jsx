/**
 * [View] PR-05 비가동 관리 (경로: /production/downtime)
 *
 * 설비 정지 사유를 등록·관리합니다. ⑨ 이상 알림 Agent 가 사유 후보를 제안하며,
 * 등록 결과는 설비 가동률 산출 근거가 됩니다.
 * 사용 API 5건 — /api/v1/production/downtimes/*
 */
import React from 'react';
import { Text, View } from 'react-native';
import Grid, { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import { Badge, Button, Card, DateField, Filters, Hint, Loading, Pagination, SelectField, StatCard, Table } from '@shared/components/ui';
import { useUiStore } from '@shared/stores/useUiStore';
import { useCommonStyles } from '@shared/theme/styles';
import { minutesText } from '@shared/utils/formatUtil';
import DowntimeForm from './components/DowntimeForm';

export default function DowntimeView({
  
  paging, itemsMeta,
  loading, items, summary, codes, topReason, filters, setDate, setEqptCd, setReasonCd,
  search, exportExcel, submitReason, fetchReasonSuggestion, eqptOptions }) {
  const s = useCommonStyles();
  const openModal = useUiStore((state) => state.openModal);

  /** 비가동 사유 등록·수정 모달 */
  const openForm = (row) =>
    openModal({
      title: row?.registered ? '비가동 사유 수정' : '비가동 사유 등록',
      sub: row ? `${row.eqptCd} · ${row.stopAt} 정지 (${minutesText(row.elapsedMin)})` : '설비 정지 구간에 사유를 기록합니다',
      render: (close) => (
        <DowntimeForm
          row={row}
          codes={codes}
          fetchSuggestion={fetchReasonSuggestion}
          onSubmit={async (values) => {
            const res = await submitReason(values);
            if (res.ok) close();
          }}
        />
      ),
    });

  if (loading) return <Loading />;

  return (
    <View>
      <PageHead
        title="비가동 관리"
        desc="설비 정지 사유를 등록·관리합니다. 이상 알림 Agent 가 사유 후보를 제안하며, 등록 결과는 설비 가동률 산출 근거가 됩니다."
        actions={
          <>
            <Button label="엑셀 다운로드" size="sm" icon="download" onPress={exportExcel} />
            <Button label="비가동 등록" size="sm" variant="primary" icon="plus" onPress={() => openForm(null)} />
          </>
        }
      />

      {summary?.unregisteredCnt ? (
        <Hint>
          {`사유가 등록되지 않은 정지 구간은 가동률 산출에서 원인 불명으로 집계됩니다. 현재 미등록 ${summary.unregisteredCnt}건이 있습니다.`}
        </Hint>
      ) : null}

      <Grid cols={4}>
        <StatCard label="총 비가동" value={minutesText(summary?.totalMin ?? 0)} sub={`${filters.date} 기준`} />
        <StatCard label="사유 등록" value={summary?.registeredCnt ?? 0} unit="건" sub="가동률 산출 반영" />
        <StatCard label="사유 미등록" value={summary?.unregisteredCnt ?? 0} unit="건" sub="원인 불명 집계" tone="down" />
        <StatCard
          label="최다 사유"
          value={topReason?.reason ?? '—'}
          sub={`${minutesText(topReason?.min ?? 0)} 누계`}
        />
      </Grid>
      <Gap />

      <Filters>
        <DateField label="일자" value={filters.date} onChange={setDate} />
        <SelectField label="설비" value={filters.eqptCd} options={eqptOptions} onChange={setEqptCd} />
        <SelectField label="사유" value={filters.reasonCd} options={['전체', ...codes.map((c) => c.nm)]} onChange={setReasonCd} />
        <Button label="조회" variant="primary" onPress={search} />
      </Filters>

      <Card title="비가동 이력" sub="표준 분류 체계 기준" tight>
        <Table
            minWidth={900}
            keyExtractor={(r) => r.downtimeId}
            columns={[
              { key: 'eqptCd', title: '설비', width: 88, mono: true },
              { key: 'stopAt', title: '정지 시각', width: 92, align: 'center' },
              { key: 'resumeAt', title: '복구 시각', width: 92, align: 'center', render: (r) => <Text style={[s.td, { textAlign: 'center' }]}>{r.resumeAt || '—'}</Text> },
              { key: 'elapsedMin', title: '정지 시간', width: 92, align: 'right', render: (r) => <Text style={[s.td, s.num, { textAlign: 'right' }]}>{minutesText(r.elapsedMin)}</Text> },
              {
                key: 'reasonNm',
                title: '사유',
                flex: 1,
                minWidth: 170,
                render: (r) => (r.registered ? <Text style={s.td}>{r.reasonNm}</Text> : <Badge tone="red">미등록</Badge>),
              },
              { key: 'suggestion', title: '제안 사유', flex: 1, minWidth: 160, render: (r) => <Text style={s.td}>{r.suggestion || '—'}</Text> },
              {
                key: 'action',
                title: '등록',
                width: 92,
                render: (r) =>
                  r.registered ? (
                    <Button label="수정" size="sm" onPress={() => openForm(r)} />
                  ) : (
                    <Button label="등록" size="sm" variant="primary" onPress={() => openForm(r)} />
                  ),
              },
            ]}
            rows={items}
          />
          <Pagination meta={itemsMeta} {...(paging?.bind || {})} />
      </Card>
    </View>
  );
}
