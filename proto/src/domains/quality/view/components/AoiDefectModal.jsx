/**
 * [View] AOI 판정 상세 모달
 *
 * 불량 목록에서 행을 누르면 이 컴포넌트가 모달 안에 그려집니다.
 *  위  — 시리얼 판정 정보. **원천(EDGE.dbo.TB_SAMSUN_DIMENSION)의 열을 한 줄에 하나씩** 폅니다.
 *  아래 — 측정 회차 표. **한 줄 = 한 SEQ(제품 1개의 측정 회차)** 이고 치수(FAI)는 가로로 폅니다.
 *        쓰는 FAI 개수가 설비마다 달라(S110 45개 · S120 58개) 열은 응답이 준 번호로 만듭니다.
 *
 * ■ 2026-09-14 — 묶어서 보여 주던 칸을 가르고, 원천에 없는 항목을 걷어냈습니다
 * 「LOT · 시리얼」·「설비 코드 · 설비명」처럼 두 값을 한 칸에 붙여 놓아 원천의 어느 열인지 알 수 없었고,
 * 모델·금형·등급·비고·NAS 사진처럼 **이 원천에 아예 없는 항목**이 자리만 차지하고 있었습니다
 * (MES 라벨 이력에서 오던 것들입니다 — DIMENSION 은 설비 집합부터 다릅니다).
 * 지금은 `WC_CD`·`EQPT_CD`·`LOT_NO`·`SERIAL_NO`·`SEQ`·`PASSED`·`COMMENT`·`DATE_TIME` 과
 * 그것들로 **계산된 값**(검사 회차·불량 회차·불량률)만 보여 줍니다.
 *
 * ■ 사진은 올 때만 자리를 만듭니다
 * DIMENSION 에는 NAS 사진과 이어지는 키가 아직 없습니다. 빈 사진 칸을 늘 띄워 두면
 * 「사진이 있어야 하는데 없다」로 읽히므로, `images` 가 실제로 올 때만 그립니다.
 *
 * 상세는 이 컴포넌트가 직접 받습니다(useAoiDefectDetail) — 모달 내용은 전역 모달 스토어가 그리므로
 * 바깥 컨트롤러의 상태 변화로는 다시 그려지지 않기 때문입니다.
 */
import React, { useMemo } from 'react';
import { Image, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { Badge, BlindValue, Button, Icon, IconButton, KeyValue, Loading, SourceNote, Tabs, TabulatorGrid } from '@shared/components/ui';
import { MONO_FAMILY, useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { comma } from '@shared/utils/formatUtil';
import { useAoiDefectDetail } from '../../controller/useAoiDefectDetail';
import { failSeqText } from '../../model/failSeqText';

/** 검사기 원본이 어두운 바탕이라 뷰어도 어둡게 두어 가장자리가 갈립니다 */
const PHOTO_BG = '#15171c';
/** 사진과 판정 정보를 나란히 둘 최소 폭 */
const ROW_MIN = 900;

export default function AoiDefectModal({ defect }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { detail, loading, images, activeImage, activeIndex, showImage, stepImage, copyPath, seqRows, valueCols, only, setOnly } =
    useAoiDefectDetail(defect?.serialKey);

  // 사진이 실제로 올 때만 두 칸으로 나눕니다 — 지금 원천에는 사진 연결이 없습니다
  const hasPhoto = images.length > 0;
  const row = hasPhoto && width >= ROW_MIN;

  /** 치수 열은 응답이 준 번호로 만듭니다 — 설비마다 개수가 다릅니다 */
  const measurementColumns = useMemo(
    () => [
      ...MEASUREMENT_HEAD_COLUMNS,
      ...valueCols.map((c) => ({
        title: c.title,
        field: c.key,
        width: 86,
        hozAlign: 'right',
        headerHozAlign: 'right',
        sorter: 'number',
        // 한계를 벗어난 치수는 붉게 — 어느 값 때문에 걸렸는지 표를 뒤지지 않게
        headerTooltip: limitText(c.spec),
        formatter: (cell) => {
          const v = cell.getValue();
          if (v === null || v === undefined || v === '') return '<span class="muted">—</span>';
          const bad = (cell.getData()._viol || []).includes(c.key);
          return bad
            ? `<span class="num" style="font-weight:600;color:${theme.color.destructive}">${esc(v)}</span>`
            : `<span class="num">${esc(v)}</span>`;
        },
      })),
    ],
    [valueCols, theme]
  );

  /**
   * 목록 행과 상세를 겹쳐 씁니다.
   *
   * 상세가 오기 전에는 목록 값으로 먼저 그려 모달이 빈 채로 떠 있지 않게 하고,
   * 상세가 와도 **목록에만 있는 열**(`firstAt`·`lastAt`·`seqMin`·`seqMax`·`partial`)은 그대로 씁니다 —
   * 둘 다 같은 시리얼을 말하므로, 상세로 통째로 갈아치우면 측정 시각과 SEQ 범위가 사라집니다.
   */
  const d = { ...(defect || {}), ...(detail || {}) };
  const qty = (v) => <BlindValue field="qty" value={v === null || v === undefined ? '—' : comma(v)} textStyle={s.kvVal} />;
  const failRate = Number.isFinite(Number(d.failRate))
    ? Number(d.failRate)
    : (Number.isFinite(Number(d.failSeqCnt)) && Number(d.seqCnt) > 0 ? (Number(d.failSeqCnt) / Number(d.seqCnt)) * 100 : null);

  /**
   * 판정 정보 — 원천 열 하나에 한 줄.
   *
   * 값이 없는 줄은 아예 만들지 않습니다. 빈 줄을 「—」 로 채워 두면 원천에 그 열이 있는 것처럼 읽힙니다.
   */
  const info = (
    <View style={{ flex: row ? 1 : undefined, minWidth: 0 }}>
      <KeyValue
        keyWidth={96}
        rows={[
          ['작업장 (WC_CD)', d.wcCd || '—'],
          ['설비 (EQPT_CD)', d.eqptCd || '—'],
          ['LOT (LOT_NO)', d.lotNo || '—'],
          ['시리얼 (SERIAL_NO)', d.serialNo || '—'],
          // COMMENT 의 뜻(호기·지그)은 아직 확인되지 않아 원천 컬럼명을 그대로 답니다
          ...(d.cavity ? [['COMMENT', d.cavity]] : []),
          ...(d.firstAt ? [['첫 측정 (DATE_TIME)', d.firstAt]] : []),
          ...(d.lastAt ? [['마지막 측정 (DATE_TIME)', d.lastAt]] : []),
          ...(d.seqMin !== undefined && d.seqMin !== null ? [['SEQ 범위', `${comma(d.seqMin)} ~ ${comma(d.seqMax)}`]] : []),
          ['검사 회차', qty(d.seqCnt)],
          ['불량 회차', (
            <View key="ng" style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              {qty(d.failSeqCnt)}
              {failRate === null ? null : (
                <Badge tone={failRate >= 30 ? 'red' : failRate >= 10 ? 'amber' : 'green'}>{`${failRate.toFixed(1)}%`}</Badge>
              )}
            </View>
          )],
          ['판정 (PASSED)', (
            <View key="passed" style={{ flexDirection: 'row', alignItems: 'center' }}>
              {d.passed === undefined || d.passed === null
                ? <Text style={s.kvVal}>—</Text>
                : <Badge tone={d.passed ? 'green' : 'red'}>{d.passed ? '양품' : '불량'}</Badge>}
            </View>
          )],
          // 자정을 넘긴 시리얼 — 이 날짜 구간만 보고 있다는 사실을 감추지 않습니다
          ...(d.partial ? [['구간', `이 날짜 구간은 SEQ ${comma(d.seqMin)} 부터입니다 — 앞 구간은 전날에 있습니다`]] : []),
        ]}
      />

      {/* NAS 경로 — 사진이 올 때만 */}
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

  const picture = !hasPhoto ? null : (
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

      {/* 측정 회차 — 한 줄 = 한 SEQ, 치수는 가로로 */}
      {seqRows.length ? (
        <View style={{ marginTop: 16 }}>
          {/*
            무엇을 보고 있는지 먼저 말합니다.
            「불량 회차만」 일 때는 표의 판정이 전부 불량이라, 원천을 직접 조회한 사람에게는
            PASSED 가 뒤집힌 것처럼 보입니다 — 원천은 PASSED='1'(양품)이 8할입니다.
          */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
            <Text style={s.heading2xs}>측정 회차 (SEQ)</Text>
            <Tabs
              items={[{ value: 'ng', label: '불량 회차만' }, { value: 'all', label: '전체 회차' }]}
              value={only}
              onChange={setOnly}
            />
            <Text style={s.caption}>
              {only === 'ng'
                ? `불량 회차 ${comma(detail?.failSeqCnt ?? seqRows.length)}회차 중 앞 ${comma(seqRows.length)}회차 · 치수 ${valueCols.length}개`
                : `전체 ${comma(detail?.seqCnt ?? seqRows.length)}회차 중 앞 ${comma(seqRows.length)}회차 · 치수 ${valueCols.length}개`}
            </Text>
          </View>

          {/* 몇 번째 회차에서 걸렸는지 — 표를 뒤지지 않고 바로 알 수 있어야 합니다 */}
          {detail?.failSeqs?.length ? (
            <Text style={[s.body, { marginBottom: 8 }]}>
              <Text style={{ color: theme.color.destructive, fontWeight: '600' }}>불량 회차 </Text>
              {failSeqText(detail.failSeqs, detail.failSeqCnt, 12)}
            </Text>
          ) : null}

          <TabulatorGrid
            columns={measurementColumns}
            rows={seqRows}
            // 모달 안(ScrollView)에서는 가상 스크롤이 높이를 잘못 재 한 줄만 보입니다 — 'basic' 으로 실제 높이를 쓰게 합니다
            tableOptions={MEASUREMENT_TABLE_OPTIONS}
            height={seqRows.length > 12 ? 420 : undefined}
            headerFilter={false}
            emptyText="측정 회차가 없습니다."
          />

          {/* 한계는 되맞춘 값입니다 — 어디서 나온 것인지 밝혀 둡니다 */}
          {detail?.spec?.length ? (
            <Text style={[s.caption, { marginTop: 6 }]}>
              {`붉은 값은 한계를 벗어난 치수입니다 · 한계가 확정된 항목 ${detail.spec.length}개`}
              {detail.limitBasis ? ` · ${detail.limitBasis}` : ''}
            </Text>
          ) : (
            <Text style={[s.caption, { marginTop: 6 }]}>
              치수 열이 많아 표를 옆으로 밀어 볼 수 있습니다 · 한계(상·하한)가 확정되지 않아 벗어난 값을 짚지 못합니다
            </Text>
          )}
        </View>
      ) : loading ? (
        <View style={{ marginTop: 12 }}><Loading compact text="측정 회차를 불러오는 중입니다…" /></View>
      ) : null}

      <SourceNote>
        측정값은 MSSQL 치수 검사(EDGE.dbo.TB_SAMSUN_DIMENSION) 원천이며, 한 회차(SEQ)가 치수 45~58개를 함께 갖습니다. 한계(상·하한)는 원천에 없어 합격 표본에서 되맞춘 값입니다.
      </SourceNote>
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

/** 치수 열 앞에 늘 붙는 네 칸 — 원천 열 그대로(SEQ · PASSED · DATE_TIME · COMMENT) */
const MEASUREMENT_HEAD_COLUMNS = [
  { title: 'SEQ', field: 'seq', width: 76, frozen: true, hozAlign: 'right', headerHozAlign: 'right', sorter: 'number', formatter: (c) => `<span class="num">${esc(c.getValue())}</span>` },
  {
    title: '판정 (PASSED)',
    field: 'passed',
    width: 104,
    frozen: true,
    hozAlign: 'center',
    headerHozAlign: 'center',
    formatter: (c) => {
      const v = c.getValue();
      if (v === null || v === undefined) return '<span class="muted">—</span>';
      const ok = v === true || v === 1 || v === '1';
      return `<span class="tag ${ok ? 'tag-green' : 'tag-red'}">${ok ? '양품' : '불량'}</span>`;
    },
  },
  { title: '측정 시각 (DATE_TIME)', field: 'measuredAt', width: 162, formatter: (c) => `<span class="mono nowrap">${esc(dash(c.getValue()))}</span>` },
  { title: 'COMMENT', field: 'cavity', width: 110, formatter: (c) => `<span class="nowrap">${esc(dash(c.getValue()))}</span>` },
];

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
const dash = (v) => (v === null || v === undefined || v === '' ? '—' : v);

/** 열 머리에 다는 한계 안내 — 확정된 항목만 옵니다 */
function limitText(spec) {
  if (!spec) return '한계 없음';
  const parts = [];
  if (spec.lower !== null && spec.lower !== undefined) parts.push(`하한 ${spec.lower}`);
  if (spec.upper !== null && spec.upper !== undefined) parts.push(`상한 ${spec.upper}`);
  return parts.join(' · ') || '한계 없음';
}

/** 바이트 → KB / MB */
function kb(bytes) {
  const n = Number(bytes) || 0;
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.round(n / 1024)} KB`;
}
