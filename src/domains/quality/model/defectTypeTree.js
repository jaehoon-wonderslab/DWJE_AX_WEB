/**
 * 제품→유형 트리를 유형→제품으로 전환합니다. 생산 분모는 제품마다 한 번만 셉니다.
 * @param {object} [opt] { rateOk } — 불량률을 볼 수 있는지(데이터 접근 권한). false 면 불량률을 다시 계산하지 않습니다
 */
export function defectTypeTree(products = [], { rateOk = true } = {}) {
  const sumKnown = values => values.some(v => v == null) ? null : values.reduce((sum, v) => sum + Number(v), 0);
  const percent = (n, d) => n == null || d == null || d <= 0 ? null : Math.round(n / d * 10000) / 100;
  const totalQty = sumKnown(products.map(p => p.totalQty));
  const totalNg = sumKnown(products.map(p => p.ngQty));
  const groups = new Map();
  products.forEach((product, pi) => {
    (product._children || []).forEach((type, ti) => {
      const identity = type.defectCd == null ? 'unknown' : 'code:' + type.defectCd;
      let group = groups.get(identity);
      if (!group) {
        group = { key: 'type/' + identity, level: 'defect', levelLabel: '불량 유형',
          defectCd: type.defectCd, defectNm: type.defectNm || '유형 미상', totalQty, _children: [] };
        groups.set(identity, group);
      }
      const key = group.key + '/item:' + pi + ':' + ti;
      const cloneChildren = (nodes, parent) => (nodes || []).map((n, i) => ({
        ...n, key: parent + '/' + i,
        ...(n._children?.length ? { _children: cloneChildren(n._children, parent + '/' + i) } : {}),
      }));
      group._children.push({ ...type, key, level: 'item', levelLabel: '제품',
        itemCd: product.itemCd, itemNm: product.itemNm,
        _children: cloneChildren(type._children, key) });
    });
  });
  return [...groups.values()].map(group => {
    const ngQty = sumKnown(group._children.map(r => r.ngQty));
    // 서버가 가린 불량률을 수량으로 다시 계산해 되살리지 않습니다(2026-10-07 데이터 항목 설계 7.1)
    return { ...group, ngQty, defectRate: rateOk ? percent(ngQty, totalQty) : null, ratio: percent(ngQty, totalNg),
      _children: group._children.map(r => ({ ...r, ratio: percent(r.ngQty, ngQty) }))
        .sort((a,b) => (b.ngQty || 0) - (a.ngQty || 0)) };
  }).sort((a,b) => (b.ngQty || 0) - (a.ngQty || 0));
}
