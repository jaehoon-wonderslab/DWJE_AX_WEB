/**
 * [Model] 시스템관리 리포지토리 (SY-01 ~ SY-15)
 *
 * 화면 단위로 필요한 API 묶음을 제공합니다.
 */
import * as aiService from '@services/api/aiService';
import * as systemService from '@services/api/systemService';
import { command, unwrap, unwrapAll, unwrapPaged } from '@services/api/request';
import { driftSide as driftSideCode } from '@domains/common/model/paramModel';

/* ═══════ SY-01 계정 관리 ═══════ */

/**
 * 계정 한 건을 화면이 쓰는 모양으로 맞춥니다.
 *
 * 서버는 코드값(`state:'ACTIVE'`, `pos:'ADMIN'`)과 표기값(`stateNm`, `posNm`)을 함께 줍니다.
 * 화면에는 표기값을 쓰고, 판정에는 코드값을 씁니다.
 */
function normalizeUser(u) {
  return {
    ...u,
    stateNm: u.stateNm || u.state || '',
    posNm: u.posNm || u.pos || '',
    /** 계정 전환 목록에 노출되는 계정인지 (서버 `demo`) */
    switchable: !!(u.switchable ?? u.demo),
  };
}

/** 부서 한 건 — 권한 매트릭스와 같은 이름(`id`·`name`)으로 맞춥니다 */
function normalizeDept(d) {
  return {
    id: d.deptId ?? d.id,
    name: d.deptNm ?? d.name ?? '',
    abbr: d.abbr ?? d.deptAbbr ?? '',
    desc: d.desc ?? '',
    superAdmin: !!d.superAdmin,
    userCnt: d.userCnt ?? 0,
    menuCnt: d.menuCnt,
    dataCnt: d.dataCnt,
  };
}

/**
 * 계정 관리 화면 (승인 대기 목록 포함)
 *
 * 회원가입은 `PENDING` 상태로 쌓이고, 전산팀이 승인해야 로그인할 수 있습니다.
 * 그래서 계정 목록과 함께 승인 대기 목록도 같이 받아 옵니다.
 */
export async function loadAccounts({ page, size } = {}) {
  const data = await unwrapAll({
    summary: systemService.getSystemAccountsSummary({}),
    users: systemService.getSystemUsers({ page, size }),
    pending: systemService.getSystemUsersPending({}),
    depts: systemService.getSystemDepts({}),
    logs: systemService.getSystemPermLogs({ size: 10 }),
  });

  return {
    ...data,
    usersMeta: data.metas?.users,
    users: (data.users?.items || []).map(normalizeUser),
    pending: (data.pending?.items || []).map(normalizeUser),
    depts: (data.depts?.items || []).map(normalizeDept),
    logs: (data.logs?.items || []).map((l) => ({ ...l, act: l.act || ACT_LABEL[l.actType] || l.actType || '' })),
  };
}

/** 권한 변경 이력 구분 코드 표기 */
const ACT_LABEL = { ACCOUNT: '계정', DEPT: '부서', MENU: '메뉴 권한', DATA: '데이터 권한' };

/**
 * 회원가입 승인 · 반려
 *
 * 승인하면 `PENDING` → `ACTIVE` 로 바뀌어 그때부터 로그인할 수 있습니다.
 * 반려하면 `SUSPENDED` 가 되며 사유는 감사 로그에 남습니다.
 *
 * @param {string} empNo 대상 사번
 * @param {boolean} approve true 승인 · false 반려
 * @param {string} [reason] 반려 사유
 */
export const approveSignup = (empNo, approve, reason) =>
  command(systemService.postSystemUsersByEmpNoApprove({ empNo, approve, reason }));
export const createUser = (v) => command(systemService.postSystemUsers(v));
export const updateUser = (v) => command(systemService.putSystemUsersByEmpNo(v));
export const deleteUser = (empNo) => command(systemService.deleteSystemUsersByEmpNo({ empNo }));
/**
 * 계정 사용/정지
 *
 * 서버는 바꿀 상태를 본문으로 받습니다. 예전엔 empNo 만 보내서
 * "계정 상태가 변경되었습니다" 라는 응답만 오고 실제로는 아무것도 바뀌지 않았습니다.
 *
 * 상태 코드는 ACTIVE · SUSPENDED · PENDING 입니다.
 *
 * @param {string} empNo
 * @param {'ACTIVE'|'SUSPENDED'} state 바꿀 상태
 */
export const setUserState = (empNo, state) =>
  command(systemService.patchSystemUsersByEmpNoState({ empNo, state }));
export const moveUserDept = (empNo, deptId) => command(systemService.putSystemUsersByEmpNoDept({ empNo, deptId }));
export const createDept = (v) => command(systemService.postSystemDepts(v));
export const updateDept = (deptId, v) => command(systemService.putSystemDeptsByDeptId({ deptId, ...v }));
export const deleteDept = (deptId) => command(systemService.deleteSystemDeptsByDeptId({ deptId }));


/**
 * 권한 매트릭스 응답을 화면이 쓰는 모양으로 맞춥니다. (SY-02 · SY-03 공용)
 *
 * 서버는 부서를 객체 배열로 주고 매트릭스를 부서 ID 로 묶어 줍니다.
 * 화면은 `{ id, name, abbr }` 와 ID 로 묶인 매트릭스만 알면 되도록 여기서 한 번 정리합니다.
 *
 * @param {object} data 서버 응답 data
 * @returns {object} { ...data, depts:[{id,name,abbr,desc,superAdmin,userCnt}], matrix, adminDepts:[id] }
 */
function normalizePermMatrix(data) {
  if (!data) return data;
  const depts = (data.depts || []).map((d) =>
    typeof d === 'string'
      ? { id: d, name: d, abbr: d, superAdmin: false }
      : {
          id: d.deptId ?? d.id,
          name: d.deptNm ?? d.name ?? String(d.deptId ?? ''),
          abbr: d.abbr ?? d.deptAbbr ?? '',
          desc: d.desc ?? '',
          superAdmin: !!d.superAdmin,
          userCnt: d.userCnt ?? 0,
        }
  );

  // 매트릭스 키를 부서 ID 문자열로 통일합니다
  const matrix = {};
  Object.entries(data.matrix || {}).forEach(([k, v]) => {
    matrix[String(k)] = v || [];
  });

  const adminDepts = data.adminDepts?.length
    ? data.adminDepts.map(String)
    : depts.filter((d) => d.superAdmin).map((d) => String(d.id));

  return { ...data, depts, matrix, adminDepts };
}

/* ═══════ SY-02 메뉴 접근 권한 ═══════ */
export async function loadMenuPerms() {
  const data = await unwrapAll({
    matrix: systemService.getSystemMenuPerms({}),
    status: systemService.getSystemMenuPermsDeptStatus({}),
  });
  return { ...data, matrix: normalizePermMatrix(data.matrix) };
}
export const toggleMenuPerm = (deptId, screenId) => command(systemService.putSystemMenuPerms({ deptId, screenId }));
export const toggleMenuGroup = (deptId, group, allowed) => command(systemService.putSystemMenuPermsGroup({ deptId, group, allowed }));
export const copyMenuPerm = (v) => command(systemService.postSystemMenuPermsCopy(v));
/**
 * 메뉴 권한 단건 변경 (허용 여부 명시)
 *
 * 서버 요청 본문은 `deptId · screenId · allowed` 입니다. allowed 를 빼고 보내면
 * 서버가 true 로 간주해 체크 해제가 되지 않았습니다.
 *
 * @param {number|string} deptId 부서 ID
 * @param {string} screenId 화면 ID
 * @param {boolean} allowed true 허용 · false 해제
 */
export const setMenuPerm = (deptId, screenId, allowed) =>
  command(systemService.putSystemMenuPerms({ deptId, screenId, allowed }));
/**
 * 메뉴 권한 그룹 일괄 변경 — 서버 본문 키는 `groupNm` 입니다 (`group` 은 받지 않는 항목이라 400)
 *
 * @param {number|string} deptId 부서 ID
 * @param {string} groupNm 메뉴 그룹 이름 (매트릭스 행의 group)
 * @param {boolean} allowed true 전체 허용 · false 전체 해제
 */
export const setMenuGroupPerm = (deptId, groupNm, allowed) =>
  command(systemService.putSystemMenuPermsGroup({ deptId, groupNm, allowed }));

/* ═══════ SY-03 데이터 접근 권한 ═══════ */
/**
 * 데이터 접근 권한 화면
 *
 * 미리보기는 대상 사번이 있어야 조회합니다(`empNo` 필수).
 * 사번을 고르지 않았으면 호출을 건너뛰고, 없는 사번이면 서버가 404 를 주므로
 * 화면에서 "대상 없음" 으로 표시합니다. (로그아웃 대상이 아닙니다)
 */
export async function loadDataPerms(empNo, { page, size } = {}) {
  const data = await unwrapAll({
    matrix: systemService.getSystemDataPerms({}),
    ...(empNo ? { preview: systemService.getSystemDataPermsPreview({ empNo }) } : {}),
    byUser: systemService.getSystemDataPermsByUser({}),
    audit: systemService.getSystemDataPermsAudit({ page, size }),
  });
  return { ...data, matrix: normalizePermMatrix(data.matrix), auditMeta: data.metas?.audit };
}
export const toggleDataPerm = (deptId, fieldKey) => command(systemService.putSystemDataPerms({ deptId, fieldKey }));
/**
 * 데이터 권한 변경 (허용 여부 명시) — 서버 본문은 `deptId · fieldKey · allowed` 입니다.
 *
 * @param {number|string} deptId 부서 ID
 * @param {string} fieldKey 데이터 항목 키 (qty · yield · price · customer · plan · mold · worker)
 * @param {boolean} allowed true 허용 · false 해제
 */
export const setDataPerm = (deptId, fieldKey, allowed) =>
  command(systemService.putSystemDataPerms({ deptId, fieldKey, allowed }));

/* ═══════ SY-04 이상 알림 발송 조건 ═══════ */
export async function loadAlertConditions({ severity, enabled, keyword, page, size }) {
  const data = await unwrapAll({
    summary: systemService.getAlertConditionsSummary({}),
    list: systemService.getAlertConditions({ severity, enabled, keyword, page, size }),
    groups: systemService.getAlertRecipientGroups({}),
  });
  return { ...data, listMeta: data.metas?.list };
}
export const createAlertCondition = (v) => command(systemService.postAlertConditions(v));
export const updateAlertCondition = (condId, v) => command(systemService.putAlertConditionsByCondId({ condId, ...v }));
export const deleteAlertCondition = (condId) => command(systemService.deleteAlertConditionsByCondId({ condId }));
export const toggleAlertCondition = (condId) => command(systemService.patchAlertConditionsByCondIdState({ condId }));
export const testAlertCondition = (condId) => command(systemService.postAlertConditionsByCondIdTestSend({ condId }));
/**
 * 발송 조건 화면 (상태 필터를 서버 키로)
 *
 * 목록 API 의 상태 필터 파라미터는 `state`(ON | OFF) 입니다.
 * 예전 `enabled` 는 서버가 모르는 키라 조용히 무시되어 '활성/중지' 를 골라도 전체가 나왔습니다.
 *
 * @param {object} p { severity, state:'ON'|'OFF'|undefined, keyword, page, size }
 */
export async function loadAlertConditionsByState({ severity, state, keyword, page, size }) {
  const data = await unwrapAll({
    summary: systemService.getAlertConditionsSummary({}),
    list: systemService.getAlertConditions({ severity, state, keyword, page, size }),
    groups: systemService.getAlertRecipientGroups({}),
  });
  return { ...data, listMeta: data.metas?.list };
}

/* ═══════ SY-05 알림 수신자 관리 ═══════ */
export async function loadRecipients({ groupId, state, page, size }) {
  const data = await unwrapAll({
    summary: systemService.getAlertRecipientsSummary({}),
    groups: systemService.getAlertRecipientGroups({}),
    recipients: systemService.getAlertRecipients({ groupId, state, page, size }),
    duties: systemService.getAlertDuties({}),
    escalation: systemService.getAlertEscalationRules({}),
  });
  return { ...data, recipientsMeta: data.metas?.recipients };
}
export const createGroup = (v) => command(systemService.postAlertRecipientGroups(v));
export const updateGroup = (groupId, v) => command(systemService.putAlertRecipientGroupsByGroupId({ groupId, ...v }));
export const testGroup = (groupId) => command(systemService.postAlertRecipientGroupsByGroupIdTestSend({ groupId }));
export const createRecipient = (v) => command(systemService.postAlertRecipients(v));
export const updateRecipient = (recipientId, v) => command(systemService.putAlertRecipientsByRecipientId({ recipientId, ...v }));
export const toggleRecipientState = (recipientId) => command(systemService.patchAlertRecipientsByRecipientIdState({ recipientId }));
export const createDuty = (v) => command(systemService.postAlertDuties(v));
export const updateDuty = (dutyId, v) => command(systemService.putAlertDutiesByDutyId({ dutyId, ...v }));
export const deleteDuty = (dutyId) => command(systemService.deleteAlertDutiesByDutyId({ dutyId }));
export const updateEscalationRules = (stages) => command(systemService.putAlertEscalationRules({ stages }));

/* ═══════ SY-06 용어 사전 ═══════ */
export async function loadGlossary({ keyword, domain, mineOnly, page, size }) {
  const data = await unwrapAll({
    summary: systemService.getGlossarySummary({}),
    terms: systemService.getGlossaryTerms({ keyword, domain, mineOnly, page, size }),
    // 분류는 기준정보입니다. 등록된 용어에서 뽑으면 첫 용어를 만들 수 없습니다
    domains: systemService.getGlossaryDomains({}),
  });
  return { ...data, termsMeta: data.metas?.terms };
}
export const createTerm = (v) => command(systemService.postGlossaryTerms(v));
export const updateTerm = (termId, v) => command(systemService.putGlossaryTermsByTermId({ termId, ...v }));
export const deleteTerm = (termId) => command(systemService.deleteGlossaryTermsByTermId({ termId }));
export const createVariant = (termId, word) => command(systemService.postGlossaryTermsByTermIdVariants({ termId, word }));
export const updateVariant = (variantId, v) => command(systemService.putGlossaryVariantsByVariantId({ variantId, ...v }));
export const deleteVariant = (variantId) => command(systemService.deleteGlossaryVariantsByVariantId({ variantId }));
export const normalizeText = (text) => command(systemService.postGlossaryNormalize({ text }));
export const reindexGlossary = () => command(systemService.postGlossaryReindex({}));
/**
 * 용어 사전 화면 (분류 필터를 서버 키로)
 *
 * 목록 API 의 분류 파라미터는 `domainCd` 입니다. 예전 `domain` 은 서버가 모르는 키라
 * 분류를 골라도 전체가 나왔습니다. '내가 등록한 유사어만' 은 서버 파라미터가 없어 화면에서 걸러 냅니다.
 *
 * @param {object} p { keyword, domainCd, page, size }
 */
export async function loadGlossaryByDomain({ keyword, domainCd, page, size }) {
  const data = await unwrapAll({
    summary: systemService.getGlossarySummary({}),
    terms: systemService.getGlossaryTerms({ keyword, domainCd, page, size }),
    domains: systemService.getGlossaryDomains({}),
  });
  return { ...data, termsMeta: data.metas?.terms };
}

/* ═══════ SY-07 제품군 순위 ═══════ */
export function loadProductRank(topN, { page, size } = {}) {
  return unwrapAll({
    families: systemService.getProductsFamilies({}),
    ranking: systemService.getProductsRanking({ topN }),
    logs: systemService.getProductsRankLogs({ page, size }),
  });
}
export const loadFamilyProducts = (familyCd) => unwrap(systemService.getProductsFamiliesByFamilyCdProducts({ familyCd }), { items: [] });
export const moveFamily = (v) => command(systemService.putProductsFamiliesOrder(v));
export const moveFamilyProduct = (v) => command(systemService.putProductsFamiliesByFamilyCdProductsOrder(v));
export const resetFamilyOrder = () => command(systemService.postProductsFamiliesOrderReset({}));

/* ═══════ SY-08 자연어 질의 이력 ═══════ */
export async function loadChatHistory({ from, to, group, page, size }) {
  const data = await unwrapAll({
    summary: systemService.getAiChatHistorySummary({}),
    // 서버 파라미터는 userGroup 입니다. group 으로 보내면 조용히 무시됩니다
    list: systemService.getAiChatHistory({ from, to, userGroup: group, page, size }),
  });
  return { ...data, listMeta: data.metas?.list };
}
export const fetchChatDetail = (messageId) => unwrap(systemService.getAiChatHistoryByMessageId({ messageId }));
export const rateChatMessage = (messageId, rating) => command(aiService.postAiChatMessagesByMessageIdFeedback({ messageId, rating }));
export const exportTrainset = (ratingFilter) => command(systemService.postAiChatHistoryExportTrainset({ ratingFilter }));

/* ═══════ SY-09 보안 감사 로그 ═══════ */
/** 보안 감사 로그 — 목록과 페이지 정보를 함께 (건수가 많아 쪽 단위로 봅니다) */
/** 감사 로그 — 서버 파라미터는 userGroup 입니다 (group 으로 보내면 무시됩니다) */
export const loadAuditLogs = ({ group, ...rest }) =>
  unwrapPaged(systemService.getAuditLogs({ ...rest, userGroup: group }));

/**
 * 부서 선택지 — 화면에 부서명을 박아 두면 실제 부서명과 달라 조회가 0건이 됩니다.
 * (감사 로그가 '관리자' 를 보내고 있었는데 실제 부서명은 '통합관리자' 였습니다)
 * @returns {Promise<string[]>} 맨 앞이 '전체'
 */
export async function loadDeptOptions() {
  const data = await unwrap(systemService.getSystemDepts({}), { depts: [] });
  const names = (data?.depts || data?.items || []).map((d) => d.deptNm).filter(Boolean);
  return ['전체', ...names];
}

/* ═══════ SY-10 AI 모델 설정 ═══════ */
export function loadModelConfig() {
  return unwrapAll({
    config: systemService.getAiModelConfig({}),
    rules: systemService.getAiMaskRules({}),
  });
}
/**
 * AI 모델 설정 저장
 * @param {{ thresholds: Array<{key,value}>, classification: object }} config
 */
export const saveModelConfig = (config) => command(systemService.putAiModelConfig(config));
/** 보안 필터링 패턴 저장 — ruleId 가 있으면 수정, 없으면 신규 등록 */
export const saveMaskRule = (ruleId, v) =>
  command(ruleId ? systemService.putAiMaskRulesByRuleId({ ruleId, ...v }) : systemService.postAiMaskRules(v));

/* ═══════ SY-11 AI 모델 버전 관리 ═══════ */
export async function loadModelVersions({ page, size } = {}) {
  const data = await unwrapAll({
    // 임베딩 모델은 vec 스키마 기준정보입니다 (모델 자산 표와 별개)
    embedModels: systemService.getAiEmbedModels({}),
    assets: systemService.getAiAssets({ kind: 'LLM_BASE' }),
    summary: systemService.getAiModelReleasesSummary({}),
    releases: systemService.getAiModelReleases({ page, size }),
    vectors: systemService.getAiVectorBuilds({}),
    finetunes: systemService.getAiFinetuneBuilds({}),
    trend: systemService.getAiModelReleasesPerformanceTrend({}),
    logs: systemService.getAiModelReleasesDeployLogs({}),
  });
  return { ...data, releasesMeta: data.metas?.releases };
}
export const fetchApplyPreview = (ver) => unwrap(systemService.getAiModelReleasesByVerApplyPreview({ ver }));
export const applyRelease = (ver, mode) => command(systemService.postAiModelReleasesByVerApply({ ver, mode }));
export const rollbackRelease = () => command(systemService.postAiModelReleasesRollback({}));
export const archiveRelease = (ver) => command(systemService.postAiModelReleasesByVerArchive({ ver }));
export const createRelease = (v) => command(systemService.postAiModelReleases(v));
export const runVectorBuild = (v) => command(systemService.postAiVectorBuilds(v));
export const runFinetune = (v) => command(systemService.postAiFinetuneBuilds(v));
export const fetchVectorBuild = (vecId) => unwrap(systemService.getAiVectorBuildsByVecId({ vecId }));
export const fetchFinetuneBuild = (ftId) => unwrap(systemService.getAiFinetuneBuildsByFtId({ ftId }));

/* ═══════ SY-12 Agent 실행 현황 ═══════ */
/**
 * Agent 실행 현황
 *
 * 실행 이력은 Agent 를 골랐을 때만 조회합니다.
 * 코드가 비면 `/ai/agents//runs` 처럼 빈 경로가 만들어져 404 가 납니다.
 */
export function loadAgents(agentCd) {
  return unwrapAll({
    summary: systemService.getAiAgentsSummary({}),
    agents: systemService.getAiAgents({}),
    pipeline: systemService.getAiAgentsPipeline({}),
    ...(agentCd ? { runs: systemService.getAiAgentsByAgentCdRuns({ agentCd }) } : {}),
  });
}
export const restartAgent = (v) => command(systemService.postAiAgentsByAgentCdRestart(v));

/* ═══════ SY-13 지표 측정 데이터 관리 ═══════ */
export async function loadMetricStandards({ category, enabled, grade, page, size }) {
  const data = await unwrapAll({
    summary: systemService.getMetricsStandardsSummary({}),
    list: systemService.getMetricsStandards({ category, enabled, grade, page, size }),
    history: systemService.getMetricsStandardsHistory({ size: 6 }),
  });
  return { ...data, listMeta: data.metas?.list };
}
export const createMetricStandard = (v) => command(systemService.postMetricsStandards(v));
/**
 * 지표 기준 수치 수정
 *
 * 서버는 바꿀 항목을 **본문 필드 이름 그대로** 받습니다(normal · warn · critical · window · basis).
 * 예전엔 {field, value} 쌍으로 보내서 200 "수정되었습니다" 만 오고 값은 그대로였습니다.
 *
 * @param {number} stdId
 * @param {'normal'|'warn'|'critical'|'window'|'basis'} field
 * @param {*} value
 */
export const updateMetricValue = (stdId, field, value) =>
  command(systemService.putMetricsStandardsByStdId({ stdId, [field]: value }));
export const toggleMetricState = (stdId) => command(systemService.patchMetricsStandardsByStdIdState({ stdId }));
export const fetchMetricUsage = (stdId) => unwrap(systemService.getMetricsStandardsByStdIdUsage({ stdId }));

/* ═══════ SY-14 보고서 다운로드 이력 ═══════ */
export async function loadDownloadLogs(params) {
  const data = await unwrapAll({
    summary: systemService.getDownloadLogsSummary({}),
    list: systemService.getDownloadLogs(params),
  });
  return { ...data, listMeta: data.metas?.list };
}
export const fetchRetentionPolicy = () => unwrap(systemService.getDownloadLogsRetentionPolicy({}));

/* ═══════ SY-15 데이터 연동 이력 ═══════ */
export async function loadSyncHistory({ state, kind, driftSide, driftResolved, page, size }) {
  const data = await unwrapAll({
    summary: systemService.getSyncJobsSummary({}),
    list: systemService.getSyncJobs({ state, kind, page, size }),
    // 엔진 1회 실행 단위. 표 작업까지 가지 못한 실행(원본 접속 실패 등)은 jobs 에 안 남습니다
    runs: systemService.getSyncRuns({ size: 20 }),
    maps: systemService.getSyncMaps({}),
    policy: systemService.getSyncPolicy({}),
    // 스키마 드리프트 — 이관 정의와 실제 DB 구성이 어긋난 사실 (이관 엔진이 배치마다 기록)
    driftSummary: systemService.getSyncSchemaDriftSummary({}),
    drifts: systemService.getSyncSchemaDrift({ side: driftSideCode(driftSide), resolved: driftResolved }),
  });
  return { ...data, listMeta: data.metas?.list };
}

/** 스키마 드리프트 해소 처리 — 원인이 남아 있으면 다음 배치에서 다시 열립니다 */
export const resolveSchemaDrift = (driftId, note) =>
  command(systemService.postSyncSchemaDriftByDriftIdResolve({ driftId, note }));
export const fetchSyncJob = (jobId) => unwrap(systemService.getSyncJobsByJobId({ jobId }));
export const retrySyncJob = (jobId) => command(systemService.postSyncJobsByJobIdRetry({ jobId }));
export const runManualSync = (v) => command(systemService.postSyncJobsManual(v));
export const testConnection = () => command(systemService.postSyncConnectionTest({}));

/* ═══════ 추가 함수 (SY-08 · SY-13 · SY-14 — 기존 함수는 그대로 두고 덧붙였습니다) ═══════ */

/**
 * 부서 선택지 (코드값) — 다운로드 이력의 `deptId` 처럼 부서 **ID** 를 받는 조회용.
 * `loadDeptOptions` 는 이름만 돌려주므로 ID 가 필요한 화면은 이것을 씁니다.
 * @returns {Promise<Array<{value:string,label:string}>>}
 */
export async function loadDeptIdOptions() {
  const data = await unwrap(systemService.getSystemDepts({}), { items: [] });
  return (data?.items || data?.depts || [])
    .filter((d) => (d.deptId ?? d.id) != null && (d.deptNm ?? d.name))
    .map((d) => ({ value: String(d.deptId ?? d.id), label: d.deptNm ?? d.name }));
}

/**
 * 지표 기준 목록 — 서버 파라미터 이름(applied · level)으로 보냅니다.
 *
 * `loadMetricStandards` 는 enabled · grade 로 보내는데 서버는 그 이름을 몰라 조용히 무시했습니다
 * (적용 상태·판정 필터가 무엇을 골라도 전체가 나왔습니다).
 * @param {{category?:string, applied?:boolean, level?:string, page?:number, size?:number}} p
 */
export async function loadMetricStandardsFiltered({ category, applied, level, page, size }) {
  const data = await unwrapAll({
    summary: systemService.getMetricsStandardsSummary({}),
    list: systemService.getMetricsStandards({ category, applied, level, page, size }),
    history: systemService.getMetricsStandardsHistory({ size: 6 }),
  });
  return { ...data, listMeta: data.metas?.list };
}

/**
 * 지표 적용/해제 — 서버 본문은 `on(true|false)` 입니다 (카탈로그의 `applied` 는 E-VALID-001 로 거부됩니다).
 * 본문 없이 보내면 토글되는데, 화면이 보는 값과 어긋날 수 있어 목표 상태를 명시해 보냅니다.
 */
export const setMetricApplied = (stdId, on) =>
  command(systemService.patchMetricsStandardsByStdIdState({ stdId, on }));

/**
 * 학습데이터 내보내기 — 서버가 받는 항목은 from · to · yearMonth · scope · format 입니다.
 * 카탈로그의 `ratingFilter` 는 서버가 거부합니다(E-VALID-001) → 기간으로 내보냅니다.
 */
export const exportTrainsetByRange = ({ from, to }) =>
  command(systemService.postAiChatHistoryExportTrainset({ from, to, format: 'jsonl' }));
