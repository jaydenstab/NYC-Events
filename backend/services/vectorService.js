const aiOrchestrator = require('./aiOrchestrator');
const dbService = require('./dbService');
const jobQueue = require('./jobQueue');
const { rowToEvent } = require('../utils/rowToEvent');
const { isPostgres } = require('./db');
const { logger } = require('../logger');

const MAX_INDEX_SIZE = parseInt(process.env.VECTOR_INDEX_MAX, 10) || 5000;

class VectorService {
  constructor() {
    this.index = [];
    this.indexVersion = 0;
    this.indexingInProgress = false;
    this.lastIndexError = null;
    this.pendingEvents = [];
    this._pgReady = null;
  }

  filterEventsNeedingIndex(events) {
    if (!events || events.length === 0) return [];
    if (isPostgres()) return events.filter((e) => e && e.id);
    const indexedIds = new Set(this.index.map((item) => item.id));
    return events.filter((e) => e && e.id && !indexedIds.has(e.id));
  }

  async isIndexReady() {
    if (isPostgres()) {
      const count = await dbService.countEventVectors();
      return count > 0;
    }
    return this.index.length > 0;
  }

  isIndexing() {
    return this.indexingInProgress;
  }

  getIndexVersion() {
    return this.indexVersion;
  }

  getLastIndexError() {
    return this.lastIndexError;
  }

  async warmup() {
    if (process.env.SEMANTIC_SEARCH_ENABLED === 'false') return;
    await this.init();
    await this.generateEmbedding('warmup query nyc events');
  }

  async init() {
    if (isPostgres()) {
      this._pgReady = (await dbService.countEventVectors()) > 0;
      this.indexVersion = await dbService.countEventVectors();
      return;
    }

    if (this.index.length > 0) return;

    logger.info('vector_service_hydration_start');
    try {
      const stored = await dbService.getIndexedVectors();
      this.index = stored.map((row) => ({
        id: row.id,
        vector: JSON.parse(row.vector_json),
        event: rowToEvent(row),
      }));
      logger.info('vector_service_hydrated', { count: this.index.length });
      if (this.index.length > 0) {
        this.indexVersion = this.index.length;
      }
    } catch (err) {
      logger.warn('vector_service_hydration_failed', { message: err.message });
    }
  }

  async generateEmbedding(text) {
    return await aiOrchestrator.embed(text);
  }

  cosineSimilarity(vecA, vecB) {
    if (!vecA?.length || !vecB?.length) return 0;
    if (vecA.length !== vecB.length) {
      logger.warn('vector_dimension_mismatch', { a: vecA.length, b: vecB.length });
      return 0;
    }
    const len = vecA.length;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < len; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dotProduct / denom;
  }

  async upsertEvents(events) {
    logger.info('vector_service_upsert_start', { count: events.length });

    for (const event of events) {
      if (!isPostgres() && this.index.find((item) => item.id === event.id)) continue;

      const textToEmbed = `${event.name}. ${event.description}. Category: ${event.category}`;
      try {
        const vector = await this.generateEmbedding(textToEmbed);
        await dbService.saveVector(event.id, vector);
        if (!isPostgres()) {
          this.index.push({ id: event.id, vector, event: rowToEvent(event) || event });
          if (this.index.length > MAX_INDEX_SIZE) {
            this.index = this.index.slice(-MAX_INDEX_SIZE);
          }
        }
      } catch (err) {
        logger.warn('embedding_failed', { id: event.id, message: err.message });
      }
    }

    this.indexVersion += 1;
    logger.info('vector_service_upsert_done', {
      totalIndexed: isPostgres() ? await dbService.countEventVectors() : this.index.length,
      indexVersion: this.indexVersion,
    });
  }

  startIndexing(events) {
    const toIndex = this.filterEventsNeedingIndex(events);
    if (toIndex.length === 0) return;

    if (jobQueue.useBullMQ()) {
      const ids = toIndex.map((e) => e.id);
      jobQueue.enqueueBackgroundJob('embed_events', { eventIds: ids }).catch((err) => {
        logger.error('embed_enqueue_failed', { message: err.message });
      });
      return;
    }

    if (this.indexingInProgress) {
      const pendingIds = new Set(this.pendingEvents.map((e) => e.id));
      for (const event of toIndex) {
        if (!pendingIds.has(event.id)) {
          this.pendingEvents.push(event);
          pendingIds.add(event.id);
        }
      }
      return;
    }

    this.indexingInProgress = true;
    this.lastIndexError = null;

    this._runIndexingBatch(toIndex)
      .catch((err) => {
        this.lastIndexError = err.message;
        logger.error('vector_background_index_failed', { message: err.message });
      })
      .finally(() => {
        this.indexingInProgress = false;
        if (this.pendingEvents.length > 0) {
          const next = this.pendingEvents.splice(0);
          this.startIndexing(next);
        }
      });
  }

  async _runIndexingBatch(events) {
    await this.upsertEvents(events);
  }

  async embedEventIds(eventIds) {
    if (!eventIds?.length) return;
    const events = await dbService.getEventsByIds(eventIds);
    await this.upsertEvents(events);
  }

  /**
   * Semantic search over indexed events.
   * @param {string} query - Natural language search query
   * @param {number} [limit=50] - Max results
   * @returns {Promise<Array<object>>} Events with optional score field
   */
  async search(query, limit = 50) {
    if (!query) return [];

    if (isPostgres()) {
      const ready = await this.isIndexReady();
      if (!ready) return [];
      logger.info('vector_service_search_start', { query, limit, driver: 'postgres' });
      const queryVector = await this.generateEmbedding(query);
      const results = await dbService.semanticSearch(queryVector, limit);
      logger.info('vector_service_search_done', {
        topScore: results[0]?.score,
        count: results.length,
      });
      return results;
    }

    await this.init();
    if (this.index.length === 0) return [];

    logger.info('vector_service_search_start', { query, limit });
    const queryVector = await this.generateEmbedding(query);

    const results = this.index
      .map((item) => ({
        ...(item.event || rowToEvent(item.event) || {}),
        score: this.cosineSimilarity(queryVector, item.vector),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    logger.info('vector_service_search_done', { topScore: results[0]?.score, count: results.length });
    return results;
  }

  /**
   * Reciprocal Rank Fusion across multiple ranked result lists.
   * @param {Array<Array<object>>} resultSets
   * @param {number} [k=60]
   */
  reciprocalRankFusion(resultSets, k = 60) {
    const scores = new Map();
    const eventMap = new Map();

    for (const results of resultSets) {
      if (!results?.length) continue;
      results.forEach((event, rank) => {
        if (!event?.id) return;
        const rrf = 1 / (k + rank + 1);
        scores.set(event.id, (scores.get(event.id) || 0) + rrf);
        if (!eventMap.has(event.id)) eventMap.set(event.id, event);
      });
    }

    return [...scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id, score]) => ({ ...eventMap.get(id), score }));
  }

  /**
   * Hybrid search: semantic (pgvector) + lexical (Postgres FTS / SQLite keyword).
   */
  async hybridSearch(query, limit = 50) {
    if (!query) return [];

    const fetchLimit = Math.min(limit * 2, 100);
    const semanticPromise = this.isIndexReady().then((ready) =>
      ready ? this.search(query, fetchLimit) : Promise.resolve([])
    );
    const bm25Promise = dbService.fullTextSearch(query, fetchLimit);

    const [semanticResults, bm25Results] = await Promise.all([semanticPromise, bm25Promise]);

    if (semanticResults.length === 0 && bm25Results.length === 0) return [];
    if (semanticResults.length === 0) {
      return bm25Results.slice(0, limit).map((e, i) => ({
        ...e,
        score: e.bm25Score ?? 1 / (i + 1),
      }));
    }
    if (bm25Results.length === 0) return semanticResults.slice(0, limit);

    logger.info('vector_service_hybrid_search', {
      query,
      semanticCount: semanticResults.length,
      bm25Count: bm25Results.length,
    });

    return this.reciprocalRankFusion([semanticResults, bm25Results]).slice(0, limit);
  }
}

module.exports = new VectorService();
