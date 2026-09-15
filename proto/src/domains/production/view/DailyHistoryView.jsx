/**
 * [View] PR-04 이전 보고서 (경로: /production/daily-report/history)
 *
 * **붙일 API 가 없습니다.** 2026-09-04 서버에서 보고서 문서·결재 모형이 걷히면서
 * 보고서 이력 조회·복제 API 가 함께 사라졌습니다(`GET /production/daily-reports` 404).
 *
 * 화면을 지우지 않고 남겨 둔 이유 — 이 기능을 없앨지는 사용자 판단이고,
 * 메뉴가 서버 화면 마스터에도 등록되어 있어 함께 정리해야 합니다.
 * 되살릴 때 붙일 자리를 남겨 두는 편이 낫다고 봤습니다.
 *
 * 조간회의 결과(일목표·판정·담당·기한)는 사라지지 않았습니다 —
 * `ax.tb_prod_daily_decision` 에 (대상일, 제품) 으로 남고, 대상일을 고르면 다시 보입니다.
 */
import React from 'react';
import { Text, View } from 'react-native';
import PageHead from '@shared/components/layout/PageHead';
import { Button, Card, Hint } from '@shared/components/ui';
import { useAppNavigation } from '@shared/hooks/useAppNavigation';
import { useCommonStyles } from '@shared/theme/styles';

export default function DailyHistoryView() {
  const s = useCommonStyles();
  const { goToScreen } = useAppNavigation();

  return (
    <View>
      <PageHead
        title="이전 보고서"
        desc="지난 일일 생산현황 보고서를 날짜별로 찾아보는 화면입니다."
        actions={<Button label="일일 생산현황 보고" size="sm" icon="file" onPress={() => goToScreen('prod-daily')} />}
      />

      <Hint icon="alert">이 화면은 현재 붙일 API 가 없습니다. 보고서 이력 조회·복제 기능이 서버에서 걷혔습니다.</Hint>

      <Card title="준비 중">
        <Text style={s.textSm}>
          2026-09-04 서버 개편으로 보고서 문서·결재 모형(초안 · 확정 · 반려 · 생성 이력 · 이력 목록)이
          걷혔습니다. 이 화면이 쓰던 조회·복제 API 도 함께 사라졌습니다.
        </Text>
        <Text style={[s.textSm, { marginTop: 8 }]}>
          <Text style={{ fontWeight: '700' }}>조간회의 결과는 남아 있습니다.</Text> 일목표 · 결정항목 · DRI · 기한은
          대상일과 제품으로 저장되므로, 「일일 생산현황 보고」에서 날짜를 고르면 그날 적어 둔 내용이 그대로 나옵니다.
        </Text>
        <Text style={[s.textSm, { marginTop: 8 }]}>
          결재 흐름을 되살릴지, 이 화면과 메뉴를 걷어낼지는 확인 후 정합니다.
        </Text>
      </Card>
    </View>
  );
}
