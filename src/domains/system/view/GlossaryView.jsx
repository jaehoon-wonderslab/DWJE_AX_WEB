/**
 * [View] SY-06 용어 사전 관리 (경로: /system/glossary · 화면 ID sys-gloss)
 *
 * [권한] 공식 용어는 통합관리자만 편집합니다(버튼도 통합관리자에게만 보입니다 — 07 4.3).
 *        유사어는 이 화면의 쓰기 권한이 있으면 등록하고, 본인이 등록한 것만 수정·삭제합니다(07 GLS-16).
 *        쓰기 권한이 없으면 유사어 버튼을 숨기지 않고 비활성으로 두고 이유를 옆에 알립니다(공통 R-06).
 * 엑셀은 조회 권한으로 받습니다(공통 R-10) — 쓰기 권한과 무관합니다.
 * 엑셀 업로드(2026-10-03) — [템플릿 내려받기]는 조회 권한, [엑셀 업로드]는 쓰기 권한(canWriteVariant)입니다.
 *        파일을 고르면 미리보기(저장 안 함)를 모달로 보이고, [n건 등록] 이 같은 파일을 다시 보내 등록합니다.
 * 사용 API — /api/v1/glossary/* (요약·목록·정규화·점검 필요 유사어·내려받기·용어/유사어 쓰기)
 * 분류 삭제(2026-10-03) — 표·검색·등록/편집 폼·엑셀 업로드/내려받기의 「분류」 를 걷어냈습니다(제거됨).
 *        고객사 가림(결정 R-18)은 용어마다 「고객사 정보」(customerInfo) 로 옮겼습니다.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Grid, { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import {
  Badge, Button, Card, CheckRow, ExportMenuButton, FormAlert, HelpTip, Hint, Loading,
  StatCard, Table, TabulatorGrid, TextField, openConfirmModal, openFormModal,
} from '@shared/components/ui';
import { useUiStore } from '@shared/stores/useUiStore';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { BLIND_MESSAGE, NO_WRITE_MESSAGE } from '../controller/useGlossaryController';

export default function GlossaryView({
  itemsMeta, initialLoading, refreshing, loadErrors, summary, summaryFailed, terms, gridRef,
  canEditTerm, canWriteVariant, risks, initialFilter,
  exportView, exportAll, exportViewCount,
  downloadImportTemplate, pickAndPreviewImport, applyImport,
  submitTerm, submitVariant, removeVariant, removeTerm, loadChanges, searchTerms,
}) {
  const s = useCommonStyles();
  const theme = useTheme();
  const openModal = useUiStore((state) => state.openModal);
  const toast = useUiStore((state) => state.toast);
  // 표 안의 칩·버튼은 HTML 로 그리고(Tabulator formatter), 클릭은 cellClick 에서 data-* 로 가려냅니다.
  // 열 정의는 권한이 바뀔 때만 다시 만들고 최신 핸들러·점검 목록은 ref 로 읽습니다 — 훅이라 조기 return 보다 위에 둡니다.
  const handlers = useRef({});
  const riskRef = useRef(new Map());
  riskRef.current = new Map((risks || []).map((r) => [String(r.variantId), r]));
  // 주소의 ?keyword= 를 「공식 용어」 머리글 필터에 한 번 넣습니다(조회 줄은 2026-10-04 에 뺌).
  // 표가 자료를 받아 그려진 뒤여야 머리글 칸이 있으므로 용어가 들어온 다음에 넣습니다
  const appliedFilter = useRef('');
  useEffect(() => {
    if (!initialFilter || appliedFilter.current === initialFilter || !terms.length) return undefined;
    const t = setTimeout(() => {
      try {
        gridRef?.current?.setHeaderFilterValue('term', initialFilter);
        appliedFilter.current = initialFilter;
      } catch (e) { /* 표가 아직 없으면 다음 렌더에서 다시 */ }
    }, 200);
    return () => clearTimeout(t);
  }, [initialFilter, terms.length, gridRef]);
  const columns = useMemo(() => [
    // 고객사 데이터 권한이 없어 가린 용어(blinded, 결정 R-18)는 「비공개 용어」 회색으로 그립니다
    // 고객사 정보 용어(customerInfo)는 통합관리자에게만 작은 「고객사」 표시를 붙입니다(2026-10-03 분류 삭제)
    {
      title: '공식 용어',
      field: 'term',
      minWidth: 110,
      widthGrow: 1,
      formatter: (c) => {
        const row = c.getRow().getData();
        if (row.blinded) return `<span class="muted" title="${esc(BLIND_MESSAGE)}">비공개 용어</span>`;
        const tag = canEditTerm && row.customerInfo ? ` <span class="tag" title="${esc(CUSTOMER_INFO_HINT)}">고객사</span>` : '';
        return `<span class="strong">${esc(c.getValue())}</span>${tag}`;
      },
    },
    { title: '뜻', field: 'definition', minWidth: 170, widthGrow: 3, formatter: (c) => (c.getRow().getData().blinded ? '<span class="muted">비공개</span>' : esc(c.getValue() || '—')) },
    // 제거됨(2026-10-03, 분류 삭제): 「분류」 열
    {
      // 등록자는 표기하지 않습니다(2026-10-04) — 유사어 등록은 관리자만 합니다
      title: '유사어',
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
            const tip = [risk ? `점검 필요: ${risk.riskNm || risk.riskCd}` : '', v.editable ? '누르면 수정' : ''].filter(Boolean).join(' · ');
            return `<span class="tag" data-variant="${esc(v.variantId)}" title="${esc(tip)}">${risk ? '<b class="chip-risk">!</b> ' : ''}${esc(v.word)}${v.editable ? `<b class="chip-x" data-del="${esc(v.variantId)}" title="삭제">×</b>` : ''}</span>`;
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
      // 단추를 한 줄로 둡니다(2026-10-04) — 통합관리자 340(유사어 추가·이력·편집·삭제) / 그 밖 210(유사어 추가·이력)
      width: canEditTerm ? 340 : 210,
      minWidth: canEditTerm ? 340 : 210,
      headerSort: false,
      headerFilter: false,
      formatter: (c) => {
        // 쓰기 권한이 없거나 가린 용어(R-18)면 숨기지 않고 비활성 + 이유(공통 R-06)
        const blinded = !!c.getRow().getData().blinded;
        const btn = (act, label, ok, why, extra = '') => (ok
          ? `<button class="tbtn${extra}" data-act="${act}">${label}</button>`
          : `<button class="tbtn${extra}" data-act="${act}" disabled title="${esc(why)}" aria-label="${label} — ${esc(why)}">${label}</button>`);
        // 주 동작(유사어 추가)은 옅은 강조, 삭제는 붉은 글자 — 같은 모양 단추 넷이 두 줄로 접히던 것을 한 줄로(2026-10-04)
        const add = btn('add', '유사어 추가', canWriteVariant && !blinded, blinded ? BLIND_MESSAGE : NO_WRITE_MESSAGE, ' tbtn-accent');
        const admin = canEditTerm
          ? `${btn('edit', '편집', !blinded, BLIND_MESSAGE)}${btn('del', '삭제', !blinded, BLIND_MESSAGE, ' tbtn-danger')}`
          : '';
        return `<div class="tbtns">${add}<button class="tbtn" data-act="hist">이력</button>${admin}</div>`;
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
      // 제거됨(2026-10-03, 분류 삭제): 「분류」 선택(domainCd). 대신 「고객사 정보」(customerInfo) 를 보냅니다
      initial: row ? { term: row.term, definition: row.definition, customerInfo: !!row.customerInfo } : { customerInfo: false },
      // 입력 길이 — 공식 용어 50자 · 뜻 500자, 남은 글자를 보입니다(07 GLS-10)
      fields: [
        { key: 'term', label: '공식 용어', type: 'custom', full: true, render: (p) => <CountedField {...p} label="공식 용어 *" max={50} placeholder="예) Stiffener" /> },
        { key: 'definition', label: '뜻', type: 'custom', full: true, render: (p) => <CountedField {...p} label="뜻 *" max={500} multiline placeholder="예) 스티프너 / FPCB 보강판 (Stiffener)" /> },
        { key: 'customerInfo', label: '고객사 정보', type: 'custom', full: true, render: (p) => <CustomerInfoField {...p} /> },
      ],
      note: '공식 용어는 보고서 표기와 AI 응답의 기준입니다. 현장 표현은 유사어로 등록하세요.',
      submitLabel: row ? '수정' : '등록',
      onSubmit: async (v) => {
        if (!String(v.term || '').trim() || !String(v.definition || '').trim()) {
          toast('공식 용어와 뜻을 입력해 주세요.');
          return false;
        }
        return (await submitTerm(row?.termId, { term: v.term, definition: v.definition, customerInfo: v.customerInfo === true })).ok;
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
      // 부제는 뺐습니다 · 폭을 넓혀 표가 가로 스크롤 없이 들어갑니다(2026-10-04)
      wide: true,
      maxWidth: 1180,
      render: () => <ChangeList load={() => loadChanges({ termId: row?.termId })} />,
    });

  /* ───────── 엑셀 업로드 (2026-10-03) — 파일 고르기 → 미리보기 모달 → [n건 등록] ───────── */
  const startImport = async () => {
    const picked = await pickAndPreviewImport();
    if (!picked) return;
    const { file, preview } = picked;
    openModal({
      title: '엑셀 업로드 미리보기',
      sub: `${preview.fileName || file.name} · 데이터 ${preview.totalRows}행`,
      wide: true,
      maxWidth: 1120,
      render: () => <ImportPreview data={preview} />,
      footer: (close) => <ImportFooter count={preview.applicable} onCancel={close} onApply={async () => {
        const res = await applyImport(file);
        if (res.ok) close();
      }} />,
    });
  };

  if (initialLoading) return <Loading />;

  // 최신 핸들러를 표 클릭에서 읽을 수 있게 매 렌더마다 갱신 (훅 아님)
  handlers.current = { openVariantForm, openTermForm, confirmDeleteTerm, confirmDeleteVariant, openChanges };
  const dash = (v) => (summaryFailed || v === null || v === undefined ? '—' : v);
  return (
    <View>
      <PageHead
        title="용어 사전 관리"
        // 문장마다 줄을 바꿉니다(2026-10-03)
        desc={'보고서·리포트에 적용되는 공식 용어와, 현장에서 실제로 쓰는 유사어를 함께 관리합니다.\n부서마다 다르게 부르는 말·약칭·한글 표기를 등록해 두면 자연어 질의를 처리할 때 공식 용어로 정규화됩니다.'}
        actions={
          <>
            <Button label="변경 이력" size="sm" icon="clock" onPress={() => openChanges(null)} />
            <ExportMenuButton
              viewCount={exportViewCount}
              totalCount={summary?.termCnt}
              onExportView={exportView}
              onExportAll={exportAll}
            />
            {/* 엑셀 업로드(2026-10-03) — 템플릿은 조회 권한, 업로드는 쓰기 권한. 쓰기 권한이 없으면 비활성 + 이유(공통 R-06) */}
            <Button label="템플릿 내려받기" size="sm" icon="download" onPress={downloadImportTemplate} />
            <Button label="엑셀 업로드" size="sm" icon="upload" disabled={!canWriteVariant} onPress={startImport} />
            {!canWriteVariant ? <HelpTip text={NO_WRITE_MESSAGE} size={30} /> : null}
            {/* 제거됨(2026-10, 처리기 없음 — 07 GLS-05): 「용어 임베딩 재생성」 버튼. 컨트롤러 reindex 와 API 는 남겨 둡니다
            <Button label="용어 임베딩 재생성" size="sm" icon="refresh" onPress={reindex} /> */}
            {canEditTerm ? <Button label="공식 용어 등록" size="sm" icon="plus" onPress={() => openTermForm(null)} /> : null}
            {/* 머리 「유사어 등록」 단추는 뺐습니다(2026-10-03) — 표의 행마다 [유사어 추가] 로 등록합니다 */}
          </>
        }
      />

      {/* 요약 카드 부제(최근 변경 · 분류 n종 · 수정·삭제 가능 · 등록이 필요한 용어)는 뺐습니다(2026-10-03) */}
      {/* 「내가 등록」 카드는 뺐습니다(2026-10-04) — 유사어 등록은 관리자만 합니다 */}
      <Grid cols={3}>
        <StatCard label="공식 용어" value={dash(summary?.termCnt)} unit="개" />
        <StatCard label="등록 유사어" value={dash(summary?.variantCnt)} unit="개" />
        <StatCard
          label="유사어 없음"
          value={dash(summary?.noVariantTermCnt ?? summary?.emptyCnt)}
          unit="개"
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

      {/* 「점검 필요 유사어 n건」 알림 줄은 뺐습니다(2026-10-03) — 표의 유사어 칩에 「!」 표시는 그대로입니다 */}

      {/* 제거됨(2026-10-04): 편집 권한 · 등록자 표시 안내(유사어 등록은 관리자만 합니다) */}

      {/* 제거됨(2026-10-03): 「분류별 현황」 · 「변경이 AI 에 반영되는 시점」 · 「용어 정규화 미리보기」 카드. 컨트롤러·API 는 남겨 둡니다 */}

      {/* 제거됨(2026-10-04): 조회 줄(검색 · 「내가 등록한 유사어만」 · 조회). 용어를 전부 받아 표 머리글 필터로 거릅니다 */}

      <Card
        title="용어 · 유사어"
        sub={`${itemsMeta?.total ?? terms.length}건${refreshing ? ' · 조회 중…' : ''}`}
        tight
      >
        <TabulatorGrid
          inset
          columns={columns}
          rows={terms}
          rowKey="termId"
          instanceRef={gridRef}
          height={terms.length > 12 ? 620 : undefined}
          emptyText="조건에 맞는 용어가 없습니다." 
          tableOptions={TABLE_OPTIONS}
          // 전부 받은 용어를 표가 50행씩 나눕니다 — 머리글 필터는 모든 쪽에서 찾습니다(2026-10-04)
          pageSize={50}
        />
      </Card>
    </View>
  );
}


/* ───────── 엑셀 업로드 미리보기 ───────── */
const IMPORT_ACTION = {
  NEW_TERM: { label: '새 용어', tone: 'blue' },
  EXISTING_TERM: { label: '기존 용어', tone: '' },
  ERROR: { label: '오류', tone: 'red' },
};
const IMPORT_FIELD = { term: '공식 용어', definition: '뜻', customerInfo: '고객사 정보' };

/** 미리보기 본문 — 건수 · 안내 · 행 표(좁은 화면은 가로 스크롤) */
function ImportPreview({ data }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const counts = [
    ['새 용어', data.termNew, 'blue'],
    ['기존 용어', data.termExisting, ''],
    ['새 유사어', data.variantNew, 'green'],
    ['건너뜀', data.variantSkipped, data.variantSkipped ? 'amber' : ''],
    ['오류', data.errorCnt, data.errorCnt ? 'red' : ''],
  ];
  const small = [s.textXs, { marginTop: 2 }];
  return (
    <View style={{ gap: 10 }}>
      <View accessibilityLabel="업로드 건수" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        {counts.map(([label, n, tone]) => <Badge key={label} tone={tone}>{`${label} ${n}`}</Badge>)}
      </View>
      <Hint>
        {'아직 등록하지 않았습니다. 오류 행은 빼고 등록합니다.\n기존 용어는 유사어만 더하고 뜻·고객사 정보는 바꾸지 않습니다. 건너뛸 유사어(이미 있음·규칙 위반·파일 안 중복)는 등록하지 않습니다.'}
      </Hint>
      {data.errorCnt ? <FormAlert tone="error">{`오류 ${data.errorCnt}행은 등록하지 않습니다. 고쳐서 다시 올리거나, 나머지만 등록하세요.`}</FormAlert> : null}
      <Table
        minWidth={1040}
        bordered
        height={data.rows.length > 8 ? 440 : undefined}
        keyExtractor={(r) => `${r.row}`}
        emptyText="읽은 행이 없습니다."
        rows={data.rows}
        columns={[
          { key: 'row', title: '행', width: 60, num: true },
          {
            key: 'term', title: '공식 용어', minWidth: 170, wrap: true,
            render: (r) => (
              <View>
                <Text style={[s.td, { fontWeight: '700' }]}>{r.term || '—'}</Text>
                {r.action === 'NEW_TERM' && (r.customerInfo || r.definition) ? (
                  <Text style={small}>{[r.customerInfo ? '고객사 정보' : '', r.definition].filter(Boolean).join(' · ')}</Text>
                ) : null}
              </View>
            ),
          },
          {
            key: 'action', title: '처리', width: 120,
            render: (r) => {
              const a = IMPORT_ACTION[r.action] || { label: r.action || '—', tone: '' };
              return (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                  <Badge tone={a.tone}>{a.label}</Badge>
                  {r.restored ? <Badge tone="amber">되살림</Badge> : null}
                </View>
              );
            },
          },
          {
            key: 'variantsAdded', title: '추가할 유사어', minWidth: 180, wrap: true,
            render: (r) => <Text style={s.td}>{r.variantsAdded.length ? r.variantsAdded.join(' · ') : '—'}</Text>,
          },
          {
            key: 'variantsSkipped', title: '건너뛸 유사어', minWidth: 230, wrap: true,
            render: (r) => (r.variantsSkipped.length ? (
              <View style={{ gap: 2 }}>
                {r.variantsSkipped.map((v, i) => (
                  <Text key={`${v.word}-${i}`} style={s.td}>
                    {v.word}
                    <Text style={s.textXs}>{v.reason ? ` — ${v.reason}` : ''}</Text>
                  </Text>
                ))}
              </View>
            ) : <Text style={s.td}>—</Text>),
          },
          {
            key: 'messages', title: '오류·안내', minWidth: 280, wrap: true,
            render: (r) => {
              const lines = [
                ...r.errors.map((e) => ({ t: `${IMPORT_FIELD[e.field] ? `${IMPORT_FIELD[e.field]}: ` : ''}${e.message}`, c: theme.color.destructive })),
                ...r.warnings.map((w) => ({ t: typeof w === 'string' ? w : w?.message || '', c: theme.color.warningText || theme.color.foreground })),
                ...r.notes.map((n) => ({ t: n, c: theme.color.mutedForeground })),
              ].filter((l) => l.t);
              if (!lines.length) return <Text style={s.td}>—</Text>;
              return (
                <View style={{ gap: 2 }}>
                  {lines.map((l, i) => <Text key={i} style={[s.td, { color: l.c }]}>{l.t}</Text>)}
                </View>
              );
            },
          },
        ]}
      />
    </View>
  );
}

/** 미리보기 아래 단추 — 등록 중에는 두 번 누르지 않게 막습니다 */
function ImportFooter({ count, onCancel, onApply }) {
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Button label="취소" onPress={onCancel} disabled={busy} />
      <Button
        label={busy ? '등록 중…' : `${count}건 등록`}
        variant="primary"
        disabled={busy || !count}
        onPress={async () => {
          setBusy(true);
          try { await onApply(); } finally { setBusy(false); }
        }}
      />
    </>
  );
}

/** 고객사 정보 체크 안내 (2026-10-03 분류 삭제 — 고객사 가림을 용어 단위로 옮김, 결정 R-18) */
const CUSTOMER_INFO_HINT = '고객사 데이터 권한이 없는 사람에게는 「비공개 용어」 로 보입니다';

/** 공식 용어 폼의 「고객사 정보」 체크 — 폼의 custom 칸으로 씁니다 */
function CustomerInfoField({ value, onChange }) {
  const s = useCommonStyles();
  return (
    <View style={{ gap: 4 }} accessibilityLabel="고객사 정보">
      <CheckRow label="고객사 정보" checked={value === true} onToggle={() => onChange(!(value === true))} />
      <Text style={[s.textXs, { paddingLeft: 23 }]}>{CUSTOMER_INFO_HINT}</Text>
    </View>
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
/** 변경 이력 「구분」 목록 필터 순서 */
const CHANGE_ACTION_ORDER = Object.values(CHANGE_ACTION);
/**
 * 변경 전·후 JSON 키 → 화면 이름 (서버는 camelCase: term · termDef · customerInfo · word · restoredVariants · byAdmin)
 * domainNm · domain(분류)은 2026-10-03 분류 삭제 전에 쌓인 이력을 읽으려고 남겨 둡니다
 */
const CHANGE_KEY = {
  word: '유사어', term: '공식 용어', termDef: '뜻', definition: '뜻', customerInfo: '고객사 정보', domainNm: '분류', domain: '분류',
  restoredVariants: '되살린 유사어', deactivatedVariants: '함께 끈 유사어', byAdmin: '관리자 대리 처리',
};
/** 변경 전·후 값 — 사람이 읽는 글로 (유사어 · 공식 용어 · 뜻 · 고객사 정보 순) */
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
  const [state, setState] = useState({ loading: true, items: [], error: '' });
  useEffect(() => {
    let alive = true;
    load()
      .then((r) => alive && setState({ loading: false, items: r?.items || [], error: '' }))
      .catch((e) => alive && setState({ loading: false, items: [], error: `변경 이력을 불러오지 못했습니다 — ${e?.message || '알 수 없는 오류'}` }));
    return () => { alive = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (state.loading) return <Loading compact />;
  // 머리글 검색이 글자로 거르도록 표시할 글자를 행에 미리 만듭니다
  const rows = state.items.map((r) => ({
    ...r,
    actorText: r.actorNm || r.actorId || '—',
    targetText: `${CHANGE_TARGET[r.targetCd] || r.targetCd || ''}${r.blinded ? ' · 비공개 용어' : r.term ? ` · ${r.term}` : ''}`,
    actionText: CHANGE_ACTION[r.actionCd] || r.actionCd || '—',
    beforeText: r.blinded ? '비공개' : changeText(r.before),
    afterText: r.blinded ? '비공개' : changeText(r.after),
  }));
  return (
    <View style={{ gap: 10 }}>
      {state.error ? <FormAlert tone="error">{state.error}</FormAlert> : null}
      {/* 머리글 검색은 모든 쪽에 적용됩니다 — 이력을 전부 받아 표가 20행씩 나눕니다(2026-10-04) */}
      <Table
        bordered
        filterable
        pageSize={20}
        keyExtractor={(r) => r.changeId}
        emptyText="변경 이력이 없습니다."
        rows={rows}
        columns={[
          // 시각은 한 줄(nowrap) — 「2026-10-04 09:05:12」 이 들어가는 폭
          { key: 'at', title: '시각', width: 215, mono: true },
          { key: 'actorText', title: '작업자', width: 120 },
          { key: 'targetText', title: '대상', width: 180, wrap: true },
          // 구분은 고르는 목록 필터입니다(등록 · 수정 · 삭제 · 되살림 — 표에 있는 값만)
          { key: 'actionText', title: '구분', width: 110, filter: 'list', filterOptions: CHANGE_ACTION_ORDER },
          // 고객사 데이터 권한이 없어 가린 항목(blinded, R-18)은 값 대신 「비공개」
          { key: 'beforeText', title: '변경 전', minWidth: 220, flex: 1, wrap: true },
          { key: 'afterText', title: '변경 후', minWidth: 220, flex: 1, wrap: true },
        ]}
      />
    </View>
  );
}


/** Tabulator 옵션 — 긴 뜻·유사어 칩이 줄바꿈되어도 행 높이가 따라 늘어나게 */
const TABLE_OPTIONS = { renderVertical: 'basic' };

/** formatter 가 HTML 문자열을 그리므로 사용자 입력은 반드시 이스케이프합니다 */
function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
