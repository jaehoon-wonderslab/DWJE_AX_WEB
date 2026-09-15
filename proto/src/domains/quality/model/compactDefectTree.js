/** 최상위 분류 아래의 단일 상세는 상위 행에 표시합니다. 수량·비율은 상위 기준을 보존합니다. */
const DIMENSIONS = ['plantCd', 'plantNm', 'wcCd', 'wcNm', 'itemCd', 'itemNm', 'eqptCd', 'eqptNm', 'defectCd', 'defectNm'];
export function compactDefectTree(rows = [], depth = 1) {
  return rows.map(row => {
    const merged = { ...row };
    let children = row._children || [];
    // 최상위 분류는 유지하고 그 아래의 단일 경로는 단계와 무관하게 합칩니다.
    while (depth >= 2 && children.length === 1) {
      const child = children[0];
      const sameQuantity = merged.ngQty == null && child.ngQty == null ||
        merged.ngQty != null && child.ngQty != null && Number(merged.ngQty) === Number(child.ngQty);
      if (!sameQuantity) break;
      DIMENSIONS.forEach(field => {
        if ((merged[field] == null || merged[field] === '') && child[field] != null) merged[field] = child[field];
      });
      merged.mergedLevelLabel = child.levelLabel;
      children = child._children || [];
    }
    delete merged.children;
    if (children.length) merged._children = compactDefectTree(children, depth + 1);
    else delete merged._children;
    return merged;
  });
}
