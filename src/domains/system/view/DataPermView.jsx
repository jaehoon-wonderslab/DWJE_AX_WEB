/**
 * [View] SY-03 데이터 접근 권한 (경로: /system/data-perm · 화면 ID sys-data)
 *
 * 허용되지 않은 항목은 메뉴 접근이 가능하더라도 서버 응답에서 가려지고(값 null)
 * 화면·보고서·인쇄물·엑셀에는 「비공개」 로 보입니다. 체크는 누르는 즉시 저장됩니다(별도 저장 단계 없음).
 *
 * 2026-10-01 (기획 04 DTP-16·17·18)
 *  · 통합관리자 열은 전 권한, 미배정 열은 데이터 권한 0건 고정(잠금)
 *  · sys-data 쓰기 권한이 없으면 읽기 전용 — 체크·항목 관리의 저장·삭제가 꺼집니다(엑셀은 그대로)
 *  · 엑셀은 「조회 목록 / 전체」 두 범위
 * 사용 API — GET/PUT /api/v1/system/data-perms · /api/v1/system/data-fields/* (mapping 포함)
 *
 * 2026-10-07 — 항목 단위 권한(V82). 표를 「항목 × 부서」 하나로 바꿨습니다(ItemPermGrid).
 *  · 행 = 항목(화면에 보이는 이름), 출력 화면 열, 부서마다 열람 체크 — 묶음(종류) · [항목 관리] 단추 · 모달은 없습니다
 *  · 「제거됨」: DataFieldManager(항목 관리 모달) · DataPermGrid(종류 × 부서 표) — 파일은 남겨 둡니다(되살릴 수 있게)
 * 사용 API — GET /api/v1/system/data-perms · PUT /api/v1/system/data-fields/item-perms
 */
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import {
  Button, CardTabs, EmptyState, ExportMenuButton, FormAlert, Hint, Loading, SelectField, Table, TabulatorGrid, TextField, dateTimeHeaderFilter,
  openConfirmModal, openFormModal,
} from '@shared/components/ui';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { NO_WRITE_TEXT } from '../controller/useDataPermController';
import ItemPermGrid from './ItemPermGrid';

/**
 * 변경 이력 표 — 시각 · 대상 · 변경 내용 · 작업자 (DTP-10)
 * 2026-10-07: 「수행자」 → 「작업자」, 열마다 머리글 검색칸(시각은 직접 입력 + 달력), 전량을 받아 쪽 나누기
 */
const LOG_COLUMNS = [
  { title: '시각', field: 'ts', minWidth: 210, headerSort: false, ...dateTimeHeaderFilter() },
  { title: '대상', field: 'targetLabel', minWidth: 160, headerSort: false },
  { title: '변경 내용', field: 'detailLabel', minWidth: 300, headerSort: false, formatter: 'textarea' },
  { title: '작업자', field: 'byLabel', minWidth: 150, headerSort: false },
];
/** 변경 이력 표시 건수 — 10 · 25 · 50 · 100, 기본 50 */
const LOG_PAGE_SIZES = [10, 25, 50, 100];
const LOG_PAGE_SIZE = 50;
/** 탭 — 값은 시험에서 쓰는 이름입니다(2026-10-02 표 · 이력을 탭으로 나눔) */
const TAB_MATRIX = 'matrix';
const TAB_LOGS = 'logs';
const TAB_FOUND = 'found';

export default function DataPermView({
  loading, loadError, readOnly, busy, depts, lockReason,
  items, itemCell, toggleItem, offTableOf,
  foundRows = [], foundNewCount = 0, foundReady = true, foundLoading = false, addFoundToItem, createFoundItem, ignoreFound,
  logs, logsLoading, logsError,
  viewCount, exportView, exportAll, reload,
}) {
  const [tab, setTab] = useState(TAB_MATRIX);
  const s = useCommonStyles();

  if (loading) return <Loading />;

  /** 탭 머리 오른쪽 — 그 탭에 쓰는 단추만 둡니다(예전 머리말·카드 오른쪽 단추를 옮김) */
  const tabActions = {
    [TAB_MATRIX]: (
      <>
        {busy ? <Text style={s.textXs}>저장 중…</Text> : null}
        <ExportMenuButton viewCount={viewCount} onExportView={exportView} onExportAll={exportAll} />
        {/* [항목 관리] 단추는 뺐습니다(2026-10-07) — 이 표에서 항목마다 부서를 바로 정합니다 */}
      </>
    ),
    // [보안 감사 로그에서 더 보기] 는 뺐습니다(2026-10-07)
    [TAB_LOGS]: null,
  };

  return (
    <View>
      {/* 머리말 설명과 [메뉴 접근 권한] 단추는 뺐습니다(2026-10-02) */}
      <PageHead title="데이터 접근 권한" />

      {readOnly ? (
        <>
          <FormAlert tone="info">{`읽기 전용 — ${NO_WRITE_TEXT} 엑셀 다운로드는 그대로 쓸 수 있습니다.`}</FormAlert>
          <Gap size={12} />
        </>
      ) : null}

      {/* 체크는 누르는 즉시 서버에 저장됩니다 — 따로 저장하는 단계가 없어 「변경 저장」 버튼을 두지 않습니다 */}
      {/* 한 줄 안내 대신 동작 방식을 풀어 씁니다(2026-10-07 「사람이 이해하기 어려운 구조」 피드백) */}
      <DataPermGuide />

      <Gap size={20} />
      <CardTabs
        id="data-perm"
        value={tab}
        onChange={setTab}
        items={[
          { value: TAB_MATRIX, label: '부서별 데이터 접근 권한 관리', icon: 'shield', count: viewCount },
          { value: TAB_LOGS, label: '최근 변경 이력', icon: 'history', count: logsLoading ? undefined : logs.length },
          { value: TAB_FOUND, label: '새로 발견된 응답 데이터', icon: 'search', count: foundNewCount || undefined },
        ]}
        right={tabActions[tab]}
      >
        {tab === TAB_MATRIX && foundNewCount ? (
          <View style={{ marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <FormAlert tone="info" style={{ flex: 1 }}>{`처리하지 않은 새 응답 데이터가 ${foundNewCount}개 있습니다. 처리하기 전까지 모든 부서에 보입니다.`}</FormAlert>
            <Button label="확인하기" size="sm" onPress={() => setTab(TAB_FOUND)} />
          </View>
        ) : null}
        {tab === TAB_FOUND ? (
          <FoundPanel
            rows={foundRows} ready={foundReady} loading={foundLoading} readOnly={readOnly} items={items}
            addFoundToItem={addFoundToItem} createFoundItem={createFoundItem} ignoreFound={ignoreFound}
          />
        ) : null}
        {tab === TAB_MATRIX ? (
          loadError ? (
            <View style={{ gap: 10 }}>
              <FormAlert>{loadError}</FormAlert>
              <View style={{ flexDirection: 'row' }}><Button label="다시 시도" size="sm" icon="refresh" onPress={reload} /></View>
            </View>
          ) : !items.length ? (
            <EmptyState text="항목이 없습니다." />
          ) : (
            <ItemPermGrid items={items} depts={depts} itemCell={itemCell} lockReason={lockReason} toggleItem={toggleItem} offTableOf={offTableOf} />
          )
        ) : null}
        {tab === TAB_LOGS ? (
          // 「최근 20건」 부제 · 열 너비 안내는 뺐습니다(2026-10-07)
          logsError ? <FormAlert>{logsError}</FormAlert> : logsLoading ? <Loading /> : (
            <TabulatorGrid
              autoWidth
              fillWidth
              widthHint={false}
              bordered
              pageSize={LOG_PAGE_SIZE}
              pageSizes={LOG_PAGE_SIZES}
              rows={logs}
              rowKey="_key"
              columns={LOG_COLUMNS}
              emptyText="변경 이력이 없습니다."
            />
          )
        ) : null}
      </CardTabs>
    </View>
  );
}

/** 항목 지정 창의 「+ 새 항목」 값 */
const NEW_ITEM = '__new__';

/** 항목 지정 목록에 한 번에 그리는 줄 수 — 더 많으면 검색으로 좁히게 안내합니다 */
const ASSIGN_LIST_MAX = 30;

/**
 * 항목 지정 칸 — 검색 + 고르기 목록(2026-10-08 「선택 상자가 너무 길어 찾기 힘듦」 피드백으로 선택 상자를 바꿈).
 *  · 맨 위 「+ 새 항목」 · 추천 항목은 늘 보이고, 그 아래 기존 항목은 검색어(항목 이름 · 다른 이름 · API 키)로 거릅니다
 *  · 항목마다 나오는 화면을 함께 보여 같은 이름의 다른 항목과 구별합니다. 목록은 상자 안에서 스크롤
 * value = { item: 항목 id | NEW_ITEM, name: 새 항목 이름 }
 */
function ItemAssignField({ row, items, value = {}, onChange }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const [q, setQ] = useState('');
  const isNew = value.item === NEW_ITEM;
  const picked = items.find((it) => it.id === value.item);
  const word = q.trim().toLowerCase();
  const hits = items
    .filter((it) => it.id !== row.suggest?.id)
    // 화면 이름까지 찾으면 「불량」 이 「불량 현황 조회」 화면의 모든 항목에 걸립니다 — 항목 이름 · 다른 이름 · API 키만 찾습니다
    .filter((it) => !word || [it.name, ...it.titles, ...it.selectable].some((t) => String(t).toLowerCase().includes(word)));
  const shown = hits.slice(0, ASSIGN_LIST_MAX);
  const pick = (id) => onChange({ ...value, item: id });

  const Option = ({ id, title, sub, testId }) => {
    const on = value.item === id;
    return (
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ checked: on }}
        accessibilityLabel={testId || title}
        onPress={() => pick(id)}
        style={{
          flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8,
          backgroundColor: on ? theme.alpha('primary', 0.08) : 'transparent',
        }}
      >
        <View style={{ width: 15, height: 15, borderRadius: 99, borderWidth: on ? 4.5 : 1, borderColor: on ? theme.color.primary : theme.hairlineStrong }} />
        <View style={{ flex: 1 }}>
          <Text style={[s.textSm, on && { fontWeight: '700' }]}>{title}</Text>
          {sub ? <Text style={s.textXs} numberOfLines={1}>{sub}</Text> : null}
        </View>
      </Pressable>
    );
  };
  const screensOf = (it) => (it.screens.length ? it.screens.join(' · ') : '화면 표에 없음');

  return (
    <View nativeID="item-assign" style={{ gap: 10 }}>
      <TextField value={q} onChangeText={setQ} placeholder="항목 이름 · API 키 검색" accessibilityLabel="항목 검색" />
      <View style={{ maxHeight: 300, borderWidth: 1, borderColor: theme.color.border, borderRadius: 10 }}>
        <ScrollView style={{ maxHeight: 300 }} contentContainerStyle={{ padding: 4 }}>
          <Option id={NEW_ITEM} title={`+ 새 항목${row.label ? `: ${row.label}` : ''}`} sub="표에 새 항목을 만듭니다" testId="새 항목" />
          {row.suggest ? <Option id={row.suggest.id} title={`${row.suggest.name} (추천)`} sub={screensOf(row.suggest)} /> : null}
          {shown.map((it) => <Option key={it.id} id={it.id} title={it.name} sub={screensOf(it)} />)}
          {!hits.length && word ? <Text style={[s.textXs, { padding: 10 }]}>찾는 항목이 없습니다. 새 항목으로 만들 수 있습니다.</Text> : null}
          {hits.length > shown.length ? <Text style={[s.textXs, { padding: 10 }]}>{`${hits.length}개 중 ${shown.length}개를 보이고 있습니다. 검색어로 좁혀 주세요.`}</Text> : null}
        </ScrollView>
      </View>
      {isNew ? (
        <TextField
          value={value.name || ''}
          onChangeText={(t) => onChange({ ...value, name: t })}
          placeholder="예) 재작업 건수"
          accessibilityLabel="새 항목 이름"
        />
      ) : null}
      <Text style={s.textSm}>
        {isNew
          ? '표에 새 항목이 생깁니다.\n모든 부서가 보는 상태로 시작하니, 숨길 부서의 체크를 끄세요.'
          : picked
            // 「줄」 → 「항목」(2026-10-08). 「그 항목의 부서 설정을 그대로 따르고 …」 문장은 같은 날 피드백으로 뺐습니다
            ? `「${picked.name}」 항목에 함께 들어갑니다.`
            : '항목을 고르세요.'}
      </Text>
    </View>
  );
}

/**
 * 「새로 발견된 응답 데이터」 탭(2026-10-08, V83)
 *
 * 서버가 업무 데이터 응답에서 찾은, 아직 어느 항목에도 등록되지 않은 응답 값 이름입니다(값은 저장하지 않음).
 * 처리하기 전까지 모든 부서에 보입니다. 이름마다 하나를 고릅니다.
 *  · 항목 지정 — 기존 항목을 고르면 그 항목의 부서 설정을 그대로 따르고(같은 줄에서 함께 정함),
 *                「+ 새 항목」 을 고르면 이름을 붙여 새 줄을 만듭니다(모든 부서 열람으로 시작, 표에서 숨길 부서를 끔).
 *                두 단추([항목에 넣기] · [새 항목])를 2026-10-08 하나로 합쳤습니다
 *  · 가리지 않음 — 통제할 필요가 없는 값. 다시 알리지 않습니다(「가리지 않음」 보기에서 되돌림)
 * 공용 키(value · rate …)는 화면마다 뜻이 달라 항목에 넣을 수 없어 「가리지 않음」 만 고릅니다.
 */
function FoundPanel({ rows, ready, loading, readOnly, items, addFoundToItem, createFoundItem, ignoreFound }) {
  const s = useCommonStyles();
  const [view, setView] = React.useState('NEW');
  const list = rows.filter((r) => r.status === view);
  const fmt = (v) => (v ? String(v).replace('T', ' ').slice(0, 16) : '—');
  const pickable = items.filter((it) => it.selectable.length);

  /**
   * 항목 지정 — 기존 항목에 넣기와 새 항목 만들기를 한 창에서 고릅니다(2026-10-08 「두 기능이 같아 보임」 피드백).
   * 선택 상자: 추천 항목 → 기존 항목 → 맨 끝 「+ 새 항목」. 고른 것에 따라 안내와 이름 칸이 바뀝니다.
   */
  const askAssign = (r) => openFormModal({
    title: `항목 지정 — ${r.attrName}`,
    // 문장마다 줄을 바꿉니다(2026-10-08)
    sub: '이 응답 데이터를 어느 항목으로 관리할지 고릅니다.\n부서 체크는 항목(표의 한 줄) 단위입니다.',
    fields: [{
      key: 'pick', label: '항목', type: 'custom', full: true,
      render: ({ value, onChange }) => <ItemAssignField row={r} items={pickable} value={value} onChange={onChange} />,
    }],
    initial: { pick: { item: r.suggest?.id || NEW_ITEM, name: r.label || '' } },
    validate: (v) => {
      const p = v?.pick || {};
      if (p.item !== NEW_ITEM) return pickable.some((it) => it.id === p.item) ? {} : { pick: '항목을 고르세요.' };
      const nm = String(p.name || '').trim();
      if (!nm) return { pick: '새 항목 이름을 입력해 주세요.' };
      return nm.length > 50 ? { pick: '항목 이름은 50자 이내로 입력해 주세요.' } : {};
    },
    submitLabel: '지정',
    onSubmit: async (v) => {
      const p = v.pick || {};
      const res = p.item === NEW_ITEM
        ? await createFoundItem(r.attrName, p.name)
        : await addFoundToItem(r.attrName, pickable.find((x) => x.id === p.item));
      return res?.ok !== false;
    },
  });
  const askIgnoreAll = () => openConfirmModal({
    title: '모두 가리지 않음',
    message: `처리 전 응답 데이터 ${list.length}개를 모두 「가리지 않음」 으로 둡니다.\n다시 알리지 않으며, 「가리지 않음」 보기에서 하나씩 되돌릴 수 있습니다.`,
    confirmLabel: `${list.length}개 가리지 않음`,
    onConfirm: () => ignoreFound(list.map((r) => r.attrName), true),
  });

  if (!ready) return <FormAlert tone="info">발견 기록표가 아직 없습니다(DB V83 미적용). 적용하면 서버가 업무 응답에서 등록되지 않은 값 이름을 찾아 여기에 보입니다.</FormAlert>;
  if (loading) return <Loading />;
  return (
    <View nativeID="data-perm-found" style={{ gap: 12 }}>
      <Hint>
        {/* 문장마다 줄을 바꿉니다(2026-10-08 피드백) */}
        {'서버가 업무 데이터 응답에서 찾은, 아직 어느 항목에도 등록되지 않은 응답 데이터 이름입니다(값은 저장하지 않습니다).\n'}
        {'처리하기 전까지 모든 부서에 보입니다.'}
        {/* 「항목 지정 …」 「가리지 않음 …」 설명은 「관리」 머리글 도움말로 옮겼습니다(2026-10-08 피드백) */}
      </Hint>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
        <SelectField
          nativeSelect label="보기" value={view} onChange={setView} style={{ minWidth: 220 }}
          options={[{ value: 'NEW', label: `처리 전 (${rows.filter((r) => r.status === 'NEW').length})` }, { value: 'IGNORED', label: `가리지 않음 (${rows.filter((r) => r.status === 'IGNORED').length})` }]}
        />
        {/* 옆 「보기」 선택 상자(높이 38)와 같은 높이(2026-10-08 피드백) */}
        {view === 'NEW' && list.length && !readOnly ? <Button label={`목록 모두 가리지 않음 (${list.length})`} onPress={askIgnoreAll} style={{ height: 38 }} /> : null}
      </View>
      <Table
        minWidth={1150}
        bordered
        filterable
        pageSize={50}
        rows={list}
        keyExtractor={(r) => r.attrName}
        emptyText={view === 'NEW' ? '처리할 새 응답 데이터가 없습니다.' : '가리지 않음으로 둔 응답 데이터가 없습니다.'}
        columns={[
          {
            key: 'attrName', title: '응답 데이터 이름', minWidth: 160, flex: 1, filterable: true, filterField: 'attrName',
            render: (r) => (
              <View>
                <Text style={[s.textSm, { fontWeight: '600' }]}>{r.attrName}</Text>
                {r.generic ? <Text style={s.textXs}>공용 키 — 화면마다 뜻이 달라 항목에 넣을 수 없음</Text> : null}
              </View>
            ),
          },
          {
            // 화면에서 그 값에 붙은 이름표(카드 label · 차트 계열 이름 · 유형별 열) — 새 항목 이름으로 제안합니다(2026-10-08)
            key: 'label', title: '항목명(제안)', minWidth: 160, flex: 1, filterable: true, filterField: 'label',
            render: (r) => (
              <View>
                <Text style={s.textSm}>{r.label || '—'}</Text>
                {r.where ? <Text style={s.textXs}>{r.where}</Text> : null}
              </View>
            ),
          },
          {
            key: 'screens', title: '나온 화면', minWidth: 180, flex: 1.2, sortable: false,
            render: (r) => <View>{(r.screens.length ? r.screens : r.apiPaths).map((t) => <Text key={t} style={s.textXs}>{t}</Text>)}</View>,
          },
          { key: 'firstSeenAt', title: '처음 발견', width: 135, render: (r) => <Text style={s.textXs}>{fmt(r.firstSeenAt)}</Text> },
          { key: 'lastSeenAt', title: '마지막 발견', width: 135, render: (r) => <Text style={s.textXs}>{fmt(r.lastSeenAt)}</Text> },
          { key: 'suggest', title: '추천 항목', width: 120, sortable: false, render: (r) => <Text style={s.textXs}>{r.suggest?.name || '—'}</Text> },
          {
            // 「처리」 → 「관리」 + 도움말(2026-10-08 피드백 — 안내 상자에서 옮김)
            key: 'act', title: '관리', width: 200, align: 'center', sortable: false, filterable: false,
            help: '항목 지정: 같은 뜻의 기존 항목을 고르면, 선택한 항목의 부서 설정을 함께 따르고, 「+ 새 항목」 을 고르면 새 항목이 생깁니다(모든 부서 보임).\n가리지 않음: 통제할 필요가 없는 값으로 변경합니다. 가리지 않음 항목으로 이동합니다.',
            render: (r) => (view === 'IGNORED' ? (
              <Button label="되돌리기" size="sm" variant="ghost" disabled={readOnly} onPress={() => ignoreFound([r.attrName], false)} />
            ) : (
              <View style={{ flexDirection: 'row', gap: 4, justifyContent: 'center', flexWrap: 'wrap' }}>
                {!r.generic ? <Button label="항목 지정" size="sm" variant="ghost" disabled={readOnly} onPress={() => askAssign(r)} /> : null}
                <Button label="가리지 않음" size="sm" variant="ghost" disabled={readOnly} onPress={() => ignoreFound([r.attrName], true)} />
              </View>
            )),
          },
        ]}
      />
    </View>
  );
}

/**
 * 이 화면이 하는 일 — 처음 보는 관리자가 표를 읽을 수 있게 네 줄로 풀어 둡니다(2026-10-07)
 *  · 행(데이터 항목) = 함께 가릴 값 묶음, 열(부서) = 누가 볼 수 있나, 체크 = 볼 수 있음
 */
function DataPermGuide() {
  const lines = [
    ['표의 행', '「항목」 은 화면에 보이는 값의 이름입니다. 같은 항목이 여러 화면에 나오면 「출력 화면」 칸에 모두 적힙니다.'],
    ['부서 칸 체크', '체크한 부서의 사람은 그 항목을 그대로 봅니다. 체크를 끄면 그 부서 사람에게는 모든 출력 화면 · 엑셀 · 인쇄물에서 「●●●● 비공개」 로 보입니다.'],
    ['저장', '체크는 누르는 즉시 저장됩니다. 다른 사람의 화면에는 그 화면을 다시 열 때 반영됩니다.'],
    ['가릴 수 없는 항목', '화면마다 다른 값을 담는 공용 키, 로그인 · 권한에 쓰는 시스템 값은 체크할 수 없습니다. 메뉴(화면) 자체를 막으려면 메뉴 접근 권한 화면을 씁니다.'],
  ];
  return (
    <View nativeID="data-perm-guide">
      <Hint>
        {lines.map(([head, body], i) => (
          <Text key={head}>
            {i ? '\n' : ''}
            <Text style={{ fontWeight: '700' }}>{head}</Text>
            {`  ${body}`}
          </Text>
        ))}
      </Hint>
    </View>
  );
}
