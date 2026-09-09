/**
 * [View] SY-06 용어 사전 관리 (경로: /system/glossary)
 *
 * [권한] 공식 용어는 통합관리자만 편집합니다.
 *        유사어는 누구나 등록하되, 본인이 등록한 것만 수정·삭제할 수 있습니다.
 * 사용 API 9건 — /api/v1/glossary/*
 */
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Grid, { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import { Badge, Button, Card, CheckRow, Filters, Hint, Icon, Loading, Pagination, SelectField, SourceNote, StatCard, Table, TextField, openConfirmModal, openFormModal } from '@shared/components/ui';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';

export default function GlossaryView({
  paging, itemsMeta,
  loading, summary, terms, canEditTerm, domains, filters, setKeyword, setDomain, setMineOnly,
  sample, setSample, normalized, normalize, reload, exportExcel, submitTerm, submitVariant, removeVariant, removeTerm, reindex,
}) {
  const s = useCommonStyles();
  const theme = useTheme();

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
        <Table
          minWidth={980}
          keyExtractor={(r) => r.termId}
          emptyText="검색 조건에 맞는 용어가 없습니다."
          columns={[
            { key: 'term', title: '공식 용어', width: 130, render: (r) => <Text style={[s.td, { fontWeight: '700' }]}>{r.term}</Text> },
            { key: 'definition', title: '뜻', width: 280, wrap: true },
            { key: 'domain', title: '분류', width: 110, render: (r) => <Badge>{r.domain}</Badge> },
            {
              key: 'variants',
              title: '유사어 (등록자)',
              flex: 1,
              minWidth: 300,
              render: (r) => (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, paddingVertical: 4 }}>
                  {(r.variants || []).map((v) => (
                    <TouchableOpacity
                      key={v.variantId}
                      disabled={!v.mine}
                      onPress={() => openVariantForm(r, v)}
                      activeOpacity={0.7}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 5,
                        paddingVertical: 2,
                        paddingLeft: 8,
                        paddingRight: v.mine ? 4 : 8,
                        borderRadius: 99,
                        borderWidth: 1,
                        borderColor: v.mine ? theme.alpha('primary', 0.35) : theme.color.border,
                        backgroundColor: v.mine ? theme.color.accent : theme.color.muted,
                      }}
                    >
                      <Text style={[s.textXs, { fontWeight: '600', color: v.mine ? theme.color.primary : theme.color.foreground }]}>{v.word}</Text>
                      <Text style={[s.textXs, { fontSize: 10 }]}>{v.mine ? '내 등록' : v.byName}</Text>
                      {v.mine ? (
                        <TouchableOpacity onPress={() => confirmDeleteVariant(v)} style={{ width: 16, height: 16, alignItems: 'center', justifyContent: 'center' }}>
                          <Icon name="close" size={10} color={theme.color.mutedForeground} />
                        </TouchableOpacity>
                      ) : null}
                    </TouchableOpacity>
                  ))}
                  {!(r.variants || []).length ? <Text style={s.textXs}>등록된 유사어 없음</Text> : null}
                </View>
              ),
            },
            {
              key: 'action',
              title: '관리',
              width: 150,
              render: (r) => (
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  <Button label="유사어 추가" size="sm" onPress={() => openVariantForm(r, null)} />
                  {canEditTerm ? <Button label="편집" size="sm" onPress={() => openTermForm(r)} /> : null}
                  {canEditTerm ? <Button label="삭제" size="sm" variant="ghost" onPress={() => confirmDeleteTerm(r)} /> : null}
                </View>
              ),
            },
          ]}
          rows={terms}
        />
          <Pagination meta={itemsMeta} {...(paging?.bind || {})} />
      </Card>
    </View>
  );
}
