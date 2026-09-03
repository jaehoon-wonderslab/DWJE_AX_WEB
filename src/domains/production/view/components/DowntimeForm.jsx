/**
 * [View] 비가동 사유 등록·수정 폼 (PR-05-F03 ~ F05)
 *
 * ⑨ 이상 알림 Agent 가 제안한 사유 후보를 함께 보여 주고,
 * 담당자가 그중 하나를 고르거나 직접 선택하도록 합니다.
 */
import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { SourceNote } from '@shared/components/ui/Card';
import Button from '@shared/components/ui/Button';
import { SelectField, TextAreaField, TextField } from '@shared/components/ui/Field';
import { Loading } from '@shared/components/ui/Feedback';
import { useUiStore } from '@shared/stores/useUiStore';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';

const EQUIPMENTS = ['PR-01', 'PR-02', 'PR-03', 'PR-04', 'PR-05', 'PR-06', 'PR-07', 'PR-08', 'PR-09', 'PR-10'];

export default function DowntimeForm({ row, codes, fetchSuggestion, onSubmit }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const toast = useUiStore((state) => state.toast);

  const [eqptCd, setEqptCd] = useState(row?.eqptCd || 'PR-05');
  const [stopAt, setStopAt] = useState(row?.stopAt || '');
  const [resumeAt, setResumeAt] = useState(row?.resumeAt || '');
  const [reason, setReason] = useState(row?.reasonNm || '');
  const [remark, setRemark] = useState(row?.remark || '');

  // Agent 사유 후보 제안 — 설비가 바뀌면 다시 받아옵니다
  const [candidates, setCandidates] = useState([]);
  const [loadingSuggestion, setLoadingSuggestion] = useState(true);
  useEffect(() => {
    let alive = true;
    setLoadingSuggestion(true);
    fetchSuggestion({ eqptCd, stopAt })
      .then((res) => {
        if (alive) setCandidates(res?.candidates || []);
      })
      .catch(() => {
        if (alive) setCandidates([]);
      })
      .finally(() => {
        if (alive) setLoadingSuggestion(false);
      });
    return () => {
      alive = false;
    };
  }, [eqptCd, stopAt, fetchSuggestion]);

  const submit = () => {
    if (!reason) {
      toast('사유를 선택하세요');
      return;
    }
    onSubmit({ downtimeId: row?.downtimeId, eqptCd, stopAt, resumeAt, reasonCd: reason, remark });
  };

  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap' }}>
        <SelectField label="설비" value={eqptCd} options={EQUIPMENTS} onChange={setEqptCd} style={{ flexGrow: 1, flexBasis: 220 }} required full />
        <TextField label="정지 시각" value={stopAt} onChangeText={setStopAt} placeholder="예) 08:12" style={{ flexGrow: 1, flexBasis: 160 }} required full />
        <TextField label="복구 시각" value={resumeAt} onChangeText={setResumeAt} placeholder="미복구면 비워 둡니다" style={{ flexGrow: 1, flexBasis: 160 }} full />
      </View>

      {/* Agent 사유 후보 */}
      <View style={{ marginTop: 14 }}>
        <Text style={[s.fieldLabel, { marginBottom: 7 }]}>Agent 제안 사유</Text>
        {loadingSuggestion ? (
          <Loading compact text="" />
        ) : (
          candidates.map((c) => {
            const on = reason === c.reasonNm;
            return (
              <TouchableOpacity
                key={c.reasonCd}
                onPress={() => setReason(c.reasonNm)}
                activeOpacity={0.75}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  padding: 11,
                  marginBottom: 6,
                  borderWidth: 1,
                  borderColor: on ? theme.color.primary : theme.color.border,
                  backgroundColor: on ? theme.alpha('primary', 0.07) : theme.color.card,
                  borderRadius: theme.metrics.radius,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[s.textSm, { fontWeight: '600' }]}>{c.reasonNm}</Text>
                  <Text style={[s.textXs, { marginTop: 2 }]}>{c.basis}</Text>
                </View>
                <Text style={[s.textSm, s.num, { fontWeight: '700', color: theme.color.primary }]}>{Math.round(c.confidence * 100)}%</Text>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      <SelectField label="사유 (표준 분류)" value={reason} options={codes.map((c) => c.nm)} onChange={setReason} required full style={{ marginTop: 12 }} />

      <TextAreaField label="비고" value={remark} onChangeText={setRemark} rows={2} placeholder="조치 내용이나 특이사항을 적어 두면 이후 원인 분석에 쓰입니다" />

      <SourceNote>
        등록한 사유는 설비 가동률 산출과 이상 알림 판정 근거로 함께 쓰입니다. 제안 사유는 정지 직전 신호·과거 이력에서 추정한 값이므로 반드시 확인 후 선택하세요.
      </SourceNote>

      <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
        <Button label={row?.registered ? '수정' : '등록'} variant="primary" onPress={submit} />
      </View>
    </View>
  );
}
