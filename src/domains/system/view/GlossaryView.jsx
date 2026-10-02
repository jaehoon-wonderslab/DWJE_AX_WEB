/**
 * [View] SY-06 용어 사전 관리 (경로: /system/glossary · 화면 ID sys-gloss)
 *
 * [권한] 공식 용어는 통합관리자만 편집합니다(버튼도 통합관리자에게만 보입니다 — 07 4.3).
 *        유사어는 이 화면의 쓰기 권한이 있으면 등록하고, 본인이 등록한 것만 수정·삭제합니다(07 GLS-16).
 *        쓰기 권한이 없으면 유사어 버튼을 숨기지 않고 비활성으로 두고 이유를 옆에 알립니다(공통 R-06).
 * 엑셀은 조회 권한으로 받습니다(공통 R-10) — 쓰기 권한과 무관합니다.
 * 사용 API — /api/v1/glossary/* (요약·분류·목록·정규화·점검 필요 유사어·내려받기·용어/유사어 쓰기)
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Grid, { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import {
  Button, Card, CheckRow, ExportMenuButton, Filters, FormAlert, HelpTip, Hint, Icon, KeyValue, Loading, Pagination, SelectField, SourceNote,
  StatCard, Table, TabulatorGrid, TextField, openConfirmModal, openFormModal,
} from '@shared/components/ui';
import { useUiStore } from '@shared/stores/useUiStore';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { BLIND_MESSAGE, NO_WRITE_MESSAGE } from '../controller/useGlossaryController';

export default function GlossaryView({
  paging, itemsMeta, initialLoading, refreshing, loadErrors, summary, summaryFailed, terms, gridRef,
  canEditTerm, canWriteVariant, risks, riskCount, domains, filters, setKeyword, search, setDomain, setMineOnly,
  sample, setSample, normalized, normalize, exportView, exportAll, exportViewCount,
  submitTerm, submitVariant, removeVariant, removeTerm, loadChanges, searchTerms, byDomain,
}) {
  const s = useCommonStyles();
  const theme = useTheme();
  const openModal = useUiStore((state) => state.openModal);
  const toast = useUiStore((state) => state.toast);
  // 「변경이 AI 에 반영되는 시점」 카드 펼침 — 화면 안 표시 상태라 view 가 들고 있습니다(07 GLS-06)
  const [timingOpen, setTimingOpen] = useState(false);
  // 「분류별 현황」 카드 펼침 (07 GLS-13)
  const [domainOpen, setDomainOpen] = useState(false);
  // 표 안의 칩·버튼은 HTML 로 그리고(Tabulator formatter), 클릭은 cellClick 에서 data-* 로 가려냅니다.
  // 열 정의는 권한이 바뀔 때만 다시 만들고 최신 핸들러·점검 목록은 ref 로 읽습니다 — 훅이라 조기 return 보다 위에 둡니다.
  const handlers = useRef({});
  const riskRef = useRef(new Map());
  riskRef.current = new Map((risks || []).map((r) => [String(r.variantId), r]));
  const columns = useMemo(() => [
    // 고객사 데이터 권한이 없어 가린 용어(blinded, 결정 R-18)는 「비공개 용어」 회색으로 그립니다
    { title: '공식 용어', field: 'term', minWidth: 110, widthGrow: 1, formatter: (c) => (c.getRow().getData().blinded ? `<span class="muted" title="${esc(BLIND_MESSAGE)}">비공개 용어</span>` : `<span class="strong">${esc(c.getValue())}</span>`) },
    { title: '뜻', field: 'definition', minWidth: 170, widthGrow: 3, formatter: (c) => (c.getRow().getData().blinded ? '<span class="muted">비공개</span>' : esc(c.getValue() || '—')) },
    { title: '분류', field: 'domain', minWidth: 84, formatter: (c) => (c.getValue() ? `<span class="tag">${esc(c.getValue())}</span>` : '<span class="muted">—</span>') },
    {
      title: '유사어 (등록자)',
      field: 'variants',
      minWidth: 200,
      widthGrow: 4,
      headerSort: false,
      headerFilter: false,
      formatter: (c) => {
        const list = c.getValue() || [];
        if (c.getRow().getData().blinded) return '<span class="muted">비공개</span>';
        if (!list.length) return '<span class="muted">등록된 유사어 없음</span>';
        return `<span class="chips">${list
          .map((v) => {
            // 점검 필요 유사어 — 통합관리자에게만 「!」 와 사유(07 GLS-03)
            const risk = canEditTerm ? riskRef.current.get(String(v.variantId)) : null;
            const tip = [risk ? `점검 필요: ${risk.riskNm || risk.riskCd}` : '', v.editable ? '누르면 수정' : v.byName || ''].filter(Boolean).join(' · ');
            return `<span class="tag ${v.mine ? 'tag-blue chip-mine' : ''}" data-variant="${esc(v.variantId)}" title="${esc(tip)}">${risk ? '<b class="chip-risk">!</b> ' : ''}${esc(v.word)} <small class="muted">${v.mine ? '내 등록' : esc(v.byName || '')}</small>${v.editable ? `<b class="chip-x" data-del="${esc(v.variantId)}" title="삭제">×</b>` : ''}</span>`;
          })
          .join('')}</span>`;
      },
      cellClick: (e, c) => {
        const row = c.getRow().getData();
        if (row.blinded) return;
        const del = e.target.closest('[data-del]');
        if (del) {
          const v = (row.variants || []).find((x) => String(x.variantId) === del.dataset.del);
          if (v?.editable) handlers.current.confirmDeleteVariant(v);
          return;
        }
        const chip = e.target.closest('[data-variant]');
        if (chip) {
          const v = (row.variants || []).find((x) => String(x.variantId) === chip.dataset.variant);
          if (v?.editable) handlers.current.openVariantForm(row, v);
        }
      },
    },
    {
      title: '관리',
      field: 'termId',
      // 07 4.3 — 통합관리자 260(유사어 추가·이력·편집·삭제) / 그 밖 170(유사어 추가·이력)
      width: canEditTerm ? 260 : 170,
      minWidth: canEditTerm ? 260 : 170,
      headerSort: false,
      headerFilter: false,
      formatter: (c) => {
        // 쓰기 권한이 없거나 가린 용어(R-18)면 숨기지 않고 비활성 + 이유(공통 R-06)
        const blinded = !!c.getRow().getData().blinded;
        const btn = (act, label, ok, why, extra = '') => (ok
          ? `<button class="tbtn${extra}" data-act="${act}">${label}</button>`
          : `<button class="tbtn${extra}" data-act="${act}" disabled title="${esc(why)}" aria-label="${label} — ${esc(why)}">${label}</button>`);
        const add = btn('add', '유사어 추가', canWriteVariant && !blinded, blinded ? BLIND_MESSAGE : NO_WRITE_MESSAGE);
        const admin = canEditTerm
          ? ` ${btn('edit', '편집', !blinded, BLIND_MESSAGE)} ${btn('del', '삭제', !blinded, BLIND_MESSAGE, ' tbtn-ghost')}`
          : '';
        return `${add} <button class="tbtn" data-act="hist">이력</button>${admin}`;
      },
      cellClick: (e, c) => {
        const btn = e.target.closest('[data-act]');
        if (!btn || btn.disabled) return;
        const act = btn.dataset.act;
        const row = c.getRow().getData();
        if (row.blinded && act !== 'hist') return;
        if (act === 'add' && canWriteVariant) handlers.current.openVariantForm(row, null);
        else if (act === 'hist') handlers.current.openChanges(row);
        else if (act === 'edit' && canEditTerm) handlers.current.openTermForm(row);
        else if (act === 'del' && canEditTerm) handlers.current.confirmDeleteTerm(row);
      },
    },
  ], [canEditTerm, canWriteVariant]);

  /* ───────── 공식 용어 ───────── */
  const openTermForm = (row) =>
    openFormModal({
      title: row ? '공식 용어 편집' : '공식 용어 등록',
      sub: '보고서·리포트 표기 기준이 되는 용어입니다 (통합관리자 전용)',
      // 분류 키는 서버 요청 본문과 같은 domainCd 입니다 (GET /glossary/domains 의 code)
      initial: row ? { term: row.term, definition: row.definition, domainCd: row.domain } : { domainCd: domains[0] },
      // 입력 길이 — 공식 용어 50자 · 뜻 500자, 남은 글자를 보입니다(07 GLS-10)
      fields: [
        { key: 'term', label: '공식 용어', type: 'custom', render: (p) => <CountedField {...p} label="공식 용어 *" max={50} placeholder="예) Stiffener" /> },
        { key: 'domainCd', label: '분류', type: 'select', options: domains, required: true },
        { key: 'definition', label: '뜻', type: 'custom', full: true, render: (p) => <CountedField {...p} label="뜻 *" max={500} multiline placeholder="예) 스티프너 / FPCB 보강판 (Stiffener)" /> },
      ],
      note: '공식 용어는 보고서 표기와 AI 응답의 기준입니다. 현장 표현은 유사어로 등록하세요.',
      submitLabel: row ? '수정' : '등록',
      onSubmit: async (v) => {
        if (!String(v.term || '').trim() || !String(v.definition || '').trim()) {
          toast('공식 용어와 뜻을 입력해 주세요.');
          return false;
        }
        return (await submitTerm(row?.termId, v)).ok;
      },
    });

  /* ───────── 유사어 ───────── */
  const openVariantForm = (term, variant) =>
    openFormModal({
      title: variant ? '유사어 수정' : '유사어 등록',
      sub: '현장에서 실제로 쓰는 표현을 등록합니다 (본인이 등록한 것만 수정·삭제 가능)',
      initial: { termId: term?.termId || '', word: variant?.word || '' },
      fields: [
        // 행에서 연 등록·수정은 공식 용어를 고정합니다(수정은 서버가 word 만 받음 — 옮기려면 지우고 다시 등록).
        // 머리 「유사어 등록」 은 검색형 선택으로 2쪽 이후 용어도 고를 수 있습니다(07 GLS-11)
        term
          ? { key: 'termLabel', label: '공식 용어', type: 'static', value: variant ? `${term.term} — 바꾸려면 삭제 후 다시 등록하세요` : `${term.term} — ${term.definition || ''}`, full: true }
          : { key: 'termId', label: '공식 용어', type: 'custom', full: true, render: (p) => <TermPicker {...p} search={searchTerms} /> },
        { key: 'word', label: '유사어', type: 'custom', render: (p) => <CountedField {...p} label="유사어 *" max={50} placeholder="예) 보강판 · 스티프너 · 찍힘" /> },
      ],
      note: '2자 이상으로 적습니다. 숫자·날짜 표현과 다른 공식 용어와 같은 낱말은 등록할 수 없습니다. 등록한 유사어는 다음 AI 질의부터 공식 용어로 정규화됩니다.',
      submitLabel: variant ? '수정' : '등록',
      onSubmit: async (v) => {
        const termId = term?.termId ?? v.termId;
        if (!termId) {
          toast('공식 용어를 검색해서 고르세요.');
          return false;
        }
        if (!String(v.word || '').trim()) {
          toast('유사어를 입력해 주세요.');
          return false;
        }
        return (await submitVariant(variant?.variantId, { word: v.word, termId })).ok;
      },
    });

  const confirmDeleteTerm = (term) => {
    // 남의 유사어가 달린 용어를 몇 건이 함께 빠지는지 모르고 지우는 일을 막습니다
    const cnt = term.variants?.length || 0;
    return openConfirmModal({
      title: '공식 용어 삭제',
      message: cnt
        ? `'${term.term}' 을(를) 삭제합니다. 등록된 유사어 ${cnt}개도 함께 정규화 사전에서 빠집니다.`
        : `'${term.term}' 을(를) 삭제합니다.`,
      confirmLabel: '삭제',
      danger: true,
      onConfirm: () => removeTerm(term.termId),
    });
  };

  const confirmDeleteVariant = (variant) =>
    openConfirmModal({
      title: '유사어 삭제',
      message: `'${variant.word}' 유사어를 삭제합니다.`,
      confirmLabel: '삭제',
      danger: true,
      onConfirm: () => removeVariant(variant.variantId),
    });

  /* ───────── 변경 이력 (07 GLS-07) — 행의 「이력」 은 그 용어, 머리 「변경 이력」 은 최근 30일 ───────── */
  const openChanges = (row) =>
    openModal({
      title: row ? `변경 이력 — ${row.term}` : '변경 이력 (최근 30일)',
      sub: '용어·유사어의 등록·수정·삭제·되살림 기록입니다',
      wide: true,
      render: () => <ChangeList load={() => loadChanges({ termId: row?.termId })} />,
    });

  /* ───────── 점검 필요 유사어 (통합관리자 · 07 GLS-03) ───────── */
  const openRiskList = () =>
    openModal({
      title: '점검 필요 유사어',
      sub: '날짜·숫자·한 글자·공식 용어와 같은 낱말은 정규화에서 치환하지 않습니다. 지울지는 건별로 판단하세요.',
      render: () => <RiskList risks={risks} removeVariant={removeVariant} />,
    });

  if (initialLoading) return <Loading />;

  // 최신 핸들러를 표 클릭에서 읽을 수 있게 매 렌더마다 갱신 (훅 아님)
  handlers.current = { openVariantForm, openTermForm, confirmDeleteTerm, confirmDeleteVariant, openChanges };
  const dash = (v) => (summaryFailed || v === null || v === undefined ? '—' : v);
  const lastChanged = summary?.lastChangedAt
    ? `최근 변경 ${String(summary.lastChangedAt).slice(0, 16)}${summary.lastChangedBy ? ` · ${summary.lastChangedBy}` : ''}`
    : '보고서 표기 기준';
  return (
    <View>
      <PageHead
        title="용어 사전 관리"
        desc="보고서·리포트에 적용되는 공식 용어와, 현장에서 실제로 쓰는 유사어를 함께 관리합니다. 부서마다 다르게 부르는 말·약칭·한글 표기를 등록해 두면 자연어 질의를 처리할 때 공식 용어로 정규화됩니다."
        actions={
          <>
            <Button label="변경 이력" size="sm" icon="clock" onPress={() => openChanges(null)} />
            <ExportMenuButton
              viewCount={exportViewCount}
              totalCount={summary?.termCnt}
              onExportView={exportView}
              onExportAll={exportAll}
            />
            {/* 제거됨(2026-10, 처리기 없음 — 07 GLS-05): 「용어 임베딩 재생성」 버튼. 컨트롤러 reindex 와 API 는 남겨 둡니다
            <Button label="용어 임베딩 재생성" size="sm" icon="refresh" onPress={reindex} /> */}
            {canEditTerm ? <Button label="공식 용어 등록" size="sm" icon="plus" onPress={() => openTermForm(null)} /> : null}
            <Button label="유사어 등록" size="sm" variant="primary" icon="plus" disabled={!canWriteVariant} onPress={() => openVariantForm(null, null)} />
            {!canWriteVariant ? <HelpTip text={NO_WRITE_MESSAGE} size={30} /> : null}
          </>
        }
      />

      <Grid cols={4}>
        <StatCard label="공식 용어" value={dash(summary?.termCnt)} unit="개" sub={lastChanged} />
        <StatCard label="등록 유사어" value={dash(summary?.variantCnt)} unit="개" sub={`분류 ${dash(summary?.domainCnt)}종`} />
        <StatCard label="내가 등록" value={dash(summary?.myVariantCnt ?? summary?.mineCnt)} unit="개" sub="수정·삭제 가능" />
        <StatCard
          label="유사어 없음"
          value={dash(summary?.noVariantTermCnt ?? summary?.emptyCnt)}
          unit="개"
          sub="등록이 필요한 용어"
          tone={(summary?.noVariantTermCnt ?? summary?.emptyCnt) ? 'down' : ''}
        />
      </Grid>
      <Gap />

      {loadErrors?.length ? (
        <>
          <FormAlert tone="error">{loadErrors.join('\n')}</FormAlert>
          <Gap size={12} />
        </>
      ) : null}

      {canEditTerm && (riskCount > 0 || risks?.length) ? (
        <>
          <View
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', paddingVertical: 10, paddingHorizontal: 14,
              borderRadius: theme.metrics.radiusSm, borderWidth: 1, borderColor: theme.alpha('warning', 0.35), backgroundColor: theme.alpha('warning', 0.08),
            }}
          >
            <Icon name="alert" size={15} color={theme.color.warning} />
            <Text style={[s.textSm, { flex: 1, minWidth: 200 }]}>
              {`점검 필요 유사어 ${riskCount}건 — 날짜·숫자·한 글자·공식 용어와 같은 낱말`}
            </Text>
            <Button label="목록 보기" size="sm" onPress={openRiskList} />
          </View>
          <Gap size={12} />
        </>
      ) : null}

      <Hint>
        공식 용어는 통합관리자만 편집합니다. 유사어는 이 화면의 쓰기 권한이 있으면 등록할 수 있고, 본인이 등록한 것만 수정·삭제할 수 있습니다. 다른 사람이 등록한 유사어는 등록자 이름과 함께 회색으로 표시됩니다.
      </Hint>

      {/* 분류별 현황 (07 GLS-13) — 행을 누르면 분류 필터를 그 분류로 바꿉니다. 좁은 화면은 카드 안 가로 스크롤 */}
      <Card
        title="분류별 현황"
        sub={`${(byDomain || []).length}개 분류 · 용어 수 많은 순`}
        right={<Button label={domainOpen ? '접기' : '펼치기'} size="sm" onPress={() => setDomainOpen((v) => !v)} />}
        tight={domainOpen}
      >
        {domainOpen ? (
          <Table
            inset
            minWidth={442}
            bordered
            height={(byDomain || []).length > 12 ? 420 : undefined}
            keyExtractor={(r) => r.domainId ?? r.domain}
            onRowPress={(r) => setDomain(r.domain)}
            emptyText="분류가 없습니다."
            rows={byDomain || []}
            columns={[
              { key: 'domain', title: '분류', minWidth: 140, flex: 1 },
              { key: 'termCnt', title: '용어 수', width: 96, align: 'right', render: (r) => <Text style={[s.td, s.num, { textAlign: 'right' }]}>{r.termCnt ?? '—'}</Text> },
              { key: 'variantCnt', title: '유사어 수', width: 96, align: 'right', render: (r) => <Text style={[s.td, s.num, { textAlign: 'right' }]}>{r.variantCnt ?? '—'}</Text> },
              { key: 'noVariantTermCnt', title: '유사어 없음', width: 110, align: 'right', render: (r) => <Text style={[s.td, s.num, { textAlign: 'right' }]}>{r.noVariantTermCnt ?? '—'}</Text> },
            ]}
          />
        ) : null}
      </Card>
      <Gap />

      {/* 변경이 AI 에 반영되는 시점 (07 GLS-06) — 접어 두고 필요할 때 펼칩니다 */}
      <Card
        title="변경이 AI 에 반영되는 시점"
        right={<Button label={timingOpen ? '접기' : '펼치기'} size="sm" onPress={() => setTimingOpen((v) => !v)} />}
      >
        {timingOpen ? (
          <KeyValue
            keyWidth={120}
            rows={[
              ['즉시', '정규화 미리보기 · AI 질의 전처리(의도 판단·문서 검색) · LLM 에 넘기는 용어 대응표'],
              ['다음 학습 때', '사내 LLM 모델이 익힌 용어 지식'],
              ['반영 안 됨', '이미 저장된 질의 이력의 정규화 문장'],
            ]}
          />
        ) : null}
      </Card>
      <Gap />

      <Card title="용어 정규화 미리보기" sub="현장 표현을 입력하면 공식 용어로 바꿔 보여줍니다">
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <TextField label="현장 표현" value={sample} onChangeText={setSample} style={{ flexGrow: 1, flexBasis: 320 }} full />
          <Button label="정규화" variant="primary" icon="sparkles" onPress={normalize} />
        </View>

        {normalized ? (
          <View style={{ marginTop: 12 }}>
            <Text style={[s.textSm, { lineHeight: 22 }]}>{normalized.normalizedText ?? normalized.normalized}</Text>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
              {(normalized.replacements || []).map((r, i) => (
                <View key={`${r.from}-${i}`} style={[chipBox, { borderColor: theme.alpha('success', 0.35), backgroundColor: theme.alpha('success', 0.1) }]}>
                  <Text style={[s.textXs, { textDecorationLine: 'line-through' }]}>{r.from}</Text>
                  <Icon name="arrowRight" size={11} color={theme.color.mutedForeground} />
                  <Text style={[s.textXs, { fontWeight: '700', color: theme.color.success }]}>{r.to}</Text>
                </View>
              ))}
              {/* 치환하지 않은 것 — 날짜 보호·위험 유사어(07 GLS-02) */}
              {(normalized.skipped || []).map((k, i) => (
                <View key={`skip-${k.word}-${i}`} style={[chipBox, { borderColor: theme.hairlineStrong || theme.color.border, backgroundColor: theme.color.muted }]}>
                  <Text style={[s.textXs, { color: theme.color.mutedForeground }]}>{`치환하지 않음: ${k.word} — ${k.reason || k.reasonCd || ''}`}</Text>
                </View>
              ))}
              {!(normalized.replacements || []).length ? <Text style={s.textXs}>바꿀 유사어를 찾지 못했습니다.</Text> : null}
            </View>
          </View>
        ) : null}

        <SourceNote>저장하면 다음 AI 질의부터 의도 판단·문서 검색에 반영됩니다. 사내 LLM 모델의 용어 지식은 다음 학습 때 반영됩니다.</SourceNote>
      </Card>
      <Gap />

      <Filters>
        <TextField label="검색" value={filters.keyword} onChangeText={setKeyword} onSubmitEditing={search} placeholder="용어 · 뜻 · 유사어" style={{ minWidth: 220 }} />
        <SelectField label="분류" value={filters.domain} options={['전체', ...domains]} onChange={setDomain} />
        <View style={{ paddingBottom: 8 }}>
          <CheckRow label="내가 등록한 유사어만" checked={filters.mineOnly} onToggle={() => setMineOnly(!filters.mineOnly)} />
        </View>
        <Button label="조회" variant="primary" onPress={search} />
      </Filters>

      <Card
        title="용어 · 유사어"
        sub={`${itemsMeta?.total ?? terms.length}건${filters.mineOnly ? ' · 내가 등록한 유사어가 있는 용어만' : ''}${refreshing ? ' · 조회 중…' : ''}`}
        tight
      >
        <TabulatorGrid
          inset
          columns={columns}
          rows={terms}
          rowKey="termId"
          instanceRef={gridRef}
          height={terms.length > 12 ? 620 : undefined}
          emptyText={filters.mineOnly ? '내가 등록한 유사어가 없습니다.' : '검색 조건에 맞는 용어가 없습니다.'}
          tableOptions={TABLE_OPTIONS}
        />
        <Pagination meta={itemsMeta} {...(paging?.bind || {})} />
      </Card>
    </View>
  );
}

/** 점검 필요 유사어 표 — 지운 행은 목록에서 바로 뺍니다. 삭제는 한 번 더 눌러 확인합니다 */
function RiskList({ risks, removeVariant }) {
  const s = useCommonStyles();
  const [rows, setRows] = useState(risks || []);
  const [armed, setArmed] = useState(null);
  const drop = async (r) => {
    if (armed !== r.variantId) {
      setArmed(r.variantId);
      return;
    }
    const res = await removeVariant(r.variantId);
    setArmed(null);
    if (res?.ok) setRows((list) => list.filter((x) => x.variantId !== r.variantId));
  };
  return (
    <Table
      minWidth={690}
      bordered
      keyExtractor={(r) => r.variantId}
      emptyText="점검할 유사어가 없습니다."
      rows={rows}
      columns={[
        { key: 'word', title: '유사어', width: 120 },
        { key: 'term', title: '공식 용어', width: 160 },
        { key: 'ownerName', title: '등록자', width: 120 },
        { key: 'riskNm', title: '사유', minWidth: 200, wrap: true, render: (r) => <Text style={s.td}>{r.riskNm || r.riskCd}</Text> },
        {
          key: 'variantId',
          title: '관리',
          width: 90,
          sortable: false,
          render: (r) => <Button label={armed === r.variantId ? '삭제 확인' : '삭제'} size="sm" variant="danger" onPress={() => drop(r)} />,
        },
      ]}
    />
  );
}

/** 글자 수 제한 입력 — 남은 글자를 아래에 보입니다(07 GLS-10). 폼의 custom 칸으로 씁니다 */
function CountedField({ value, onChange, label, max, multiline = false, placeholder }) {
  const len = String(value || '').length;
  return (
    <TextField
      label={label}
      value={value}
      onChangeText={(v) => onChange(String(v).slice(0, max))}
      placeholder={placeholder}
      maxLength={max}
      hint={`${len}/${max}자`}
      full
      accessibilityLabel={label.replace(' *', '')}
      {...(multiline ? { multiline: true, numberOfLines: 3, inputStyle: { minHeight: 84, textAlignVertical: 'top' } } : {})}
    />
  );
}

/**
 * 유사어 폼의 공식 용어 검색형 선택 (07 GLS-11)
 * 2자 이상 입력하면 서버 목록 API 로 20건을 찾아 보이고, 누르면 그 용어로 고정합니다.
 */
function TermPicker({ value, onChange, search }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const [q, setQ] = useState('');
  const [list, setList] = useState([]);
  const [picked, setPicked] = useState(null);
  const [msg, setMsg] = useState('');
  useEffect(() => {
    if (picked || String(q).trim().length < 2) {
      setList([]);
      setMsg(String(q).trim().length && !picked ? '2자 이상 입력하세요' : '');
      return undefined;
    }
    let alive = true;
    const t = setTimeout(() => {
      search(q)
        .then((items) => { if (alive) { setList(items); setMsg(items.length ? '' : '맞는 공식 용어가 없습니다'); } })
        .catch((e) => { if (alive) setMsg(e?.message || '공식 용어를 찾지 못했습니다'); });
    }, 300);
    return () => { alive = false; clearTimeout(t); };
  }, [q, picked, search]);
  if (picked && value) {
    return (
      <View style={{ gap: 6 }}>
        <Text style={s.fieldLabel}>공식 용어 *</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Text style={[s.textSm, { fontWeight: '700' }]}>{`${picked.term} — ${picked.definition || ''}`}</Text>
          <Button label="다시 고르기" size="sm" onPress={() => { setPicked(null); onChange(''); }} />
        </View>
      </View>
    );
  }
  return (
    <View style={{ gap: 6 }}>
      <TextField label="공식 용어 *" value={q} onChangeText={setQ} placeholder="공식 용어 검색 (2자 이상)" full accessibilityLabel="공식 용어 검색" />
      {msg ? <Text style={s.textXs}>{msg}</Text> : null}
      {list.length ? (
        <View accessibilityRole="list" style={{ borderWidth: 1, borderColor: theme.hairline || theme.color.border, borderRadius: theme.metrics.radiusSm, maxHeight: 220, overflow: 'hidden' }}>
          {list.map((t) => (
            <Pressable
              key={t.termId}
              accessibilityRole="button"
              accessibilityLabel={t.blinded ? `비공개 용어 — ${BLIND_MESSAGE}` : `${t.term} 고르기`}
              disabled={!!t.blinded}
              onPress={() => { if (t.blinded) return; setPicked(t); onChange(t.termId); }}
              style={({ hovered }) => ({ paddingVertical: 7, paddingHorizontal: 10, backgroundColor: hovered ? theme.color.muted : 'transparent' })}
            >
              <Text style={[s.textSm, t.blinded && { color: theme.color.mutedForeground }]} numberOfLines={1}>{t.blinded ? `비공개 용어 — ${BLIND_MESSAGE}` : `${t.term} — ${t.definition || ''}`}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const CHANGE_TARGET = { TERM: '공식 용어', VARIANT: '유사어' };
const CHANGE_ACTION = { CREATE: '등록', UPDATE: '수정', DELETE: '삭제', RESTORE: '되살림' };
/** 변경 전·후 JSON 키 → 화면 이름 (서버는 camelCase: term · termDef · domainNm · word · restoredVariants · byAdmin) */
const CHANGE_KEY = {
  word: '유사어', term: '공식 용어', termDef: '뜻', definition: '뜻', domainNm: '분류', domain: '분류',
  restoredVariants: '되살린 유사어', byAdmin: '관리자 대리 처리',
};
/** 변경 전·후 값 — 사람이 읽는 글로 (유사어 · 공식 용어 · 뜻 · 분류 순) */
function changeText(v) {
  if (!v) return '—';
  if (typeof v !== 'object') return String(v);
  const order = Object.keys(CHANGE_KEY);
  const keys = [...order.filter((k) => k in v), ...Object.keys(v).filter((k) => !order.includes(k))];
  const val = (x) => (Array.isArray(x) ? x.join(', ') : x === true ? '예' : x === false ? '아니오' : x);
  return keys.map((k) => `${CHANGE_KEY[k] || k}: ${val(v[k])}`).join(' · ') || '—';
}

/** 변경 이력 표 (07 GLS-07) — 모달이 열릴 때 부르고, 실패하면 안내합니다. 좁은 화면은 가로 스크롤 */
function ChangeList({ load }) {
  const s = useCommonStyles();
  const [state, setState] = useState({ loading: true, items: [], error: '' });
  useEffect(() => {
    let alive = true;
    load()
      .then((r) => alive && setState({ loading: false, items: r?.items || [], error: '' }))
      .catch((e) => alive && setState({ loading: false, items: [], error: `변경 이력을 불러오지 못했습니다 — ${e?.message || '알 수 없는 오류'}` }));
    return () => { alive = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (state.loading) return <Loading compact />;
  return (
    <View style={{ gap: 10 }}>
      {state.error ? <FormAlert tone="error">{state.error}</FormAlert> : null}
      <Table
        minWidth={860}
        bordered
        keyExtractor={(r) => r.changeId}
        emptyText="변경 이력이 없습니다."
        rows={state.items}
        columns={[
          { key: 'at', title: '시각', width: 150, mono: true },
          { key: 'actorNm', title: '수행자', width: 140, render: (r) => <Text style={s.td}>{r.actorNm || r.actorId || '—'}</Text> },
          { key: 'targetCd', title: '대상', width: 90, render: (r) => <Text style={s.td}>{`${CHANGE_TARGET[r.targetCd] || r.targetCd || ''}${r.blinded ? ' · 비공개 용어' : r.term ? ` · ${r.term}` : ''}`}</Text> },
          { key: 'actionCd', title: '구분', width: 80, render: (r) => <Text style={s.td}>{CHANGE_ACTION[r.actionCd] || r.actionCd || '—'}</Text> },
          // 고객사 데이터 권한이 없어 가린 항목(blinded, R-18)은 값 대신 「비공개」
          { key: 'before', title: '변경 전', minWidth: 200, wrap: true, render: (r) => <Text style={s.td}>{r.blinded ? '비공개' : changeText(r.before)}</Text> },
          { key: 'after', title: '변경 후', minWidth: 200, wrap: true, render: (r) => <Text style={s.td}>{r.blinded ? '비공개' : changeText(r.after)}</Text> },
        ]}
      />
    </View>
  );
}

const chipBox = { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3, paddingHorizontal: 10, borderRadius: 99, borderWidth: 1 };

/** Tabulator 옵션 — 긴 뜻·유사어 칩이 줄바꿈되어도 행 높이가 따라 늘어나게 */
const TABLE_OPTIONS = { renderVertical: 'basic' };

/** formatter 가 HTML 문자열을 그리므로 사용자 입력은 반드시 이스케이프합니다 */
function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
