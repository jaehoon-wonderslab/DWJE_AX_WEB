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
import { comma, minutesText } from '@shared/utils/formatUtil';
import DowntimeForm from './components/DowntimeForm';

/** `2026-09-02 08:12:00` → 조회 일자와 같은 날이면 `08:12` 만, 다른 날이면 `09-02 08:12` */
function timeText(value, date) {
  if (!value) return '—';
  const v = String(value);
  const m = v.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);
  if (!m) return v;
  return m[1] === date ? m[2] : `${m[1].slice(5)} ${m[2]}`;
}

export default function DowntimeView({
  paging, itemsMeta,
  loading, items, summary, reasonCodes = [], reasonOptions = ['전체'], reasonLabel = (v) => v, topReason,
  filters, setDate, setEqptCd, setReasonCd,
  search, exportExcel, submitReason, fetchReasonSuggestion, eqptOptions,
}) {
  const s = useCommonStyles();
  const openModal = useUiStore((state) => state.openModal);

  /** 비가동 사유 등록·수정 모달 */
  const openForm = (row) =>
    openModal({
      title: row?.registered ? '비가동 사유 수정' : '비가동 사유 등록',
      sub: row
        ? `${row.eqptCd} · ${timeText(row.stopAt, filters.date)} 정지 (${row.elapsedMin === null || row.elapsedMin === undefined ? '진행 중' : minutesText(row.elapsedMin)})`
        : '설비 정지 구간에 사유를 기록합니다',
      render: (close) => (
        <DowntimeForm
          row={row}
          date={filters.date}
          reasonCodes={reasonCodes}
          eqptOptions={eqptOptions}
          fetchSuggestion={fetchReasonSuggestion}
          onSubmit={async (values) => {
            const res = await submitReason(values);
            if (res.ok) close();
          }}
        />
      ),
    });

  const unregistered = Number(summary?.unregisteredCnt) || 0;

  return (
    <View>
      <PageHead
        title="비가동 관리"
        desc="설비 정지 사유를 등록·관리합니다. 이상 알림 Agent 가 사유 후보를 제안하며, 등록 결과는 설비 가동률 산출 근거가 됩니다."
        actions={
          <>
            <Button label="엑셀 다운로드" size="sm" icon="download" onPress={exportExcel} disabled={!items.length} />
            <Button label="비가동 등록" size="sm" variant="primary" icon="plus" onPress={() => openForm(null)} />
          </>
        }
      />

      {unregistered > 0 ? (
        <Hint icon="alert">
          {`사유가 등록되지 않은 정지 구간은 가동률 산출에서 원인 불명으로 집계됩니다. 현재 미등록 ${comma(unregistered)}건이 있습니다.`}
        </Hint>
      ) : null}

      <Grid cols={4}>
        <StatCard label="총 비가동" value={summary ? minutesText(summary.totalMin ?? 0) : '—'} sub={`${filters.date} 기준${summary?.totalCnt !== undefined ? ` · ${comma(summary.totalCnt)}건` : ''}`} />
        <StatCard label="사유 등록" value={summary ? comma(summary.registeredCnt ?? 0) : '—'} unit="건" sub="가동률 산출 반영" tone={Number(summary?.registeredCnt) > 0 ? 'up' : undefined} />
        <StatCard label="사유 미등록" value={summary ? comma(unregistered) : '—'} unit="건" sub="원인 불명 집계" tone={unregistered > 0 ? 'down' : undefined} />
        <StatCard label="최다 사유" value={topReason?.label ?? '—'} sub={topReason ? `${minutesText(topReason.min)} 누계` : '등록된 사유 없음'} />
      </Grid>
      <Gap />

      <Filters>
        <DateField label="일자" value={filters.date} onChange={setDate} />
        <SelectField label="설비" value={filters.eqptCd} options={eqptOptions} onChange={setEqptCd} />
        <SelectField label="사유" value={filters.reasonCd} options={reasonOptions} onChange={setReasonCd} />
        <Button label="조회" variant="primary" onPress={search} />
      </Filters>

      <Card title="비가동 이력" sub={`표준 분류 체계 기준 · 전체 ${comma(itemsMeta?.total ?? items.length)}건`} tight>
        {loading && !items.length ? (
          <Loading />
        ) : (
          <Table
            minWidth={900}
            keyExtractor={(r, i) => r.downtimeId ?? `${r.eqptCd}-${r.stopAt}-${i}`}
            emptyText={`${filters.date} 에 조회 조건에 맞는 비가동 이력이 없습니다.`}
            columns={[
              { key: 'eqptCd', title: '설비', width: 88, mono: true },
              { key: 'stopAt', title: '정지 시각', width: 92, align: 'center', render: (r) => <Text style={[s.td, s.num, { textAlign: 'center' }]}>{timeText(r.stopAt, filters.date)}</Text> },
              { key: 'resumeAt', title: '복구 시각', width: 92, align: 'center', render: (r) => <Text style={[s.td, s.num, { textAlign: 'center' }]}>{r.resumeAt ? timeText(r.resumeAt, filters.date) : '—'}</Text> },
              {
                key: 'elapsedMin',
                title: '정지 시간',
                width: 92,
                align: 'right',
                render: (r) => <Text style={[s.td, s.num, { textAlign: 'right' }]}>{r.elapsedMin === null || r.elapsedMin === undefined ? '—' : minutesText(r.elapsedMin)}</Text>,
              },
              {
                key: 'reasonNm',
                title: '사유',
                flex: 1,
                minWidth: 170,
                render: (r) => (r.registered ? <Text style={s.td}>{r.reasonNm || reasonLabel(r.reasonCd) || '—'}</Text> : <Badge tone="red">미등록</Badge>),
              },
              { key: 'remark', title: '비고', flex: 1, minWidth: 160, render: (r) => <Text style={s.td} numberOfLines={1}>{r.remark || '—'}</Text> },
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
        )}
        <Pagination meta={itemsMeta} {...(paging?.bind || {})} />
      </Card>
    </View>
  );
}
