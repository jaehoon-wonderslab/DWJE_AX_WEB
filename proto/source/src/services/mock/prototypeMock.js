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
