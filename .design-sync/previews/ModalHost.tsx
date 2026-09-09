import './_rnw';
import React, { useEffect } from 'react';
import { ModalHost, useUiStore, openConfirmModal, openFormModal, KeyValue, StateBadge, Button, SourceNote } from 'dwje-ax-web';

// 미리보기 전용 보정 2가지 (컴포넌트 소스가 아니라 실행 환경 문제):
// 1) ds 번들에는 Metro 와 달리 `global` 이 없어 RN Animated 가 stop() 에서 ReferenceError 를 냅니다.
// 2) 캡처 하네스가 Date.now 를 고정하면 Animated(Date.now 기반)가 첫 프레임에 멈춥니다 — 고정된 동안만 호출마다 16ms 전진.
(globalThis as any).global ??= globalThis;
const __realNow = Date.now.bind(Date);
let __prev = 0;
let __last = 0;
Date.now = () => {
  const t = __realNow();
  __last = t > __last ? t : t === __prev ? __last + 16 : __last;
  __prev = t;
  return __last;
};

/**
 * 모달은 App 최상위의 <ModalHost /> 한 개가 그립니다. 화면에서는
 * `useUiStore.getState().openModal({ title, sub, wide, render(close), footer(close) })`
 * 또는 단축 함수 `openConfirmModal(...)` · `openFormModal(...)` 을 부릅니다.
 * 미리보기는 마운트 때 열고 언마운트 때 모두 닫습니다.
 */
const Stage = ({ open }: { open: () => void }) => {
  useEffect(() => {
    open();
    return () => useUiStore.getState().closeAllModals();
  }, []);
  return (
    <div style={{ width: 860, height: 620, background: '#F4F5F6', borderRadius: 24 }}>
      <ModalHost />
    </div>
  );
};

/** 확인 모달 — openConfirmModal · 되돌리기 어려운 동작 앞에 한 번 묻습니다(danger 는 붉은 버튼) */
export const Confirm = () => (
  <Stage
    open={() =>
      openConfirmModal({
        title: 'AOI 판정 기준 삭제',
        sub: '품질관리 > 판정 기준',
        message: '기준 "Krios_s 외관 v3" 을 삭제합니다. 진행 중인 LOT 판정에는 영향이 없지만 되돌릴 수 없습니다.',
        confirmLabel: '삭제',
        danger: true,
      })
    }
  />
);

/** 폼 모달 — openFormModal · 필드 정의만 넘기면 2열 그리드 폼 + 취소/저장 발판이 만들어집니다 */
export const Form = () => (
  <Stage
    open={() =>
      openFormModal({
        title: '설비 점검 기준 등록',
        sub: '설비관리 > 점검 기준',
        fields: [
          { key: 'equip', label: '설비', type: 'select', options: ['PR-03', 'PL-01', 'CT-02', 'AOI-1'], value: 'PR-03', required: true },
          { key: 'item', label: '점검 항목', required: true, value: '금형 하중 편차' },
          { key: 'upper', label: '상한', type: 'number', value: '3.0', placeholder: '단위 %' },
          { key: 'lower', label: '하한', type: 'number', value: '-3.0', placeholder: '단위 %' },
          { key: 'cycle', label: '점검 주기', type: 'radio', options: ['교대별', '일 1회', '주 1회'], value: '교대별' },
          { key: 'memo', label: '비고', type: 'textarea', full: true, placeholder: '금형 교체 후 첫 로트는 편차 기준을 1.5% 로 강화' },
        ],
        note: '등록 후 공정 모니터링의 이상 알림 조건으로 바로 쓰입니다.',
        submitLabel: '등록',
      })
    }
  />
);

/** 상세 모달 — openModal 직접 호출 · render 에 표, footer 에 동작 버튼 */
export const Detail = () => (
  <Stage
    open={() =>
      useUiStore.getState().openModal({
        title: 'LOT L260909-0412',
        sub: 'Plating · PL-01 · Krios_s',
        render: () => (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <KeyValue
              keyWidth={110}
              rows={[
                ['상태', <StateBadge state="점검 중" />],
                ['투입 수량', '2,400 EA'],
                ['양품 / 불량', '2,338 / 62 EA'],
                ['수율', '97.4%'],
                ['도금 두께', '12.4 µm (하한 12.0)'],
                ['담당', '이재훈 (생산1팀)'],
              ]}
            />
            <SourceNote>근거: MES 실적 09:55 · XRF-2 측정 5포인트 평균</SourceNote>
          </div>
        ),
        footer: (close: () => void) => (
          <>
            <Button label="닫기" onPress={close} />
            <Button label="재검 요청" variant="primary" onPress={close} />
          </>
        ),
      })
    }
  />
);
