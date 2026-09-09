---
category: feedback-overlays
---
# ToastHost · ModalHost · DrawerHost

`Overlays.jsx` 의 오버레이 호스트 셋. **App 최상위에 각각 한 번만 두고**, 화면 코드는 `useUiStore` 의 액션으로 띄웁니다 — 호스트 자체에는 props 가 없습니다.

**ToastHost** — 화면 우하단(right 24 · bottom 24)의 잉크 네이비(#0B1440) 알약. 흰 12.5px 500 글자, 반지름 12, 최대 폭 460, 패널 그림자. 220ms 로 떠오르고 2.2초 뒤 내려갑니다. 저장·삭제·전송 완료처럼 "확인만 하면 되는" 결과에 쓰고, 오류는 `FormAlert` 로 폼에 남깁니다. 한 번에 한 개만 보이며 새 호출이 이전 문구를 덮습니다.

스토어 API (`import { useUiStore } from 'dwje-ax-web'`):
- `useUiStore.getState().toast(message: string): void` — 문구를 띄우고 2200ms 후 자동 숨김
- 상태: `toastMessage: string` · `toastVisible: boolean`
- 미리보기·정적 화면에서 자동 숨김 없이 보이게 하려면 `useUiStore.setState({ toastMessage, toastVisible: true })`

```jsx
// App 최상위
<ToastHost />
// 화면에서
useUiStore.getState().toast('PR-03 점검 기준을 저장했습니다.');
```
