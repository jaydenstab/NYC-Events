const browserService = require('./services/browserService');
const nerService = require('./services/nerService');
const { logger } = require('./logger');
const cheerio = require('cheerio');
const { parseJsonLd } = require('./utils/jsonLdParser');
const { todayNYC } = require('./utils/dateUtils');

/**
 * Scraper for NYC Parks Events
 * Target URL: https://www.nycgovparks.org/events
 */
class NYCParksScraper {
  constructor() {
    this.url = 'https://www.nycgovparks.org/events';
  }

  async scrapeEvents() {
    try {
      logger.info('nyc_parks_scrape_start', { url: this.url });

      const { jsonLdEvents, selectorEvents } = await browserService.withPage(async (page) => {
        await page.setViewport({ width: 1280, height: 1200 });
        
        // Navigate to the events page
        await page.goto(this.url, {
          waitUntil: 'networkidle2',
          timeout: 45000
        });

        // Wait for the main list to be present
        await page.waitForSelector('.event_listing, .event-item, #upcoming-events-list', { timeout: 10000 }).catch(() => {});
        
        // Get HTML for JSON-LD parsing
        const html = await page.content();
        const $ = cheerio.load(html);
        const jsonLdEvents = parseJsonLd($, 'nyc_parks');

        // Extract data via selectors
        const selectorEvents = await page.evaluate(() => {
          const results = [];
          // NYC Parks has a clean list of articles or list items
          const eventElements = Array.from(document.querySelectorAll('.event_listing, .event-item, article.event, #upcoming-events-list li'));
          
          eventElements.forEach(el => {
            const titleEl = el.querySelector('h3 a, h2 a, .event-title a, a[href*="/events/"]');
            if (!titleEl) return;

            const name = titleEl.innerText.trim();
            const url = titleEl.href;
            
            // Extract Date
            const dateEl = el.querySelector('.date, .event-date, strong');
            const dateText = dateEl ? dateEl.innerText.trim() : '';
            
            // Extract Time
            const timeEl = el.querySelector('.time, .event-time, em');
            const timeText = timeEl ? timeEl.innerText.trim() : '';
            
            // Improved Location Extraction
            const locationEl = el.querySelector('.location, .event-location, address, .park-name');
            let locationText = locationEl ? locationEl.innerText.trim() : '';
            
            // Specifically look for park name to ensure it's included
            const parkNameEl = el.querySelector('strong a[href*="/parks/"], .location strong, .park-name');
            if (parkNameEl) {
              const parkName = parkNameEl.innerText.trim();
              if (locationText && !locationText.includes(parkName)) {
                locationText = `${parkName}, ${locationText}`;
              } else if (!locationText) {
                locationText = parkName;
              }
            }

            if (!locationText || locationText.toLowerCase() === 'nyc') {
              locationText = 'NYC Parks';
            }
            
            // Extract Description
            const descEl = el.querySelector('.description, .event-description, p.summary, .event-details p, .event-content');
            const description = descEl ? descEl.innerText.trim() : '';

            if (name && url) {
              results.push({
                name,
                date: dateText,
                time: timeText,
                address: locationText,
                description: description,
                website: url,
                source: 'nyc_parks'
              });
            }
          });
          return results;
        });

        return { jsonLdEvents, selectorEvents };
      });

      // Merge events
      const allRawEvents = [...jsonLdEvents];
      const existingUrls = new Set(allRawEvents.map(e => e.website).filter(Boolean));
      
      selectorEvents.forEach(e => {
        if (!existingUrls.has(e.website)) {
          allRawEvents.push(e);
          existingUrls.add(e.website);
        }
      });

      const todayStr = todayNYC();
      const normalizedEvents = await Promise.all(allRawEvents.map(async (event) => {
        try {
          // Normalize using nerService
          // For JSON-LD events, event.time is missing but event.startTime is present
          const timeToParse = event.time || event.startTime || '12:00 PM';
          const textToExtract = `${event.date} ${timeToParse} at ${event.address}`;
          
          const extracted = await nerService.extract(textToExtract);
          
          if (extracted && extracted.date !== 'TBD') {
            if (extracted.date >= todayStr) {
              return {
                name: event.name,
                date: extracted.date,
                startTime: extracted.startTime === 'TBD' ? (event.startTime || '12:00 PM') : extracted.startTime,
                time: event.time || event.startTime, // Keeping original time for EventService compatibility
                address: event.address,
                website: event.website,
                source: event.source,
                description: event.description || ''
              };
            }
          } else if (event.date && event.date.match(/^\d{4}-\d{2}-\d{2}$/) && event.date >= todayStr) {
            // If date is already normalized (e.g. from JSON-LD) but NER failed or returned TBD
            return {
              name: event.name,
              date: event.date,
              startTime: event.startTime || '12:00 PM',
              time: event.time || event.startTime,
              address: event.address,
              website: event.website,
              source: event.source,
              description: event.description || ''
            };
          }
        } catch (err) {
          logger.warn('nyc_parks_normalization_failed', { name: event.name, error: err.message });
        }
        return null;
      }));

      const filteredEvents = normalizedEvents.filter(e => e !== null);
      logger.info('nyc_parks_scrape_success', { count: filteredEvents.length });
      return filteredEvents;
    } catch (err) {
      logger.error('nyc_parks_scrape_failed', { message: err.message });
      return [];
    }
  }
}

module.exports = NYCParksScraper;
