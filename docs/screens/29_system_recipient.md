# 29. `/system/recipient` — 알림 수신자 관리

| 항목 | 값 |
| :--- | :--- |
| URL | `/system/recipient` |
| 화면 ID | `sys-recip` |
| 라우트 파일 | `app/(main)/system/recipient.jsx` |
| MVC | `domains/system/view/RecipientView.jsx` · `view/RecipientForms.jsx` · `controller/useRecipientController.js` · `model/alertFormModel.js` · `model/systemRepository.js`(SY-05 구역) |
| 기능 ID | SY-05 |
| 접근 권한 | 조회 `sys-recip` · 쓰기(그룹·수신자 등록·수정·테스트 발송) `sys-recip` 쓰기 권한(R-06) · 연락처 편집은 데이터 권한 `worker` 도 필요 |

**「누구에게 · 어떤 연락처로」** 보낼지를 관리합니다. 발송 조건(SY-04)은 여기서 만든 **수신 그룹을 골라 연결**하므로 멤버·연락처 변경은 이 화면에서만 합니다.

> **2026-10-01 변경** — 기획 06(`06_sys-recip_알림수신자관리.md`)의 P0(RCP-01~04·RCP-15)와 RCP-06(후보 계정 검색)·RCP-16(엑셀 옵션 패널)을 반영했습니다.
> 그룹 편집은 상세 응답으로 채우고 바뀐 키만 저장해 대응 부서·기존 채널·멤버가 지워지지 않습니다.
> 3단계 P1(RCP-05·07~12)을 반영했습니다 — 검색형 멤버 선택기, 부재로/수신으로(사유·영향), 수신자 삭제(영향·force), 그룹 사용 중지·「사용 중지 그룹 보기」, 연계 열(수신 가능·사용 조건·승격 대상·상태), 야간·시간대 규칙 안내, 서버 필터(그룹 ID·상태·계정·검색), 연락처 지우기. 잠긴(LOCKED) 계정도 알림을 받습니다(3단계 결정). RCP-13(감사)은 서버 몫입니다. 4단계 P2(RCP-14 목·문구·문서 정리)를 마쳤습니다 — 목 응답은 서버 모양(`recipientCnt{receiving,absent}`·`hp`·코드값 상태·`validWindow`·`nightWindow`)입니다. 메뉴 설명 문구(`menu.js`)의 「대리 수신자」 삭제는 공통 파일이라 변경 요청으로 남겼습니다.

> **2026-09-16 변경** — 「당번 · 승격」 탭을 걷어냈습니다. 당번은 서버 API 4건과 표(`ax.tb_alm_duty`)까지 정리했고,
> 승격 규칙은 [알림 현황] 의 「승격 대상」이 계속 읽으므로 서버 API·표를 남긴 채 이 화면에서만 뺐습니다.
>
> **2026-10-03 변경** — 엔진이 승격하지 않게 되어 승격 규칙을 API(`/alert-escalation-rules` 조회 · 수정, `/alerts/escalation-targets`)와 표(`ax.tb_alm_escalation_rule`, 보관 표에 값 보존)까지 없앴습니다.
> 이 화면의 「승격 대상」 열, 상단 「승격 규칙에 대상 그룹이 없어…」 안내, 그룹 편집 「연계」 의 승격 대상 문구, 부재 전환 영향의 승격 단계 문구를 뺐습니다.
>
> **2026-10-03 변경 (2)** — 「부재(수신/부재 전환)」 와 「야간 수신」(수신자 · 그룹)을 엔진 · API · DB(V74) 에서 모두 없앴습니다.
> 이제 그룹 멤버는 모두 받고(계정 정지 · 승인 대기 · 연락처 없음만 빠짐), 야간이라고 빼지 않습니다(그룹 · 조건의 유효 시간대만 지킴).
> 화면에서는 머리말 설명 · [발송 조건 관리] 단추 · 요약 카드 보조 문구 · 부재/야간 카드 · 안내(`Hint`) · 카드 부제 · 야간 열 · 상태 열 · 「부재로/수신으로」 단추 · 상태 조회 조건 · 폼의 야간 항목을 뺐고,
> 수신 그룹 / 수신자를 카드 탭(`CardTabs`, `recip-tab-*`)으로 나눠 각 탭의 단추(사용 중지 그룹 보기 · 엑셀 · 수신 그룹 등록 / 엑셀 · 수신자 등록)를 탭 머리 오른쪽으로 옮겼습니다.
> 아래 본문에서 「제거됨」 으로 표시한 항목이 이에 해당합니다. 요약 응답의 `recipientCnt` 는 숫자 하나(등록 수신자 수)로 바뀌었습니다.
>
> **2026-10-03 변경 (3)** — 디자인 피드백 2차.
> · 「사용 중지 그룹 보기」 체크와 기능을 뺐습니다. 그룹 목록은 늘 `includeInactive=true` 로 불러 사용 중지 그룹도 함께 보이고, 상태 열 · 「사용」 단추로 되살립니다.
> · 수신 그룹 표: 「멤버」 열을 뺐고 「구성원」 열을 「수신자 목록」 으로 바꿨습니다. 칸은 「이름(사번)」 이고 3명 이상이면 앞 2명 + 「외 N명」 입니다.
>   머리글 검색은 숨은 사람까지 포함한 전체 문자열로 하고, 칸을 누르면 그룹 상세(`GET /alert-recipient-groups/{id}`)로 「수신자 목록」 모달(이름(사번) · 부서)을 엽니다.
> · 수신자 표: 「이름」 → 「이름(사번)」, 「계정」 · 「휴대전화」 · 「메신저」 열을 뺐습니다(엑셀도 같음). 「계정」 조회 조건은 남겼습니다.
> · 수신자 폼: 휴대전화 · 사내 메신저 칸을 뺐습니다. 알림은 메일로만 나가며, 이미 저장된 값과 API · DB 컬럼은 그대로 둡니다.
>
> **2026-10-03 변경 (4)** — 메일은 **계정 이메일**(`ax.tb_sys_user.email`)이 기준입니다. 예전에는 등록 때 복사한 `ax.tb_alm_recipient.email` 을 읽어
> 계정 관리에서 이메일을 바꿔도 수신자 화면 · 알림 발송이 옛 주소를 썼습니다. 이제 API · 엔진이 `COALESCE(계정 이메일, 수신자 메일)` 로 읽습니다.
> · 수신자 등록: 메일 입력칸을 없애고 「메일(계정 이메일): …」 로만 보입니다. 계정에 메일이 없으면 계정 관리에서 먼저 등록하라고 알립니다(서버도 400).
> · 수신자 「편집」 단추를 없앴습니다 — 고칠 항목이 남지 않습니다. 관리 열은 「삭제」 만 있습니다.
> · 표 열 너비: 수신 그룹 · 수신자 표는 `TabulatorGrid fillWidth` — 내용 너비를 잰 뒤 남는 폭을 열마다 비율로 나눠 표 오른쪽이 비지 않습니다. 좁으면 가로 스크롤.
> · 수신자 탭 조회 줄(그룹 · 계정 · 검색 · 조회)을 뺐습니다. 수신자는 `GET /alert-recipients?size=0`(상한 5,000)으로 전원을 받아 표가 100건씩 나누고(`pageSize`),
>   「수신 그룹」 · 「직급」 머리글은 선택 목록 필터입니다(수신 그룹은 「A · B」 를 나눠 선택지로 두고 고른 그룹을 포함한 사람을 남김). 나머지 열은 검색칸입니다.
>   예전 서버 필터(`groupId` · `userState` · `keyword`)와 쪽 이동(`Pagination`)은 화면에서 쓰지 않습니다.
>
> **2026-10-04 변경** — 수신자 표 · 엑셀의 「비고」 열을 뺐습니다(부재 사유를 적던 칸). 계정 이메일이 없는 계정은 수신자로 등록할 수 없습니다(서버 400, 결정).
> 「열 너비는 내용에 맞춰…」 안내는 두 표 모두 숨겼습니다(`widthHint={false}`). DB 는 V74 로 부재 · 야간 컬럼을 지웠습니다(로컬 적용, 값은 보관 표).
>
> **2026-10-04 변경 (2)** — 수신 그룹 폼에서 **발송 채널을 고르고 바꿉니다**(예전: 「메일 (고정)」 · 화면에서 바꿀 수 없음).
> · 선택지는 공통코드 `ALM_CHANNEL` 중 사용 중이고 `attr1`(알림 엔진 어댑터 코드)이 있는 채널 — 메일 · 시스템 팝업 2개(결정). SMS · 메신저는 V76 에서 사용 중지했습니다. 시스템 팝업은 받는 사람 화면 오른쪽 위 토스트(5초)로 뜹니다([24](./24_alert_list.md)).
>   이미 저장된 연동 전 채널은 「(연동 전)」 으로 보이고, 빼면 다시 고를 수 없습니다. 1개 이상 필수.
> · 등록은 고른 채널을, 수정은 채널을 바꿨을 때만 `channels` 를 보냅니다(`groupBody`).
> · DB V76 — MAIL · POPUP 의 `attr1` 을 어댑터 코드로 채우고 SMS · MSG 는 비움(로컬 적용). API — 수신 그룹 · 발송 조건 저장 때 `attr1` 이 빈 채널은 400(`field=channels`).
> · 발송 조건 폼의 채널 선택지도 같은 기준(`liveChannelsOf`)을 씁니다(예전 고정 목록 `LIVE_CHANNELS` 는 V76 전 서버용 대체값).
> 표는 공통 `Table`(React 포털) 대신 **`TabulatorGrid`** 로 그립니다.

## 1. 컴포넌트

`PageHead`(제목만) · 읽기 전용 `Hint` · `StatCard`×2(수신 그룹 · 수신자) · **`CardTabs`(수신 그룹 / 수신자, 탭 머리 오른쪽에 그 탭의 단추)** · 탭별 `TabulatorGrid` (2026-10-03 — 예전: `PageHead` 단추 3개 · `StatCard`×4 · `Hint` · `Tabs` · 탭별 `Card`) · `openFormModal`(그룹/수신자, `RecipientForms`) · `openModal`(테스트 결과, `AlertTestResult`) · `AlertGuardButton`

### 1-1. 표 규칙 (두 탭 공통)

`TabulatorGrid` 에 `autoWidth` · `bordered` · `inset` 을 줍니다.

| 옵션 | 효과 |
| :--- | :--- |
| `autoWidth` | 열 너비를 **전부 내용이 정합니다**(Tabulator `layout:'fitData'`). 열 정의에 폭을 적지 않습니다 — 최소폭을 끼우면 '야간'·'멤버' 같은 짧은 열이 내용보다 넓게 벌어집니다. 합이 카드보다 넓으면 표 안에서 가로 스크롤 — 열을 숨기거나 압축하지 않습니다 |
| 크기 조절 | 머리글 경계를 끌어 사람이 직접 폭을 바꿉니다 (`columnDefaults.resizable:'header'`) |
| `bordered` | 머리글·칸에 세로 줄을 그어 어느 값이 어느 열인지 갈립니다 |
| 머리글 검색 | 데이터 열마다 검색 입력칸. 배지·버튼 열은 제외(`headerFilter:false`) |

칸 안의 배지·버튼은 formatter 가 HTML 로 그리고(`.tag` · `.tbtn` · `.mono` · `.nowrap`), 클릭은 열의 `cellClick` 에서 `data-act` 로 가려냅니다.

`worker` 데이터 권한이 없으면 이름 · 메일 · 휴대전화 · 메신저 · 구성원 칸을 `●●●● 비공개` 로 바꿔 그립니다(값 자체를 렌더링하지 않습니다). 서버도 같은 경우 값을 `null` 로 주고 `masked:['worker']` 를 답니다(RCP-01).

쓰기 권한이 없으면 표 안의 `편집` · `테스트 발송` 버튼을 `disabled` 로 그리고 `title` 에 「이 화면의 쓰기 권한이 없습니다. 전산팀에 요청하세요.」 를 답니다(R-06). 수신자 `편집` 은 `worker` 권한이 없어도 같은 방식으로 막습니다(「데이터 권한(worker) 필요」).

## 2. 화면에 출력해야 하는 정보

### 2-1. 요약 카드 (`GET /alert-recipients/summary`)

수신 그룹(`groupCnt`, 사용 중지 그룹이 있을 때만 보조 「사용 중지 N」) · 수신자(`recipientCnt` 명 — 숫자, 보조는 `inactiveAccountCnt` 가 있을 때만 「계정 정지 N명 제외」). 보조 문구 「발송 조건이 연결하는 단위」 · 「알림을 받는 계정」 과 부재 · 야간 카드는 **제거됨(2026-10-03)**

### 2-2. 탭 1 — 수신 그룹 (`GET /alert-recipient-groups`)

| 열 | 비고 |
| :--- | :--- |
| 그룹명 `name` | |
| 발송 채널 `channels` | 등록은 `메일` 고정. 기존 그룹의 다른 채널(시스템 팝업 등)은 그대로 보존·표시 (아래 3-1) |
| 유효 시간대 `validWindow` | 공통코드 `ALM_WINDOW` 표기 |
| ~~야간 `night`~~ | 제거됨(2026-10-03) |
| 멤버 | `memberCnt`, 우측 정렬 |
| **수신 가능** | `receivableCnt`(없으면 `receivingCnt`)/멤버, 0 이면 red (minWidth 90) |
| **사용 조건** | `condCnt`, 툴팁 조건명. `alert-cond` 권한자는 눌러 그 화면으로 (minWidth 90) |
| ~~**승격 대상**~~ | ~~`escStages` 「1차 · 2차」~~ — 제거됨(2026-10-03) |
| 구성원 `memberNames` | ` · ` 연결 1줄 · **`worker` 마스킹** |
| **상태** | `useFlg` 사용 / 사용 중지 (minWidth 80) |
| 관리 | `편집` · `테스트 발송` · `사용 중지/사용` |

폭은 지정하지 않습니다 — 전부 내용이 정합니다.

### 2-3. 탭 2 — 수신자 (`GET /alert-recipients`)

조회 조건 : 그룹(`groupId`) · ~~상태~~(제거됨 2026-10-03) · 계정(`userState`) · 검색(`keyword`, 이름·사번·부서 — 조회·Enter 에만) — 모두 서버가 거릅니다(RCP-11). 수신자 목록은 수신자 탭에서만 부릅니다.

| 열 | 비고 |
| :--- | :--- |
| **수신 그룹 `groups`** | **첫 열**. ` · ` 연결 1줄 — 어느 그룹으로 알림을 받는 사람인지가 이 표를 읽는 첫 기준입니다 |
| 이름 `name` | **`worker` 마스킹** |
| 부서 `dept` | |
| 직급 `posNm` | 서버 공통코드 `SYS_POSITION` 표기 (코드값은 `pos`) |
| **계정 `userStateNm`** | minWidth 80. `사용`(green) / `정지`(red) / `승인 대기`(amber). 정지·승인 대기 계정은 알림을 받지 않습니다(RCP-04) |
| 메일 · 휴대전화 · 메신저 (mono) | **`worker` 마스킹** |
| ~~야간 `night`~~ · ~~상태 `state`~~ | 제거됨(2026-10-03) |
| **비고** | `remark`, 말줄임·툴팁 (minWidth 140) |
| 관리 | `편집` · `삭제` (「부재로/수신으로」 는 제거됨 2026-10-03) |

폭은 지정하지 않습니다 — 전부 내용이 정합니다.

표 아래 `BlindNote` · `Pagination`(서버 `page`/`size`).

## 3. 버튼 및 폼

| 버튼 | 동작 |
| :--- | :--- |
| 수신 그룹 등록 | 폼 → `POST /alert-recipient-groups` (채널 `['MAIL']` 고정) |
| 수신 그룹 편집 | **`GET /alert-recipient-groups/{groupId}` 상세로 폼을 채운 뒤** → `PUT /{groupId}` 에 **바뀐 키만** + `updatedAt`. 채널은 보내지 않습니다(RCP-02). 상세를 못 받으면 폼을 열지 않습니다 |
| 테스트 발송 | `POST /alert-recipient-groups/{groupId}/test-send` → 결과 모달(발송 대기 N건 · 수신 예정 · 제외 사유, RCP-03) |
| 수신자 등록 | 폼(계정 검색 `GET /alert-recipients/candidates`) → `POST /alert-recipients` |
| 수신자 편집 | 폼 → `PUT /{recipientId}` 바뀐 칸만 (worker 권한 필요). 휴대전화·메신저를 비우면 `""` 로 지웁니다(`preserveEmpty: hp, messenger`) |
| ~~부재로~~ (제거됨) | `GET /{recipientId}/impact` 로 영향(받는 사람 0명이 되는 그룹·조건)과 사유(300자)를 묻고 → `PATCH /{recipientId}/state {state:'ABSENT', reason}` |
| ~~수신으로~~ (제거됨) | 바로 `PATCH …/state {state:'RECV'}` |
| 삭제 | 영향을 보여 주고 확인 → `DELETE /{recipientId}`. 409(영향 있음)면 한 번 더 확인 후 `?force=true` |
| 사용 중지 / 사용 | 중지는 확인 후 `PATCH /alert-recipient-groups/{groupId}/state {on}`. 조건이 쓰면 서버 409 사유를 토스트 |
| 사용 중지 그룹 보기 | 그룹 목록을 `includeInactive=true` 로 다시 부름 |
| ~~발송 조건 관리~~ | 제거됨(2026-10-03). 그룹 표의 「사용 조건」 건수를 누르면 발송 조건 화면으로 갑니다 |
| 엑셀 다운로드 ▾ | 지금 탭의 옵션 패널(아래 3-2) |

서버가 403 `E-AUTH-004`(쓰기 권한 없음)를 주면 서버 메시지를 토스트로 보입니다.

### 3-1. 폼 필드

**수신 그룹** — 멤버는 **검색형 선택기**(전 수신자 `size=0` 에서 검색·추가, 「부서 전체 추가」, 칩으로 빼기, 부재·계정 정지는 흐리게, RCP-05). 그룹명(필수, 50자) · **대응 부서(select, `없음` 가능 — 선택지는 상세 응답 `deptOptions`)** · 유효 시간대(select) · **발송 채널(읽기 전용)** · 야간 발송(radio) · 그룹 멤버(check — 지금 쪽 수신자 + 그룹의 기존 멤버를 합친 선택지) · 이 그룹을 쓰는 발송 조건(편집 시)

- 수정 본문은 바뀐 키만 보냅니다. 멤버를 모두 빼면 `memberEmpNos: []`, 대응 부서를 비우면 `deptId: null` 을 보냅니다 — `endpoints.js` 의 `preserveEmpty: ['deptId','channels','memberEmpNos']` 가 빈 값을 걸러 내지 않게 합니다.
- 멤버를 모두 빼고 저장하면 「멤버가 없으면 이 그룹을 쓰는 조건 N건은 아무에게도 발송되지 않습니다」 를 한 번 묻습니다.
- 기존 그룹에 메일 외 채널이 있으면 「메일 외에 시스템 팝업도 받습니다(화면에서 바꿀 수 없음)」 로 보이고 그대로 남습니다.
- `worker` 권한이 없으면 멤버 선택지가 `사번 · 부서` 로 보입니다.

> **발송 채널은 메일 하나입니다** (2026-09-16 결정). 화면에서 고르지 않고 컨트롤러가 `channels: ['MAIL']` 로 고정해 보냅니다.
> 공통코드 `ALM_CHANNEL` 의 `POPUP` · `SMS` · `MSG` 는 발송 조건(SY-04)이 함께 쓰는 코드라 **지우지 않았습니다.**

안내 : "알림은 메일로만 나갑니다. 그룹 멤버는 수신자 목록에 등록된 계정에서 고르며, 야간 수신 여부는 수신자별로도 관리됩니다."

**수신자** — 등록: 계정(검색 선택, 필수 — `GET /alert-recipients/candidates`, 고르면 계정 메일로 메일 칸을 채움, 수정 가능) · 휴대전화 · 사내 메신저 · 야간 수신. 편집: 사번(읽기 전용) · 메일(필수) · 휴대전화 · 사내 메신저 · 야간 수신

- 후보는 아직 수신자가 아닌 사용 중 계정이며 **미배정(부서 배정 전) 계정은 서버가 뺍니다**(결정 R-14). 등록 요청이 409 이면 서버 메시지 「부서 배정 전 계정은 알림 수신자로 등록할 수 없습니다」 를 토스트로 보입니다.
- 후보 조회가 실패하면 사번을 직접 입력할 수 있습니다.
- 메일 형식·휴대전화(숫자·하이픈 9~20자)·메신저 50자를 폼에서 먼저 확인합니다.
안내 : "연락처는 알림 발송에만 사용되며, 데이터 접근 권한 worker 항목이 없는 계정에는 마스킹되어 보입니다."

### 3-2. 엑셀 다운로드 옵션 패널 (RCP-16, R-10 · R-16)

지금 열린 탭을 받습니다. 두 항목 모두 조회 권한이면 받습니다.

| 탭 · 항목 | 범위 | 데이터 | 이력 |
| :--- | :--- | :--- | :--- |
| 수신 그룹 · 조회 목록 | 그룹 표에 보이는 행(머리글 검색·정렬·열 순서 반영, 관리 열 제외) | 표 인스턴스 `getData('active')` | `VIEW`, 「탭=수신 그룹 · 머리글 검색 반영」 |
| 수신 그룹 · 전체 | 사용 중지 그룹 포함 전 그룹, 상한 1,000 | `GET /alert-recipient-groups?includeInactive=true` | `ALL`, 「탭=수신 그룹 · 사용 중지 포함」 |
| 수신자 · 조회 목록 | 현재 쪽 표에 보이는 행(머리글 검색·정렬 반영) | 표 인스턴스 | `VIEW`, 「탭=수신자 · 그룹=… · 상태=… · 쪽=N」 |
| 수신자 · 전체 | 조건·쪽과 무관한 전원, 상한 5,000(`meta.truncated` 면 안내) | `GET /alert-recipients?size=0` | `ALL`, 「탭=수신자 · 전체」 |

`worker` 권한이 없으면 이름·메일·휴대전화·메신저(수신자)·구성원(그룹) 칸을 빈칸이 아니라 `비공개` 로 채우고, 그 칸 수를 파일 안 「비공개 처리 n건」 과 이력 `blindCnt` 에 같은 값으로 남깁니다. 열마다 응답 필드명(`attrs`)도 함께 넘깁니다.

## 4. 그 밖의 기능

~~`Hint`~~ (제거됨 2026-10-03) : "발송 조건은 이 화면의 수신 그룹을 골라 연결합니다. 그룹 이름을 바꿔도 연결은 유지됩니다. 멤버를 빼거나 부재로 바꾸면 해당 그룹을 쓰는 조건의 받는 사람이 줄어듭니다."

P1 이후 항목(검색형 멤버 선택기·부재/수신 전환·삭제·사용 중지·연계 정보 열·서버 그룹 필터)은 아직 반영하지 않았습니다.

## 5. 사용 API

총 **13건** (2단계 신규: 그룹 상세 · 후보 계정, 3단계 신규: 영향 조회 · 수신자 삭제 · 그룹 사용 중지. 승격 규칙 조회는 2026-10-03 에 제거)

| # | 서비스 함수 | API 명 | Method | Path | 요청 | 응답 |
|---|---|---|---|---|---|---|
| 165.1 | `getAlertRecipientsByRecipientIdImpact` | 수신자 영향 **(신규)** | GET | `/api/v1/alert-recipients/{recipientId}/impact` | — | empNo, groups[{groupId,name,receivableCntAfter}], zeroGroups[], affectedConds[] |
| 165.2 | `deleteAlertRecipientsByRecipientId` | 수신자 삭제 **(신규)** | DELETE | `/api/v1/alert-recipients/{recipientId}` | force | success / 409 data{zeroGroups, affectedConds} |
| 160.1 | `patchAlertRecipientGroupsByGroupIdState` | 그룹 사용 중지 **(신규)** | PATCH | `/api/v1/alert-recipient-groups/{groupId}/state` | on | useFlg, changed / 409 |
| ~~165~~ | ~~`patchAlertRecipientsByRecipientIdState`~~ | 수신/부재 전환 — **제거됨(2026-10-03)** | PATCH | `/api/v1/alert-recipients/{recipientId}/state` | state(필수), reason | success |
| ~~169~~ | ~~`getAlertEscalationRules`~~ | 승격 규칙 조회 — **제거됨(2026-10-03)** | GET | `/api/v1/alert-escalation-rules` | — | stages[{stage,targetGroupId}] — 대상 그룹이 모두 비면 상단 안내 |


| # | 서비스 함수 | API 명 | Method | Path | 요청 파라미터 | 응답 주요 필드 | 접근 권한 | blind | 우선순위 |
|---|---|---|---|---|---|---|---|---|---|
| 157 | `getAlertRecipientsSummary` | 수신자 관리 요약 | GET | `/api/v1/alert-recipients/summary` | — | groupCnt, recipientCnt(숫자), receivableCnt, inactiveAccountCnt | 전산팀·통합관리자 | — | 2 |
| 158 | `getAlertRecipientGroups` | 수신 그룹 목록 | GET | `/api/v1/alert-recipient-groups` | includeInactive | items[{groupId,name,deptId,dept,useFlg,channels[],validWindow,members[{empNo,name}],memberEmpNos[]}], masked | 조회 | worker | 1 |
| 158.1 | `getAlertRecipientGroupsByGroupId` | 수신 그룹 상세 **(신규)** | GET | `/api/v1/alert-recipient-groups/{groupId}` | groupId | groupId, name, deptId, dept, useFlg, channels[], members[{empNo,name,dept,state,userState}], receivableCnt, conds[], deptOptions[], updatedAt | 조회 | worker | 1 |
| 159 | `postAlertRecipientGroups` | 수신 그룹 등록 | POST | `/api/v1/alert-recipient-groups` | name, deptId, channels[](MAIL), validWindow, memberEmpNos[] | groupId | 쓰기 | — | 1 |
| 160 | `putAlertRecipientGroupsByGroupId` | 수신 그룹 수정 | PUT | `/api/v1/alert-recipient-groups/{groupId}` | 바뀐 키만 + updatedAt (`preserveEmpty: deptId, channels, memberEmpNos`) | success / 409 동시 수정 | 쓰기 | — | 1 |
| 161 | `postAlertRecipientGroupsByGroupIdTestSend` | 수신 그룹 테스트 발송 | POST | `/api/v1/alert-recipient-groups/{groupId}/test-send` | — | alertId, queuedCnt, sentCnt, recipients[], skipped[] | 쓰기 | — | 2 |
| 162 | `getAlertRecipients` | 수신자 목록 | GET | `/api/v1/alert-recipients` | groupId, userState, keyword, page, size(0=전체) | items[{empNo,name,dept,pos,posNm,mail,hp,messenger,userState,userStateNm,remark,groups[]}], meta{truncated}, masked | 조회 | worker | 1 |
| 162.1 | `getAlertRecipientsCandidates` | 수신자 등록 후보 계정 **(신규)** | GET | `/api/v1/alert-recipients/candidates` | keyword, deptId, size | items[{empNo,name,dept,posNm,email}] (미배정 제외) | 조회 | worker | 2 |
| 163 | `postAlertRecipients` | 수신자 등록 | POST | `/api/v1/alert-recipients` | empNo, mail, hp, messenger | recipientId | 전산팀·통합관리자 | — | 1 |
| 164 | `putAlertRecipientsByRecipientId` | 수신자 수정 | PUT | `/api/v1/alert-recipients/{recipientId}` | mail, hp, messenger | success | 전산팀·통합관리자 | — | 1 |

> **수신/부재 전환**(`PATCH /api/v1/alert-recipients/{recipientId}/state`, No.165)의 「부재」 버튼은
> 2026-09-16 에 걷어냈다가 2026-10-01 기획 06 RCP-07 로 「부재로/수신으로」 버튼을 되살렸습니다(본문 `state` 필수 · `reason`).
> 예전 `toggleRecipientState` 는 지우고 `setRecipientState` 를 씁니다.
>
> 승격 규칙(`GET/PUT /api/v1/alert-escalation-rules`, No.169)과 「승격 대상」(`GET /api/v1/alerts/escalation-targets`)은 **제거됨(2026-10-03)** 입니다. 엔진이 승격하지 않아 RCP-09 안내도 뺐습니다.
> 당번 4건(No.166~168, `/api/v1/alert-duties`)은 서버에서 제거됐습니다.

## 6. 사용 DB 표

`ax.tb_alm_recip_group` · `ax.tb_alm_recip_group_channel` · `ax.tb_alm_recip_group_member` · `ax.tb_alm_recipient`
(테스트 발송은 `ax.tb_alm_alert` · `ax.tb_alm_send_log` 에 기록)

로컬 시드는 `API/src/main/resources/db/local/seed_alert_recipient.sql` — 수신 그룹 2(`엔진 가동` · `생산 이슈`, 채널은 메일만) · 수신자 6(1명은 부재).

## 7. 개발 체크리스트

- [x] 요약 카드(2026-10-03 4장 → 2장)
- [x] 탭 2종 전환
- [x] 수신 그룹 표 + 등록/편집/테스트 발송
- [x] 수신자 표(수신 그룹이 첫 열) + 필터(그룹·상태) + 등록/편집 + **`worker` 마스킹**
- [x] Tabulator 자동 열 너비 · 크기 조절 · 칸 경계
- [x] 엑셀 다운로드 · 발송 조건 화면 연계
- [x] 수신자 페이징
- [x] 그룹 편집 상세 조회·바뀐 키만 저장·멤버 비우기 확인·대응 부서(RCP-02)
- [x] 그룹 테스트 결과 모달(RCP-03) · 계정 열(RCP-04) · 후보 계정 검색(RCP-06)
- [x] 쓰기 권한 UI(RCP-15) · 엑셀 옵션 패널·worker 마스킹(RCP-01·16)
- [x] (P1) 멤버 선택기 · 부재/수신 전환 · 삭제 · 사용 중지 · 연계 열 · 규칙 안내 · 서버 필터 · 연락처 지우기
- 시험: `API_URL=http://localhost:18081 WEB_URL=<로컬 대상 개발 서버> node tests/system/recipient-browser.cjs` (`page.route` 로 API 흉내), 실 API 계약은 `node tests/system/alert-recip-live.cjs`
