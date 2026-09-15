/**
 * [View] 「덕반장 AI AOI 분석」 카드 — AOI 판정 분석 화면 첫 카드
 *
 * 예전에는 「출하 전 위험 LOT」 이라는 이름의 **표**였습니다. 표는 값을 늘어놓을 뿐
 * 무엇이 문제인지는 사람이 읽어 내야 했고, 정작 서버가 만들어 준 근거·권고 문장이
 * 칸 안에 두 줄로 접혀 눈에 띄지 않았습니다.
 *
 * ■ 문장이 먼저, 표는 필요할 때만
 * 사람이 한 번에 받아들이는 것은 「몇 건 중 몇 건이 위험하고, 무엇을 해야 하는가」입니다.
 * 그건 문장이 낫습니다. 대신 **여러 건을 서로 견줘야 할 때**(위험·주의가 둘 이상)는
 * 표가 있어야 하므로 그때만 아래에 붙입니다. 한 건뿐이면 문장으로 충분합니다.
 *
 * ■ 「추정」 을 분명히
 * LRR 확률과 권고는 임계 기준에서 근사한 추정입니다. 사실(최근 불량률·주 불량 유형)과
 * 섞이지 않도록 조치 문단에만 배지를 답니다.
 *
 * ■ 기다리는 동안에도 AI 카드임이 보이게
 * 공용 로딩(점 세 개)은 어느 화면에서나 쓰는 「기다리는 중」 신호라 이 카드의 성격을 지웁니다.
 * 대시보드 AI 카드들과 같은 `SparkleSpinner`(로고로 모이는 입자)를 써서 결이 맞습니다.
 *
 * ■ 여기 나오는 문장은 서버 규칙이 만든 것입니다
 * sLLM 이 쓴 것이 아닙니다. 화면은 서버가 준 `basis`·`recommendation` 을 문장으로
 * 엮기만 합니다 — 값을 지어내지 않습니다.
 */
import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { Badge, Card, Pagination, SparkleSpinner, TabulatorGrid } from '@shared/components/ui';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { comma } from '@shared/utils/formatUtil';

/** 이 수를 넘게 위험·주의가 나오면 표도 함께 보입니다 — 서로 견줘야 하기 때문입니다 */
const TABLE_FROM = 2;

/** 문장으로 풀어 쓸 LOT 수 — 더 많으면 표에서 봅니다 */
const SENTENCE_MAX = 3;

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const dash = (v) => (v === null || v === undefined || v === '' ? '—' : v);

export default function AoiAgentAnalysisCard({
  /** 분석을 불러오는 중 */
  loading,
  lotRisk = [], lotRiskPage = [], lotRiskMeta, lotPaging, lotPageSizes,
  threshold, thresholdText,
}) {
  const s = useCommonStyles();
  const theme = useTheme();
  const canData = useAuthStore((state) => state.canData);

  const risky = useMemo(() => lotRisk.filter((r) => r.level === 'risk'), [lotRisk]);
  const watch = useMemo(() => lotRisk.filter((r) => r.level === 'watch'), [lotRisk]);
  /** 문장으로 풀 대상 — 위험이 먼저, 없으면 주의, 그것도 없으면 불량률 상위 */
  const picked = useMemo(() => {
    const base = risky.length ? risky : watch.length ? watch : lotRisk;
    return base.slice(0, SENTENCE_MAX);
  }, [risky, watch, lotRisk]);

  /** 등급이 매겨진 LOT 수 — 임계 기준이 없으면 0 이고, 그때는 「위험 없음」 이라고 말하면 안 됩니다 */
  const graded = useMemo(() => lotRisk.filter((r) => r.level !== null && r.level !== undefined).length, [lotRisk]);

  const showTable = risky.length + watch.length >= TABLE_FROM || lotRisk.length > SENTENCE_MAX;

  const columns = useMemo(() => [
    {
      title: 'LOT · 출하 예정', field: 'lotNo', minWidth: 150, widthGrow: 2,
      formatter: (cell) => {
        const d = cell.getData();
        return `<span class="mono">${esc(dash(cell.getValue()))}</span>${d.shipDue ? `<div class="muted mono">${esc(d.shipDue)}</div>` : ''}`;
      },
    },
    { title: '모델', field: 'model', minWidth: 120, widthGrow: 1, formatter: (cell) => esc(dash(cell.getValue())) },
    {
      title: '고객사', field: 'customer', minWidth: 110, widthGrow: 1,
      formatter: (cell) => (canData('customer') ? esc(dash(cell.getValue())) : '<span class="muted">비공개</span>'),
    },
    {
      title: 'LRR 확률', field: 'lrrProbability', minWidth: 100, hozAlign: 'center', headerHozAlign: 'center', sorter: 'number',
      formatter: (cell) => {
        const d = cell.getData();
        if (d.level === null || d.level === undefined) return '<span class="tag">산출 불가</span>';
        if (!canData('yield')) return '<span class="muted">비공개</span>';
        const tone = d.level === 'risk' ? 'tag-red' : d.level === 'watch' ? 'tag-amber' : 'tag-green';
        return `<span class="tag ${tone}">${Math.round(Number(cell.getValue()) || 0)}%</span>`;
      },
    },
    {
      title: '근거', field: 'basis', minWidth: 220, widthGrow: 3, headerSort: false,
      formatter: (cell) => esc(dash(cell.getValue())),
    },
  ], [canData]);

  // 머리 배지는 다 받고 나서 셉니다 — 아직 안 받은 상태에서 「출하 예정 0건」 이라고 단정하지 않습니다
  return (
    <Card
      title="덕반장 AI AOI 분석"
      sub={threshold == null
        ? 'LRR 발생 확률은 임계 기준이 있어야 산출됩니다 · 최근 LOT 불량률 순'
        : `고객사 LRR 발생 확률 추정 · 임계 ${thresholdText} 대비 초과 정도로 근사`}
      right={loading ? null : <Badge>{`출하 예정 ${comma(lotRisk.length)}건`}</Badge>}
    >
      {loading ? (
        // 덕반장이 보고 있다는 것을 그대로 보여 줍니다 — 공용 점 세 개 로딩과 달리
        // 이 카드가 AI 가 만든 내용이라는 신호가 됩니다 (대시보드 AI 카드와 같은 표시)
        <SparkleSpinner text="덕반장 AI 가 출하 예정 LOT 을 살펴보는 중입니다…" />
      ) : !lotRisk.length ? (
        <Text style={s.emptyText}>최근 출하 LOT 실적이 없습니다.</Text>
      ) : (
        <View style={{ gap: 14 }}>
          {/* 1. 한 줄 요약 — 부장급이 여기만 읽고 나갈 수 있게 */}
          <Text style={s.body}>{summaryLine(lotRisk.length, risky.length, watch.length, graded)}</Text>

          {/* 2. 건별 사실 — 서버가 준 근거를 그대로 씁니다 */}
          {picked.length ? (
            <View style={{ gap: 8 }}>
              {picked.map((r) => (
                <Text key={`${r.lotNo}-${r.model}`} style={s.body}>
                  {factLine(r, canData)}
                </Text>
              ))}
              {lotRisk.length > picked.length ? (
                <Text style={s.caption}>{`나머지 ${comma(lotRisk.length - picked.length)}건은 아래 표에서 보실 수 있습니다.`}</Text>
              ) : null}
            </View>
          ) : null}

          {/* 3. 조치 — 추정이 섞이므로 사실과 갈라 둡니다 */}
          {actionLines(picked).length ? (
            <View style={{ gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.divider }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Badge tone="amber">추정</Badge>
                <Text style={s.heading2xs}>권고</Text>
              </View>
              {actionLines(picked).map((line) => (
                <Text key={line} style={s.body}>{line}</Text>
              ))}
            </View>
          ) : null}

          {/* 4. 표 — 서로 견줘야 할 만큼 많을 때만 */}
          {showTable ? (
            <View style={{ paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.divider }}>
              <Text style={[s.caption, { marginBottom: 8 }]}>출하 예정 LOT 전체</Text>
              <TabulatorGrid
                columns={columns}
                rows={lotRiskPage}
                headerFilter={false}
                bordered
                emptyText="최근 출하 LOT 실적이 없습니다."
              />
              <Pagination meta={lotRiskMeta} {...(lotPaging?.bind || {})} sizes={lotPageSizes} />
            </View>
          ) : null}
        </View>
      )}
    </Card>
  );
}

/**
 * 「출하를 앞둔 LOT 12건을 살폈습니다. 위험 2건 · 주의 3건입니다.」
 *
 * [주의] 등급을 **못 낸 것**과 등급이 **낮은 것**은 다릅니다.
 * 임계 기준(SY-13)이 없으면 LRR 확률을 산출할 수 없어 level 이 전부 null 로 옵니다.
 * 그때 「위험 수준으로 분류된 LOT 은 없습니다」 라고 쓰면, 아래에 불량률 높은 LOT 을
 * 늘어놓고 「출하 보류 권고」 까지 붙는 모순이 생깁니다 — 안전하다고 오해할 수 있어 더 나쁩니다.
 */
function summaryLine(total, riskCnt, watchCnt, gradedCnt) {
  const head = `출하를 앞둔 LOT ${comma(total)}건을 살폈습니다.`;
  if (!gradedCnt) return `${head} 임계 기준이 없어 위험도는 산출하지 못했고, 최근 불량률이 높은 순으로 보여 드립니다.`;
  if (!riskCnt && !watchCnt) return `${head} 위험 수준으로 분류된 LOT 은 없습니다.`;
  const parts = [];
  if (riskCnt) parts.push(`위험 ${comma(riskCnt)}건`);
  if (watchCnt) parts.push(`주의 ${comma(watchCnt)}건`);
  return `${head} ${parts.join(' · ')}입니다.`;
}

/** 「D65S(20260910) — 최근 3일 LOT 불량률 3.07% · 주 불량 얼룩」 */
function factLine(r, canData) {
  const who = [r.model, r.lotNo ? `(${r.lotNo})` : ''].filter(Boolean).join('');
  const cust = canData('customer') && r.customer ? ` · 고객사 ${r.customer}` : '';
  const due = r.shipDue ? ` · 출하 예정 ${r.shipDue}` : '';
  const basis = r.basis ? ` — ${r.basis}` : '';
  return `${who || 'LOT'}${cust}${due}${basis}`;
}

/**
 * 같은 권고는 한 줄로 묶습니다.
 *
 * 「출하 보류 후 전수 재검사 권고」가 세 줄 이어 나오면 읽는 사람이 세 번 읽게 됩니다.
 * 같은 말이면 대상만 앞에 붙여 한 번만 말합니다.
 */
function actionLines(rows) {
  const byText = new Map();
  rows.forEach((r) => {
    if (!r.recommendation) return;
    const list = byText.get(r.recommendation) || [];
    list.push(r.model || r.lotNo || 'LOT');
    byText.set(r.recommendation, list);
  });
  return [...byText.entries()].map(([text, targets]) => `${targets.join(' · ')} — ${text}`);
}
