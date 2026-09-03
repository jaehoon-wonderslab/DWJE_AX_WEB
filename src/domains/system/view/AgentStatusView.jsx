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
import { Badge, Button, Card, Icon, Loading, StateBadge, StatCard, Table, openFormModal } from '@shared/components/ui';
import { useUiStore } from '@shared/stores/useUiStore';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';

export default function AgentStatusView({
  loading, summary, agents, pipeline, runs, selectedAgent, setSelectedAgent, restart, exportExcel,
}) {
  const s = useCommonStyles();
  const theme = useTheme();
  const toast = useUiStore((state) => state.toast);

  /** Agent 재시작 폼 */
  const openRestartForm = () =>
    openFormModal({
      title: 'Agent 재시작',
      sub: '선택한 Agent 를 재시작합니다',
      initial: { agentCd: agents[0]?.no },
      fields: [
        { key: 'agentCd', label: '대상 Agent', type: 'select', required: true, options: agents.map((a) => ({ value: a.no, label: `${a.no} ${a.name}` })) },
        { key: 'reason', label: '재시작 사유', type: 'textarea', rows: 2, full: true, placeholder: '예) 처리 지연 · 큐 적체 해소' },
      ],
      note: '재시작 중에는 해당 Agent 의 작업이 잠시 대기 큐에 쌓입니다. 재시작 이력은 감사 로그에 기록됩니다.',
      submitLabel: '재시작',
      onSubmit: async (v) => {
        const res = await restart(v);
        return res.ok;
      },
    });

  if (loading) return <Loading />;

  return (
    <View>
      <PageHead
        title="Agent 실행 현황"
        desc="Master AI 오케스트레이션과 Worker Agent 9종의 작동 상태를 확인합니다. 30초마다 자동으로 새로고침됩니다."
        actions={
          <>
            <Button label="엑셀 다운로드" size="sm" icon="download" onPress={exportExcel} />
            <Button label="Agent 재시작" size="sm" variant="primary" icon="refresh" onPress={openRestartForm} />
          </>
        }
      />

      <Grid cols={4}>
        <StatCard label="Master AI" value={summary?.master?.state} sub={summary?.master?.mode} />
        <StatCard label="작동 Agent" value={summary?.agentCnt ?? 0} unit="종" sub={summary?.allNormal ? '전체 정상' : '이상 감지'} />
        <StatCard label="처리 이벤트" value={(summary?.eventsPerMin ?? 0).toLocaleString()} unit="evt/min" sub="최근 1분" />
        <StatCard label="평균 응답" value={summary?.avgResponseSec} unit="초" sub="자연어 질의 기준" />
      </Grid>
      <Gap />

      <Card title="Master AI 파이프라인" sub="자연어 질의가 처리되는 순서">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {pipeline.map((stage, i, arr) => (
            <React.Fragment key={stage.name}>
              <View
                style={{
                  borderWidth: 1,
                  borderColor: stage.highlight ? theme.alpha('info', 0.5) : theme.color.border,
                  borderRadius: theme.metrics.radius,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  backgroundColor: stage.highlight ? theme.alpha('info', 0.07) : theme.color.card,
                  minWidth: 132,
                }}
              >
                <Text style={[s.textSm, { fontWeight: '600', fontSize: 12 }]}>{stage.name}</Text>
                <Text style={s.textXs}>{stage.desc}</Text>
              </View>
              {i < arr.length - 1 ? <Icon name="arrowRight" size={14} color={theme.color.mutedForeground} /> : null}
            </React.Fragment>
          ))}
        </View>
      </Card>
      <Gap />

      <Card title="Worker Agent 9종" sub="행을 누르면 해당 Agent 의 실행 이력만 보여 줍니다" tight>
        <Table
          minWidth={900}
          keyExtractor={(r) => r.no}
          onRowPress={(r) => setSelectedAgent(selectedAgent === r.no ? null : r.no)}
          columns={[
            { key: 'no', title: '#', width: 46, align: 'center' },
            { key: 'name', title: 'Agent', width: 120 },
            { key: 'role', title: '역할', flex: 1, minWidth: 220 },
            { key: 'state', title: '상태', width: 90, render: (r) => <StateBadge state={r.state} /> },
            { key: 'last', title: '최근 실행', width: 110 },
            { key: 'load', title: '처리량', width: 140 },
            { key: 'screens', title: '관련 화면', width: 170, mono: true },
          ]}
          rows={agents}
        />
      </Card>
      <Gap />

      <Card
        title="Agent 실행 이력"
        sub={selectedAgent ? `${selectedAgent} Agent 만 보기` : '전체 Agent'}
        tight
        right={selectedAgent ? <Button label="전체 보기" size="sm" onPress={() => setSelectedAgent(null)} /> : null}
      >
        <Table
          minWidth={760}
          keyExtractor={(r, i) => `${r.ts}-${i}`}
          columns={[
            { key: 'ts', title: '실행 시각', width: 170, mono: true },
            { key: 'agentCd', title: 'Agent', width: 74, align: 'center' },
            { key: 'detail', title: '내용', flex: 1, minWidth: 280, wrap: true },
            { key: 'elapsedMs', title: '소요', width: 90, align: 'right', render: (r) => <Text style={[s.td, s.num, { textAlign: 'right' }]}>{`${(r.elapsedMs / 1000).toFixed(1)}s`}</Text> },
            { key: 'result', title: '결과', width: 84, render: (r) => <Badge tone={r.result === '성공' ? 'green' : 'red'}>{r.result}</Badge> },
          ]}
          rows={runs}
        />
      </Card>
    </View>
  );
}
