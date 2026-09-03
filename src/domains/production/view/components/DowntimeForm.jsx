/**
 * [View] 비가동 사유 등록·수정 폼 (PR-05-F03 ~ F05)
 *
 * ⑨ 이상 알림 Agent 가 제안한 사유 후보를 함께 보여 주고,
 * 담당자가 그중 하나를 고르거나 표준 분류에서 직접 선택하도록 합니다.
 *
 * - 설비 선택지: 서버 기준정보(`eqptOptions`, 화면에 박아 두지 않음)
 * - 사유 선택지: 공통코드 DOWN_REASON(`reasonCodes` [{value, label}]) — 서버에는 코드(value)로 보냅니다
 * - 수정(기존 이력)은 서버가 사유·비고·복구 시각만 받으므로 설비·정지 시각은 읽기 전용으로 보여 줍니다
 */
import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { SourceNote } from '@shared/components/ui/Card';
import Button from '@shared/components/ui/Button';
import { SelectField, TextAreaField, TextField } from '@shared/components/ui/Field';
import { Loading } from '@shared/components/ui/Feedback';
import KeyValue from '@shared/components/ui/KeyValue';
import { useUiStore } from '@shared/stores/useUiStore';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';

/** 신뢰도 — 서버가 0~1 로 주면 %, 이미 % 면 그대로 */
const confidenceText = (c) => {
  if (c === null || c === undefined || c === '') return '';
  const n = Number(c);
  if (Number.isNaN(n)) return String(c);
  return `${Math.round(n <= 1 ? n * 100 : n)}%`;
};

export default function DowntimeForm({ row, date, reasonCodes = [], eqptOptions, fetchSuggestion, onSubmit }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const toast = useUiStore((state) => state.toast);

  // 기준정보 설비 목록에서 '전체' 만 뺍니다 (선택지 자체는 서버 값)
  const equipmentList = (eqptOptions || [])
    .map((e) => (typeof e === 'string' ? { value: e, label: e } : e))
    .filter((e) => e && e.value !== '전체');

  const isEdit = !!row?.registered && !!row?.downtimeId;

  const [eqptCd, setEqptCd] = useState(row?.eqptCd || '');
  const [stopAt, setStopAt] = useState(row?.stopAt || '');
  const [resumeAt, setResumeAt] = useState(row?.resumeAt || '');
  const [reasonCd, setReasonCd] = useState(row?.reasonCd || '');
  const [remark, setRemark] = useState(row?.remark || '');

  // Agent 사유 후보 제안 — 설비·정지 시각이 바뀌면 다시 받아옵니다 (경쟁 방지 alive 플래그)
  const [candidates, setCandidates] = useState([]);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  useEffect(() => {
    if (!eqptCd || !String(stopAt).trim() || typeof fetchSuggestion !== 'function') {
      setCandidates([]);
      return undefined;
    }
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
    if (!eqptCd) {
      toast('설비를 선택하세요');
      return;
    }
    if (!String(stopAt).trim()) {
      toast('정지 시각을 입력하세요 (예: 08:12)');
      return;
    }
    if (!reasonCd) {
      toast('사유를 선택하세요');
      return;
    }
    onSubmit({ downtimeId: row?.downtimeId, eqptCd, stopAt, resumeAt, reasonCd, remark });
  };

  return (
    <View>
      {isEdit ? (
        <KeyValue keyWidth={82} rows={[['설비', row.eqptCd], ['정지 시각', row.stopAt || '—']]} style={{ marginBottom: 6 }} />
      ) : (
        <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap' }}>
          <SelectField
            label="설비"
            value={eqptCd}
            options={equipmentList}
            onChange={setEqptCd}
            style={{ flexGrow: 1, flexBasis: 220 }}
            placeholder={equipmentList.length ? '설비 선택' : '설비 기준정보를 불러오지 못했습니다'}
            required
            full
          />
          <TextField
            label="정지 시각"
            value={stopAt}
            onChangeText={setStopAt}
            placeholder={`예) 08:12 (${date || '조회 일자'} 기준)`}
            style={{ flexGrow: 1, flexBasis: 160 }}
            required
            full
          />
        </View>
      )}
      <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap', marginTop: isEdit ? 0 : 0 }}>
        <TextField
          label="복구 시각"
          value={resumeAt}
          onChangeText={setResumeAt}
          placeholder="미복구면 비워 둡니다 (예: 09:40)"
          style={{ flexGrow: 1, flexBasis: 160 }}
          full
        />
      </View>

      {/* Agent 사유 후보 — 클릭하면 아래 표준 분류가 함께 선택됩니다 */}
      <View style={{ marginTop: 14 }}>
        <Text style={[s.fieldLabel, { marginBottom: 7 }]}>Agent 제안 사유</Text>
        {loadingSuggestion ? (
          <Loading compact text="" />
        ) : candidates.length ? (
          candidates.map((c, i) => {
            const on = reasonCd === c.reasonCd;
            return (
              <TouchableOpacity
                key={`${c.reasonCd}-${i}`}
                onPress={() => setReasonCd(c.reasonCd)}
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
                  <Text style={[s.textSm, { fontWeight: '600' }]}>{c.reasonNm || c.reasonCd}</Text>
                  {c.basis ? <Text style={[s.textXs, { marginTop: 2 }]}>{c.basis}</Text> : null}
                </View>
                {confidenceText(c.confidence) ? (
                  <Text style={[s.textSm, s.num, { fontWeight: '700', color: theme.color.primary }]}>{confidenceText(c.confidence)}</Text>
                ) : null}
              </TouchableOpacity>
            );
          })
        ) : (
          <Text style={s.textXs}>
            {eqptCd && String(stopAt).trim() ? '제안된 사유 후보가 없습니다. 아래 표준 분류에서 직접 선택하세요.' : '설비와 정지 시각을 입력하면 Agent 가 사유 후보를 제안합니다.'}
          </Text>
        )}
      </View>

      <SelectField label="사유 (표준 분류)" value={reasonCd} options={reasonCodes} onChange={setReasonCd} required full style={{ marginTop: 12 }} />

      <TextAreaField label="비고" value={remark} onChangeText={setRemark} rows={2} placeholder="조치 내용이나 특이사항을 적어 두면 이후 원인 분석에 쓰입니다" />

      <SourceNote>
        등록한 사유는 설비 가동률 산출과 이상 알림 판정 근거로 함께 쓰입니다. 제안 사유는 정지 직전 신호·과거 이력에서 추정한 값이므로 반드시 확인 후 선택하세요.
      </SourceNote>

      <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
        <Button label={isEdit ? '수정' : '등록'} variant="primary" onPress={submit} />
      </View>
    </View>
  );
}
