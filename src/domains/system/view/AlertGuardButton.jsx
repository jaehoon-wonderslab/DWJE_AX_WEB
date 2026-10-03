/**
 * [View] 권한으로 막히는 버튼 — 이상 알림 발송 조건(SY-04)·알림 수신자(SY-05) 화면 공용
 *
 * 쓰기 권한이 없거나(R-06) 통합관리자 전용 동작(R-13)이면 버튼을 **숨기지 않고** 비활성으로 그리고,
 * 마우스를 올리면 왜 막혔는지를 브라우저 툴팁(`title`)으로 보입니다. 화면 읽기 프로그램에도 같은 문장이
 * 들리도록 `aria-description` 을 함께 답니다.
 *
 * 공통 Button 에 툴팁 속성이 없어 이 화면 묶음 안에서만 감쌉니다(공통 변경 요청으로 보고).
 */
import React, { useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';
import { Button } from '@shared/components/ui';

/** 쓰기 권한이 없을 때의 안내 (공통 지침 문구) */
export const WRITE_DENIED_TIP = '미배정 계정은 이 동작을 할 수 없습니다. 전산팀에 부서 배정을 요청하세요.';

/** 조건 삭제는 통합관리자만 (결정 R-13) */
export const DELETE_SUPER_ONLY_TIP = '삭제는 통합관리자만 할 수 있습니다. 사용하지 않는 조건은 중지하세요.';

/** 연락처를 다루는 동작은 데이터 권한(worker)이 있어야 합니다 (기획 06 RCP-01) */
export const WORKER_DENIED_TIP = '데이터 권한(worker) 필요 — 연락처를 다룰 데이터 권한이 없습니다.';

/**
 * Tabulator 셀(HTML 문자열)용 버튼 — 막혔으면 disabled + title 을 답니다.
 *
 * @param {string} act data-act 값
 * @param {string} label 버튼 글자
 * @param {string} [deniedTip] 막힌 이유 (없으면 활성)
 * @param {(v:string)=>string} esc HTML 이스케이프 함수
 */
export function htmlGuardButton(act, label, deniedTip, esc) {
  if (!deniedTip) return `<button class="tbtn" data-act="${act}">${esc(label)}</button>`;
  return `<button class="tbtn" data-act="${act}" disabled aria-disabled="true" title="${esc(deniedTip)}" style="opacity:.45;cursor:not-allowed">${esc(label)}</button>`;
}

/**
 * @param {object} props Button 의 속성 + 아래 둘
 * @param {string} [props.deniedTip] 막힌 이유. 값이 있으면 비활성으로 그립니다
 * @param {string} [props.testID] 시험에서 찾을 이름
 */
export default function AlertGuardButton({ deniedTip, disabled, testID, ...rest }) {
  const ref = useRef(null);
  const blocked = !!deniedTip;

  // RN Web 의 View 는 title 을 넘기지 않아 DOM 에 직접 답니다
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = ref.current;
    if (!el || typeof el.setAttribute !== 'function') return;
    if (blocked) {
      el.setAttribute('title', deniedTip);
      el.setAttribute('aria-description', deniedTip);
      el.setAttribute('data-denied', '1');
    } else {
      el.removeAttribute('title');
      el.removeAttribute('aria-description');
      el.removeAttribute('data-denied');
    }
  }, [blocked, deniedTip]);

  return (
    <View ref={ref} testID={testID} style={blocked && Platform.OS === 'web' ? { cursor: 'not-allowed' } : null}>
      <Button {...rest} disabled={blocked || disabled} />
    </View>
  );
}
