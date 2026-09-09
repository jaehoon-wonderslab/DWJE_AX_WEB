---
category: data-display
---
# Pred · ConfTag · Drift

AI 예측·추정값 표시 묶음(QC-02 AOI 판정 분석·예측). 실측 KPI(`StatCard`)와 눈으로 구분되도록 `Pred` 는 테두리 없는 #FAFAFA 카드(14/16 여백)에 라벨(10.5px 캡션) · 값(Inter 600 · 18px) · 단위(12px 400) · 신뢰 구간 문구(10.5px 캡션)를 세로로 놓습니다. `level` 로 카드 바탕을 바꿉니다 — `''` 기본, `watch` 앰버 10% 틴트(관찰), `risk` 적색 6% 틴트(조치 권장). 값은 미리 포맷한 문자열로 넘기고, `children` 에 `ConfTag`·`Drift` 를 함께 두어 근거를 붙입니다.

`ConfTag` 는 헤어라인 캡슐의 "신뢰도 NN%" 태그(0~1 값을 반올림), `Drift` 는 ▲/▼ + 절댓값(소수 1자리) + 단위의 추세 글자로, 기본은 **오르면 나쁨(적색)·내리면 좋음(성공색)** 입니다(불량률·비가동). 수율·달성률·가동률처럼 오르는 게 좋은 지표는 `invert` 를 켭니다. 앰버는 `watch` 틴트에만 쓰고 값 글자에는 쓰지 않습니다.

**Pred**
- `label: string` — 무엇의 예측인지
- `value: React.ReactNode` — 예측값(문자열 포맷)
- `unit?: string` — 단위, 값 뒤 작은 글씨
- `ci?: string` — 신뢰 구간·근거 한 줄
- `level?: '' | 'watch' | 'risk'` — 기본 `''`
- `style?: ViewStyle`
- `children?: React.ReactNode` — 태그·추세·버튼 등 부가 요소

**ConfTag**
- `value: number` — 0~1 신뢰도

**Drift**
- `value: number` — 변화량(양수 ▲ · 음수 ▼)
- `unit?: string` — 기본 `'%p'`
- `invert?: boolean` — 상승을 좋음으로 해석

```jsx
<Pred level="risk" label="PR-03 치수 불량 예측" value="4.6" unit="%" ci="목표 2.0% 초과 · 점검 권장">
  <ConfTag value={0.87} />
  <Drift value={0.4} />
</Pred>
```
