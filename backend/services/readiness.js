let vectorModelReady = false;

function isVectorModelReady() {
  return vectorModelReady;
}

function setVectorModelReady(ready) {
  vectorModelReady = Boolean(ready);
}

function isSemanticEnabled() {
  return process.env.SEMANTIC_SEARCH_ENABLED !== 'false';
}

function isReady() {
  return !isSemanticEnabled() || vectorModelReady;
}

module.exports = {
  isVectorModelReady,
  setVectorModelReady,
  isSemanticEnabled,
  isReady,
};
