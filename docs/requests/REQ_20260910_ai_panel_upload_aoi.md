# 요구사항 9건 — AI 패널 · 대시보드 업로드 리포트 · AOI 판정 분석 (2026-09-10)

발주자: 이재훈. 조정: WEB-ai_concep_design 오케스트레이션 세션. 역할별 담당 터미널은 아래 "협업 방식" 참고.
각 팀은 **이 파일 끝에 `## WEB 회신` / `## API 회신` / `## DB 회신` 제목으로** 확인 사항·확정안·완료 시점을 이어서 적어 주세요(조정 세션이 그 제목을 감시합니다). 질문은 회신 절에 번호를 붙여 적으면 발주자에게 모아 전달합니다.

---

## A. 원문 (발주자 요구 그대로)

1. '자연어 질의' 버튼의 시안성 개선(사용 가능한 버튼임을 인지할 수 있게). 작은 글씨로 'AI를 통해 궁금한 것을 물어보세요' 코멘트 추가. 버튼이 스크롤(mouse wheel)에 영향받지 않고 '메뉴 접기'처럼 고정. 텍스트는 **'덕파트장 AI'** 로 변경.
2. 1시 방향(상단바 우측) 아바타·드롭다운 기능을 7시 방향(사이드바 하단) 아바타 카드로 이동.
3. '자연어 질의' 화면을 제외한 모든 화면의 오른쪽에 AI 채팅 영역 배치. 콘텐츠 영역과 AI 채팅 영역을 좌우로 크기 조절(드래그). **채팅 영역은 화면 폭의 40% 까지만.**
4. AI 채팅 영역 안의 최소/중간/전체 크기 버튼과 `+`(새 대화) 버튼 제거.
5. AI 채팅 영역의 닫기 버튼을 누르면 콘텐츠 영역 우측에 **세로 버튼**이 생겨 다시 열 수 있게. 닫힘 상태에서는 스크롤 기능을 제공하지 않음.
6. 'AI 통합 대시보드' 안에 탭 메뉴. 기본 탭 = 현재 콘텐츠. 새 탭 = 작업자가 **정해진 엑셀 포맷**으로 자료를 업로드하면 그 엑셀을 기준으로 차트·보고서 형식을 만들어 주는 기능. 포맷 엑셀은 별도 제공 예정. MES 데이터 이외의 **가공된 결과**를 올려 차트·표로 만들어 회의에 쓰기 위함.
7. 6의 업로드는 모든 계정이 할 수 없고 **업로드 권한을 지정**할 수 있게 — 시스템 관리 > 메뉴 접근 권한 에서 관리.
8. 6에서 업로드한 문서는 **서버에 저장하고 버전 관리**. 6 화면에서 문서를 선택해 결과를 볼 수 있어야 하고, 시스템 관리에서도 보이게(시스템 관리는 **업로드된 문서 목록만**).
9. 'AOI 판정 분석/예측' 메뉴는 **'AOI 판정 분석'** 으로 변경. 해당 불량은 MES DB 에서 가져올 수 있음. 어느 불량인지 **id·날짜로 분류**하고, NAS 에 저장된 해당 불량 **사진을 경로로 조회**할 수 있게(NAS 경로 정보는 별도 문서 제공 예정).

---

## B. 조정 세션의 해석 · 제안 (확정 전 — 회신에서 이견을 적어 주세요)

### B1. 용어·이름
- 사이드바 첫 항목: **덕파트장 AI** (id `ai-chat` · 경로 `/ai/chat` 은 그대로). 아래 캡션 11px 회색: "AI를 통해 궁금한 것을 물어보세요".
- 6번 탭 이름 **추천**: 기본 탭 **「MES 현황」**, 업로드 탭 **「업로드 리포트」** (대안: 「회의 자료」, 「가공 데이터 분석」). 최종 이름은 발주자 확정.
- 7번 권한 항목 이름: 메뉴 접근 권한 매트릭스에 **「AI 통합 대시보드 › 업로드 리포트 업로드」** 행(화면 id `dash-ai-upload`, 종류 = 동작 권한). 보기(조회)는 `dash-ai` 권한을 따르고, 업로드·삭제·새 버전 등록만 `dash-ai-upload` 로 제한.
- 8번 시스템 관리 화면: 시스템관리 그룹에 **「업로드 문서 목록」**(id `sys-upload-doc`, 경로 `/system/upload-doc`) 신설 — 목록·버전·업로더·크기·상태만, 편집 없음.
- 9번 메뉴명: **AOI 판정 분석** (id `qc-aoi`, 경로 그대로). 화면 하단(또는 탭)에 **「불량 상세·이미지」** 구역 추가.

### B2. 화면(WEB) 상세
1. Sidebar: 「메뉴 접기」 바로 아래에 「덕파트장 AI」 카드형 버튼을 **고정 영역**으로(스크롤되는 메뉴 목록은 그 아래 별도 ScrollView). 버튼은 채움 배경(잉크 틴트) + 아이콘 + 두 줄(제목 / 캡션)로 "누를 수 있음"이 보이게. 활성 상태(현재 `/ai/chat`)는 잉크 채움.
2. Topbar 우측의 계정 버튼(아바타·이름·▾)과 `UserMenu`(계정·로그아웃)를 제거하고, Sidebar 하단 사용자 카드를 누르면 같은 메뉴(현재 계정 정보 · 로그아웃)가 **위로 뜨는 팝오버**로 열리게. 접힌 사이드바(64px)에서는 아바타만 보이고 눌러도 동작.
3. `app/(main)/_layout.jsx`: AI 레일 패널을 **기본 열림**으로 두고(`aiChatOpen` 초기값 true), 본문 패널과 레일 사이에 **드래그 핸들**(6~8px, 커서 col-resize). 레일 폭 상태 `aiChatWidth`(px) 를 `useUiStore` 에 두고 브라우저(localStorage)에 기억. 최소 320px · 최대 `min(창 폭 × 0.40, 창 폭 − 사이드바 − 480)`. `/ai/chat` 화면에서는 레일을 그리지 않음(현행 유지).
4. `AiChatPanelHost`: 헤더에서 크기 3단 버튼(compact/medium/full)과 `+` 새 대화 버튼 제거. `aiChatSize` 상태·`setAiChatSize`·workspaceMode 분기는 삭제(폭은 드래그가 대신). 닫기(×) 버튼만 남김. 새 대화는 채팅 입력창 옆 "새 대화" 텍스트 링크 또는 대화 상단 메뉴로 이전(제안 — 없애도 되면 회신에).
5. 레일이 닫히면 본문 패널 **오른쪽 가장자리에 세로 탭**(폭 36px, 높이 전체, 세로 글자 「덕파트장 AI」 + 아이콘, 잉크 틴트) 를 붙여 클릭 시 다시 열림. 세로 탭은 `position` 고정, 내부 스크롤 없음, 본문 스크롤과 무관.
6. `/dashboard/ai`: 머리말 아래 `Tabs`(MES 현황 | 업로드 리포트). 「업로드 리포트」 탭 구성: (a) 상단 툴바 — 문서 선택(드롭다운: 문서명 · 최신 버전 · 업로더 · 일시), 버전 선택, `dash-ai-upload` 권한자에게만 「엑셀 업로드」 버튼(파일 선택 → 제목·메모 입력 → 업로드 진행 → 파싱 결과 검증 메시지). (b) 본문 — 서버가 파싱해 돌려준 데이터로 **차트(d3) + 표(Tabulator)** 를 포맷 정의에 따라 렌더. 포맷 엑셀이 오기 전까지는 **일반형 계약**으로 만든다: 시트별 { title, chartType(line|bar|grouped|donut|table), x, series[], rows[] } 배열을 받아 그대로 그리는 「블록 렌더러」(포맷 확정 후 서버 파서만 바꾸면 화면은 그대로). (c) 우측 상단 「인쇄·PDF」·「엑셀 다운로드(원본)」.
7. 메뉴 접근 권한 매트릭스(`/system/menu-perm`)에 `dash-ai-upload` 행이 서버 메뉴 목록에서 자동으로 들어오도록(현재 매트릭스가 `tb_sys_menu` 를 읽으면 웹 수정 없음, 하드코딩이면 추가). `useAuthStore.can('dash-ai-upload')` 로 버튼 노출 제어.
8. `/system/upload-doc` 신설: 표(문서명 · 최신 버전 · 버전 수 · 업로더 · 최근 업로드 · 크기 · 상태), 행 펼침에 버전 이력. 삭제·편집 없음(요구 8).
9. `/quality/aoi`: 메뉴명·머리말 「AOI 판정 분석」. 기존 예측 블록은 유지하되 제목에서 "예측" 강조를 낮추고, 새 구역 **「불량 상세」**: 기간·설비·불량 유형 필터 → 불량 목록(Tabulator: 불량 id · 판정 일시 · 설비 · LOT · 모델 · 불량 유형 · 이미지 수) → 행 선택 시 우측/하단에 **이미지 뷰어**(썸네일 스트립 + 확대, NAS 경로 표시·복사). 이미지는 API 프록시 URL 로 표시(브라우저가 NAS 를 직접 읽지 못함).

### B3. API 요청안 (확정은 API 팀)
- **업로드 문서**
  - `POST /api/v1/dashboard/uploads` — multipart(`file`, `title`, `memo`). 권한 `dash-ai-upload`. 동작: 파일 저장(버전 1) + 엑셀 파싱 → 정규화 JSON 저장. 응답 `{ docId, version, title, parsed: { sheets:[{title,chartType,x,series[],rows[]}] , warnings[] } }`.
  - `POST /api/v1/dashboard/uploads/{docId}/versions` — 같은 문서에 새 버전(multipart). 응답 `{ docId, version }`.
  - `GET /api/v1/dashboard/uploads` — 문서 목록 `items[{docId,title,memo,latestVersion,versionCnt,updatedBy,updatedByName,updatedAt,sizeBytes}]` (권한: `dash-ai` 보기 권한자 전부).
  - `GET /api/v1/dashboard/uploads/{docId}/versions` — `items[{version,fileName,sizeBytes,sha256,uploadedBy,uploadedByName,uploadedAt,parseState,warningCnt}]`.
  - `GET /api/v1/dashboard/uploads/{docId}/versions/{version}/data` — 파싱 결과(위 `parsed` 형태). 화면은 이것만으로 차트·표를 그림.
  - `GET /api/v1/dashboard/uploads/{docId}/versions/{version}/file` — 원본 다운로드(스트림).
  - `GET /api/v1/system/uploads` — 시스템 관리용 목록(같은 형태 + `createdBy`, 전체 문서). 권한 `sys-upload-doc`.
  - 파서: 포맷 엑셀 확정 전에는 "1행 헤더 · 1열 x축 · 나머지 열 시리즈, 시트명 = 블록 제목, 시트명 접미어 `[line]`/`[bar]`/`[table]` 로 차트 종류" 의 **일반형 규칙**으로 시작 제안. 포맷 문서가 오면 파서만 교체.
  - 파일 저장소: API 서버 로컬 디렉터리(`app.upload.dir`, 기본 `/data/ax-uploads/{docId}/{version}/원본명`) 또는 NAS. 상한 20MB, 확장자 xlsx 만.
- **권한**: `GET /auth/me` 의 `menuPerms` 에 `dash-ai-upload`, `sys-upload-doc` 포함(메뉴 테이블에 행이 있으면 자동). 메뉴 접근 권한 저장 API 가 동작 권한 행도 그대로 다루는지 확인.
- **AOI 불량 상세·이미지**
  - `GET /api/v1/quality/aoi/defects?from&to&eqptCd&defectType&lotNo&page&size` — MES DB 의 AOI 불량 판정 원본. `items[{defectId,judgedAt,eqptCd,eqptNm,lotNo,model,modelNm,defectTypeCd,defectTypeNm,position,imageCnt}], meta`.
  - `GET /api/v1/quality/aoi/defects/{defectId}` — 상세 + `images[{imageId,seq,nasPath,capturedAt,sizeBytes,url}]` (`url` 은 아래 프록시 주소).
  - `GET /api/v1/files/aoi-images/{imageId}` — NAS 파일 스트림 프록시(인증 필수, 경로 화이트리스트: NAS 루트 아래만, `..` 금지). 썸네일 `?w=160` 옵션 있으면 좋음.
  - NAS 경로 규칙은 발주자 문서가 오면 확정. 그 전에는 `tb_aoi_defect_image`(DB 안) 매핑 테이블을 읽는 구조로 만들어 두고, 규칙이 "경로 조합"이면 서비스에서 조합.
- 기존 `/quality/aoi/prediction/*` 는 유지.

### B4. DB 요청안 (확정은 DB 팀, 스키마 `ax`, V23·V24 관례)
- `tb_sys_menu` 행 추가: `dash-ai-upload`(상위 `dash-ai`, 종류 ACTION, 이름 「업로드 리포트 업로드」), `sys-upload-doc`(시스템관리, 화면, 경로 `/system/upload-doc`, 이름 「업로드 문서 목록」). 부서 기본 권한: 통합관리자·전산팀은 두 항목 모두, 그 외는 없음.
- `tb_dash_upload_doc` — doc_id(PK) · title · memo · created_by · created_at · latest_ver · del_yn.
- `tb_dash_upload_ver` — doc_id · ver(PK 복합) · file_name · storage_path · size_bytes · sha256 · uploaded_by · uploaded_at · parse_state(OK|WARN|FAIL) · parse_json(jsonb, 정규화 결과) · warning_json(jsonb).
- `tb_aoi_defect_image` — image_id(PK) · defect_id(MES 불량 판정 키 — 어떤 테이블·컬럼인지 DB 팀 확인) · seq · nas_path · captured_at · size_bytes · ins_date. (NAS 규칙 문서에 따라 조합형이면 이 테이블은 생략 가능 — 회신에 판단 적어 주세요.)
- MES 쪽 AOI 불량 판정 테이블 확인: 불량 id·일시·설비·LOT·모델·불량유형을 어디서 읽을지(`mes.` 스키마) 회신에 명시.

### B5. 미확정 (발주자 회신 필요 — 조정 세션이 모아서 질문)
- Q1. 탭 이름(MES 현황 / 업로드 리포트) 승인 여부.
- Q2. 엑셀 포맷 파일과 NAS 경로 문서 — 도착 전 "일반형 파서·매핑 테이블"로 진행해도 되는지.
- Q3. 4번에서 `+`(새 대화) 를 없애면 새 대화 시작은 어디서? (제안: 입력창 옆 「새 대화」 텍스트 링크)
- Q4. 8번 문서 삭제·숨김 기능 필요 여부(현재 안: 없음, 버전만 쌓임).

---

## 협업 방식
- WEB: `term_9ecab9f5-9192-4b12-8474-3e17aa9d1b75` (WEB-ai_concep_design, 브랜치 wt/ai_concep_design) — B2 전체. API 가 없는 부분은 `src/services/mock` 에 목을 먼저 만들어 화면부터 진행(`EXPO_PUBLIC_USE_MOCK=true`), 엔드포인트 카탈로그(`src/services/api/endpoints.js`)는 B3 이름으로 선등록.
- API: `term_0e612ecc-1a9e-4236-a377-bf41da641e5b` (API, new_dashboard) — B3.
- DB: `term_c022f672-85d3-4168-b2ae-93b08825f807` (API 저장소의 DB 세션) — B4. 마이그레이션은 V25 부터.
- 순서 제안: DB 스키마·메뉴 행 → API → WEB 실 API 연결. WEB 은 목으로 병행.
- 회신 형식: 이 파일 끝에 `## WEB 회신` / `## API 회신` / `## DB 회신` 제목 + 날짜. 확인 질문은 번호로.

---

## DB 회신 (2026-09-10, DB 세션 B4)

**적용 시점:** 2026-09-10 로컬 `dwjedb`(도커 `dwje-pg`) 에 **V25 · V26 · V27 적용 완료**(각 2회 실행, 멱등 확인). 파일: `API/src/main/resources/db/V25__menu_ai_panel_upload_aoi.sql` · `V26__dash_upload_doc.sql` · `V27__aoi_defect_image.sql`. README 적용 목록 추가. 기준 스키마 디렉터리에 `patch_20260910_ai_panel_upload_aoi.sql` + `변경내역_20260910_AI패널_업로드_AOI.md` 기록. 데이터 INSERT 없음(메뉴·권한·공통코드 행만). 코틀린 미변경.

### 확정안 (B4 → 최종)
1. **메뉴(V25)** — `dash-ai-upload`(dashboard 그룹, 상위 `dash-ai`, **is_sub_page=true, route_path NULL**, 이름 「업로드 리포트 업로드」, sort 90) · `sys-upload-doc`(system 그룹, `#sys-upload-doc`, 「업로드 문서 목록」, sort 16). `tb_sys_menu` 에 "종류" 컬럼이 없어 동작 권한은 하위 화면 방식(is_sub_page)으로 표현했다. 사이드바에는 안 나오고 권한 매트릭스에는 들어온다.
   - **이름 변경도 DB 에서 처리**: `ai-chat` → **'덕파트장 AI'**, `qc-aoi` → **'AOI 판정 분석'**. 사이드바 이름은 `/auth/me` 가 DB `menu_nm` 을 내려주므로 WEB 하드코딩과 무관하게 DB 가 원천이다. WEB 은 서버 이름을 그대로 쓰면 된다.
   - 기본 권한: 통합관리자는 super admin 으로 자동. **전산팀**만 행 추가(`dash-ai-upload` 읽기·쓰기, `sys-upload-doc` 읽기). `dept_nm` 으로 찾으므로 전산팀이 없는 환경은 0행 → 권한 화면에서 부여.
2. **업로드 문서(V26)** — `ax.tb_dash_upload_doc`(doc_id identity · title · memo · latest_ver · **del_flg** · ins/upd 4종) / `ax.tb_dash_upload_ver`(doc_id FK CASCADE · ver · **file_nm** · storage_path · **file_size** · sha256 char(64) · **parse_state_cd** · parse_json · warning_json · ins_date=uploadedAt · ins_user=uploadedBy). 상태는 CHECK 대신 공통코드 그룹 **`DASH_UPLOAD_PARSE`**(OK/WARN/FAIL) + `tb_sys_code_ref` 등록.
   - API 가정과 다른 이름 4개: `del_yn→del_flg`, `file_name→file_nm`, `size_bytes→file_size`, `parse_state→parse_state_cd` (프로젝트 관례). 나머지는 API 가정과 동일.
3. **AOI 불량 사진(V27)** — `ax.tb_aoi_defect_image`: image_id identity · **라벨 키 4컬럼(plant_cd·wc_cd·lot_no·serial_no, common 도메인)** · **`defect_id` 생성 컬럼**(`plant-wc-lot-serial`, 인덱스) · defect_cd(NULL 허용) · seq · nas_path · **file_size** · captured_at · ins_date/ins_user. UNIQUE(라벨 키+seq). mes 물리 FK 없음(논리 관계).
   - API 가정과 다른 점: 문자열 `defect_id` 단일 컬럼 → 도메인 4컬럼 + 생성 컬럼(문자열 조회는 그대로 가능, MES 조인은 형변환 없이). `size_bytes→file_size`. `defect_cd` 추가.
   - **조합형이면 생략?** NAS 규칙이 경로 조합형이어도 "실제 존재 파일의 색인"으로 유지 권장. 규칙만으로 충분하면 V28 에서 DROP.

### MES AOI 원천 확인 결과 (B4 요청 항목)
- **AOI 전용 테이블 없음.** AOI 판정 원본 = `mes.tb_pop_label_hist`(plant_cd·wc_cd·lot_no·serial_no·eqpt_cd·item_cd·defect·normal·ins_date) 를 `mes.tb_md_eqpt`(model_nm/eqpt_nm ILIKE '%AOI%') 로 걸러낸 행. 기존 `findAoiJudgeStats` 와 같은 기준. 설비명은 `tb_md_eqpt.eqpt_nm`, 모델명은 `tb_md_item`.
- 로컬 복제본: AOI 라벨 11,295건(2025-06-22~2026-08-13), defect>0 6,949건, 설비 32대, 작업장 **V120 'AOI PACKING (TRAY)' · V140 'AOI PACKING (REEL)'** 둘뿐.
- **`mes.tb_pop_defect_hist` 에 V120·V140 행 0건** → AOI 불량은 라벨의 defect 수량만 있고 **불량 유형 코드는 MES 에 없다.** lot·serial 만으로 다른 작업장 불량 이력을 붙이면 다른 공정 행이 섞이므로 붙이지 말 것.
- 결론: **불량 id = 라벨 키 4컬럼(문자열 표현 `PL01-V140-20260803-00313`), 날짜 = 라벨 ins_date(KST 벽시계 timestamp(3) — 비교 시 `AT TIME ZONE 'Asia/Seoul'`).**

### 확인 질문 (발주자)
- DB-Q1. **AOI 불량 유형**: MES 에는 유형 코드가 없다. B2-9 의 "불량 유형 필터" 는 AOI 장비/NAS 메타데이터에서 유형이 오는 경우에만 가능하다(`defect_cd` 에 적재). NAS 경로 문서에 유형 정보가 포함되는지 확인 요청. 없으면 필터는 제거 권장.
- DB-Q2. **NAS 경로 규칙**: 조합형(설비·일자·lot·serial 로 계산)인지, 목록/매핑 파일이 제공되는지. 후자면 적재 배치(파일 → `tb_aoi_defect_image`) 담당을 정해야 한다.
- DB-Q3. 업로드 문서 **삭제 정책(Q4)** 은 `del_flg` 숨김으로 준비해 뒀다. 물리 삭제·버전 삭제는 넣지 않았다.

### 기타
- `fn_check_code_ref()` 에 기존 위반 있음: `tb_rpt_download_log.format_cd` 값 '엑셀 (.XLS)'·'엑셀 (.XLSX)' 9건 (이번 변경과 무관, 별도 정리 대상).
- API 소관: `MenuId` 상수에 `dash-ai-upload`·`sys-upload-doc` 추가, 업로드 트랜잭션에서 `latest_ver` 갱신, 사이드바/권한 매트릭스에 is_sub_page 행 처리 확인.
- V15~V27 마이그레이션 파일은 모두 git 미추적 상태 — 커밋 시 함께 올릴 것.

## WEB 회신 (2026-09-10 · 1차 완료)
- 1~5 (사이드바 「덕파트장 AI」 고정 카드 + 캡션, 계정 메뉴 → 사이드바 하단 카드 팝오버, 레일 기본 열림 + 드래그 폭 조절(320px ~ 창 폭 40%) + 브라우저 기억, 크기 3단·`+` 제거, 닫힘 시 본문 우측 세로 단추): **구현·목 모드 확인 완료** (`Sidebar.jsx` · `Topbar.jsx` · `UserMenu.jsx` · `AiChatPanelHost.jsx` · `app/(main)/_layout.jsx` · `useUiStore.js`). 새 대화는 `+` 대신 레일 머리의 「새 대화」 텍스트 링크(대화가 있을 때만)로 두었습니다 — B5 Q3.
- 6~8: `/dashboard/ai` 에 탭(MES 현황 | 업로드 리포트) — 문서·버전 선택, `dash-ai-upload` 권한자에게만 「엑셀 업로드」·「새 버전 업로드」, 블록 렌더러(line/bar/grouped/donut/table), 경고·FAIL 표시, 원본 다운로드·인쇄. `/system/upload-doc` 읽기 전용 목록 + 버전 드로어. 메뉴 접근 권한 매트릭스에 「AI 통합 대시보드 › 업로드 리포트 업로드」(동작) 행. **API 회신 계약(`#line` 접미어 · `columns[]` · parseState · 새 버전 전체 응답 · `/system/uploads/{docId}/versions`)에 맞춰 구현했고, 로컬 8080 실 API 로 확인**(docId 1 v2 경고 4건 렌더, 시스템 목록 2건).
- 9: `/quality/aoi` 「AOI 판정 분석」 — 불량 상세(기간·설비·LOT/모델 필터, 목록, 이미지 뷰어·썸네일·NAS 경로 복사, `available=false` 는 "파일 없음")를 첫 구역으로, 예측 블록은 「이상 가능성 분석 — 추정」 아래로. 불량 유형 필터는 API/DB 회신대로 **두지 않음**. 실 API 확인: 기본 기간(data-range toDate 기준 7일)이 로컬 복제본 AOI 데이터(~2026-08-13) 밖이라 목록이 비어 보임 — 데이터 문제이며 기간을 8월로 바꾸면 조회됨.
- 웹 쪽 변경 파일: 셸 5개 + `useUiStore`/`useAppStore`, `menu.js`·`dataFields.js`(권한 기본값), `endpoints.js`·서비스 3개, 대시보드 업로드 도메인(컨트롤러·리포지토리·모델·뷰), 시스템 업로드 문서 도메인 + 라우트, 품질 AOI 불량 도메인 + 섹션 컴포넌트, 목(dashboard/system/quality + data/uploads.js), `PermMatrix`·`MenuPermView`(동작 행), `LineChart`/`GroupedBarChart`(소수 라벨), `client.js`(목 분기에서 경로 변수 전달).
- API 팀 확인 질문 **WEB-Q1.** `GET /system/uploads` 의 `uploadedBy` 필터는 사번(empNo)인지 이름인지 — 웹은 현재 목록의 이름을 보냅니다. **WEB-Q2.** 이미지 서명 토큰 15분 만료 시 자동 재발급은 넣지 않았습니다(행을 다시 선택하면 재조회) — 필요하면 타이머 추가.
- API·DB 팀에: 엔드포인트 이름·응답 필드는 `src/services/api/endpoints.js` 의 `getDashboardUploads` … `getFilesAoiImagesByImageId` 항목이 웹이 읽는 계약입니다. 바꾸시면 회신에 적어 주세요.

---

## API 회신 (2026-09-10 11:55, API 세션 B3 · 로컬 8080 반영 완료)

**B3 전 항목을 구현해 로컬 서버(`http://localhost:8080`, profile `local`)에 올렸습니다.** `/v3/api-docs` 에 새 경로 10개가 보입니다. DB 회신(V25~V27)의 확정 컬럼명에 맞췼고, 시드 계정으로 전부 실측했습니다. B3 요청안과 **다른 점 4가지**를 먼저 적습니다.

| # | 요청안 | 확정 | 이유 |
|---|---|---|---|
| 1 | 시트명 접미어 `[line]` `[bar]` `[table]` | **`#line` `#bar` `#grouped` `#donut` `#table`** (예 `월별 불량률 #line`) | **엑셀은 시트명에 `[` `]` 를 허용하지 않습니다**(`: \ / ? * [ ]` 금지). 작업자가 엑셀에서 그 이름을 만들 수 없어 `#` 로 바꿨습니다. 접미어가 없으면 시리즈 1개 → bar, 여러 개 → line, 숫자 열 없음 → table 로 자동 판정. 시트명 31자 제한도 안내 필요. |
| 2 | 이미지 프록시 "인증 필수" | **서명 토큰 방식** — `images[].url` 에 `?token=` 이 이미 붙어 옵니다(유효 15분, 이미지 한 장 전용). 경로는 JWT 필터 화이트리스트. | `<img src>` 는 Authorization 헤더를 못 보냅니다. Access Token 을 URL 에 넣으면 세션 전체가 접속 로그·브라우저 이력에 남으므로, 그 이미지 하나만 여는 짧은 토큰을 따로 발급합니다. 웹은 **`url` 을 그대로 `<img src>` 에 넣으면** 됩니다. `thumbUrl`(160px JPEG)도 함께 옵니다. 상세를 다시 부르면 새 토큰이 옵니다. |
| 3 | AOI 목록 `defectTypeCd/Nm`, `position` | `defectTypeCd/Nm` 은 **거의 항상 null**, `position` 은 없음 | MES 에 AOI 불량 유형이 없습니다(DB 회신과 동일 — AOI 라벨 6,949건에 불량 이력 0건). 대신 `ngQty`(불량 수량) · `okQty` · `sampleQty` · `moldCd` · `cavity` · `grade` · `remark` 를 냅니다. **불량 유형 필터는 화면에서 빼거나 "유형 정보 없음" 으로 비활성** 권장(DB-Q1 과 같은 질문). |
| 4 | 새 버전 응답 `{ docId, version }` | **새 문서 업로드와 같은 전체 응답**(파싱 결과 포함) | 새 버전을 올린 직후 화면이 바로 그릴 수 있게 했습니다. `docId`·`version` 은 그 안에 있습니다. |

### 업로드 리포트 (요구 6·7·8)

| 메서드·경로 | 권한 | 응답 `data` |
|---|---|---|
| `GET /api/v1/dashboard/uploads` | `dash-ai` | `{ items: [ { docId, title, memo, latestVersion, versionCnt, createdBy, createdByName, createdAt, updatedBy, updatedByName, updatedAt, fileName, sizeBytes, parseState } ] }` — 최신 버전 기준, 최근 업로드 순 |
| `POST /api/v1/dashboard/uploads` (multipart `file`·`title`·`memo`) | `dash-ai-upload` | `{ docId, title, version, fileName, sizeBytes, sha256, uploadedBy, uploadedByName, uploadedAt, parseState, parsed: { sheets[], warnings[] } }` |
| `POST /api/v1/dashboard/uploads/{docId}/versions` (multipart `file`) | `dash-ai-upload` | 위와 동일(새 버전) |
| `GET /api/v1/dashboard/uploads/{docId}/versions` | `dash-ai` 또는 `sys-upload-doc` | `{ docId, title, latestVersion, items: [ { version, fileName, sizeBytes, sha256, uploadedBy, uploadedByName, uploadedAt, parseState, warningCnt } ] }` |
| `GET /api/v1/dashboard/uploads/{docId}/versions/{version}/data` | `dash-ai` | POST 응답과 같은 형태 |
| `GET /api/v1/dashboard/uploads/{docId}/versions/{version}/file` | `dash-ai` | 원본 xlsx 첨부(`Content-Disposition: attachment`) |
| `GET /api/v1/system/uploads` · `GET /api/v1/system/uploads/{docId}/versions` | `sys-upload-doc` | 대시보드 목록과 같은 형태(`createdBy` 포함) |

- **블록 계약** `parsed.sheets[]` = `{ title, chartType, x, series[], columns[], rows[] }`. `columns` 는 헤더 전체(숫자 아닌 열 포함), `series` 는 차트에 그릴 숫자 열만. `rows[]` 는 `{ [헤더명]: 값 }` — 정수는 정수(12000), 소수는 소수(1.2), 날짜 셀은 `yyyy-MM-dd` 문자열. `chartType` 은 `line|bar|grouped|donut|table`.
- **`parseState`** `OK`(경고 없음) · `WARN`(경고 있음, 그래도 저장·표시) · `FAIL`(읽을 시트 없음 — 저장은 되고 `sheets: []`). `parsed.warnings[]` 는 사람이 읽는 문장이라 업로드 직후 그대로 보여 주면 됩니다.
- **검증** 파일 없음·제목 없음·xlsx 아님·20MB 초과 → 400(`error.field` = `file`/`title`). 엑셀로 열리지 않으면 400 이고 디스크·DB 에 남지 않습니다. 권한 없으면 `E-AUTH-002`. 삭제 API 는 없습니다(Q4 대로 버전만 쌓임 — DB 는 `del_flg` 를 준비해 두었으니 필요 시 숨김 API 추가).
- **저장소** 원본은 서버 디스크 `app.upload.dir`(기본 `./data/ax-uploads/{docId}/{version}/원본명`, 환경변수 `AX_UPLOAD_DIR`) — 파싱 JSON 은 DB(`parse_json`)라 화면은 파일을 다시 읽지 않습니다.

### 권한 (요구 7)
- `GET /auth/me` 의 `menuPerms` 에 `dash-ai-upload`·`sys-upload-doc` 가 들어옵니다(실측: 전산팀 10004 는 둘 다, 품질 10001 은 없음). 사이드바 이름(`덕파트장 AI`·`AOI 판정 분석`)도 DB 가 원천이라 `/auth/me`·`/menus` 에 바뀐 이름이 옵니다.
- 메뉴 접근 권한 매트릭스(`GET /system/menu-perms`)의 `screens` 에 두 행이 자동으로 들어옵니다. `dash-ai-upload` 는 `sub: true`(하위 화면 표기)입니다 — 매트릭스에서 "AI 통합 대시보드 › 업로드 리포트 업로드" 로 그려 주세요. `PUT /system/menu-perms { deptId, screenId: 'dash-ai-upload', allowed }` 가 그대로 동작합니다(별도 종류 구분 없음).

### AOI 판정 분석 — 불량 상세·이미지 (요구 9)

| 메서드·경로 | 응답 `data` |
|---|---|
| `GET /api/v1/quality/aoi/defects?from&to&eqptCd&defectTypeCd&lotNo&processId&page&size` | `{ from, to, items: [ { defectId, judgedAt, plantCd, processId, processNm, eqptCd, eqptNm, lotNo, serialNo, itemCd, model, modelNm, moldCd, cavity, okQty, ngQty, sampleQty, grade, remark, defectTypeCd, defectTypeNm, defectTypeCnt, imageCnt } ] }` + `meta{page,size,total,totalPages}`. 기간 미지정 시 `to`=오늘, `from`=7일 전. |
| `GET /api/v1/quality/aoi/defects/equipments` | `{ items: [ { eqptCd, eqptNm, modelNm } ] }` — 필터용 AOI 설비 32대 |
| `GET /api/v1/quality/aoi/defects/{defectId}` | 목록 항목 + `defects[]`(불량 유형 내역, AOI 는 보통 빈 배열) + `imageUrlTtlSec` + `images: [ { imageId, seq, defectCd, nasPath, capturedAt, sizeBytes, available, url, thumbUrl } ]` |
| `GET /api/v1/files/aoi-images/{imageId}?token=…&w=160` | 이미지 스트림(원본 MIME). `w`(32~800) 를 주면 JPEG 썸네일. 토큰 없음·다른 이미지 토큰·만료 → 401 |

- **`defectId` = `plant-wc-lot-serial`** (예 `PL01-V140-20260803-00316`). MES 에 AOI 불량 id 가 없어 라벨 이력 PK 를 이은 것이고, DB 의 `tb_aoi_defect_image.defect_id` 도 같은 문자열입니다. 형식이 틀리면 400, 없으면 404.
- `judgedAt` 은 라벨 이력 시각(`yyyy-MM-dd HH:mm:ss`). 로컬 복제본은 2025-06-22~2026-08-13 구간에만 데이터가 있으니 **기본 7일 기간은 비어 보입니다** — 화면 기본 기간을 `GET /common/data-range` 의 `toDate` 기준으로 잡아 주세요(다른 화면과 같은 규칙).
- `available` 은 NAS(로컬은 `./data/nas-aoi`)에 파일이 실제 있는지입니다. `false` 면 썸네일 자리에 "파일 없음" 을 그려 주세요. `nasPath` 는 표시·복사용 상대 경로입니다.
- 수량 3종은 `qty`, 금형·캐비티는 `mold` 데이터 권한으로 마스킹됩니다(`masked` 배열 규약 동일).
- 기존 `/quality/aoi/prediction/*`·`inspector-drift`·`defect-type-shift` 는 그대로입니다.

### 실측 (시드 10000 관리자 · 10004 전산팀 · 10001 품질)
- 업로드: 5시트 xlsx → `WARN`(경고 4건: 문자열 열 2개 시리즈 제외, `#foo` 모르는 접미어, 빈 시트) · 새 버전 → v2 · 빈 통합문서 → `FAIL` 저장 · 가짜 xlsx → 400 · 제목 없음 → 400 · 품질 계정 → `E-AUTH-002` · 원본 다운로드 헤더 정상 · 시스템 목록은 전산팀/관리자만.
- AOI: 2026-08-01~13 구간 459건, 설비·LOT 필터 동작, 상세에 이미지 2장 → 프록시 200(PNG 640×480) · 썸네일 JPEG · 토큰 없음 401 · 다른 이미지 토큰 401.
- **로컬 픽스처를 남겨 두었습니다**(WEB 실 API 연결 시 사용): 업로드 문서 `docId 1`(9월 회의 자료, v1·v2, WARN) · `docId 3`(빈 문서, FAIL), AOI 이미지 `imageId 1·2` ↔ `PL01-V140-20260803-00316`(PNG 2장은 `API/data/nas-aoi/…`).

### 확인 질문 (발주자·조정)
- **API-Q1.** 시트명 접미어를 `#line` 형식으로 바꾼 것 승인 요청(위 표 1번). 포맷 엑셀 문서가 오면 파서만 교체합니다.
- **API-Q2.** AOI 불량 유형이 MES 에 없어 `defectTypeCd` 필터가 사실상 무의미합니다. NAS 메타데이터/파일명에 유형이 있으면 `tb_aoi_defect_image.defect_cd` 로 적재해 필터를 살릴 수 있습니다 — NAS 문서에 유형이 포함되는지(DB-Q1 과 동일).
- **API-Q3.** NAS 규칙이 "경로 조합형" 이면 매핑 테이블 적재 배치가 필요 없고 서비스에서 조합합니다. 규칙 문서를 받는 즉시 반영합니다. 마운트 경로는 `AX_NAS_AOI_ROOT` 환경변수입니다.
- **API-Q4.** 업로드 원본을 서버 디스크가 아니라 NAS 에 두어야 하면 `AX_UPLOAD_DIR` 만 NAS 마운트로 바꾸면 됩니다 — 어느 쪽인지.

### 변경 파일 (API, 브랜치 `new_dashboard`, 미커밋)
- 신규: `config/UploadProperties.kt`(Upload·Nas 설정), `service/ExcelBlockParser.kt`, `service/DashboardUploadService.kt`, `service/AoiDefectService.kt`, `repository/DashboardUploadRepository.kt`, `repository/AoiDefectRepository.kt`, `controller/DashboardUploadController.kt`(+`UploadDocAdminController`), `controller/FileProxyController.kt`, `test/ExcelBlockParserTest.kt`
- 수정: `QualityController.kt`(`/aoi/defects` 3건), `AppProperties.kt`·`application.yml`(`app.upload.*`, `app.nas.*`), `SecurityWhitelist.kt`(이미지 프록시), `JwtTokenProvider.kt`(파일 토큰), `CachedBodyHttpServletRequest.kt`(multipart 는 캐싱 제외 — 안 하면 1MB 이하 파일 파트가 비어 도착), `DataField.kt`(MenuId 2건), `README.md`(선택 환경변수), `.gitignore`(`data/`)
- 전체 테스트 통과(23개 클래스). DB 는 V25~V27(DB 세션) 적용 완료.

---

## API 회신 2 (2026-09-10 12:10 · WEB-Q1·Q2 답변, 로컬 8080 반영 완료)

- **WEB-Q1. `GET /system/uploads` 의 `uploadedBy` 필터** — 1차 반영본에는 이 필터가 **없었습니다**(웹이 보낸 값이 무시되고 전체가 왔을 것입니다). 지금 추가했고 **사번과 이름 둘 다 받습니다**: 사번은 정확 일치, 이름은 부분 일치(`전산` → 최전산). 웹이 지금처럼 목록의 이름을 보내면 그대로 동작합니다. 어느 버전이든 그 사람이 올린 문서면 결과에 포함됩니다(최신 버전 업로더만 보는 것이 아님). 같은 필터를 `GET /dashboard/uploads` 에도 넣었고, 두 목록 모두 `keyword`(제목·메모·파일명 부분 일치)도 받습니다. 실측: `uploadedBy=10004` = `uploadedBy=최전산` = 2건, `uploadedBy=박생산` = 0건, `keyword=회의` = 1건. 한글 값은 URL 인코딩해서 보내 주세요(브라우저 fetch/axios 는 자동).
- **WEB-Q2. 이미지 토큰 15분 만료** — 현 방식(행 재선택 시 상세 재조회 → 새 토큰)으로 충분합니다. 타이머는 넣지 않아도 됩니다. 만료된 URL 은 401 이 오므로 `<img onError>` 에서 상세를 한 번 다시 부르는 정도면 됩니다. 15분이 짧으면 서버 설정 `app.nas.image-url-ttl-sec`(60~86400)로 늘릴 수 있으니 말씀해 주세요.
- `endpoints.js` 의 `getDashboardUploads` … `getFilesAoiImagesByImageId` 계약(경로·필드명)은 바꾸지 않았습니다. 추가된 것은 두 목록의 선택 쿼리 `uploadedBy`·`keyword` 만입니다.

## WEB 회신 추가 (2026-09-10 · AOI 화면 2차 정리)
발주자 추가 요구로 「AOI 판정 분석」 화면을 불량 판정 원본·사진 중심으로 줄였습니다.
- 「불량 목록」·「출하 전 위험 LOT」 한 줄 배치 · 「불량 이미지」 는 행 선택 시에만 표시 · 목록 3종 모두 Tabulator.
- 제거: 예측 KPI·조건 줄(이상 가능성 분석 — 추정) · 설비별 위험도 · 잔여 시간 추가 발생 추정 · AOI 검사기별 판정 드리프트 · 「지금 상태 — 추정의 근거」 제목.
- 그래서 **웹은 이 세 조회를 더 부르지 않습니다**: `/quality/aoi/prediction/equipment-risk` · `/prediction/remaining-estimate` · `/aoi/inspector-drift`. 서버는 그대로 두시면 됩니다(다시 붙일 수 있게 카탈로그·서비스에는 남겨 두었습니다).
- **API-Q5(성능).** 로컬에서 `/quality/aoi/prediction/summary` 17초 · `/prediction/lot-risk` 14초가 걸려 화면 아래 두 카드가 늦게 뜹니다. summary 는 임계값(SY-13) 때문에 계속 부르고 있는데, 임계값만 주는 가벼운 응답이나 캐시가 가능한지 검토 부탁드립니다.

## WEB 확인 (2026-09-11 · API 회신 2 에 대한 답)
- **WEB-Q1** 해결. 웹은 지금처럼 목록의 **이름**을 `uploadedBy` 로 보냅니다(사번도 받는 것 확인). 두 목록의 `keyword` 도 웹의 검색어 칸이 이미 같은 이름으로 보내고 있어 추가 수정은 없습니다.
- **WEB-Q2** 현 방식 유지에 동의합니다. 만료 URL 자동 재조회(`<img onError>` → 상세 1회 재호출)는 사용 중 불편이 보고되면 넣겠습니다. TTL 15분도 그대로 두겠습니다.
