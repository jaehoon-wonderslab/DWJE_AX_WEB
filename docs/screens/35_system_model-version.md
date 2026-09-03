# 35. `/system/model-version` — AI 모델 버전 관리

| 항목 | 값 |
| :--- | :--- |
| URL | `/system/model-version` |
| 화면 ID | `sys-model-ver` |
| 라우트 파일 | `app/(main)/system/model-version.jsx` |
| MVC | `domains/system/view/ModelVersionView.jsx` · `controller/useModelVersionController.js` |
| 기능 ID | SY-11 |
| 접근 권한 | 전산팀 · 통합관리자 |

**서비스 버전(릴리스) = 벡터 인덱스 + 파인튜닝 체크포인트 한 쌍.** 릴리스를 전환하면 자연어 질의가 그 버전으로 응답합니다.

## 1. 컴포넌트

`PageHead`(+벡터 재색인 · 파인튜닝 실행 · 직전 버전 롤백 · `Button primary(릴리스 등록)`) · `StatCard`×4 · **`Tabs`(릴리스 / 벡터 인덱스 / 파인튜닝 / 성능 추이)** · 탭별 `Card`+`Table`(또는 `LineChart`) · `Card(tight)`+`Table`(배포·학습 이력) · 모달 5종

## 2. 화면에 출력해야 하는 정보

### 2-1. 요약 카드 (`GET /ai/model-releases/summary`)

서비스 중 버전(`servingVer`, 보조 `전환 {servingSince}`) · 의도 파악 정확도(`evaluation.intent` %, 보조 `근거 인용률 {cite}%`) · 환각률(`evaluation.halluc` %, 보조 "낮을수록 좋음") · 빌드 보유(`{vectorCnt} / {finetuneCnt}`, 보조 "벡터 인덱스 / 체크포인트")

### 2-2. 탭 1 — 릴리스 (`GET /ai/model-releases`)

버전(mono) · 상태(`서비스 중`→green / `보관`→기본 / 그 외 blue) · 벡터 인덱스(mono) · 체크포인트(mono) · 등록/전환 시각(mono) · 수행자 · 배포 메모(wrap) · 관리(`전환`(서비스 중이면 비활성) · `보관/복원`)

### 2-3. 탭 2 — 벡터 인덱스 (`GET /ai/vector-builds`)

빌드 ID(mono) · 생성 시각(mono) · 소요 · 대상 문서(wrap) · 문서 수 · 청크 수 · 크기 · 상태(`완료` green / `실패` red / 그 외 blue)
행 클릭 → 상세 모달. 카드 우측 `Button(재색인 실행)`

### 2-4. 탭 3 — 파인튜닝 (`GET /ai/finetune-builds`)

빌드 ID(mono) · 생성 시각 · 소요 · 학습 방식 · 학습 데이터 건수 · 의도 파악(%) · 환각률(%) · GPU · 상태
행 클릭 → 상세 모달. 카드 우측 `Button(파인튜닝 실행)`

### 2-5. 탭 4 — 성능 추이 (`GET /ai/model-releases/performance-trend`)

`LineChart`(labels · series, 0~100%, height 240)
각주 : "환각률은 낮을수록 좋은 지표입니다. 전환 판단은 세 지표를 함께 보고 결정하세요."

### 2-6. 배포·학습 이력 (`GET /ai/model-releases/deploy-logs`)

시각(mono) · 구분(`서비스 전환`→green / `롤백`→amber / 그 외) · 내용(wrap) · 수행자

## 3. 버튼 · 모달

| 버튼 | 동작 |
| :--- | :--- |
| 릴리스 등록 | 폼 → `POST /ai/model-releases`. **완료된 벡터 인덱스·체크포인트가 각각 1개 이상 없으면 토스트로 차단** |
| 전환 | **적용 전 성능 비교 모달**(`GET /{ver}/apply-preview`) → 확인 후 `POST /{ver}/apply (mode='즉시 전환')` |
| 직전 버전 롤백 | 확인 모달(danger) → `POST /ai/model-releases/rollback` |
| 보관 / 복원 | `POST /ai/model-releases/{ver}/archive` |
| 벡터 재색인 | 폼 → `POST /ai/vector-builds` |
| 파인튜닝 실행 | 폼 → `POST /ai/finetune-builds` |
| 빌드 행 클릭 | 상세 모달(`GET /ai/vector-builds/{vecId}` 또는 `/ai/finetune-builds/{ftId}`) |

### 3-1. 릴리스 등록 폼

버전(필수, `예) v1.5.0`) · 벡터 인덱스(select — `{vecId} · 문서 N건`) · 파인튜닝 체크포인트(select — `{ftId} · 의도 N%`) · 등록 후 처리(radio: 대기 상태로 등록 / 등록 후 바로 서비스 전환) · 배포 메모(textarea)
안내 : "릴리스는 벡터 인덱스 + 파인튜닝 체크포인트 한 쌍입니다. 둘 중 하나만 바꿔도 새 버전으로 등록해야 롤백이 가능합니다."

### 3-2. 서비스 전환 미리보기 모달

`XlsTable` — 항목 · `현재 {ver}` · `전환 {ver}` · 변화(`±n%p`, `lowerIsBetter` 고려해 ok/bad tone)
각주 : "전환 즉시 신규 질의부터 새 버전이 적용됩니다. 진행 중인 대화는 영향받지 않으며, 전환 이력은 보안 감사 로그에 기록됩니다."

### 3-3. 벡터 재색인 폼

대상 문서(check 전폭: MES 문서 / 보고서 양식 / 용어 사전 / 8D · 부적합 이력 / 폐기 전표 / NAS 검사 증빙 메타) · 임베딩 모델(select: bge-m3-ko(현재) / ko-sbert-nli / multilingual-e5-large) · 청크 크기(512/256/1024 토큰) · 색인 방식(증분 / 전체 재색인) · 실행 시점(radio: 지금 실행 / 다음 배치 02:00)
안내 : "전체 재색인은 40분 내외가 걸리며 진행 중에도 기존 인덱스로 서비스가 유지됩니다."

### 3-4. 파인튜닝 실행 폼

베이스 모델(Qwen2.5-14B-Instruct(현재) / Qwen2.5-32B-Instruct / Llama-3.1-8B-Instruct) · 학습 방식(LoRA r=32·α=64(현재) / r=16·α=32 / r=64·α=128 / Full) · 학습 데이터(질의 이력+검토 결과 12,480건 / 질의 이력만 9,240건 / 검토 확정만 6,180건) · Epoch(number) · 학습률(2e-4(현재)/1e-4/5e-5) · 실행 시점(다음 배치 03:00 / 지금 실행)
안내 : "r=64 이상은 GPU 메모리 초과(OOM)로 실패한 이력이 있습니다. 실행 전 VRAM 여유를 확인하세요."

### 3-5. 빌드 상세 모달

- 벡터 : 빌드 ID · 생성 시각 · 소요 · 대상 문서 · 문서 수 · 청크 수 · 임베딩 모델 · 벡터 차원 · 인덱스 크기 · 상태
- 파인튜닝 : 빌드 ID · 생성 시각 · 소요 · 베이스 모델 · 학습 방식 · 학습 데이터 · Epoch · GPU 메모리 · 상태 · 의도 파악 · 근거 인용률 · 환각률
- 실패 시 원인 각주(OOM 안내), 경로 각주 `서버 경로 /srv/ax/models/{id} · 온프레미스 보관`
- 완료 빌드면 푸터에 `이 빌드로 릴리스 등록`

**페이징** — 릴리스·벡터·파인튜닝·이력 API 모두 `page`/`size` 지원, 화면 미노출. → **개선 항목**

## 4. 그 밖의 기능

- 버전 변경 성공 시 `GET /auth/me` 재조회 → **사이드바 하단 「서비스 모델」 표기 갱신**.
- ⚠️ 폼 선택지(모델명·임베딩·데이터셋)가 화면 상수로 하드코딩 — 서버 목록 연동 검토.

## 5. 사용 API

총 **15건**

**AI 모델 버전 관리** — 15건

| # | 서비스 함수 | API 명 | Method | Path | 요청 파라미터 | 응답 주요 필드 | 접근 권한 | blind | 우선순위 |
|---|---|---|---|---|---|---|---|---|---|
| 195 | `getAiModelReleasesSummary` | 모델 버전 요약 | GET | `/api/v1/ai/model-releases/summary` | — | serving{ver,mode,appliedAt}, releaseCnt, vecCompletedCnt, ftCompletedCnt | 전산팀·통합관리자 | — | 2 |
| 196 | `getAiModelReleases` | 릴리스 목록 조회 | GET | `/api/v1/ai/model-releases` | state, page, size | items[{ver,vecId,ftId,registeredAt,registeredBy,state,mode,note}], meta | 전산팀·통합관리자 | — | 1 |
| 197 | `postAiModelReleases` | 릴리스 등록 | POST | `/api/v1/ai/model-releases` | ver, vecId, ftId, mode, note | ver | 전산팀·통합관리자 | — | 1 |
| 198 | `getAiModelReleasesByVerApplyPreview` | 적용 전 성능 비교 | GET | `/api/v1/ai/model-releases/{ver}/apply-preview` | — | current{intent,cite,refuse,halluc}, target{...}, delta{...} | 전산팀·통합관리자 | — | 1 |
| 199 | `postAiModelReleasesByVerApply` | 서비스 적용 | POST | `/api/v1/ai/model-releases/{ver}/apply` | mode(즉시 전환|점진 전환) | servingVer, appliedAt | 전산팀·통합관리자 | — | 1 |
| 200 | `postAiModelReleasesRollback` | 직전 버전 롤백 | POST | `/api/v1/ai/model-releases/rollback` | — | servingVer | 전산팀·통합관리자 | — | 1 |
| 201 | `postAiModelReleasesByVerArchive` | 릴리스 보관 | POST | `/api/v1/ai/model-releases/{ver}/archive` | — | success | 전산팀·통합관리자 | — | 2 |
| 202 | `getAiVectorBuilds` | 벡터 인덱스 목록 | GET | `/api/v1/ai/vector-builds` | state, page, size | items[{vecId,startedAt,duration,state,sources[],docCnt,chunkCnt,embedModel,dim,size}], meta | 전산팀·통합관리자 | — | 1 |
| 203 | `postAiVectorBuilds` | 재색인 실행 | POST | `/api/v1/ai/vector-builds` | sources[], embedModelId, chunkSize | vecId, jobId | 전산팀·통합관리자 | — | 1 |
| 204 | `getAiVectorBuildsByVecId` | 벡터 인덱스 상세 | GET | `/api/v1/ai/vector-builds/{vecId}` | — | config{}, stats{}, errors[] | 전산팀·통합관리자 | — | 2 |
| 205 | `getAiFinetuneBuilds` | 파인튜닝 체크포인트 목록 | GET | `/api/v1/ai/finetune-builds` | state, page, size | items[{ftId,startedAt,duration,state,baseModel,method,samples,epoch,vram,eval{intent,cite,refuse,halluc}}], meta | 전산팀·통합관리자 | — | 1 |
| 206 | `postAiFinetuneBuilds` | 파인튜닝 실행 | POST | `/api/v1/ai/finetune-builds` | baseModel, method, trainsetId, epoch | ftId, jobId | 전산팀·통합관리자 | — | 1 |
| 207 | `getAiFinetuneBuildsByFtId` | 파인튜닝 상세 | GET | `/api/v1/ai/finetune-builds/{ftId}` | — | config{}, eval{}, log | 전산팀·통합관리자 | — | 2 |
| 208 | `getAiModelReleasesPerformanceTrend` | 버전별 성능 추이 | GET | `/api/v1/ai/model-releases/performance-trend` | — | labels[], series[{name,data[]}] | 전산팀·통합관리자 | — | 2 |
| 209 | `getAiModelReleasesDeployLogs` | 배포·학습 이력 | GET | `/api/v1/ai/model-releases/deploy-logs` | page, size | items[{ts,type,detail,by}], meta | 전산팀·통합관리자 | — | 1 |


## 6. 개발 체크리스트

- [ ] 요약 4카드 (서비스 버전 · 의도 · 환각 · 빌드 보유)
- [ ] 탭 4종
- [ ] 릴리스 표 + 전환/보관
- [ ] 전환 전 성능 비교 모달 (ok/bad tone, lowerIsBetter)
- [ ] 롤백 확인 모달
- [ ] 벡터 인덱스 표 + 재색인 폼 + 상세 모달
- [ ] 파인튜닝 표 + 실행 폼 + 상세 모달(OOM 안내)
- [ ] 성능 추이 차트
- [ ] 배포·학습 이력 표
- [ ] 전환 후 `/auth/me` 재조회 → 사이드바 갱신
- [ ] (개선) 목록 페이징 · 폼 선택지 서버 연동
