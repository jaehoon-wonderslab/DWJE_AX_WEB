---
category: feedback-overlays
---
# DrawerHost

오른쪽에서 밀려 나오는 400px(화면 폭의 92% 이하) 드로어. 잉크 20% 오버레이 · 흰 패널 · 왼쪽 헤어라인, 머리말은 상단바 높이(제목 18px 600 · 부제 10.5px · 닫기 IconButton), 본문은 padding 20 스크롤. 목록 행을 눌렀을 때의 상세·이상 알림 내용처럼 "목록을 유지한 채 옆에서 읽는" 읽기 전용 내용에 쓰고, 입력·저장이 있으면 모달(`openFormModal`)을 씁니다. 한 번에 하나만 열리며 새 `openDrawer` 가 이전 내용을 바꿉니다.

스토어 API (`useUiStore.getState()`):
- `openDrawer({ title: string, sub?: string, render: ReactNode | (close) => ReactNode })`
- `closeDrawer()`
- 상태: `drawer: config | null`

```jsx
<DrawerHost /> {/* App 최상위 */}

useUiStore.getState().openDrawer({
  title: 'PR-03', sub: 'PRESS · 1라인 · Krios_s',
  render: (
    <>
      <KeyValue rows={[['상태', <StateBadge state="가동" />], ['금일 생산', '31,200 EA']]} />
      <Hint icon="alert">교체 이후 치수 불량이 3건 집중되었습니다.</Hint>
    </>
  ),
});
```
