import { dashboardMock } from './dashboardMock';
import { reportMock } from './reportMock';
import { systemMock } from './systemMock';
import { productionMock } from './productionMock';
import { qualityMock } from './qualityMock';
import { DEFAULT_USER, USERS } from '@shared/constants/accounts';
import { DEPTS } from '@shared/constants/dataFields';
import { PRODUCTS, PROCESSES } from './data/masters';
import { SCRAP_MES_VOUCHERS } from './data/reports';
const savedRows = {};
const metric = (qty, ngQty) => ({qty, ngQty, okQty:qty-ngQty, defectRate: +(ngQty/qty*100).toFixed(2), yieldRate: +((qty-ngQty)/qty*100).toFixed(2)});
export const prototypeMock = {
  getDashboardProcessPeriod: ({from, to, productCodes = [], processId}) => {
    const products = PRODUCTS.slice(0,12).filter(p=>!productCodes.length || productCodes.includes(p.code)).map((p,i)=>({code:p.code, productNm:p.code, ...metric(12000+i*1200,180+i*40)}));
    const summary = metric(products.reduce((s,p)=>s+p.qty,0)||1,products.reduce((s,p)=>s+p.ngQty,0));
    return {from,to,summary, products, processes:PROCESSES.filter(p=>!processId||p.id===processId).map(p=>({processId:p.id,process:p.name,...summary})), periods:[{period:from,...summary}]};
  },
  getProductionDailyReportsSheet: ({targetDate}) => ({weekDays:5, processCds:['Press'], rows: PRODUCTS.slice(0,8).map((p,i)=>({product:p.code, productNm:p.code, processId:'Press', processNm:'프레스', ...metric(12000+i*500,160+i*20), eqptCnt:2, weekQty:56000+i*2500, weekQtyAllShift:110000+i*5000, targetQty:13000+i*500,targetQtyOrigin:'MANUAL',decision:'금형 상태 확인',dri:'생산 담당',due:targetDate,...savedRows[targetDate]?.[p.code]}))}),
  postProductionDailyReportsRows: ({targetDate,rows}) => { savedRows[targetDate] ||= {}; rows.forEach(r=>savedRows[targetDate][r.product]=r); return {success:true,message:'샘플 행을 저장했습니다.'}; },
  getReportsScrapMesVouchers: ({originType}) => ({items:SCRAP_MES_VOUCHERS.filter(v=>!originType||v.originType===originType).map(v=>({...v,remark:v.defectType,scrapKind:'DEFECT'}))}),
};

// Current screen contracts. Values are synthetic and stay in this browser session.
const percent = (n, d) => d ? Math.round(n / d * 10000) / 100 : 0;
const types = ['치수불량', '찍힘', '스크래치', '변형'];
const products = PRODUCTS.slice(0, 8).map((p, i) => {
  const totalQty = 18000 + i * 1700;
  const quantities = types.map((_, t) => 80 + i * 11 + t * 27);
  const ngQty = quantities.reduce((a, b) => a + b, 0);
  return { level: 'item', name: p.code, itemCd: p.code, itemNm: p.code, totalQty, ngQty, okQty: totalQty - ngQty, defectRate: percent(ngQty, totalQty),
    children: types.map((name, t) => ({ level: 'defect', defectCd: `D${t}`, defectNm: name, itemCd: p.code, itemNm: p.code,
      totalQty, ngQty: quantities[t], ratio: percent(quantities[t], ngQty), defectRate: percent(quantities[t], totalQty),
      children: [0, 1].map(line => ({ level: 'eqpt', name: `PR-0${line + 1}`, eqptCd: `PR-0${line + 1}`, eqptNm: `프레스 ${line + 1}호기`, plantNm: '베트남 공장', wcCd: 'Press', wcNm: '프레스', itemNm: p.code, defectNm: name,
        totalQty: totalQty / 2, ngQty: line ? quantities[t] - Math.floor(quantities[t] / 2) : Math.floor(quantities[t] / 2), ratio: 50,
      })),
    })),
  };
});
const totalQty = products.reduce((n, p) => n + p.totalQty, 0), ngQty = products.reduce((n, p) => n + p.ngQty, 0);
Object.assign(prototypeMock, {
  getQualityDefectsSummary: () => ({ totalQty, ngQty, totalCnt: ngQty, defectRate: percent(ngQty, totalQty), momChange: '-0.4%p' }),
  getQualityDefectsByType: () => ({ items: types.map((defectType, t) => ({ defectType, defectCd: `D${t}`, cnt: products.reduce((n, p) => n + p.children[t].ngQty, 0) })) }),
  getQualityDefectsByProduct: () => ({ items: products, totals: { totalQty, ngQty } }),
  getQualityDefectsTree: () => ({ totals: { totalQty, ngQty }, items: [0, 1].map(line => ({ level: 'eqpt', eqptCd: `PR-0${line + 1}`, eqptNm: `프레스 ${line + 1}호기`, plantNm: '베트남 공장', totalQty: totalQty / 2, okQty: (totalQty - ngQty) / 2, ngQty: ngQty / 2, defectRate: percent(ngQty, totalQty),
    children: [{ level: 'wc', wcCd: 'Press', wcNm: '프레스', ngQty: ngQty / 2, okQty: (totalQty - ngQty) / 2,
      children: products.map(p => ({ ...p, ngQty: p.ngQty / 2, okQty: p.okQty / 2, children: p.children.map(t => ({ ...t, children: undefined, ngQty: t.children[line].ngQty })) })),
    }],
  })) }),
  getSystemUsersPending: () => ({ items: [], meta: { page: 1, size: 10, total: 0 } }),
  postSystemUsersByEmpNoApprove: () => ({ success: true, message: '데모 계정을 승인했습니다.' }),
  getDashboardAiLineProducts: () => ({ items: products.map(p => ({ ...p, product: p.itemCd, code: p.itemCd, qty: p.totalQty })), products: products.map(p => ({ code: p.itemCd, qty: p.totalQty, ngQty: p.ngQty, okQty: p.okQty })) }),
  postAiMaskRules: () => ({ success: true, message: '샘플 규칙을 저장했습니다.' }),
  postAiMaskRulesByRuleId: () => ({ success: true, message: '샘플 규칙을 적용했습니다.' }),
  getAiEmbedModels: () => ({ items: [{ id: 'demo-embedding', name: 'Demo Embedding', state: '사용' }] }),
  getAiAssets: () => ({ items: [{ assetId: 'demo-llm', name: '품질 분석 데모 모델', kind: 'LLM_BASE', version: '1.0', state: 'READY' }] }),
  getSyncRuns: () => ({ items: [] }),
});

Object.assign(prototypeMock, {
  getAuthSwitchTargets: () => USERS.filter(u => u.switchable),
  getAuthSignupCheckEmpNo: () => ({ available: true }),
  getAuthSignupDepts: () => ({ items: DEPTS, depts: DEPTS }),
  postAuthEmailSendCode: () => ({ success: true, message: '데모 인증번호는 123456입니다.', data: { expiresIn: 300 } }),
  postAuthEmailVerifyCode: ({ code }) => ({ success: code === '123456', message: code === '123456' ? '인증 완료' : '데모 인증번호는 123456입니다.', data: { verified: code === '123456', verificationToken: 'demo-verified' } }),
  postAuthSignup: () => ({ success: true, message: '데모 가입 요청을 접수했습니다. 로그인은 admin 계정을 사용하세요.' }),
  postAuthPassword: () => ({ success: true, message: '데모 비밀번호는 Demo!2026으로 유지됩니다.' }),
  postAuthPasswordForgot: () => ({ success: true, message: '데모 비밀번호는 Demo!2026입니다.' }),
  postAuthPasswordReset: () => ({ success: true, message: '데모 비밀번호는 Demo!2026입니다.' }),
  getProductionResults: (params) => {
    const result = productionMock.getProductionResults({});
    const end = new Date(`${params.to || new Date().toISOString().slice(0, 10)}T12:00:00Z`);
    const items = result.items.map((row, i) => { const day = new Date(end); day.setUTCDate(day.getUTCDate() - i); return { ...row, period: day.toISOString().slice(0, 10) }; }).filter(row => !params.from || row.period >= params.from);
    const summary = items.reduce((a, r) => ({ inputQty: a.inputQty + r.inputQty, okQty: a.okQty + r.okQty, ngQty: a.ngQty + r.ngQty }), { inputQty: 0, okQty: 0, ngQty: 0 });
    return { items, summary: { ...summary, defectRate: percent(summary.ngQty, summary.inputQty) }, meta: { page: 1, size: 0, total: items.length } };
  },
  getProductionResultsTrend: params => {
    const rows = prototypeMock.getProductionResults(params).items.slice().reverse();
    return { labels: rows.map(r => r.period.slice(5).replace('-', '/')), series: [{ name: '생산량 (EA)', data: rows.map(r => r.inputQty) }, { name: '불량 수량 (EA)', data: rows.map(r => r.ngQty) }] };
  },
  getQualityAoiDimensionSerials: params => qualityMock.getQualityAoiDefects({ page: params.page, size: params.size }),
  getQualityAoiDimensionSerialByKey: params => qualityMock.getQualityAoiDefectsByDefectId({ defectId: params.serialKey }),
});

const numberOf = value => Number(String(value ?? '').replace(/[,％%]/g, '')) || 0;
const modelConfig = {
  thresholds: [{ key: 'defect_rate', metric: '불량률 경고 기준', value: 3, unit: '%', valueType: 'NUM', agent: '품질 분석' }, { key: 'target_gap', metric: '계획 대비 미달 기준', value: 15, unit: '%', valueType: 'NUM', agent: '생산 분석' }],
  classification: { raw: { judge_boundary: 0.6, borderline_range: 0.1, hitl_criteria: '경계 구간 담당자 확인' } },
};
Object.assign(prototypeMock, {
  getAiModelConfig: () => modelConfig,
  putAiModelConfig: ({ thresholds, classification }) => {
    if (thresholds) modelConfig.thresholds = modelConfig.thresholds.map(t => ({ ...t, value: thresholds.find(n => n.key === t.key)?.value ?? t.value }));
    if (classification) modelConfig.classification.raw = { ...classification };
    return { success: true, message: '데모 설정을 저장했습니다.' };
  },
  getAiMaskRules: () => ({ items: systemMock.getAiMaskRules().items.map(r => ({ ...r, targetFields: r.targetFields || r.fields.split(',').map(s => s.trim()), useYn: r.useYn || 'Y', action: r.action === '마스킹' ? 'MASK' : r.action })) }),
  postAiMaskRules: params => systemMock.putAiMaskRulesByRuleId(params),
  getSystemDepts: params => ({ ...systemMock.getSystemDepts(params), items: systemMock.getSystemDepts(params).items.map(d => ({ ...d, name: d.name || d.id, abbr: d.av, superAdmin: d.id === '통합관리자' })) }),
  getSystemPermLogs: params => systemMock.getSystemPermLogs({ ...params, size: params.size || 1000 }),
  getDashboardProcessProductProduction: () => ({ items: products.map(p => ({ product: p.itemCd, qty: p.totalQty, okQty: p.okQty, ngQty: p.ngQty, defectRate: p.defectRate })) }),
  getReportsYieldByModel: params => {
    const data = reportMock.getReportsYieldByModel(params);
    const lossTypes = ['치수불량', '찍힘', '변형'];
    const rows = data.rows.map(r => ({ ...r, date: params.yearMonth, inputQty: numberOf(r.input), okQty: numberOf(r.good), ngQty: numberOf(r.ng), yield: numberOf(r.yieldRate), defectRate: numberOf(r.ngRate), loss: Object.fromEntries(lossTypes.map((name, i) => [name, numberOf(r.lossA[i])])), mgmt: { 기타: numberOf(r.lossB[0]) } }));
    const summary = rows.reduce((a, r) => ({ inputQty: a.inputQty + r.inputQty, okQty: a.okQty + r.okQty, ngQty: a.ngQty + r.ngQty }), { inputQty: 0, okQty: 0, ngQty: 0 });
    return { ...data, rows, lossTypes, mgmtTypes: ['기타'], summary: { ...summary, yield: percent(summary.okQty, summary.inputQty), defectRate: percent(summary.ngQty, summary.inputQty) } };
  },
  getDownloadLogs: params => {
    const data = systemMock.getDownloadLogs({});
    const day = params.to || new Date().toISOString().slice(0, 10);
    return { ...data, items: data.items.map(r => ({ ...r, ts: day + ' ' + r.ts.slice(11), empNo: '20140901', name: r.user, report: r.reportName, reportId: 'prod-result', rowCnt: r.rowCount, blindCnt: r.blindCount })) };
  },
});

Object.assign(prototypeMock, {
  getDashboardAiDefectTrend: params => {
    const data = dashboardMock.getDashboardAiDefectTrend(params);
    const date = params.to || params.date || new Date().toISOString().slice(0, 10);
    const slots = Array.from({ length: 12 }, (_, i) => ({ slot: `${date} ${String(i * 2).padStart(2, '0')}시`, inputQty: 8000 + i * 300, okQty: 7800 + i * 290, ngQty: 200 + i * 10, defectRate: percent(200 + i * 10, 8000 + i * 300) }));
    return { ...data, slots, bucket: { unit: 'HOUR', size: 2 }, period: { from: date, to: date } };
  },
  getQualityAoiDimensionSerials: params => {
    const res = qualityMock.getQualityAoiDefects({ page: params.page, size: params.size });
    return { ...res, data: { ...res.data, items: res.data.items.map((d, i) => ({ ...d, serialKey: d.defectId, wcCd: d.processId || 'S110', firstAt: `${params.date} 08:00:00`, lastAt: `${params.date} 16:30:00`, seqMax: d.seqMin + d.seqCnt - 1, failSeqs: Array.from({ length: 20 }, (_, n) => d.seqMin + n * 3), failSeqsTruncated: true })) } };
  },
  getQualityAoiDimensionSerialByKey: params => {
    const res = qualityMock.getQualityAoiDefectsByDefectId({ defectId: params.serialKey });
    if (!res.success) return res;
    const data = res.data;
    const items = params.only === 'all' ? data.items.flatMap(row => [row, { ...row, seq: row.seq + 1, passed: true }]).slice(0, 100) : data.items;
    return { ...res, data: { ...data, serialKey: params.serialKey, wcCd: data.processId || 'S110', items, seqReturned: items.length, seqTruncated: true, only: params.only || 'ng' } };
  },
});
