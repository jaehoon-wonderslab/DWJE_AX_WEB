# 요청 — AOI(치수 검사) 데이터를 MSSQL 에서 가져오기 + AOI 화면 정리 (2026-09-11)

발주자: 이재훈. 조정: WEB-ai_concep_design 세션. **PostgreSQL 은 그대로 쓰고, AOI 정보만 MSSQL 에서 읽습니다.**
회신은 이 파일 끝에 `## API 회신` / `## DB 회신` 제목으로 이어서 적어 주세요(조정 세션이 감시합니다).

---

## A. 원문 (발주자)

> postgresql 의 db 는 그대로 사용하고 일부 api 는 mssql 에서 데이터를 가지고 와야함. (aoi 정보)
> 접속정보 — 경로 192.168.7.203 / 아이디 wonderslab / 비밀번호 (터미널 메시지로 별도 전달)
>
> 테이블 구조
> ```sql
> SELECT WC_CD, EQPT_CD, LOT_NO, SERIAL_NO, SEQ, FAI1, FAI2, ..., FAI100, PASSED, COMMENT, DATE_TIME
> FROM EDGE.dbo.TB_SAMSUN_DIMENSION;
> ```
> - `WC_CD` 이전 작업장 코드 (도금, 도장, 레이저…) · `EQPT_CD` 설비코드 · `LOT_NO` 로트 번호 · `SERIAL_NO` 시리얼 번호
> - `SEQ` 시리얼 번호 내 측정된 순번 · `PASSED` 통과 여부 (1 통과, 0 불량) · `DATE_TIME` 측정 시간
> - 같은 시리얼 번호 내 SEQ 가 연번으로 이어지고, 마지막 연번이 끝나면 1부터 다시 시작합니다.
> - 이 DIMENSION 검사는 **SEQ 번호당 검사 1종류**이며 현재 시퀀스의 PASSED 가 1이면 통과입니다.
> - SEQ 가 100까지 있다고 가정할 때 중간 SEQ 에서 PASSED=0 이 나와도 **나머지 검사 항목은 끝까지 진행**합니다.
> - **SEQ 검사 결과 중 하나라도 PASSED=0 이면 그 시리얼은 불량품으로 분류**되어야 합니다.
> - 샘플 데이터는 MSSQL 에 접속 가능한 환경에서 테스트해 보고, **우선 API 를 제작**해 주세요.

## B. 접속 확인 결과 (조정 세션, 2026-09-11)

이 개발 머신(WEB 워크트리)에서 **192.168.7.203:1433 / 1434 모두 연결 시간 초과**입니다(사내망·VPN 밖). 로컬 PostgreSQL(도커 `dwje-pg`)만 닿습니다.
→ API 세션에서 먼저 **연결 가능 여부를 확인**해 주세요. 닿지 않으면 발주자에게 VPN·방화벽 개방을 요청하고, 그동안은 스키마·쿼리·엔드포인트만 준비하면 됩니다(웹은 목으로 진행 중).

## C. 확인해 주셨으면 하는 샘플 데이터 (연결되는 즉시)

1. 총 행 수, 하루치 행 수(최근 며칠), `MIN/MAX(DATE_TIME)` — **하루 조회를 기본으로 잡을 근거**(요구: 성능 때문에 날짜는 1일만 검색).
2. `DISTINCT WC_CD` · `DISTINCT EQPT_CD` 목록과 건수 — 코드값이 한글(도금·도장·레이저)인지 코드인지.
3. 시리얼당 `MAX(SEQ)` 분포 — 100 고정인지 가변인지. `SEQ` 가 정말 1부터 다시 시작하는지(같은 LOT·SERIAL 조합의 중복 여부).
4. `FAI1~FAI100` 중 **실제로 값이 들어오는 열**이 몇 개인지, 자료형(숫자/문자), 널 비율. (SEQ 당 검사 1종류라면 한 행에서 유효한 FAI 열이 1개인지 확인)
5. `PASSED` 값 도메인(0/1 외 값·널), `COMMENT` 사용 예, `DATE_TIME` 자료형·시간대(KST 벽시계인지 UTC 인지).
6. 키 유일성 — `(WC_CD, EQPT_CD, LOT_NO, SERIAL_NO, SEQ)` 가 유일한지. 유일하지 않으면 무엇이 더 필요한지.
7. 인덱스 현황(`DATE_TIME`·`LOT_NO`·`SERIAL_NO`) — 하루 조회가 인덱스를 타는지.

## D. API 요청 (term_0e612ecc)

### D1. 두 번째 DataSource (읽기 전용)
- MSSQL(`EDGE`) 용 별도 DataSource + `JdbcTemplate`(JPA 불필요). 기존 PostgreSQL 설정·트랜잭션에 영향 없게 분리.
- 드라이버 `com.microsoft.sqlserver:mssql-jdbc`. 사내 서버가 자체 서명 인증서면 `encrypt=true;trustServerCertificate=true` 필요할 수 있습니다.
- **접속 정보는 환경변수로만** — `AX_MSSQL_URL` · `AX_MSSQL_USER` · `AX_MSSQL_PASSWORD`(기본값은 `application-local.yml` 이 아닌 `.env`/실행 환경). 저장소에 비밀번호를 커밋하지 말아 주세요.
- 연결 풀은 작게(최대 4) · 조회 타임아웃 30초 · `readOnly`.

### D2. 엔드포인트 — **기존 두 개를 MSSQL 로 옮기되, 응답은 지금 필드를 유지한 상위집합(superset)** 으로
웹 화면은 이미 이 두 경로를 쓰고 있어, 필드 이름을 유지하면 **웹 수정 없이** 그대로 붙습니다.

**1) `GET /api/v1/quality/aoi/defects`** — 시리얼 단위 목록 (한 시리얼 = 한 행)
- 파라미터: `date`(**필수, 하루만** — 요구 5), `passed`(`all|ng|ok`, 기본 `ng`), `wcCd`(선택), `eqptCd`(선택), `page`, `size`
  - 웹 화면의 설비·LOT/모델 검색 필터는 제거되었습니다(요구 4). `wcCd`·`eqptCd` 는 나중에 쓸 수 있게 남겨만 두시면 됩니다.
- 집계 규칙: `(WC_CD, EQPT_CD, LOT_NO, SERIAL_NO)` 로 묶고 **하나라도 `PASSED=0` 이면 불량**
- 응답 `data.items[]` — 앞의 8개는 **지금 웹이 읽는 이름 그대로**, 뒤는 이번에 추가:
  `defectId` · `judgedAt`(=`MAX(DATE_TIME)`, `yyyy-MM-dd HH:mm:ss`) · `wcCd` · `processNm`(작업장 표시명, 없으면 `WC_CD`) · `eqptCd` · `eqptNm`(있으면) · `lotNo` · `serialNo` · `imageCnt`
  추가: `seqCnt`(검사 항목 수) · `failSeqCnt` · `failSeqs[]`(불량 SEQ 번호, 최대 20개까지) · `passed`(true/false) · `comment` · `firstJudgedAt`(=`MIN(DATE_TIME)`)
  - 지금 응답의 `ngQty`·`okQty`·`sampleQty` 자리에는 **검사 항목 기준**으로 `ngQty=failSeqCnt` · `okQty=seqCnt-failSeqCnt` · `sampleQty=seqCnt` 를 넣어 주세요(웹 열이 그대로 동작합니다). `model`·`modelNm`·`moldCd`·`cavity`·`grade` 는 MSSQL 에 없으면 `null`.
- `meta{page,size,total,totalPages}`
- **`defectId` 형식**: `{WC_CD}~{EQPT_CD}~{LOT_NO}~{SERIAL_NO}` 를 제안합니다(구분자 `~`. 값에 `-`·`_` 가 들어갈 수 있어 기존 `-` 는 피했습니다). 값에 `~` 가 존재하면 URL 인코딩 규칙을 회신에 적어 주세요. 형식이 틀리면 400, 없으면 404.

**2) `GET /api/v1/quality/aoi/defects/{defectId}`** — 시리얼 상세 + 검사 항목 + NAS 사진
- 목록 항목 전체 + 다음을 추가:
  - `measurements[]`: `{ seq, passed, dateTime, comment, values[{ name('FAI1'…), value }] }` — **값이 있는 FAI 열만**. SEQ 오름차순.
  - `measurementSummary`: `{ seqCnt, failSeqCnt, firstFailSeq, lastJudgedAt }`
  - `images[]`: 지금과 동일(`imageId, seq, nasPath, capturedAt, sizeBytes, available, url(서명 토큰), thumbUrl`) — **PostgreSQL `ax.tb_aoi_defect_image` 그대로** 사용합니다(DB 회신의 키 결정 참고).
- 웹은 이 응답으로 **모달**(요구 7)에 판정 정보 + 검사 항목 표 + NAS 사진을 크게 그립니다.

**3) (선택) `GET /api/v1/quality/aoi/dimension/work-centers`** — `items[{wcCd, wcNm, eqptCds[]}]`. 나중에 필터를 되살릴 때 씁니다.

### D3. 성능
- 목록 쿼리에서 **`FAI*` 열은 절대 선택하지 마세요**(100열). `GROUP BY` 4키 + `MIN/MAX(DATE_TIME)` + `SUM(CASE WHEN PASSED=0 THEN 1 ELSE 0 END)` 만.
- 하루 범위를 `DATE_TIME >= @d AND DATE_TIME < DATEADD(day,1,@d)` 로 잡아 인덱스를 타게 해 주세요(`CONVERT(date, DATE_TIME) = @d` 는 인덱스를 못 씁니다).
- 상세는 4키로 한 시리얼만 읽습니다. FAI 열은 널 제거 후 세로로 펼치기(UNPIVOT 또는 애플리케이션에서 널 필터).
- 하루치가 수십만 행이면 회신에 알려 주세요 — 그때는 DB 세션과 함께 **일자별 요약 캐시**(PostgreSQL)를 검토합니다.
- 조회 실패·MSSQL 연결 불가 시 200 빈 목록이 아니라 **명확한 오류**로 내려 주세요(웹이 "MSSQL 연결 확인 필요" 를 안내합니다).

### D4. 기존 것
- `/quality/aoi/prediction/*` 은 그대로(PostgreSQL). 단 웹 화면에서 **설비별 위험도·잔여 시간·판정 드리프트 세 조회는 더 호출하지 않습니다**(2026-09-10 회신 참고).
- `prediction/summary`(17초) · `lot-risk`(14초) 성능 개선은 여전히 열려 있는 항목입니다(API-Q5).

## E. DB 요청 (term_c022f672)

1. **NAS 사진 매핑 키 결정** — 현재 `ax.tb_aoi_defect_image` 의 `defect_id` 는 `plant-wc-lot-serial`(라벨 이력 키)입니다. AOI 원천이 MSSQL DIMENSION 으로 바뀌면 키에 **설비(EQPT_CD)** 가 들어가고 **plant** 가 없습니다.
   - 제안: 라벨 키 4컬럼(plant_cd·wc_cd·lot_no·serial_no) 대신 **`wc_cd·eqpt_cd·lot_no·serial_no`** 로 바꾸고 생성 컬럼 `defect_id` 를 `wc~eqpt~lot~serial` 로. 기존 행이 2건(시험용)뿐이라 이관 부담은 없습니다.
   - 두 원천을 함께 쓸 가능성이 있으면 `source_cd`(LABEL|DIMENSION) 를 두는 안도 괜찮습니다 — 판단 부탁드립니다.
2. **작업장 표시명(WC_CD → 도금·도장·레이저)** 이 PostgreSQL/MES 마스터에 있는지, 없으면 공통코드 그룹(예 `AOI_WC`)으로 둘지.
3. **일자별 요약 캐시 필요 여부** — MSSQL 하루치가 크면(D3) `ax.tb_aoi_dim_daily`(일자·작업장·설비·시리얼 수·불량 시리얼 수) 같은 요약 테이블을 두는 안. API 세션의 실측 결과를 보고 판단해 주세요.
4. 마이그레이션은 **V28 부터**. PostgreSQL 스키마 자체는 그대로 유지(발주자 지시).

## F. 웹 쪽 변경 (조정 세션이 진행 중 — 참고용)

같은 날 요구된 AOI 화면 정리입니다. API 응답 계약과 맞물리는 부분만 적습니다.
1. 「불량 목록」·「출하 전 위험 LOT」 카드를 **각각 한 행 전체 폭**으로.
2. 「불량률 추이 · 추정 밴드」 그래프를 **d3(charts-d3)** 로.
3. 「출하 전 위험 LOT」 에 **페이징** 추가 — 서버 페이징이 없으면 화면에서 자릅니다(`/prediction/lot-risk` 에 `page`·`size` 를 받아 주시면 서버 페이징으로 바꿉니다).
4. 검색 옵션에서 **설비(AOI)·LOT/모델 검색 제거**.
5. 날짜 검색은 **하루만**(단일 날짜) — D2 의 `date` 파라미터와 짝입니다.
6. 「불량 상세 — MES 판정 원본 · NAS 사진」 제목 제거. 8. 「불량 이미지」 카드 제거.
7. 불량 목록 행을 누르면 **모달**로 판정 정보를 크게 + **검사 항목(measurements)** 표 + NAS 사진. → D2-2 의 `measurements[]` 가 이 모달의 핵심 입력입니다.

## WEB 회신 (2026-09-11 · 화면 먼저 반영, MSSQL 응답 대기)
F 절 8건을 모두 반영했고 목·실 API 양쪽에서 확인했습니다. **MSSQL 응답 계약에 맞춰 미리 만들어 두었습니다** — API 가 D2 대로 올라오면 웹 수정 없이 붙습니다.
- 목록 요청은 `date` + `from`·`to`(같은 날)를 함께 보냅니다. 수량 열은 `sampleQty ?? seqCnt` · `ngQty ?? failSeqCnt` 로 읽어 라벨 이력·DIMENSION 응답을 모두 그립니다.
- `defectId` 는 문자열로만 다룹니다 — `plant-wc-lot-serial` 과 `wc~eqpt~lot~serial` 둘 다 통과합니다(목도 두 형식 허용).
- 상세 모달은 `measurements[{seq,passed,dateTime,comment,values[{name,value}]}]` 를 표로 그립니다. **지금 API 응답에는 이 배열이 없어 표가 나오지 않습니다** — D2-2 가 반영되면 자동으로 나타납니다. 목에는 임시 생성 데이터를 넣어 두었습니다(SEQ 당 FAI 1개, 불량 1~3개).
- 「출하 전 위험 LOT」 쪽 나눔은 화면에서 자르는 방식입니다. `/prediction/lot-risk` 에 `page`·`size` 가 생기면 서버 쪽 나눔으로 바꾸겠습니다(요청 F-3).
- 부탁: D2-1 의 `date` 를 **필수로 만들되 `from`==`to` 도 받아** 주시면 전환 시점에 웹·API 배포 순서를 맞추지 않아도 됩니다.

---

## G. 웹 화면 실측 확인 (2026-09-11)

「AOI 판정 분석」(`/quality/aoi`) 을 실행 중인 화면(포트 8090)에서 직접 열어 확인한 결과입니다.

| 요구 | 확인 |
|---|---|
| 1. 「불량 목록」·「출하 전 위험 LOT」 각 행 전체 폭 | 두 카드가 각각 한 행을 씁니다. `Grid cols` 로 나누지 않습니다 |
| 2. 불량률 추이 · 추정 밴드 d3 | `charts-d3`의 LineChart 로 그립니다 |
| 3. 「출하 전 위험 LOT」 쪽 나눔 | 전체 20건 · 쪽당 10/25/50 |
| 4. 「설비 (AOI)」·「LOT / 모델 검색」 제거 | 조회 조건은 「검사일」 하나뿐입니다 |
| 5. 날짜 검색 하루 | `DateField` 하나 · 서버로 `date`=`from`=`to` |
| 7. 행 클릭 모달 | 판정 정보 + NAS 사진 뷰어가 모달로 열립니다 |

### 이어서 고친 것

- **첫 조회가 0건이면 최근 판정일을 자동으로 엽니다.** 기본 검사일은 `data-range.toDate`(2026-09-10)인데
  그날 AOI 판정이 0건이라 목록이 비어 보였습니다. 이제 하루씩 최대 14일을 거슬러 판정이 있는 날을 찾아
  그 날짜로 열고, 조회 조건 옆에 `2026-09-10 에는 AOI 판정이 없어 최근 판정일(2026-09-09)을 열었습니다` 한 줄을 답니다.
  「조회」를 누르면 자동 탐색은 더 하지 않습니다 — 사용자가 고른 날짜가 우선입니다.
- **추이 밴드 차트의 점 수치 라벨을 솎아 냅니다.** 72시간 58표본에 모든 점의 값을 쓰면 글자가 겹쳐 읽히지
  않았습니다. x축 라벨과 같은 방식으로 42px 간격 stride 를 잡고 마지막 점은 언제나 씁니다(`LineChart`).

### API 쪽 부탁 (성능)

지금 로컬 8080 기준 응답 시간입니다. 화면이 40초 가까이 「조회 중입니다…」에 머뭅니다.

| 엔드포인트 | 응답 |
|---|---|
| `GET /quality/aoi/prediction/summary` | 약 18초 |
| `GET /quality/aoi/prediction/lot-risk` | 약 15초 |
| `GET /quality/aoi/prediction/trend-band` | 0.1초 |
| `GET /quality/aoi/defects` | 0.1초 |

MSSQL 전환과 별개로 `summary`·`lot-risk` 두 건의 소요 시간을 줄여 주시면 좋겠습니다.
