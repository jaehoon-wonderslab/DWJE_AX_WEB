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
 * 계정 사용/정지
 *
 * `PATCH /api/v1/system/users/{empNo}/state`
 * @param {object} params state(사용|정지)
 * @returns {Promise<object>} success
 * @remarks 제약: 로그인 계정 정지 불가
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
 * @returns {Promise<object>} items[{deptId,abbr,desc,userCnt,menuCnt,dataCnt}]
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 1
 */
export function getSystemDepts(params) {
  return request('getSystemDepts', params);
}

/**
 * 부서 등록
 *
 * `POST /api/v1/system/depts`
 * @param {object} params deptId, abbr, desc, initPermFrom
 * @returns {Promise<object>} deptId
 * @remarks 검증: 부서명·약칭 필수, 중복 불가. 초기 권한 복사 옵션
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 1
 */
export function postSystemDepts(params) {
  return request('postSystemDepts', params);
}

/**
 * 부서 수정
 *
 * `PUT /api/v1/system/depts/{deptId}`
 * @param {object} params deptId, abbr, desc
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

/* ───────── 자연어 질의 이력 ───────── */

/**
 * 질의 이력 요약
 *
 * `GET /api/v1/ai/chat/history/summary`
 * @param {object} params from, to, userGroup
 * @returns {Promise<object>} questionCnt, intentAccuracy, avgResponseSec, requeryRate, targetAccuracy
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
 * @returns {Promise<object>} items[{ts,empNo,question,intent,agents[],responseSec,rating}], meta
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
 * @returns {Promise<object>} question, intent, prompt, answer, hits[{docId,chunkId,score}], agents[], elapsedMs
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

/* ───────── 보안 감사 로그 ───────── */

/**
 * 감사 로그 조회
 *
 * `GET /api/v1/audit-logs`
 * @param {object} params from, to, type, userGroup, empNo, page, size
 * @returns {Promise<object>} items[{ts,type,empNo,dept,target,detail,ip}], meta
 * @remarks append-only. 수정·삭제 API 미제공
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 1
 */
export function getAuditLogs(params) {
  return request('getAuditLogs', params);
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
 * @param {object} params from, to, reportId, deptId, format, page, size
 * @returns {Promise<object>} items[{ts,empNo,name,dept,report,format,scope,rowCnt,blindCnt,ip}], meta
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 1
 */
export function getDownloadLogs(params) {
  return request('getDownloadLogs', params);
}

/**
 * 다운로드 이력 기록
 *
 * `POST /api/v1/download-logs`
 * @param {object} params reportId, reportNm, format, scope, rowCnt, blindCnt
 * @returns {Promise<object>} logId
 * @remarks 엑셀·CSV·인쇄 모두 기록. 서버 내부 호출 권장
 * @privateRemarks 접근 권한 전 부서 · 우선순위 1
 */
export function postDownloadLogs(params) {
  return request('postDownloadLogs', params);
}

/**
 * 보존 정책 조회
 *
 * `GET /api/v1/download-logs/retention-policy`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} retentionYears(3), archivedCnt, nextArchiveAt
 * @privateRemarks 접근 권한 전산팀·통합관리자 · 우선순위 3
 */
export function getDownloadLogsRetentionPolicy(params) {
  return request('getDownloadLogsRetentionPolicy', params);
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
