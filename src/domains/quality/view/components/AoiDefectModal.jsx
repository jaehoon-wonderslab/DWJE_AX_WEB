/**
 * [View] AOI 불량 상세 모달 (REQ_20260911 F-7)
 *
 * 불량 목록에서 행을 누르면 이 컴포넌트가 모달 안에 그려집니다.
 *  왼쪽 — NAS 사진(4:3 확대 · 썸네일 줄 · 촬영 정보 · 경로 복사). `available === false` 는 "파일 없음" 자리표시.
 *  오른쪽 — 판정 정보(작업장·설비·LOT·시리얼·수량·등급 …).
 *  아래 — DIMENSION 검사 항목 표(SEQ 당 1종류 · 하나라도 불량이면 시리얼 불량). MSSQL 원천이 붙기 전에는 나오지 않습니다.
 *
 * 상세는 이 컴포넌트가 직접 받습니다(useAoiDefectDetail) — 모달 내용은 전역 모달 스토어가 그리므로
 * 바깥 컨트롤러의 상태 변화로는 다시 그려지지 않기 때문입니다.
 */
import React from 'react';
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
  const { detail, loading, images, activeImage, activeIndex, showImage, stepImage, copyPath, measurementRows } =
    useAoiDefectDetail(defect?.defectId);

  // 상세가 오기 전에는 목록 행의 값으로 먼저 그립니다 — 모달이 빈 채로 떠 있지 않게
  const d = detail || defect || {};
  const qty = (v) => <BlindValue field="qty" value={v === null || v === undefined ? '—' : comma(v)} textStyle={s.kvVal} />;
  const failCnt = d.ngQty ?? d.failSeqCnt;
  const seqCnt = d.sampleQty ?? d.seqCnt;

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
          ['검사 · 양품 · 불량', (
            <View key="qty" style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              {qty(seqCnt)}<Text style={s.textXs}>/</Text>{qty(d.okQty)}<Text style={s.textXs}>/</Text>{qty(failCnt)}
            </View>
          )],
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

      {/* DIMENSION 검사 항목 — MSSQL 원천이 붙으면 SEQ 당 한 줄로 옵니다 */}
      {measurementRows.length ? (
        <View style={{ marginTop: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
            <Text style={s.heading2xs}>검사 항목</Text>
            <Text style={s.caption}>{`${comma(measurementRows.length)}건 · 불량 ${comma(measurementRows.filter((m) => m.passed === false || m.passed === 0).length)}건 · SEQ 당 검사 1종류`}</Text>
          </View>
          <TabulatorGrid
            columns={MEASUREMENT_COLUMNS}
            rows={measurementRows}
            // 모달 안(ScrollView)에서는 가상 스크롤이 높이를 잘못 재 한 줄만 보입니다 — 'basic' 으로 실제 높이를 쓰게 합니다
            tableOptions={MEASUREMENT_TABLE_OPTIONS}
            height={measurementRows.length > 12 ? 420 : undefined}
            headerFilter={false}
            emptyText="검사 항목이 없습니다."
          />
        </View>
      ) : loading ? (
        <View style={{ marginTop: 12 }}><Loading compact text="검사 항목을 불러오는 중입니다…" /></View>
      ) : null}

      <SourceNote>사진은 NAS 원본을 API 가 인증 후 전달합니다(서명 링크 · 만료 시 다시 조회). 검사 항목은 MSSQL 치수 검사(TB_SAMSUN_DIMENSION) 원천입니다.</SourceNote>
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

const MEASUREMENT_COLUMNS = [
  { title: 'SEQ', field: 'seq', width: 72, hozAlign: 'right', headerHozAlign: 'right', sorter: 'number', formatter: (c) => `<span class="num">${esc(c.getValue())}</span>` },
  {
    title: '판정',
    field: 'passed',
    width: 78,
    hozAlign: 'center',
    headerHozAlign: 'center',
    formatter: (c) => {
      const v = c.getValue();
      if (v === null || v === undefined) return '<span class="muted">—</span>';
      const ok = v === true || v === 1 || v === '1';
      return `<span class="tag ${ok ? 'tag-green' : 'tag-red'}">${ok ? '통과' : '불량'}</span>`;
    },
  },
  { title: '검사 항목', field: 'name', minWidth: 110, formatter: (c) => `<span class="mono">${esc(dash(c.getValue()))}</span>` },
  { title: '측정값', field: 'value', minWidth: 110, widthGrow: 1, hozAlign: 'right', headerHozAlign: 'right', formatter: (c) => `<span class="num">${esc(dash(c.getValue()))}</span>` },
  { title: '측정 시각', field: 'dateTime', minWidth: 140, formatter: (c) => `<span class="mono nowrap">${esc(dash(c.getValue()))}</span>` },
  { title: '비고', field: 'comment', minWidth: 120, widthGrow: 1, headerSort: false, formatter: (c) => esc(dash(c.getValue())) },
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
