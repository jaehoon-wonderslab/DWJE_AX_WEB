/**
 * [View] QC-02 AOI 판정 분석 (경로: /quality/aoi)
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
 * 사용 API — /api/v1/quality/aoi/defects(+상세) · /files/aoi-images/{imageId} · /aoi/prediction/{trend-band,lot-risk} · /aoi/defect-type-shift
 * 모든 값은 서버 응답 필드만 그립니다. 임계값(SY-13 불량률 기준)이 없으면 확률·등급은 "산출 불가" 입니다.
 */
import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { LineChart } from '@shared/components/charts-d3';
import { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import { Badge, Button, Card, EmptyState, KeyValue, Loading, Pagination, SourceNote, TabulatorGrid } from '@shared/components/ui';
import { MENU } from '@shared/constants/menu';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { lastDataDate } from '@shared/stores/useAppStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { comma, fixed } from '@shared/utils/formatUtil';
import AoiDefectSection from './components/AoiDefectSection';
import AoiDefectModal from './components/AoiDefectModal';

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
  shift, baseWeeks, basis, recalc, exportExcel,
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

  /** 불량 목록 행 → 상세 모달 (판정 정보 · 검사 항목 · NAS 사진) */
  const openDefectModal = (row) => {
    if (!row?.defectId) return;
    openModal({
      title: `불량 상세 · ${row.defectId}`,
      sub: [row.judgedAt, row.processNm || row.wcCd, row.eqptCd].filter(Boolean).join(' · '),
      maxWidth: 1120,
      render: () => <AoiDefectModal defect={row} />,
      footer: (close) => <Button label="닫기" onPress={close} />,
    });
  };

  /**
   * 「출하 전 위험 LOT」 열 — 반폭에 놓이므로 출하 예정일은 LOT 아래 줄에, 근거·권고는 한 칸에 두 줄로 접습니다.
   * 고객사는 `customer` 데이터 권한으로 가립니다.
   */
  const lotColumns = useMemo(() => [
    {
      title: 'LOT · 출하 예정',
      field: 'lotNo',
      minWidth: 108,
      widthGrow: 1,
      formatter: (cell) => {
        const d = cell.getData();
        return `<span class="mono">${esc(dash(cell.getValue()))}</span>${d.shipDue ? `<div class="muted mono">${esc(d.shipDue)}</div>` : ''}`;
      },
    },
    { title: '모델', field: 'model', minWidth: 84, formatter: (cell) => esc(dash(cell.getValue())) },
    {
      title: '고객사',
      field: 'customer',
      minWidth: 88,
      formatter: (cell) => (canData('customer') ? esc(dash(cell.getValue())) : '<span class="muted">비공개</span>'),
    },
    {
      title: 'LRR 확률',
      field: 'lrrProbability',
      width: 86,
      hozAlign: 'center',
      headerHozAlign: 'center',
      sorter: 'number',
      formatter: (cell) => {
        const d = cell.getData();
        if (d.level === null || d.level === undefined) return '<span class="tag">산출 불가</span>';
        if (!canData('yield')) return '<span class="muted">비공개</span>';
        const tone = d.level === 'risk' ? 'tag-red' : d.level === 'watch' ? 'tag-amber' : 'tag-green';
        return `<span class="tag ${tone}">${Math.round(Number(cell.getValue()) || 0)}%</span>`;
      },
    },
    {
      title: '근거 · 권고 (추정)',
      field: 'basis',
      minWidth: 190,
      widthGrow: 3,
      headerSort: false,
      formatter: (cell) => {
        const d = cell.getData();
        return `${esc(dash(cell.getValue()))}${d.recommendation ? `<div class="muted">${esc(d.recommendation)}</div>` : ''}`;
      },
    },
  ], [canData]);

  /** 「불량 유형 구성 변화」 열 — 늘어난 유형은 오류색, 줄어든 유형은 성공색 */
  const shiftColumns = useMemo(() => {
    const qtyFmt = (digits) => (cell) => {
      if (!canData('yield')) return '<span class="muted">비공개</span>';
      const v = cell.getValue();
      if (v === null || v === undefined) return '<span class="muted">—</span>';
      return `<span class="num">${digits ? fixed(v, digits) : comma(v)}</span>`;
    };
    return [
      { title: '불량 유형', field: 'defectType', minWidth: 150, widthGrow: 1, formatter: (cell) => `<span class="strong">${esc(dash(cell.getValue()))}</span>` },
      { title: '기준일', field: 'today', width: 92, hozAlign: 'right', headerHozAlign: 'right', sorter: 'number', formatter: qtyFmt(0) },
      { title: `${baseWeeks}주 일평균`, field: 'baseAvg', width: 110, hozAlign: 'right', headerHozAlign: 'right', sorter: 'number', formatter: qtyFmt(1) },
      {
        title: '변화',
        field: 'change',
        width: 92,
        hozAlign: 'right',
        headerHozAlign: 'right',
        sorter: 'number',
        formatter: (cell) => {
          const v = Number(cell.getValue());
          const none = cell.getValue() === null || cell.getValue() === undefined || !Number.isFinite(v) || v === 0;
          const color = none ? theme.color.mutedForeground : v > 0 ? theme.color.destructive : theme.color.success;
          return `<span class="num" style="font-weight:600;color:${color}">${none ? '—' : signed(v, 1, '%')}</span>`;
        },
      },
      { title: '해석', field: 'interpretation', minWidth: 220, widthGrow: 2, headerSort: false, formatter: (cell) => esc(dash(cell.getValue())) },
    ];
  }, [canData, baseWeeks, theme]);

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

      {/* ── 1. 불량 목록 — 한 행 전체. 행을 누르면 모달(요구 7) ── */}
      {defects ? <AoiDefectSection {...defects} onRowSelect={openDefectModal} /> : null}
      <Gap />

      {/* ── 출하 전 위험 LOT — 한 행 전체 + 쪽 나눔(요구 3) ── */}
      <Card
        title="출하 전 위험 LOT"
        sub={threshold == null ? 'LRR 발생 확률은 임계 기준이 있어야 산출됩니다 · 최근 LOT 불량률 순' : `고객사 LRR 발생 확률 추정 · 임계 ${thresholdText} 대비 초과 정도로 근사`}
        tight
        right={<Badge>{`${comma(lotRisk.length)}건`}</Badge>}
      >
        <TabulatorGrid
          columns={lotColumns}
          rows={lotRiskPage}
          headerFilter={false}
          emptyText="최근 출하 LOT 실적이 없습니다."
        />
        <Pagination meta={lotRiskMeta} {...lotPaging.bind} sizes={lotPageSizes} />
      </Card>
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
            {bandSeries.length ? (
              <>
                {/* 시간 단위 점이 많아(실측 + 추정 구간) 점 간격을 좁혀 가로 스크롤 없이 전체를 보입니다 */}
                <LineChart labels={bandLabels} series={bandSeries} target={threshold ?? undefined} unit="%" height={240} minPointWidth={16} />
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

          <Card title="불량 유형 구성 변화" sub={`${lastDataDate()} vs 직전 ${baseWeeks}주 일평균 · 불량 건수 기준`} tight>
            <TabulatorGrid columns={shiftColumns} rows={shift} emptyText="비교할 불량 유형 실적이 없습니다." />
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
