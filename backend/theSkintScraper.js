const browserService = require('./services/browserService');
const { logger } = require('./logger');
const { parseLines, filterFutureEvents } = require('./utils/skintParse');
const { checkSkintStructure, validateEventContent } = require('./utils/scraperHealth');
const config = require('./configs/theSkint.config');

/**
 * Scraper for The Skint (theskint.com)
 * Parses bullet-line event format from homepage content.
 */
class TheSkintScraper {
  async scrapeEvents() {
    try {
      logger.info('the_skint_scrape_start');

      const articleData = await browserService.withPage(async (page) => {
        await page.setViewport({ width: 1280, height: 800 });
        await page.goto('https://theskint.com/', {
          waitUntil: 'networkidle2',
          timeout: 45000,
        });

        return page.evaluate((cfg) => {
          const articles = Array.from(document.querySelectorAll(cfg.articleSelector)).slice(0, 7);

          return articles.map((article) => {
            const title = article.querySelector(cfg.titleSelector)?.innerText || '';
            const headers = Array.from(article.querySelectorAll(cfg.headerSelector))
              .map((h) => h.innerText.trim())
              .filter((t) => t.length > 5 && t.length < 50);

            return {
              title,
              headers,
              innerText: article.innerText,
            };
          });
        }, config);
      });

      let allParsed = [];
      let totalBullets = 0;

      for (const data of articleData) {
        const combinedText = [data.title, ...data.headers, data.innerText].join('\n');
        const events = parseLines(combinedText);
        allParsed = allParsed.concat(events);
        const bulletRegex = new RegExp(config.bulletSymbol, 'g');
        totalBullets += (combinedText.match(bulletRegex) || []).length;
      }

      const seen = new Set();
      const uniqueEvents = allParsed.filter((ev) => {
        const key = `${ev.name}-${ev.date}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const structure = checkSkintStructure({
        bulletCount: totalBullets,
        parsedLength: uniqueEvents.length,
        rawTextLength: articleData.reduce((acc, d) => acc + d.innerText.length, 0),
      });

      if (!structure.ok && uniqueEvents.length === 0) {
        logger.warn('scraper_structural_failure', {
          source: 'the_skint',
          ...structure,
        });
        return [];
      }

      const contentValidation = validateEventContent(uniqueEvents);
      if (!contentValidation.valid) {
        logger.warn('scraper_content_validation_failed', {
          source: 'the_skint',
          errorRate: contentValidation.errorRate,
          issues: contentValidation.issues.slice(0, 5),
        });
        if (contentValidation.errorRate > 0.5) {
          return [];
        }
      }

      const futureEvents = filterFutureEvents(uniqueEvents);
      logger.info('the_skint_scrape_done', { count: futureEvents.length });
      return futureEvents;
    } catch (err) {
      logger.error('the_skint_scrape_failed', { message: err.message });
      return [];
    }
  }
}

module.exports = TheSkintScraper;
