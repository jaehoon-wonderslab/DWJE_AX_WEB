/**
 * [View] RP-07 폐기 보고서 작성 위저드 (경로: /report/scrap/new)
 *
 * MES 폐기 전표를 골라 초안을 만들고, 수기 항목·금액·결재선을 채워 결재 양식으로 생성합니다.
 * 사용 API 10건 — /api/v1/reports/scrap/*
 */
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import Grid, { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import { APPROVERS, REVIEW_OWNERS } from '@shared/constants/organization';
import { Badge, Button, Card, CheckRow, DateField, Filters, Hint, KeyValue, Loading, Pagination, SelectField, SourceNote, StatCard, Steps, Table, TextAreaField, TextField, openConfirmModal, openFormModal } from '@shared/components/ui';
import { useAppNavigation } from '@shared/hooks/useAppNavigation';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { useCommonStyles } from '@shared/theme/styles';
import { comma, fixed } from '@shared/utils/formatUtil';

export default function ScrapWizardView({
  steps, step, goStep, draft, calc, cond, setCond, items, loadingVouchers,
  picked, setPicked, togglePick, reset, cancelDraft, saveForm, addRow, removeRow, savePrice,
  saveReview, requestReview, publish, voucherPaging, vouchersMeta, modelOptions, processOptions,
}) {
  const s = useCommonStyles();
  const { goToScreen } = useAppNavigation();
  const canData = useAuthStore((state) => state.canData);

  const confirmCancelDraft = () => {
    openConfirmModal({
      title: '초안 취소',
      message: '현재 작성 중인 폐기 보고서 초안과 수기 항목, 조정된 단가가 모두 삭제됩니다. 계속하시겠습니까?',
      confirmLabel: '초안 삭제',
      danger: true,
      onConfirm: async () => {
        const res = await cancelDraft();
        if (res?.ok) goToScreen('rpt-scrap');
      },
    });
  };

  // 초안은 2단계로 넘어갈 때 만듭니다. 1단계(전표 조회·선택)는 초안 없이 그립니다
  if (step > 1 && !draft) return <Loading text="초안을 준비하는 중입니다…" />;

  const price = (v) => (canData('price') ? v : '비공개');
  const qty = (v) => (canData('qty') ? v : '비공개');

  return (
    <View>
      <PageHead
        title="폐기 보고서 작성"
        desc="MES 폐기 전표를 골라 초안을 만들고, 수기 항목·금액·결재선을 채워 결재 양식으로 생성합니다."
        actions={
          <>
            <Button label="폐기 보고서 목록" size="sm" icon="arrowLeft" onPress={() => goToScreen('rpt-scrap')} />
            {draft?.draftId ? (
              <Button label="초안 취소·삭제" size="sm" variant="danger" icon="trash" onPress={confirmCancelDraft} />
            ) : null}
            <Button label="초기화" size="sm" icon="refresh" onPress={reset} />
          </>
        }
      />

      <Steps items={steps} step={step} onPick={goStep} />

      {step === 1 ? (
        <Step1
          cond={cond}
          setCond={setCond}
          items={items}
          loading={loadingVouchers}
          picked={picked}
          setPicked={setPicked}
          togglePick={togglePick}
          qty={qty}
          paging={voucherPaging}
          meta={vouchersMeta}
          modelOptions={modelOptions}
          processOptions={processOptions}
        />
      ) : null}

      {step === 2 ? <Step2 draft={draft} saveForm={saveForm} addRow={addRow} removeRow={removeRow} qty={qty} /> : null}
      {step === 3 ? <Step3 calc={calc} savePrice={savePrice} qty={qty} price={price} /> : null}
      {step === 4 ? <Step4 draft={draft} saveReview={saveReview} requestReview={requestReview} /> : null}
      {step === 5 ? (
        <Step5
          draft={draft}
          calc={calc}
          pickedCnt={picked.length}
          qty={qty}
          price={price}
          onPublish={async () => {
            const res = await publish();
            if (res.ok) goToScreen('rpt-scrap');
          }}
        />
      ) : null}

      {/* 단계 이동 */}
      <View style={s.wizFoot}>
        {step > 1 ? <Button label="이전" onPress={() => goStep(step - 1)} /> : null}
        <Text style={s.textXs}>{`${step} / ${steps.length} 단계 — ${steps[step - 1].title}`}</Text>
        <View style={s.spacer} />
        {step < steps.length ? (
          <Button label="다음" variant="primary" disabled={!picked.length} onPress={() => goStep(step + 1)} />
        ) : null}
      </View>
    </View>
  );
}

/* ───────── 1단계 : MES 폐기 대상 검색 ───────── */
function Step1({ cond, setCond, items, loading, picked, setPicked, togglePick, qty, paging, meta, modelOptions = [], processOptions = [] }) {
  const s = useCommonStyles();
  const pickedRows = items.filter((v) => picked.includes(v.voucherId));
  const pickedQty = pickedRows.reduce((a, v) => a + v.qty, 0);

  const procOpts = processOptions?.length ? processOptions : ['전체', 'Press', 'A Plating', 'B Plating', 'Coating'];
  const mdlOpts = modelOptions?.length ? modelOptions : ['전체', 'KRIOS', 'EOS-S', 'EOS-SC', 'BOI', 'MEM-B', 'MEM-S'];

  return (
    <View>
      <Filters>
        <DateField label="발생 시작일" value={cond.from} onChange={(v) => setCond({ ...cond, from: v })} />
        <DateField label="발생 종료일" value={cond.to} onChange={(v) => setCond({ ...cond, to: v })} />
        <SelectField label="공정" value={cond.process} options={procOpts} onChange={(v) => setCond({ ...cond, process: v })} />
        <SelectField label="모델" value={cond.model} options={mdlOpts} onChange={(v) => setCond({ ...cond, model: v })} />
        <SelectField label="발생 구분" value={cond.originType} options={['전체', '제조공정', '협력업체', 'IQC']} onChange={(v) => setCond({ ...cond, originType: v })} />
      </Filters>

      <Card
        title="MES 폐기 전표"
        sub={`${cond.from} ~ ${cond.to} · 조회 ${items.length}건`}
        tight
        right={
          <>
            <Button label="전체 선택" size="sm" onPress={() => setPicked(items.map((v) => v.voucherId))} />
            <Button label="선택 해제" size="sm" onPress={() => setPicked([])} />
          </>
        }
      >
        {loading ? (
          <Loading />
        ) : (
          <Table
            minWidth={1000}
            keyExtractor={(r) => r.voucherId}
            onRowPress={(r) => togglePick(r.voucherId)}
            columns={[
              {
                key: 'pick',
                title: '선택',
                width: 62,
                render: (r) => <CheckRow label="" checked={picked.includes(r.voucherId)} onToggle={() => togglePick(r.voucherId)} />,
              },
              { key: 'occurDate', title: '발생일', width: 110 },
              { key: 'lotNo', title: 'LOT', width: 130, mono: true },
              { key: 'model', title: '모델', width: 96 },
              { key: 'process', title: '공정', width: 96 },
              { key: 'defectType', title: '불량 유형', width: 130 },
              { key: 'qty', title: '수량(EA)', width: 110, align: 'right', render: (r) => <Text style={[s.td, s.num, { textAlign: 'right' }]}>{qty(comma(r.qty))}</Text> },
              { key: 'originType', title: '발생 구분', width: 96 },
              { key: 'docNo', title: 'MES 전표', flex: 1, minWidth: 140, mono: true },
            ]}
            rows={items}
          />
        )}
        <Pagination meta={meta} {...(paging?.bind || {})} />
      </Card>

      <View style={s.pickBar}>
        <Text style={s.textSm}>
          <Text style={s.textXs}>선택 전표 </Text>
          <Text style={[s.textSm, s.num, { fontWeight: '700' }]}>{pickedRows.length}</Text>
          <Text style={s.textXs}> 건</Text>
        </Text>
        <Text style={s.textSm}>
          <Text style={s.textXs}>선택 수량 </Text>
          <Text style={[s.textSm, s.num, { fontWeight: '700' }]}>{qty(comma(pickedQty))}</Text>
          <Text style={s.textXs}> EA</Text>
        </Text>
        <View style={s.spacer} />
        <Text style={s.textXs}>선택한 전표만 폐기 보고서에 포함됩니다.</Text>
      </View>
    </View>
  );
}

/* ───────── 2단계 : 수기 입력 ───────── */
function Step2({ draft, saveForm, addRow, removeRow, qty }) {
  const s = useCommonStyles();
  const toast = useUiStore((state) => state.toast);
  const [form, setForm] = useState(draft.form);

  /** 문서 기본 정보 변경 — 화면 상태와 서버 임시 저장을 함께 갱신합니다 */
  const updateForm = (next) => {
    setForm(next);
    saveForm(next);
  };

  const openAddRowForm = () =>
    openFormModal({
      title: '수기 폐기 행 추가',
      sub: 'MES 폐기 전표가 없는 폐기분을 직접 입력합니다',
      initial: { kind: 'Loss', model: '기타 모델 (MEM-B 외)', process: '전 공정' },
      fields: [
        { key: 'name', label: '항목명', required: true, full: true, placeholder: '예) 불용 재고 · 협력업체 반품분 · IQC 부적합분' },
        { key: 'kind', label: '구분', type: 'select', options: ['Loss', '공정불량', '불용 재고'] },
        { key: 'model', label: '모델', type: 'select', options: ['기타 모델 (MEM-B 외)', 'KRIOS', 'EOS-S', 'EOS-SC', 'BOI', 'MEM-B', 'MEM-S'] },
        { key: 'process', label: '공정', type: 'select', options: ['전 공정', 'Press', 'A Plating', 'B Plating', 'Coating'] },
        { key: 'qty', label: '수량 (EA)', type: 'number', required: true },
        { key: 'unitPrice', label: '단가 (원/EA)', type: 'number', placeholder: '비워 두면 3단계에서 미산정으로 처리됩니다' },
        { key: 'reason', label: '폐기 사유', type: 'textarea', rows: 2, full: true },
      ],
      note: 'MES 전표가 없는 폐기분(불용 재고 · 협력업체 반품 등)을 직접 추가합니다. 추가한 행은 3단계 금액 산정에 함께 반영됩니다.',
      submitLabel: '추가',
      onSubmit: async (v) => {
        if (!v.name?.trim() || !v.qty) {
          toast('항목명과 수량은 필수입니다');
          return false;
        }
        const res = await addRow(v);
        return res.ok;
      },
    });

  return (
    <View>
      <Card title="문서 기본 정보" sub="결재 양식 상단에 들어가는 항목입니다">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
          <TextField label="문서번호" value={form.docNo} onChangeText={(v) => updateForm({ ...form, docNo: v })} style={{ flexGrow: 1, flexBasis: 220 }} full />
          <SelectField label="보존기간" value={form.retention} options={['1 년', '3 년', '5 년', '10 년']} onChange={(v) => updateForm({ ...form, retention: v })} style={{ flexGrow: 1, flexBasis: 180 }} full />
          <TextField label="발생 공정" value={form.process} onChangeText={(v) => updateForm({ ...form, process: v })} style={{ flexGrow: 1, flexBasis: 200 }} full />
          <TextField label="업체명" value={form.vendor} onChangeText={(v) => updateForm({ ...form, vendor: v })} style={{ flexGrow: 1, flexBasis: 260 }} full />
          <TextField label="제조자" value={form.maker} onChangeText={(v) => updateForm({ ...form, maker: v })} style={{ flexGrow: 1, flexBasis: 260 }} full />
          <TextField label="작성자" value={form.writer} onChangeText={(v) => updateForm({ ...form, writer: v })} style={{ flexGrow: 1, flexBasis: 200 }} full />
          <DateField label="작성일자" value={form.writeDate} onChange={(v) => updateForm({ ...form, writeDate: v })} style={{ flexGrow: 1, flexBasis: 200 }} full />
        </View>

        <View style={{ marginTop: 14 }}>
          <Text style={[s.fieldLabel, { marginBottom: 6 }]}>발생 구분</Text>
          <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
            {[
              ['mfg', '제조공정 발생'],
              ['vendor', '협력업체 발생'],
              ['iqc', 'IQC 발생'],
            ].map(([key, label]) => (
              <CheckRow key={key} label={label} checked={!!form.origin[key]} onToggle={() => updateForm({ ...form, origin: { ...form.origin, [key]: !form.origin[key] } })} />
            ))}
          </View>
        </View>

        <TextAreaField label="불량내용" value={form.description} onChangeText={(v) => updateForm({ ...form, description: v })} rows={2} />
      </Card>
      <Gap />

      <Card
        title="수기 폐기 행"
        sub="MES 폐기 전표가 없는 폐기분 (불용 재고 · 협력업체 반품 등)"
        tight
        right={<Button label="행 추가" size="sm" variant="primary" icon="plus" onPress={openAddRowForm} />}
      >
        <Table
          minWidth={900}
          keyExtractor={(r) => r.rowId}
          emptyText="수기 폐기 행이 없습니다. MES 전표만으로 보고서를 작성합니다."
          columns={[
            { key: 'name', title: '항목명', width: 170 },
            { key: 'kind', title: '구분', width: 96, render: (r) => <Badge tone="amber">{r.kind}</Badge> },
            { key: 'model', title: '모델', width: 170 },
            { key: 'process', title: '공정', width: 96 },
            { key: 'reason', title: '폐기 사유', flex: 1, minWidth: 220, wrap: true },
            { key: 'qty', title: '수량(EA)', width: 116, align: 'right', render: (r) => <Text style={[s.td, s.num, { textAlign: 'right' }]}>{qty(comma(r.qty))}</Text> },
            { key: 'del', title: '삭제', width: 78, render: (r) => <Button label="삭제" size="sm" variant="danger" onPress={() => removeRow(r.rowId)} /> },
          ]}
          rows={draft.manualRows}
        />
      </Card>
    </View>
  );
}

/* ───────── 3단계 : 폐기 금액 산정 ───────── */
function Step3({ calc, savePrice, qty, price }) {
  const s = useCommonStyles();

  if (!calc) return <Loading text="폐기 금액을 산정하는 중입니다…" />;
  const rows = calc.rows || [];
  const sum = calc.summary || {};

  const editPrice = (row) =>
    openFormModal({
      title: row.pending ? '단가 입력' : '단가 조정',
      sub: `${row.model} · ${row.process} · ${comma(row.qty)} EA`,
      initial: { unitPrice: row.pending ? '' : String(row.unitPrice), reason: row.reason },
      fields: [
        { key: 'unitPrice', label: '적용 단가 (원/EA)', type: 'number', placeholder: '비워 두면 미산정으로 저장됩니다' },
        { key: 'reason', label: '조정 사유', type: 'textarea', rows: 2, full: true, placeholder: '예) 협력업체 정산 단가 확정 전 · 원가 기준정보 미반영 품목' },
      ],
      note:
        '금액 입력은 필수가 아닙니다. 단가를 비운 채 저장하면 미산정으로 표기되고 금액 합계에서 제외된 상태로 보고서를 진행할 수 있습니다. ' +
        '단가를 입력해 조정한 행은 사유와 함께 감사 로그에 기록됩니다.',
      submitLabel: '저장',
      onSubmit: async (v) => {
        const res = await savePrice(row.key, v.unitPrice, v.reason);
        return res.ok;
      },
    });

  return (
    <View>
      <Grid cols={4}>
        <StatCard label="총 폐기수량" field="qty" value={comma(sum.totalQty)} unit="EA" sub={`${calc.cond.from} ~ ${calc.cond.to}`} />
        <StatCard label="공정불량" field="qty" value={comma(sum.ngQty)} unit="EA" sub={`MES 전표 ${calc.voucherCnt}건 집계`} tone="down" />
        <StatCard label="Loss" field="qty" value={comma(sum.lossQty + sum.deadQty)} unit="EA" sub={`수기 입력 ${calc.manualCnt}건 포함`} />
        <StatCard
          label="총 폐기 금액"
          field="price"
          value={comma(Math.round(sum.totalAmt))}
          unit="원"
          sub={sum.pendingCnt ? `미산정 ${sum.pendingCnt}건 · ${comma(sum.pendingQty)} EA 제외` : '원가 기준정보 자동 산출'}
          tone="down"
        />
      </Grid>
      <Gap />

      <Card
        title="폐기 금액 산정 결과"
        sub="모델 · 공정 단위로 원가 기준정보 단가를 자동 적용했습니다"
        tight
        right={
          <>
            <Badge tone="red">{`폐기 ${qty(comma(sum.totalQty))} EA`}</Badge>
            <Badge tone="amber">{`금액 ${price(comma(Math.round(sum.totalAmt)))} 원`}</Badge>
            {sum.pendingCnt ? <Badge>{`미산정 ${sum.pendingCnt}`}</Badge> : null}
          </>
        }
      >
        <Table
          minWidth={1000}
          keyExtractor={(r) => r.key}
          columns={[
            { key: 'model', title: '모델', width: 180, render: (r) => (
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                <Text style={[s.td, { fontWeight: '600', paddingHorizontal: 0 }]}>{r.model}</Text>
                {r.source === '수기' ? <Badge tone="amber">수기</Badge> : null}
              </View>
            ) },
            { key: 'process', title: '공정', width: 100 },
            { key: 'qty', title: '수량(EA)', width: 120, align: 'right', render: (r) => <Text style={[s.td, s.num, { textAlign: 'right' }]}>{qty(comma(r.qty))}</Text> },
            {
              key: 'unitPrice',
              title: '적용 단가',
              width: 104,
              align: 'right',
              render: (r) => <Text style={[s.td, s.num, { textAlign: 'right' }]}>{r.pending ? '미산정' : price(fixed(r.unitPrice))}</Text>,
            },
            {
              key: 'amount',
              title: '산정 금액',
              width: 130,
              align: 'right',
              render: (r) => <Text style={[s.td, s.num, { textAlign: 'right' }]}>{r.pending ? '—' : price(comma(Math.round(r.amount)))}</Text>,
            },
            {
              key: 'source',
              title: '단가 출처',
              flex: 1,
              minWidth: 240,
              render: (r) => (
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  {r.pending ? <Badge>단가 미산정</Badge> : r.adjusted ? <Badge tone="amber">수기 조정</Badge> : r.source === '수기' ? <Badge tone="amber">수기</Badge> : <Badge tone="green">기준정보</Badge>}
                  <Text style={s.textXs}>{r.pending ? r.reason || '단가 확정 후 재산정' : r.adjusted ? r.reason : r.source === '수기' ? '' : '2026-07'}</Text>
                </View>
              ),
            },
            { key: 'edit', title: '조정', width: 96, render: (r) => <Button label={r.pending ? '단가 입력' : '단가 조정'} size="sm" onPress={() => editPrice(r)} /> },
          ]}
          rows={rows}
        />
      </Card>
      <Gap />

      <Hint>
        금액 입력은 필수가 아닙니다. 협력업체 정산 대기 등으로 단가를 확정할 수 없는 항목은 단가를 비운 채 저장하면 미산정으로 표기되고 금액 합계에서 제외된 상태로 보고서를 진행할 수 있습니다.
        단가를 입력해 조정한 행은 사유와 함께 감사 로그에 기록됩니다.
      </Hint>

      <Text style={s.sourceText}>단가는 원가 기준정보 2026-07 버전 기준이며, 수기 조정 시 사유가 감사 로그에 기록됩니다.</Text>
    </View>
  );
}

/* ───────── 4단계 : 검토 · 결재선 지정 ───────── */
function Step4({ draft, saveReview, requestReview }) {
  const s = useCommonStyles();
  const [review, setReview] = useState(draft.review);

  /** 결재선 변경 — 화면 상태와 서버 저장을 함께 갱신합니다 */
  const save = (next) => {
    setReview(next);
    saveReview(next);
  };

  const setDept = (i, key, value) => {
    const depts = review.depts.map((d, idx) => (idx === i ? { ...d, [key]: value } : d));
    save({ ...review, depts });
  };

  return (
    <View>
      <Card title="부서별 검토 요청" sub="검토를 요청할 부서와 검토자를 지정합니다">
        {review.depts.map((d, i) => (
          <View
            key={d.dept}
            style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end', paddingVertical: 10, borderBottomWidth: i < review.depts.length - 1 ? 1 : 0, borderBottomColor: s.card.borderColor }}
          >
            <SelectField label={`${d.dept} 검토자`} value={d.manager} options={REVIEW_OWNERS[d.dept] || []} onChange={(v) => setDept(i, 'manager', v)} style={{ flexGrow: 1, flexBasis: 220 }} full />
            <TextField label="검토 요청 내용" value={d.memo} onChangeText={(v) => setDept(i, 'memo', v)} style={{ flexGrow: 2, flexBasis: 320 }} full />
            <View style={{ paddingBottom: 8 }}>
              <CheckRow label="검토 요청" checked={d.on} onToggle={() => setDept(i, 'on', !d.on)} />
            </View>
          </View>
        ))}
      </Card>
      <Gap />

      <Grid cols={[2, 1]}>
        <Card title="결재선" sub="기안 → 검토 → 승인">
          <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap' }}>
            <SelectField label="기안" value={review.appr.draft} options={APPROVERS.draft} onChange={(v) => save({ ...review, appr: { ...review.appr, draft: v } })} style={{ flexGrow: 1, flexBasis: 240 }} full />
            <SelectField label="검토" value={review.appr.review} options={APPROVERS.review} onChange={(v) => save({ ...review, appr: { ...review.appr, review: v } })} style={{ flexGrow: 1, flexBasis: 240 }} full />
            <SelectField label="승인" value={review.appr.approve} options={APPROVERS.approve} onChange={(v) => save({ ...review, appr: { ...review.appr, approve: v } })} style={{ flexGrow: 1, flexBasis: 240 }} full />
          </View>
        </Card>

        <Card title="요청 설정">
          <DateField label="검토 기한" value={review.due} onChange={(v) => save({ ...review, due: v })} full />
          <View style={{ marginTop: 14 }}>
            <Text style={[s.fieldLabel, { marginBottom: 6 }]}>알림 채널</Text>
            <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
              {['메일', '시스템 팝업', 'SMS'].map((ch) => (
                <CheckRow
                  key={ch}
                  label={ch}
                  checked={review.notifyChannels.includes(ch)}
                  onToggle={() =>
                    save({
                      ...review,
                      notifyChannels: review.notifyChannels.includes(ch)
                        ? review.notifyChannels.filter((x) => x !== ch)
                        : [...review.notifyChannels, ch],
                    })
                  }
                />
              ))}
            </View>
          </View>
          <View style={{ marginTop: 16 }}>
            <Button label="검토 요청 발송" variant="primary" icon="send" onPress={requestReview} />
          </View>
          <SourceNote>검토 요청은 알림 수신자 관리(SY-05)에 등록된 연락처로 발송됩니다.</SourceNote>
        </Card>
      </Grid>
    </View>
  );
}

/* ───────── 5단계 : 미리보기 · 생성 ───────── */
function Step5({ draft, calc, pickedCnt, qty, price, onPublish }) {
  const s = useCommonStyles();
  const sum = calc?.summary || {};

  return (
    <View>
      <Grid cols={[2, 1]}>
        <Card title="결재 양식 미리보기" sub="생성 후 폐기 보고서 화면에서 열람·인쇄할 수 있습니다">
          <KeyValue
            keyWidth={110}
            rows={[
              ['문서번호', draft.form.docNo],
              ['보존기간', draft.form.retention],
              ['불량내용', draft.form.description],
              ['발생 공정', draft.form.process],
              ['업체명', draft.form.vendor],
              ['제조자', draft.form.maker],
              ['작성자', draft.form.writer],
              ['작성일자', draft.form.writeDate],
              ['MES 전표', `${pickedCnt} 건`],
              ['수기 행', `${draft.manualRows.length} 건`],
              ['총 폐기수량', `${qty(comma(sum.totalQty))} EA`],
              ['총 폐기 금액', `${price(comma(Math.round(sum.totalAmt || 0)))} 원${sum.pendingCnt ? ` (미산정 ${sum.pendingCnt}건 제외)` : ''}`],
            ]}
          />
        </Card>

        <View style={{ gap: 14 }}>
          <Card title="결재선">
            <KeyValue
              keyWidth={70}
              rows={[
                ['기안', draft.review.appr.draft],
                ['검토', draft.review.appr.review],
                ['승인', draft.review.appr.approve],
                ['기한', draft.review.due],
              ]}
            />
          </Card>

          <Card title="검토 요청 부서" tight>
            {draft.review.depts.map((d, i, arr) => (
              <View key={d.dept} style={[s.tr, { paddingVertical: 10, paddingHorizontal: 14 }, i === arr.length - 1 && s.trLast]}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.textSm, { fontWeight: '600' }]}>{d.dept}</Text>
                  <Text style={s.textXs}>{d.manager}</Text>
                </View>
                <Badge tone={d.on ? 'green' : ''}>{d.on ? '요청' : '제외'}</Badge>
              </View>
            ))}
          </Card>

          <Card title="생성">
            <Button label="폐기 보고서 생성" variant="primary" icon="save" onPress={onPublish} />
            <SourceNote>생성하면 문서번호가 확정되고, 지정한 검토 부서에 요청이 발송됩니다.</SourceNote>
          </Card>
        </View>
      </Grid>
    </View>
  );
}
