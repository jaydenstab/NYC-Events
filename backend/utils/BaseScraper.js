const cheerio = require('cheerio');
const browserService = require('../services/browserService');
const { logger } = require('../logger');

/**
 * Abstract Base Class for Scrapers
 */
class BaseScraper {
  constructor(name, baseUrl) {
    this.name = name;
    this.baseUrl = baseUrl;
  }

  /**
   * Main scrape orchestration
   * @param {string} url 
   * @param {Function} mapper - ($) => Array<Object>
   * @returns {Promise<Array>}
   */
  async scrape(url, mapper) {
    logger.info('scraper_start', { scraper: this.name, url });
    
    try {
      return await browserService.withPage(async (page) => {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        const content = await page.content();
        const $ = cheerio.load(content);
        
        const results = await mapper($);
        logger.info('scraper_success', { scraper: this.name, count: results.length });
        return results;
      });
    } catch (err) {
      logger.error('scraper_failed', { scraper: this.name, url, message: err.message });
      return [];
    }
  }

  /**
   * Helper to normalize a partial URL
   */
  resolveUrl(url) {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return new URL(url, this.baseUrl).toString();
  }
}

module.exports = BaseScraper;
