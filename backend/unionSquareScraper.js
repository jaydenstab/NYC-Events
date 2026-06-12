const BaseScraper = require('./utils/BaseScraper');
const { isNavJunkTitle } = require('./utils/blocklist');
const { parseJsonLd } = require('./utils/jsonLdParser');

class UnionSquareScraper extends BaseScraper {
  constructor() {
    super('union_square', 'https://www.unionsquarenyc.org');
    this.eventsUrl = `${this.baseUrl}/events-calendar`;
  }

  async scrapeEvents() {
    const mapper = ($) => {
      // 1. Try JSON-LD first
      const jsonLdEvents = parseJsonLd($, 'union_square');
      if (jsonLdEvents.length > 0) {
        return jsonLdEvents.map(event => ({
          name: event.name,
          date: event.date,
          time: event.startTime,
          location: event.address,
          description: event.description,
          url: event.website || this.eventsUrl,
          source: 'union_square',
          scrapedAt: new Date().toISOString()
        }));
      }

      // 2. Fallback to selector-based mapping
      const results = [];
      $('.event, .event-item, .event-card, [class*="event"]').each((i, el) => {
        const $event = $(el);
        const title = $event.find('h1, h2, h3, .title, .event-title, .event-name').first().text().trim();
        if (title && title.length > 3 && !isNavJunkTitle(title)) {
          results.push({
            name: title,
            date: $event.find('.date, .event-date, .start-date, [class*="date"]').text().trim() || 'TBD',
            time: $event.find('.time, .event-time, .start-time, [class*="time"]').text().trim() || 'TBD',
            location: $event.find('.location, .venue, .address, [class*="location"]').text().trim() || 'Union Square, NYC',
            description: $event.find('.description, .summary, .event-description, p').first().text().trim() || 'Event at Union Square',
            url: this.resolveUrl($event.find('a').attr('href')),
            source: 'union_square',
            scrapedAt: new Date().toISOString()
          });
        }
      });
      return results;
    };

    const calendarEvents = await this.scrape(this.eventsUrl, mapper);
    if (calendarEvents.length > 0) return calendarEvents;

    // Fallback to main page
    return await this.scrape(this.baseUrl, mapper);
  }
}

module.exports = UnionSquareScraper;
