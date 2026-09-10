/**
 * [View] SY-06 용어 사전 관리 (경로: /system/glossary)
 *
 * [권한] 공식 용어는 통합관리자만 편집합니다.
 *        유사어는 누구나 등록하되, 본인이 등록한 것만 수정·삭제할 수 있습니다.
 * 사용 API 9건 — /api/v1/glossary/*
 */
import React, { useMemo, useRef } from 'react';
import { Text, View } from 'react-native';
import Grid, { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import { Button, Card, CheckRow, Filters, Hint, Icon, Loading, Pagination, SelectField, SourceNote, StatCard, TabulatorGrid, TextField, openConfirmModal, openFormModal } from '@shared/components/ui';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';

export default function GlossaryView({
  paging, itemsMeta,
  loading, summary, terms, canEditTerm, domains, filters, setKeyword, setDomain, setMineOnly,
  sample, setSample, normalized, normalize, reload, exportExcel, submitTerm, submitVariant, removeVariant, removeTerm, reindex,
}) {
  const s = useCommonStyles();
  const theme = useTheme();
  // 표 안의 칩·버튼은 HTML 로 그리고(Tabulator formatter), 클릭은 cellClick 에서 data-* 로 가려냅니다.
  // 열 정의는 한 번만 만들고 최신 핸들러는 ref 로 읽습니다(아래 return 직전에 채움) — 훅이라 조기 return 보다 위에 둡니다.
  const handlers = useRef({});
  const columns = useMemo(() => [
    { title: '공식 용어', field: 'term', minWidth: 110, widthGrow: 1, formatter: (c) => `<span class="strong">${esc(c.getValue())}</span>` },
    { title: '뜻', field: 'definition', minWidth: 170, widthGrow: 3, formatter: (c) => esc(c.getValue() || '—') },
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
        if (!list.length) return '<span class="muted">등록된 유사어 없음</span>';
        return `<span class="chips">${list
          .map((v) => `<span class="tag ${v.mine ? 'tag-blue chip-mine' : ''}" data-variant="${esc(v.variantId)}" title="${v.mine ? '누르면 수정' : esc(v.byName || '')}">${esc(v.word)} <small class="muted">${v.mine ? '내 등록' : esc(v.byName || '')}</small>${v.mine ? `<b class="chip-x" data-del="${esc(v.variantId)}" title="삭제">×</b>` : ''}</span>`)
          .join('')}</span>`;
      },
      cellClick: (e, c) => {
        const row = c.getRow().getData();
        const del = e.target.closest('[data-del]');
        if (del) {
          const v = (row.variants || []).find((x) => String(x.variantId) === del.dataset.del);
          if (v) handlers.current.confirmDeleteVariant(v);
          return;
        }
        const chip = e.target.closest('[data-variant]');
        if (chip) {
          const v = (row.variants || []).find((x) => String(x.variantId) === chip.dataset.variant);
          if (v?.mine) handlers.current.openVariantForm(row, v);
        }
      },
    },
    {
      title: '관리',
      field: 'termId',
      width: canEditTerm ? 210 : 104,
      headerSort: false,
      headerFilter: false,
      formatter: () =>
        `<button class="tbtn" data-act="add">유사어 추가</button>${canEditTerm ? ' <button class="tbtn" data-act="edit">편집</button> <button class="tbtn tbtn-ghost" data-act="del">삭제</button>' : ''}`,
      cellClick: (e, c) => {
        const act = e.target.closest('[data-act]')?.dataset.act;
        const row = c.getRow().getData();
        if (act === 'add') handlers.current.openVariantForm(row, null);
        else if (act === 'edit') handlers.current.openTermForm(row);
        else if (act === 'del') handlers.current.confirmDeleteTerm(row);
      },
    },
  ], [canEditTerm]);

  /* ───────── 공식 용어 ───────── */
  const openTermForm = (row) =>
    openFormModal({
      title: row ? '공식 용어 편집' : '공식 용어 등록',
      sub: '보고서·리포트 표기 기준이 되는 용어입니다 (통합관리자 전용)',
      // 분류 키는 서버 요청 본문과 같은 domainCd 입니다 (GET /glossary/domains 의 code)
      initial: row ? { term: row.term, definition: row.definition, domainCd: row.domain } : { domainCd: domains[0] },
      fields: [
        { key: 'term', label: '공식 용어', required: true, placeholder: '예) Stiffener' },
        { key: 'domainCd', label: '분류', type: 'select', options: domains, required: true },
        { key: 'definition', label: '뜻', type: 'textarea', rows: 2, full: true, required: true, placeholder: '예) 스티프너 / FPCB 보강판 (Stiffener)' },
      ],
      note: '공식 용어는 보고서 표기와 AI 응답의 기준입니다. 현장 표현은 유사어로 등록하세요.',
      submitLabel: row ? '수정' : '등록',
      onSubmit: async (v) => (await submitTerm(row?.termId, v)).ok,
    });

  /* ───────── 유사어 ───────── */
  const openVariantForm = (term, variant) =>
    openFormModal({
      title: variant ? '유사어 수정' : '유사어 등록',
      sub: '현장에서 실제로 쓰는 표현을 등록합니다 (본인이 등록한 것만 수정·삭제 가능)',
      initial: { termId: term?.termId || terms[0]?.termId, word: variant?.word || '' },
      fields: [
        { key: 'termId', label: '공식 용어', type: 'select', options: terms.map((t) => ({ value: t.termId, label: `${t.term} — ${t.definition}` })), required: true, full: true },
        { key: 'word', label: '유사어', required: true, placeholder: '예) 보강판 · 스티프너 · 찍힘' },
      ],
      note: '등록한 유사어는 자연어 질의와 보고서 생성 시 공식 용어로 자동 정규화됩니다.',
      submitLabel: variant ? '수정' : '등록',
      onSubmit: async (v) => (await submitVariant(variant?.variantId, v)).ok,
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

  if (loading) return <Loading />;

  // 최신 핸들러를 표 클릭에서 읽을 수 있게 매 렌더마다 갱신 (훅 아님)
  handlers.current = { openVariantForm, openTermForm, confirmDeleteTerm, confirmDeleteVariant };
  return (
    <View>
      <PageHead
        title="용어 사전 관리"
        desc="보고서·리포트에 적용되는 공식 용어와, 현장에서 실제로 쓰는 유사어를 함께 관리합니다. 부서마다 다르게 부르는 말·약칭·한글 표기를 등록해 두면 자연어 질의와 보고서 생성 시 공식 용어로 자동 정규화됩니다."
        actions={
          <>
            <Button label="엑셀 다운로드" size="sm" icon="download" onPress={exportExcel} />
            <Button label="용어 임베딩 재생성" size="sm" icon="refresh" onPress={reindex} />
            {canEditTerm ? <Button label="공식 용어 등록" size="sm" icon="plus" onPress={() => openTermForm(null)} /> : null}
            <Button label="유사어 등록" size="sm" variant="primary" icon="plus" onPress={() => openVariantForm(null, null)} />
          </>
        }
      />

      <Grid cols={4}>
        <StatCard label="공식 용어" value={summary?.termCnt ?? 0} unit="개" sub="보고서 표기 기준" />
        <StatCard label="등록 유사어" value={summary?.variantCnt ?? 0} unit="개" sub={`분류 ${summary?.domainCnt ?? 0}종`} />
        <StatCard label="내가 등록" value={summary?.myVariantCnt ?? 0} unit="개" sub="수정·삭제 가능" />
        <StatCard label="유사어 없음" value={summary?.noVariantTermCnt ?? 0} unit="개" sub="등록이 필요한 용어" tone={summary?.noVariantTermCnt ? 'down' : ''} />
      </Grid>
      <Gap />

      <Hint>
        공식 용어는 통합관리자만 편집합니다. 유사어는 누구나 등록할 수 있고, 본인이 등록한 것만 수정·삭제할 수 있습니다. 다른 사람이 등록한 유사어는 등록자 이름과 함께 회색으로 표시됩니다.
      </Hint>

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
                <View
                  key={`${r.from}-${i}`}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingVertical: 3,
                    paddingHorizontal: 10,
                    borderRadius: 99,
                    borderWidth: 1,
                    borderColor: theme.alpha('success', 0.35),
                    backgroundColor: theme.alpha('success', 0.1),
                  }}
                >
                  <Text style={[s.textXs, { textDecorationLine: 'line-through' }]}>{r.from}</Text>
                  <Icon name="arrowRight" size={11} color={theme.color.mutedForeground} />
                  <Text style={[s.textXs, { fontWeight: '700', color: theme.color.success }]}>{r.to}</Text>
                </View>
              ))}
              {!(normalized.replacements || []).length ? <Text style={s.textXs}>바꿀 유사어를 찾지 못했습니다.</Text> : null}
            </View>
          </View>
        ) : null}

        <SourceNote>보고서 생성·자연어 질의 처리 시 같은 규칙으로 용어를 맞춥니다.</SourceNote>
      </Card>
      <Gap />

      <Filters>
        <TextField label="검색" value={filters.keyword} onChangeText={setKeyword} placeholder="용어 · 뜻 · 유사어" style={{ minWidth: 220 }} />
        <SelectField label="분류" value={filters.domain} options={['전체', ...domains]} onChange={setDomain} />
        <View style={{ paddingBottom: 8 }}>
          <CheckRow label="내가 등록한 유사어만" checked={filters.mineOnly} onToggle={() => setMineOnly(!filters.mineOnly)} />
        </View>
        <Button label="조회" variant="primary" onPress={reload} />
      </Filters>

      <Card title="용어 · 유사어" sub={`${itemsMeta?.total ?? terms.length}건${filters.mineOnly ? ' · 내가 등록한 유사어가 있는 용어만' : ''}`} tight>
        <TabulatorGrid
          columns={columns}
          rows={terms}
          rowKey="termId"
          height={terms.length > 12 ? 620 : undefined}
          emptyText="검색 조건에 맞는 용어가 없습니다."
          tableOptions={TABLE_OPTIONS}
        />
          <Pagination meta={itemsMeta} {...(paging?.bind || {})} />
      </Card>
    </View>
  );
}

/** Tabulator 옵션 — 긴 뜻·유사어 칩이 줄바꿈되어도 행 높이가 따라 늘어나게 */
const TABLE_OPTIONS = { renderVertical: 'basic' };

/** formatter 가 HTML 문자열을 그리므로 사용자 입력은 반드시 이스케이프합니다 */
function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
