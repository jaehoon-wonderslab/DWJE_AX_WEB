/**
 * [View] SY-02 메뉴 접근 권한 (경로: /system/menu-perm · 화면 ID sys-menu)
 *
 * 부서마다 화면별 「조회」·「쓰기」 권한을 지정합니다(2026-10-01 R-06). 바꾸면 그 부서에 속한 계정의
 * 좌측 메뉴와 저장 버튼이 다음 요청부터 바뀌고, 권한이 없는 화면은 주소로 직접 접근해도 차단됩니다.
 *  · 통합관리자 열은 전 권한, 미배정 열은 대시보드·덕반장 AI·질의 이력 조회 전용으로 고정(변경 불가)
 *  · 관리 화면 4종(계정 관리·메뉴 접근 권한·데이터 접근 권한·그룹웨어 부서 매핑)은 통합관리자만 바꿉니다
 *  · sys-menu 쓰기 권한이 없으면 읽기 전용입니다(엑셀 다운로드는 그대로)
 * 사용 API — GET/PUT /api/v1/system/menu-perms · PUT …/group · POST …/copy(미리보기·실행)
 */
import React from 'react';
import { Text, View } from 'react-native';
import Grid, { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import {
  Button, Card, EmptyState, ExportMenuButton, FormAlert, Hint, Loading, StatCard, TabulatorGrid, openConfirmModal,
} from '@shared/components/ui';
import { useAppNavigation } from '@shared/hooks/useAppNavigation';
import { useUiStore } from '@shared/stores/useUiStore';
import { useCommonStyles } from '@shared/theme/styles';
import { NO_WRITE_TEXT } from '../controller/useMenuPermController';
import MenuPermCopyForm from './MenuPermCopyForm';
import MenuPermGrid from './MenuPermGrid';

/** 변경 이력 표 — 시각 · 대상 · 변경 내용 · 수행자 (좁은 화면은 표 안에서 가로 스크롤) */
const LOG_COLUMNS = [
  { title: '시각', field: 'ts', minWidth: 160, headerSort: false },
  { title: '대상', field: 'targetLabel', minWidth: 220, headerSort: false },
  { title: '변경 내용', field: 'detailLabel', minWidth: 320, headerSort: false, formatter: 'textarea' },
  { title: '수행자', field: 'byLabel', minWidth: 150, headerSort: false },
];

export default function MenuPermView({
  loading, loadError, reload, busy, readOnly, isSuperAdmin, screens, depts, collapsed, toggleCollapsed,
  cellValue, lockReason, cellWarn, groupLockReason, grantCounts, myDept, myCount, myWriteCount, avgCount,
  planToggle, applyToggle, toggleGroup, copyOptions, screenLabel, previewCopy, executeCopy,
  viewCount, totalCount, exportView, exportAll,
  grantsOf, logs, logsLoading, logsError, canSeeAudit,
}) {
  const s = useCommonStyles();
  const { goToScreen } = useAppNavigation();
  const openModal = useUiStore((state) => state.openModal);

  /** 칸 변경 — 확인이 필요한 변경(조회 해제·관리 화면)은 확인 창을 거칩니다 */
  const onToggle = (screenId, deptId, perm) => {
    const plan = planToggle(screenId, deptId, perm);
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

  /** 부서 권한 복사 — 미리보기 → 확인 → 복사 */
  const openCopyForm = () =>
    openModal({
      title: '부서 권한 복사',
      sub: '한 부서의 메뉴 접근 권한(조회·쓰기)을 다른 부서에 그대로 적용합니다. 먼저 미리보기로 바뀌는 내용을 확인합니다.',
      maxWidth: 640,
      render: (close) => (
        <MenuPermCopyForm
          options={copyOptions}
          screenLabel={screenLabel}
          isSuperAdmin={isSuperAdmin}
          previewCopy={previewCopy}
          executeCopy={executeCopy}
          close={close}
        />
      ),
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
                {`${g.name || '-'} (${g.empNo}) · ${depts.find((d) => String(d.id) === String(g.deptId))?.name || '-'}${g.write ? ' · 쓰기 포함' : ''}`}
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

  const menuCnt = screens.filter((r) => !r.sub && !r.action).length;
  const subCnt = screens.filter((r) => r.sub && !r.action).length;
  const actionCnt = screens.filter((r) => r.action).length;
  const userTotal = depts.reduce((n, d) => n + Number(d.userCnt || 0), 0);

  return (
    <View>
      <PageHead
        title="메뉴 접근 권한"
        desc="부서별로 화면마다 조회·쓰기 권한을 지정합니다. 부서 기본 권한을 변경하며, 계정별 추가 허용 메뉴는 계정 관리에서 별도로 설정합니다."
        actions={
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <ExportMenuButton viewCount={viewCount} totalCount={totalCount} onExportView={exportView} onExportAll={exportAll} />
            <Button label="계정 관리" size="sm" icon="users" onPress={() => goToScreen('sys-account')} />
            <Button label="데이터 접근 권한" size="sm" icon="eyeOff" onPress={() => goToScreen('sys-data')} />
            <Button label="부서 권한 복사" size="sm" variant="primary" icon="copy" disabled={busy || readOnly || !depts.length} onPress={openCopyForm} />
          </View>
        }
      />

      {readOnly ? (
        <>
          <FormAlert tone="info">{`읽기 전용 — ${NO_WRITE_TEXT} 엑셀 다운로드는 그대로 쓸 수 있습니다.`}</FormAlert>
          <Gap size={12} />
        </>
      ) : null}

      <Grid cols={4}>
        <StatCard label="관리 대상 화면" value={screens.length} unit="개" sub={`메뉴 ${menuCnt} · 하위 ${subCnt} · 동작 ${actionCnt}`} />
        <StatCard label="부서" value={depts.length} unit="개" sub={`계정 ${userTotal.toLocaleString('ko-KR')}명`} />
        <StatCard label="내 부서 접근" value={myCount} unit="개" sub={`${myDept || '—'} · 쓰기 ${myWriteCount}`} />
        <StatCard label="부서 평균" value={avgCount} unit="개" sub="시스템 부서·빈 부서 제외" />
      </Grid>
      <Gap />

      <Hint>
        {'그룹 「전체 허용」은 동작 행을 포함하지 않습니다. 쓰기 칸은 조회가 켜져 있어야 켤 수 있고, 조회를 끄면 쓰기도 함께 회수됩니다. 관리 화면(관리) 칸은 통합관리자만 바꿉니다. 미배정 부서는 대시보드·덕반장 AI·질의 이력 조회 전용, 데이터 권한 0건으로 고정되어 있습니다. 「동작」 행(예: AI 통합 대시보드 › 업로드 리포트 업로드)은 화면이 아니라 그 버튼을 쓸 수 있는지를 정합니다.'}
      </Hint>

      <Gap size={20} />
      <Card
        title="부서 × 화면"
        sub="메뉴 그룹의 +/− 버튼으로 펼치거나 접습니다. 그룹 일괄 변경은 접힌 화면을 포함한 그룹 전체(동작 행 제외)에 적용됩니다."
        right={busy ? <Text style={s.textXs}>저장 중…</Text> : null}
        bodyStyle={{ padding: 20, minWidth: 0 }}
      >
        {loadError ? (
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
        )}
      </Card>

      <Gap size={20} />
      <Card
        title="최근 변경 이력"
        sub="메뉴 접근 권한 변경 최근 20건"
        right={canSeeAudit ? <Button label="보안 감사 로그에서 더 보기" size="sm" variant="ghost" onPress={() => goToScreen('sys-audit')} /> : null}
        bodyStyle={{ padding: 20, minWidth: 0 }}
      >
        {logsError ? <FormAlert>{logsError}</FormAlert> : logsLoading ? <Loading /> : (
          <TabulatorGrid
            autoWidth
            bordered
            headerFilter={false}
            rows={logs}
            rowKey="_key"
            emptyText="변경 이력이 없습니다."
            columns={LOG_COLUMNS}
          />
        )}
      </Card>
    </View>
  );
}
