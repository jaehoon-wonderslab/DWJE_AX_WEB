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
import { Card, EmptyState, SelectField } from '@shared/components/ui';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { fixed } from '@shared/utils/formatUtil';
import { NotReady, VerifiedLines } from './AiBriefingCard';
import { EvidenceButton, collectDocs, openEvidenceModal } from './AiEvidenceModal';
import { downloadAiReport } from '../../model/aiReportExport';
import { Button } from '@shared/components/ui';

/** 근거 창·엑셀이 같은 묶음을 쓰도록 한 곳에서 만듭니다 */
const SECTIONS = (causes, actions) => [
  { heading: '원인 분석', lines: causes },
  { heading: '처방 권고', lines: actions },
];

export default function AiCausePrescriptionCard({ causePrescription, loading, waiting, eqptOptions = [], selectedEqptCd, onSelectEqpt }) {
  const s = useCommonStyles();
  const theme = useTheme();

  const cp = causePrescription;
  const causes = (cp?.contributions || []).filter((c) => c?.text && c.verified !== false);
  const actions = (cp?.prescriptions || []).filter((p) => p?.text && p.verified !== false);
  const ready = !!cp?.modelVer && (causes.length || actions.length);

  return (
    <Card
      title="AI 공정 원인 분석 및 처방 권고"
      sub={ready ? `${cp.modelVer}${cp.analyzedAt ? ` · ${cp.analyzedAt}` : ''}` : 'XAI & Prescription · 파인튜닝 sLLM'}
      right={
        ready ? (
          <>
            <EvidenceButton
              count={causes.length + actions.length}
              onPress={() => openEvidenceModal({
                title: 'AI 공정 원인 분석 및 처방 권고',
                sections: SECTIONS(causes, actions),
                droppedCnt: cp.droppedCnt,
                modelVer: cp.modelVer,
                analyzedAt: cp.analyzedAt,
              })}
            />
            <Button
              label="엑셀"
              size="sm"
              icon="download"
              onPress={() => downloadAiReport({
                title: 'AI 공정 원인 분석 및 처방 권고',
                sections: SECTIONS(causes, actions),
                docs: collectDocs(SECTIONS(causes, actions)),
                droppedCnt: cp.droppedCnt,
                modelVer: cp.modelVer,
                analyzedAt: cp.analyzedAt,
              })}
            />
          </>
        ) : null
      }
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
          {/* 분석 대상을 한 줄로 — 무엇을 들여다본 결과인지가 먼저 보여야 합니다 */}
          {cp.target ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                flexWrap: 'wrap',
                padding: 12,
                borderRadius: 6,
                backgroundColor: theme.alpha('muted', 0.45),
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '700', color: theme.color.foreground }}>
                {cp.target.eqptNm || cp.target.eqptCd || cp.target.processId}
              </Text>
              <Text style={[s.textXs, { color: theme.color.mutedForeground }]}>
                {[cp.target.eqptCd, cp.target.processId ? `공정 ${cp.target.processId}` : null].filter(Boolean).join(' · ')}
              </Text>
              {cp.target.defectRate != null ? (
                <View style={{ marginLeft: 'auto', alignItems: 'flex-end' }}>
                  <Text style={[s.textXs, { color: theme.color.mutedForeground }]}>불량률</Text>
                  <Text style={{ fontSize: 17, fontWeight: '700', color: theme.color.destructive }}>
                    {`${fixed(cp.target.defectRate, 2)}%`}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <Section title="원인 분석" desc="지표를 대조해 확인한 사실입니다.">
            <VerifiedLines lines={causes} emptyText="근거가 확인된 원인이 없습니다." />
          </Section>

          <Section title="처방 권고" desc="과거 불량분석 문서에서 실제로 시행한 대책을 찾아 인용합니다.">
            <VerifiedLines lines={actions} dropped={cp.droppedCnt} emptyText="근거가 확인된 처방이 없습니다." />
          </Section>
        </View>
      )}
    </Card>
  );
}

/** 절 한 덩이 — 제목에 세로선을 둬 본문과 구분합니다 */
function Section({ title, desc, children }) {
  const s = useCommonStyles();
  const theme = useTheme();
  return (
    <View style={{ gap: 9 }}>
      <View style={{ borderLeftWidth: 3, borderLeftColor: theme.color.primary, paddingLeft: 9, gap: 2 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: theme.color.foreground }}>{title}</Text>
        {desc ? <Text style={[s.textXs, { color: theme.color.mutedForeground }]}>{desc}</Text> : null}
      </View>
      {children}
    </View>
  );
}
