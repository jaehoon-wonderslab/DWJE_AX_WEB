---
category: feedback-overlays
---
# ModalHost

가운데 모달 스택. 잉크 28% 오버레이 위에 흰 패널(반지름 24 · 헤어라인 · 패널 그림자 · 최대 높이 85vh)이 260ms 떠오르고, `title` 이 있으면 18px 600 제목 + 10.5px 부제 + 닫기 IconButton 머리말, 본문(padding 20, `tight` 면 0), `footer` 가 있으면 위 구분선 + 오른쪽 정렬 버튼 줄(gap 8). 폭은 620, `wide` 면 900, `maxWidth` 로 직접 지정. 모달 위에 모달(폼 → 확인)을 띄울 수 있고 오버레이 클릭·ESC 로 닫힙니다. 발판 버튼은 취소(outline) 왼쪽 · 주 동작(primary 또는 danger) 오른쪽, 주 동작은 하나만.

스토어 API (`useUiStore.getState()`):
- `openModal(config): number` — `config = { title?, sub?, wide?, maxWidth?, tight?, render: ReactNode | (close) => ReactNode, footer?: ReactNode | (close) => ReactNode }`. 모달 id 반환
- `closeModal(id?)` — id 없으면 맨 위 모달 · `closeAllModals()`
- 상태: `modals: Array<{ id, ...config }>`

단축 함수 (`import { openConfirmModal, openFormModal } from 'dwje-ax-web'`):
- `openConfirmModal({ title, sub?, message, confirmLabel = '확인', danger?, onConfirm? })` — 삭제·전환 전에 한 번 묻는 확인 모달(취소 + 확인 두 버튼)
- `openFormModal({ title, sub?, fields, initial?, note?, submitLabel = '저장', cancelLabel = '취소', onSubmit?(values) => boolean|void|Promise, wide?, extra?, danger? })` — 필드 정의만으로 2열 그리드 폼. `fields[]` 항목: `{ key, label, required?, type?: 'text'|'number'|'select'|'textarea'|'date'|'radio'|'check'|'static', options?, value?, placeholder?, rows?, full? }`. 필수 칸이 비면 그 칸 아래 오류를 붙이고 제출을 막으며, `onSubmit` 이 `false` 를 반환하면 모달을 유지합니다

```jsx
<ModalHost /> {/* App 최상위 */}

openConfirmModal({ title: 'AOI 판정 기준 삭제', sub: '품질관리 > 판정 기준', message: '되돌릴 수 없습니다.', confirmLabel: '삭제', danger: true, onConfirm: remove });

openFormModal({
  title: '설비 점검 기준 등록', sub: '설비관리 > 점검 기준',
  fields: [
    { key: 'equip', label: '설비', type: 'select', options: ['PR-03', 'PL-01'], required: true },
    { key: 'item', label: '점검 항목', required: true },
    { key: 'memo', label: '비고', type: 'textarea', full: true },
  ],
  note: '등록 후 이상 알림 조건으로 바로 쓰입니다.', submitLabel: '등록', onSubmit: save,
});

useUiStore.getState().openModal({
  title: 'LOT L260909-0412', sub: 'Plating · PL-01',
  render: () => <KeyValue rows={[['수율', '97.4%']]} />,
  footer: (close) => <><Button label="닫기" onPress={close} /><Button label="재검 요청" variant="primary" /></>,
});
```
