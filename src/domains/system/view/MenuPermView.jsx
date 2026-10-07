/**
 * [View] SY-02 메뉴 접근 권한 (경로: /system/menu-perm · 화면 ID sys-menu)
 *
 * 부서마다 화면별 「접근」 권한을 지정합니다(2026-10-03 조회/쓰기 통합). 접근할 수 있으면 그 화면의 모든 동작을
 * 허용합니다(미배정 계정만 쓰기 불가). 바꾸면 그 부서에 속한 계정의 좌측 메뉴가 다음 요청부터 바뀌고,
 * 권한이 없는 화면은 주소로 직접 접근해도 차단됩니다.
 *  · 통합관리자 열은 전 권한, 미배정 열은 대시보드·덕반장 AI·질의 이력 조회 전용으로 고정(변경 불가)
 *  · 관리 화면 5종(계정 관리·메뉴 접근 권한·데이터 접근 권한·그룹웨어 부서 매핑·전사 자연어 질의 이력)은 통합관리자만 바꿉니다
 *  · 미배정 계정이면 읽기 전용입니다(엑셀 다운로드는 그대로)
 * 사용 API — GET/PUT /api/v1/system/menu-perms · PUT …/group · POST …/copy(미리보기·실행)
 */
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import {
  Button, CardTabs, EmptyState, ExportMenuButton, FormAlert, Loading, TabulatorGrid, openConfirmModal, openFormModal,
} from '@shared/components/ui';
import { useAppNavigation } from '@shared/hooks/useAppNavigation';
import { useUiStore } from '@shared/stores/useUiStore';
import { useCommonStyles } from '@shared/theme/styles';
import { NO_WRITE_TEXT } from '../controller/useMenuPermController';
// 부서 권한 복사 폼은 2026-10-07 「부서 추가」 로 바꾸며 쓰지 않습니다(파일은 되살릴 수 있게 남겨 둠)
import MenuPermGrid from './MenuPermGrid';

/** 변경 이력 표 — 시각 · 대상 · 변경 내용 · 수행자 (좁은 화면은 표 안에서 가로 스크롤) */
const LOG_COLUMNS = [
  { title: '시각', field: 'ts', minWidth: 160, headerSort: false },
  { title: '대상', field: 'targetLabel', minWidth: 220, headerSort: false },
  { title: '변경 내용', field: 'detailLabel', minWidth: 320, headerSort: false, formatter: 'textarea' },
  { title: '수행자', field: 'byLabel', minWidth: 150, headerSort: false },
];

/** 변경 이력 한 쪽 건수 — 전량을 받아 표에서 쪽을 나눕니다(2026-10-07). 표시 건수는 10 · 25 · 50 · 100 중에서 고릅니다 */
const LOG_PAGE_SIZES = [10, 25, 50, 100];
const LOG_PAGE_SIZE = 25;

/** 탭 — 값은 시험에서 쓰는 이름입니다(2026-10-02 「부서 × 화면」 · 「최근 변경 이력」 을 탭으로 나눔) */
const TAB_MATRIX = 'matrix';
const TAB_LOGS = 'logs';

export default function MenuPermView({
  loading, loadError, reload, busy, readOnly, isSuperAdmin, screens, depts, collapsed, toggleCollapsed,
  cellValue, lockReason, cellWarn, groupLockReason, grantCounts,
  planToggle, applyToggle, toggleGroup, addDeptOptions, createDept,
  viewCount, totalCount, exportView, exportAll,
  grantsOf, logs, logsLoading, logsError,
}) {
  const s = useCommonStyles();
  const { goToScreen } = useAppNavigation();
  const openModal = useUiStore((state) => state.openModal);
  const [tab, setTab] = useState(TAB_MATRIX);

  /** 칸 변경 — 확인이 필요한 변경(관리 화면·하위 화면이 있는 상위 해제)은 확인 창을 거칩니다 */
  const onToggle = (screenId, deptId) => {
    const plan = planToggle(screenId, deptId);
    if (!plan) return;
    if (!plan.confirm) { applyToggle(plan); return; }
    if (!plan.children?.length) { openConfirmModal({ ...plan.confirm, onConfirm: () => applyToggle(plan) }); return; }
    // 하위 화면이 있는 상위 화면 끄기 — 「이 화면만」 / 「함께 끄기」 (MNP-10)
    openModal({
      title: plan.confirm.title,
      render: () => <Text style={s.text}>{plan.confirm.message}</Text>,
      footer: (close) => (
        <>
          <Button label="취소" onPress={close} />
          <Button label="이 화면만 끄기" onPress={() => { close(); applyToggle(plan); }} />
          <Button label="함께 끄기" variant="danger" onPress={() => { close(); applyToggle(plan, { withChildren: true }); }} />
        </>
      ),
    });
  };

  /** 부서 추가 — 부서명 · 설명 · 초기 권한(복사해 올 부서). 추가한 부서는 표에 새 열로 나타납니다 */
  const openAddDeptForm = () =>
    openFormModal({
      title: '부서 추가',
      initial: { deptNm: '', desc: '', initPermFrom: '' },
      fields: [
        { key: 'deptNm', label: '부서명', required: true, full: true, placeholder: '예) 공정기술팀' },
        { key: 'desc', label: '설명', full: true, placeholder: '예) 공정 조건 · 금형 관리' },
        { key: 'initPermFrom', label: '초기 권한 (복사해 올 부서)', type: 'select', full: true, options: addDeptOptions },
      ],
      note: '초기 권한을 고르면 그 부서의 메뉴 접근 권한을 그대로 복사해 시작합니다.\n데이터 접근 권한은 데이터 접근 권한 화면에서 따로 지정하세요.',
      submitLabel: '추가',
      onSubmit: async (v) => !!(await createDept(v))?.ok,
    });

  /** 개인 허용 명단 (MNP-06) — 명단이 없는 응답(sys-account 만 가진 계정)이면 건수만 알립니다 */
  const showGrants = (screenId) => {
    const screen = screens.find((x) => x.id === screenId);
    const list = grantsOf(screenId);
    openModal({
      title: `개인 허용 — ${screen?.label || screen?.name || screenId}`,
      sub: '부서 권한과 별개로 계정 관리에서 이 화면을 추가로 허용한 계정입니다. 회수는 계정 관리에서 합니다.',
      render: () => (
        list === null ? (
          <Text style={s.text}>{`${grantCounts[screenId] || 0}명이 개인 허용을 받았습니다. 명단은 메뉴 접근 권한 화면 권한이 있을 때만 보입니다.`}</Text>
        ) : (
          <View style={{ gap: 6 }}>
            {list.map((g) => (
              <Text key={g.empNo} style={s.textSm}>
                {`${g.name || '-'} (${g.empNo}) · ${depts.find((d) => String(d.id) === String(g.deptId))?.name || '-'}`}
              </Text>
            ))}
            {!list.length ? <Text style={s.textSm}>명단이 없습니다.</Text> : null}
          </View>
        )
      ),
      footer: (close) => (
        <>
          <Button label="계정 관리로 이동" onPress={() => { close(); goToScreen('sys-account'); }} />
          <Button label="닫기" variant="primary" onPress={close} />
        </>
      ),
    });
  };

  if (loading) return <Loading />;

  /** 탭 머리 오른쪽 — 그 탭의 표에 쓰는 단추만 둡니다(예전 머리말·카드 오른쪽 단추를 옮김) */
  const tabActions = {
    [TAB_MATRIX]: (
      <>
        {busy ? <Text style={s.textXs}>저장 중…</Text> : null}
        <ExportMenuButton viewCount={viewCount} totalCount={totalCount} onExportView={exportView} onExportAll={exportAll} />
        <Button label="부서 추가" size="sm" variant="primary" icon="plus" disabled={busy || readOnly} onPress={openAddDeptForm} />
      </>
    ),
    // 「보안 감사 로그에서 더 보기」 는 뺐습니다(2026-10-07)
    [TAB_LOGS]: null,
  };
  /** 탭 내용 첫 줄 — 예전 카드 부제 */
  const tabSub = {
    [TAB_MATRIX]: '메뉴 그룹 이름 앞의 꺾쇠 단추로 펼치거나 접습니다. 그룹 일괄 변경은 접힌 화면을 포함한 그룹 전체(동작 행 제외)에 적용됩니다.',
    // 「메뉴 접근 권한 변경 최근 20건」 은 뺐습니다(2026-10-07) — 표에서 쪽을 나눕니다
  };

  return (
    <View>
      <PageHead
        title="부서별 메뉴 접근 권한"
        // 문장마다 줄을 바꿉니다(2026-10-07). 머리말의 「계정 관리」 · 「데이터 접근 권한」 이동 단추는 뺐습니다
        desc={'부서별로 화면마다 접근 권한을 지정합니다.\n접근할 수 있으면 그 화면의 모든 동작을 쓸 수 있습니다.\n부서 기본 권한을 변경하며, 계정별 추가 허용 메뉴는 계정 관리에서 별도로 설정합니다.'}
      />

      {readOnly ? (
        <>
          <FormAlert tone="info">{`읽기 전용 — ${NO_WRITE_TEXT} 엑셀 다운로드는 그대로 쓸 수 있습니다.`}</FormAlert>
          <Gap size={12} />
        </>
      ) : null}

      {/* 요약 카드 4종과 안내 상자는 뺐습니다(2026-10-07) */}
      <Gap size={20} />
      <CardTabs
        id="menu-perm"
        value={tab}
        onChange={setTab}
        items={[
          { value: TAB_MATRIX, label: '부서별 메뉴 접근 권한', icon: 'grid', count: screens.length },
          { value: TAB_LOGS, label: '최근 변경 이력', icon: 'history', count: logsLoading ? undefined : logs.length },
        ]}
        right={tabActions[tab]}
      >
        {tabSub[tab] ? <Text style={[s.textSm, { marginBottom: 12 }]}>{tabSub[tab]}</Text> : null}
        {tab === TAB_MATRIX ? (
          loadError ? (
            <View style={{ gap: 10 }}>
              <FormAlert>{loadError}</FormAlert>
              <View style={{ flexDirection: 'row' }}><Button label="다시 시도" size="sm" icon="refresh" onPress={reload} /></View>
            </View>
          ) : !screens.length || !depts.length ? (
            <EmptyState text="화면 또는 부서가 없습니다 — DB 화면 행(ax.tb_sys_menu)을 확인하세요" />
          ) : (
            <MenuPermGrid
              screens={screens}
              depts={depts}
              collapsed={collapsed}
              toggleCollapsed={toggleCollapsed}
              cellValue={cellValue}
              lockReason={lockReason}
              cellWarn={cellWarn}
              groupLockReason={groupLockReason}
              grantCounts={grantCounts}
              onToggle={onToggle}
              onToggleGroup={toggleGroup}
              onShowGrants={showGrants}
            />
          )
        ) : null}
        {tab === TAB_LOGS ? (
          logsError ? <FormAlert>{logsError}</FormAlert> : logsLoading ? <Loading /> : (
            <TabulatorGrid
              autoWidth
              fillWidth
              widthHint={false}
              bordered
              headerFilter={false}
              pageSize={LOG_PAGE_SIZE}
              pageSizes={LOG_PAGE_SIZES}
              rows={logs}
              rowKey="_key"
              emptyText="변경 이력이 없습니다."
              columns={LOG_COLUMNS}
            />
          )
        ) : null}
      </CardTabs>
    </View>
  );
}
