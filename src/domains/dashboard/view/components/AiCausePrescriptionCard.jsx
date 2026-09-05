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
import { Card, EmptyState, SelectField, XlsTable } from '@shared/components/ui';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { comma, fixed } from '@shared/utils/formatUtil';
import { NotReady, VerifiedLines } from './AiBriefingCard';
import { EvidenceButton, collectDocs, openEvidenceModal } from './AiEvidenceModal';
import { downloadCauseReport, evidenceValueText } from '../../model/aiReportExport';
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
  /**
   * 대상을 **배열로 다룹니다**
   *
   * 서버가 대상 하나만 줄 때는 한 줄짜리 배열로 만들고, 여러 공정을 주면 그대로 씁니다
   * (불량률 기준을 넘은 공정을 모두 보여 달라는 요청 — API 준비 중).
   * 화면·엑셀이 같은 구조를 보므로 서버가 바뀌어도 손댈 곳이 적습니다.
   */
  const targets = cp?.targets?.length
    ? cp.targets.map((t) => ({
        ...t,
        contributions: (t.contributions || []).filter((x) => x?.text && x.verified !== false),
        prescriptions: (t.prescriptions || []).filter((x) => x?.text && x.verified !== false),
      }))
    : cp?.target
      ? [{
          ...cp.target,
          contributions: (cp.contributions || []).filter((x) => x?.text && x.verified !== false),
          prescriptions: (cp.prescriptions || []).filter((x) => x?.text && x.verified !== false),
        }]
      : [];

  const causes = targets.flatMap((t) => t.contributions);
  const actions = targets.flatMap((t) => t.prescriptions);
  const ready = !!cp?.modelVer && targets.length > 0 && (causes.length || actions.length);

  return (
    <Card
      title="AI 공정 원인 분석 및 처방 권고"
      sub={ready ? cp.analyzedAt || '' : 'XAI & Prescription · 파인튜닝 sLLM'}
      right={
        ready ? (
          <>
            <EvidenceButton
              count={causes.length + actions.length}
              onPress={() => openEvidenceModal({
                title: 'AI 공정 원인 분석 및 처방 권고',
                sections: SECTIONS(causes, actions),
                droppedCnt: cp.droppedCnt,
                analyzedAt: cp.analyzedAt,
              })}
            />
            <Button
              label="엑셀 다운로드"
              size="sm"
              icon="download"
              onPress={() => downloadCauseReport({
                targets,
                docs: collectDocs(SECTIONS(causes, actions)),
                droppedCnt: cp.droppedCnt,
                analyzedAt: cp.analyzedAt,
                targetDate: cp.targetDate || cp.date,
                threshold: cp.threshold,
                omittedCnt: cp.omittedCnt,
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
        <View style={{ gap: 12 }}>
          {/*
            상한에 걸려 빠진 대상이 있으면 반드시 밝힙니다.
            빠진 것을 안 적으면 "3.5% 초과 5곳" 이 사실과 달라집니다 — 실제로는 더 있는데
            화면만 보고 다 봤다고 여기게 됩니다.
          */}
          {cp.threshold ? (
            <Text style={s.textXs}>
              {cp.omittedCnt
                ? `불량률 ${fixed(cp.threshold, 1)}% 초과 ${comma(targets.length + cp.omittedCnt)}곳 중 나쁜 순 ${comma(targets.length)}곳입니다. `
                : `불량률 ${fixed(cp.threshold, 1)}% 초과 ${comma(targets.length)}곳 — 나쁜 순입니다.`}
              {cp.omittedCnt ? (
                <Text style={{ fontWeight: '700' }}>{`나머지 ${comma(cp.omittedCnt)}곳은 분석하지 않았습니다.`}</Text>
              ) : null}
            </Text>
          ) : null}

          {/*
            대상이 여럿이라 표로 봅니다. 문장을 줄줄이 늘어놓으면 어느 공정 이야기인지 갈리지 않습니다.
            공정·설비·불량률은 대상의 첫 줄에만 적어 같은 대상 묶음이 눈에 들어오게 합니다.
          */}
          <XlsTable
            columns={[
              { key: 'proc', title: '공정', width: 132, align: 'left' },
              { key: 'eqpt', title: '설비', width: 150, align: 'left' },
              { key: 'rate', title: '불량률', width: 130 },
              { key: 'kind', title: '구분', width: 52 },
              { key: 'text', title: '내용', width: 360, align: 'left' },
              { key: 'basis', title: '근거', width: 250, align: 'left' },
            ]}
            rows={targets.flatMap((t) => {
              const lines = [
                ...t.contributions.map((l) => ({ kind: '원인', line: l })),
                ...t.prescriptions.map((l) => ({ kind: '처방', line: l })),
              ];
              return lines.map(({ kind, line }, i) => ({
                key: `${t.eqptCd || t.processId}-${kind}-${i}`,
                cells: [
                  { v: i === 0 ? t.processNm || t.processId || '—' : '', align: 'left', bold: true },
                  { v: i === 0 ? t.eqptNm || t.eqptCd || '—' : '', align: 'left' },
                  { node: i === 0 ? <RateCell target={t} /> : null, v: '' },
                  { v: kind, tone: kind === '원인' ? '' : 'ok' },
                  { v: line.text, align: 'left', wrap: true },
                  { node: <BasisCell line={line} /> },
                ],
              }));
            })}
            maxHeight={520}
          />

          <Text style={s.textXs}>
            문장 속 숫자는 모델이 쓴 표기입니다. <Text style={{ fontWeight: '700' }}>확인된 값은 「근거」 칸</Text>에 있습니다.
            {cp.droppedCnt ? ` 근거가 확인되지 않아 뺀 문장 ${comma(cp.droppedCnt)}건.` : ''}
          </Text>
        </View>
      )}
    </Card>
  );
}

/** 불량률 칸 — 분모를 함께 적습니다. 3.5% 를 넘어도 분모가 작으면 무게가 다릅니다 */
function RateCell({ target }) {
  const s = useCommonStyles();
  const theme = useTheme();
  if (target.defectRate == null) return <Text style={s.xlsCellText}>—</Text>;
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 14, fontWeight: '700', color: theme.color.destructive }}>
        {`${fixed(target.defectRate, 2)}%`}
      </Text>
      {target.denominator ? (
        <Text style={[s.xlsCellText, { fontSize: 10, color: theme.color.mutedForeground }]}>
          {`${comma(target.numerator)}/${comma(target.denominator)}`}
        </Text>
      ) : null}
    </View>
  );
}

/** 근거 칸 — 지표는 대상·값, 문서는 파일명·쪽과 인용문 */
function BasisCell({ line }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const ev = line.evidence || [];
  if (!ev.length) return <Text style={s.xlsCellText}>—</Text>;

  return (
    <View style={{ gap: 3 }}>
      {ev.map((e, i) => (
        <View key={i} style={{ gap: 1 }}>
          {e.kind === 'doc' ? (
            <>
              <Text style={[s.xlsCellText, s.xlsLeft, { fontSize: 10.5 }]}>
                {[e.fileName, e.page ? `${e.page}쪽` : null].filter(Boolean).join(' · ')}
              </Text>
              {e.quote ? (
                <Text style={[s.xlsCellText, s.xlsLeft, { fontSize: 10, fontStyle: 'italic', color: theme.color.mutedForeground }]}>
                  {`"${e.quote.length > 90 ? `${e.quote.slice(0, 90)}…` : e.quote}"`}
                </Text>
              ) : null}
            </>
          ) : (
            <Text style={[s.xlsCellText, s.xlsLeft, { fontSize: 10.5 }]}>
              {e.label || e.key}
              <Text style={{ fontWeight: '700' }}>{`  ${evidenceValueText(e)}`}</Text>
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}
