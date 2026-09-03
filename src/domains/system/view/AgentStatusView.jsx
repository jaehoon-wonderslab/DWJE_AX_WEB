/**
 * [View] SY-12 Agent 실행 현황 (경로: /system/agent)
 *
 * Master AI 오케스트레이션과 Worker Agent 9종의 작동 상태를 확인합니다. (30초 자동 갱신)
 * 사용 API 5건 — /api/v1/ai/agents/*
 */
import React from 'react';
import { Text, View } from 'react-native';
import Grid, { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import { Badge, Button, Card, Dot, EmptyState, Icon, Loading, StatCard, Table, openFormModal } from '@shared/components/ui';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { comma } from '@shared/utils/formatUtil';
import { agentStateTone, msText } from '../controller/useAgentStatusController';

/** 배지 색 → Dot 색 (Dot 은 red · amber · gray 만 받습니다) */
const dotTone = (state) => {
  const tone = agentStateTone(state);
  if (tone === 'red') return 'red';
  if (tone === 'blue') return 'amber';
  return tone === 'green' ? '' : 'gray';
};

export default function AgentStatusView({
  loading, summary, agents, pipeline, runs, runsMeta, selectedAgent, setSelectedAgent, restart, exportExcel, stateLabel = (v) => v,
}) {
  const s = useCommonStyles();
  const theme = useTheme();

  const selected = agents.find((a) => a.no === selectedAgent);

  /** Agent 재시작 폼 — 서버 경로 변수 agentCd 는 목록의 `no`(①…) 값입니다 */
  const openRestartForm = (preset) =>
    openFormModal({
      title: 'Agent 재시작',
      sub: '선택한 Agent 를 재시작합니다',
      initial: { agentCd: preset || agents[0]?.no },
      fields: [
        { key: 'agentCd', label: '대상 Agent', type: 'select', required: true, options: agents.map((a) => ({ value: a.no, label: `${a.no} ${a.name} · ${stateLabel(a.state)}` })) },
        { key: 'reason', label: '재시작 사유', type: 'textarea', rows: 2, full: true, placeholder: '예) 처리 지연 · 큐 적체 해소' },
      ],
      note: '재시작 중에는 해당 Agent 의 작업이 잠시 대기 큐에 쌓입니다. 재시작 이력은 감사 로그에 기록됩니다.',
      submitLabel: '재시작',
      onSubmit: async (v) => (await restart(v)).ok,
    });

  if (loading) return <Loading />;

  const master = summary?.master || {};

  return (
    <View>
      <PageHead
        title="Agent 실행 현황"
        desc="Master AI 오케스트레이션과 Worker Agent 9종의 작동 상태를 확인합니다. 30초마다 자동으로 새로고침됩니다."
        actions={
          <>
            <Button label="엑셀 다운로드" size="sm" icon="download" onPress={exportExcel} />
            <Button label="Agent 재시작" size="sm" variant="primary" icon="refresh" onPress={() => openRestartForm()} />
          </>
        }
      />

      <Grid cols={4}>
        <StatCard
          label="Master AI"
          value={stateLabel(master.state)}
          sub={master.mode ? `${master.mode} 모드${master.recentRunCnt != null ? ` · 최근 실행 ${comma(master.recentRunCnt)}건` : ''}` : '오케스트레이션 상태'}
          tone={agentStateTone(master.state) === 'red' ? 'down' : ''}
        />
        <StatCard
          label="작동 Agent"
          value={summary?.activeAgentCnt ?? 0}
          unit={`/ ${summary?.agentCnt ?? agents.length}종`}
          sub={summary?.allNormal ? '전체 정상' : '이상 감지 — 오류·중지 Agent 있음'}
          tone={summary?.allNormal ? 'up' : 'down'}
        />
        <StatCard label="처리 이벤트" value={comma(summary?.eventsPerMin ?? 0)} unit="evt/min" sub="최근 1분" />
        <StatCard label="평균 응답" value={summary?.avgResponseSec ?? '—'} unit={summary?.avgResponseSec != null ? '초' : ''} sub="자연어 질의 기준" />
      </Grid>
      <Gap />

      {/* Master AI 파이프라인 — 단계 박스를 가로로 놓고 화살표로 잇습니다. 실행 중(RUNNING) 단계는 info 색으로 강조 */}
      <Card title="Master AI 파이프라인" sub="자연어 질의가 처리되는 순서 · 실행 중인 단계는 강조 표시됩니다">
        {pipeline.length ? (
          <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: 8, flexWrap: 'wrap' }}>
            {pipeline.map((stage, i, arr) => {
              const hot = stage.highlight || stage.state === 'RUNNING';
              const bad = agentStateTone(stage.state) === 'red';
              return (
                <React.Fragment key={stage.stage ?? stage.name}>
                  <View
                    style={{
                      borderWidth: 1,
                      borderColor: bad ? theme.alpha('destructive', 0.6) : hot ? theme.alpha('info', 0.5) : theme.color.border,
                      borderRadius: theme.metrics.radius,
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      backgroundColor: bad ? theme.alpha('destructive', 0.07) : hot ? theme.alpha('info', 0.07) : theme.color.card,
                      minWidth: 148,
                      flexGrow: 1,
                      flexBasis: 148,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={s.textXs}>{stage.stage != null ? `${stage.stage}.` : ''}</Text>
                      <Text style={[s.textSm, { fontWeight: '600', fontSize: 12, flex: 1 }]} numberOfLines={1}>{stage.name}</Text>
                      <Dot tone={dotTone(stage.state)} />
                    </View>
                    <Text style={[s.textXs, { marginTop: 2 }]} numberOfLines={2}>{stage.desc || ''}</Text>
                    <Text style={[s.textXs, { marginTop: 4 }]}>{`${stateLabel(stage.state)}${stage.elapsedMs != null ? ` · ${msText(stage.elapsedMs)}` : ''}`}</Text>
                  </View>
                  {i < arr.length - 1 ? (
                    <View style={{ justifyContent: 'center' }}>
                      <Icon name="arrowRight" size={14} color={theme.color.mutedForeground} />
                    </View>
                  ) : null}
                </React.Fragment>
              );
            })}
          </View>
        ) : (
          <EmptyState text="파이프라인 단계 정보가 없습니다." />
        )}
      </Card>
      <Gap />

      <Card title={`Worker Agent ${agents.length || 9}종`} sub="행을 누르면 해당 Agent 의 실행 이력만 보여 줍니다 (다시 누르면 해제)" tight>
        <Table
          minWidth={900}
          keyExtractor={(r) => r.no}
          onRowPress={(r) => setSelectedAgent(selectedAgent === r.no ? null : r.no)}
          emptyText="등록된 Worker Agent 가 없습니다."
          columns={[
            {
              key: 'no',
              title: '#',
              width: 56,
              align: 'center',
              render: (r) => (
                <Text style={[s.td, { textAlign: 'center', fontWeight: r.no === selectedAgent ? '700' : '400', color: r.no === selectedAgent ? theme.color.primary : theme.color.foreground }]}>
                  {r.no}
                </Text>
              ),
            },
            {
              key: 'name',
              title: 'Agent',
              width: 130,
              render: (r) => <Text style={[s.td, r.no === selectedAgent && { fontWeight: '700', color: theme.color.primary }]}>{r.name}</Text>,
            },
            { key: 'desc', title: '역할', flex: 1, minWidth: 240, wrap: true, render: (r) => <Text style={s.td}>{r.desc || r.role || '—'}</Text> },
            { key: 'state', title: '상태', width: 90, render: (r) => <Badge tone={agentStateTone(r.state)}>{stateLabel(r.state)}</Badge> },
            { key: 'last', title: '최근 실행', width: 150, render: (r) => <Text style={[s.td, s.mono]}>{r.last || '—'}</Text> },
            { key: 'load', title: '처리량', width: 120, render: (r) => <Text style={s.td}>{r.load ?? '—'}</Text> },
            { key: 'elapsedMs', title: '최근 소요', width: 90, align: 'right', render: (r) => <Text style={[s.td, s.num, { textAlign: 'right' }]}>{msText(r.elapsedMs)}</Text> },
            {
              key: 'action',
              title: '관리',
              width: 90,
              render: (r) => <Button label="재시작" size="sm" onPress={() => openRestartForm(r.no)} />,
            },
          ]}
          rows={agents}
        />
      </Card>
      <Gap />

      <Card
        title="Agent 실행 이력"
        sub={selected ? `${selected.no} ${selected.name} Agent 만 보기 · ${comma(runsMeta?.total ?? runs.length)}건` : '전체 Agent — 위 표에서 Agent 를 선택하면 실행 이력을 조회합니다'}
        tight
        right={selectedAgent ? <Button label="전체 보기" size="sm" onPress={() => setSelectedAgent(null)} /> : null}
      >
        <Table
          minWidth={860}
          keyExtractor={(r, i) => `${r.runId ?? r.ts}-${i}`}
          emptyText={selectedAgent ? '이 Agent 의 실행 이력이 없습니다.' : 'Agent 행을 누르면 해당 Agent 의 실행 이력을 보여 줍니다.'}
          columns={[
            { key: 'startedAt', title: '실행 시각', width: 160, render: (r) => <Text style={[s.td, s.mono]}>{r.startedAt || r.ts || '—'}</Text> },
            // 서버 실행 이력 행에는 Agent 코드가 없어 선택한 Agent 의 번호를 보여 줍니다
            { key: 'agent', title: 'Agent', width: 74, align: 'center', render: () => <Text style={[s.td, { textAlign: 'center' }]}>{selected?.no || '—'}</Text> },
            {
              key: 'message',
              title: '내용',
              flex: 1,
              minWidth: 280,
              wrap: true,
              render: (r) => <Text style={s.td}>{r.message || r.detail || r.errorMsg || '—'}</Text>,
            },
            { key: 'throughput', title: '처리량', width: 90, align: 'right', render: (r) => <Text style={[s.td, s.num, { textAlign: 'right' }]}>{r.throughput ?? '—'}</Text> },
            { key: 'elapsedMs', title: '소요', width: 90, align: 'right', render: (r) => <Text style={[s.td, s.num, { textAlign: 'right' }]}>{msText(r.elapsedMs)}</Text> },
            {
              key: 'state',
              title: '결과',
              width: 90,
              render: (r) => <Badge tone={agentStateTone(r.state ?? r.result)}>{stateLabel(r.state ?? r.result)}</Badge>,
            },
          ]}
          rows={runs}
        />
      </Card>
    </View>
  );
}
