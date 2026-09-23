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
        "title": "단계",
        "field": "stageNm"
      },
      {
        "title": "대기",
        "field": "waitMin"
      },
      {
        "title": "대상 등급",
        "field": "severityFilter"
      },
      {
        "title": "전달 대상",
        "field": "targetGroupNm"
      },
      {
        "title": "대기 건수",
        "field": "pendingCnt"
      },
      {
        "title": "비고",
        "field": "note"
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
        "title": "승격",
        "field": "escLevel"
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
        "title": "신청 부서",
        "field": "dept"
      },
      {
        "title": "직급",
        "field": "posNm"
      },
      {
        "title": "소속 부서",
        "field": "dept"
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
        "title": "약칭",
        "field": "abbr"
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
    "id": "sys-menu",
    "name": "메뉴 접근 권한",
    "group": "시스템관리",
    "columns": [
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
      }
    ]
  },
  {
    "id": "sys-data",
    "name": "데이터 접근 권한",
    "group": "시스템관리",
    "columns": [
      {
        "title": "데이터 항목",
        "field": "name"
      },
      {
        "title": "포함 데이터",
        "field": "desc"
      },
      {
        "title": "이 화면에 보이는 열",
        "field": "title"
      },
      {
        "title": "가리기",
        "field": "hide"
      },
      {
        "title": "종류",
        "field": "kind"
      },
      {
        "title": "같은 값이 보이는 다른 화면",
        "field": "also"
      },
      {
        "title": "종류",
        "field": "name"
      },
      {
        "title": "가리는 값",
        "field": "values"
      }
    ]
  },
  {
    "id": "alert-cond",
    "name": "이상 알림 발송 조건 관리",
    "group": "시스템관리",
    "columns": [
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
        "title": "유효 시간대",
        "field": "validWindow"
      },
      {
        "title": "중복 억제",
        "field": "dedupMin"
      },
      {
        "title": "상태",
        "field": "on"
      }
    ]
  },
  {
    "id": "sys-recip",
    "name": "알림 수신자 관리",
    "group": "시스템관리",
    "columns": [
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
        "title": "야간",
        "field": "night"
      },
      {
        "title": "멤버",
        "field": "memberCnt"
      },
      {
        "title": "구성원",
        "field": "memberNames"
      },
      {
        "title": "수신 그룹",
        "field": "groupNames"
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
        "title": "직급",
        "field": "posLabel"
      },
      {
        "title": "메일",
        "field": "mail"
      },
      {
        "title": "휴대전화",
        "field": "hp"
      },
      {
        "title": "메신저",
        "field": "messenger"
      },
      {
        "title": "상태",
        "field": "stateLabel"
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
        "title": "분류",
        "field": "domain"
      },
      {
        "title": "유사어 (등록자)",
        "field": "variants"
      },
      {
        "title": "관리",
        "field": "termId"
      }
    ]
  },
  {
    "id": "chat-history",
    "name": "자연어 질의 이력",
    "group": "시스템관리",
    "columns": [
      {
        "title": "시각",
        "field": "ts"
      },
      {
        "title": "질의",
        "field": "question"
      },
      {
        "title": "해석된 의도",
        "field": "intentNm"
      },
      {
        "title": "호출 Agent",
        "field": "agents"
      },
      {
        "title": "응답 시간",
        "field": "responseSec"
      },
      {
        "title": "사용자",
        "field": "name"
      },
      {
        "title": "평가",
        "field": "rating"
      }
    ]
  },
  {
    "id": "sys-audit",
    "name": "보안 감사 로그",
    "group": "시스템관리",
    "columns": [
      {
        "title": "시각",
        "field": "ts"
      },
      {
        "title": "유형",
        "field": "type"
      },
      {
        "title": "대상",
        "field": "target"
      },
      {
        "title": "사용자 그룹",
        "field": "dept"
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
        "field": "reportId"
      },
      {
        "title": "형식",
        "field": "format"
      },
      {
        "title": "대상 범위",
        "field": "scope"
      },
      {
        "title": "행 수",
        "field": "rowCnt"
      },
      {
        "title": "blind 항목",
        "field": "blindCnt"
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
      }
    ]
  }
];
