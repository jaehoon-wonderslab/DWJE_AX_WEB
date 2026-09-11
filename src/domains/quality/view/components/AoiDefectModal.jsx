/**
 * [View] AOI 불량 상세 모달 (REQ_20260911 F-7)
 *
 * 불량 목록에서 행을 누르면 이 컴포넌트가 모달 안에 그려집니다.
 *  왼쪽 — NAS 사진(4:3 확대 · 썸네일 줄 · 촬영 정보 · 경로 복사). `available === false` 는 "파일 없음" 자리표시.
 *  오른쪽 — 판정 정보(작업장·설비·LOT·시리얼·수량·등급 …).
 *  아래 — DIMENSION 측정 표. **한 줄 = 한 SEQ(제품 1개의 측정 회차)** 이고 치수(FAI)는 가로로 폅니다.
 *        쓰는 FAI 개수가 작업장마다 달라(S110 45개 · S120 58개) 열은 응답이 준 번호로 만듭니다.
 *        SEQ 중 하나라도 불량이면 그 시리얼이 불량입니다. MSSQL 원천이 붙기 전에는 나오지 않습니다.
 *
 * 상세는 이 컴포넌트가 직접 받습니다(useAoiDefectDetail) — 모달 내용은 전역 모달 스토어가 그리므로
 * 바깥 컨트롤러의 상태 변화로는 다시 그려지지 않기 때문입니다.
 */
import React, { useMemo } from 'react';
import { Image, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { Badge, BlindValue, Button, EmptyState, Icon, IconButton, KeyValue, Loading, SourceNote, TabulatorGrid } from '@shared/components/ui';
import { MONO_FAMILY, useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { comma } from '@shared/utils/formatUtil';
import { useAoiDefectDetail } from '../../controller/useAoiDefectDetail';

/** 검사기 원본이 어두운 바탕이라 뷰어도 어둡게 두어 가장자리가 갈립니다 */
const PHOTO_BG = '#15171c';
/** 사진과 판정 정보를 나란히 둘 최소 폭 */
const ROW_MIN = 900;

export default function AoiDefectModal({ defect }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const row = width >= ROW_MIN;
  const { detail, loading, images, activeImage, activeIndex, showImage, stepImage, copyPath, seqRows, valueCols } =
    useAoiDefectDetail(defect?.defectId);

  /** 치수 열은 응답이 준 번호로 만듭니다 — 설비마다 개수가 다릅니다 */
  const measurementColumns = useMemo(
    () => [
      ...MEASUREMENT_HEAD_COLUMNS,
      ...valueCols.map((c) => ({
        title: c.title,
        field: c.key,
        width: 82,
        hozAlign: 'right',
        headerHozAlign: 'right',
        sorter: 'number',
        formatter: (cell) => {
          const v = cell.getValue();
          return v === null || v === undefined || v === '' ? '<span class="muted">—</span>' : `<span class="num">${esc(v)}</span>`;
        },
      })),
    ],
    [valueCols]
  );

  // 상세가 오기 전에는 목록 행의 값으로 먼저 그립니다 — 모달이 빈 채로 떠 있지 않게
  const d = detail || defect || {};
  const qty = (v) => <BlindValue field="qty" value={v === null || v === undefined ? '—' : comma(v)} textStyle={s.kvVal} />;
  const failCnt = d.ngQty ?? d.failSeqCnt;
  const seqCnt = d.sampleQty ?? d.seqCnt;
  /** DIMENSION 응답이면 회차 기준으로 읽습니다 — MES 의 검사/양품/불량 3종과는 뜻이 다릅니다 */
  const isDimension = d.seqCnt !== undefined && d.seqCnt !== null;
  const failRate = Number.isFinite(Number(d.failRate))
    ? Number(d.failRate)
    : (Number.isFinite(Number(failCnt)) && Number(seqCnt) > 0 ? (Number(failCnt) / Number(seqCnt)) * 100 : null);

  const info = (
    <View style={{ flex: row ? 1 : undefined, minWidth: 0 }}>
      <KeyValue
        keyWidth={84}
        rows={[
          ['판정 일시', d.judgedAt || '—'],
          ['작업장', d.processNm || d.wcCd || d.processId || '—'],
          ['설비', [d.eqptCd, d.eqptNm].filter(Boolean).join(' · ') || '—'],
          ['LOT · 시리얼', `${d.lotNo || '—'}${d.serialNo ? ` · ${d.serialNo}` : ''}`],
          ...(d.model || d.modelNm ? [['모델', d.modelNm ? `${d.model} (${d.modelNm})` : d.model]] : []),
          ...(d.moldCd ? [['금형 · 캐비티', <BlindValue key="mold" field="mold" value={`${d.moldCd}${d.cavity != null ? ` · CAV ${d.cavity}` : ''}`} textStyle={s.kvVal} />]] : []),
          isDimension
            ? ['검사 회차 · 불량', (
              <View key="seq" style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                {qty(seqCnt)}
                <Text style={s.textXs}>회차 중</Text>
                {qty(failCnt)}
                {failRate === null ? null : <Badge tone={failRate >= 30 ? 'red' : failRate >= 10 ? 'amber' : 'green'}>{`${failRate.toFixed(1)}%`}</Badge>}
              </View>
            )]
            : ['검사 · 양품 · 불량', (
              <View key="qty" style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                {qty(seqCnt)}<Text style={s.textXs}>/</Text>{qty(d.okQty)}<Text style={s.textXs}>/</Text>{qty(failCnt)}
              </View>
            )],
          ...(isDimension && d.partial ? [['구간', `이 날짜 구간은 SEQ ${comma(d.seqMin)} 부터입니다 — 앞 구간은 전날에 있습니다`]] : []),
          ...(d.grade || d.remark || d.comment ? [['등급 · 비고', [d.grade, d.remark || d.comment].filter(Boolean).join(' · ')]] : []),
        ]}
      />

      {/* NAS 경로 — 상대 경로 · 고정폭 글꼴 · 복사 단추 */}
      {activeImage ? (
        <View
          style={{
            marginTop: 10,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingVertical: 8,
            paddingLeft: 12,
            paddingRight: 8,
            borderRadius: theme.metrics.radiusSm,
            backgroundColor: theme.surface,
          }}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[s.fieldLabel, { marginBottom: 2 }]}>{`NAS 경로 · #${activeImage.seq}${activeImage.available === false ? ' · 파일 없음' : ''}`}</Text>
            <Text selectable style={{ fontFamily: MONO_FAMILY, fontSize: 11.5, lineHeight: 16, color: theme.color.foreground }}>
              {activeImage.nasPath || '—'}
            </Text>
          </View>
          <Button label="경로 복사" size="sm" icon="copy" onPress={() => copyPath(activeImage.nasPath)} disabled={!activeImage.nasPath} />
        </View>
      ) : null}
    </View>
  );

  const picture = !images.length ? (
    <View style={{ flex: row ? 1.2 : undefined, minWidth: 0 }}>
      <EmptyState text={loading ? '사진을 확인하는 중입니다…' : '등록된 사진이 없습니다'} style={{ paddingVertical: 40, justifyContent: 'center' }} />
    </View>
  ) : (
    <View style={{ flex: row ? 1.2 : undefined, minWidth: 0 }}>
      <View style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: theme.metrics.radiusSm, backgroundColor: PHOTO_BG, overflow: 'hidden' }}>
        <Photo img={activeImage} s={s} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
        <Text style={[s.textSm, { fontWeight: '600' }]}>{`#${activeImage?.seq}`}</Text>
        <Text style={s.textXs}>{`촬영 ${activeImage?.capturedAt || '—'}`}</Text>
        {activeImage?.sizeBytes ? <Text style={s.textXs}>{`· ${kb(activeImage.sizeBytes)}`}</Text> : null}
        {activeImage?.available === false ? <Badge tone="amber">NAS 파일 없음</Badge> : null}
        <View style={s.spacer} />
        {images.length > 1 ? (
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <IconButton name="chevronLeft" size={28} iconSize={14} title="이전 사진" onPress={() => stepImage(-1)} />
            <Text style={[s.textXs, { minWidth: 40, textAlign: 'center', fontVariant: ['tabular-nums'] }]}>{`${activeIndex + 1} / ${images.length}`}</Text>
            <IconButton name="chevronRight" size={28} iconSize={14} title="다음 사진" onPress={() => stepImage(1)} />
          </View>
        ) : null}
      </View>

      {images.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }} contentContainerStyle={{ gap: 8 }}>
          {images.map((img) => {
            const on = img.imageId === activeImage?.imageId;
            return (
              <Pressable
                key={img.imageId}
                onPress={() => showImage(img.seq)}
                accessibilityRole="button"
                accessibilityLabel={`사진 ${img.seq} 보기`}
                style={({ hovered }) => ({
                  width: 104,
                  height: 78,
                  borderRadius: theme.metrics.radiusXs,
                  overflow: 'hidden',
                  borderWidth: 2,
                  borderColor: on ? theme.color.primary : hovered ? theme.hairlineStrong : 'transparent',
                  backgroundColor: PHOTO_BG,
                })}
              >
                <Photo img={img} thumb s={s} />
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );

  return (
    <View>
      {row ? (
        <View style={{ flexDirection: 'row', gap: 18, alignItems: 'flex-start' }}>
          {picture}
          {info}
        </View>
      ) : (
        <View style={{ gap: 14 }}>
          {picture}
          {info}
        </View>
      )}

      {/* DIMENSION 측정 — 한 줄 = 한 SEQ, 치수는 가로로 */}
      {seqRows.length ? (
        <View style={{ marginTop: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
            <Text style={s.heading2xs}>측정 회차 (SEQ)</Text>
            <Text style={s.caption}>
              {`${comma(seqRows.length)}회차${detail?.seqCnt ? ` / 전체 ${comma(detail.seqCnt)}회차` : ''} · 불량 ${comma(seqRows.filter((m) => m.passed === false || m.passed === 0 || m.passed === '0').length)}회차 · 치수 ${valueCols.length}개`}
            </Text>
          </View>
          <TabulatorGrid
            columns={measurementColumns}
            rows={seqRows}
            // 모달 안(ScrollView)에서는 가상 스크롤이 높이를 잘못 재 한 줄만 보입니다 — 'basic' 으로 실제 높이를 쓰게 합니다
            tableOptions={MEASUREMENT_TABLE_OPTIONS}
            height={seqRows.length > 12 ? 420 : undefined}
            headerFilter={false}
            emptyText="측정 회차가 없습니다."
          />
          <Text style={[s.caption, { marginTop: 6 }]}>
            치수 열이 많아 표를 옆으로 밀어 볼 수 있습니다 · 규격(상·하한)이 오면 벗어난 값을 붉게 표시합니다
          </Text>
        </View>
      ) : loading ? (
        <View style={{ marginTop: 12 }}><Loading compact text="측정 회차를 불러오는 중입니다…" /></View>
      ) : null}

      <SourceNote>사진은 NAS 원본을 API 가 인증 후 전달합니다(서명 링크 · 만료 시 다시 조회). 측정값은 MSSQL 치수 검사(EDGE.dbo.TB_SAMSUN_DIMENSION) 원천이며, 한 회차(SEQ)가 치수 45~58개를 함께 갖습니다.</SourceNote>
    </View>
  );
}

/** 사진 한 장 — NAS 에 파일이 없으면(available=false) 자리표시 */
function Photo({ img, thumb = false, s }) {
  const uri = thumb ? img?.thumbUrl || img?.url : img?.url;
  if (!img || img.available === false || !uri) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: thumb ? 2 : 8 }}>
        <Icon name="image" size={thumb ? 14 : 22} color="#8f95a3" />
        <Text style={[s.textXs, { color: '#b4b8cc', fontSize: thumb ? 9.5 : 11.5 }]}>파일 없음</Text>
      </View>
    );
  }
  return <Image key={img.imageId} source={{ uri }} resizeMode={thumb ? 'cover' : 'contain'} accessibilityLabel={`사진 ${img.seq}`} style={{ width: '100%', height: '100%' }} />;
}

const MEASUREMENT_TABLE_OPTIONS = { renderVertical: 'basic' };

/** 치수 열 앞에 늘 붙는 세 칸 — SEQ · 판정 · 측정 시각 */
const MEASUREMENT_HEAD_COLUMNS = [
  { title: 'SEQ', field: 'seq', width: 72, frozen: true, hozAlign: 'right', headerHozAlign: 'right', sorter: 'number', formatter: (c) => `<span class="num">${esc(c.getValue())}</span>` },
  {
    title: '판정',
    field: 'passed',
    width: 74,
    frozen: true,
    hozAlign: 'center',
    headerHozAlign: 'center',
    formatter: (c) => {
      const v = c.getValue();
      if (v === null || v === undefined) return '<span class="muted">—</span>';
      const ok = v === true || v === 1 || v === '1';
      return `<span class="tag ${ok ? 'tag-green' : 'tag-red'}">${ok ? '통과' : '불량'}</span>`;
    },
  },
  { title: '측정 시각', field: 'measuredAt', width: 150, formatter: (c) => `<span class="mono nowrap">${esc(dash(c.getValue()))}</span>` },
];

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
const dash = (v) => (v === null || v === undefined || v === '' ? '—' : v);

/** 바이트 → KB / MB */
function kb(bytes) {
  const n = Number(bytes) || 0;
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.round(n / 1024)} KB`;
}
