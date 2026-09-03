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
import {
  Badge, BlindValue, Button, Card, EmptyState, Hint, KeyValue, ListRow, Loading, SourceNote, openConfirmModal, openFormModal,
} from '@shared/components/ui';
import { useAppNavigation } from '@shared/hooks/useAppNavigation';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { comma, fixed } from '@shared/utils/formatUtil';
import { labelOf } from '@domains/common/model/codeRepository';
import { dailyEventTone, dailyStateTone, isAutoFilled, isDailyReportLocked } from '../model/productionRepository';

/** 값이 없으면 '—' */
const text = (v) => (v === null || v === undefined || v === '' ? '—' : String(v));

export default function DailyReportView({
  loading, targetDate, draft, codes, events, sections, dirty, setFieldValue,
  save, correct, confirm, reject, regenerate, exportExcel,
}) {
  const s = useCommonStyles();
  const theme = useTheme();
  const { goToScreen } = useAppNavigation();

  const stateLabel = labelOf(codes?.RPT_DOC_STATE, draft?.state);
  const locked = isDailyReportLocked(draft?.state);

  /** 반려 사유 입력 폼 — 사유가 없으면 제출되지 않습니다 */
  const openRejectForm = () =>
    openFormModal({
      title: '보고서 반려',
      sub: `${draft.targetDate} 일일 생산현황 보고서 · v${draft.version}`,
      fields: [{ key: 'reason', label: '반려 사유', type: 'textarea', required: true, full: true, placeholder: '어떤 항목을 어떻게 고쳐야 하는지 적어 주세요' }],
      note: '반려하면 ⑥ 보고서 생성 Agent 가 사유를 반영해 초안을 다시 만듭니다.',
      submitLabel: '반려',
      danger: true,
      onSubmit: async (v) => {
        const res = await reject(v.reason);
        return res.ok ? true : false;
      },
    });

  /** 항목 보정 — 보정 사유는 선택 사항 (correctionCnt 가 올라갑니다) */
  const openCorrectForm = () =>
    openFormModal({
      title: '항목 보정 반영',
      sub: `${draft.targetDate} · 수정한 항목을 보정 이력으로 남깁니다`,
      fields: [{ key: 'remark', label: '보정 사유', type: 'textarea', full: true, placeholder: '예) MES 누락분 반영, 수기 집계로 대체 (선택)' }],
      note: '보정 반영은 보정 건수(correctionCnt)에 기록되며 생성 이력에 남습니다.',
      submitLabel: '보정 반영',
      onSubmit: async (v) => {
        const res = await correct(v.remark?.trim() || undefined);
        return res.ok ? true : false;
      },
    });

  /** 확정 — 확정 후에는 수정할 수 없으므로 한 번 묻습니다 */
  const askConfirm = () =>
    openConfirmModal({
      title: '검토 완료 · 확정',
      sub: `${draft.targetDate} 일일 생산현황 보고서 · v${draft.version}`,
      message: dirty
        ? '저장되지 않은 수정 내용이 있습니다. 확정하면 서버에 저장된 값으로 확정되며, 확정 후에는 수정할 수 없습니다. 먼저 임시 저장 또는 항목 보정 반영을 하시겠습니까?'
        : '확정 후에는 항목을 수정할 수 없습니다. 확정하시겠습니까?',
      confirmLabel: '확정',
      onConfirm: confirm,
    });

  /** 재생성 — 편집 중인 내용이 있으면 새 초안으로 덮어쓰이는 점을 알립니다 */
  const askRegenerate = () =>
    dirty
      ? openConfirmModal({
          title: '초안 재생성',
          message: '저장되지 않은 수정 내용이 있습니다. 재생성하면 새 초안(버전 증가)으로 바뀌고 수정 내용은 사라집니다. 계속하시겠습니까?',
          confirmLabel: '재생성',
          danger: true,
          onConfirm: regenerate,
        })
      : regenerate();

  const sum = draft?.summary || {};

  return (
    <View>
      <PageHead
        title="일일 생산현황 보고"
        desc="전날 08시부터 당일 08시까지의 실적을 자동 집계해 보고서 초안을 생성합니다. 담당자 검토 후 확정합니다."
        actions={
          <>
            <Button label="이전 보고서" size="sm" icon="history" onPress={() => goToScreen('daily-history')} />
            <Button label="엑셀 다운로드" size="sm" icon="download" onPress={exportExcel} disabled={!draft} />
            <Button label="초안 재생성" size="sm" variant="primary" icon="refresh" onPress={askRegenerate} />
          </>
        }
      />

      <Hint>집계 구간은 전날 08:00 ~ 당일 08:00 으로 고정되어 있으며, 조간회의 이전에 초안이 생성됩니다.</Hint>

      {loading && !draft ? (
        <Loading />
      ) : !draft ? (
        <Card title={`보고서 초안 · ${targetDate}`}>
          <EmptyState text={`${targetDate} 의 초안이 없습니다. 「초안 재생성」으로 만들 수 있습니다.`} />
        </Card>
      ) : (
        <Grid cols={[2, 1]}>
          <Card
            title={`보고서 초안 · ${draft.targetDate}`}
            sub={`생성 ${text(draft.generatedAt)} · v${draft.version} · 상태 ${stateLabel}`}
            right={<Badge tone={dailyStateTone(draft.state)}>{stateLabel}</Badge>}
          >
            {locked ? <Hint>확정된 보고서입니다. 항목은 더 이상 수정할 수 없습니다.</Hint> : null}

            {sections.map((sec) => (
              <View key={sec.code} style={s.docSection}>
                <View style={s.docSectionHead}>
                  <Text style={s.docSectionTitle}>{sec.title}</Text>
                  <Text style={s.textXs}>{`${sec.fields.length}항목`}</Text>
                </View>
                {sec.fields.map((f) => (
                  <FieldRow key={f.seq} field={f} originLabel={labelOf(codes?.RPT_ORIGIN, f.origin)} editable={!locked} onChange={(v) => setFieldValue(f.seq, v)} />
                ))}
              </View>
            ))}

            <SourceNote>
              {`출처: MES 실적 자동 집계 · 집계 구간 ${text(draft.periodFrom)} ~ ${text(draft.periodTo)} · 생성 ${text(draft.generatedBy)}${draft.correctionCnt ? ` · 보정 ${draft.correctionCnt}건` : ''}`}
            </SourceNote>

            {!locked ? (
              <View
                style={{
                  flexDirection: 'row',
                  gap: 8,
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  marginTop: 14,
                  paddingTop: 14,
                  borderTopWidth: 1,
                  borderTopColor: theme.color.border,
                  flexWrap: 'wrap',
                }}
              >
                {dirty ? (
                  <View style={[s.rowGap6, { marginRight: 'auto' }]}>
                    <Badge tone="amber">미저장</Badge>
                    <Text style={s.textXs}>수정한 내용이 저장되지 않았습니다</Text>
                  </View>
                ) : null}
                <Button label="반려" variant="danger" onPress={openRejectForm} />
                <Button label="임시 저장" onPress={save} />
                <Button label="항목 보정 반영" onPress={openCorrectForm} disabled={!dirty} />
                <Button label="검토 완료 · 확정" variant="primary" onPress={askConfirm} />
              </View>
            ) : null}
          </Card>

          <View style={{ gap: 14 }}>
            <Card title="집계 요약" sub={`${text(draft.periodFrom)} ~ ${text(draft.periodTo)}`}>
              <KeyValue
                keyWidth={82}
                rows={[
                  ['대상 일자', text(draft.targetDate)],
                  ['투입', <BlindValue field="qty" value={`${comma(sum.inputQty)} EA`} textStyle={[s.kvVal, s.num]} />],
                  ['양품', <BlindValue field="qty" value={`${comma(sum.okQty)} EA`} textStyle={[s.kvVal, s.num]} />],
                  ['불량', <BlindValue field="qty" value={`${comma(sum.ngQty)} EA`} textStyle={[s.kvVal, s.num]} />],
                  ['불량률', <BlindValue field="yield" value={`${fixed(sum.defectRate)} %`} textStyle={[s.kvVal, s.num]} />],
                  ['수율', <BlindValue field="yield" value={`${fixed(sum.yield)} %`} textStyle={[s.kvVal, s.num]} />],
                  ['보정 건수', `${comma(draft.correctionCnt ?? 0)}건`],
                ]}
              />
            </Card>

            <Card title="생성 이력" sub="최근 6건" tight>
              {events.length ? (
                events.slice(0, 6).map((e, i, arr) => (
                  <ListRow
                    key={`${e.ts}-${i}`}
                    tone={dailyEventTone(e.type)}
                    title={labelOf(codes?.RPT_DOC_EVENT, e.type)}
                    desc={[e.detail, e.by ? `${e.by}${e.byDept ? ` (${e.byDept})` : ''}` : null].filter(Boolean).join(' · ')}
                    time={String(e.ts || '').slice(5, 16)}
                    last={i === arr.length - 1}
                  />
                ))
              ) : (
                <EmptyState text="생성 이력이 없습니다." />
              )}
            </Card>
          </View>
        </Grid>
      )}
    </View>
  );
}

/**
 * 항목 한 줄 — 항목명 · 기입 출처 배지 · 값(인라인 편집)
 *
 * 데이터 권한이 없는 항목(`masked`)은 값 대신 비공개 표시만 하고 편집도 막습니다.
 */
function FieldRow({ field, originLabel, editable, onChange }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const auto = isAutoFilled(field);
  const multiline = field.fieldCode === 'note' || String(field.value ?? '').includes('\n') || String(field.value ?? '').length > 40;

  return (
    <View style={{ marginBottom: 10 }}>
      <View style={[s.rowGap6, { marginBottom: 5, flexWrap: 'wrap' }]}>
        <Text style={[s.textSm, { fontWeight: '600' }]}>{field.field}</Text>
        <Badge tone={auto ? 'green' : 'amber'}>{auto ? '자동 기입' : '확인 필요'}</Badge>
        {originLabel && originLabel !== field.origin ? <Text style={s.textXs}>{originLabel}</Text> : null}
        {field.corrected ? <Badge tone="blue">보정됨</Badge> : null}
      </View>
      {field.masked ? (
        <BlindValue field={field.blindFieldKey} value="" />
      ) : (
        <TextInput
          style={[
            s.editable,
            {
              borderColor: theme.color.border,
              borderStyle: editable ? 'dashed' : 'solid',
              backgroundColor: editable ? theme.alpha('muted', 0.35) : theme.alpha('muted', 0.15),
              minHeight: multiline ? 64 : 38,
            },
          ]}
          multiline={multiline}
          editable={editable}
          value={field.value === null || field.value === undefined ? '' : String(field.value)}
          placeholder={field.fieldCode === 'note' ? '특이사항을 적어 두면 보고서 본문에 반영됩니다' : '—'}
          placeholderTextColor={theme.color.mutedForeground}
          onChangeText={onChange}
        />
      )}
      {field.remark ? <Text style={[s.textXs, { marginTop: 3 }]}>{`비고: ${field.remark}`}</Text> : null}
    </View>
  );
}
