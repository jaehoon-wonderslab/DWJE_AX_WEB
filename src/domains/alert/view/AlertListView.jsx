/**
 * [View] AL-01 알림 목록·상세 (경로: /alert/list)
 *
 * 임계값을 넘은 건과 패턴 이상을 목록으로 관리합니다.
 * 사용 API 5건 — /api/v1/alerts/*
 */
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import { Badge, Button, Card, Dot, Filters, KeyValue, Loading, Pagination, SelectField, Table, Tabs, TextAreaField } from '@shared/components/ui';
import { useAppNavigation } from '@shared/hooks/useAppNavigation';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { useCommonStyles } from '@shared/theme/styles';

export default function AlertListView({
  loading, items, counts, escalations, sendLogs, tab, setTab, filters, equipments = [],
  setType, setTarget, setPeriod, reload, loadDetail, acknowledge, exportExcel, paging, itemsMeta,
}) {
  const s = useCommonStyles();
  const can = useAuthStore((state) => state.can);
  const { goToScreen } = useAppNavigation();
  const toast = useUiStore((state) => state.toast);
  const openModal = useUiStore((state) => state.openModal);

  /** 알림 상세 · 확인 처리 */
  const openDetail = async (row) => {
    try {
      const alert = await loadDetail(row.alertId);
      openModal({
        title: alert.title,
        sub: `${alert.target} · ${alert.elapsed} · ${alert.agent} Agent`,
        render: (close) => <AlertDetail alert={alert} onAck={async (note) => { const r = await acknowledge(alert.alertId, note); if (r.ok) close(); }} />,
        footer: (close) => (
          <>
            <Button label="닫기" onPress={close} />
            {alert.detail?.link ? <Button label="관련 화면 열기" onPress={() => { close(); goToScreen(alert.detail.link); }} /> : null}
          </>
        ),
      });
    } catch (e) {
      toast(e.message || '알림 상세를 불러오지 못했습니다');
    }
  };

  if (loading) return <Loading />;

  return (
    <View>
      <PageHead
        title="알림 목록·상세"
        desc="임계값을 넘은 건과 패턴 이상을 목록으로 관리합니다. 확인되지 않은 건은 상위 담당으로 승격됩니다."
        actions={
          <>
            <Button label="엑셀 다운로드" size="sm" icon="download" onPress={exportExcel} />
            {can('alert-cond') ? <Button label="발송 조건 관리" size="sm" icon="settings" onPress={() => goToScreen('alert-cond')} /> : null}
          </>
        }
      />

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: '미확인', label: `미확인 ${counts.unread ?? 0}` },
          { value: '확인됨', label: `확인됨 ${counts.read ?? 0}` },
          { value: '전체', label: '전체' },
        ]}
      />

      <Filters>
        {/* 서버가 거르는 값은 심각도(CRIT|WARN|LOW)입니다 — 라벨은 리포지토리에서 코드로 바뀝니다 */}
        <SelectField label="심각도" value={filters.type} options={['전체', '심각', '경고', '주의']} onChange={setType} />
        <SelectField label="설비" value={filters.target} options={['전체', ...equipments]} onChange={setTarget} />
        <SelectField label="기간" value={filters.period} options={['오늘', '최근 7일', '최근 30일']} onChange={setPeriod} />
        <Button label="조회" variant="primary" onPress={reload} />
      </Filters>

      <Card title="알림 목록" sub={`${items.length}건`} tight>
        <Table
            minWidth={940}
            keyExtractor={(r) => r.alertId}
            onRowPress={openDetail}
            emptyText="해당 조건의 알림이 없습니다."
            columns={[
              { key: 'level', title: '등급', width: 58, align: 'center', render: (r) => <Dot tone={r.level === 'red' ? 'red' : r.level === 'amber' ? 'amber' : 'gray'} /> },
              { key: 'type', title: '유형', flex: 1.4, minWidth: 190 },
              { key: 'eqptCd', title: '대상', width: 120, mono: true },
              {
                key: 'basisValue',
                title: '근거 수치',
                width: 150,
                // 근거값과 임계값을 함께 보여야 왜 울렸는지 알 수 있습니다
                render: (r) => <Text style={s.td}>{r.basisValue == null ? '—' : `${r.basisValue} / 임계 ${r.threshold ?? '—'}`}</Text>,
              },
              { key: 'agent', title: '감지 Agent', width: 130 },
              { key: 'elapsed', title: '발생', width: 90 },
              {
                key: 'state',
                title: '상태',
                width: 96,
                render: (r) =>
                  r.ackState === 'ACK' ? <Badge tone="green">확인됨</Badge> : <Button label="확인" size="sm" onPress={() => openDetail(r)} />,
              },
            ]}
            rows={items}
          />
          <Pagination meta={itemsMeta} {...(paging?.bind || {})} />
      </Card>
      <Gap />

      <Card title="승격 대기" sub="미확인 상태가 지속되면 아래 순서로 상위 담당에게 전달됩니다" tight>
        <Table
          minWidth={760}
          keyExtractor={(r) => r.stage}
          emptyText="승격 대기 중인 알림이 없습니다."
          columns={[
            { key: 'stage', title: '단계', width: 84, align: 'center', render: (r) => <Badge tone="amber">{`${r.stage}단계`}</Badge> },
            { key: 'waitMin', title: '대기', width: 90, align: 'right', render: (r) => <Text style={[s.td, s.num, { textAlign: 'right' }]}>{`${r.waitMin}분`}</Text> },
            { key: 'targets', title: '전달 대상', flex: 1, minWidth: 200, render: (r) => <Text style={s.td}>{(r.targets || []).join(' · ') || '—'}</Text> },
          ]}
          rows={escalations}
        />
      </Card>
      <Gap />

      <Card title="알림 발송 로그" sub="최근 발송 내역" tight>
        <Table
          minWidth={860}
          keyExtractor={(r, i) => `${r.ts}-${i}`}
          columns={[
            { key: 'ts', title: '발송 시각', width: 150, mono: true },
            { key: 'condNm', title: '발송 조건', width: 200 },
            { key: 'channel', title: '채널', width: 130 },
            { key: 'recipient', title: '수신자', flex: 1, minWidth: 170 },
            { key: 'delaySec', title: '지연', width: 78, align: 'right', num: true, render: (r) => <Text style={[s.td, s.num, { textAlign: 'right' }]}>{r.delaySec == null ? '—' : `${r.delaySec}초`}</Text> },
            {
              key: 'result',
              title: '결과',
              width: 150,
              render: (r) => <Badge tone={r.result === 'OK' || r.result === '성공' ? 'green' : 'amber'}>{r.result}</Badge>,
            },
          ]}
          rows={sendLogs}
        />
      </Card>
    </View>
  );
}

/** 알림 상세 · 조치 입력 */
function AlertDetail({ alert, onAck }) {
  const s = useCommonStyles();
  const [note, setNote] = useState(alert.actionNote || '');

  return (
    <View>
      <KeyValue
        keyWidth={100}
        rows={[
          ['대상 설비', `${alert.target}${alert.targetName !== '—' ? ` (${alert.targetName})` : ''}`],
          ['대상 LOT', alert.detail?.lotNo],
          ['근거 수치', alert.detail?.basis],
          ['주 불량 유형', alert.detail?.mainDefect],
          ['원인 후보', alert.detail?.causeCandidate],
          ['권고 조치', alert.detail?.recommendation],
          ['발생 시각', alert.occurredAt],
          ['상태', alert.state],
        ]}
      />
      <TextAreaField label="조치 내용" value={note} onChangeText={setNote} rows={2} placeholder="확인 후 조치 내용을 입력하세요" />
      <Text style={[s.sourceText, { marginTop: 12 }]}>미확인 상태가 지속되면 상위 담당으로 자동 전달됩니다.</Text>
      {alert.state !== '확인됨' ? (
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14 }}>
          <Button label="확인 처리" variant="primary" onPress={() => onAck(note)} />
        </View>
      ) : null}
    </View>
  );
}
