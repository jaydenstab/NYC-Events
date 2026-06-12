const browserService = require('./services/browserService');
const { logger } = require('./logger');
const cheerio = require('cheerio');
const { parseJsonLd } = require('./utils/jsonLdParser');

/**
 * Scraper for NYC Tourism (formerly NYC Go)
 * Extracts events from https://www.nyctourism.com/events
 */
class NycGoScraper {
  constructor() {
    this.sourceName = 'nyc_go';
    this.url = 'https://www.nyctourism.com/events';
  }

  async scrapeEvents() {
    logger.info('scraper_start', { scraper: this.sourceName });

    try {
      const events = await browserService.withPage(async (page) => {
        // Set a realistic user agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');
        
        await page.goto(this.url, { waitUntil: 'networkidle2', timeout: 60000 });

        // Wait for at least one event card to load
        // Possible selectors based on current site structure
        const cardSelectors = ['.search-results__item', 'article.card', '.event-card', '[class*="card"]'];
        let foundSelector = null;
        
        for (const selector of cardSelectors) {
          try {
            await page.waitForSelector(selector, { timeout: 5000 });
            foundSelector = selector;
            break;
          } catch (e) {
            // Continue to next selector
          }
        }

        if (!foundSelector) {
          logger.warn('nyc_go_no_cards_found', { url: this.url });
        }

        // Extract HTML for Cheerio/JSON-LD parsing
        const html = await page.content();
        const $ = cheerio.load(html);

        // 1. Primary: JSON-LD extraction
        let results = parseJsonLd($, this.sourceName);
        logger.info('nyc_go_json_ld_count', { count: results.length });

        // 2. Fallback/Supplement: CSS selectors
        if (results.length < 20) {
          const cssResults = await page.evaluate(() => {
            const items = Array.from(document.querySelectorAll('.search-results__item, article.card, .event-card'));
            return items.map(item => {
              const name = item.querySelector('.card__heading, h3, h2, [class*="title"]')?.innerText.trim();
              const dateText = item.querySelector('.card__meta-item--date, .card__date, .date, time')?.innerText.trim();
              const location = item.querySelector('.card__meta-item--location, .card__location, .location, .venue')?.innerText.trim();
              const link = item.querySelector('a.card__link, a')?.href;
              const description = item.querySelector('.card__description, .description, p')?.innerText.trim() || '';
              
              return {
                name,
                date: dateText || 'TBD',
                address: location || 'New York, NY',
                website: link || '',
                description: description,
                startTime: 'TBD',
                price: 'Unknown'
              };
            }).filter(ev => ev.name && ev.name.length > 2);
          });

          // Merge CSS results into JSON-LD results if not already present
          cssResults.forEach(cssEv => {
            const exists = results.some(ldEv => 
              ldEv.name.toLowerCase() === cssEv.name.toLowerCase() && 
              ldEv.date === cssEv.date
            );
            if (!exists) {
              results.push({
                ...cssEv,
                source: 'nyc_go',
                scrapedAt: new Date().toISOString()
              });
            }
          });
        }

        return results;
      });

      logger.info('scraper_success', { scraper: this.sourceName, count: events.length });
      
      // Return at least 20 if possible (already handled by extracting all available)
      return events.slice(0, 50); // Just a reasonable upper bound
    } catch (err) {
      logger.error('scraper_failed', { scraper: this.sourceName, message: err.message });
      return [];
    }
  }
}

module.exports = NycGoScraper;
