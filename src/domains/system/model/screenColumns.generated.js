/**
 * 자동 생성 — 직접 고치지 마십시오. `node scripts/build-screen-columns.cjs` 로 다시 만듭니다.
 *
 * 화면(메뉴)마다 실제로 보이는 표의 열 제목과 그 열이 읽는 값 이름(응답 필드명)입니다.
 * 데이터 항목 관리(화면 보고 가리기)가 이 목록으로 「이 화면의 어떤 열을 가릴지」를 보여 줍니다.
 */
export const SCREEN_COLUMNS = [
  {
    "id": "dash-ai",
    "name": "AI 통합 대시보드",
    "group": "대시보드",
    "columns": [
      {
        "title": "불량 유형",
        "field": "defectType"
      },
      {
        "title": "유형 코드",
        "field": "defectTypeCd"
      },
      {
        "title": "불량 수량",
        "field": "ngQty"
      },
      {
        "title": "구간 비중",
        "field": "ratio"
      },
      {
        "title": "분류 상태",
        "field": "classification"
      },
      {
        "title": "원천 불량 수량",
        "field": "rawQty"
      },
      {
        "title": "기록 수",
        "field": "recordCount"
      },
      {
        "title": "LOT 수",
        "field": "lotCount"
      },
      {
        "title": "품목 수",
        "field": "itemCount"
      },
      {
        "title": "품목 코드",
        "field": "itemCds"
      },
      {
        "title": "공정 코드",
        "field": "processIds"
      },
      {
        "title": "비고",
        "field": "remarks"
      },
      {
        "title": "등록자",
        "field": "insUsers"
      },
      {
        "title": "최초 발생",
        "field": "firstAt"
      },
      {
        "title": "최종 발생",
        "field": "lastAt"
      },
      {
        "title": "사용",
        "field": "useFlg"
      },
      {
        "title": "유형 마스터 비고",
        "field": "masterRemark"
      },
      {
        "title": "공장",
        "field": "plant"
      },
      {
        "title": "설비",
        "field": "eqpt"
      },
      {
        "title": "제품",
        "field": "product"
      },
      {
        "title": "AI 불량 판단 기준",
        "field": "standard"
      },
      {
        "title": "원인",
        "field": "cause"
      },
      {
        "title": "AI 불량 판단 근거",
        "field": "basis"
      },
      {
        "title": "종류",
        "field": "kind"
      },
      {
        "title": "대조 대상",
        "field": "target"
      },
      {
        "title": "확인된 값",
        "field": "value"
      },
      {
        "title": "파일명",
        "field": "file"
      },
      {
        "title": "위치 · 쪽",
        "field": "where"
      },
      {
        "title": "경로",
        "field": "path"
      },
      {
        "title": "인용",
        "field": "quote"
      }
    ]
  },
  {
    "id": "dash-proc",
    "name": "공정 및 제품 대시보드",
    "group": "대시보드",
    "columns": [
      {
        "title": "제품",
        "field": "code"
      },
      {
        "title": "제품명",
        "field": "productNm"
      },
      {
        "title": "공정",
        "field": "process"
      }
    ]
  },
  {
    "id": "prod-result",
    "name": "실적 집계·조회",
    "group": "생산 및 품질 관리",
    "columns": [
      {
        "title": "일자",
        "field": "date"
      },
      {
        "title": "제품명",
        "field": "productNm"
      },
      {
        "title": "공장",
        "field": "plantNm"
      },
      {
        "title": "공정",
        "field": "processNm"
      },
      {
        "title": "설비 코드",
        "field": "equipCd"
      },
      {
        "title": "설비명",
        "field": "equipNm"
      },
      {
        "title": "투입",
        "field": "inputQty"
      },
      {
        "title": "양품",
        "field": "okQty"
      },
      {
        "title": "불량",
        "field": "ngQty"
      },
      {
        "title": "불량률",
        "field": "defectRate"
      },
      {
        "title": "가동률",
        "field": "uptimeRate"
      },
      {
        "title": "비가동 시간",
        "field": "downtimeMin"
      }
    ]
  },
  {
    "id": "qc-defect",
    "name": "불량 현황 조회",
    "group": "생산 및 품질 관리",
    "columns": [
      {
        "title": "계층",
        "field": "outline"
      },
      {
        "title": "불량 유형",
        "field": "label"
      },
      {
        "title": "불량 수량",
        "field": "value"
      },
      {
        "title": "비중",
        "field": "ratio"
      },
      {
        "title": "라인(설비) 코드",
        "field": "eqptCd"
      },
      {
        "title": "설비명",
        "field": "eqptNm"
      },
      {
        "title": "공장",
        "field": "plantNm"
      },
      {
        "title": "공정",
        "field": "wcNm"
      },
      {
        "title": "제품",
        "field": "itemNm"
      },
      {
        "title": "불량 유형",
        "field": "defectNm"
      },
      {
        "title": "정상 수량",
        "field": "okQty"
      },
      {
        "title": "불량 수량",
        "field": "ngQty"
      },
      {
        "title": "불량률 · 비중",
        "field": "rate"
      },
      {
        "title": "제품 코드",
        "field": "itemCd"
      },
      {
        "title": "제품명",
        "field": "itemNm"
      }
    ]
  },
  {
    "id": "qc-aoi",
    "name": "AOI 판정 분석",
    "group": "생산 및 품질 관리",
    "columns": [
      {
        "title": "불량 유형",
        "field": "defectType"
      },
      {
        "title": "일평균 대비 증감률",
        "field": "change"
      },
      {
        "title": "판정 (PASSED)",
        "field": "passed"
      },
      {
        "title": "측정 시각 (DATE_TIME)",
        "field": "measuredAt"
      },
      {
        "title": "작업장",
        "field": "wcCd"
      },
      {
        "title": "설비",
        "field": "eqptCd"
      },
      {
        "title": "시리얼",
        "field": "serialNo"
      },
      {
        "title": "첫 측정",
        "field": "firstAt"
      },
      {
        "title": "마지막 측정",
        "field": "lastAt"
      },
      {
        "title": "SEQ 시작 (조회일)",
        "field": "seqMin"
      },
      {
        "title": "SEQ 끝 (조회일)",
        "field": "seqMax"
      },
      {
        "title": "검사 회차",
        "field": "seqCnt"
      },
      {
        "title": "불량 회차",
        "field": "failSeqCnt"
      },
      {
        "title": "불량률",
        "field": "failRate"
      },
      {
        "title": "판정",
        "field": "passed"
      },
      {
        "title": "불량 회차 번호",
        "field": "failSeqs"
      },
      {
        "title": "LOT · 출하 예정",
        "field": "lotNo"
      },
      {
        "title": "모델",
        "field": "model"
      },
      {
        "title": "고객사",
        "field": "customer"
      },
      {
        "title": "LRR 확률",
        "field": "lrrProbability"
      },
      {
        "title": "근거",
        "field": "basis"
      }
    ]
  },
  {
    "id": "prod-daily",
    "name": "일일 생산현황 보고",
    "group": "보고서",
    "columns": [
      {
        "title": "공정/Process",
        "field": "process"
      },
      {
        "title": "이슈 항목",
        "field": "product"
      },
      {
        "title": "일목표",
        "field": "target"
      },
      {
        "title": "실적",
        "field": "qty"
      },
      {
        "title": "달성률",
        "field": "rate"
      },
      {
        "title": "주간누적",
        "field": "week"
      },
      {
        "title": "영향범위 (생산장비 대수)",
        "field": "scope"
      },
      {
        "title": "결정항목 / 기타",
        "field": "decision"
      },
      {
        "title": "기한",
        "field": "due"
      }
    ]
  },
  {
    "id": "rpt-press-morning",
    "name": "아침회의 자료 (PRESS)",
    "group": "보고서",
    "columns": [
      {
        "title": "상태",
        "field": "st"
      },
      {
        "title": "공정/Process",
        "field": "proc"
      },
      {
        "title": "이슈 항목",
        "field": "issue"
      },
      {
        "title": "일목표",
        "field": "tgt"
      },
      {
        "title": "달성률",
        "field": "rate"
      },
      {
        "title": "주간누적",
        "field": "week"
      },
      {
        "title": "영향범위 (생산장비 대수)",
        "field": "eqpt"
      },
      {
        "title": "결정항목 / 기타",
        "field": "memo"
      },
      {
        "title": "기한",
        "field": "due"
      }
    ]
  },
  {
    "id": "rpt-plating-morning",
    "name": "아침회의 자료 (Plating·Coating)",
    "group": "보고서",
    "columns": [
      {
        "title": "상태",
        "field": "st"
      },
      {
        "title": "공정/Process",
        "field": "proc"
      },
      {
        "title": "이슈 항목",
        "field": "issue"
      },
      {
        "title": "일목표",
        "field": "tgt"
      },
      {
        "title": "달성률",
        "field": "rate"
      },
      {
        "title": "주간누적",
        "field": "week"
      },
      {
        "title": "영향범위 (생산장비 대수)",
        "field": "eqpt"
      },
      {
        "title": "결정항목 / 기타",
        "field": "memo"
      },
      {
        "title": "기한",
        "field": "due"
      }
    ]
  },
  {
    "id": "rpt-ship-plan",
    "name": "연간 출하계획",
    "group": "보고서",
    "columns": [
      {
        "title": "모델",
        "field": "model"
      },
      {
        "title": "고객사",
        "field": "customer"
      },
      {
        "title": "총합계",
        "field": "total"
      },
      {
        "title": "비중",
        "field": "ratio"
      }
    ]
  },
  {
    "id": "rpt-yield-model",
    "name": "제품별 수율",
    "group": "보고서",
    "columns": [
      {
        "title": "투입 수량",
        "field": "inputQty"
      },
      {
        "title": "양품 수량",
        "field": "okQty"
      },
      {
        "title": "불량 수량",
        "field": "ngQty"
      },
      {
        "title": "불량률%",
        "field": "defectRate"
      },
      {
        "title": "수율",
        "field": "yield"
      },
      {
        "title": "불량 유형",
        "field": "label"
      },
      {
        "title": "Loss 수량",
        "field": "value"
      },
      {
        "title": "비중",
        "field": "ratio"
      }
    ]
  },
  {
    "id": "rpt-lrr-customer",
    "name": "고객사별 LRR",
    "group": "보고서",
    "columns": [
      {
        "title": "합계",
        "field": "total"
      },
      {
        "title": "고객사",
        "field": "customer"
      },
      {
        "title": "LRR(%)",
        "field": "lrrRate"
      },
      {
        "title": "출하 비중",
        "field": "shipShare"
      }
    ]
  },
  {
    "id": "chat-history",
    "name": "자연어 질의 이력",
    "group": "자연어 질의 이력",
    "columns": [
      {
        "title": "질문 시간",
        "field": "ts"
      },
      {
        "title": "질문",
        "field": "question"
      },
      {
        "title": "응답",
        "field": "answer"
      },
      {
        "title": "판단 근거",
        "field": "judgmentBasis"
      },
      {
        "title": "근거 문서",
        "field": "docs"
      },
      {
        "title": "응답 시간",
        "field": "responseSec"
      },
      {
        "title": "모델",
        "field": "llmModel"
      },
      {
        "title": "토큰",
        "field": "totalTokens"
      },
      {
        "title": "답변 상태",
        "field": "finishReason"
      },
      {
        "title": "의도",
        "field": "intentNm"
      },
      {
        "title": "평가",
        "field": "rating"
      }
    ]
  },
  {
    "id": "gloss-view",
    "name": "용어 사전 조회",
    "group": "용어 사전",
    "columns": [
      {
        "title": "공식 용어",
        "field": "term"
      },
      {
        "title": "뜻",
        "field": "definition"
      },
      {
        "title": "유사어",
        "field": "variants"
      }
    ]
  },
  {
    "id": "alert-list",
    "name": "알림 목록·상세",
    "group": "이상 알림",
    "columns": [
      {
        "title": "등급",
        "field": "level"
      },
      {
        "title": "알림 제목",
        "field": "title"
      },
      {
        "title": "대상",
        "field": "eqptCd"
      },
      {
        "title": "내용",
        "field": "desc"
      },
      {
        "title": "감지 Agent",
        "field": "agent"
      },
      {
        "title": "발생",
        "field": "occurredAt"
      },
      {
        "title": "상태",
        "field": "ackState"
      },
      {
        "title": "발송 시각",
        "field": "ts"
      },
      {
        "title": "알림 · 발송 조건",
        "field": "alertTitle"
      },
      {
        "title": "채널",
        "field": "channel"
      },
      {
        "title": "수신자",
        "field": "recipient"
      },
      {
        "title": "지연",
        "field": "delaySec"
      },
      {
        "title": "결과",
        "field": "result"
      }
    ]
  },
  {
    "id": "sys-account",
    "name": "계정 관리",
    "group": "시스템관리",
    "columns": [
      {
        "title": "아이디",
        "field": "empNo"
      },
      {
        "title": "이름",
        "field": "name"
      },
      {
        "title": "이메일",
        "field": "email"
      },
      {
        "title": "소속 부서",
        "field": "dept"
      },
      {
        "title": "직급",
        "field": "posNm"
      },
      {
        "title": "관리자",
        "field": "admin"
      },
      {
        "title": "가입 경로",
        "field": "joinSrc"
      },
      {
        "title": "초기 비밀번호",
        "field": "pwdChangeRequired"
      },
      {
        "title": "추가 메뉴",
        "field": "extraMenuIds"
      },
      {
        "title": "로그인 실패",
        "field": "loginFailCnt"
      },
      {
        "title": "최근 접속",
        "field": "lastLoginAt"
      },
      {
        "title": "부서",
        "field": "name"
      },
      {
        "title": "설명",
        "field": "desc"
      },
      {
        "title": "소속 계정",
        "field": "userCnt"
      },
      {
        "title": "메뉴 권한",
        "field": "menuCnt"
      },
      {
        "title": "데이터 권한",
        "field": "dataCnt"
      },
      {
        "title": "시각",
        "field": "ts"
      },
      {
        "title": "대상",
        "field": "target"
      },
      {
        "title": "변경 내용",
        "field": "detail"
      },
      {
        "title": "수행자",
        "field": "by"
      }
    ]
  },
  {
    "id": "sys-gw-dept",
    "name": "부서 매핑",
    "group": "시스템관리",
    "columns": [
      {
        "title": "그룹웨어 부서",
        "field": "gwDeptNm"
      },
      {
        "title": "부서",
        "field": "deptNm"
      },
      {
        "title": "메모",
        "field": "remark"
      },
      {
        "title": "수정",
        "field": "updDate"
      },
      {
        "title": "관리",
        "field": "hasRow"
      },
      {
        "title": "사번",
        "field": "empNo"
      },
      {
        "title": "이름",
        "field": "name"
      },
      {
        "title": "직위",
        "field": "posNm"
      },
      {
        "title": "상태",
        "field": "stateNm"
      },
      {
        "title": "초기 비밀번호",
        "field": "pwdChangeRequired"
      },
      {
        "title": "최근 로그인",
        "field": "lastLoginAt"
      },
      {
        "title": "관리",
        "field": "empNo"
      },
      {
        "title": "부서",
        "field": "dept"
      },
      {
        "title": "직급",
        "field": "posNm"
      },
      {
        "title": "상태",
        "field": "stateLabel"
      },
      {
        "title": "가입 경로",
        "field": "joinSrcLabel"
      },
      {
        "title": "가입 일시",
        "field": "requestedAt"
      },
      {
        "title": "부서",
        "field": "name"
      },
      {
        "title": "설명",
        "field": "desc"
      },
      {
        "title": "소속 계정",
        "field": "userCnt"
      },
      {
        "title": "메뉴 권한",
        "field": "menuCnt"
      },
      {
        "title": "데이터 권한",
        "field": "dataCnt"
      }
    ]
  },
  {
    "id": "sys-menu",
    "name": "메뉴 접근 권한",
    "group": "시스템관리",
    "columns": [
      {
        "title": "시각",
        "field": "ts"
      },
      {
        "title": "대상",
        "field": "targetLabel"
      },
      {
        "title": "변경 내용",
        "field": "detailLabel"
      },
      {
        "title": "작업자",
        "field": "byLabel"
      },
      {
        "title": "메뉴 그룹",
        "field": "group"
      },
      {
        "title": "화면",
        "field": "label"
      },
      {
        "title": "구분",
        "field": "kindLabel"
      },
      {
        "title": "개인 허용",
        "field": "grantCount"
      }
    ]
  },
  {
    "id": "sys-data",
    "name": "데이터 접근 권한",
    "group": "시스템관리",
    "columns": [
      {
        "title": "시각",
        "field": "ts"
      },
      {
        "title": "대상",
        "field": "targetLabel"
      },
      {
        "title": "변경 내용",
        "field": "detailLabel"
      },
      {
        "title": "작업자",
        "field": "byLabel"
      },
      {
        "title": "응답 데이터 이름",
        "field": "attrName"
      },
      {
        "title": "항목명(제안)",
        "field": "label"
      },
      {
        "title": "처음 발견",
        "field": "firstSeenAt"
      },
      {
        "title": "마지막 발견",
        "field": "lastSeenAt"
      },
      {
        "title": "추천 항목",
        "field": "suggest"
      },
      {
        "title": "항목",
        "field": "name"
      },
      {
        "title": "출력 화면",
        "field": "screensText"
      }
    ]
  },
  {
    "id": "alert-cond",
    "name": "이상 알림 발송 조건 관리",
    "group": "시스템관리",
    "columns": [
      {
        "title": "상태",
        "field": "on"
      },
      {
        "title": "조건명",
        "field": "name"
      },
      {
        "title": "감지 지표",
        "field": "metric"
      },
      {
        "title": "비교 · 임계값",
        "field": "threshold"
      },
      {
        "title": "지속 조건",
        "field": "duration"
      },
      {
        "title": "대상 범위",
        "field": "target"
      },
      {
        "title": "심각도",
        "field": "severity"
      },
      {
        "title": "발송 채널",
        "field": "channels"
      },
      {
        "title": "수신 그룹",
        "field": "groups"
      },
      {
        "title": "수신 인원",
        "field": "receivingCnt"
      },
      {
        "title": "유효 시간대",
        "field": "validWindow"
      },
      {
        "title": "중복 억제",
        "field": "dedupMin"
      },
      {
        "title": "판정",
        "field": "evalState"
      },
      {
        "title": "마지막 평가",
        "field": "lastEvalAt"
      },
      {
        "title": "최근 7일",
        "field": "alert7dCnt"
      }
    ]
  },
  {
    "id": "sys-recip",
    "name": "알림 수신자 관리",
    "group": "시스템관리",
    "columns": [
      {
        "title": "이름(사번)",
        "field": "label"
      },
      {
        "title": "부서",
        "field": "dept"
      },
      {
        "title": "그룹명",
        "field": "name"
      },
      {
        "title": "발송 채널",
        "field": "channelNames"
      },
      {
        "title": "유효 시간대",
        "field": "windowNm"
      },
      {
        "title": "수신 가능",
        "field": "receivableLabel"
      },
      {
        "title": "사용 조건",
        "field": "condCnt"
      },
      {
        "title": "수신자 목록",
        "field": "memberNames"
      },
      {
        "title": "상태",
        "field": "useLabel"
      },
      {
        "title": "수신 그룹",
        "field": "groupNames"
      },
      {
        "title": "이름(사번)",
        "field": "nameLabel"
      },
      {
        "title": "직급",
        "field": "posLabel"
      },
      {
        "title": "메일",
        "field": "mail"
      }
    ]
  },
  {
    "id": "sys-gloss",
    "name": "용어 사전 관리",
    "group": "시스템관리",
    "columns": [
      {
        "title": "공식 용어",
        "field": "term"
      },
      {
        "title": "뜻",
        "field": "definition"
      },
      {
        "title": "유사어",
        "field": "variants"
      },
      {
        "title": "관리",
        "field": "termId"
      },
      {
        "title": "행",
        "field": "row"
      },
      {
        "title": "추가할 유사어",
        "field": "variantsAdded"
      },
      {
        "title": "건너뛸 유사어",
        "field": "variantsSkipped"
      },
      {
        "title": "오류·안내",
        "field": "messages"
      },
      {
        "title": "시각",
        "field": "at"
      },
      {
        "title": "작업자",
        "field": "actorText"
      },
      {
        "title": "대상",
        "field": "targetText"
      },
      {
        "title": "구분",
        "field": "actionText"
      },
      {
        "title": "변경 전",
        "field": "beforeText"
      },
      {
        "title": "변경 후",
        "field": "afterText"
      }
    ]
  },
  {
    "id": "sys-audit",
    "name": "보안 감사 로그",
    "group": "시스템관리",
    "columns": [
      {
        "title": "원천",
        "field": "src"
      },
      {
        "title": "보관 중",
        "field": "totalCnt"
      },
      {
        "title": "경과(대기)",
        "field": "expiredCnt"
      },
      {
        "title": "아카이브",
        "field": "archivedCnt"
      },
      {
        "title": "가장 오래된 기록",
        "field": "oldestAt"
      },
      {
        "title": "시각",
        "field": "ts"
      },
      {
        "title": "유형",
        "field": "type"
      },
      {
        "title": "계정",
        "field": "empNo"
      },
      {
        "title": "이름",
        "field": "name"
      },
      {
        "title": "부서",
        "field": "dept"
      },
      {
        "title": "대상",
        "field": "target"
      },
      {
        "title": "처리 결과",
        "field": "result"
      },
      {
        "title": "비고",
        "field": "detail"
      }
    ]
  },
  {
    "id": "sys-dl",
    "name": "보고서 다운로드 이력",
    "group": "시스템관리",
    "columns": [
      {
        "title": "일시",
        "field": "ts"
      },
      {
        "title": "계정",
        "field": "empNo"
      },
      {
        "title": "이름",
        "field": "name"
      },
      {
        "title": "부서",
        "field": "dept"
      },
      {
        "title": "보고서",
        "field": "report"
      },
      {
        "title": "화면",
        "field": "menuId"
      },
      {
        "title": "형식",
        "field": "format"
      },
      {
        "title": "범위",
        "field": "scopeCd"
      },
      {
        "title": "조회 조건",
        "field": "condSummary"
      },
      {
        "title": "행 수",
        "field": "rowCnt"
      },
      {
        "title": "blind 항목",
        "field": "blindCnt"
      },
      {
        "title": "출처",
        "field": "origin"
      }
    ]
  },
  {
    "id": "sys-upload-doc",
    "name": "업로드 문서 목록",
    "group": "시스템관리",
    "columns": [
      {
        "title": "문서명",
        "field": "title"
      },
      {
        "title": "최신 버전",
        "field": "latestVersion"
      },
      {
        "title": "버전 수",
        "field": "versionCnt"
      },
      {
        "title": "최초 등록자",
        "field": "createdByName"
      },
      {
        "title": "최근 업로더",
        "field": "updatedByName"
      },
      {
        "title": "최근 업로드",
        "field": "updatedAt"
      },
      {
        "title": "크기",
        "field": "sizeBytes"
      },
      {
        "title": "파싱 상태",
        "field": "parseState"
      }
    ]
  },
  {
    "id": "sys-sync",
    "name": "데이터 연동 이력",
    "group": "시스템관리",
    "columns": [
      {
        "title": "실행 ID",
        "field": "runId"
      },
      {
        "title": "방식",
        "field": "modeNm"
      },
      {
        "title": "시작",
        "field": "startedAt"
      },
      {
        "title": "소요",
        "field": "durationSec"
      },
      {
        "title": "대상 테이블",
        "field": "tableCnt"
      },
      {
        "title": "성공",
        "field": "successCnt"
      },
      {
        "title": "실패",
        "field": "failCnt"
      },
      {
        "title": "이관 행수",
        "field": "okRows"
      },
      {
        "title": "상태",
        "field": "stateNm"
      },
      {
        "title": "메모",
        "field": "message"
      },
      {
        "title": "작업 ID",
        "field": "jobId"
      },
      {
        "title": "원본 (MSSQL)",
        "field": "srcTable"
      },
      {
        "title": "대상 (PostgreSQL)",
        "field": "dstTable"
      },
      {
        "title": "방식",
        "field": "kind"
      },
      {
        "title": "소요",
        "field": "duration"
      },
      {
        "title": "대상 건수",
        "field": "rows"
      },
      {
        "title": "성공",
        "field": "okRows"
      },
      {
        "title": "실패",
        "field": "ngRows"
      },
      {
        "title": "발견 위치",
        "field": "side"
      },
      {
        "title": "구분",
        "field": "kind"
      },
      {
        "title": "테이블",
        "field": "objectName"
      },
      {
        "title": "이관 정의",
        "field": "mapId"
      },
      {
        "title": "최초 발견",
        "field": "firstSeenAt"
      },
      {
        "title": "최종 발견",
        "field": "lastSeenAt"
      },
      {
        "title": "발견",
        "field": "detectCnt"
      },
      {
        "title": "기준 컬럼",
        "field": "keyColumns"
      },
      {
        "title": "주기",
        "field": "schedule"
      },
      {
        "title": "순번",
        "field": "rowNo"
      },
      {
        "title": "오류 코드",
        "field": "code"
      },
      {
        "title": "메시지",
        "field": "message"
      },
      {
        "title": "원본 키",
        "field": "srcKey"
      }
    ]
  },
  {
    "id": "sys-chat-history",
    "name": "전사 자연어 질의 이력",
    "group": "시스템관리",
    "columns": [
      {
        "title": "세션 시작",
        "field": "startedAt"
      },
      {
        "title": "부서·사용자",
        "field": "name"
      },
      {
        "title": "질의 수",
        "field": "questionCnt"
      },
      {
        "title": "첫 질문",
        "field": "firstQuestion"
      },
      {
        "title": "마지막 질의",
        "field": "lastAskedAt"
      },
      {
        "title": "응답",
        "field": "answeredCnt"
      },
      {
        "title": "평가 요약",
        "field": "usefulCnt"
      },
      {
        "title": "검토",
        "field": "reviewedCnt"
      },
      {
        "title": "사용자",
        "field": "userLabel"
      },
      {
        "title": "질문",
        "field": "question"
      },
      {
        "title": "답변",
        "field": "answer"
      },
      {
        "title": "판단 근거",
        "field": "judgmentBasis"
      },
      {
        "title": "미응답 사유",
        "field": "unansweredReason"
      },
      {
        "title": "사용자 평가",
        "field": "ratingText"
      },
      {
        "title": "검토",
        "field": "reviewText"
      },
      {
        "title": "질문 시간",
        "field": "ts"
      },
      {
        "title": "답변 시간",
        "field": "answeredAt"
      },
      {
        "title": "응답 시간",
        "field": "responseSec"
      },
      {
        "title": "모델",
        "field": "llmModel"
      },
      {
        "title": "토큰",
        "field": "totalTokens"
      },
      {
        "title": "답변 상태",
        "field": "finishText"
      },
      {
        "title": "의도",
        "field": "intentNm"
      },
      {
        "title": "답변 추가(학습 데이터)",
        "field": "trainAnswer"
      }
    ]
  }
];

/**
 * 화면(메뉴)마다 코드가 읽는 낙타 표기 이름 — 표 열 밖(카드 · 차트 · 요약 · 엑셀)에서 쓰는 응답 필드명을 찾는 데 씁니다.
 * 응답 필드명이 아닌 이름(함수 · 상태 이름)도 섞여 있습니다. 항목 표의 필드명과 맞춰 본 것만 의미가 있습니다.
 */
export const SCREEN_USES = [{"id":"ai-chat","name":"덕반장 AI","group":"AI 어시스턴트","keys":["abort","aborted","actions","add","agent","agents","amber","answer","answerExportAvailable","answerHtml","arrowRight","assistant","avatarSm","avatarSmText","bad","blindColumns","blindFields","blinded","blocks","body","bodySm","border","briefing","bubble","bubbleDeny","bubbleMe","bubbleMeText","bubbleText","bubbleUnknown","button","caption","card","catch","center","chart","chatRoute","chatSession","chips","chunkId","cited","color","contentColumn","current","data","dataEvidence","defectTopRange","denied","dept","destructive","divider","doc","docDate","docId","docs","done","download","elapsedMs","emptyText","error","filter","find","forEach","foreground","format","from","fromEntries","general","generatedAt","getDate","getDay","getFullYear","getItem","getMonth","good","head","heading2xs","headingLg","headingXs","hidden","history","idle","includes","intent","interrupted","isComposing","join","key","kind","label","labels","left","length","limit","line","lines","llm","loading","localKey","localStorage","manualContext","map","match","max","message","messageId","messages","metrics","min","modelVer","msg","msgMe","mutedForeground","name","nativeEvent","none","now","num","number","object","page","patch","plus","prev","preventDefault","primary","primaryForeground","push","query","radius","radiusAction","radiusSm","rag","range","react","red","relative","removeItem","replace","right","row","rows","scrollToEnd","searching","series","servingModelVer","sessionId","setItem","shiftKey","signal","slice","snippet","some","sort","source","sourceText","sources","spacer","sparkles","split","status","streaming","string","success","successTint","suggestions","surface","surfaceHover","table","test","text","then","thumbsDown","thumbsUp","title","toFixed","toast","tone","transparent","trim","type","undefined","unitRange","unknown","user","userInfo","waiting","warning","who","wrap","xlsx"]},{"id":"dash-ai","name":"AI 통합 대시보드","group":"대시보드","keys":["accept","action","actionHeader","actionSection","actionText","actionTitle","activity","actual","add","addEventListener","alert","alpha","amber","analyzedAt","appendChild","asc","availableEquipments","avgDefectRate","await","backgroundColor","bar","barData","basis","body","bold","border","bottom","bottomHelp","briefing","briefingLoading","bucket","button","can","canAttr","canWrite","catch","cause","causeLoading","cell","cellRateText","cells","center","change","chart","classification","click","col","color","columns","composition","container","contributions","countSeries","create","createElement","current","currentTarget","danger","dark","data","dataRow","date","dateCol","dateText","defectRate","defectTrendData","defectType","defectTypeCd","denominator","dept","destructive","display","divider","doc","docId","donut","down","download","downloadUploadFile","droppedCnt","duplicateOf","empty","eqpt","eqptCd","eqptNm","error","errors","evidence","file","fileName","files","filter","filters","find","firstAt","fixed","flatMap","flex","flip","focus","forEach","forQuery","foreground","from","generatedAt","get","getBoundingClientRect","getState","getValue","ghost","grid","group","grouped","hairline","has","headerRow","heatCell","heatmap","helpText","hidden","html","idleAI","includes","info","inherit","innerPath","innerWidth","input","inputQty","insUsers","iotState","isArray","isDark","isInteger","isNaN","isUntyped","italic","item","itemCds","itemCount","items","join","key","keys","kind","label","labelWithBadge","labels","lastAt","latestVersion","left","legend","legendBox","legendItem","legendRow","legendText","length","line","lineProduction","lines","loadUploadData","loadUploadDocs","loadUploadVersions","loading","location","lotCount","map","masked","masterRemark","matrixTitle","max","memo","message","metricCard","metricLabel","metricSubText","metricUnit","metricValue","metrics","metricsGrid","min","mode","model","modelVer","mold","muted","mutedForeground","name","names","nativeEvent","next","nextSlot","ngQty","none","normalizeRange","num","numerator","okQty","omittedCnt","openModal","openxmlformats","outline","page","parseState","patch","path","periodFrom","periodTo","pivotMatrix","plan","planActual","plant","plantNm","plus","pointer","prescriptions","primary","primaryDefect","printer","processIds","processYield","product","productEtcCnt","productNm","progressRate","push","qty","qualityIndex","quote","quotes","rank","ratio","rawQty","react","reason","recordCount","ref","refresh","relativePath","reload","remarks","remove","removeEventListener","replace","report","requested","resolve","right","row","rowGap6","rows","scrollContainer","search","seen","segments","segs","selectedEqptCd","series","seriesAt","set","sheet","sheets","size","sizeBytes","slice","slot","slotCol","slotLabel","some","spark","spreadsheetml","standard","static","string","stringify","strong","style","success","summary","summaryCol","summaryRateText","surface","table","tableWrapper","target","targetDate","targetQty","targets","tdCell","test","text","textDim","textMuted","textSm","textXs","textarea","thCell","thText","then","threshold","title","titleInfo","toLocaleString","toast","todayQty","tone","top","topInfoRow","total","transparent","trend","trim","type","undefined","unit","unitLabel","untyped","upload","uploadNewDoc","uploadNewVersion","uploadedAt","uploadedBy","uploadedByName","uptimeRate","useFlg","userInfo","value","values","verified","version","versionCnt","warnings","web","where","width","workcenter","wrap","xlsm","xlsx","yield"]},{"id":"dash-proc","name":"공정 및 제품 대시보드","group":"대시보드","keys":["abs","all","alpha","applied","auto","bad","baseline","byDefects","byRate","canData","card","center","code","color","compareKey","data","defect","defectRate","download","endsWith","error","eyebrow","filter","filters","floor","from","fromEntries","getData","getElementById","getRow","getState","hairline","has","heading2xs","incompleteProcesses","incompleteProducts","info","input","layout","length","loading","map","max","message","metricColumns","min","missing","mutedForeground","nativeEvent","next","ngQty","normalizeRange","number","okQty","patch","period","periods","plaintext","primary","process","processId","processes","productNm","products","qty","quick","react","refresh","right","round","row","scrollIntoView","search","slice","smooth","some","spark","start","stringify","summary","surface","textSm","textXs","toLocaleString","toast","undefined","unit","unitRange","warning","width","wrap","yieldRate"]},{"id":"prod-monitor","name":"생산 모니터링","group":"대시보드","keys":["absolute","background","center","color","dashed","defectQty","defectRate","divider","download","eqptCd","eqptNm","equipments","equipmentsMeta","every","find","foreground","getHours","getMinutes","getSeconds","hairline","isDummy","items","label","lastCollectedAt","lastUpdated","layoutWidth","length","map","metrics","model","mutedForeground","name","padStart","page","paging","params","parseInt","position","primary","qty","radius","react","refresh","relative","row","settings","size","slice","solid","state","status","strokeCount","strokeSpeed","summary","surface","tail","targetDate","textXs","toLocaleString","toast","total","uptimeRate","yieldRate"]},{"id":"prod-result","name":"실적 집계·조회","group":"생산 및 품질 관리","keys":["abs","all","alpha","applied","area","auto","background","bandwidth","block","border","bottom","center","color","curve","curveMonotoneX","d3AreaGrad","defectRate","defined","domain","download","end","filter","foreground","from","inputQty","isArray","isDark","items","label","labels","layout","left","legend","legendText","length","line","map","max","middle","mutedForeground","nativeEvent","ngQty","nice","none","outline","padding","pointer","primary","qty","range","rate","react","relative","results","resultsMeta","right","round","row","rowGap6","scaleBand","scaleLinear","seriesAt","slice","some","start","success","summary","textXs","ticks","toFixed","toLocaleString","toast","top","touch","transparent","trend","unit","val","width","wrap","xlsx"]},{"id":"qc-defect","name":"불량 현황 조회","group":"생산 및 품질 관리","keys":["all","byType","canAttr","canData","center","children","cnt","color","defect","defectCd","defectNm","defectRate","defectType","desc","destructive","download","eqpt","eqptCd","eqptNm","exportBody","field","filter","from","get","getState","getValue","isFinite","item","itemCd","itemNm","items","join","key","label","length","level","levelLabel","map","max","mono","mutedForeground","ngQty","number","okQty","outline","plantNm","primary","rate","ratio","react","right","root","summary","toast","totalQty","totals","typeRows","unclassified","value","wcCd","wcNm","xlsx"]},{"id":"qc-aoi","name":"AOI 판정 분석","group":"생산 및 품질 관리","keys":["actual","add","all","alpha","amber","aoiDefectGrid","available","bad","band","bandHigh","bandLow","baseAvg","baseWeeks","basic","basis","bind","body","borderlineRange","button","byText","canData","caption","capturedAt","cavity","ceil","center","change","chevronLeft","chevronRight","clipboard","color","cols","confidence","contain","copy","cover","current","currentRate","customer","date","dateTime","dbo","defectId","defectType","defects","description","destructive","divider","download","drift","emptyText","entries","eqptCd","eqptNm","equipRisk","estimated","etaLabel","exportExcel","faiNos","failRate","failSeqCnt","failSeqs","features","fieldLabel","filter","find","firstAt","flatMap","forEach","foreground","from","get","getData","getDate","getFullYear","getHours","getMonth","getValue","green","hairlineStrong","has","heading2xs","hidden","horizonHours","image","imageCnt","imageId","images","includes","indexOf","info","isArray","isFinite","items","join","judgedAt","key","kvVal","labels","lastAt","length","level","limitBasis","limitations","lotNo","lotRisk","lower","lrrProbability","mainFactor","map","max","measuredAt","measurements","message","meta","metrics","model","mono","muted","mutedForeground","name","nasPath","ngQty","note","nowrap","num","number","object","okQty","openModal","padStart","page","paging","partial","passed","plus2h","plus8h","primary","processId","processNm","push","radiusSm","radiusXs","react","recommendation","red","refresh","remaining","replace","residualSd","right","risk","round","row","sampleCnt","sampleQty","seq","seqCnt","seqMax","seqMin","serialKey","serialNo","set","setDate","shift","shipDue","size","sizeBytes","slice","slopePerHour","some","sort","source","spacer","spec","split","splitIndex","state","string","strong","success","summary","surface","tabulator","tag","textSm","textXs","threshold","thresholdEta","thumbUrl","title","toFixed","toast","today","total","trainPeriod","transparent","type","undefined","upper","url","validation","value","valueCols","viol","violFais","warn","watch","wcCd","weeks","wrap","writeText"]},{"id":"prod-daily","name":"일일 생산현황 보고","group":"보고서","keys":["alpha","amber","auto","bad","baseDate","baseline","border","canData","center","color","dashed","decision","destructive","dotted","download","dri","due","entries","eqptCnt","filters","foreground","from","getTime","green","idleCnt","isFinite","isNaN","join","key","keys","kvVal","label","left","length","level","line","map","message","muted","mutedForeground","name","ngQty","noTargetCnt","normal","num","numeric","prev","primary","process","processCds","processes","product","productCnt","productNm","provisional","qty","rate","react","relative","replace","round","row","rowGap6","rows","save","savedTarget","scope","slice","state","success","target","targetInput","targetOrigin","targetRef","test","textXs","toast","tone","totals","trim","underline","warn","warning","watch","week","weekDays","weekQty","weekRate","weekTarget","weekTargetQty","window","wrap","xlsCellText","xlsLeft","xlsNum"]},{"id":"rpt-press-morning","name":"아침회의 자료 (PRESS)","group":"보고서","keys":["act","bad","baseDate","canData","center","color","dayActual","dayTarget","decision","dept","destructive","download","dri","due","eqpt","find","foreground","getDay","getTime","impactEqptCnt","isNaN","issue","join","key","label","left","length","line","map","memo","name","press","primary","printer","proc","process","processCds","processCnt","processId","processScope","rate","rateProcessCnt","react","replace","report","round","row","rows","slice","sourceText","state","success","summary","textXs","tgt","toast","tone","underline","userInfo","value","warn","warning","warningText","week","weekActual","weekRate","weekTarget","wrap","xlsCellText","xlsNum"]},{"id":"rpt-plating-morning","name":"아침회의 자료 (Plating·Coating)","group":"보고서","keys":["aPlating","act","bPlating","bad","baseDate","canData","center","coating","color","dayActual","dayTarget","decision","dept","destructive","download","dri","due","eqpt","filter","foreground","getDay","getTime","impactEqptCnt","includes","isNaN","issue","join","key","label","left","length","line","map","memo","primary","printer","proc","process","processCds","processCnt","processId","processScope","rate","rateProcessCnt","react","replace","round","row","rows","slice","sourceText","state","success","summary","textXs","tgt","toast","tone","underline","userInfo","warn","warning","warningText","week","weekActual","weekRate","weekTarget","wrap","xlsCellText","xlsNum"]},{"id":"rpt-ship-plan","name":"연간 출하계획","group":"보고서","keys":["amount","bar","canData","customer","customerCd","customerCnt","dept","divider","download","find","forEach","grandTotal","group","headingXs","includes","left","length","map","max","model","modelCd","modelCnt","modelSum","monthTotals","monthly","monthlyTotal","months","num","peakMonth","planAmount","planQty","planYear","primary","printer","push","ratio","react","reduce","replace","right","rows","slice","sort","sourceText","toast","total","unit","userInfo","values"]},{"id":"rpt-yield-model","name":"제품별 수율","group":"보고서","keys":["bad","bar","bind","canData","center","color","csv","date","defectRate","dept","down","download","filter","foreground","inputQty","label","left","length","loss","lossTotals","lossTypes","map","mgmt","mgmtTotals","mgmtTypes","model","modelCd","ngQty","num","okQty","page","paging","params","primary","printer","processId","ratio","react","reduce","right","rows","rowsMeta","setSize","size","slice","sort","sourceText","summary","target","textXs","toast","total","totalLoss","totalMgmt","userInfo","value","warn","xls","yearMonth","yield"]},{"id":"rpt-lrr-customer","name":"고객사별 LRR","group":"보고서","keys":["baseYear","byCustomer","byCustomerMonth","byDefectType","canData","cells","cnt","customer","customerCd","dept","down","download","filter","get","label","left","length","lrrCnt","lrrQty","lrrRate","map","new","num","period","periods","primary","printer","react","reduce","right","rows","shipQty","shipShare","slice","sort","sourceText","summary","textXs","toast","total","underline","unit","userInfo","yoyImprovement"]},{"id":"rpt-scrap","name":"폐기 보고서","group":"보고서","keys":["alpha","blue","border","center","color","data","defectNote","download","filter","filters","foreground","from","includes","join","keepYears","kinds","length","map","model","modelNm","models","muted","mutedForeground","occurFrom","occurRange","occurTo","primary","processNm","processes","qty","react","relative","remark","remarks","row","rowGap6","slice","string","textXs","toast","totalQty","voucherCnt","warning","wrap"]},{"id":"chat-history","name":"자연어 질의 이력","group":"자연어 질의 이력","keys":["actions","active","alpha","amber","answer","answerHidden","answerHiddenReason","answerRate","answered","askedAt","avgElapsedSec","avgResponseSec","bad","badCnt","bind","border","caption","card","center","code","color","column","completionTokens","current","docCnt","docs","down","download","empNo","entries","error","errors","evidenceSummary","expiredCnt","fetchChatSession","filter","finishReason","focus","forEach","from","get","getData","getRows","good","green","groups","hairline","includes","intentNm","isArray","items","join","judgmentBasis","keyword","lastAskedAt","length","link","list","listMeta","llmModel","loadChatHistory","map","message","messageId","metrics","mine","mono","num","page","pages","paging","params","primary","promptTokens","push","question","questionCnt","radiusSm","rateChatMessage","rating","reAskRate","react","replace","requeryRate","responseSec","retentionDays","review","reviewedCnt","right","row","score","session","sessionCnt","sessionKey","set","setParams","size","slice","startedAt","stretch","string","summary","targetAccuracy","targetAnswerRate","targetAnswerRatePct","textSm","textXs","thumbsDown","thumbsUp","title","toFixed","toLocaleString","toast","total","totalCnt","totalTokens","transparent","trim","turns","unansweredReason","usefulCnt","userInfo","values","xlsx"]},{"id":"gloss-view","name":"용어 사전 조회","group":"용어 사전","keys":["appliedKeyword","basic","blinded","body","byName","can","canWrite","caption","catch","chips","code","color","column","current","definition","entries","error","errors","eyebrow","fetchTermDetail","filter","find","foreground","fromList","getData","getRow","getValue","items","join","keyword","lastChangedAt","length","link","loadAllTerms","loadGlossaryRead","map","message","muted","primary","push","react","relatedTerms","replace","row","setParams","slice","stretch","string","strong","summary","tag","term","termCnt","termId","terms","termsMeta","then","toLocaleString","toast","total","trim","updatedAt","variantCnt","variantId","variants","word","xlsx"]},{"id":"alert-list","name":"알림 목록·상세","group":"이상 알림","keys":["ackAt","ackBy","ackNote","ackState","agent","alertId","alertTitle","amber","basisValue","bind","blue","can","cause","causeCandidates","center","channel","color","condId","condNm","counts","current","defectCd","delaySec","desc","destructive","download","elapsed","eqptCd","eqptNm","equipments","evidence","external","failReason","fieldLabel","filter","find","green","includeTest","includes","isArray","itemCd","items","join","kvVal","length","level","levelNm","list","listMeta","lotNo","mainDefectType","map","message","metricDesc","moldCd","name","new","num","occurredAt","openModal","page","paging","params","path","period","primary","processId","react","read","reasonNm","recentHistory","recipient","recommendation","red","result","right","row","rowGap6","screenId","sendId","sendLogs","serialNo","setParams","settings","size","slice","some","sort","sourceText","state","string","stringify","target","test","textSm","textXs","threshold","title","toLocaleString","toUpperCase","toast","total","trim","true","type","unread","wrap"]},{"id":"daily-history","name":"이전 보고서","group":"보고서","keys":["alert","file","react","textSm"]}];

/**
 * 화면(메뉴)마다 표 밖 값 이름의 이름표 — 카드 label · 차트 계열 name 등(가장 가까운 한글 이름표).
 * maps — 유형별 열 묶음 이름 → 가리기 판정 이름(예: loss → ngQty).
 * 「새로 발견된 응답 데이터」 가 제안 항목명 · 추천 항목으로 씁니다.
 */
export const SCREEN_LABELS = [{"id":"dash-ai","name":"AI 통합 대시보드","labels":{"analyzedAt":"AI 공정 원인 분석 및 처방 권고","defectRate":"금일 불량률","droppedCnt":"AI 공정 원인 분석 및 처방 권고","eqpt":"설비","generatedAt":"AI 일일 품질·생산 종합 브리핑","getValue":"불량 수량","iotState":"IoT 통신 상태","length":"엑셀 다운로드","masked":"엑셀 다운로드","mold":"장착 금형","name":"파일","plant":"공장","product":"제품","qty":"금일 생산량","size":"파일","standard":"AI 불량 판단 기준","threshold":"엑셀 다운로드","title":"문서","todayQty":"총 생산 수량","uptimeRate":"가동률"}},{"id":"dash-proc","name":"공정 및 제품 대시보드","labels":{"code":"이 제품 상세 보기","defectRate":"불량률","from":"시작일","length":"엑셀 다운로드","map":"불량률","processId":"이 공정 조회","to":"종료일","unit":"집계 단위"}},{"id":"prod-monitor","name":"생산 모니터링","labels":{"lastUpdated":"업데이트","strokeCount":"타발 수","targetDate":"기준일"}},{"id":"prod-result","name":"실적 집계·조회","labels":{"from":"시작일","to":"종료일"}},{"id":"qc-defect","name":"불량 현황 조회","labels":{"from":"시작일","getValue":"비중","max":"비중","ngQty":"불량 수량","to":"종료일"}},{"id":"qc-aoi","name":"AOI 판정 분석","labels":{"actual":"실측 불량률 (%)","bandHigh":"95% 밴드 상한 (%)","bandLow":"95% 밴드 하한 (%)","currentRate":"AOI 설비별 위험 예측","eqptCd":"AOI 설비별 위험 예측","eqptNm":"AOI 설비별 위험 예측","estimated":"추정 중앙값 (%)","etaLabel":"AOI 설비별 위험 예측","exportExcel":"불량 목록 엑셀","getData":"시리얼","getValue":"일평균 대비 증감률","mainFactor":"AOI 설비별 위험 예측","map":"AOI 설비별 위험 예측","nasPath":"경로 복사","plus2h":"AOI 설비별 위험 예측","plus8h":"AOI 설비별 위험 예측","recommendation":"AOI 설비별 위험 예측","seqCnt":"검사 회차"}},{"id":"prod-daily","name":"일일 생산현황 보고","labels":{"length":"엑셀 다운로드"}},{"id":"rpt-press-morning","name":"아침회의 자료 (PRESS)","labels":{"baseDate":"기준일","length":"인쇄 · PDF","processScope":"공정","state":"상태"}},{"id":"rpt-plating-morning","name":"아침회의 자료 (Plating·Coating)","labels":{"baseDate":"기준일","length":"인쇄 · PDF","processScope":"공정","state":"상태"}},{"id":"rpt-ship-plan","name":"연간 출하계획","labels":{"customerCd":"고객사","customerCnt":"고객사 수","grandTotal":"최다 출하 월","length":"인쇄 · PDF","modelCd":"모델","modelCnt":"모델 수","peakMonth":"최다 출하 월","planYear":"계획 연도","toast":"전체","unit":"단위"}},{"id":"rpt-yield-model","name":"제품별 수율","labels":{"inputQty":"총 투입수량","length":"제품별 수율","modelCd":"모델","ngQty":"총 불량수량","okQty":"총 양품수량","processId":"공정","rows":"제품별 수율","yearMonth":"기준 월","yield":"전체 수율"},"maps":{"loss":"ngQty","mgmt":"ngQty"}},{"id":"rpt-lrr-customer","name":"고객사별 LRR","labels":{"baseYear":"기준 연도","byCustomer":"고객사","customer":"고객사","customerCd":"고객사","filter":"고객사","length":"고객사별 LRR","lrrCnt":"LRR 건수","map":"고객사","unit":"집계 단위","yoyImprovement":"전년 대비 개선폭"}},{"id":"rpt-scrap","name":"폐기 보고서","labels":{"DEFECT":"- 공정불량","defectNote":"불량내용","keepYears":"보존기한","kinds":"- 공정불량","length":"▶ 폐기 사유","map":"▶ 폐기 사유","modelNm":"모델명","models":"▶ 주요 모델별 발생수량","occurRange":"제조일자","OTHER":"- 그 밖 (불용 재고 · Loss)","processNm":"발생공정","remarks":"▶ 폐기 사유","slice":"▶ 폐기 사유","voucherCnt":"엑셀 다운로드"}},{"id":"chat-history","name":"자연어 질의 이력","labels":{"answered":"응답","answerHidden":"응답","answerRate":"답변율","avgElapsedSec":"평균 응답","from":"시작일","keyword":"검색","messageId":"유용","rating":"평가","reAskRate":"재질의율","sessionKey":"대화","to":"종료일","totalCnt":"질의 건수"}},{"id":"gloss-view","name":"용어 사전 조회","labels":{"blinded":"공식 용어","getData":"공식 용어","getRow":"공식 용어","getValue":"유사어","keyword":"검색","map":"용어 사전","slice":"용어 사전","termCnt":"공식 용어","variantCnt":"유사어"}},{"id":"alert-list","name":"알림 목록·상세","labels":{"ackState":"상태","agent":"이상 알림 목록","basisValue":"이상 알림 목록","defectCd":"내용","eqptCd":"이상 알림 목록","equipments":"설비","filter":"내용","itemCd":"내용","length":"엑셀 다운로드","level":"이상 알림 목록","lotNo":"내용","map":"이상 알림 목록","occurredAt":"이상 알림 목록","period":"기간","target":"설비","threshold":"이상 알림 목록","type":"심각도"}}];
