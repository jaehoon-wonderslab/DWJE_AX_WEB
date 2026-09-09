---
category: cards-layout
---
# FullPageContainer

전체 영역을 쓰는 화면용 컨테이너(자연어 질의·채팅처럼 내부에서 스크롤을 직접 관리하는 화면). 스크롤 없이 `flex: 1 · minHeight: 0 · padding 24(위 16) · maxWidth 1400` 만 두고, 자식 카드에 `style={{ flex: 1 }}` 을 줘 남은 높이를 채웁니다. `PageHead` 는 쓰지 않습니다. 일반 스크롤 화면은 `PageContainer` 를 쓰세요.

- `children: ReactNode`
- `style?: ViewStyle`

```jsx
<FullPageContainer>
  <Card title="자연어 질의" style={{ flex: 1 }} bodyStyle={{ flex: 1 }}>…</Card>
</FullPageContainer>
```
