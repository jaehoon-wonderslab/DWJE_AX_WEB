/**
 * [View] 용어 사전 조회 (GL-01 · 경로 /glossary/view · 화면 ID gloss-view)
 *
 * 공식 용어와 현장 유사어를 찾아봅니다. 이 화면에는 등록·수정·삭제·정규화 시험·임베딩 재생성이 없습니다.
 *
 * 넓은 화면(≥1100px)은 표 오른쪽에 상세 패널(너비 360), 좁은 화면은 표 위에 상세 카드를 둡니다.
 * 표는 열을 숨기지 않고, 카드 안에서 가로로 스크롤해 마지막 「유사어」 열까지 봅니다(AGENTS.md 표 기준).
 */
import React, { useMemo, useRef } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import Grid, { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import {
  Button, Card, ChipRow, EmptyState, ExportMenuButton, Filters, FormAlert, Hint, Loading,
  SelectChip, StatCard, TabulatorGrid, TextField,
} from '@shared/components/ui';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';

/** 상세 패널을 표 옆에 둘 최소 폭 */
const SIDE_PANEL_MIN = 1100;
/** 표 안 유사어 칩 최대 개수 — 넘치면 「외 n」 */
const CHIP_MAX = 6;
const TABLE_OPTIONS = { renderVertical: 'basic' };

export default function GlossaryReadView({
  initialLoading, refreshing, loadErrors, summaryFailed, summary, terms, itemsMeta, filters, setKeyword, search,
  detail, detailError, selectedId, openTerm, closeTerm, exportView, exportAll, canManage, goManage,
}) {
  const s = useCommonStyles();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const side = width >= SIDE_PANEL_MIN;

  // 열 정의는 한 번만 만들고 검색어는 ref 로 읽습니다(강조 표시)
  const kw = useRef('');
  kw.current = filters.appliedKeyword || '';
  const columns = useMemo(() => [
    // 데이터 접근 권한으로 가려진 용어(GLV-08 — blinded)는 「비공개 용어」 회색으로 그립니다
    { title: '공식 용어', field: 'term', minWidth: 130, widthGrow: 1, headerSort: false, formatter: (c) => (c.getRow().getData().blinded ? '<span class="muted">비공개 용어</span>' : `<span class="strong">${mark(c.getValue(), kw.current)}</span>`) },
    { title: '뜻', field: 'definition', minWidth: 220, widthGrow: 3, headerSort: false, tooltip: true, formatter: (c) => (c.getRow().getData().blinded ? '<span class="muted">비공개</span>' : mark(c.getValue() || '—', kw.current)) },
    // 제거됨(2026-10-03, 분류 삭제): 「분류」 열
    {
      title: '유사어',
      field: 'variants',
      minWidth: 200,
      widthGrow: 3,
      headerSort: false,
      formatter: (c) => {
        const list = c.getValue() || [];
        if (c.getRow().getData().blinded) return '<span class="muted">비공개</span>';
        if (!list.length) return '<span class="muted">등록된 유사어 없음</span>';
        const shown = list.slice(0, CHIP_MAX).map((v) => `<span class="tag">${mark(v.word, kw.current)}</span>`).join('');
        const more = list.length > CHIP_MAX ? `<span class="muted"> 외 ${list.length - CHIP_MAX}</span>` : '';
        return `<span class="chips">${shown}${more}</span>`;
      },
    },
  ], []);

  if (initialLoading) return <Loading />;
  const dash = (v) => (summaryFailed || v === null || v === undefined ? '—' : v);
  // 사전 자체가 비었는지(검색 결과 0건과 구분합니다 — 4.3 상태표)
  const emptyDictionary = !summaryFailed && summary?.termCnt === 0;

  const detailPanel = selectedId ? (
    <Card
      title={detail?.term || '용어 상세'}
      right={<Button label="닫기" size="sm" onPress={closeTerm} />}
      style={side ? { width: 360, flexShrink: 0 } : null}
    >
      {detailError ? <FormAlert tone="error">{detailError}</FormAlert> : null}
      {detail ? <TermDetail detail={detail} onPickTerm={openTerm} canManage={canManage} goManage={goManage} /> : null}
    </Card>
  ) : null;

  return (
    <View>
      <PageHead
        title="용어 사전 조회"
        desc="공식 용어와 현장에서 쓰는 유사어를 찾아봅니다."
        actions={
          <>
            {canManage ? <Button label="용어 사전 관리로 이동" size="sm" onPress={() => goManage()} /> : null}
            <ExportMenuButton
              viewCount={terms.length}
              totalCount={summary?.termCnt}
              onExportView={exportView}
              onExportAll={exportAll}
            />
          </>
        }
      />

      {/* 제거됨(2026-10-03, 분류 삭제): 「분류 n종」 카드 · 분류 칩 줄 · 분류 선택 */}
      <Grid cols={2}>
        <StatCard
          label="공식 용어"
          value={dash(summary?.termCnt)}
          unit="개"
          sub={summary?.lastChangedAt ? `최근 변경 ${String(summary.lastChangedAt).slice(0, 10)}` : '보고서 표기 기준'}
        />
        <StatCard label="유사어" value={dash(summary?.variantCnt)} unit="개" sub="현장에서 쓰는 말" />
      </Grid>
      <Gap />

      {loadErrors?.length ? (
        <>
          <FormAlert tone="error">{loadErrors.join('\n')}</FormAlert>
          <Gap size={12} />
        </>
      ) : null}

      <Hint>이 화면은 조회 전용입니다. 용어 추가·수정은 시스템관리 &gt; 용어 사전 관리에서 합니다.</Hint>
      <Gap size={12} />

      <Filters>
        <TextField
          label="검색"
          value={filters.keyword}
          onChangeText={setKeyword}
          onSubmitEditing={search}
          placeholder="공식 용어 · 뜻 · 유사어"
          style={{ minWidth: 220 }}
        />
        <Button label="조회" variant="primary" onPress={search} />
      </Filters>

      {!side && detailPanel ? (
        <>
          {detailPanel}
          <Gap />
        </>
      ) : null}

      <View style={{ flexDirection: side ? 'row' : 'column', gap: 16, alignItems: 'flex-start' }}>
        <Card
          title="용어 · 유사어"
          sub={`${itemsMeta?.total ?? terms.length}건 · 행을 누르면 상세를 봅니다${refreshing ? ' · 조회 중…' : ''}`}
          style={{ flex: 1, minWidth: 0, alignSelf: 'stretch' }}
        >
          {terms.length ? (
            <TabulatorGrid
              columns={columns}
              rows={terms}
              rowKey="termId"
              onRowClick={(row) => openTerm(row.termId)}
              tableOptions={TABLE_OPTIONS}
              // 검색은 서버가 합니다 — 머리글 검색칸은 현재 쪽만 걸러 오해를 부르므로 끕니다
              headerFilter={false}
              // 전부 받은 용어를 표가 50행씩 나눕니다(2026-10-04)
              pageSize={50}
              emptyText="검색 조건에 맞는 용어가 없습니다."
            />
          ) : emptyDictionary ? (
            <View style={{ gap: 8 }}>
              <EmptyState text="등록된 용어가 없습니다." />
              {canManage ? <Button label="용어 사전 관리로 이동" size="sm" onPress={() => goManage()} /> : null}
            </View>
          ) : (
            <EmptyState text="검색 조건에 맞는 용어가 없습니다. 검색어를 줄여 보세요." />
          )}
        </Card>
        {side ? detailPanel : null}
      </View>
    </View>
  );
}

/** 상세 패널 본문 */
function TermDetail({ detail, onPickTerm, canManage, goManage }) {
  const s = useCommonStyles();
  const theme = useTheme();
  // 가려진 용어(GLV-08)는 유사어·관련 용어도 보이지 않습니다
  const variants = detail.blinded ? [] : detail.variants || [];
  const related = detail.blinded ? [] : detail.relatedTerms || [];
  return (
    <View style={{ gap: 12 }}>
      <Text style={{ fontSize: 21, fontWeight: '700', color: theme.color.foreground }}>{detail.blinded ? '비공개 용어' : detail.term}</Text>
      <Text style={s.body}>{detail.blinded ? '데이터 접근 권한이 없어 내용을 표시하지 않습니다.' : detail.definition || '등록된 뜻이 없습니다.'}</Text>

      <Text style={s.eyebrow}>유사어</Text>
      {variants.length ? (
        <ChipRow>
          {variants.map((v) => (
            <View key={v.variantId ?? v.word} accessibilityLabel={`${v.word}${v.byName ? ` · 등록 ${v.byName}` : ''}`}>
              <SelectChip small label={v.word} sub={v.byName || ''} />
            </View>
          ))}
        </ChipRow>
      ) : (
        <Text style={s.caption}>등록된 유사어가 없습니다.</Text>
      )}

      {related.length ? (
        <>
          <Text style={s.eyebrow}>관련 용어</Text>
          <ChipRow>
            {related.map((r) => (
              <SelectChip key={r.termId} small label={r.term} onPress={() => onPickTerm(r.termId)} />
            ))}
          </ChipRow>
        </>
      ) : null}

      {detail.updatedAt ? <Text style={s.caption}>{`최근 수정 ${String(detail.updatedAt).slice(0, 10)}`}</Text> : null}
      {canManage ? (
        <Pressable onPress={() => goManage(detail.term)} accessibilityRole="link">
          <Text style={[s.caption, { color: theme.color.primary }]}>관리 화면에서 편집</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** formatter 가 HTML 문자열을 그리므로 사용자 입력은 반드시 이스케이프합니다 */
function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

/** 검색어를 대소문자 무시로 강조합니다 — 이스케이프한 뒤 처리합니다 */
function mark(value, keyword) {
  const text = esc(value);
  const k = esc(keyword || '').trim();
  if (!k) return text;
  const re = new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  return text.replace(re, (m) => `<mark>${m}</mark>`);
}
