/**
 * [View] QC-03 품질 보고서 (경로: /quality/report)
 *
 * 원인 분석·이력 추적 결과를 양식에 자동 기입하고 증빙 이미지를 붙이며 영업비밀을 마스킹합니다.
 * 초록 배지는 자동 기입, 주황 배지는 AI 초안이며 담당자가 확정합니다.
 * 사용 API 13건 — /api/v1/quality/reports/*
 *
 * 본문은 서버가 준 섹션·항목(sections[].fields[]) 그대로 그립니다. MES 자동 기입 항목은 읽기 전용,
 * AI 초안·수기 항목은 문서 안에서 바로 고칩니다. 마스킹된 항목은 값 자리에 `비공개` 입니다.
 */
import React, { useEffect, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import Grid from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import {
  Badge, BlindValue, Button, Card, EmptyState, Filters, ListRow, Loading, SelectField, SourceNote,
  TextField, openFormModal,
} from '@shared/components/ui';
import { useAppNavigation } from '@shared/hooks/useAppNavigation';
import { useUiStore } from '@shared/stores/useUiStore';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { lastDataDate } from '@shared/stores/useAppStore';
import { labelOf } from '@domains/common/model/codeRepository';
import { DOC_NODE_ID, originKey, stateTone } from '../controller/useQualityReportController';

const PAGE_DESC = '원인 분석·이력 추적 결과를 양식에 자동 기입하고 증빙 이미지를 붙이며 영업비밀을 마스킹합니다. 초록 배지는 자동 기입, 주황 배지는 AI 초안이며 담당자가 확정합니다.';

/** 기입 출처 배지 — mes 초록 `자동` · ai 주황 `AI 초안` · manual 기본 `수기` */
function OriginBadge({ origin }) {
  const key = originKey(origin);
  return (
    <Badge tone={key === 'ai' ? 'amber' : key === 'mes' ? 'green' : ''}>
      {key === 'ai' ? 'AI 초안' : key === 'mes' ? '자동' : '수기'}
    </Badge>
  );
}

/** 날짜·시각 문자열의 앞부분만 (2026-08-28 09:12:33 → 2026-08-28 또는 08-28 09:12) */
const dateOf = (v) => (v ? String(v).slice(0, 10) : '');
const shortStamp = (v) => (v ? String(v).slice(5, 16) : '—');

export default function QualityReportView({
  loading, report, reportId, isConfirmed, stateLabel, forms, formOptions, policyOptions,
  autofill, autofillSummary, masking, maskingRules, history, stateLabelOf,
  sections, setFieldValue,
  filters, setFormId, setLotNo, setPolicy,
  generate, save, confirm, reject, regenerate, exportAs, submitUnmask, loadImages, attachImages, selectReport,
}) {
  const s = useCommonStyles();
  const theme = useTheme();
  const { goToScreen } = useAppNavigation();
  const toast = useUiStore((state) => state.toast);
  const openModal = useUiStore((state) => state.openModal);

  if (loading) return <Loading />;

  const head = (
    <PageHead
      title="품질 보고서"
      desc={PAGE_DESC}
      actions={
        <>
          <Button label="양식 관리" size="sm" icon="settings" onPress={() => goToScreen('report-forms')} />
          <Button label="PPT용 이미지" size="sm" icon="image" disabled={!report} onPress={() => exportAs('ppt-img')} />
          <Button label="초안 재생성" size="sm" variant="primary" icon="refresh" disabled={!report || isConfirmed} onPress={regenerate} />
        </>
      }
    />
  );

  // 조회 조건 — 양식은 서버 양식 목록, 공개 정책은 공통코드(VEC_CONFIDENTIAL). 정책 코드가 없으면 선택지를 감춥니다
  const filtersEl = (
    <Filters>
      <SelectField
        label="보고서 양식"
        value={filters.formId}
        options={formOptions}
        onChange={setFormId}
        placeholder={formOptions.length ? '선택' : '등록된 양식 없음'}
      />
      <TextField label="대상 LOT" value={filters.lotNo} onChangeText={setLotNo} placeholder="LOT 번호 (비우면 LOT 없이 생성)" />
      {policyOptions.length ? (
        <SelectField
          label="고객사 공개 정책"
          value={filters.policy}
          options={[{ value: '', label: '양식 기본 정책' }, ...policyOptions]}
          onChange={setPolicy}
        />
      ) : null}
      <Button label="생성" variant="primary" disabled={!formOptions.length} onPress={generate} />
    </Filters>
  );

  // 보고서가 한 건도 없을 수 있습니다 — 로딩에 머무르지 않고 빈 상태를 알리되, 초안 생성 조건은 그대로 둡니다
  if (!report) {
    return (
      <View>
        {head}
        {filtersEl}
        <EmptyState
          text={
            forms.length
              ? '작성된 품질 보고서가 없습니다. 위에서 양식과 대상 LOT 를 정해 「생성」을 누르거나, 불량 현황 조회에서 초안을 생성해 주세요.'
              : '등록된 보고서 양식이 없어 초안을 만들 수 없습니다. 「양식 관리」에서 양식을 먼저 등록해 주세요.'
          }
        />
      </View>
    );
  }

  const header = report.header || {};
  const images = report.images || [];
  const policyLabel = (code) => (code ? labelOf(policyOptions, code) : '—');
  const docDate = dateOf(header.occurDate) || dateOf(header.generatedAt) || lastDataDate();

  /** 머리 정보 격자 — 서버 header 객체를 라벨·값 쌍으로 */
  const headerRows = [
    ['보고서 ID', `#${reportId}${header.version != null ? ` · v${header.version}` : ''}`],
    ['양식', header.formNm || report.formName || '—'],
    ['대상 LOT', header.lotNo || '—'],
    ['발생 일자', dateOf(header.occurDate) || '—'],
    ['고객사', <BlindValue key="cust" field="customer" value={header.customer ?? '—'} textStyle={s.textXs} />],
    ['공개 정책', policyLabel(header.disclosurePolicy)],
    ['생성', header.generatedAt ? `${shortStamp(header.generatedAt)}${header.generatedBy ? ` · ${header.generatedBy}` : ''}` : '—'],
    ['상태', stateLabel || report.state || '—'],
  ];

  /** 증빙 이미지 선택 모달 */
  const openImagePicker = () =>
    openModal({
      title: '증빙 이미지 선택',
      sub: `${header.lotNo || 'LOT 미지정'} · 첨부 ${images.length}장`,
      wide: true,
      render: (close) => (
        <ImagePicker
          attached={images}
          loadImages={loadImages}
          onAttach={async (ids) => {
            const res = await attachImages(ids);
            if (res.ok) close();
          }}
        />
      ),
    });

  /** 마스킹 해제 요청 — 서버는 데이터 항목 key 목록(fields)과 사유(reason)를 받습니다 */
  const openUnmaskForm = () => {
    const maskedOptions = maskingRules
      .filter((r) => r.action && r.fieldKey)
      .map((r) => ({ value: r.fieldKey, label: `${r.field || r.fieldKey} (${r.action})` }));
    if (!maskedOptions.length) {
      toast('이 보고서에 적용된 마스킹 항목이 없습니다');
      return;
    }
    openFormModal({
      title: '마스킹 해제 요청',
      sub: '권한자 승인 후 적용되며, 요청 내역은 감사 로그에 기록됩니다',
      fields: [
        { key: 'fields', label: '해제할 항목', type: 'check', full: true, required: true, options: maskedOptions },
        { key: 'reason', label: '해제 사유', type: 'textarea', required: true, full: true, placeholder: '어떤 목적으로 원본 값이 필요한지 적어 주세요' },
      ],
      submitLabel: '요청',
      onSubmit: async (v) => {
        if (!v.fields?.length) {
          toast('해제할 항목을 선택하세요');
          return false;
        }
        if (!v.reason?.trim()) {
          toast('해제 사유를 입력하세요');
          return false;
        }
        const res = await submitUnmask(v.fields, v.reason.trim());
        return res.ok;
      },
    });
  };

  /** 반려 사유 입력 */
  const openRejectForm = () =>
    openFormModal({
      title: '보고서 반려',
      fields: [{ key: 'reason', label: '반려 사유', type: 'textarea', required: true, full: true }],
      submitLabel: '반려',
      onSubmit: async (v) => {
        if (!v.reason?.trim()) {
          toast('반려 사유를 입력하세요');
          return false;
        }
        const res = await reject(v.reason.trim());
        return res.ok;
      },
    });

  const maskingSub = masking
    ? `${policyLabel(masking.disclosurePolicy)} 정책${masking.customer ? ` · ${masking.customer}` : ''}`
    : '정책 정보 없음';

  return (
    <View>
      {head}
      {filtersEl}

      <Grid cols={[2, 1]}>
        {/* 보고서 미리보기 */}
        <Card
          title="보고서 미리보기"
          sub={isConfirmed ? '확정된 보고서 · 수정할 수 없습니다' : '실제 출력 양식 · AI 초안·수기 항목은 바로 수정됩니다'}
          right={<Badge tone={stateTone(report.state)}>{stateLabel || report.state || '—'}</Badge>}
          bodyStyle={{ backgroundColor: theme.alpha('muted', 0.4) }}
        >
          <View style={s.doc} nativeID={DOC_NODE_ID}>
            <Text style={s.docTitle}>{header.formNm || header.title || '품질 보고서'}</Text>
            <Text style={s.docSub}>{`덕우전자 제1공장 · 품질보증팀 · ${docDate}`}</Text>

            {/* 머리 정보 */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 18 }}>
              {headerRows.map(([k, v]) => (
                <View key={k} style={{ flexDirection: 'row', width: '50%', borderWidth: 1, borderColor: theme.color.border }}>
                  <View style={{ width: 92, backgroundColor: theme.color.muted, padding: 6, justifyContent: 'center' }}>
                    <Text style={[s.textXs, { fontWeight: '600', textAlign: 'center', color: theme.color.foreground }]}>{k}</Text>
                  </View>
                  <View style={{ flex: 1, padding: 6, justifyContent: 'center' }}>
                    {typeof v === 'string' ? <Text style={s.textXs}>{v}</Text> : v}
                  </View>
                </View>
              ))}
            </View>

            {sections.length ? (
              sections.map((sec) => (
                <DocSection key={sec.section} title={sec.title} who={sec.who}>
                  <DocFields fields={sec.fields} readOnly={isConfirmed} onChange={setFieldValue} />
                </DocSection>
              ))
            ) : (
              <Text style={[s.textXs, { marginBottom: 16 }]}>양식에 정의된 항목이 없어 본문이 비었습니다. 양식 관리에서 항목을 정의한 뒤 초안을 다시 생성하세요.</Text>
            )}

            <DocSection
              title="증빙 이미지"
              who="auto"
              right={isConfirmed ? null : <Button label="이미지 선택" size="sm" variant="ghost" onPress={openImagePicker} />}
            >
              {images.length ? (
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  {images.map((img) => (
                    <View
                      key={String(img.id)}
                      style={{
                        width: 108,
                        aspectRatio: 4 / 3,
                        borderWidth: 1,
                        borderColor: theme.color.border,
                        borderRadius: 5,
                        backgroundColor: theme.color.muted,
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 4,
                      }}
                    >
                      <Text style={[s.textXs, { fontSize: 10.5, textAlign: 'center' }]} numberOfLines={2}>{img.name || '—'}</Text>
                      {img.defectType ? <Text style={[s.textXs, { fontSize: 9.5, marginTop: 2 }]}>{img.defectType}</Text> : null}
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={s.textXs}>첨부된 증빙 이미지가 없습니다.</Text>
              )}
              <Text style={[s.textXs, { marginTop: 6 }]}>{`NAS 경로 참조 · ${images.length}장 첨부${header.lotNo ? ` (LOT ${header.lotNo})` : ''}`}</Text>
            </DocSection>

            {/* 결재란 */}
            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 22, paddingTop: 14, borderTopWidth: 1, borderTopColor: theme.color.border }}>
              {['작성\n품질보증팀', '검토', '승인'].map((label) => (
                <View
                  key={label}
                  style={{ borderWidth: 1, borderColor: theme.color.border, borderRadius: 4, width: 104, height: 52, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={[s.textXs, { fontSize: 10.5, textAlign: 'center' }]}>{label}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 14, flexWrap: 'wrap' }}>
            <Button label="반려" variant="danger" disabled={isConfirmed} onPress={openRejectForm} />
            <Button label="마스킹 해제 요청" onPress={openUnmaskForm} />
            <Button label="임시 저장" disabled={isConfirmed} onPress={save} />
            <Button label="검토 완료 · 확정" variant="primary" disabled={isConfirmed} onPress={confirm} />
          </View>
        </Card>

        {/* 우측 정보 */}
        <View style={{ gap: 14 }}>
          <Card
            title="자동 기입 현황"
            sub={
              autofillSummary
                ? `항목 ${autofillSummary.total ?? autofill.length}개 · MES ${autofillSummary.mes ?? 0} · AI ${autofillSummary.ai ?? 0} · 수기 ${autofillSummary.manual ?? 0}${autofillSummary.corrected ? ` · 보정 ${autofillSummary.corrected}` : ''}`
                : '항목별 생성 주체'
            }
            tight
          >
            {autofill.length ? (
              autofill.map((f, i, arr) => (
                <View
                  key={`${f.label || f.field}-${i}`}
                  style={[s.tr, { paddingVertical: 9, paddingHorizontal: 14, gap: 6 }, i === arr.length - 1 && s.trLast]}
                >
                  <Text style={[s.textSm, { flex: 1 }]} numberOfLines={1}>{f.field || f.label}</Text>
                  {f.corrected ? <Badge tone="blue">보정</Badge> : null}
                  {f.filled === false ? <Text style={[s.textXs, { color: theme.color.mutedForeground }]}>미기입</Text> : null}
                  <OriginBadge origin={f.origin} />
                </View>
              ))
            ) : (
              <EmptyState text="기입 항목이 없습니다." />
            )}
            <View style={{ padding: 14 }}>
              <SourceNote>수치·표·이력은 자동 확정, 서술 항목은 담당자 확정 후 반영됩니다.</SourceNote>
            </View>
          </Card>

          <Card title="마스킹 적용" sub={maskingSub} tight>
            {maskingRules.length ? (
              maskingRules.map((r, i, arr) => (
                <View key={r.ruleId ?? `${r.fieldKey}-${i}`} style={[s.tr, { paddingVertical: 9, paddingHorizontal: 14, gap: 6 }, i === arr.length - 1 && s.trLast]}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.textSm} numberOfLines={1}>{r.field || r.fieldKey}</Text>
                    {r.policy ? <Text style={[s.textXs, { color: theme.color.mutedForeground }]} numberOfLines={1}>{r.policy}</Text> : null}
                  </View>
                  <Badge tone={r.action ? '' : 'green'}>{r.action || '공개'}</Badge>
                </View>
              ))
            ) : (
              <EmptyState text="이 고객사 정책에 적용된 마스킹 규칙이 없습니다 — 열람 계정의 데이터 권한만 적용됩니다." />
            )}
            <View style={{ padding: 14 }}>
              <SourceNote>⑦ 보안 필터링 Agent 처리 · 감사 로그 기록됨</SourceNote>
            </View>
          </Card>

          <Card title="출력" sub="제출 형식 · 모두 다운로드 이력에 남습니다">
            <View style={{ gap: 8 }}>
              <Button label="엑셀 (.xls) 내려받기" icon="download" onPress={() => exportAs('xls')} />
              <Button label="PPT용 표·그래프 이미지" icon="image" disabled onPress={() => exportAs('ppt-img')} />
              <Button label="PDF 미리보기 (인쇄)" icon="file" onPress={() => exportAs('pdf')} />
            </View>
            <SourceNote>PPT 장표는 표·그래프 이미지를 제공하고 최종 편집은 담당자가 진행합니다. 서버 출력 형식이 준비되면 열립니다.</SourceNote>
          </Card>

          <Card title="보고서 이력" sub="누르면 그 보고서를 펼칩니다" tight>
            {history.length ? (
              history.map((h, i, arr) => (
                <ListRow
                  key={h.reportId}
                  tone={h.reportId === reportId ? 'blue' : ''}
                  title={`${h.formNm || h.title || '품질 보고서'}${h.lotNo ? ` · ${h.lotNo}` : ''}`}
                  desc={`${stateLabelOf(h.state)} · v${h.version ?? 1}`}
                  time={shortStamp(h.confirmedAt || h.generatedAt)}
                  onPress={() => selectReport(h.reportId)}
                  last={i === arr.length - 1}
                />
              ))
            ) : (
              <EmptyState text="보고서 이력이 없습니다." />
            )}
          </Card>
        </View>
      </Grid>
    </View>
  );
}

/** 보고서 문서의 한 구역 — 생성 주체 배지: 자동 기입(초록) · AI 초안(주황) · 수기 */
function DocSection({ title, who, right, children }) {
  const s = useCommonStyles();
  return (
    <View style={s.docSection}>
      <View style={s.docSectionHead}>
        <Text style={s.docSectionTitle}>{title}</Text>
        {who === 'auto' ? <Badge tone="green">자동 기입</Badge> : null}
        {who === 'ai' ? <Badge tone="amber">AI 초안 · 확정 필요</Badge> : null}
        {who === 'manual' ? <Badge>수기 입력</Badge> : null}
        {right ? <View style={{ marginLeft: 'auto' }}>{right}</View> : null}
      </View>
      {children}
    </View>
  );
}

/**
 * 문서 안의 항목 격자 — 라벨 | 값
 * MES 자동 기입 항목은 읽기 전용, AI 초안·수기 항목은 점선 입력칸으로 바로 고칩니다. 마스킹된 항목은 `비공개`.
 */
function DocFields({ fields = [], readOnly, onChange }) {
  const s = useCommonStyles();
  const theme = useTheme();
  if (!fields.length) return <Text style={s.textXs}>항목이 없습니다.</Text>;
  return (
    <View style={{ borderWidth: 1, borderColor: theme.color.border }}>
      {fields.map((f, i) => {
        const key = originKey(f.origin);
        const editable = !readOnly && !f.masked && key !== 'mes';
        return (
          <View key={f.fieldCode || `${f.field}-${i}`} style={{ flexDirection: 'row', borderTopWidth: i ? 1 : 0, borderTopColor: theme.color.border }}>
            <View style={{ width: 150, backgroundColor: theme.color.muted, padding: 6, justifyContent: 'center', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={[s.textXs, { fontWeight: '600', color: theme.color.foreground, flex: 1 }]} numberOfLines={2}>{f.field || f.fieldCode}</Text>
              {f.corrected ? <Badge tone="blue">보정</Badge> : null}
            </View>
            <View style={{ flex: 1, padding: editable ? 3 : 6, justifyContent: 'center' }}>
              {f.masked ? (
                <Text style={[s.textXs, { color: theme.color.mutedForeground }]}>비공개</Text>
              ) : editable ? (
                <TextInput
                  style={[s.editable, { borderColor: theme.color.border, borderStyle: 'dashed', backgroundColor: theme.alpha('muted', 0.35) }]}
                  multiline
                  value={f.value ?? ''}
                  placeholder={key === 'ai' ? 'AI 초안 — 담당자가 확인·수정합니다' : '수기 입력'}
                  placeholderTextColor={theme.color.mutedForeground}
                  onChangeText={(t) => onChange(f.fieldCode, t)}
                />
              ) : (
                <Text style={s.textXs}>{f.value == null || f.value === '' ? '—' : String(f.value)}</Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

/**
 * 증빙 이미지 선택 모달 본문
 * 기준(ng / lot / borderline)을 바꾸면 후보를 다시 받습니다. 이미 첨부된 이미지는 다시 첨부하지 않습니다.
 */
function ImagePicker({ attached, loadImages, onAttach }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const toast = useUiStore((state) => state.toast);
  const [criteria, setCriteria] = useState('ng');
  const [limit, setLimit] = useState('4');
  const [picked, setPicked] = useState([]);
  const [list, setList] = useState(null);
  const [note, setNote] = useState(null);
  const attachedIds = new Set(attached.map((i) => String(i.id)));

  // 기준이 바뀌면 후보 이미지를 다시 받아옵니다
  useEffect(() => {
    let alive = true;
    setList(null);
    loadImages(criteria)
      .then((res) => {
        if (!alive) return;
        setList(res?.images || []);
        setNote(res?.note || null);
      })
      .catch(() => {
        if (alive) setList([]);
      });
    return () => {
      alive = false;
    };
  }, [criteria, loadImages]);

  const toggle = (id) => setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <View>
      <Filters>
        <SelectField
          label="기준"
          value={criteria}
          options={[
            { value: 'ng', label: '불량 판정 건만 (기본)' },
            { value: 'lot', label: '해당 LOT 전체' },
            { value: 'borderline', label: '경계 판정 포함' },
          ]}
          onChange={setCriteria}
        />
        <SelectField label="첨부 매수" value={limit} options={['4', '6', '10']} onChange={setLimit} />
      </Filters>

      {list === null ? (
        <Loading />
      ) : list.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {list.map((img) => {
            const id = String(img.id);
            const already = attachedIds.has(id);
            const on = picked.includes(id);
            return (
              <TouchableOpacity
                key={id}
                onPress={() => (already ? toast('이미 첨부된 이미지입니다') : toggle(id))}
                activeOpacity={0.75}
                style={{
                  width: 120,
                  aspectRatio: 4 / 3,
                  borderWidth: 1,
                  borderColor: on ? theme.color.info : theme.color.border,
                  backgroundColor: on ? theme.alpha('info', 0.08) : theme.color.muted,
                  opacity: already ? 0.55 : 1,
                  borderRadius: 5,
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 4,
                }}
              >
                <Text style={[s.textXs, { fontSize: 10.5, textAlign: 'center' }]} numberOfLines={2}>{img.name || '—'}</Text>
                <Text style={[s.textXs, { fontSize: 9.5, marginTop: 2 }]}>{img.defectType || ''}</Text>
                {already ? <Badge tone="green">첨부됨</Badge> : null}
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <EmptyState text="이 기준에 해당하는 후보 이미지가 없습니다." />
      )}

      <SourceNote>{note ? `${note} ` : ''}이미지는 NAS 경로를 참조하며 서버로 복사하지 않습니다.</SourceNote>

      <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
        <Button
          label={`첨부 (${picked.length}장)`}
          variant="primary"
          disabled={!picked.length}
          onPress={() => {
            const max = Number(limit);
            if (attachedIds.size + picked.length > max) {
              toast(`첨부 매수(${max}장)를 초과합니다 — 이미 ${attachedIds.size}장이 첨부되어 있습니다`);
              return;
            }
            onAttach(picked);
          }}
        />
      </View>
    </View>
  );
}
