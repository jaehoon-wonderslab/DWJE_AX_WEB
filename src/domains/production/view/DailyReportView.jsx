/**
 * [View] PR-03 일일 생산현황 보고 (경로: /production/daily-report)
 *
 * 전날 08시부터 당일 08시까지의 실적을 자동 집계해 보고서 초안을 생성합니다.
 * 담당자가 항목별로 보정한 뒤 확정하며, 반려도 가능합니다.
 * 사용 API 7건 — /api/v1/production/daily-reports/*
 */
import React from 'react';
import { Text, TextInput, View } from 'react-native';
import Grid from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import { Badge, Button, Card, Hint, KeyValue, ListRow, Loading, SourceNote, StateBadge, openFormModal } from '@shared/components/ui';
import { useAppNavigation } from '@shared/hooks/useAppNavigation';
import { useUiStore } from '@shared/stores/useUiStore';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { comma, fixed } from '@shared/utils/formatUtil';

export default function DailyReportView({
  loading, draft, events, sections, dirty, setSectionBody,
  save, correct, confirm, reject, regenerate, exportExcel,
}) {
  const s = useCommonStyles();
  const theme = useTheme();
  const { goToScreen } = useAppNavigation();
  const toast = useUiStore((state) => state.toast);

  if (loading) return <Loading />;

  const sum = draft.summary || {};

  /** 반려 사유 입력 폼 */
  const openRejectForm = () =>
    openFormModal({
      title: '보고서 반려',
      sub: `${draft.targetDate} 일일 생산현황 보고서`,
      fields: [{ key: 'reason', label: '반려 사유', type: 'textarea', required: true, full: true, placeholder: '어떤 항목을 어떻게 고쳐야 하는지 적어 주세요' }],
      note: '반려하면 ⑥ 보고서 생성 Agent 가 사유를 반영해 초안을 다시 만듭니다.',
      submitLabel: '반려',
      onSubmit: (v) => {
        if (!v.reason?.trim()) {
          toast('반려 사유를 입력하세요');
          return false;
        }
        reject(v.reason);
        return true;
      },
    });

  return (
    <View>
      <PageHead
        title="일일 생산현황 보고"
        desc="전날 08시부터 당일 08시까지의 실적을 자동 집계해 보고서 초안을 생성합니다. 담당자 검토 후 확정합니다."
        actions={
          <>
            <Button label="이전 보고서" size="sm" icon="history" onPress={() => goToScreen('daily-history')} />
            <Button label="엑셀 다운로드" size="sm" icon="download" onPress={exportExcel} />
            <Button label="초안 재생성" size="sm" variant="primary" icon="refresh" onPress={regenerate} />
          </>
        }
      />

      <Hint>집계 구간은 전날 08:00 ~ 당일 08:00 으로 고정되어 있으며, 조간회의 이전에 초안이 생성됩니다.</Hint>

      <Grid cols={[2, 1]}>
        <Card
          title={`보고서 초안 · ${draft.targetDate}`}
          sub={`생성 ${draft.generatedAt} · v${draft.version} · 상태 ${draft.state}`}
          right={<StateBadge state={draft.state} />}
        >
          {sections.map((sec, si) => (
            <View key={sec.key ?? `sec-${si}`} style={s.docSection}>
              <View style={s.docSectionHead}>
                <Text style={s.docSectionTitle}>{sec.title}</Text>
                <Badge tone={sec.who === 'auto' ? 'green' : 'amber'}>{sec.who === 'auto' ? '자동 기입' : '확인 필요'}</Badge>
              </View>
              <TextInput
                style={[
                  s.editable,
                  {
                    borderColor: theme.color.border,
                    borderStyle: 'dashed',
                    backgroundColor: theme.alpha('muted', 0.35),
                  },
                ]}
                multiline
                value={sec.body}
                onChangeText={(t) => setSectionBody(sec.key, t)}
              />
            </View>
          ))}
          <SourceNote>{draft.source}</SourceNote>

          <View
            style={{
              flexDirection: 'row',
              gap: 8,
              justifyContent: 'flex-end',
              marginTop: 14,
              paddingTop: 14,
              borderTopWidth: 1,
              borderTopColor: theme.color.border,
              flexWrap: 'wrap',
            }}
          >
            {dirty ? <Text style={[s.textXs, { alignSelf: 'center', marginRight: 'auto' }]}>수정한 내용이 저장되지 않았습니다</Text> : null}
            <Button label="반려" variant="danger" onPress={openRejectForm} />
            <Button label="임시 저장" onPress={save} />
            <Button label="항목 보정 반영" onPress={correct} />
            <Button label="검토 완료 · 확정" variant="primary" onPress={confirm} />
          </View>
        </Card>

        <View style={{ gap: 14 }}>
          <Card title="집계 요약">
            <KeyValue
              keyWidth={82}
              rows={[
                ['대상 기간', sum.period],
                ['대상 라인', sum.lines],
                ['투입', `${comma(sum.inputQty)} EA`],
                ['양품', `${comma(sum.okQty)} EA`],
                ['불량', `${comma(sum.ngQty)} EA (${fixed(sum.defectRate)}%)`],
                ['가동률', `${fixed(sum.uptimeRate)}%`],
                ['이상 알림', `${sum.alertCnt}건`],
              ]}
            />
          </Card>

          <Card title="생성 이력" tight>
            {events.slice(0, 6).map((e, i, arr) => (
              <ListRow key={`${e.ts}-${i}`} title={e.type} desc={`${e.detail} · ${e.by}`} time={e.ts.slice(5, 16)} last={i === arr.length - 1} />
            ))}
          </Card>
        </View>
      </Grid>
    </View>
  );
}
