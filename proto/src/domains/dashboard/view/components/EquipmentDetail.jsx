/**
 * [View] 설비 상세 모달 본문 (DB-01-F03)
 */
import React from 'react';
import { Text, View } from 'react-native';
import { BlindValue, SourceNote } from '@shared/components/ui';
import { useCommonStyles } from '@shared/theme/styles';
import { comma, fixed } from '@shared/utils/formatUtil';

export default function EquipmentDetail({ detail }) {
  const s = useCommonStyles();
  const rows = [
    ['설비', detail.eqptCd],
    ['모델', detail.model],
    ['작업장', detail.workcenter],
    ['금일 생산량', <BlindValue key="q" field="qty" value={`${comma(detail.qty)} EA`} textStyle={s.kvVal} />],
    ['불량률', <BlindValue key="d" field="yield" value={`${fixed(detail.defectRate)} %`} textStyle={s.kvVal} />],
    ['가동률', `${detail.uptimeRate} %`],
    ['IoT 상태', detail.iotState],
    ['정지 경과', detail.stopElapsedMin ? `${detail.stopElapsedMin} 분` : '—'],
    ['장착 금형', <BlindValue key="m" field="mold" value={detail.mold || '—'} textStyle={s.kvVal} />],
  ];

  return (
    <View>
      {rows.map(([k, v]) => (
        <View key={k} style={s.kvRow}>
          <Text style={s.kvKey}>{k}</Text>
          {typeof v === 'string' ? <Text style={s.kvVal}>{v}</Text> : <View style={{ flex: 1 }}>{v}</View>}
        </View>
      ))}
      <SourceNote>설비 파라미터·금형 이력은 데이터 접근 권한(mold)이 있는 계정에만 표시됩니다.</SourceNote>
    </View>
  );
}
