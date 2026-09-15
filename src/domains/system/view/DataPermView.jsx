/**
 * [View] SY-03 데이터 접근 권한 (경로: /system/data-perm)
 *
 * 허용되지 않은 항목은 메뉴 접근이 가능하더라도
 * 화면·보고서·인쇄물·CSV 에서 blind 처리됩니다.
 * 사용 API 2건 — /api/v1/system/data-perms (조회·변경)
 */
import React from 'react';
import { View } from 'react-native';
import PageHead from '@shared/components/layout/PageHead';
import { Button, Card, Hint, Loading } from '@shared/components/ui';
import { useAppNavigation } from '@shared/hooks/useAppNavigation';
import DataPermGrid from './DataPermGrid';

export default function DataPermView({
  loading, me, fields, depts, matrix, adminDepts, toggle, exportExcel, notifySaved,
}) {
  const { goToScreen } = useAppNavigation();

  if (loading) return <Loading />;

  return (
    <View>
      <PageHead
        title="데이터 접근 권한"
        desc="부서별로 열람할 수 있는 데이터 항목을 지정합니다. 계정은 소속 부서의 설정을 그대로 상속하며, 허용되지 않은 항목은 메뉴 접근이 가능하더라도 화면·보고서·인쇄물·CSV 에서 blind 처리됩니다."
        actions={
          <>
            <Button label="엑셀 다운로드" size="sm" icon="download" onPress={exportExcel} />
            <Button label="메뉴 접근 권한" size="sm" icon="lock" onPress={() => goToScreen('sys-menu')} />
            <Button label="변경 저장" size="sm" variant="primary" icon="save" onPress={notifySaved} />
          </>
        }
      />

      <Hint>
        {`체크를 바꾸면 해당 부서 전 계정의 화면에 즉시 반영됩니다. 비공개로 둔 항목은 값 자체가 화면·인쇄물·CSV 어디에도 담기지 않습니다. 현재 로그인 계정은 ${me?.name} · ${me?.dept} 입니다.`}
      </Hint>

      <Card title="부서 × 데이터 항목" sub="체크된 항목만 열람할 수 있습니다. 통합관리자 부서는 전 권한으로 고정됩니다." bodyStyle={{ padding: 20, minWidth: 0 }}>
        <DataPermGrid fields={fields} depts={depts} matrix={matrix} adminDepts={adminDepts} toggle={toggle} />
      </Card>
    </View>
  );
}
