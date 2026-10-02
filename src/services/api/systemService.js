/**
 * 시스템관리 서비스 — API 107건
 *
 * 각 함수는 파라미터 객체 하나만 받습니다.
 * 경로 변수({param})는 이름이 같은 키에서 자동으로 채워지고, 나머지는
 * GET/DELETE 는 쿼리스트링, POST/PUT/PATCH 는 요청 바디로 전달됩니다.
 *
 * 사용 예)
 *   const res = await dashboardService.getDashboardAiSummary({ date: '2026-08-28' });
 *   if (res.success) setSummary(res.data);
 */
import { request } from './client';

/* ───────── 계정 관리 ───────── */

/**
 * 계정 관리 요약
 *
 * `GET /api/v1/system/accounts/summary`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} userCnt{active,suspended}, deptCnt, switchableCnt, currentUser{}
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 2
 */
export function getSystemAccountsSummary(params) {
  return request('getSystemAccountsSummary', params);
}

/**
 * 계정 목록 조회
 *
 * `GET /api/v1/system/users`
 * @param {object} params keyword, deptId, state, page, size
 * @returns {Promise<object>} items[{empNo,name,dept,pos,state,lastLoginAt,demo}], meta
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 1
 */
export function getSystemUsers(params) {
  return request('getSystemUsers', params);
}

/**
 * 계정 등록
 *
 * `POST /api/v1/system/users`
 * @param {object} params empNo, name, deptId, pos, state, switchable, extraMenuIds
 * @returns {Promise<object>} empNo
 * @remarks 검증: 필수값·아이디 중복. 부서 권한 자동 상속
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 1
 */
export function postSystemUsers(params) {
  return request('postSystemUsers', params);
}

/**
 * 계정 수정
 *
 * `PUT /api/v1/system/users/{empNo}`
 * @param {object} params empNo, name, deptId, pos, state, switchable, extraMenuIds
 * @returns {Promise<object>} success
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 1
 */
export function putSystemUsersByEmpNo(params) {
  return request('putSystemUsersByEmpNo', params);
}

/**
 * 계정 삭제
 *
 * `DELETE /api/v1/system/users/{empNo}`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} success
 * @remarks 제약: 로그인 계정 삭제 불가. 감사·다운로드 이력은 보존
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 1
 */
export function deleteSystemUsersByEmpNo(params) {
  return request('deleteSystemUsersByEmpNo', params);
}

/**
 * 계정 삭제 사전 확인 (2026-10-01 ACC-11)
 *
 * `GET /api/v1/system/users/{empNo}/delete-check`
 * @param {object} params empNo
 * @returns {Promise<object>} deletable, blocking{servingProfiles,docs}, cascade{recipients,menuGrants,usage}, joinSrc
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 2
 */
export function getSystemUsersByEmpNoDeleteCheck(params) {
  return request('getSystemUsersByEmpNoDeleteCheck', params);
}

/**
 * 계정 사용/정지
 *
 * `PATCH /api/v1/system/users/{empNo}/state`
 * @param {object} params state(ACTIVE|SUSPENDED), reason?(정지 사유), resetPassword?(잠금 해제 시 비밀번호 초기화)
 * @returns {Promise<object>} success, state, loginFailCnt, pwdChangeRequired, unlocked
 * @remarks 제약: 로그인 계정 정지 불가. LOCKED 로 바꾸는 요청은 400. LOCKED → ACTIVE 는 관리자 잠금 해제(ACC-05)
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 1
 */
export function patchSystemUsersByEmpNoState(params) {
  return request('patchSystemUsersByEmpNoState', params);
}

/**
 * 계정 부서 이동
 *
 * `PUT /api/v1/system/users/{empNo}/dept`
 * @param {object} params deptId
 * @returns {Promise<object>} success, appliedMenuCnt, appliedDataCnt
 * @remarks 이동 즉시 새 부서 권한 적용
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 1
 */
export function putSystemUsersByEmpNoDept(params) {
  return request('putSystemUsersByEmpNoDept', params);
}

/**
 * 부서별 권한 비교
 *
 * `GET /api/v1/system/depts/perm-compare`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} items[{deptId,menuCnt,dataCnt}]
 * @remarks 부서 이동 모달
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 2
 */
export function getSystemDeptsPermCompare(params) {
  return request('getSystemDeptsPermCompare', params);
}

/**
 * 부서 목록 조회
 *
 * `GET /api/v1/system/depts`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} items[{deptId,desc,userCnt,menuCnt,dataCnt}]
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 1
 */
export function getSystemDepts(params) {
  return request('getSystemDepts', params);
}

/**
 * 부서 등록
 *
 * `POST /api/v1/system/depts`
 * @param {object} params deptId, desc, initPermFrom
 * @returns {Promise<object>} deptId
 * @remarks 검증: 부서명 필수, 중복 불가. 초기 권한 복사 옵션 (약칭은 2026-10-02 삭제 — 보내도 무시)
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 1
 */
export function postSystemDepts(params) {
  return request('postSystemDepts', params);
}

/**
 * 부서 수정
 *
 * `PUT /api/v1/system/depts/{deptId}`
 * @param {object} params deptId, desc
 * @returns {Promise<object>} success
 * @remarks 부서명 변경 시 권한·소속 계정 연쇄 갱신
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 1
 */
export function putSystemDeptsByDeptId(params) {
  return request('putSystemDeptsByDeptId', params);
}

/**
 * 부서 삭제
 *
 * `DELETE /api/v1/system/depts/{deptId}`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} success
 * @remarks 제약: 통합관리자 불가, 소속 계정 있으면 불가
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 1
 */
export function deleteSystemDeptsByDeptId(params) {
  return request('deleteSystemDeptsByDeptId', params);
}

/**
 * 계정·권한 변경 이력
 *
 * `GET /api/v1/system/perm-logs`
 * @param {object} params from, to, target, actType, page, size
 * @returns {Promise<object>} items[{ts,target,actType,detail,by}], meta
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 1
 */
export function getSystemPermLogs(params) {
  return request('getSystemPermLogs', params);
}

/* ───────── 메뉴 접근 권한 ───────── */

/**
 * 메뉴 권한 매트릭스 조회
 *
 * `GET /api/v1/system/menu-perms`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} screens[{id,name,group,sub}], depts[], matrix{deptId:[screenId]}
 * @remarks 메뉴 + 하위 화면 + 보고서 모듈
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 1
 */
export function getSystemMenuPerms(params) {
  return request('getSystemMenuPerms', params);
}

/**
 * 메뉴 권한 단건 변경
 *
 * `PUT /api/v1/system/menu-perms`
 * @param {object} params deptId, screenId, allowed
 * @returns {Promise<object>} success
 * @remarks 제약: 통합관리자 조정 불가
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 1
 */
export function putSystemMenuPerms(params) {
  return request('putSystemMenuPerms', params);
}

/**
 * 메뉴 권한 그룹 일괄 변경
 *
 * `PUT /api/v1/system/menu-perms/group`
 * @param {object} params deptId, groupNm, allowed
 * @returns {Promise<object>} changedCnt
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 1
 */
export function putSystemMenuPermsGroup(params) {
  return request('putSystemMenuPermsGroup', params);
}

/**
 * 부서 메뉴 권한 복사
 *
 * `POST /api/v1/system/menu-perms/copy`
 * @param {object} params fromDeptId, toDeptId
 * @returns {Promise<object>} copiedCnt
 * @remarks 대상 부서 기존 권한 덮어쓰기. 데이터 권한은 미복사
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 1
 */
export function postSystemMenuPermsCopy(params) {
  return request('postSystemMenuPermsCopy', params);
}

/**
 * 부서별 적용 현황
 *
 * `GET /api/v1/system/menu-perms/dept-status`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} items[{deptId,menuCnt,dataCnt,userCnt}]
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 2
 */
export function getSystemMenuPermsDeptStatus(params) {
  return request('getSystemMenuPermsDeptStatus', params);
}

/* ───────── 데이터 접근 권한 ───────── */

/**
 * 데이터 항목 목록
 *
 * `GET /api/v1/system/data-fields`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} items[{key,name,desc,columns[]}]
 * @remarks 7종
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 1
 */
export function getSystemDataFields(params) {
  return request('getSystemDataFields', params);
}

/**
 * 데이터 항목 등록
 *
 * `POST /api/v1/system/data-fields`
 * @param {object} params key, name, desc, category
 * @returns {Promise<object>} key
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 등록 시 applyFlg = N
 */
export function postSystemDataFields(params) {
  return request('postSystemDataFields', params);
}

/**
 * 데이터 항목 수정
 *
 * `PUT /api/v1/system/data-fields/{fieldKey}`
 * @param {object} params fieldKey, name, desc, category
 * @returns {Promise<object>} success
 */
export function putSystemDataFieldsByFieldKey(params) {
  return request('putSystemDataFieldsByFieldKey', params);
}

/**
 * 데이터 항목 삭제
 *
 * `DELETE /api/v1/system/data-fields/{fieldKey}`
 * @param {object} params fieldKey
 * @returns {Promise<object>} success
 */
export function deleteSystemDataFieldsByFieldKey(params) {
  return request('deleteSystemDataFieldsByFieldKey', params);
}

/**
 * 응답 필드명 등록
 *
 * `POST /api/v1/system/data-fields/{fieldKey}/attrs`
 * @param {object} params fieldKey, attrName, remark
 * @returns {Promise<object>} success
 * @remarks attrName 은 전역 UNIQUE — 이미 다른 항목에 있으면 409 로 그 항목명을 알려 줍니다
 */
export function postSystemDataFieldsByFieldKeyAttrs(params) {
  return request('postSystemDataFieldsByFieldKeyAttrs', params);
}

/**
 * 응답 필드명 해제
 *
 * `DELETE /api/v1/system/data-fields/{fieldKey}/attrs/{attrName}`
 * @param {object} params fieldKey, attrName
 * @returns {Promise<object>} success
 */
export function deleteSystemDataFieldsByFieldKeyAttrsByAttrName(params) {
  return request('deleteSystemDataFieldsByFieldKeyAttrsByAttrName', params);
}

/**
 * 데이터 항목 적용 전환 (2단계 스위치)
 *
 * `PATCH /api/v1/system/data-fields/{fieldKey}/apply`
 * @param {object} params fieldKey, on
 * @returns {Promise<object>} applyFlg
 * @remarks 켠 뒤 재로그인부터 화면·엑셀에 마스킹이 걸립니다
 */
export function patchSystemDataFieldsByFieldKeyApply(params) {
  return request('patchSystemDataFieldsByFieldKeyApply', params);
}

/**
 * 「화면 열 → 종류」 매핑 원자 저장 (2026-10-01 신규, 기획 04 DTP-02)
 *
 * `PUT /api/v1/system/data-fields/mapping`
 * @param {object} params newFields[{fieldKey,name,desc,category,grantAllDepts,apply}], moves[{attrName,toFieldKey,remark}], screenId
 * @returns {Promise<object>} created[], moved[{attrName,from,to}], released[{attrName,from}], applied[], notApplied[]
 * @remarks 한 트랜잭션 — 하나라도 실패하면 전부 되돌립니다. 쓰기 권한(requireWrite sys-data)
 */
export function putSystemDataFieldsMapping(params) {
  return request('putSystemDataFieldsMapping', params);
}

/**
 * 데이터 권한 매트릭스 조회
 *
 * `GET /api/v1/system/data-perms`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} fields[], depts[], matrix{deptId:[fieldKey]}
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 1
 */
export function getSystemDataPerms(params) {
  return request('getSystemDataPerms', params);
}

/**
 * 데이터 권한 변경
 *
 * `PUT /api/v1/system/data-perms`
 * @param {object} params deptId, fieldKey, allowed
 * @returns {Promise<object>} success
 * @remarks 제약: 통합관리자 조정 불가
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 1
 */
export function putSystemDataPerms(params) {
  return request('putSystemDataPerms', params);
}

/**
 * 적용 미리보기
 *
 * `GET /api/v1/system/data-perms/preview`
 * @param {object} params empNo
 * @returns {Promise<object>} items[{fieldKey,name,rendered,masked}]
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 2
 */
export function getSystemDataPermsPreview(params) {
  return request('getSystemDataPermsPreview', params);
}

/**
 * 계정별 적용 결과
 *
 * `GET /api/v1/system/data-perms/by-user`
 * @param {object} params page, size
 * @returns {Promise<object>} items[{empNo,name,dept,allowedFields[],maskedFields[]}], meta
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 2
 */
export function getSystemDataPermsByUser(params) {
  return request('getSystemDataPermsByUser', params);
}

/**
 * 데이터 접근 감사 조회
 *
 * `GET /api/v1/system/data-perms/audit`
 * @param {object} params from, to, empNo, fieldKey, page, size
 * @returns {Promise<object>} items[{ts,empNo,dept,fieldKey,screen,action}], meta
 * @remarks blind 열람 시도 이력
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 1
 */
export function getSystemDataPermsAudit(params) {
  return request('getSystemDataPermsAudit', params);
}

/* ───────── 이상 알림 발송 조건 관리 ───────── */

/**
 * 발송 조건 감지 지표 목록
 *
 * `GET /api/v1/metrics/standards`
 * @param {object} params page, size
 * @returns {Promise<object>} items[{stdId,category,name,unit,normal,warn,critical,direction,applied}], meta
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 1
 */
export function getAlertConditionMetrics(params) {
  return request('getAlertConditionMetrics', params);
}

/**
 * 발송 조건 요약
 *
 * `GET /api/v1/alert-conditions/summary`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} activeCnt, totalCnt, todaySentCnt{byChannel}, dedupCnt, avgDelaySec
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 2
 */
export function getAlertConditionsSummary(params) {
  return request('getAlertConditionsSummary', params);
}

/**
 * 발송 조건 목록 조회
 *
 * `GET /api/v1/alert-conditions`
 * @param {object} params severity, channel, state, page, size
 * @returns {Promise<object>} items[{condId,on,name,metric,op,threshold,duration,target,severity,channels[],groups[],validWindow,dedupMin}], meta
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 1
 */
export function getAlertConditions(params) {
  return request('getAlertConditions', params);
}

/**
 * 발송 조건 상세 — 편집 폼이 쓰는 전 필드
 *
 * `GET /api/v1/alert-conditions/{condId}`
 * @param {object} params condId
 * @returns {Promise<object>} condId, name, on, metricStdId, op, thresholdVal, targetScope, target, pickTargets[], channels[], groupIds[], groups[], …, updatedAt
 * @remarks 2026-10-01 기획 05 ALC-04 신설
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 1
 */
export function getAlertConditionsByCondId(params) {
  return request('getAlertConditionsByCondId', params);
}

/**
 * 발송 조건 등록
 *
 * `POST /api/v1/alert-conditions`
 * @param {object} params name, metricStdId, op, threshold, duration, target, severity, channels[], groupIds[], validWindow, dedupMin
 * @returns {Promise<object>} condId
 * @remarks 감지 지표는 SY-13 등록 지표 참조
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 1
 */
export function postAlertConditions(params) {
  return request('postAlertConditions', params);
}

/**
 * 발송 조건 수정
 *
 * `PUT /api/v1/alert-conditions/{condId}`
 * @param {object} params 동일
 * @returns {Promise<object>} success
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 1
 */
export function putAlertConditionsByCondId(params) {
  return request('putAlertConditionsByCondId', params);
}

/**
 * 발송 조건 삭제
 *
 * `DELETE /api/v1/alert-conditions/{condId}`
 * @returns {Promise<object>} success
 * @remarks 이미 알림이 발생한 조건은 409 — 중지로 안내
 */
export function deleteAlertConditionsByCondId(params) {
  return request('deleteAlertConditionsByCondId', params);
}

/**
 * 발송 조건 활성/중지
 *
 * `PATCH /api/v1/alert-conditions/{condId}/state`
 * @param {object} params on(true|false)
 * @returns {Promise<object>} success
 * @remarks 즉시 반영
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 1
 */
export function patchAlertConditionsByCondIdState(params) {
  return request('patchAlertConditionsByCondIdState', params);
}

/**
 * 발송 조건 테스트
 *
 * `POST /api/v1/alert-conditions/{condId}/test-send`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} sentCnt, recipients[]
 * @remarks 테스트 플래그로 로그 기록
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 1
 */
export function postAlertConditionsByCondIdTestSend(params) {
  return request('postAlertConditionsByCondIdTestSend', params);
}

/* ───────── 알림 수신자 관리 ───────── */

/**
 * 수신자 관리 요약
 *
 * `GET /api/v1/alert-recipients/summary`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} groupCnt, recipientCnt{receiving,absent}, nightCnt
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 2
 */
export function getAlertRecipientsSummary(params) {
  return request('getAlertRecipientsSummary', params);
}

/**
 * 수신 그룹 목록
 *
 * `GET /api/v1/alert-recipient-groups`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} items[{groupId,name,channels[],validWindow,night,members[]}]
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 1
 */
export function getAlertRecipientGroups(params) {
  return request('getAlertRecipientGroups', params);
}

/**
 * 수신 그룹 상세 — 편집 폼·부서 선택지·참조 정보
 *
 * `GET /api/v1/alert-recipient-groups/{groupId}`
 * @param {object} params groupId
 * @returns {Promise<object>} groupId, name, deptId, channels[], members[{empNo,name,dept,state,userState}], conds[], deptOptions[], updatedAt
 * @remarks 2026-10-01 기획 06 RCP-02 신설
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 1
 */
export function getAlertRecipientGroupsByGroupId(params) {
  return request('getAlertRecipientGroupsByGroupId', params);
}

/**
 * 수신 그룹 등록
 *
 * `POST /api/v1/alert-recipient-groups`
 * @param {object} params name, channels[], validWindow, night, memberEmpNos[]
 * @returns {Promise<object>} groupId
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 1
 */
export function postAlertRecipientGroups(params) {
  return request('postAlertRecipientGroups', params);
}

/**
 * 수신 그룹 수정
 *
 * `PUT /api/v1/alert-recipient-groups/{groupId}`
 * @param {object} params 동일
 * @returns {Promise<object>} success
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 1
 */
export function putAlertRecipientGroupsByGroupId(params) {
  return request('putAlertRecipientGroupsByGroupId', params);
}

/**
 * 수신 그룹 테스트 발송
 *
 * `POST /api/v1/alert-recipient-groups/{groupId}/test-send`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} sentCnt
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 2
 */
export function postAlertRecipientGroupsByGroupIdTestSend(params) {
  return request('postAlertRecipientGroupsByGroupIdTestSend', params);
}

/**
 * 수신자 목록
 *
 * `GET /api/v1/alert-recipients`
 * @param {object} params state, page, size
 * @returns {Promise<object>} items[{empNo,name,dept,pos,posNm,mail,hp,messenger,night,state,stateNm,groups[]}], meta
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 1
 */
export function getAlertRecipients(params) {
  return request('getAlertRecipients', params);
}

/**
 * 수신자 등록 후보 계정 — 아직 수신자가 아닌 사용 중 계정 (미배정 부서 소속 제외)
 *
 * `GET /api/v1/alert-recipients/candidates`
 * @param {object} params keyword, deptId, size
 * @returns {Promise<object>} items[{empNo,name,dept,posNm,email}], meta
 * @remarks 2026-10-01 기획 06 RCP-06 신설, 결정 R-14
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 2
 */
export function getAlertRecipientsCandidates(params) {
  return request('getAlertRecipientsCandidates', params);
}

/**
 * 수신자 등록
 *
 * `POST /api/v1/alert-recipients`
 * @param {object} params empNo, mail, hp, messenger, night
 * @returns {Promise<object>} recipientId
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 1
 */
export function postAlertRecipients(params) {
  return request('postAlertRecipients', params);
}

/**
 * 수신자 수정
 *
 * `PUT /api/v1/alert-recipients/{recipientId}`
 * @param {object} params mail, hp, messenger, night
 * @returns {Promise<object>} success
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 1
 */
export function putAlertRecipientsByRecipientId(params) {
  return request('putAlertRecipientsByRecipientId', params);
}

/**
 * 수신/부재 토글
 *
 * `PATCH /api/v1/alert-recipients/{recipientId}/state`
 * @param {object} params state(수신|부재)
 * @returns {Promise<object>} success
 * @remarks 부재 시 대리 수신자로 대체
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 1
 */
export function patchAlertRecipientsByRecipientIdState(params) {
  return request('patchAlertRecipientsByRecipientIdState', params);
}

/**
 * 수신자 영향 조회 — 부재·삭제 전에 받는 사람이 0명이 되는 그룹·조건
 *
 * `GET /api/v1/alert-recipients/{recipientId}/impact`
 * @param {object} params recipientId
 * @returns {Promise<object>} empNo, groups[], zeroGroups[], affectedConds[], affectedEscStages[]
 * @remarks 2026-10-01 기획 06 RCP-07·08 신설
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 2
 */
export function getAlertRecipientsByRecipientIdImpact(params) {
  return request('getAlertRecipientsByRecipientIdImpact', params);
}

/**
 * 수신자 삭제 — 영향이 있으면 force 없이 409
 *
 * `DELETE /api/v1/alert-recipients/{recipientId}`
 * @param {object} params recipientId, force
 * @returns {Promise<object>} success
 * @remarks 2026-10-01 기획 06 RCP-08 신설
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 2
 */
export function deleteAlertRecipientsByRecipientId(params) {
  return request('deleteAlertRecipientsByRecipientId', params);
}

/**
 * 수신 그룹 사용 중지/사용
 *
 * `PATCH /api/v1/alert-recipient-groups/{groupId}/state`
 * @param {object} params groupId, on
 * @returns {Promise<object>} useFlg, changed
 * @remarks 2026-10-01 기획 06 RCP-08 신설
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 2
 */
export function patchAlertRecipientGroupsByGroupIdState(params) {
  return request('patchAlertRecipientGroupsByGroupIdState', params);
}

/**
 * 승격 규칙 조회·수정
 *
 * 수신자 관리(SY-05) 화면에서는 걷어냈습니다(2026-09-16). 규칙은 [알림 현황] 의
 * 「승격 대상」이 그대로 읽으므로 서버 API 와 이 함수는 남겨 둡니다.
 *
 * `GET/PUT /api/v1/alert-escalation-rules`
 * @param {object} params stages[{stage,waitMin,targetGroupId}]
 * @returns {Promise<object>} success
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 2
 */
export function getAlertEscalationRules(params) {
  return request('getAlertEscalationRules', params);
}

/**
 * 승격 규칙 수정
 *
 * `PUT /api/v1/alert-escalation-rules`
 * @param {object} params stages[{stage,waitMin,target}]
 */
export function putAlertEscalationRules(params) {
  return request('putAlertEscalationRules', params);
}

/* ───────── 용어 사전 관리 ───────── */

/**
 * 용어 사전 요약
 *
 * `GET /api/v1/glossary/summary`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} termCnt, variantCnt, domainCnt, myVariantCnt, noVariantTermCnt, byDomain[]
 * @privateRemarks 접근 권한 전 부서 · 우선순위 2
 */
export function getGlossarySummary(params) {
  return request('getGlossarySummary', params);
}

/**
 * 용어 목록 조회
 *
 * `GET /api/v1/glossary/terms`
 * @param {object} params keyword, domainCd, page, size
 * @returns {Promise<object>} items[{termId,term,definition,domain,variants[{variantId,word,byEmpNo,byName,at,editable}]}], meta
 * @remarks editable = 등록 본인 여부
 * @privateRemarks 접근 권한 전 부서 · 우선순위 1
 */
export function getGlossaryTerms(params) {
  return request('getGlossaryTerms', params);
}

/**
 * 용어 상세 (용어 사전 조회 GL-01)
 *
 * `GET /api/v1/glossary/terms/{termId}`
 * @param {object} params termId
 * @returns {Promise<object>} termId, term, definition, domain, updatedAt, blinded, variants[], relatedTerms[]
 * @privateRemarks 접근 권한 sys-gloss 또는 gloss-view · 2026-10-01 신규
 */
export function getGlossaryTermsByTermId(params) {
  return request('getGlossaryTermsByTermId', params);
}

/**
 * 용어 분류 목록
 *
 * `GET /api/v1/glossary/domains`
 * @returns {Promise<object>} domains[{domainId,code,name}]
 */
export function getGlossaryDomains(params) {
  return request('getGlossaryDomains', params);
}

/**
 * 공식 용어 등록
 *
 * `POST /api/v1/glossary/terms`
 * @param {object} params term, definition, domainCd
 * @returns {Promise<object>} termId
 * @remarks 관리자 전용
 * @privateRemarks 접근 권한 통합관리자 · 우선순위 1
 */
export function postGlossaryTerms(params) {
  return request('postGlossaryTerms', params);
}

/**
 * 공식 용어 수정
 *
 * `PUT /api/v1/glossary/terms/{termId}`
 * @param {object} params term, definition, domainCd
 * @returns {Promise<object>} success
 * @remarks 관리자 전용
 * @privateRemarks 접근 권한 통합관리자 · 우선순위 1
 */
export function putGlossaryTermsByTermId(params) {
  return request('putGlossaryTermsByTermId', params);
}

/**
 * 유사어 등록
 *
 * `POST /api/v1/glossary/terms/{termId}/variants`
 * @param {object} params word
 * @returns {Promise<object>} variantId
 * @remarks 등록자·등록일 자동 기록
 * @privateRemarks 접근 권한 전 부서 · 우선순위 1
 */
export function postGlossaryTermsByTermIdVariants(params) {
  return request('postGlossaryTermsByTermIdVariants', params);
}

/**
 * 유사어 수정
 *
 * `PUT /api/v1/glossary/variants/{variantId}`
 * @param {object} params word
 * @returns {Promise<object>} success
 * @remarks 등록 본인만 가능
 * @privateRemarks 접근 권한 전 부서 · 우선순위 1
 */
export function putGlossaryVariantsByVariantId(params) {
  return request('putGlossaryVariantsByVariantId', params);
}

/**
 * 공식 용어 삭제
 *
 * `DELETE /api/v1/glossary/terms/{termId}`
 * @returns {Promise<object>} success
 * @remarks 등록 본인만 가능 · 유사어도 함께 지워집니다
 */
export function deleteGlossaryTermsByTermId(params) {
  return request('deleteGlossaryTermsByTermId', params);
}

/**
 * 유사어 삭제
 *
 * `DELETE /api/v1/glossary/variants/{variantId}`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} success
 * @remarks 등록 본인만 가능
 * @privateRemarks 접근 권한 전 부서 · 우선순위 1
 */
export function deleteGlossaryVariantsByVariantId(params) {
  return request('deleteGlossaryVariantsByVariantId', params);
}

/**
 * 용어 정규화 미리보기
 *
 * `POST /api/v1/glossary/normalize`
 * @param {object} params text
 * @returns {Promise<object>} normalizedText, replacements[{from,to,termId}]
 * @privateRemarks 접근 권한 전 부서 · 우선순위 1
 */
export function postGlossaryNormalize(params) {
  return request('postGlossaryNormalize', params);
}

/**
 * 용어 임베딩 재생성
 *
 * `POST /api/v1/glossary/reindex`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} jobId
 * @remarks SY-11 재색인과 연동
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 2
 */
export function postGlossaryReindex(params) {
  return request('postGlossaryReindex', params);
}

/**
 * 점검 필요 유사어 (07 GLS-03, 2026-10-01 신규)
 *
 * `GET /api/v1/glossary/variants/risks`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} items[{variantId,word,termId,term,ownerName,riskCd,riskNm}]
 * @privateRemarks 접근 권한 통합관리자 · 우선순위 1
 */
export function getGlossaryVariantsRisks(params) {
  return request('getGlossaryVariantsRisks', params);
}

/**
 * 용어 사전 내려받기 (07 GLS-12·18 · 13 GLV-05·13, 2026-10-01 신규)
 *
 * `POST /api/v1/glossary/terms/export` — 파일 응답이라 화면은 exportUtil.downloadFromServer 로 받습니다.
 * @param {object} params scope, menuId, condSummary, keyword, domainCd, mineOnly, format
 * @returns {Promise<object>} file(binary xlsx)
 * @privateRemarks 접근 권한 sys-gloss 또는 gloss-view · 우선순위 2
 */
export function postGlossaryTermsExport(params) {
  return request('postGlossaryTermsExport', params);
}

/**
 * 용어 사전 변경 이력 (07 GLS-07, 2026-10-01 신규)
 *
 * `GET /api/v1/glossary/changes`
 * @param {object} params termId, from, to, page, size
 * @returns {Promise<object>} items[{changeId,at,actorId,actorNm,targetCd,actionCd,termId,term,variantId,before,after}], meta
 * @privateRemarks 접근 권한 sys-gloss 조회 · 우선순위 2
 */
export function getGlossaryChanges(params) {
  return request('getGlossaryChanges', params);
}

/* ───────── 자연어 질의 이력 ───────── */

/**
 * 질의 이력 요약
 *
 * `GET /api/v1/ai/chat/history/summary`
 * @param {object} params from, to, userGroup
 * @returns {Promise<object>} questionCnt, answerRate, avgResponseSec, requeryRate, targetAnswerRate
 * @privateRemarks 접근 권한 전 부서 · 우선순위 1
 */
export function getAiChatHistorySummary(params) {
  return request('getAiChatHistorySummary', params);
}

/**
 * 질의 이력 조회
 *
 * `GET /api/v1/ai/chat/history`
 * @param {object} params from, to, userGroup, intent, page, size
 * @returns {Promise<object>} items[{ts,empNo,question,answer,judgmentBasis,unansweredReason,responseSec,evaluationCriteria,rating}], meta
 * @privateRemarks 접근 권한 전 부서 · 우선순위 1
 */
export function getAiChatHistory(params) {
  return request('getAiChatHistory', params);
}

/**
 * 질의 상세 조회
 *
 * `GET /api/v1/ai/chat/history/{messageId}`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} question, answer, judgmentBasis, unansweredReason, evaluationCriteria, hits[], elapsedMs, responseSec, rating
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 2
 */
export function getAiChatHistoryByMessageId(params) {
  return request('getAiChatHistoryByMessageId', params);
}

/**
 * 학습데이터 내보내기
 *
 * `POST /api/v1/ai/chat/history/export-trainset`
 * @param {object} params from, to, ratingFilter, format(jsonl)
 * @returns {Promise<object>} file(binary), sampleCnt
 * @remarks 파인튜닝 학습데이터
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 3
 */
export function postAiChatHistoryExportTrainset(params) {
  return request('postAiChatHistoryExportTrainset', params);
}

/**
 * 질의 이력 세션 목록 (08 CHH-18, 2026-10-01 신규)
 *
 * `GET /api/v1/ai/chat/history/sessions`
 * @param {object} params from, to, userGroup, empNo, keyword, page, size
 * @returns {Promise<object>} items[{sessionKey,sessionId,startedAt,lastAskedAt,empNo,name,dept,questionCnt,firstQuestion,answeredCnt,usefulCnt,badCnt,reviewedCnt,hiddenCnt}], meta
 * @privateRemarks 접근 권한 전 부서 · 우선순위 1
 */
export function getAiChatHistorySessions(params) {
  return request('getAiChatHistorySessions', params);
}

/**
 * 질의 이력 세션 상세 (08 CHH-18, 2026-10-01 신규)
 *
 * `GET /api/v1/ai/chat/history/sessions/{sessionKey}`
 * @param {object} params sessionKey
 * @returns {Promise<object>} sessionKey, sessionId, empNo, name, dept, startedAt, lastAskedAt, turns[]
 * @privateRemarks 접근 권한 전 부서 · 우선순위 1
 */
export function getAiChatHistorySessionsBySessionKey(params) {
  return request('getAiChatHistorySessionsBySessionKey', params);
}

/**
 * 질의 관리자 검토 저장 (08 CHH-04, 2026-10-01 신규)
 *
 * `PUT /api/v1/ai/chat/history/{messageId}/review`
 * @param {object} params messageId, reviewCd, comment
 * @returns {Promise<object>} messageId, review, reviewedBy, reviewedAt
 * @privateRemarks 접근 권한 chat-history 쓰기 권한 · 우선순위 1
 */
export function putAiChatHistoryByMessageIdReview(params) {
  return request('putAiChatHistoryByMessageIdReview', params);
}

/**
 * 질의 이력 엑셀 내려받기 (08 CHH-07·19, 2026-10-01 신규)
 *
 * `POST /api/v1/ai/chat/history/export` — 파일 응답이라 화면은 exportUtil.downloadFromServer 로 받습니다.
 * @param {object} params view, scope, menuId, condSummary, from, to, userGroup, keyword, format
 * @returns {Promise<object>} file(binary xlsx)
 * @privateRemarks 접근 권한 전 부서 · 우선순위 2
 */
export function postAiChatHistoryExport(params) {
  return request('postAiChatHistoryExport', params);
}

/**
 * 질의 이력 사용자 그룹 선택지 (08 CHH-10, 2026-10-01 신규)
 *
 * `GET /api/v1/ai/chat/history/groups`
 * @param {object} params from, to
 * @returns {Promise<object>} items[{dept,cnt}]
 * @privateRemarks 접근 권한 전 부서 · 우선순위 2
 */
export function getAiChatHistoryGroups(params) {
  return request('getAiChatHistoryGroups', params);
}

/**
 * 질의 디버그 진단 (08 CHH-05 — 카탈로그 등재. 화면은 상세의 debug 를 씁니다)
 *
 * `GET /api/v1/ai/chat/history/debug/{requestId}`
 * @param {object} params requestId
 * @returns {Promise<object>} route, parse, tool, result, errorCd, period, rows, docs, toolMs, totalMs
 * @privateRemarks 접근 권한 chat-history 쓰기 권한 · 우선순위 3
 */
export function getAiChatHistoryDebugByRequestId(params) {
  return request('getAiChatHistoryDebugByRequestId', params);
}

/* ───────── 보안 감사 로그 ───────── */

/**
 * 감사 로그 조회
 *
 * `GET /api/v1/audit-logs`
 * @param {object} params from, to, type(쉼표 다중), userGroup, empNo, keyword, ip, result, excludeLoginSuccess, page, size
 * @returns {Promise<object>} items[{id,src,ts,type,result,empNo,name,dept,menuId,menuNm,fieldKey,maskedCnt,target,detail,ip,ua}], meta
 * @remarks append-only. 수정·삭제 API 미제공
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 1
 */
export function getAuditLogs(params) {
  return request('getAuditLogs', params);
}

/**
 * 감사 로그 전체 내려받기 (2026-10-01 신규, 09 AUD-07)
 *
 * `POST /api/v1/audit-logs/export`
 * @param {object} params scope(ALL), menuId(sys-audit), format(xlsx)
 * @returns {Promise<object>} 파일(xlsx) — 화면은 exportUtil.downloadFromServer 로 받습니다
 * @remarks 서버가 내려받기 이력을 직접 기록합니다
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 2
 */
export function postAuditLogsExport(params) {
  return request('postAuditLogsExport', params);
}

/**
 * 감사 로그 보존 정책 조회 (2026-10-01 신규, 09 AUD-11)
 *
 * `GET /api/v1/audit-logs/retention-policy`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} retentionYears, enabled, sources[{src,totalCnt,expiredCnt,archivedCnt,oldestAt}], lastArchiveAt, nextArchiveAt, writeFailSinceBoot, mailFailSinceBoot
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 2
 */
export function getAuditLogsRetentionPolicy(params) {
  return request('getAuditLogsRetentionPolicy', params);
}

/* ───────── 보고서 다운로드 이력 ───────── */

/**
 * 다운로드 이력 요약
 *
 * `GET /api/v1/download-logs/summary`
 * @param {object} params from, to
 * @returns {Promise<object>} totalCnt, todayCnt, blindIncludedCnt, topUser{name,cnt}, byReport[], byUser[]
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 1
 */
export function getDownloadLogsSummary(params) {
  return request('getDownloadLogsSummary', params);
}

/**
 * 다운로드 이력 조회
 *
 * `GET /api/v1/download-logs`
 * @param {object} params from, to, menuId, reportId(호환), deptId, format, scopeCd, keyword, empNo, blindOnly, origin, page, size
 * @returns {Promise<object>} items[{dlId,ts,empNo,name,dept,report,menuId,menuNm,format,origin,scopeCd,condSummary,rowCnt,blindCnt,ip}], meta
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 1
 */
export function getDownloadLogs(params) {
  return request('getDownloadLogs', params);
}

/**
 * 다운로드 이력 기록
 *
 * `POST /api/v1/download-logs`
 * @param {object} params menuId, reportNm, format(코드), scopeCd, condSummary, scope(문구), rowCnt, blindCnt, fileSize, params
 * @returns {Promise<object>} logId
 * @remarks 엑셀·CSV·인쇄·차트 이미지 모두 기록. 기록 성공 뒤에만 파일을 저장합니다(DLG-05)
 * @privateRemarks 접근 권한 그 화면의 조회 권한 · 우선순위 1
 */
export function postDownloadLogs(params) {
  return request('postDownloadLogs', params);
}

/**
 * 보존 정책 조회
 *
 * `GET /api/v1/download-logs/retention-policy`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} retentionYears(3), enabled, totalCnt, expiredCnt, archivedCnt, archiveTargetCnt, oldestAt, lastArchiveAt, nextArchiveAt
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 3
 */
export function getDownloadLogsRetentionPolicy(params) {
  return request('getDownloadLogsRetentionPolicy', params);
}

/**
 * 다운로드 이력 상세 (2026-10-01 신규, 10 DLG-10)
 *
 * `GET /api/v1/download-logs/{dlId}`
 * @param {object} params dlId
 * @returns {Promise<object>} 목록 필드 + params, fileNm, fileSize, result, origin, blindFields[{fieldKey,fieldNm,cellCnt}]
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 2
 */
export function getDownloadLogsByDlId(params) {
  return request('getDownloadLogsByDlId', params);
}

/**
 * 다운로드 이력 전체 내려받기 (2026-10-01 신규, 10 DLG-08)
 *
 * `POST /api/v1/download-logs/export`
 * @param {object} params scope(ALL), menuId(sys-dl)
 * @returns {Promise<object>} 파일(xlsx) — 화면은 exportUtil.downloadFromServer 로 받습니다
 * @remarks 서버가 내려받기 이력을 직접 기록합니다
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 2
 */
export function postDownloadLogsExport(params) {
  return request('postDownloadLogsExport', params);
}

/* ───────── 데이터 연동 이력 ───────── */

/**
 * 연동 요약
 *
 * `GET /api/v1/sync/jobs/summary`
 * @param {object} params date
 * @returns {Promise<object>} syncState, todayRows, failedRows, failedJobCnt, avgDurationMin, lastBatchAt
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 1
 */
export function getSyncJobsSummary(params) {
  return request('getSyncJobsSummary', params);
}

/**
 * 이관 작업 이력 조회
 *
 * `GET /api/v1/sync/jobs`
 * @param {object} params from, to, srcTable, state, page, size
 * @returns {Promise<object>} items[{jobId,srcTable,dstTable,kind,startedAt,endedAt,duration,rows,okRows,ngRows,state}], meta
 * @remarks 30초 폴링(진행 중 작업)
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 1
 */
export function getSyncJobs(params) {
  return request('getSyncJobs', params);
}

/**
 * 엔진 실행 이력
 *
 * `GET /api/v1/sync/runs`
 * @param {object} params from, to, state, mode, page, size
 * @returns {Promise<object>} items[{runId,mode,state,startedAt,targetCnt,successCnt,failCnt,message}], meta
 * @remarks jobs 는 테이블 1건 단위, runs 는 엔진 1회 실행 단위입니다
 */
export function getSyncRuns(params) {
  return request('getSyncRuns', params);
}

/**
 * 이관 작업 상세
 *
 * `GET /api/v1/sync/jobs/{jobId}`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} job{}, params{}, errors[{rowNo,message,rawData}]
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 1
 */
export function getSyncJobsByJobId(params) {
  return request('getSyncJobsByJobId', params);
}

/**
 * 이관 작업 재실행
 *
 * `POST /api/v1/sync/jobs/{jobId}/retry`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} newJobId
 * @remarks 실패 작업만 재실행
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 1
 */
export function postSyncJobsByJobIdRetry(params) {
  return request('postSyncJobsByJobIdRetry', params);
}

/**
 * 수동 이관 예약
 *
 * `POST /api/v1/sync/jobs/manual`
 * @param {object} params srcTables[], kind(full|incremental), scheduledAt
 * @returns {Promise<object>} jobIds[]
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 1
 */
export function postSyncJobsManual(params) {
  return request('postSyncJobsManual', params);
}

/**
 * 연결 테스트
 *
 * `POST /api/v1/sync/connection-test`
 * @param {object} params target(mssql|postgresql|all)
 * @returns {Promise<object>} results[{target,connected,responseMs,version}]
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 1
 */
export function postSyncConnectionTest(params) {
  return request('postSyncConnectionTest', params);
}

/**
 * 연동 매핑 조회
 *
 * `GET /api/v1/sync/maps`
 * @param {object} params srcTable
 * @returns {Promise<object>} items[{srcTable,srcColumn,dstSchema,dstTable,dstColumn,transform}]
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 1
 */
export function getSyncMaps(params) {
  return request('getSyncMaps', params);
}

/**
 * 연동 정책 조회
 *
 * `GET /api/v1/sync/policy`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} batchCron, incrementalKey, retryPolicy, failAlertCondId, retentionDays
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 2
 */
export function getSyncPolicy(params) {
  return request('getSyncPolicy', params);
}

/**
 * 연동 이력 전체 내려받기 (서버 생성 xlsx, SYN-15)
 *
 * `POST /api/v1/sync/export`
 * 화면은 파일(Blob)을 받기 위해 exportUtil.downloadFromServer 로 부릅니다 — 이 함수는 카탈로그·목 정합용입니다.
 * @param {object} params target(JOBS|RUNS|DRIFTS), scope(ALL), menuId, condSummary
 * @returns {Promise<object>} file(binary xlsx)
 * @privateRemarks 접근 권한 sys-sync 조회 권한 · 우선순위 2
 */
export function postSyncExport(params) {
  return request('postSyncExport', params);
}

/**
 * 스키마 드리프트 요약
 *
 * `GET /api/v1/sync/schema-drift/summary`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} driftState, openCnt, sourceNewCnt, sourceMissingCnt, targetNewCnt, targetMissingCnt, maxDetectCnt, lastCheckedAt
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 1
 */
export function getSyncSchemaDriftSummary(params) {
  return request('getSyncSchemaDriftSummary', params);
}

/**
 * 스키마 드리프트 목록 조회
 *
 * `GET /api/v1/sync/schema-drift`
 * @param {object} params side, kind, resolved, page, size
 * @returns {Promise<object>} items[{driftId,side,kind,objectName,mapId,detail,firstSeenAt,lastSeenAt,detectCnt,resolved}], meta
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 1
 */
export function getSyncSchemaDrift(params) {
  return request('getSyncSchemaDrift', params);
}

/**
 * 스키마 드리프트 해소 처리
 *
 * `POST /api/v1/sync/schema-drift/{driftId}/resolve`
 * @param {object} params driftId, note
 * @returns {Promise<object>} driftId, resolved
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 2
 */
export function postSyncSchemaDriftByDriftIdResolve(params) {
  return request('postSyncSchemaDriftByDriftIdResolve', params);
}

/* ───────── SY-01 회원가입 승인 (백엔드 구현 확장분) ───────── */

/**
 * 승인 대기 계정 목록
 *
 * `GET /api/v1/system/users/pending`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} items[{empNo,name,dept,pos,email,requestedAt}]
 */
export function getSystemUsersPending(params) {
  return request('getSystemUsersPending', params);
}

/**
 * 회원가입 승인·반려
 *
 * `POST /api/v1/system/users/{empNo}/approve`
 * @param {object} params empNo, approve, reason
 * @returns {Promise<object>} empNo, state
 */
export function postSystemUsersByEmpNoApprove(params) {
  return request('postSystemUsersByEmpNoApprove', params);
}

/** 업로드 문서 목록 — 시스템 관리(읽기 전용) */
export function getSystemUploads(params) {
  return request('getSystemUploads', params);
}

/** 업로드 문서 버전 이력 — 시스템 관리 경로 */
export function getSystemUploadsByDocIdVersions(params) {
  return request('getSystemUploadsByDocIdVersions', params);
}

/**
 * 업로드 문서 숨기기 (R-19 · D-13)
 *
 * `DELETE /api/v1/system/uploads/{docId}` — 본문 `{ reason }`.
 * 엔드포인트가 `deleteBody: true` 를 선언해 공통 request() 가 사유를 본문으로 보냅니다(주소에 남지 않게).
 * @param {object} params docId, reason(필수 · 200자)
 * @returns {Promise<object>} docId, deleted, deletedAt
 * @privateRemarks 접근 권한 sys-upload-doc 쓰기 권한 · 우선순위 2
 */
export function deleteSystemUploadsByDocId(params) {
  return request('deleteSystemUploadsByDocId', params);
}

/**
 * 업로드 문서 복원 (R-19 · D-13)
 *
 * `POST /api/v1/system/uploads/{docId}/restore`
 * @param {object} params docId
 * @returns {Promise<object>} docId, deleted
 * @privateRemarks 접근 권한 sys-upload-doc 쓰기 권한 · 우선순위 2
 */
export function postSystemUploadsByDocIdRestore(params) {
  return request('postSystemUploadsByDocIdRestore', params);
}

/* ───────── 그룹웨어 부서 매핑 (SY-17) ───────── */

/**
 * 그룹웨어 부서 매핑 요약
 *
 * `GET /api/v1/system/gw-dept-maps/summary`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} gwDeptCnt, mappedCnt, unmappedCnt, excludedCnt, unmappedUserCnt, unassignedUserCnt, unassignedDept{deptId,deptNm}, lastSyncAt, lastJoinMessage
 * @privateRemarks 접근 권한 sys-gw-dept 권한 · 우선순위 1
 */
export function getSystemGwDeptMapsSummary(params) {
  return request('getSystemGwDeptMapsSummary', params);
}

/**
 * 그룹웨어 부서 매핑 목록
 *
 * `GET /api/v1/system/gw-dept-maps`
 * @param {object} params keyword, state(MAPPED|UNMAPPED|EXCLUDED), page, size
 * @returns {Promise<object>} items[{gwDeptNm,activeCnt,joinedCnt,unassignedCnt,deptId,deptNm,joinYn,state,remark,hasRow,inSource,updDate,updUser}], meta
 * @privateRemarks 접근 권한 sys-gw-dept 권한 · 우선순위 1
 */
export function getSystemGwDeptMaps(params) {
  return request('getSystemGwDeptMaps', params);
}

/**
 * 그룹웨어 부서 매핑 저장 (없으면 추가)
 *
 * `PUT /api/v1/system/gw-dept-maps`
 * @param {object} params gwDeptNm, deptId(생략=미배정), joinYn(Y|N), remark(생략=비움)
 * @returns {Promise<object>} gwDeptNm, state
 * @remarks 이미 가입된 계정의 부서는 바꾸지 않습니다
 * @privateRemarks 접근 권한 sys-gw-dept 권한 · 우선순위 1
 */
export function putSystemGwDeptMaps(params) {
  return request('putSystemGwDeptMaps', params);
}

/**
 * 그룹웨어 부서 매핑 삭제
 *
 * `DELETE /api/v1/system/gw-dept-maps`
 * @param {object} params gwDeptNm
 * @returns {Promise<object>} success
 * @privateRemarks 접근 권한 sys-gw-dept 권한 · 우선순위 2
 */
export function deleteSystemGwDeptMaps(params) {
  return request('deleteSystemGwDeptMaps', params);
}

/**
 * 미배정 계정 목록
 *
 * `GET /api/v1/system/gw-dept-maps/unassigned-users`
 * @param {object} params keyword, page, size
 * @returns {Promise<object>} items[{empNo,name,gwDeptNm,pos,posNm,state,stateNm,joinedAt,lastLoginAt,suggestDeptId,suggestDeptNm}], meta
 * @privateRemarks 접근 권한 sys-gw-dept 권한 · 우선순위 1
 */
export function getSystemGwDeptMapsUnassignedUsers(params) {
  return request('getSystemGwDeptMapsUnassignedUsers', params);
}

/**
 * 미배정 계정 매핑대로 재배정
 *
 * `POST /api/v1/system/gw-dept-maps/reassign`
 * @param {object} params empNos[] 또는 all:true — 빈 본문은 400 (2026-10-01 GWD-01, 최대 1,000개)
 * @returns {Promise<object>} movedCnt, skippedCnt, items[{empNo,deptNm,gwDeptNm}], byDept[{deptNm,cnt}], skipped[{empNo,reason}]
 * @privateRemarks 접근 권한 sys-gw-dept 권한 · 우선순위 1
 */
export function postSystemGwDeptMapsReassign(params) {
  return request('postSystemGwDeptMapsReassign', params);
}

/**
 * 그룹웨어 부서 매핑 일괄 저장 (2026-10-01 GWD-05)
 *
 * `PUT /api/v1/system/gw-dept-maps/bulk`
 * @param {object} params gwDeptNms[], deptId?, joinYn
 * @returns {Promise<object>} savedCnt, items[{gwDeptNm,state}]
 * @privateRemarks 접근 권한 sys-gw-dept 쓰기 권한 · 우선순위 2
 */
export function putSystemGwDeptMapsBulk(params) {
  return request('putSystemGwDeptMapsBulk', params);
}
