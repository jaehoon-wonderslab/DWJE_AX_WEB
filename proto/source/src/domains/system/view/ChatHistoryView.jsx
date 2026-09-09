/**
 * [View] SY-08 자연어 질의 이력 (경로: /system/chat-history)
 *
 * 의도 해석 결과와 호출된 Agent, 응답 시간을 함께 확인할 수 있습니다.
 * 사용 API 5건 — /api/v1/ai/chat/history/*
 */
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import Grid, { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import { Badge, Button, Card, DateField, Filters, KeyValue, Loading, Pagination, SelectField, SourceNote, StatCard, Table } from '@shared/components/ui';
import { useAppNavigation } from '@shared/hooks/useAppNavigation';
import { useUiStore } from '@shared/stores/useUiStore';
import { useCommonStyles } from '@shared/theme/styles';
import { comma, fixed } from '@shared/utils/formatUtil';
import { agentsText, secText } from '../controller/useChatHistoryController';

/** 평가 배지 색 — 유용(USEFUL)만 초록, 나머지(재질의·오답)는 주황 */
const ratingTone = (rating) => (rating === 'USEFUL' || rating === '유용' ? 'green' : 'amber');

export default function ChatHistoryView({
  paging, itemsMeta,
  loading, items, summary, filters, setFrom, setTo, setGroup, reload, loadDetail, rate, exportExcel, exportTrainset, deptOptions, ratingLabel,
}) {
  const s = useCommonStyles();
  const { goToScreen } = useAppNavigation();
  const toast = useUiStore((state) => state.toast);
  const openModal = useUiStore((state) => state.openModal);

  /**
   * 질의 상세 · 평가
   *
   * 상세 응답에는 시각·사용자가 없어 목록 행(row)의 값을 씁니다.
   * 응답 요약은 `blocks` 가 있으면 text/source 만, 없으면 `answer` 본문과 근거 문서(`hits`)를 보여 줍니다.
   */
  const showDetail = async (row) => {
    let d;
    try {
      d = await loadDetail(row.messageId);
    } catch (e) {
      toast(e.message || '질의 상세를 불러오지 못했습니다');
      return;
    }
    if (!d) {
      toast('질의 상세를 불러오지 못했습니다');
      return;
    }
    const elapsedSec = d.elapsedMs != null ? d.elapsedMs / 1000 : row.responseSec;
    const rating = d.rating ?? row.rating;
    const blocks = (d.blocks || []).filter((b) => b.type === 'text' || b.type === 'source');
    const hits = d.hits || [];
    openModal({
      title: '질의 상세',
      sub: `${row.ts} · ${row.name || row.empNo || ''} (${row.dept || ''})`,
      render: () => (
        <View>
          <KeyValue
            keyWidth={100}
            rows={[
              ['질의', d.question || row.question || '—'],
              ['해석된 의도', d.intentNm || d.intent || row.intentNm || '—'],
              ['호출 Agent', agentsText(d.agents ?? row.agents)],
              ['응답 시간', elapsedSec == null ? '—' : `${Number(elapsedSec).toFixed(1)}초`],
              ['평가', rating ? ratingLabel(rating) : '미평가'],
            ]}
          />
          <View style={{ marginTop: 12 }}>
            <Text style={[s.fieldLabel, { marginBottom: 6 }]}>응답 요약</Text>
            {blocks.length ? (
              blocks.map((b, i) => (
                <Text key={i} style={[s.textSm, { marginBottom: 4, lineHeight: 20 }]}>
                  {b.text}
                </Text>
              ))
            ) : d.answer ? (
              <ScrollView style={{ maxHeight: 220 }}>
                <Text style={[s.textSm, { lineHeight: 20 }]}>{d.answer}</Text>
              </ScrollView>
            ) : (
              <Text style={s.textXs}>응답 본문이 남아 있지 않습니다.</Text>
            )}
          </View>
          {hits.length ? (
            <SourceNote>
              {`근거 문서 ${hits.length}건 — ${hits
                .slice(0, 3)
                .map((h) => `${h.title || h.docId}${h.page ? ` p.${h.page}` : ''}`)
                .join(' · ')}${hits.length > 3 ? ' …' : ''}`}
            </SourceNote>
          ) : null}
        </View>
      ),
      footer: (close) => (
        <>
          <Button label="닫기" onPress={close} />
          <Button label="유용함" icon="thumbsUp" onPress={() => { rate(row.messageId, 'good'); close(); }} />
          <Button label="개선 필요" icon="thumbsDown" variant="danger" onPress={() => { rate(row.messageId, 'bad'); close(); }} />
        </>
      ),
    });
  };

  if (loading) return <Loading />;

  const total = itemsMeta?.total ?? items.length;

  return (
    <View>
      <PageHead
        title="자연어 질의 이력"
        desc="자연어 질의와 응답 이력입니다. 의도 해석 결과와 호출된 Agent, 응답 시간을 함께 확인할 수 있습니다."
        actions={
          <>
            <Button label="엑셀 다운로드" size="sm" icon="download" onPress={exportExcel} />
            <Button label="학습데이터 내보내기" size="sm" icon="upload" onPress={exportTrainset} />
            <Button label="자연어 질의 열기" size="sm" variant="primary" icon="message" onPress={() => goToScreen('ai-chat')} />
          </>
        }
      />

      <Grid cols={4}>
        <StatCard
          label="질의 건수"
          value={comma(summary?.totalCnt ?? 0)}
          unit="건"
          sub={summary?.usefulCnt != null || summary?.badCnt != null ? `유용 ${comma(summary?.usefulCnt ?? 0)} · 오답 ${comma(summary?.badCnt ?? 0)}` : '전체 기간'}
        />
        <StatCard
          label="의도 파악 정확도"
          value={fixed(summary?.intentAccuracy)}
          unit="%"
          sub={summary?.targetAccuracy != null ? `목표 ${fixed(summary.targetAccuracy)}%` : undefined}
          tone={summary?.targetAccuracy != null && summary?.intentAccuracy != null ? (summary.intentAccuracy >= summary.targetAccuracy ? 'up' : 'down') : ''}
        />
        <StatCard label="평균 응답" value={fixed(summary?.avgElapsedSec)} unit="초" sub="자연어 질의 기준" />
        <StatCard label="재질의율" value={fixed(summary?.reAskRate)} unit="%" sub="의도 오해석 추정" tone="down" />
      </Grid>
      <Gap />

      <Filters>
        <DateField label="시작일" value={filters.from} onChange={setFrom} />
        <DateField label="종료일" value={filters.to} onChange={setTo} />
        <SelectField label="사용자 그룹" value={filters.group} options={deptOptions} onChange={setGroup} />
        <Button label="조회" variant="primary" onPress={reload} />
      </Filters>

      <Card title="질의 이력" sub={`${comma(total)}건 · 행을 누르면 상세와 평가를 볼 수 있습니다`} tight>
        <Table
          minWidth={1000}
          keyExtractor={(r) => r.messageId}
          onRowPress={showDetail}
          emptyText="조회 기간에 남은 질의가 없습니다."
          columns={[
            { key: 'ts', title: '시각', width: 130, mono: true },
            { key: 'question', title: '질의', flex: 1.6, minWidth: 280, wrap: true },
            { key: 'intentNm', title: '해석된 의도', width: 140, render: (r) => <Text style={s.td}>{r.intentNm || r.intent || '—'}</Text> },
            { key: 'agents', title: '호출 Agent', width: 110, render: (r) => <Text style={s.td} numberOfLines={1}>{agentsText(r.agents)}</Text> },
            { key: 'responseSec', title: '응답 시간', width: 96, align: 'right', render: (r) => <Text style={[s.td, s.num, { textAlign: 'right' }]}>{secText(r.responseSec)}</Text> },
            { key: 'name', title: '사용자', width: 130, render: (r) => <Text style={s.td}>{`${r.name || r.empNo || ''} (${r.dept || ''})`}</Text> },
            {
              key: 'rating',
              title: '평가',
              width: 90,
              render: (r) => (r.rating ? <Badge tone={ratingTone(r.rating)}>{ratingLabel(r.rating)}</Badge> : <Text style={s.td}>—</Text>),
            },
          ]}
          rows={items}
        />
        <Pagination meta={itemsMeta} {...(paging?.bind || {})} />
      </Card>
    </View>
  );
}
