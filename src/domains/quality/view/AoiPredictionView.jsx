/**
 * [View] QC-02 AOI 판정 분석 (경로: /quality/aoi)
 *
 * 2026-09-13 (5차)
 *  · 「출하 전 위험 LOT」 표 → **「덕반장 AI AOI 분석」 카드**로 바꾸고 **첫 자리**로 올렸습니다.
 *    표는 값을 늘어놓을 뿐이고, 정작 서버가 만든 근거·권고 문장이 칸 안에 접혀 안 보였습니다.
 *    이제 문장이 먼저 나오고, 서로 견줄 게 많을 때만(위험·주의 2건 이상) 표가 아래에 붙습니다.
 *
 * 2026-09-13 (4차)
 *  · 「불량 유형 구성 변화」 비교 기준을 **직전 4주 → 1주 일평균**으로 (기준이 멀수록 지금 상태와 어긋납니다)
 *  · 같은 카드에 **쪽 나눔**을 넣고 **「해석」 열은 제거**했습니다 — 서버 문장이 행마다 같은 말을 되풀이해
 *    폭만 차지했고, 증감은 「변화」 열의 색과 부호로 이미 읽힙니다
 *
 * 2026-09-11 (3차) — 카드를 한 행씩 쌓고, 불량 상세는 모달로 옮겼습니다.
 *  1. 「불량 목록」·「출하 전 위험 LOT」 **각각 한 행 전체 폭** (요구 1) · 추이 밴드는 **d3**(charts-d3) 로 (요구 2)
 *  3. 「출하 전 위험 LOT」 **쪽 나눔** 추가 (요구 3) — 서버 쪽 나눔이 없어 화면에서 자릅니다
 *  4·5. 조회 조건은 **검사일 하루**만 (설비·LOT/모델 검색 제거) · 6. 「불량 상세 …」 제목 제거
 *  7. 불량 목록 행 → **모달**로 판정 정보·검사 항목·NAS 사진 · 8. 「불량 이미지」 카드 제거
 *
 * 2026-09-10 (2차) — 화면을 불량 판정 원본과 사진 중심으로 줄였습니다.
 *  3. 예측 KPI·조건 줄(이상 가능성 분석 — 추정) · 설비별 위험도 · 잔여 시간 추정 · 판정 드리프트는 제거 (요구 3)
 *  4. 「지금 상태 — 추정의 근거」 제목 제거 (요구 4)
 *  5. 목록은 모두 Tabulator (요구 5) — 불량 목록 · 출하 전 위험 LOT · 불량 유형 구성 변화
 *
 * 사용 API — /api/v1/quality/aoi/dimension/serials(+회차) · /aoi/prediction/{trend-band,lot-risk} · /aoi/defect-type-shift
 * 모든 값은 서버 응답 필드만 그립니다. 임계값(SY-13 불량률 기준)이 없으면 확률·등급은 "산출 불가" 입니다.
 */
import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { BandChart } from '@shared/components/charts-d3';
import { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import { Button, Card, EmptyState, KeyValue, Loading, SourceNote, TabulatorGrid } from '@shared/components/ui';
import { MENU } from '@shared/constants/menu';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { lastDataDate } from '@shared/stores/useAppStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { comma, fixed } from '@shared/utils/formatUtil';
import AoiAgentAnalysisCard from './components/AoiAgentAnalysisCard';
import AoiDefectSection, { AoiDateFilter } from './components/AoiDefectSection';
import AoiDefectModal from './components/AoiDefectModal';

/** 「불량 유형 구성 변화」 한 쪽에 보일 행 수 */
const SHIFT_PAGE_SIZE = 10;

/** 머리말 설명은 메뉴 정의(qc-aoi)의 것을 그대로 씁니다 — 허브 카드와 화면이 같은 말을 하도록 */
const AOI_MENU = MENU.flatMap((g) => g.items || []).find((it) => it.id === 'qc-aoi');

/** 숫자면 부호를 붙여 표시 (+1.2% / -0.4%), 아니면 — */
const signed = (v, digits = 1, unit = '') => {
  const n = Number(v);
  if (v === null || v === undefined || !Number.isFinite(n)) return '—';
  return `${n > 0 ? '+' : ''}${n.toFixed(digits)}${unit}`;
};

export default function AoiPredictionView({
  loading, threshold, horizonHours, band, bandSeries, bandLabels, lotRisk, lotRiskPage, lotRiskMeta, lotPaging, lotPageSizes,
  shift, baseWeeks, shiftBase, basis, recalc, exportExcel,
  /** 「불량 상세」 구역 컨트롤러(useAoiDefectsController) 반환값 */
  defects,
}) {
  const s = useCommonStyles();
  const theme = useTheme();
  const openModal = useUiStore((state) => state.openModal);
  const canData = useAuthStore((state) => state.canData);

  const thresholdText = threshold === null || threshold === undefined ? '미등록' : `${fixed(threshold, 2)}%`;
  const hz = horizonHours ?? 8;
  const splitLabel = band?.labels?.[(band?.splitIndex ?? 1) - 1];

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

  /**
   * 불량 목록 행 → 상세 모달 (판정 정보 · 측정 회차)
   *
   * 키는 DIMENSION 의 `serialKey`(`wc~eqpt~lot~serial`) 입니다. 예전 MES 의 `defectId` 를 보던 탓에
   * 행을 눌러도 모달이 열리지 않았습니다 — 그 필드는 이 원천에 없습니다.
   */
  const openDefectModal = (row) => {
    if (!row?.serialKey) return;
    openModal({
      title: `판정 상세 · ${row.serialNo || row.serialKey}`,
      sub: [row.wcCd, row.eqptCd, row.lotNo, row.firstAt].filter(Boolean).join(' · '),
      maxWidth: 1120,
      render: () => <AoiDefectModal defect={row} />,
      footer: (close) => <Button label="닫기" onPress={close} />,
    });
  };

  /** 「불량 유형 구성 변화」 열 — 늘어난 유형은 오류색, 줄어든 유형은 성공색 */
  const shiftColumns = useMemo(() => {
    const qtyFmt = (digits) => (cell) => {
      if (!canData('yield')) return '<span class="muted">비공개</span>';
      const v = cell.getValue();
      if (v === null || v === undefined) return '<span class="muted">—</span>';
      return `<span class="num">${digits ? fixed(v, digits) : comma(v)}</span>`;
    };
    return [
      // 「해석」 열을 뺀 뒤 유형 열이 남은 폭을 전부 먹어 한쪽만 넓어졌습니다.
      // 숫자 열에도 늘어날 몫(widthGrow)을 나눠 주어 여백이 고르게 퍼지게 합니다.
      { title: '불량 유형', field: 'defectType', minWidth: 160, widthGrow: 3, formatter: (cell) => `<span class="strong">${esc(dash(cell.getValue()))}</span>` },
      // 「기준일」 이라는 말은 그 칸이 무엇인지 알려 주지 않습니다 — 날짜를 그대로 답니다.
      // 숫자 열에는 검색칸을 두지 않습니다 — 건수·증감률을 글자로 찾는 일은 없고, 칸만 차지합니다(요구 4).
      { title: shiftBase?.date || '기준일', field: 'today', minWidth: 120, widthGrow: 1, hozAlign: 'right', headerHozAlign: 'right', sorter: 'number', headerFilter: false, formatter: qtyFmt(0) },
      { title: `직전 ${baseWeeks}주 일평균`, field: 'baseAvg', minWidth: 140, widthGrow: 1, hozAlign: 'right', headerHozAlign: 'right', sorter: 'number', headerFilter: false, formatter: qtyFmt(1) },
      {
        // 「변화」 만으로는 무엇이 무엇에 견준 것인지 알 수 없습니다
        title: '일평균 대비 증감률',
        field: 'change',
        minWidth: 110,
        widthGrow: 1,
        hozAlign: 'right',
        headerHozAlign: 'right',
        sorter: 'number',
        headerFilter: false,
        formatter: (cell) => {
          const v = Number(cell.getValue());
          const none = cell.getValue() === null || cell.getValue() === undefined || !Number.isFinite(v) || v === 0;
          const color = none ? theme.color.mutedForeground : v > 0 ? theme.color.destructive : theme.color.success;
          return `<span class="num" style="font-weight:600;color:${color}">${none ? '—' : signed(v, 1, '%')}</span>`;
        },
      },
    ];
  }, [canData, baseWeeks, shiftBase, theme]);

  return (
    <View>
      <PageHead
        title="AOI 판정 분석"
        desc={AOI_MENU?.description || 'AOI 판정 결과와 불량 상세·불량 이미지(NAS)를 확인하고 이상 가능성을 분석합니다.'}
        actions={
          <>
            {defects ? <Button label="불량 목록 엑셀" size="sm" icon="download" onPress={defects.exportExcel} /> : null}
            <Button label="분석 엑셀" size="sm" icon="download" onPress={exportExcel} />
          </>
        }
      />

      {/* 조회 조건 — 화면 전체에 걸리므로 맨 앞에 둡니다 */}
      {defects ? <AoiDateFilter {...defects} /> : null}

      {/* ── 1. 덕반장 AI AOI 분석 — 첫 카드. 표 대신 문장으로, 견줄 게 많으면 표도 함께 ── */}
      <AoiAgentAnalysisCard
        loading={loading}
        lotRisk={lotRisk}
        lotRiskPage={lotRiskPage}
        lotRiskMeta={lotRiskMeta}
        lotPaging={lotPaging}
        lotPageSizes={lotPageSizes}
        threshold={threshold}
        thresholdText={thresholdText}
      />
      <Gap />

      {/* ── 2. 불량 목록 — 한 행 전체. 행을 누르면 모달(요구 7) ── */}
      {defects ? <AoiDefectSection {...defects} onRowSelect={openDefectModal} /> : null}
      <Gap />

      {/* ── 3. 남은 분석 — 추이 밴드 · 불량 유형 구성 변화 (나머지 추정 블록은 제거) ── */}
      {loading ? (
        <Loading />
      ) : (
        <>
          <Card
            title="불량률 추이 · 추정 밴드"
            sub={
              band?.labels?.length
                ? `${band.labels[0]} ~ ${splitLabel} 는 MES 실측 · 이후 +1h~+${hz}h 는 추정 · 임계 ${thresholdText}`
                : `임계 ${thresholdText}`
            }
            right={
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                <Button label="추정 근거·모델" size="sm" icon="info" onPress={showBasis} />
                <Button label="예측 재산출" size="sm" icon="refresh" onPress={recalc} />
              </View>
            }
          >
            {band?.labels?.length ? (
              // 밴드는 선 두 개가 아니라 **면**으로 그려야 읽힙니다 — BandChart 가 그 일을 합니다.
              // 실측·추정 경계도 글이 아니라 그림 안에 세로선과 바탕 틴트로 들어갑니다.
              <BandChart
                labels={band.labels}
                actual={band.actual}
                estimated={band.estimated}
                bandHigh={band.bandHigh}
                bandLow={band.bandLow}
                splitIndex={band.splitIndex}
                threshold={threshold ?? undefined}
                unit="%"
                height={260}
              />
            ) : (
              <EmptyState text="추이를 그릴 판정 실적이 없습니다." />
            )}
            <SourceNote>
              {basis?.model?.name ? `${basis.model.name} · ${basis.trainPeriod || ''}` : null}
            </SourceNote>
          </Card>
          <Gap />

          <Card
            title="불량 유형 구성 변화"
            sub={shiftBase
              ? `${shiftBase.date} vs 직전 ${shiftBase.weeks}주(${shiftBase.from} ~ ${shiftBase.to}) 일평균 · 불량 건수 기준`
              : `${lastDataDate()} vs 직전 ${baseWeeks}주 일평균 · 불량 건수 기준`}
            tight
          >
            <TabulatorGrid
              inset
              columns={shiftColumns}
              rows={shift}
              pageSize={SHIFT_PAGE_SIZE}
              bordered
              emptyText="비교할 불량 유형 실적이 없습니다."
            />
          </Card>
        </>
      )}
    </View>
  );
}

/* ───────── Tabulator 셀 HTML 도우미 — 서버 문자열은 이스케이프해서 넣습니다 ───────── */

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
const dash = (v) => (v === null || v === undefined || v === '' ? '—' : v);
