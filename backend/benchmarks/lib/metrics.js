/**
 * IR evaluation metrics for search benchmarks.
 */

function reciprocalRank(relevantIds, rankedIds) {
  for (let i = 0; i < rankedIds.length; i++) {
    if (relevantIds.includes(rankedIds[i])) return 1 / (i + 1);
  }
  return 0;
}

function meanReciprocalRank(queries) {
  if (!queries.length) return 0;
  const sum = queries.reduce((acc, q) => acc + reciprocalRank(q.relevantIds, q.rankedIds), 0);
  return sum / queries.length;
}

function precisionAtK(relevantIds, rankedIds, k) {
  const top = rankedIds.slice(0, k);
  if (!top.length) return 0;
  const hits = top.filter((id) => relevantIds.includes(id)).length;
  return hits / k;
}

function averagePrecision(relevantIds, rankedIds) {
  if (!relevantIds.length) return 0;
  let hits = 0;
  let sumPrec = 0;
  for (let i = 0; i < rankedIds.length; i++) {
    if (relevantIds.includes(rankedIds[i])) {
      hits += 1;
      sumPrec += hits / (i + 1);
    }
  }
  return sumPrec / relevantIds.length;
}

function ndcgAtK(relevantIds, rankedIds, k) {
  const top = rankedIds.slice(0, k);
  const dcg = top.reduce((acc, id, i) => {
    const rel = relevantIds.includes(id) ? 1 : 0;
    return acc + rel / Math.log2(i + 2);
  }, 0);
  const idealHits = Math.min(relevantIds.length, k);
  let idcg = 0;
  for (let i = 0; i < idealHits; i++) {
    idcg += 1 / Math.log2(i + 2);
  }
  return idcg === 0 ? 0 : dcg / idcg;
}

function summarizeSearchBenchmark(evaluations) {
  if (!evaluations.length) {
    return {
      count: 0,
      mrr: null,
      precisionAt5: null,
      ndcgAt10: null,
      map: null,
    };
  }
  const n = evaluations.length;
  return {
    count: n,
    mrr: meanReciprocalRank(evaluations),
    precisionAt5:
      evaluations.reduce((s, e) => s + precisionAtK(e.relevantIds, e.rankedIds, 5), 0) / n,
    ndcgAt10:
      evaluations.reduce((s, e) => s + ndcgAtK(e.relevantIds, e.rankedIds, 10), 0) / n,
    map: evaluations.reduce((s, e) => s + averagePrecision(e.relevantIds, e.rankedIds), 0) / n,
  };
}

module.exports = {
  reciprocalRank,
  meanReciprocalRank,
  precisionAtK,
  ndcgAtK,
  averagePrecision,
  summarizeSearchBenchmark,
};
