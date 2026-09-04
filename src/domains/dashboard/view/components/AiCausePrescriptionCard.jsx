/**
 * [Component] AI 공정 원인 분석 및 처방 권고 (XAI & Prescription)
 *
 * 공정·설비를 고르면 **왜 나빠졌는지**(원인)와 **무엇을 할지**(처방)를 보여 줍니다.
 *
 * ■ 서버가 검증한 문장만 그립니다
 * 세 절 모두 `{ text, evidence[], verified }` 로 옵니다.
 * 원인은 **지표 근거**(`qty`·`defect_rate`·`yield`·`defect`·`anomaly`)만,
 * 처방은 **문서 근거**(`doc`)만 받도록 서버가 절별로 스키마를 갈라 뒀습니다 —
 * 지시문으로 "두 절에 같은 내용을 쓰지 말라" 고만 했을 때는 지켜지지 않았다고 합니다.
 *
 * 2026-09-05 이전에는 여기에 **없는 설비 PR-01~PR-10** 과 수집조차 하지 않는 값
 * (타발 압력 편차 ±14% · 금형 온도 48.5℃)이 그려졌습니다. 지어낸 처방은 없는 것만 못합니다.
 */
import React from 'react';
import { Text, View } from 'react-native';
import { Badge, Card, EmptyState, SelectField } from '@shared/components/ui';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { fixed } from '@shared/utils/formatUtil';
import { NotReady, VerifiedLines } from './AiBriefingCard';

/** 불량률 → 신호등 (아침회의 자료와 같은 기준) */
function riskOf(rate) {
  if (rate === null || rate === undefined) return null;
  if (rate >= 5) return { tone: 'red', label: '위험' };
  if (rate >= 3) return { tone: 'amber', label: '주의' };
  return { tone: 'green', label: '정상' };
}

export default function AiCausePrescriptionCard({ causePrescription, loading, waiting, eqptOptions = [], selectedEqptCd, onSelectEqpt }) {
  const s = useCommonStyles();
  const theme = useTheme();

  const cp = causePrescription;
  const causes = (cp?.contributions || []).filter((c) => c?.text && c.verified !== false);
  const actions = (cp?.prescriptions || []).filter((p) => p?.text && p.verified !== false);
  const ready = !!cp?.modelVer && (causes.length || actions.length);
  const risk = riskOf(cp?.target?.defectRate);

  return (
    <Card
      title="AI 공정 원인 분석 및 처방 권고"
      sub={ready ? `${cp.modelVer}${cp.analyzedAt ? ` · ${cp.analyzedAt}` : ''}` : 'XAI & Prescription · 파인튜닝 sLLM'}
      right={ready && risk ? <Badge tone={risk.tone}>{risk.label}</Badge> : null}
    >
      {/* 분석 결과가 있을 때만 대상 선택기를 냅니다 — 없는 설비를 고르게 두면 안 됩니다 */}
      {ready && eqptOptions.length ? (
        <SelectField
          label="대상 설비"
          value={selectedEqptCd}
          options={eqptOptions}
          onChange={onSelectEqpt}
          style={{ minWidth: 260, marginBottom: 12 }}
        />
      ) : null}

      {waiting && !cp ? (
        // 브리핑이 같은 모델을 쓰는 중이라 아직 시작도 못 했습니다 — 준비 중과 구분해 알립니다
        <EmptyState text="브리핑 분석이 끝나면 이어서 분석합니다." />
      ) : loading && !cp ? (
        // 모델 추론이라 수십 초 걸립니다 — 멈춘 것처럼 보이지 않게 미리 알립니다
        <EmptyState text="모델이 분석 중입니다. 수십 초 걸릴 수 있습니다." />
      ) : !ready ? (
        <NotReady reason={cp?.reason} />
      ) : (
        <View style={{ gap: 16 }}>
          {cp.target ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                flexWrap: 'wrap',
                paddingBottom: 10,
                borderBottomWidth: 1,
                borderBottomColor: theme.color.border,
              }}
            >
              <Text style={[s.textSm, { fontWeight: '700' }]}>{cp.target.eqptNm || cp.target.eqptCd || cp.target.processId}</Text>
              {cp.target.eqptCd ? <Text style={s.textXs}>{cp.target.eqptCd}</Text> : null}
              {cp.target.processId ? <Text style={s.textXs}>{`공정 ${cp.target.processId}`}</Text> : null}
              {cp.target.defectRate != null ? (
                <Text style={[s.textSm, { fontWeight: '700', marginLeft: 'auto' }]}>{`불량률 ${fixed(cp.target.defectRate, 2)}%`}</Text>
              ) : null}
            </View>
          ) : null}

          <View style={{ gap: 8 }}>
            <Text style={[s.textSm, { fontWeight: '700' }]}>원인 분석</Text>
            <VerifiedLines lines={causes} emptyText="근거가 확인된 원인이 없습니다." />
          </View>

          <View style={{ gap: 8 }}>
            <Text style={[s.textSm, { fontWeight: '700' }]}>처방 권고</Text>
            <Text style={s.textXs}>과거 불량분석 문서에서 실제로 시행한 대책을 찾아 인용합니다.</Text>
            <VerifiedLines lines={actions} dropped={cp.droppedCnt} emptyText="근거가 확인된 처방이 없습니다." />
          </View>
        </View>
      )}
    </Card>
  );
}
