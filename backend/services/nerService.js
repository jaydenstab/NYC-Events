const aiOrchestrator = require('./aiOrchestrator');
const { VALID_CATEGORIES } = require('../utils/categoryNormalize');
const { logger } = require('../logger');

/**
 * Service for Named Entity Recognition and Event Classification.
 * Delegated to background worker threads to keep the event loop non-blocking.
 */
class LocalNerService {
  constructor() {
    this.categories = Array.from(VALID_CATEGORIES);
  }

  async init() {
    // Background worker initializes lazily or on first use.
    // No-op here to satisfy legacy startup calls.
  }

  /**
   * Extracts structured event data from raw text.
   * @param {string} text - Raw text blob from a scraper.
   * @returns {Promise<Object>} Refined event data.
   */
  async extract(text) {
    if (!text || text.length < 10) return null;

    try {
      // ML tasks (Classification, NER, Chrono) are offloaded to worker_threads
      const aiResult = await aiOrchestrator.extractAll(text, this.categories);

      // Simple heuristic for event name if AI result is weak
      const eventName = this._extractNameHeuristic(text);
      const price = this._extractPriceRegex(text);

      return {
        eventName: aiResult.eventName || eventName,
        address: aiResult.address || 'New York, NY',
        startTime: aiResult.startTime || 'TBD',
        date: aiResult.date || 'TBD',
        price: price || 'Unknown',
        category: aiResult.category || 'Other',
        description: text.length > 500 ? text.substring(0, 500) + '...' : text
      };
    } catch (err) {
      logger.error('ner_service_extract_failed', { message: err.message });
      return null;
    }
  }

  _extractNameHeuristic(text) {
    const firstLine = text.split('\n')[0].trim();
    return firstLine.length > 5 ? firstLine.substring(0, 100) : 'Unknown Event';
  }

  _extractPriceRegex(text) {
    if (text.toLowerCase().includes('free')) return 'Free';
    const match = text.match(/\$\d+/);
    return match ? match[0] : 'Unknown';
  }
}

module.exports = new LocalNerService();
