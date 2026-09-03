/**
 * [View] QC-03 품질 보고서 (경로: /quality/report)
 *
 * 원인 분석·이력 추적 결과를 양식에 자동 기입하고 증빙 이미지를 붙이며 영업비밀을 마스킹합니다.
 * 초록 배지는 자동 기입, 주황 배지는 AI 초안이며 담당자가 확정합니다.
 * 사용 API 13건 — /api/v1/quality/reports/*
 */
import React, { useEffect, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import Grid from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import {
  Badge, Button, Card, EmptyState, Filters, ListRow, Loading, SelectField, SourceNote, StateBadge,
  TextField, openFormModal,
} from '@shared/components/ui';
import { useAppNavigation } from '@shared/hooks/useAppNavigation';
import { useUiStore } from '@shared/stores/useUiStore';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { lastDataDate } from '@shared/stores/useAppStore';

export default function QualityReportView({
  loading, report, forms, autofill, maskingRules, history, sections, setSectionBody,
  filters, setFormName, setLotNo, setPolicy,
  generate, save, confirm, reject, regenerate, exportAs, submitUnmask, loadImages, attachImages,
}) {
  const s = useCommonStyles();
  const theme = useTheme();
  const { goToScreen } = useAppNavigation();
  const toast = useUiStore((state) => state.toast);
  const openModal = useUiStore((state) => state.openModal);

  if (loading) return <Loading />;
  // 로컬처럼 보고서가 한 건도 없을 수 있습니다 — 로딩에 머무르지 않고 빈 상태로 알려 줍니다
  if (!report) {
    return (
      <View>
        <PageHead title="품질 보고서" desc="원인 분석·이력 추적 결과를 양식에 자동 기입하고 증빙 이미지를 붙이며 영업비밀을 마스킹합니다." />
        <EmptyState text="작성된 품질 보고서가 없습니다. 불량 현황 조회에서 초안을 생성해 주세요." />
      </View>
    );
  }

  const attached = (report.images || []).filter((i) => i.attached);

  /** 증빙 이미지 선택 모달 */
  const openImagePicker = () =>
    openModal({
      title: '증빙 이미지 선택',
      sub: `${report.lotNo} · 불량 판정 ${report.images.length}건`,
      wide: true,
      render: (close) => (
        <ImagePicker
          images={report.images}
          loadImages={loadImages}
          onAttach={async (ids) => {
            const res = await attachImages(ids);
            if (res.ok) close();
          }}
        />
      ),
    });

  /** 마스킹 해제 요청 */
  const openUnmaskForm = () =>
    openFormModal({
      title: '마스킹 해제 요청',
      sub: '권한자 승인 후 적용되며, 요청 내역은 감사 로그에 기록됩니다',
      fields: [
        { key: 'fields', label: '해제할 항목', type: 'check', full: true, options: maskingRules.filter((r) => r.action === '마스킹').map((r) => r.field) },
        { key: 'reason', label: '해제 사유', type: 'textarea', required: true, full: true, placeholder: '어떤 목적으로 원본 값이 필요한지 적어 주세요' },
      ],
      submitLabel: '요청',
      onSubmit: async (v) => {
        if (!v.reason?.trim()) {
          toast('해제 사유를 입력하세요');
          return false;
        }
        const res = await submitUnmask(v.fields, v.reason);
        return res.ok;
      },
    });

  /** 반려 사유 입력 */
  const openRejectForm = () =>
    openFormModal({
      title: '보고서 반려',
      fields: [{ key: 'reason', label: '반려 사유', type: 'textarea', required: true, full: true }],
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
        title="품질 보고서"
        desc="원인 분석·이력 추적 결과를 양식에 자동 기입하고 증빙 이미지를 붙이며 영업비밀을 마스킹합니다. 초록 배지는 자동 기입, 주황 배지는 AI 초안이며 담당자가 확정합니다."
        actions={
          <>
            <Button label="양식 관리" size="sm" icon="settings" onPress={() => goToScreen('report-forms')} />
            <Button label="PPT용 이미지" size="sm" icon="image" onPress={() => exportAs('ppt-img')} />
            <Button label="초안 재생성" size="sm" variant="primary" icon="refresh" onPress={regenerate} />
          </>
        }
      />

      <Filters>
        <SelectField label="보고서 양식" value={filters.formName} options={forms.map((f) => f.name)} onChange={setFormName} />
        <TextField label="대상 LOT" value={filters.lotNo} onChangeText={setLotNo} />
        <SelectField label="고객사 공개 정책" value={filters.policy} options={['글로벌 고객사 A', '국내 대기업 B', '내부용']} onChange={setPolicy} />
        <Button label="생성" variant="primary" onPress={generate} />
      </Filters>

      <Grid cols={[2, 1]}>
        {/* 보고서 미리보기 */}
        <Card
          title="보고서 미리보기"
          sub="실제 출력 양식 · 서술 항목은 바로 수정됩니다"
          right={<StateBadge state={report.state} />}
          bodyStyle={{ backgroundColor: theme.alpha('muted', 0.4) }}
        >
          <View style={s.doc} nativeID="qc-report-doc">
            <Text style={s.docTitle}>{report.formName}</Text>
            <Text style={s.docSub}>덕우전자 제1공장 · 품질보증팀 · {report.baseDate || report.targetDate || lastDataDate()}</Text>

            {/* 머리 정보 */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 18 }}>
              {report.header.map(([k, v]) => (
                <View key={k} style={{ flexDirection: 'row', width: '50%', borderWidth: 1, borderColor: theme.color.border }}>
                  <View style={{ width: 92, backgroundColor: theme.color.muted, padding: 6, justifyContent: 'center' }}>
                    <Text style={[s.textXs, { fontWeight: '600', textAlign: 'center', color: theme.color.foreground }]}>{k}</Text>
                  </View>
                  <View style={{ flex: 1, padding: 6, justifyContent: 'center' }}>
                    <Text style={s.textXs}>{v}</Text>
                  </View>
                </View>
              ))}
            </View>

            <DocSection title="1. 불량 발생 현황" who="auto">
              <DocTable head={report.resultTable.head} rows={report.resultTable.rows} />
            </DocSection>

            <DocSection title="2. 공정 조건" who="auto">
              <DocTable head={report.processCondition.head} rows={report.processCondition.rows} />
              <Text style={[s.textXs, { marginTop: 6 }]}>{report.processCondition.note}</Text>
            </DocSection>

            {sections.map((sec) => (
              <DocSection key={sec.key} title={sec.title} who={sec.who}>
                <TextInput
                  style={[s.editable, { borderColor: theme.color.border, borderStyle: 'dashed', backgroundColor: theme.alpha('muted', 0.35) }]}
                  multiline
                  value={sec.body}
                  onChangeText={(t) => setSectionBody(sec.key, t)}
                />
              </DocSection>
            ))}

            <DocSection
              title="5. 증빙 이미지"
              who="auto"
              right={<Button label="이미지 선택" size="sm" variant="ghost" onPress={openImagePicker} />}
            >
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {attached.map((img) => (
                  <View
                    key={img.id}
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
                    <Text style={[s.textXs, { fontSize: 10.5, textAlign: 'center' }]}>{`AOI-03\n${img.name}`}</Text>
                  </View>
                ))}
              </View>
              <Text style={[s.textXs, { marginTop: 6 }]}>
                {`NAS 경로 참조 · ${attached.length}장 첨부 (해당 LOT 불량 판정 ${report.images.length}건 중 선택)`}
              </Text>
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
            <Button label="반려" variant="danger" onPress={openRejectForm} />
            <Button label="마스킹 해제 요청" onPress={openUnmaskForm} />
            <Button label="임시 저장" onPress={save} />
            <Button label="검토 완료 · 확정" variant="primary" onPress={confirm} />
          </View>
        </Card>

        {/* 우측 정보 */}
        <View style={{ gap: 14 }}>
          <Card title="자동 기입 현황" sub="항목별 생성 주체" tight>
            {autofill.map((f, i, arr) => (
              <View
                key={f.field}
                style={[s.tr, { paddingVertical: 9, paddingHorizontal: 14 }, i === arr.length - 1 && s.trLast]}
              >
                <Text style={[s.textSm, { flex: 1 }]}>{f.field}</Text>
                <Badge tone={f.origin === 'ai' ? 'amber' : f.origin === 'manual' ? '' : 'green'}>
                  {f.origin === 'ai' ? 'AI 초안' : f.origin === 'manual' ? '수기' : '자동'}
                </Badge>
              </View>
            ))}
            <View style={{ padding: 14 }}>
              <SourceNote>수치·표·이력은 자동 확정, 서술 항목은 담당자 확정 후 반영됩니다.</SourceNote>
            </View>
          </Card>

          <Card title="마스킹 적용" sub={`${filters.policy} 정책`} tight>
            {maskingRules.map((r, i, arr) => (
              <View key={r.field} style={[s.tr, { paddingVertical: 9, paddingHorizontal: 14 }, i === arr.length - 1 && s.trLast]}>
                <Text style={[s.textSm, { flex: 1 }]}>{r.field}</Text>
                <Badge tone={r.action === '공개' ? 'green' : ''}>{r.action}</Badge>
              </View>
            ))}
            <View style={{ padding: 14 }}>
              <SourceNote>⑦ 보안 필터링 Agent 처리 · 감사 로그 기록됨</SourceNote>
            </View>
          </Card>

          <Card title="출력" sub="제출 형식">
            <View style={{ gap: 8 }}>
              <Button label="엑셀 (.xls) 내려받기" onPress={() => exportAs('xls')} />
              <Button label="PPT용 표·그래프 이미지" onPress={() => exportAs('ppt-img')} />
              <Button label="PDF 미리보기" onPress={() => exportAs('pdf')} />
            </View>
            <SourceNote>PPT 장표는 표·그래프 이미지를 제공하고 최종 편집은 담당자가 진행합니다.</SourceNote>
          </Card>

          <Card title="보고서 이력" tight>
            {history.map((h, i, arr) => (
              <ListRow key={h.reportId} title={`${h.formName}${h.lotNo !== '—' ? ` · ${h.lotNo}` : ''}`} desc={`${h.state} · v${h.version}`} time={h.updatedAt.slice(5, 16)} last={i === arr.length - 1} />
            ))}
          </Card>
        </View>
      </Grid>
    </View>
  );
}

/** 보고서 문서의 한 구역 */
function DocSection({ title, who, right, children }) {
  const s = useCommonStyles();
  return (
    <View style={s.docSection}>
      <View style={s.docSectionHead}>
        <Text style={s.docSectionTitle}>{title}</Text>
        {who ? <Badge tone={who === 'auto' ? 'green' : 'amber'}>{who === 'auto' ? '자동 기입' : 'AI 초안 · 확정 필요'}</Badge> : null}
        {right ? <View style={{ marginLeft: 'auto' }}>{right}</View> : null}
      </View>
      {children}
    </View>
  );
}

/** 보고서 문서 안의 격자 표 */
function DocTable({ head, rows }) {
  const s = useCommonStyles();
  const theme = useTheme();
  return (
    <View style={{ borderWidth: 1, borderColor: theme.color.border }}>
      <View style={{ flexDirection: 'row', backgroundColor: theme.color.muted }}>
        {head.map((h) => (
          <View key={h} style={{ flex: 1, padding: 6, borderRightWidth: 1, borderRightColor: theme.color.border }}>
            <Text style={[s.textXs, { fontWeight: '600', color: theme.color.foreground }]}>{h}</Text>
          </View>
        ))}
      </View>
      {rows.map((r, ri) => (
        <View key={ri} style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: theme.color.border }}>
          {r.map((c, ci) => (
            <View key={ci} style={{ flex: 1, padding: 6, borderRightWidth: 1, borderRightColor: theme.color.border }}>
              <Text style={[s.textXs, ci > 0 && s.num]}>{c}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

/** 증빙 이미지 선택 모달 본문 */
function ImagePicker({ images, loadImages, onAttach }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const toast = useUiStore((state) => state.toast);
  const [criteria, setCriteria] = useState('ng');
  const [limit, setLimit] = useState('4');
  const [picked, setPicked] = useState(images.filter((i) => i.attached).map((i) => i.id));
  const [list, setList] = useState(images);

  // 기준이 바뀌면 후보 이미지를 다시 받아옵니다
  useEffect(() => {
    let alive = true;
    loadImages(criteria, 10)
      .then((res) => {
        if (alive) setList(res?.images || images);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [criteria, loadImages, images]);

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

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {list.map((img) => {
          const on = picked.includes(img.id);
          return (
            <TouchableOpacity
              key={img.id}
              onPress={() => toggle(img.id)}
              activeOpacity={0.75}
              style={{
                width: 120,
                aspectRatio: 4 / 3,
                borderWidth: 1,
                borderColor: on ? theme.color.info : theme.color.border,
                backgroundColor: on ? theme.alpha('info', 0.08) : theme.color.muted,
                borderRadius: 5,
                alignItems: 'center',
                justifyContent: 'center',
                padding: 4,
              }}
            >
              <Text style={[s.textXs, { fontSize: 10.5, textAlign: 'center' }]}>{img.name}</Text>
              <Text style={[s.textXs, { fontSize: 9.5, marginTop: 2 }]}>{img.defectType}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <SourceNote>이미지는 NAS 경로를 참조하며 서버로 복사하지 않습니다.</SourceNote>

      <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
        <Button
          label={`첨부 (${picked.length}장)`}
          variant="primary"
          onPress={() => {
            const max = Number(limit);
            if (picked.length > max) {
              toast(`첨부 매수(${max}장)를 초과했습니다`);
              return;
            }
            onAttach(picked);
          }}
        />
      </View>
    </View>
  );
}
