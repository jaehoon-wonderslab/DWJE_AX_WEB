/**
 * [View] SY-02 메뉴 접근 권한 (경로: /system/menu-perm)
 *
 * 체크를 바꾸면 그 부서에 속한 모든 계정의 좌측 메뉴가 즉시 바뀌고,
 * 권한이 없는 화면은 주소로 직접 접근해도 차단됩니다.
 * 사용 API 5건 — /api/v1/system/menu-perms/*
 */
import React from 'react';
import { View } from 'react-native';
import Grid, { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import { Button, Card, Hint, Loading, StatCard, openFormModal } from '@shared/components/ui';
import { useAppNavigation } from '@shared/hooks/useAppNavigation';
import MenuPermGrid from './MenuPermGrid';

export default function MenuPermView({
  loading, busy, screens, depts, matrix, adminDepts, myDept, myCount, avgCount,
  toggle, toggleGroup, copyPerm, exportExcel,
}) {
  const { goToScreen } = useAppNavigation();

  /** 선택 목록에 쓰는 부서 목록 — 값은 부서 ID, 표시는 부서명 */
  const deptOptions = depts.map((d) => ({ value: d.id, label: d.name }));
  /** 복사 대상 — 전 권한(잠금) 부서는 덮어쓸 수 없으므로 뺍니다 */
  const targetOptions = depts.filter((d) => !adminDepts.includes(String(d.id))).map((d) => ({ value: d.id, label: d.name }));

  /** 부서 권한 복사 */
  const openCopyForm = () =>
    openFormModal({
      title: '부서 권한 복사',
      sub: '한 부서의 메뉴 접근 권한을 다른 부서에 그대로 적용합니다',
      initial: { fromDeptId: depts[0]?.id, toDeptId: targetOptions[targetOptions.length - 1]?.value },
      fields: [
        { key: 'fromDeptId', label: '복사할 부서 (원본)', type: 'select', options: deptOptions, required: true },
        { key: 'toDeptId', label: '적용할 부서 (대상)', type: 'select', options: targetOptions, required: true },
      ],
      note: '대상 부서의 기존 메뉴 권한은 덮어쓰기 됩니다. 데이터 접근 권한은 함께 복사되지 않으며, 데이터 접근 권한 화면에서 별도로 설정합니다.',
      submitLabel: '복사',
      onSubmit: async (v) => (await copyPerm(v)).ok,
    });

  if (loading) return <Loading />;

  return (
    <View>
      <PageHead
        title="메뉴 접근 권한"
        desc="부서별로 접근할 수 있는 화면을 지정합니다. 부서 기본 권한을 변경하며, 계정별 추가 허용 메뉴는 계정 관리에서 별도로 설정합니다."
        actions={
          <>
            <Button label="엑셀 다운로드" size="sm" icon="download" onPress={exportExcel} />
            <Button label="계정 관리" size="sm" icon="users" onPress={() => goToScreen('sys-account')} />
            <Button label="데이터 접근 권한" size="sm" icon="eyeOff" onPress={() => goToScreen('sys-data')} />
            <Button label="부서 권한 복사" size="sm" variant="primary" icon="copy" disabled={busy} onPress={openCopyForm} />
          </>
        }
      />

      <Grid cols={4}>
        <StatCard label="관리 대상 화면" value={screens.length} unit="개" sub={`메뉴 ${screens.filter((r) => !r.sub).length} · 하위 ${screens.filter((r) => r.sub).length}`} />
        <StatCard label="부서" value={depts.length} unit="개" sub="권한 부여 단위" />
        <StatCard label="내 부서 접근" value={myCount} unit="개" sub={myDept} />
        <StatCard label="전체 평균" value={avgCount} unit="개" sub="부서당 접근 화면" />
      </Grid>
      <Gap />

      <Hint>
        구분이 「하위 화면」인 행은 메뉴에 노출되지 않지만 버튼·링크로 진입하는 하위 화면입니다. 상위 화면만 열고 하위 화면을 닫으면 해당 버튼을 눌렀을 때 접근이 차단되므로 함께 열어 두는 것을 권장합니다. 「동작」 표시가 붙은 행(예: AI 통합 대시보드 › 업로드 리포트 업로드)은 화면이 아니라 그 버튼을 쓸 수 있는지를 정합니다 — 보기 권한과 따로 줍니다.
      </Hint>

      <Gap size={20} />
      <Card title="부서 × 화면" sub="메뉴 그룹의 +/− 버튼으로 펼치거나 접습니다. 그룹 일괄 변경은 접힌 화면을 포함한 해당 그룹 전체에 적용됩니다." bodyStyle={{ padding: 20, minWidth: 0 }}>
        <MenuPermGrid screens={screens} depts={depts} matrix={matrix} adminDepts={adminDepts} busy={busy} toggle={toggle} toggleGroup={toggleGroup} />
      </Card>
    </View>
  );
}
