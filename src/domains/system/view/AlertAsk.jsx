/**
 * [View] 한 번 묻고 답을 Promise 로 돌려주는 확인 창 — 발송 조건(SY-04)·수신자(SY-05) 폼 공용
 *
 * 공통 openConfirmModal 은 취소·바깥 클릭을 알려 주지 않아, 폼 저장 도중에 묻고 기다릴 수 없습니다.
 */
import React, { useEffect } from 'react';
import { Text } from 'react-native';
import { Button } from '@shared/components/ui';
import { useUiStore } from '@shared/stores/useUiStore';
import { useCommonStyles } from '@shared/theme/styles';

/** 확인 본문 — 창이 어떤 식으로 닫혀도(바깥 클릭·X) 답을 한 번 돌려줍니다 */
function ConfirmText({ message, onGone }) {
  const s = useCommonStyles();
  useEffect(() => () => onGone(), []); // eslint-disable-line react-hooks/exhaustive-deps
  return <Text style={s.text}>{message}</Text>;
}

/**
 * 한 번 묻고 답을 Promise 로 돌려줍니다 (확인 = true, 그 밖의 닫기 = false)
 * @param {{title:string, message:string, confirmLabel?:string, danger?:boolean}} cfg
 */
export function askConfirm({ title, message, confirmLabel = '확인', danger = false }) {
  return new Promise((resolve) => {
    let done = false;
    let id = null;
    const answer = (v) => { if (!done) { done = true; resolve(v); } };
    // 본문이 내려갈 때 창이 실제로 닫혔는지 보고 답합니다 (개발 모드의 이중 마운트에 속지 않도록)
    const gone = () => setTimeout(() => {
      if (!useUiStore.getState().modals.some((m) => m.id === id)) answer(false);
    }, 0);
    id = useUiStore.getState().openModal({
      title,
      render: () => <ConfirmText message={message} onGone={gone} />,
      footer: (close) => (
        <>
          <Button label="취소" onPress={() => { answer(false); close(); }} />
          <Button label={confirmLabel} variant={danger ? 'danger' : 'primary'} onPress={() => { answer(true); close(); }} />
        </>
      ),
    });
  });
}

