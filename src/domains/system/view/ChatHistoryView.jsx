/**
 * [View] SY-08 자연어 질의 이력 (경로: /system/chat-history)
 *
 * 질문·응답·판단 근거와 평가 정보를 확인할 수 있습니다.
 * 사용 API 5건 — /api/v1/ai/chat/history/*
 */
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import Grid, { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import { Badge, Button, Card, DateField, Filters, KeyValue, Loading, Pagination, SelectField, StatCard, Table } from '@shared/components/ui';
import { useAppNavigation } from '@shared/hooks/useAppNavigation';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { useCommonStyles } from '@shared/theme/styles';
import { comma, fixed } from '@shared/utils/formatUtil';
import { secText } from '../controller/useChatHistoryController';

/** 평가 배지 색 — 유용(USEFUL)만 초록, 나머지(재질의·오답)는 주황 */
const ratingTone = (rating) => (rating === 'USEFUL' || rating === '유용' ? 'green' : 'amber');

export default function ChatHistoryView({
  paging, itemsMeta,
  loading, items, summary, filters, setFrom, setTo, setGroup, reload, loadDetail, rate, exportExcel, exportTrainset, deptOptions, ratingLabel,
}) {
  const s = useCommonStyles();
  const isIntegratedAdmin = useAuthStore((state) => state.userInfo?.dept === '통합관리자');
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
    const answer = d.answer || d.response || blocks.map((b) => b.text).filter(Boolean).join('\n') || row.answer || '';
    const judgmentBasis = d.judgmentBasis || d.evidenceSummary || row.judgmentBasis ||
      hits.map((h) => [h.title || h.docId, h.page ? `p.${h.page}` : ''].filter(Boolean).join(' ')).filter(Boolean).join(' · ');
    const unansweredReason = d.unansweredReason || row.unansweredReason;
    const criteria = d.evaluationCriteria || row.evaluationCriteria || '질문에 직접 답했는지 · 판단 근거와 일치하는지 · 미응답 사유를 명확히 밝혔는지';
    const debugTrace = d.debugTrace ?? d.debugDetails ?? null;
    openModal({
      title: '질의 상세',
      sub: `${row.ts} · ${row.name || row.empNo || ''} (${row.dept || ''})`,
      render: () => (
        <View>
          <KeyValue
            keyWidth={100}
            rows={[
              ['질의', d.question || row.question || '—'],
              ['응답', answer || '응답 본문이 남아 있지 않습니다.'],
              ['판단 근거', judgmentBasis || '기록된 근거가 없습니다.'],
              ['미응답 사유', unansweredReason || '미응답 사유가 기록되지 않았습니다.'],
              ['응답 시간', elapsedSec == null ? '—' : `${Number(elapsedSec).toFixed(1)}초`],
              ['평가', rating ? ratingLabel(rating) : '미평가'],
              ['답변 평가 기준', criteria],
            ]}
          />
          {isIntegratedAdmin ? (
            <View style={{ marginTop: 14 }}>
              <Text style={[s.fieldLabel, { marginBottom: 6 }]}>디버그 기록 · 통합관리자 전용</Text>
              {debugTrace ? (
                <ScrollView style={{ maxHeight: 260 }}>
                  <Text selectable style={[s.textXs, { fontFamily: 'monospace', lineHeight: 18 }]}>
                    {typeof debugTrace === 'string' ? debugTrace : JSON.stringify(debugTrace, null, 2)}
                  </Text>
                </ScrollView>
              ) : <Text style={s.textXs}>이 질의의 디버그 기록이 없습니다.</Text>}
            </View>
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
        desc="질의와 생성 응답, 판단 근거, 미응답 사유 및 평가 이력을 확인합니다."
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
          label="답변율"
          value={fixed(summary?.answerRate)}
          unit="%"
          sub={summary?.targetAnswerRate != null ? `목표 ${fixed(summary.targetAnswerRate)}%` : undefined}
          tone={summary?.targetAnswerRate != null && summary?.answerRate != null ? (summary.answerRate >= summary.targetAnswerRate ? 'up' : 'down') : ''}
        />
        <StatCard label="평균 응답" value={fixed(summary?.avgElapsedSec)} unit="초" sub="자연어 질의 기준" />
        <StatCard label="후속 질의율" value={fixed(summary?.reAskRate)} unit="%" sub="추가 질문 비율" tone="down" />
      </Grid>
      <Gap />

      <Filters>
        <DateField label="시작일" value={filters.from} onChange={setFrom} />
        <DateField label="종료일" value={filters.to} onChange={setTo} />
        <SelectField label="사용자 그룹" value={filters.group} options={deptOptions} onChange={setGroup} />
        <Button label="조회" variant="primary" onPress={reload} />
      </Filters>

      <Card title="질의 이력" sub={`${comma(total)}건 · 행을 누르면 질문, 응답, 판단 근거 및 평가 기준을 볼 수 있습니다`} tight>
        <Table
          inset
          minWidth={2050}
          bordered
          keyExtractor={(r) => r.messageId}
          onRowPress={showDetail}
          emptyText="조회 기간에 남은 질의가 없습니다."
          columns={[
            { key: 'ts', title: '시각', width: 165, mono: true },
            { key: 'question', title: '질문', width: 330, minWidth: 330, wrap: true },
            { key: 'answer', title: '응답', width: 390, minWidth: 390, wrap: true, render: (r) => <Text style={s.td}>{r.answer || '상세 보기'}</Text> },
            { key: 'judgmentBasis', title: '판단 근거', width: 340, minWidth: 340, wrap: true, render: (r) => <Text style={s.td}>{r.judgmentBasis || r.evidenceSummary || '상세 보기'}</Text> },
            { key: 'unansweredReason', title: '미응답 사유', width: 280, minWidth: 280, wrap: true, render: (r) => <Text style={s.td}>{r.unansweredReason || '—'}</Text> },
            { key: 'responseSec', title: '응답 시간', width: 110, align: 'right', render: (r) => <Text style={[s.td, s.num, { textAlign: 'right' }]}>{secText(r.responseSec)}</Text> },
            { key: 'evaluationCriteria', title: '답변 평가 기준', width: 320, minWidth: 320, wrap: true, render: (r) => <Text style={s.td}>{r.evaluationCriteria || '질문 적합성 · 근거 일치 · 미응답 사유 명확성'}</Text> },
            { key: 'name', title: '사용자', width: 180, minWidth: 180, wrap: true, render: (r) => <Text style={s.td}>{`${r.name || r.empNo || ''} (${r.dept || ''})`}</Text> },
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
