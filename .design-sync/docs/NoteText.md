---
category: feedback-overlays
---
# NoteText

표·수치·정의 목록 아래에 붙는 보조 설명. 왼쪽 2px 세로선(#DFE1E7) + 10.5px/16px 캡션 회색 500, 위 여백 10. 계산식·측정 조건·모델 버전처럼 "값을 어떻게 읽어야 하는지" 를 적습니다. 근거 출처만 적을 때는 `SourceNote`(점선 구분선) 를, 화면 상단 안내는 `Hint` 를 씁니다.

- `children: React.ReactNode` — 설명 문구
- `style?: any`

```jsx
<KeyValue rows={[['도금 두께', '12.4 µm'], ['하한', '12.0 µm']]} />
<NoteText>두께는 5포인트 평균값. 측정기 XRF-2 · 교정일 2026-08-30.</NoteText>
```
