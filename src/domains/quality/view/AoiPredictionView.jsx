/**
 * [View] QC-02 AOI 판정 분석·예측 (경로: /quality/aoi)
 *
 * 판정 이력과 공정 조건을 함께 학습해 앞으로 몇 시간 안에 무엇이 일어날지를 추정하고,
 * 그 추정의 근거가 되는 판정 신뢰도 진단을 함께 제시합니다.
 * 사용 API 9건 — /api/v1/quality/aoi/*
 *
 * 화면은 두 덩어리입니다. 「앞으로 일어날 일 — 추정」 / 「지금 상태 — 예측의 근거」
 * 모든 값은 서버 응답 필드만 그립니다. 임계값(SY-13 불량률 기준)이 없으면 등급·도달 예상은 "기준 미등록" 입니다.
 */
import React from 'react';
import { Text, View } from 'react-native';
import { LineChart } from '@shared/components/charts';
import Grid, { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import {
  Badge, BlindValue, Button, Card, ConfTag, EmptyState, Filters, Hint, KeyValue, Loading, Pred, SelectField,
  SourceNote, Table, XlsTable,
} from '@shared/components/ui';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { lastDataDate } from '@shared/stores/useAppStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { comma, fixed } from '@shared/utils/formatUtil';
import { etaText, levelOf } from '../controller/useAoiPredictionController';

/** 숫자면 부호를 붙여 표시 (+1.20 / -0.40), 아니면 — */
const signed = (v, digits = 2, unit = '') => {
  const n = Number(v);
  if (v === null || v === undefined || !Number.isFinite(n)) return '—';
  return `${n > 0 ? '+' : ''}${n.toFixed(digits)}${unit}`;
};

/** 퍼센트 값 — null 이면 — */
const pct = (v, digits = 2) => (v === null || v === undefined ? '—' : `${fixed(v, digits)}%`);

export default function AoiPredictionView({
  loading, summary: sum, threshold, horizonHours, band, bandSeries, bandLabels, equipRisk, lotRisk, remaining,
  drift, driftRange, driftOutCnt, shift, baseWeeks, basis,
  filters, processOptions, horizonOptions, trainOptions, setTarget, setHorizon, setTrainPeriod, reload, recalc, exportExcel,
}) {
  const s = useCommonStyles();
  const theme = useTheme();
  const openModal = useUiStore((state) => state.openModal);
  const canData = useAuthStore((state) => state.canData);

  const thresholdText = threshold === null || threshold === undefined ? '미등록' : `${fixed(threshold, 2)}%`;
  const hz = horizonHours ?? 8;

  /** 추정 근거·모델 모달 — 서버 응답: model{name,type,note} · trainPeriod · features[{name,source}] · validation{} · limitations[] */
  const showBasis = () => {
    const model = basis?.model && typeof basis.model === 'object' ? basis.model : { name: basis?.model };
    const validation = basis?.validation;
    const validationRows = Array.isArray(validation)
      ? validation
      : [
        ['표본 수', validation?.sampleCnt != null ? `${comma(validation.sampleCnt)}개 (시간 단위)` : '—'],
        ['잔차 표준편차', validation?.residualSd != null ? `${fixed(validation.residualSd, 2)} %p` : '—'],
        ['시간당 기울기', validation?.slopePerHour != null ? `${signed(validation.slopePerHour, 2, ' %p/h')}` : '—'],
        ['신뢰도', validation?.confidence != null ? `${Math.round(validation.confidence * 100)}%` : '—'],
      ];
    openModal({
      title: '추정 근거 · 모델',
      sub: '무엇을 학습해 어떻게 추정했는지 — 추정이지 확정이 아닙니다',
      render: () => (
        <View>
          <KeyValue
            keyWidth={110}
            rows={[
              ['모델', model?.name || '—'],
              ['방식', model?.type || '—'],
              ['학습 기간', basis?.trainPeriod || '—'],
            ]}
          />
          {model?.note ? <Text style={[s.textXs, { marginTop: 6 }]}>{model.note}</Text> : null}

          <Text style={[s.fieldLabel, { marginTop: 12, marginBottom: 6 }]}>입력 변수</Text>
          {(basis?.features || []).length ? (
            (basis.features || []).map((f, i) => {
              const name = typeof f === 'string' ? f : f?.name;
              const source = typeof f === 'string' ? null : f?.source;
              return (
                <Text key={`${name}-${i}`} style={[s.textSm, { marginBottom: 3 }]}>
                  {`· ${name}`}
                  {source ? <Text style={s.textXs}>{`  (${source})`}</Text> : null}
                </Text>
              );
            })
          ) : (
            <Text style={s.textXs}>—</Text>
          )}

          <Text style={[s.fieldLabel, { marginTop: 12, marginBottom: 6 }]}>검증 결과</Text>
          <KeyValue keyWidth={140} rows={validationRows} />

          <Text style={[s.fieldLabel, { marginTop: 12, marginBottom: 6 }]}>한계</Text>
          {(basis?.limitations || []).map((f, i) => (
            <Text key={`${f}-${i}`} style={[s.textSm, { marginBottom: 3 }]}>{`· ${f}`}</Text>
          ))}
        </View>
      ),
      footer: (close) => <Button label="닫기" onPress={close} />,
    });
  };

  if (loading) return <Loading />;

  const predictedLevel = levelOf(sum.predictedDefectRate, threshold);
  const eta = sum.thresholdEtaHours;
  const etaLevel = threshold == null ? '' : eta === 0 ? 'risk' : eta != null && eta <= hz ? 'watch' : '';
  const conf = sum.modelConfidence;
  const splitLabel = band?.labels?.[(band?.splitIndex ?? 1) - 1];
  const riskCnt = equipRisk.filter((r) => r.level === 'risk').length;
  const watchCnt = equipRisk.filter((r) => r.level === 'watch').length;

  return (
    <View>
      <PageHead
        title="AOI 판정 분석·예측"
        desc="AOI 판정 결과 자체는 MES 에 이미 적재되어 있습니다. 이 화면은 판정 이력과 공정 조건을 함께 학습해 앞으로 몇 시간 안에 무엇이 일어날지를 추정하고, 그 추정의 근거가 되는 판정 신뢰도 진단을 함께 제시합니다."
        actions={
          <>
            <Button label="엑셀 다운로드" size="sm" icon="download" onPress={exportExcel} />
            <Button label="추정 근거·모델" size="sm" icon="info" onPress={showBasis} />
            <Button label="예측 재산출" size="sm" variant="primary" icon="refresh" onPress={recalc} />
          </>
        }
      />

      <Filters>
        <SelectField label="대상 (공정)" value={filters.target} options={processOptions} onChange={setTarget} />
        <SelectField label="예측 구간" value={filters.horizon} options={horizonOptions} onChange={setHorizon} />
        <SelectField label="학습 기간" value={filters.trainPeriod} options={trainOptions} onChange={setTrainPeriod} />
        <Button label="조회" variant="primary" onPress={reload} />
      </Filters>

      {/* 예측 요약 4종 — 값마다 근거 구간·신뢰도를 함께 씁니다 */}
      <Grid cols={4}>
        <Pred
          level={predictedLevel}
          label={`+${hz}h 예상 불량률`}
          value={<BlindValue field="yield" value={pct(sum.predictedDefectRate)} textStyle={s.predValue} />}
          ci={`현재 ${canData('yield') ? pct(sum.currentDefectRate) : '비공개'} · 임계 ${thresholdText} · 선형 추세 추정`}
        >
          {conf != null ? <View style={{ marginTop: 6 }}><ConfTag value={conf} /></View> : null}
        </Pred>
        <Pred
          level={etaLevel}
          label="임계 도달 예상"
          value={etaText(eta, { current: sum.currentDefectRate, threshold })}
          ci={
            threshold == null
              ? 'SY-13 지표 기준에 불량률 임계값을 등록하면 산출됩니다'
              : `임계 ${thresholdText} · 예측 구간 ${hz}h 안 도달 ${sum.thresholdReachCnt ? '예상' : '없음'}`
          }
        />
        <Pred
          level={conf != null && conf < 0.5 ? 'watch' : ''}
          label="모델 신뢰도"
          value={conf != null ? `${Math.round(conf * 100)}%` : '—'}
          ci={`표본 ${comma(sum.sampleCnt)}개 (시간 단위) · 학습 ${sum.trainHours ?? '—'}h · 표본이 적거나 잔차가 크면 낮아집니다`}
        />
        <Pred
          level={threshold != null && Number(sum.riskLotCnt) > 0 ? 'watch' : ''}
          label="출하 위험 LOT"
          value={`${comma(sum.riskLotCnt)} 건`}
          ci={threshold == null ? `임계 미등록 · 최근 출하 LOT ${lotRisk.length}건을 모두 표시` : `최근 출하 LOT 중 불량률 ${thresholdText} 이상`}
        />
      </Grid>
      <Gap />

      <Hint>예측은 확정 결과가 아니라 추정입니다. 모든 추정치에는 근거 구간과 신뢰도를 함께 표시하며, 조치 여부는 담당자가 결정합니다.</Hint>

      <Text style={[s.pageTitle, { fontSize: 15, marginTop: 4, marginBottom: 10 }]}>앞으로 일어날 일 — 추정</Text>

      <Card
        title="불량률 추이 · 예측 밴드"
        sub={
          band?.labels?.length
            ? `${band.labels[0]} ~ ${splitLabel} 는 MES 실측 · 이후 +1h~+${hz}h 는 추정 · 임계 ${thresholdText}`
            : `임계 ${thresholdText}`
        }
      >
        {bandSeries.length ? (
          <>
            <LineChart labels={bandLabels} series={bandSeries} target={threshold ?? undefined} unit="%" height={220} />
            <Text style={[s.textXs, { marginTop: 2 }]}>
              {`▼ ${splitLabel ?? '—'} 기준 — 왼쪽은 실측, 오른쪽(+1h~+${hz}h)은 추정 구간입니다 · 점선은 추정 중앙값과 95% 신뢰 밴드`}
            </Text>
          </>
        ) : (
          <EmptyState text="추이를 그릴 판정 실적이 없습니다." />
        )}
        <SourceNote>
          {basis?.model?.name ? `${basis.model.name} · ${basis.trainPeriod || ''}` : null}
        </SourceNote>
      </Card>
      <Gap />

      <Card
        title="설비별 위험 예측 · 권고 조치"
        sub={`현재값은 MES 판정 집계 · +2h/+${hz}h 는 추정치 · ${comma(equipRisk.length)}대`}
        tight
        right={
          threshold == null ? (
            <Badge tone="amber">임계 미등록</Badge>
          ) : riskCnt ? (
            <Badge tone="red">{`위험 ${riskCnt} · 주의 ${watchCnt}`}</Badge>
          ) : watchCnt ? (
            <Badge tone="amber">{`주의 ${watchCnt}`}</Badge>
          ) : (
            <Badge tone="green">전체 안정</Badge>
          )
        }
      >
        {equipRisk.length ? (
          <XlsTable
            maxHeight={440}
            columns={[
              { key: 'eq', title: '설비 / 검사기', width: 220, align: 'left' },
              { key: 'now', title: '현재 불량률', width: 100 },
              { key: 'p2', title: '+2h 예측', width: 96 },
              { key: 'p8', title: `+${hz}h 예측`, width: 96 },
              { key: 'eta', title: '임계 도달 예상', width: 170, align: 'left' },
              { key: 'why', title: '주 요인 (추정)', width: 150, align: 'left' },
              { key: 'act', title: '권고 조치', width: 360, align: 'left' },
              { key: 'conf', title: '신뢰도', width: 78 },
            ]}
            rows={equipRisk.map((r) => {
              const tone = r.level === 'risk' ? 'bad' : r.level === 'watch' ? 'warn' : undefined;
              return {
                key: r.eqptCd,
                cells: [
                  { v: r.eqptNm ? `${r.eqptCd} · ${r.eqptNm}` : r.eqptCd, align: 'left', tone },
                  { v: canData('yield') ? pct(r.currentRate) : '비공개', num: true },
                  { v: canData('yield') ? pct(r.plus2h) : '비공개', num: true, tone: levelOf(r.plus2h, threshold) === 'risk' ? 'bad' : levelOf(r.plus2h, threshold) === 'watch' ? 'warn' : undefined },
                  { v: canData('yield') ? pct(r.plus8h) : '비공개', num: true, tone: levelOf(r.plus8h, threshold) === 'risk' ? 'bad' : levelOf(r.plus8h, threshold) === 'watch' ? 'warn' : undefined },
                  { v: r.etaLabel, align: 'left' },
                  { v: r.mainFactor || '—', align: 'left' },
                  { v: r.recommendation || '—', align: 'left' },
                  { v: r.confidence != null ? Number(r.confidence).toFixed(2) : '—', num: true },
                ],
              };
            })}
          />
        ) : (
          <EmptyState text="해당 조건의 설비 판정 실적이 없습니다." />
        )}
      </Card>
      <Gap />

      <Grid cols={[2, 1]}>
        <Card
          title="출하 전 위험 LOT"
          sub={threshold == null ? 'LRR 발생 확률은 임계 기준이 있어야 산출됩니다 · 최근 LOT 불량률 순' : '고객사 LRR 발생 확률 추정 · 임계 대비 초과 정도로 근사'}
          tight
        >
          <Table
            minWidth={880}
            keyExtractor={(r) => r.lotNo}
            columns={[
              { key: 'lotNo', title: 'LOT', width: 122, mono: true },
              { key: 'model', title: '모델', width: 128 },
              { key: 'customer', title: '고객사', width: 132, render: (r) => <BlindValue field="customer" value={r.customer ?? '—'} textStyle={s.td} /> },
              { key: 'shipDue', title: '출하 예정', width: 84, align: 'center', render: (r) => <Text style={[s.td, { textAlign: 'center' }]}>{r.shipDue || '—'}</Text> },
              {
                key: 'lrrProbability',
                title: 'LRR 발생 확률',
                width: 116,
                render: (r) => (
                  r.level === null ? (
                    <Badge>산출 불가</Badge>
                  ) : (
                    <Badge tone={r.level === 'risk' ? 'red' : r.level === 'watch' ? 'amber' : 'green'}>
                      {canData('yield') ? `${Math.round(r.lrrProbability)}%` : '비공개'}
                    </Badge>
                  )
                ),
              },
              { key: 'basis', title: '근거 (추정)', flex: 1, minWidth: 260, wrap: true },
              { key: 'recommendation', title: '권고', width: 170, wrap: true },
            ]}
            rows={lotRisk}
            emptyText="최근 출하 LOT 실적이 없습니다."
          />
        </Card>

        <Card title="잔여 시간 추가 발생 추정" sub={`향후 ${remaining.horizonHours ?? hz}시간`}>
          <KeyValue
            keyWidth={132}
            rows={[
              ['추가 불량 수량 (추정)', <BlindValue key="ng" field="qty" value={remaining.estimatedNgQty != null ? `${comma(remaining.estimatedNgQty)} EA` : '—'} textStyle={s.kvVal} />],
              ['구간 불량률 (추정)', <BlindValue key="rate" field="yield" value={pct(remaining.estimatedRate)} textStyle={s.kvVal} />],
              ['시간당 평균 생산량', <BlindValue key="avg" field="qty" value={remaining.avgHourlyQty != null ? `${comma(remaining.avgHourlyQty)} EA` : '—'} textStyle={s.kvVal} />],
              ['신뢰도', remaining.confidence != null ? <ConfTag key="conf" value={remaining.confidence} /> : '—'],
            ]}
          />
          <SourceNote>시간당 평균 생산량 × 예측 구간 × 추정 불량률로 계산한 추정치입니다. 조치를 취하면 예측을 다시 산출하세요.</SourceNote>
        </Card>
      </Grid>

      <Text style={[s.pageTitle, { fontSize: 15, marginTop: 22, marginBottom: 10 }]}>지금 상태 — 예측의 근거</Text>

      <Card
        title="AOI 검사기별 판정 드리프트"
        sub={`판정 기준이 흔들리면 예측 신뢰도가 함께 떨어집니다 · 최근 14일${driftRange != null ? ` · 경계 구간 ±${fixed(driftRange, 1)}%p` : ''}`}
        tight
        right={driftOutCnt ? <Badge tone="red">{`기준 이탈 ${driftOutCnt}`}</Badge> : <Badge tone="green">전체 정상</Badge>}
      >
        {drift.length ? (
          <XlsTable
            maxHeight={400}
            columns={[
              { key: 'aoi', title: '검사기', width: 240, align: 'left' },
              { key: 'n', title: '판정 건수', width: 100 },
              { key: 'dr', title: '기준 대비 드리프트', width: 140 },
              { key: 'over', title: '과검 추정', width: 96 },
              { key: 'under', title: '미검 추정', width: 96 },
              { key: 'agree', title: '재검 일치율', width: 110 },
              { key: 'edge', title: '경계 판정 비중', width: 120 },
              { key: 'state', title: '상태', width: 96 },
            ]}
            rows={drift.map((r) => {
              const bad = r.state && r.state !== 'NORMAL';
              const driftBad = driftRange != null && Math.abs(Number(r.drift) || 0) >= driftRange;
              return {
                key: r.aoiCd,
                cells: [
                  { v: r.aoiNm ? `${r.aoiCd} · ${r.aoiNm}` : r.aoiCd, align: 'left' },
                  { v: canData('qty') ? comma(r.judgeCnt) : '비공개', num: true },
                  { v: signed(r.drift, 2, '%p'), num: true, tone: driftBad ? 'bad' : undefined },
                  { v: canData('yield') ? pct(r.overRejectEst) : '비공개', num: true },
                  { v: canData('yield') ? pct(r.underRejectEst) : '비공개', num: true },
                  { v: pct(r.recheckMatchRate), num: true, tone: bad ? 'bad' : undefined },
                  { v: pct(r.borderlineRatio), num: true, tone: bad ? 'bad' : undefined },
                  { v: r.stateInfo.label, tone: r.stateInfo.tone || undefined },
                ],
              };
            })}
          />
        ) : (
          <EmptyState text="최근 14일 AOI 판정 실적이 없습니다." />
        )}
      </Card>
      <Gap />

      <Card title="불량 유형 구성 변화" sub={`${lastDataDate()} vs 직전 ${baseWeeks}주 일평균 · 불량 건수 기준`} tight>
        <Table
          minWidth={720}
          keyExtractor={(r) => r.defectCd || r.defectType}
          columns={[
            { key: 'defectType', title: '불량 유형', width: 180 },
            { key: 'today', title: '기준일', width: 100, align: 'right', render: (r) => <BlindValue field="yield" value={comma(r.today)} textStyle={[s.td, s.num]} /> },
            { key: 'baseAvg', title: `${baseWeeks}주 일평균`, width: 110, align: 'right', render: (r) => <BlindValue field="yield" value={r.baseAvg != null ? fixed(r.baseAvg, 1) : '—'} textStyle={[s.td, s.num]} /> },
            {
              key: 'change',
              title: '변화',
              width: 100,
              align: 'right',
              render: (r) => {
                const v = Number(r.change);
                const none = r.change === null || r.change === undefined || !Number.isFinite(v) || v === 0;
                return (
                  <Text style={[s.td, s.num, { fontWeight: '600', color: none ? theme.color.mutedForeground : v > 0 ? theme.color.destructive : theme.color.success }]}>
                    {none ? '—' : signed(v, 1, '%')}
                  </Text>
                );
              },
            },
            { key: 'interpretation', title: '해석', flex: 1, minWidth: 220 },
          ]}
          rows={shift}
          emptyText="비교할 불량 유형 실적이 없습니다."
        />
      </Card>
    </View>
  );
}
